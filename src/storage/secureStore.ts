import { TokenStorage } from '../types';

const TOKEN_KEY = 'apikit_token';

export const secureStoreToken: TokenStorage = {
  async getToken() {
    // Only import expo-secure-store if this storage is used
    const SecureStore = require('expo-secure-store');
    // TODO: error handling
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async setToken(token: string) {
    const SecureStore = require('expo-secure-store');
    // TODO: error handling
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async removeToken() {
    const SecureStore = require('expo-secure-store');
    // TODO: error handling
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
