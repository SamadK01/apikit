import { TokenStorage } from '../types';
// @ts-ignore
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'apikit_token';

export const asyncStorageToken: TokenStorage = {
  async getToken() {
    // TODO: error handling
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    // TODO: error handling
    return AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async removeToken() {
    // TODO: error handling
    return AsyncStorage.removeItem(TOKEN_KEY);
  },
};
