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
exports.mmkvToken = void 0;
exports.createMMKVTokenStorage = createMMKVTokenStorage;
const TOKEN_KEY = 'apikit_token';
let _mmkvInstance = null;
function getMMKV() {
    if (!_mmkvInstance) {
        try {
            // Lazy load to prevent app crash if react-native-mmkv is not installed
            const { MMKV } = require('react-native-mmkv');
            _mmkvInstance = new MMKV();
        }
        catch (e) {
            console.warn('ApiKit: react-native-mmkv is not installed or not supported in this environment. Install it via: npm install react-native-mmkv');
            return null;
        }
    }
    return _mmkvInstance;
}
function createMMKVTokenStorage(customInstance) {
    return {
        getToken() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const storage = customInstance || getMMKV();
                    return storage ? storage.getString(TOKEN_KEY) || null : null;
                }
                catch (error) {
                    console.warn('ApiKit: MMKV getToken error:', error);
                    return null;
                }
            });
        },
        setToken(token) {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const storage = customInstance || getMMKV();
                    if (storage) {
                        storage.set(TOKEN_KEY, token);
                    }
                }
                catch (error) {
                    console.warn('ApiKit: MMKV setToken error:', error);
                }
            });
        },
        removeToken() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const storage = customInstance || getMMKV();
                    if (storage) {
                        storage.delete(TOKEN_KEY);
                    }
                }
                catch (error) {
                    console.warn('ApiKit: MMKV removeToken error:', error);
                }
            });
        },
    };
}
exports.mmkvToken = createMMKVTokenStorage();
