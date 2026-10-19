import { TokenStorage } from '../types';

const TOKEN_KEY = 'apikit_token';
let _mmkvInstance: any = null;

function getMMKV(): any {
  if (!_mmkvInstance) {
    try {
      // Lazy load to prevent app crash if react-native-mmkv is not installed
      const { MMKV } = require('react-native-mmkv');
      _mmkvInstance = new MMKV();
    } catch (e) {
      console.warn('ApiKit: react-native-mmkv is not installed or not supported in this environment. Install it via: npm install react-native-mmkv');
      return null;
    }
  }
  return _mmkvInstance;
}

export function createMMKVTokenStorage(customInstance?: any): TokenStorage {
  return {
    async getToken() {
      try {
        const storage = customInstance || getMMKV();
        return storage ? storage.getString(TOKEN_KEY) || null : null;
      } catch (error) {
        console.warn('ApiKit: MMKV getToken error:', error);
        return null;
      }
    },
    async setToken(token: string) {
      try {
        const storage = customInstance || getMMKV();
        if (storage) {
          storage.set(TOKEN_KEY, token);
        }
      } catch (error) {
        console.warn('ApiKit: MMKV setToken error:', error);
      }
    },
    async removeToken() {
      try {
        const storage = customInstance || getMMKV();
        if (storage) {
          storage.delete(TOKEN_KEY);
        }
      } catch (error) {
        console.warn('ApiKit: MMKV removeToken error:', error);
      }
    },
  };
}

export const mmkvToken: TokenStorage = createMMKVTokenStorage();
 