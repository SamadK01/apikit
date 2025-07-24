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
exports.apiClient = void 0;
const config_1 = require("./config");
function request(methodOrConfig, urlOrConfig, data, config) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        let method = 'GET';
        let url = '';
        let finalConfig = {};
        let body = undefined;
        if (typeof methodOrConfig === 'string') {
            method = methodOrConfig;
            url = urlOrConfig;
            body = data;
            finalConfig = config || {};
        }
        else {
            finalConfig = methodOrConfig;
            method = (finalConfig.method || 'GET');
            url = finalConfig.url || '';
            body = finalConfig.data;
        }
        if (!url) {
            return { data: null, error: { message: 'ApiKit: URL is required.' } };
        }
        const apiConfig = (0, config_1.getApiKitConfig)();
        const engine = (0, config_1.getEngine)();
        if (!apiConfig.baseUrl && !url.startsWith('http')) {
            return { data: null, error: { message: 'ApiKit: baseUrl not configured. Please call configureApiKit first.' } };
        }
        try {
            // Get token if storage is configured
            let token = null;
            if (apiConfig.tokenStorage) {
                try {
                    token = yield apiConfig.tokenStorage.getToken();
                }
                catch (error) {
                    // ignore
                }
            }
            // Prepare headers
            const headers = Object.assign(Object.assign({ 'Content-Type': 'application/json' }, apiConfig.headers), finalConfig.headers);
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            // Build full URL
            const fullUrl = url.startsWith('http') ? url : `${apiConfig.baseUrl}${url}`;
            let finalUrl = fullUrl;
            if (finalConfig.params) {
                const params = new URLSearchParams();
                Object.entries(finalConfig.params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        params.append(key, String(value));
                    }
                });
                const queryString = params.toString();
                if (queryString) {
                    finalUrl += (fullUrl.includes('?') ? '&' : '?') + queryString;
                }
            }
            // Prepare request config
            const requestConfig = {
                url: finalUrl,
                method,
                data: method !== 'GET' ? body : undefined,
                headers,
                timeout: finalConfig.timeout || apiConfig.timeout,
                signal: finalConfig.signal,
            };
            // Make request
            const response = yield engine.request(requestConfig);
            // Handle 401 globally
            if (response.status === 401 && apiConfig.onUnauthorized) {
                apiConfig.onUnauthorized();
            }
            return { data: response.data, error: null, status: response.status, raw: response.raw };
        }
        catch (error) {
            let apiError;
            if (error.name === 'AbortError') {
                apiError = { message: 'Request cancelled', isNetworkError: false };
            }
            else if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('Network request failed')) {
                apiError = { message: 'No internet connection', isNetworkError: true };
            }
            else if (error.code === 'ECONNABORTED' || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('timeout'))) {
                apiError = { message: 'Request timeout', isTimeout: true };
            }
            else {
                apiError = {
                    message: error.message || 'An error occurred',
                    status: (_c = error.response) === null || _c === void 0 ? void 0 : _c.status,
                    details: (_d = error.response) === null || _d === void 0 ? void 0 : _d.data,
                    isUnauthorized: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.status) === 401,
                };
            }
            return { data: null, error: apiError };
        }
    });
}
exports.apiClient = {
    get(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return request('GET', url, undefined, config);
        });
    },
    post(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return request('POST', url, data, config);
        });
    },
    put(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return request('PUT', url, data, config);
        });
    },
    patch(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return request('PATCH', url, data, config);
        });
    },
    del(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return request('DELETE', url, undefined, config);
        });
    },
    request(config) {
        return __awaiter(this, void 0, void 0, function* () {
            return request(config);
        });
    },
};
