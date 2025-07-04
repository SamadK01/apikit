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
exports.axiosEngine = void 0;
exports.axiosEngine = {
    request(config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Only import axios if this engine is used
                const axios = require('axios');
                const { url, method = 'GET', data, headers, timeout } = config;
                const response = yield axios({
                    url,
                    method,
                    data,
                    headers,
                    timeout,
                    // TODO: cancel token
                });
                return {
                    data: response.data,
                    status: response.status,
                    headers: response.headers,
                    raw: response,
                };
            }
            catch (error) {
                if (error.code === 'MODULE_NOT_FOUND') {
                    throw new Error('axios not installed. Please install it: npm install axios');
                }
                throw error;
            }
        });
    },
    // TODO: cancel support
};
