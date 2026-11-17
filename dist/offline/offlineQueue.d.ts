import { ApiError, KeyValueStorage, OfflineMutation, OfflineSyncResult } from '../types';
type RequestClient = {
    request: (config: {
        url: string;
        method: string;
        data?: unknown;
        headers?: Record<string, string>;
    }) => Promise<{
        data: unknown;
        error: ApiError | null;
    }>;
};
/** FIFO persistence for mutations that fail because the device is offline. */
export declare const offlineQueue: {
    setStorage(nextStorage: KeyValueStorage | null): void;
    setMaxRetries(value: number | undefined): void;
    getPending(): Promise<OfflineMutation[]>;
    add(mutation: Omit<OfflineMutation, "id" | "timestamp" | "retryCount">): Promise<string>;
    remove(id: string): Promise<void>;
    clear(): Promise<void>;
    sync(client: RequestClient): Promise<OfflineSyncResult[]>;
    /**
     * Connect NetInfo or another connectivity source without making it a runtime
     * dependency. `subscribe` invokes `onOnline` whenever connectivity returns.
     */
    startAutoSync(client: RequestClient, subscribe: (onOnline: () => void) => () => void): () => void;
    stopAutoSync(): void;
};
export {};
