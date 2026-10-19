import { OfflineMutation, OfflineSyncResult, TokenStorage } from '../types';

const QUEUE_STORAGE_KEY = 'apikit_offline_queue';

let customStorage: TokenStorage | null = null;
let memoryQueue: OfflineMutation[] = [];

export const offlineQueue = {
  setStorage(storage: TokenStorage) {
    customStorage = storage;
  },

  async getPending(): Promise<OfflineMutation[]> {
    if (customStorage) {
      try {
        const raw = await customStorage.getToken(); // using storage get interface
        if (raw) return JSON.parse(raw);
      } catch {
        // Fallback to memory
      }
    }
    return [...memoryQueue];
  },

  async add(mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newEntry: OfflineMutation = {
      ...mutation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const current = await this.getPending();
    current.push(newEntry);
    await this.saveQueue(current);
    return id;
  },

  async remove(id: string): Promise<void> {
    const current = await this.getPending();
    const filtered = current.filter(item => item.id !== id);
    await this.saveQueue(filtered);
  },

  async clear(): Promise<void> {
    memoryQueue = [];
    if (customStorage) {
      try {
        await customStorage.removeToken();
      } catch {
        // Ignore
      }
    }
  },

  async saveQueue(queue: OfflineMutation[]): Promise<void> {
    memoryQueue = queue;
    if (customStorage) {
      try {
        await customStorage.setToken(JSON.stringify(queue));
      } catch {
        // Ignore
      }
    }
  },

  async sync(client: { request: (config: any) => Promise<any> }): Promise<OfflineSyncResult[]> {
    const queue = await this.getPending();
    if (queue.length === 0) return [];

    const results: OfflineSyncResult[] = [];
    const remaining: OfflineMutation[] = [];

    for (const mutation of queue) {
      try {
        const response = await client.request({
          url: mutation.url,
          method: mutation.method,
          data: mutation.data,
          headers: mutation.headers,
        });

        if (response.error && response.error.isNetworkError) {
          // Still offline, stop sync and keep in queue
          mutation.retryCount += 1;
          remaining.push(mutation);
          results.push({ mutation, success: false, error: response.error });
          break;
        } else if (response.error) {
          // Server rejected, discard from queue but report result
          results.push({ mutation, success: false, error: response.error });
        } else {
          // Success
          results.push({ mutation, success: true, response: response.data });
        }
      } catch (err: any) {
        mutation.retryCount += 1;
        remaining.push(mutation);
        results.push({ mutation, success: false, error: { message: err.message || 'Sync failed' } });
        break;
      }
    }

    await this.saveQueue(remaining);
    return results;
  },
};
