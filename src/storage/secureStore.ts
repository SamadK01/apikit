import { TokenStorage } from '../types';
// @ts-ignore
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'apikit_token';

export const secureStoreToken: TokenStorage = {
  async getToken() {
    // TODO: error handling
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async setToken(token: string) {
    // TODO: error handling
    return SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async removeToken() {
    // TODO: error handling
    return SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
