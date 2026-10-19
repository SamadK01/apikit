import { OfflineMutation, OfflineSyncResult, TokenStorage } from '../types';
export declare const offlineQueue: {
    setStorage(storage: TokenStorage): void;
    getPending(): Promise<OfflineMutation[]>;
    add(mutation: Omit<OfflineMutation, "id" | "timestamp" | "retryCount">): Promise<string>;
    remove(id: string): Promise<void>;
    clear(): Promise<void>;
    saveQueue(queue: OfflineMutation[]): Promise<void>;
    sync(client: {
        request: (config: any) => Promise<any>;
    }): Promise<OfflineSyncResult[]>;
};
