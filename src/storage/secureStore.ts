import { TokenStorage } from '../types';

const TOKEN_KEY = 'apikit_token';

export const secureStoreToken: TokenStorage = {
  async getToken() {
    try {
      // Only import expo-secure-store if this storage is used
      const SecureStore = require('expo-secure-store');
      return await SecureStore.getItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('ApiKit: expo-secure-store not installed. Please install it: expo install expo-secure-store');
      return null;
    }
  },
  async setToken(token: string) {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.setItemAsync(TOKEN_KEY, token);
    } catch (error) {
      console.warn('ApiKit: expo-secure-store not installed. Please install it: expo install expo-secure-store');
      return null;
    }
  },
  async removeToken() {
    try {
      const SecureStore = require('expo-secure-store');
      return await SecureStore.deleteItemAsync(TOKEN_KEY);
    } catch (error) {
      console.warn('ApiKit: expo-secure-store not installed. Please install it: expo install expo-secure-store');
      return null;
    }
  },
};
