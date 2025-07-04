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
