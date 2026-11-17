import { KeyValueStorage, TokenStorage } from '../types';
export declare function createMMKVTokenStorage(customInstance?: any): TokenStorage;
export declare const mmkvToken: TokenStorage;
/** Creates a general-purpose MMKV adapter, suitable for offlineQueue persistence. */
export declare function createMMKVStorage(customInstance?: any): KeyValueStorage;
export declare const mmkvStorage: KeyValueStorage;
