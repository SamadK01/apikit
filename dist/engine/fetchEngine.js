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
exports.fetchEngine = void 0;
exports.fetchEngine = {
    request(config) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Support timeout, cancel, params serialization, and smart response parsing
            const { url, method = 'GET', data, headers, signal } = config;
            const fetchConfig = {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
                signal,
            };
            const response = yield fetch(url, fetchConfig);
            // TODO: Smart response parsing (JSON, text, FormData, binary)
            const contentType = response.headers.get('content-type') || '';
            let parsed;
            if (contentType.includes('application/json')) {
                parsed = yield response.json();
            }
            else if (contentType.includes('text/')) {
                parsed = yield response.text();
            }
            else {
                parsed = yield response.blob();
            }
            return {
                data: parsed,
                status: response.status,
                headers: {}, // TODO: parse headers
                raw: response,
            };
        });
    },
    // TODO: cancel support (AbortController)
};
