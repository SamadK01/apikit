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
exports.asyncStorageToken = void 0;
const TOKEN_KEY = 'apikit_token';
exports.asyncStorageToken = {
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            // Only import async-storage if this storage is used
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            // TODO: error handling
            return AsyncStorage.getItem(TOKEN_KEY);
        });
    },
    setToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            // TODO: error handling
            return AsyncStorage.setItem(TOKEN_KEY, token);
        });
    },
    removeToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            // TODO: error handling
            return AsyncStorage.removeItem(TOKEN_KEY);
        });
    },
};
