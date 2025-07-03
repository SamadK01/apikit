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
exports.configureApiKit = configureApiKit;
exports.useApi = useApi;
const react_1 = require("react");
const fetchEngine_1 = require("../engine/fetchEngine");
// TODO: import asyncStorageToken, secureStoreToken, and allow custom storage
let globalConfig = {};
function configureApiKit(config) {
    globalConfig = config;
}
function useApi() {
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [data, setData] = (0, react_1.useState)(null);
    // Select engine
    const engine = typeof globalConfig.engine === 'string'
        ? globalConfig.engine === 'axios'
            ? require('../engine/axiosEngine').axiosEngine
            : fetchEngine_1.fetchEngine
        : globalConfig.engine || fetchEngine_1.fetchEngine;
    // TODO: token injection using globalConfig.tokenStorage
    // TODO: network status detection
    // TODO: timeout, cancel, retry logic
    // TODO: global 401 handling
    // TODO: friendly error messages
    const request = (0, react_1.useCallback)((method, url, body, config) => __awaiter(this, void 0, void 0, function* () {
        setLoading(true);
        setError(null);
        try {
            // TODO: inject token, merge headers, handle params
            const response = yield engine.request(Object.assign(Object.assign({ url: (globalConfig.baseUrl || '') + url, method: method, data: body }, globalConfig), config));
            setData(response.data);
        }
        catch (err) {
            // TODO: parse error, handle network/server/validation errors
            setError({ message: err.message || 'Unknown error' });
        }
        finally {
            setLoading(false);
        }
    }), []);
    return {
        loading,
        error,
        data,
        get: (url, config) => request('GET', url, undefined, config),
        post: (url, body, config) => request('POST', url, body, config),
        put: (url, body, config) => request('PUT', url, body, config),
        patch: (url, body, config) => request('PATCH', url, body, config),
        del: (url, config) => request('DELETE', url, undefined, config),
        reset: () => {
            setData(null);
            setError(null);
            setLoading(false);
        },
    };
}
