"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureApiKit = configureApiKit;
exports.getApiKitConfig = getApiKitConfig;
exports.getEngine = getEngine;
const fetchEngine_1 = require("./engine/fetchEngine");
const axiosEngine_1 = require("./engine/axiosEngine");
let apiKitConfig = {
    baseUrl: '',
    engine: 'fetch',
    retry: 0,
    timeout: 10000,
    headers: {},
};
let currentEngine = fetchEngine_1.fetchEngine;
function configureApiKit(config) {
    apiKitConfig = Object.assign(Object.assign({}, apiKitConfig), config);
    // Set the engine based on config
    if (config.engine === 'axios') {
        try {
            currentEngine = axiosEngine_1.axiosEngine;
        }
        catch (error) {
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
