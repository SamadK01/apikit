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
            const { url, method = 'GET', data, headers, signal, timeout } = config;
            // Setup internal timeout signal if timeout is set and no external signal provided
            let timeoutId = null;
            let effectiveSignal = signal;
            if (timeout && !signal && typeof AbortController !== 'undefined') {
                const controller = new AbortController();
                effectiveSignal = controller.signal;
                timeoutId = setTimeout(() => controller.abort(), timeout);
            }
            try {
                const fetchConfig = {
                    method,
                    headers,
                    body: data !== undefined && method !== 'GET'
                        ? (typeof data === 'string' ? data : JSON.stringify(data))
                        : undefined,
                    signal: effectiveSignal,
                };
                const response = yield fetch(url, fetchConfig);
                if (timeoutId)
                    clearTimeout(timeoutId);
                // Smart response parsing
                const contentType = response.headers.get('content-type') || '';
                let parsed;
                if (contentType.includes('application/json')) {
                    parsed = yield response.json();
                }
                else if (contentType.includes('text/')) {
                    parsed = yield response.text();
                }
                else {
                    try {
                        parsed = yield response.json();
                    }
                    catch (_a) {
                        parsed = yield response.text();
                    }
                }
                // Parse headers into dictionary
                const parsedHeaders = {};
                if (response.headers && typeof response.headers.forEach === 'function') {
                    response.headers.forEach((val, key) => {
                        parsedHeaders[key.toLowerCase()] = val;
                    });
                }
                return {
                    data: parsed,
                    status: response.status,
                    headers: parsedHeaders,
                    raw: response,
                };
            }
            catch (error) {
                if (timeoutId)
                    clearTimeout(timeoutId);
                throw error;
            }
        });
    },
};
