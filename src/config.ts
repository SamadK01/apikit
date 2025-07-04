import { ApiKitConfig, ApiEngine } from './types';
import { fetchEngine } from './engine/fetchEngine';
import { axiosEngine } from './engine/axiosEngine';

let apiKitConfig: ApiKitConfig = {
  baseUrl: '',
  engine: 'fetch',
  retry: 0,
  timeout: 10000,
  headers: {},
};

let currentEngine: ApiEngine = fetchEngine;

export function configureApiKit(config: ApiKitConfig): void {
  apiKitConfig = { ...apiKitConfig, ...config };
  
  // Set the engine based on config
  if (config.engine === 'axios') {
    try {
      currentEngine = axiosEngine;
    } catch (error) {
      console.warn('ApiKit: axios not installed. Falling back to fetch engine. Install axios: npm install axios');
      currentEngine = fetchEngine;
    }
  } else if (config.engine === 'fetch') {
    currentEngine = fetchEngine;
  } else if (config.engine) {
    currentEngine = config.engine;
  }
}

export function getApiKitConfig(): ApiKitConfig {
  return apiKitConfig;
}

export function getEngine(): ApiEngine {
  return currentEngine;
} 