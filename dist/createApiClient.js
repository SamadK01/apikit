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
exports.createApiClient = createApiClient;
const react_1 = require("react");
const fetchEngine_1 = require("./engine/fetchEngine");
const axiosEngine_1 = require("./engine/axiosEngine");
const plainApiClient_1 = require("./plainApiClient");
const uploader_1 = require("./utils/uploader");
function createApiClient(customConfig) {
    let config = Object.assign({ baseUrl: '', engine: 'fetch', retry: 0, timeout: 10000, headers: {} }, customConfig);
    let engine = fetchEngine_1.fetchEngine;
    if (config.engine === 'axios') {
        try {
            engine = axiosEngine_1.axiosEngine;
        }
        catch (_a) {
            engine = fetchEngine_1.fetchEngine;
        }
    }
    else if (config.engine === 'fetch') {
        engine = fetchEngine_1.fetchEngine;
    }
    else if (config.engine) {
        engine = config.engine;
    }
    const client = {
        config,
        get(url, reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, plainApiClient_1.executeRequest)('GET', url, undefined, reqConfig, config, engine);
            });
        },
        post(url, data, reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, plainApiClient_1.executeRequest)('POST', url, data, reqConfig, config, engine);
            });
        },
        put(url, data, reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, plainApiClient_1.executeRequest)('PUT', url, data, reqConfig, config, engine);
            });
        },
        patch(url, data, reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, plainApiClient_1.executeRequest)('PATCH', url, data, reqConfig, config, engine);
            });
        },
        del(url, reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, plainApiClient_1.executeRequest)('DELETE', url, undefined, reqConfig, config, engine);
            });
        },
        request(reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                return (0, plainApiClient_1.executeRequest)(reqConfig, undefined, undefined, undefined, config, engine);
            });
        },
        upload(url, formData, reqConfig) {
            return __awaiter(this, void 0, void 0, function* () {
                const fullUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `${config.baseUrl}${url}`;
                let token = null;
                if (config.tokenStorage && !(reqConfig === null || reqConfig === void 0 ? void 0 : reqConfig.skipToken)) {
                    try {
                        token = yield config.tokenStorage.getToken();
                    }
                    catch (_a) {
                        // Ignore
                    }
                }
                const headers = Object.assign(Object.assign({}, config.headers), reqConfig === null || reqConfig === void 0 ? void 0 : reqConfig.headers);
                if (token)
                    headers.Authorization = `Bearer ${token}`;
                try {
                    const { promise } = (0, uploader_1.uploadFile)(fullUrl, formData, Object.assign(Object.assign({}, reqConfig), { headers }));
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
        // Scoped useApi hook
        useApi() {
            const [state, setState] = (0, react_1.useState)({
                loading: false,
                error: null,
                data: null,
            });
            const abortControllers = (0, react_1.useRef)({});
            const reset = (0, react_1.useCallback)(() => {
                setState({ loading: false, error: null, data: null });
            }, []);
            const makeRequest = (0, react_1.useCallback)((method, url, data, reqConfig) => __awaiter(this, void 0, void 0, function* () {
                setState(prev => (Object.assign(Object.assign({}, prev), { loading: true, error: null })));
                let controller;
                let signal = reqConfig === null || reqConfig === void 0 ? void 0 : reqConfig.signal;
                if (!signal && typeof AbortController !== 'undefined') {
                    controller = new AbortController();
                    signal = controller.signal;
                    abortControllers.current[url] = controller;
                }
                const result = yield (0, plainApiClient_1.executeRequest)(method, url, data, Object.assign(Object.assign({}, reqConfig), { signal }), config, engine);
                if (controller)
                    delete abortControllers.current[url];
                setState({
                    loading: false,
                    error: result.error,
                    data: result.data,
                });
                return result;
            }), []);
            function withCancel(fn) {
                return (...args) => {
                    const url = args[0];
                    let controller;
                    if (abortControllers.current[url]) {
                        controller = abortControllers.current[url];
                    }
                    const promise = fn(...args);
                    return {
                        promise,
                        cancel: () => controller === null || controller === void 0 ? void 0 : controller.abort(),
                    };
                };
            }
            return Object.assign(Object.assign({}, state), { get: withCancel((url, rConfig) => makeRequest('GET', url, undefined, rConfig)), post: withCancel((url, d, rConfig) => makeRequest('POST', url, d, rConfig)), put: withCancel((url, d, rConfig) => makeRequest('PUT', url, d, rConfig)), patch: withCancel((url, d, rConfig) => makeRequest('PATCH', url, d, rConfig)), del: withCancel((url, rConfig) => makeRequest('DELETE', url, undefined, rConfig)), reset });
        },
    };
    return client;
}
