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
exports.useAiStream = useAiStream;
const react_1 = require("react");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
/**
 * Extracts content from an SSE line. Supports OpenAI delta format, custom JSON, or plain text.
 */
function parseSseLine(line) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(':'))
        return null; // Ping or empty line
    if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]')
            return null;
        try {
            const parsed = JSON.parse(payload);
            // OpenAI / Groq / OpenRouter delta format
            if (((_c = (_b = (_a = parsed.choices) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.delta) === null || _c === void 0 ? void 0 : _c.content) !== undefined) {
                return parsed.choices[0].delta.content || '';
            }
            // Anthropic format
            if (((_d = parsed.delta) === null || _d === void 0 ? void 0 : _d.text) !== undefined) {
                return parsed.delta.text || '';
            }
            // Gemini format
            if (((_j = (_h = (_g = (_f = (_e = parsed.candidates) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.content) === null || _g === void 0 ? void 0 : _g.parts) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.text) !== undefined) {
                return parsed.candidates[0].content.parts[0].text || '';
            }
            // Generic payload with 'text' or 'content'
            if (typeof parsed.text === 'string')
                return parsed.text;
            if (typeof parsed.content === 'string')
                return parsed.content;
            return typeof parsed === 'string' ? parsed : '';
        }
        catch (_k) {
            // Plain text after 'data:'
            return payload;
        }
    }
    return null;
}
function useAiStream() {
    const [text, setText] = (0, react_1.useState)('');
    const [data, setData] = (0, react_1.useState)(null);
    const [isStreaming, setIsStreaming] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [tokensCount, setTokensCount] = (0, react_1.useState)(0);
    const abortControllerRef = (0, react_1.useRef)(null);
    const activeXhrRef = (0, react_1.useRef)(null);
    const stop = (0, react_1.useCallback)(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (activeXhrRef.current) {
            activeXhrRef.current.abort();
            activeXhrRef.current = null;
        }
        setIsStreaming(false);
    }, []);
    const reset = (0, react_1.useCallback)(() => {
        stop();
        setText('');
        setData(null);
        setError(null);
        setTokensCount(0);
    }, [stop]);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => {
        return () => {
            stop();
        };
    }, [stop]);
    const stream = (0, react_1.useCallback)((url, config) => __awaiter(this, void 0, void 0, function* () {
        stop();
        setIsStreaming(true);
        setError(null);
        setText('');
        setData(null);
        setTokensCount(0);
        const apiConfig = (0, config_1.getApiKitConfig)();
        const fullUrl = url.startsWith('http') ? url : `${apiConfig.baseUrl}${url}`;
        // Prepare auth headers
        let token = null;
        if (apiConfig.tokenStorage) {
            try {
                token = yield apiConfig.tokenStorage.getToken();
            }
            catch (_a) {
                // Ignore
            }
        }
        const headers = Object.assign(Object.assign({ 'Accept': 'text/event-stream, text/plain', 'Content-Type': 'application/json' }, apiConfig.headers), config === null || config === void 0 ? void 0 : config.headers);
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
        const mode = (config === null || config === void 0 ? void 0 : config.mode) || 'openai';
        return new Promise((resolve, reject) => {
            let accumulated = '';
            let lastSeenLength = 0;
            // Handle abort signal from config
            if (config === null || config === void 0 ? void 0 : config.signal) {
                config.signal.addEventListener('abort', () => {
                    stop();
                    const err = { message: 'Streaming cancelled' };
                    setError(err);
                    reject(err);
                });
            }
            // We use XMLHttpRequest with onprogress, which is universally reliable across React Native iOS/Android/Hermes and Web
            const xhr = new XMLHttpRequest();
            activeXhrRef.current = xhr;
            xhr.open((config === null || config === void 0 ? void 0 : config.method) || 'POST', fullUrl, true);
            Object.entries(headers).forEach(([k, v]) => {
                if (v !== undefined)
                    xhr.setRequestHeader(k, String(v));
            });
            const handleIncomingChunk = (newChunk) => {
                var _a, _b;
                if (!newChunk)
                    return;
                if (mode === 'text') {
                    accumulated += newChunk;
                    setText(accumulated);
                    setTokensCount((0, logger_1.estimateAiTokens)(accumulated));
                    (_a = config === null || config === void 0 ? void 0 : config.onToken) === null || _a === void 0 ? void 0 : _a.call(config, newChunk, accumulated);
                }
                else {
                    // SSE mode or OpenAI mode
                    const lines = newChunk.split('\n');
                    for (const line of lines) {
                        const tokenText = parseSseLine(line);
                        if (tokenText) {
                            accumulated += tokenText;
                            setText(accumulated);
                            setTokensCount((0, logger_1.estimateAiTokens)(accumulated));
                            (_b = config === null || config === void 0 ? void 0 : config.onToken) === null || _b === void 0 ? void 0 : _b.call(config, tokenText, accumulated);
                        }
                    }
                }
            };
            xhr.onprogress = () => {
                try {
                    const currentText = xhr.responseText || '';
                    const newChunk = currentText.substring(lastSeenLength);
                    lastSeenLength = currentText.length;
                    handleIncomingChunk(newChunk);
                }
                catch (_a) {
                    // Ignore partial read errors on older runtimes
                }
            };
            xhr.onload = () => {
                var _a, _b, _c;
                setIsStreaming(false);
                activeXhrRef.current = null;
                // Process any remainder
                try {
                    const currentText = xhr.responseText || '';
                    if (currentText.length > lastSeenLength) {
                        const remaining = currentText.substring(lastSeenLength);
                        handleIncomingChunk(remaining);
                    }
                }
                catch (_d) {
                    // Ignore
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    (_a = config === null || config === void 0 ? void 0 : config.onComplete) === null || _a === void 0 ? void 0 : _a.call(config, accumulated);
                    resolve(accumulated);
                }
                else {
                    let errorMsg = `Streaming failed with status ${xhr.status}`;
                    let details;
                    try {
                        details = JSON.parse(xhr.responseText);
                        if ((_b = details.error) === null || _b === void 0 ? void 0 : _b.message)
                            errorMsg = details.error.message;
                    }
                    catch (_e) {
                        details = xhr.responseText;
                    }
                    const apiError = {
                        message: errorMsg,
                        status: xhr.status,
                        details,
                        isUnauthorized: xhr.status === 401,
                        isRateLimited: xhr.status === 429,
                    };
                    setError(apiError);
                    (_c = config === null || config === void 0 ? void 0 : config.onError) === null || _c === void 0 ? void 0 : _c.call(config, apiError);
                    reject(apiError);
                }
            };
            xhr.onerror = () => {
                var _a;
                setIsStreaming(false);
                activeXhrRef.current = null;
                const apiError = {
                    message: 'Network error during streaming',
                    isNetworkError: true,
                };
                setError(apiError);
                (_a = config === null || config === void 0 ? void 0 : config.onError) === null || _a === void 0 ? void 0 : _a.call(config, apiError);
                reject(apiError);
            };
            xhr.onabort = () => {
                setIsStreaming(false);
                activeXhrRef.current = null;
                const apiError = {
                    message: 'Streaming cancelled',
                };
                setError(apiError);
                resolve(accumulated);
            };
            const bodyData = (config === null || config === void 0 ? void 0 : config.body) ? JSON.stringify(config.body) : null;
            xhr.send(bodyData);
        });
    }), [stop]);
    return {
        text,
        data,
        isStreaming,
        error,
        tokensCount,
        stream,
        stop,
        reset,
    };
}
