import { ApiError, KeyValueStorage, OfflineMutation, OfflineSyncResult } from '../types';

const QUEUE_STORAGE_KEY = 'apikit:offline-mutations:v1';
type RequestClient = { request: (config: { url: string; method: string; data?: unknown; headers?: Record<string, string> }) => Promise<{ data: unknown; error: ApiError | null }> };

let storage: KeyValueStorage | null = null;
let memoryQueue: OfflineMutation[] = [];
let syncing: Promise<OfflineSyncResult[]> | null = null;
let unsubscribe: (() => void) | null = null;
let maxRetries = 5;

async function readQueue(): Promise<OfflineMutation[]> {
  if (!storage) return [...memoryQueue];
  try {
    const raw = await storage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [...memoryQueue];
  } catch { return [...memoryQueue]; }
}

async function writeQueue(queue: OfflineMutation[]): Promise<void> {
  memoryQueue = queue;
  if (!storage) return;
  try { await storage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue)); } catch { /* memory fallback */ }
}

/** FIFO persistence for mutations that fail because the device is offline. */
export const offlineQueue = {
  setStorage(nextStorage: KeyValueStorage | null) { storage = nextStorage; },
  setMaxRetries(value: number | undefined) { maxRetries = Math.max(0, value ?? 5); },
  async getPending(): Promise<OfflineMutation[]> { return readQueue(); },

  async add(mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const entry: OfflineMutation = { ...mutation, id: `mut_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, timestamp: Date.now(), retryCount: 0 };
    const queue = await readQueue();
    const duplicate = mutation.idempotencyKey && queue.some(item => item.idempotencyKey === mutation.idempotencyKey);
    if (duplicate) return queue.find(item => item.idempotencyKey === mutation.idempotencyKey)!.id;
    queue.push(entry);
    await writeQueue(queue);
    return entry.id;
  },

  async remove(id: string): Promise<void> { await writeQueue((await readQueue()).filter(item => item.id !== id)); },
  async clear(): Promise<void> {
    memoryQueue = [];
    if (storage) try { await storage.removeItem(QUEUE_STORAGE_KEY); } catch { /* memory queue cleared */ }
  },

  async sync(client: RequestClient): Promise<OfflineSyncResult[]> {
    if (syncing) return syncing;
    syncing = (async () => {
      const queue = await readQueue();
      const results: OfflineSyncResult[] = [];
      const remaining: OfflineMutation[] = [];
      for (let index = 0; index < queue.length; index += 1) {
        const mutation = queue[index];
        try {
          const response = await client.request({ url: mutation.url, method: mutation.method, data: mutation.data, headers: mutation.headers });
          if (response.error?.isNetworkError && mutation.retryCount < maxRetries) {
            mutation.retryCount += 1;
            remaining.push(mutation, ...queue.slice(index + 1));
            results.push({ mutation, success: false, error: response.error });
            break;
          }
          results.push(response.error ? { mutation, success: false, error: response.error } : { mutation, success: true, response: response.data });
        } catch (error: any) {
          mutation.retryCount += 1;
          if (mutation.retryCount <= maxRetries) remaining.push(mutation, ...queue.slice(index + 1));
          results.push({ mutation, success: false, error: { message: error?.message || 'Sync failed' } });
          break;
        }
      }
      await writeQueue(remaining);
      return results;
    })();
    try { return await syncing; } finally { syncing = null; }
  },

  /**
   * Connect NetInfo or another connectivity source without making it a runtime
   * dependency. `subscribe` invokes `onOnline` whenever connectivity returns.
   */
  startAutoSync(client: RequestClient, subscribe: (onOnline: () => void) => () => void): () => void {
    unsubscribe?.();
    unsubscribe = subscribe(() => { void this.sync(client); });
    return () => { unsubscribe?.(); unsubscribe = null; };
  },
  stopAutoSync() { unsubscribe?.(); unsubscribe = null; },
};
