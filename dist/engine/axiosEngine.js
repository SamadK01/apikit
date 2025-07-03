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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.axiosEngine = void 0;
// @ts-ignore
const axios_1 = __importDefault(require("axios"));
exports.axiosEngine = {
    request(config) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Support cancel tokens, interceptors, params serialization, and smart response parsing
            const { url, method = 'GET', data, headers, timeout } = config;
            const response = yield (0, axios_1.default)({
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
        });
    },
    // TODO: cancel support
};
