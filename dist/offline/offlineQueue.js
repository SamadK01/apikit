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
exports.offlineQueue = void 0;
const QUEUE_STORAGE_KEY = 'apikit_offline_queue';
let customStorage = null;
let memoryQueue = [];
exports.offlineQueue = {
    setStorage(storage) {
        customStorage = storage;
    },
    getPending() {
        return __awaiter(this, void 0, void 0, function* () {
            if (customStorage) {
                try {
                    const raw = yield customStorage.getToken(); // using storage get interface
                    if (raw)
                        return JSON.parse(raw);
                }
                catch (_a) {
                    // Fallback to memory
                }
            }
            return [...memoryQueue];
        });
    },
    add(mutation) {
        return __awaiter(this, void 0, void 0, function* () {
            const id = `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const newEntry = Object.assign(Object.assign({}, mutation), { id, timestamp: Date.now(), retryCount: 0 });
            const current = yield this.getPending();
            current.push(newEntry);
            yield this.saveQueue(current);
            return id;
        });
    },
    remove(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const current = yield this.getPending();
            const filtered = current.filter(item => item.id !== id);
            yield this.saveQueue(filtered);
        });
    },
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            memoryQueue = [];
            if (customStorage) {
                try {
                    yield customStorage.removeToken();
                }
                catch (_a) {
                    // Ignore
                }
            }
        });
    },
    saveQueue(queue) {
        return __awaiter(this, void 0, void 0, function* () {
            memoryQueue = queue;
            if (customStorage) {
                try {
                    yield customStorage.setToken(JSON.stringify(queue));
                }
                catch (_a) {
                    // Ignore
                }
            }
        });
    },
    sync(client) {
        return __awaiter(this, void 0, void 0, function* () {
            const queue = yield this.getPending();
            if (queue.length === 0)
                return [];
            const results = [];
            const remaining = [];
            for (const mutation of queue) {
                try {
                    const response = yield client.request({
                        url: mutation.url,
                        method: mutation.method,
                        data: mutation.data,
                        headers: mutation.headers,
                    });
                    if (response.error && response.error.isNetworkError) {
                        // Still offline, stop sync and keep in queue
                        mutation.retryCount += 1;
                        remaining.push(mutation);
                        results.push({ mutation, success: false, error: response.error });
                        break;
                    }
                    else if (response.error) {
                        // Server rejected, discard from queue but report result
                        results.push({ mutation, success: false, error: response.error });
                    }
                    else {
                        // Success
                        results.push({ mutation, success: true, response: response.data });
                    }
                }
                catch (err) {
                    mutation.retryCount += 1;
                    remaining.push(mutation);
                    results.push({ mutation, success: false, error: { message: err.message || 'Sync failed' } });
                    break;
                }
            }
            yield this.saveQueue(remaining);
            return results;
        });
    },
};
