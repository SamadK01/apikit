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
exports.memoryCache = exports.asyncStorageToken = void 0;
const TOKEN_KEY = 'apikit_token';
exports.asyncStorageToken = {
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Only import async-storage if this storage is used
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                return yield AsyncStorage.getItem(TOKEN_KEY);
            }
            catch (error) {
                console.warn('ApiKit: @react-native-async-storage/async-storage not installed. Please install it: npm install @react-native-async-storage/async-storage');
                return null;
            }
        });
    },
    setToken(token) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                return yield AsyncStorage.setItem(TOKEN_KEY, token);
            }
            catch (error) {
                console.warn('ApiKit: @react-native-async-storage/async-storage not installed. Please install it: npm install @react-native-async-storage/async-storage');
                return null;
            }
        });
    },
    removeToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                return yield AsyncStorage.removeItem(TOKEN_KEY);
            }
            catch (error) {
                console.warn('ApiKit: @react-native-async-storage/async-storage not installed. Please install it: npm install @react-native-async-storage/async-storage');
                return null;
            }
        });
    },
};
function now() { return Date.now(); }
const _store = {};
exports.memoryCache = {
    get(key) {
        const entry = _store[key];
        if (!entry)
            return undefined;
        if (entry.expiresAt < now()) {
            delete _store[key];
            return undefined;
        }
        return entry.value;
    },
    set(key, value, ttlMs = 60000) {
        _store[key] = { value, expiresAt: now() + ttlMs };
    },
    clear(key) {
        if (key)
            delete _store[key];
        else
            Object.keys(_store).forEach(k => delete _store[k]);
    }
};
