import { MMKV } from 'react-native-mmkv';
import { TokenStorage } from '../types';

const storage = new MMKV();
const TOKEN_KEY = 'apikit_token';

export const mmkvToken: TokenStorage = {
  async getToken() {
    try {
      return storage.getString(TOKEN_KEY) || null;
    } catch (error) {
      console.warn('ApiKit: MMKV getToken error:', error);
      return null;
    }
  },
  async setToken(token: string) {
    try {
      storage.set(TOKEN_KEY, token);
    } catch (error) {
      console.warn('ApiKit: MMKV setToken error:', error);
    }
  },
  async removeToken() {
    try {
      storage.delete(TOKEN_KEY);
    } catch (error) {
      console.warn('ApiKit: MMKV removeToken error:', error);
    }
  },
}; 