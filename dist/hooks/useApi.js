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
exports.usePaginatedApi = usePaginatedApi;
const react_1 = require("react");
const plainApiClient_1 = require("../plainApiClient");
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
    const abortControllers = (0, react_1.useRef)({});
    const makeRequest = (0, react_1.useCallback)((method, url, data, config) => __awaiter(this, void 0, void 0, function* () {
        setState(prev => (Object.assign(Object.assign({}, prev), { loading: true, error: null })));
        // Setup AbortController
        let controller;
        let signal = config === null || config === void 0 ? void 0 : config.signal;
        if (!signal && typeof AbortController !== 'undefined') {
            controller = new AbortController();
            signal = controller.signal;
            abortControllers.current[url] = controller;
        }
        const result = yield (0, plainApiClient_1.executeRequest)(method, url, data, Object.assign(Object.assign({}, config), { signal }));
        if (controller) {
            delete abortControllers.current[url];
        }
        setState({
            loading: false,
            error: result.error,
            data: result.data,
        });
        return result;
    }), []);
    // Helper to wrap each method to return cancel and strongly typed result
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
    return Object.assign(Object.assign({}, state), { get: withCancel((url, config) => makeRequest('GET', url, undefined, config)), post: withCancel((url, data, config) => makeRequest('POST', url, data, config)), put: withCancel((url, data, config) => makeRequest('PUT', url, data, config)), patch: withCancel((url, data, config) => makeRequest('PATCH', url, data, config)), del: withCancel((url, config) => makeRequest('DELETE', url, undefined, config)), reset });
}
// Paginated API hook
function usePaginatedApi(url, { pageSize = 20, initialPage = 1, params = {}, pageParamName = 'page', pageSizeParamName = 'pageSize', config, } = {}) {
    const [page, setPage] = (0, react_1.useState)(initialPage);
    const [data, setData] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [hasMore, setHasMore] = (0, react_1.useState)(true);
    const fetchPage = (pageNum_1, ...args_1) => __awaiter(this, [pageNum_1, ...args_1], void 0, function* (pageNum, isRefresh = false) {
        setLoading(true);
        setError(null);
        try {
            const queryParams = Object.assign(Object.assign({}, params), { [pageParamName]: pageNum, [pageSizeParamName]: pageSize });
            const result = yield (0, plainApiClient_1.executeRequest)('GET', url, undefined, Object.assign(Object.assign({}, config), { params: queryParams }));
            if (result.error) {
                setError(result.error);
                return;
            }
            // Handle raw array or nested items (e.g. { results: [] } or { data: [] })
            let items = [];
            const resData = result.data;
            if (Array.isArray(resData)) {
                items = resData;
            }
            else if (resData && Array.isArray(resData.data)) {
                items = resData.data;
            }
            else if (resData && Array.isArray(resData.results)) {
                items = resData.results;
            }
            else if (resData && Array.isArray(resData.items)) {
                items = resData.items;
            }
            setData(prev => (pageNum === 1 || isRefresh ? items : [...prev, ...items]));
            setHasMore(items.length >= pageSize);
        }
        catch (err) {
            setError({ message: err.message || 'An error occurred' });
        }
        finally {
            setLoading(false);
        }
    });
    (0, react_1.useEffect)(() => {
        fetchPage(page);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, url, JSON.stringify(params)]);
    const nextPage = () => {
        if (hasMore && !loading)
            setPage(p => p + 1);
    };
    const prevPage = () => {
        if (page > 1 && !loading)
            setPage(p => p - 1);
    };
    const refresh = () => {
        setPage(initialPage);
        fetchPage(initialPage, true);
    };
    const reset = () => {
        setPage(initialPage);
        setData([]);
        setHasMore(true);
        setError(null);
    };
    return { page, data, loading, error, hasMore, nextPage, prevPage, refresh, reset };
}
