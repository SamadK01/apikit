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
const react_native_mmkv_1 = require("react-native-mmkv");
const storage = new react_native_mmkv_1.MMKV();
const TOKEN_KEY = 'apikit_token';
exports.mmkvToken = {
    getToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return storage.getString(TOKEN_KEY) || null;
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
                storage.set(TOKEN_KEY, token);
            }
            catch (error) {
                console.warn('ApiKit: MMKV setToken error:', error);
            }
        });
    },
    removeToken() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                storage.delete(TOKEN_KEY);
            }
            catch (error) {
                console.warn('ApiKit: MMKV removeToken error:', error);
            }
        });
    },
};
