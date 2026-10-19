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
exports.executeRequest = executeRequest;
const config_1 = require("./config");
const logger_1 = require("./utils/logger");
const rateLimit_1 = require("./utils/rateLimit");
const uploader_1 = require("./utils/uploader");
const offlineQueue_1 = require("./offline/offlineQueue");
let tokenRefreshPromise = null;
function executeRequest(methodOrConfig, urlOrConfig, data, config, customConfig, customEngine) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h;
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
        const apiConfig = customConfig || (0, config_1.getApiKitConfig)();
        const engine = customEngine || (0, config_1.getEngine)();
        // Allow absolute URLs even if baseUrl is not configured
        if (!apiConfig.baseUrl && !url.startsWith('http://') && !url.startsWith('https://')) {
            return { data: null, error: { message: 'ApiKit: baseUrl not configured. Please call configureApiKit first.' } };
        }
        const maxRetries = typeof finalConfig.retry === 'number'
            ? finalConfig.retry
            : typeof apiConfig.retry === 'number' ? apiConfig.retry : 0;
        let attempt = 0;
        let lastError = null;
        let hasRefreshedToken = false;
        // --- Caching logic (GET only) ---
        const isGet = method === 'GET';
        let cacheKey = '';
        if (isGet && apiConfig.cache && !finalConfig.skipCache) {
            let rawUrl = url;
            let params = finalConfig.params;
            cacheKey = rawUrl;
            if (params) {
                cacheKey += '?' + Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&');
            }
            const cached = yield apiConfig.cache.get(cacheKey);
            if (cached) {
                return { data: cached.data, error: null, status: cached.status, raw: cached.raw };
            }
        }
        const startTime = Date.now();
        while (attempt <= maxRetries) {
            try {
                // 1. Get token if storage is configured
                let token = null;
                if (apiConfig.tokenStorage && !finalConfig.skipToken) {
                    try {
                        token = yield apiConfig.tokenStorage.getToken();
                    }
                    catch (_j) {
                        // Ignore
                    }
                }
                // 2. Prepare headers
                const headers = Object.assign(Object.assign({ 'Content-Type': 'application/json' }, apiConfig.headers), finalConfig.headers);
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                }
                // 3. Build full URL
                const fullUrl = url.startsWith('http://') || url.startsWith('https://')
                    ? url
                    : `${apiConfig.baseUrl}${url}`;
                let finalUrl = fullUrl;
                if (finalConfig.params) {
                    const queryParts = [];
                    Object.entries(finalConfig.params).forEach(([k, v]) => {
                        if (v !== undefined && v !== null) {
                            queryParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
                        }
                    });
                    if (queryParts.length > 0) {
                        finalUrl += (fullUrl.includes('?') ? '&' : '?') + queryParts.join('&');
                    }
                }
                // 4. Prepare request config
                const requestConfig = {
                    url: finalUrl,
                    method,
                    data: method !== 'GET' ? body : undefined,
                    headers,
                    timeout: finalConfig.timeout || apiConfig.timeout,
                    signal: finalConfig.signal,
                };
                // --- Interceptor: onRequest ---
                let interceptedRequestConfig = requestConfig;
                if (apiConfig.onRequest) {
                    interceptedRequestConfig = yield apiConfig.onRequest(requestConfig);
                }
                logger_1.apiLogger.logRequest(method, finalUrl, interceptedRequestConfig.headers, interceptedRequestConfig.data);
                // 5. Make request
                const response = yield engine.request(interceptedRequestConfig);
                // --- Interceptor: onResponse ---
                let interceptedResponse = response;
                if (apiConfig.onResponse) {
                    interceptedResponse = yield apiConfig.onResponse(response);
                }
                // 6. Handle 401 & Silent Token Refresh
                if (interceptedResponse.status === 401) {
                    if (apiConfig.refreshToken && !hasRefreshedToken) {
                        hasRefreshedToken = true;
                        try {
                            if (!tokenRefreshPromise) {
                                tokenRefreshPromise = apiConfig.refreshToken();
                            }
                            const newToken = yield tokenRefreshPromise;
                            tokenRefreshPromise = null;
                            if (newToken && apiConfig.tokenStorage) {
                                yield apiConfig.tokenStorage.setToken(newToken);
                                // Retry with new token
                                continue;
                            }
                        }
                        catch (refreshErr) {
                            tokenRefreshPromise = null;
                            (_a = apiConfig.onTokenRefreshFailed) === null || _a === void 0 ? void 0 : _a.call(apiConfig);
                        }
                    }
                    if (apiConfig.onUnauthorized) {
                        apiConfig.onUnauthorized();
                    }
                }
                // 7. Handle 429 Rate Limiting
                if (interceptedResponse.status === 429 && (apiConfig.retryAfter429 !== false || finalConfig.retryAfter429)) {
                    const delayMs = (0, rateLimit_1.parseRetryAfter)(interceptedResponse.headers) || (0, rateLimit_1.calculateBackoffWithJitter)(attempt);
                    if (attempt < maxRetries) {
                        yield new Promise(res => setTimeout(res, delayMs));
                        attempt++;
                        continue;
                    }
                }
                // 8. Runtime Schema Validation (Zod, Yup, etc.)
                let finalData = interceptedResponse.data;
                if (finalConfig.schema) {
                    if (typeof finalConfig.schema.safeParse === 'function') {
                        const parseResult = finalConfig.schema.safeParse(finalData);
                        if (!parseResult.success) {
                            return {
                                data: null,
                                error: {
                                    message: 'ApiKit: Response schema validation failed',
                                    status: interceptedResponse.status,
                                    details: parseResult.error,
                                },
                                status: interceptedResponse.status,
                                raw: interceptedResponse.raw,
                            };
                        }
                        finalData = parseResult.data;
                    }
                    else if (typeof finalConfig.schema.parse === 'function') {
                        try {
                            finalData = finalConfig.schema.parse(finalData);
                        }
                        catch (valErr) {
                            return {
                                data: null,
                                error: {
                                    message: 'ApiKit: Response schema validation failed',
                                    status: interceptedResponse.status,
                                    details: valErr,
                                },
                                status: interceptedResponse.status,
                                raw: interceptedResponse.raw,
                            };
                        }
                    }
                }
                // 9. After successful GET, store in cache
                if (isGet && apiConfig.cache && finalData !== undefined && interceptedResponse.status >= 200 && interceptedResponse.status < 300) {
                    const ttl = finalConfig.cacheTtlMs || 60000;
                    yield apiConfig.cache.set(cacheKey, { data: finalData, status: interceptedResponse.status, raw: interceptedResponse.raw }, ttl);
                }
                const duration = Date.now() - startTime;
                logger_1.apiLogger.logResponse(method, finalUrl, interceptedResponse.status, duration, finalData);
                return {
                    data: finalData,
                    error: interceptedResponse.status >= 400 ? {
                        message: `Request failed with status ${interceptedResponse.status}`,
                        status: interceptedResponse.status,
                        details: finalData,
                        isUnauthorized: interceptedResponse.status === 401,
                        isRateLimited: interceptedResponse.status === 429,
                    } : null,
                    status: interceptedResponse.status,
                    raw: interceptedResponse.raw,
                };
            }
            catch (error) {
                let apiError;
                if (error.name === 'AbortError' || ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('aborted'))) {
                    apiError = { message: 'Request cancelled', isNetworkError: false };
                }
                else if (((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('Network request failed')) || error.isNetworkError) {
                    apiError = { message: 'No internet connection', isNetworkError: true };
                }
                else if (error.code === 'ECONNABORTED' || ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('timeout')) || error.isTimeout) {
                    apiError = { message: 'Request timeout', isTimeout: true };
                }
                else {
                    apiError = {
                        message: error.message || 'An error occurred',
                        status: ((_e = error.response) === null || _e === void 0 ? void 0 : _e.status) || error.status,
                        details: ((_f = error.response) === null || _f === void 0 ? void 0 : _f.data) || error.details,
                        isUnauthorized: ((_g = error.response) === null || _g === void 0 ? void 0 : _g.status) === 401 || error.status === 401,
                        isRateLimited: ((_h = error.response) === null || _h === void 0 ? void 0 : _h.status) === 429 || error.status === 429,
                        rawError: error,
                    };
                }
                // --- Interceptor: onError ---
                if (apiConfig.onError) {
                    apiError = yield apiConfig.onError(apiError);
                }
                lastError = apiError;
                // Handle offline mutation queue
                if (apiError.isNetworkError && finalConfig.offlineQueue && method !== 'GET') {
                    yield offlineQueue_1.offlineQueue.add({
                        url,
                        method,
                        data: body,
                        headers: finalConfig.headers,
                    });
                }
                // Retry conditions (Network errors, timeouts, or 429 rate limit)
                const shouldRetry = (apiError.isNetworkError || apiError.isTimeout || apiError.isRateLimited) && attempt < maxRetries;
                if (shouldRetry) {
                    const delay = (0, rateLimit_1.calculateBackoffWithJitter)(attempt, 300, apiConfig.maxRetryDelay || 10000);
                    yield new Promise(res => setTimeout(res, delay));
                    attempt++;
                    continue;
                }
                logger_1.apiLogger.logError(method, url, apiError.message, apiError.details);
                return { data: null, error: apiError };
            }
        }
        return { data: null, error: lastError };
    });
}
exports.apiClient = {
    get(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return executeRequest('GET', url, undefined, config);
        });
    },
    post(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return executeRequest('POST', url, data, config);
        });
    },
    put(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return executeRequest('PUT', url, data, config);
        });
    },
    patch(url, data, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return executeRequest('PATCH', url, data, config);
        });
    },
    del(url, config) {
        return __awaiter(this, void 0, void 0, function* () {
            return executeRequest('DELETE', url, undefined, config);
        });
    },
    request(config) {
        return __awaiter(this, void 0, void 0, function* () {
            return executeRequest(config);
        });
    },
    upload(url, formData, config) {
        return __awaiter(this, void 0, void 0, function* () {
            const apiConfig = (0, config_1.getApiKitConfig)();
            const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${apiConfig.baseUrl}${url}`;
            let token = null;
            if (apiConfig.tokenStorage && !(config === null || config === void 0 ? void 0 : config.skipToken)) {
                try {
                    token = yield apiConfig.tokenStorage.getToken();
                }
                catch (_a) {
                    // Ignore
                }
            }
            const headers = Object.assign(Object.assign({}, apiConfig.headers), config === null || config === void 0 ? void 0 : config.headers);
            if (token) {
                headers.Authorization = `Bearer ${token}`;
            }
            try {
                const { promise } = (0, uploader_1.uploadFile)(fullUrl, formData, Object.assign(Object.assign({}, config), { headers }));
                const res = yield promise;
                return { data: res.data, error: null, status: res.status, raw: res.raw };
            }
            catch (err) {
                return {
                    data: null,
                    error: {
                        message: err.message || 'Upload failed',
                        status: err.status,
                        details: err.details,
                        isNetworkError: err.isNetworkError,
                    },
                };
            }
        });
    },
    offlineQueue: offlineQueue_1.offlineQueue,
};
