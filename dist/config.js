"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApiKit = configureApiKit;
exports.getApiKitConfig = getApiKitConfig;
exports.getEngine = getEngine;
const fetchEngine_1 = require("./engine/fetchEngine");
const axiosEngine_1 = require("./engine/axiosEngine");
const logger_1 = require("./utils/logger");
const offlineQueue_1 = require("./offline/offlineQueue");
let apiKitConfig = {
    baseUrl: '',
    engine: 'fetch',
    retry: 0,
    retryAfter429: true,
    timeout: 10000,
    headers: {},
    debug: false,
};
let currentEngine = fetchEngine_1.fetchEngine;
function configureApiKit(config) {
    apiKitConfig = Object.assign(Object.assign({}, apiKitConfig), config);
    if (config.debug !== undefined) {
        (0, logger_1.setDebugMode)(config.debug);
    }
    if (config.tokenStorage) {
        offlineQueue_1.offlineQueue.setStorage(config.tokenStorage);
    }
    // Set the engine based on config
    if (config.engine === 'axios') {
        try {
            currentEngine = axiosEngine_1.axiosEngine;
        }
        catch (_a) {
            console.warn('ApiKit: axios not installed. Falling back to fetch engine. Install axios: npm install axios');
            currentEngine = fetchEngine_1.fetchEngine;
        }
    }
    else if (config.engine === 'fetch') {
        currentEngine = fetchEngine_1.fetchEngine;
    }
    else if (config.engine) {
        currentEngine = config.engine;
    }
}
function getApiKitConfig() {
    return apiKitConfig;
}
function getEngine() {
    return currentEngine;
}
