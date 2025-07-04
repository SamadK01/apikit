"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureStoreToken = void 0;
const TOKEN_KEY = 'apikit_token';
exports.secureStoreToken = {
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Only import expo-secure-store if this storage is used
                const SecureStore = require('expo-secure-store');
                return yield SecureStore.getItemAsync(TOKEN_KEY);
            }
            catch (error) {
                console.warn('ApiKit: expo-secure-store not installed. Please install it: expo install expo-secure-store');
                return null;
            }
        });
    },
    setToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const SecureStore = require('expo-secure-store');
                return yield SecureStore.setItemAsync(TOKEN_KEY, token);
            }
            catch (error) {
                console.warn('ApiKit: expo-secure-store not installed. Please install it: expo install expo-secure-store');
                return null;
            }
        });
    },
    removeToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const SecureStore = require('expo-secure-store');
                return yield SecureStore.deleteItemAsync(TOKEN_KEY);
            }
            catch (error) {
                console.warn('ApiKit: expo-secure-store not installed. Please install it: expo install expo-secure-store');
                return null;
            }
        });
    },
};
