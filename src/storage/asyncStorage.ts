import { TokenStorage } from '../types';

const TOKEN_KEY = 'apikit_token';

export const asyncStorageToken: TokenStorage = {
  async getToken() {
    try {
      // Only import async-storage if this storage is used
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.getItem(TOKEN_KEY);
    } catch (error) {
      console.warn('ApiKit: @react-native-async-storage/async-storage not installed. Please install it: npm install @react-native-async-storage/async-storage');
      return null;
    }
  },
  async setToken(token: string) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.setItem(TOKEN_KEY, token);
    } catch (error) {
      console.warn('ApiKit: @react-native-async-storage/async-storage not installed. Please install it: npm install @react-native-async-storage/async-storage');
      return null;
    }
  },
  async removeToken() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      return await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.warn('ApiKit: @react-native-async-storage/async-storage not installed. Please install it: npm install @react-native-async-storage/async-storage');
      return null;
    }
  },
};

// In-memory time-based cache (example)
import { ApiCache } from '../types';

function now() { return Date.now(); }

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const _store: Record<string, CacheEntry<any>> = {};

export const memoryCache: ApiCache = {
  get<T = any>(key: string): T | undefined {
    const entry = _store[key];
    if (!entry) return undefined;
    if (entry.expiresAt < now()) {
      delete _store[key];
      return undefined;
    }
    return entry.value;
  },
  set<T = any>(key: string, value: T, ttlMs: number = 60000) {
    _store[key] = { value, expiresAt: now() + ttlMs };
  },
  clear(key?: string) {
    if (key) delete _store[key];
    else Object.keys(_store).forEach(k => delete _store[k]);
  }
};
