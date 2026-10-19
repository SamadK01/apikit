"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = uploadFile;
function uploadFile(url, formData, options = {}) {
    let xhr = new XMLHttpRequest();
    let cancelled = false;
    const cancel = () => {
        if (xhr && !cancelled) {
            cancelled = true;
            xhr.abort();
        }
    };
    const promise = new Promise((resolve, reject) => {
        if (!xhr) {
            return reject({ message: 'XMLHttpRequest is not available' });
        }
        xhr.open(options.method || 'POST', url);
        // Timeout
        if (options.timeout) {
            xhr.timeout = options.timeout;
        }
        // Set custom headers (omit Content-Type for FormData so boundary is generated automatically)
        if (options.headers) {
            Object.entries(options.headers).forEach(([key, val]) => {
                if (key.toLowerCase() !== 'content-type' && val !== undefined) {
                    xhr === null || xhr === void 0 ? void 0 : xhr.setRequestHeader(key, String(val));
                }
            });
        }
        // Listen to signal
        if (options.signal) {
            if (options.signal.aborted) {
                cancel();
                return reject({ message: 'Upload cancelled', isNetworkError: false });
            }
            options.signal.addEventListener('abort', () => {
                cancel();
                reject({ message: 'Upload cancelled', isNetworkError: false });
            });
        }
        // Progress listener
        if (xhr.upload && options.onProgress) {
            xhr.upload.onprogress = (event) => {
                var _a;
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    (_a = options.onProgress) === null || _a === void 0 ? void 0 : _a.call(options, {
                        loaded: event.loaded,
                        total: event.total,
                        percent,
                    });
                }
            };
        }
        xhr.onload = () => {
            if (!xhr)
                return;
            const status = xhr.status;
            let data = xhr.response;
            // Parse JSON if possible
            try {
                if (typeof xhr.responseText === 'string') {
                    data = JSON.parse(xhr.responseText);
                }
            }
            catch (_a) {
                data = xhr.responseText || xhr.response;
            }
            // Parse headers
            const rawHeaders = xhr.getAllResponseHeaders() || '';
            const headers = {};
            rawHeaders.trim().split(/[\r\n]+/).forEach(line => {
                const parts = line.split(': ');
                const header = parts.shift();
                const value = parts.join(': ');
                if (header)
                    headers[header.toLowerCase()] = value;
            });
            if (status >= 200 && status < 300) {
                resolve({
                    data,
                    status,
                    headers,
                    raw: xhr,
                });
            }
            else {
                reject({
                    message: `Upload failed with status ${status}`,
                    status,
                    details: data,
                    isUnauthorized: status === 401,
                    isRateLimited: status === 429,
                });
            }
        };
        xhr.onerror = () => {
            reject({
                message: 'Network request failed during upload',
                isNetworkError: true,
            });
        };
        xhr.ontimeout = () => {
            reject({
                message: 'Upload timed out',
                isTimeout: true,
            });
        };
        xhr.onabort = () => {
            reject({
                message: 'Upload cancelled',
            });
        };
        xhr.send(formData);
    });
    return { promise, cancel };
}
