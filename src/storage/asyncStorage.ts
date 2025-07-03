import { TokenStorage } from '../types';

const TOKEN_KEY = 'apikit_token';

export const asyncStorageToken: TokenStorage = {
  async getToken() {
    // Only import async-storage if this storage is used
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // TODO: error handling
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string) {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // TODO: error handling
    return AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async removeToken() {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // TODO: error handling
    return AsyncStorage.removeItem(TOKEN_KEY);
  },
};
