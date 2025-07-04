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
exports.useApi = useApi;
const react_1 = require("react");
const config_1 = require("../config");
function useApi() {
    const [state, setState] = (0, react_1.useState)({
        loading: false,
        error: null,
        data: null,
    });
    const reset = (0, react_1.useCallback)(() => {
        setState({
            loading: false,
            error: null,
            data: null,
        });
    }, []);
    const makeRequest = (0, react_1.useCallback)((method, url, data, config) => __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e;
        const apiConfig = (0, config_1.getApiKitConfig)();
        const engine = (0, config_1.getEngine)();
        if (!apiConfig.baseUrl) {
            console.warn('ApiKit: baseUrl not configured. Please call configureApiKit first.');
            return;
        }
        setState(prev => (Object.assign(Object.assign({}, prev), { loading: true, error: null })));
        try {
            // Get token if storage is configured
            let token = null;
            if (apiConfig.tokenStorage) {
                try {
                    token = yield apiConfig.tokenStorage.getToken();
                }
                catch (error) {
                    console.warn('ApiKit: Failed to get token from storage:', error);
                }
            }
            // Prepare headers
            const headers = Object.assign(Object.assign({ 'Content-Type': 'application/json' }, apiConfig.headers), config === null || config === void 0 ? void 0 : config.headers);
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            // Build full URL
            const fullUrl = url.startsWith('http') ? url : `${apiConfig.baseUrl}${url}`;
            // Add query parameters
            let finalUrl = fullUrl;
            if (config === null || config === void 0 ? void 0 : config.params) {
                const params = new URLSearchParams();
                Object.entries(config.params).forEach(([key, value]) => {
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
                data: method !== 'GET' ? data : undefined,
                headers,
                timeout: (config === null || config === void 0 ? void 0 : config.timeout) || apiConfig.timeout,
                signal: config === null || config === void 0 ? void 0 : config.signal,
            };
            // Make request
            const response = yield engine.request(requestConfig);
            // Handle 401 globally
            if (response.status === 401 && apiConfig.onUnauthorized) {
                apiConfig.onUnauthorized();
            }
            setState({
                loading: false,
                error: null,
                data: response.data,
            });
        }
        catch (error) {
            let apiError;
            if (error.name === 'AbortError') {
                apiError = {
                    message: 'Request cancelled',
                    isNetworkError: false,
                };
            }
            else if ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('Network request failed')) {
                apiError = {
                    message: 'No internet connection',
                    isNetworkError: true,
                };
            }
            else if (error.code === 'ECONNABORTED' || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('timeout'))) {
                apiError = {
                    message: 'Request timeout',
                    isTimeout: true,
                };
            }
            else {
                apiError = {
                    message: error.message || 'An error occurred',
                    status: (_c = error.response) === null || _c === void 0 ? void 0 : _c.status,
                    details: (_d = error.response) === null || _d === void 0 ? void 0 : _d.data,
                    isUnauthorized: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.status) === 401,
                };
            }
            setState({
                loading: false,
                error: apiError,
                data: null,
            });
        }
    }), []);
    const get = (0, react_1.useCallback)((url, config) => makeRequest('GET', url, undefined, config), [makeRequest]);
    const post = (0, react_1.useCallback)((url, data, config) => makeRequest('POST', url, data, config), [makeRequest]);
    const put = (0, react_1.useCallback)((url, data, config) => makeRequest('PUT', url, data, config), [makeRequest]);
    const patch = (0, react_1.useCallback)((url, data, config) => makeRequest('PATCH', url, data, config), [makeRequest]);
    const del = (0, react_1.useCallback)((url, config) => makeRequest('DELETE', url, undefined, config), [makeRequest]);
    return Object.assign(Object.assign({}, state), { get,
        post,
        put,
        patch,
        del,
        reset });
}
