# ApiKit

> Write once, request anywhere—no boilerplate, no confusion, sirf clean code.

A lightweight, Fetch‑first but Axios‑compatible API toolkit for React Native + Expo. Automates everything developers repeat in API calls: built-in loading, error, data states, automatic token injection, smart response parsing, network status, timeout/cancel, global 401 handling, retry logic, and friendly error messages. Fetch is default, but switch to Axios with one line. TypeScript-ready, tree-shakable, minimal bundle size. For beginners and pros alike.

## Features
- Single, readable hook: `useApi()`
- Built-in loading, error, data states
- Automatic token injection (AsyncStorage, SecureStore, or custom)
- Smart response parsing (JSON, text, FormData, binary)
- Network status detection
- Timeout & cancel support
- Global 401 handling
- Retry logic
- Friendly error messages
- Fetch default, Axios optional
- TypeScript support, tree-shakable, minimal bundle size
- Expo & React Native CLI compatible

## Install
```sh
npm install apikit
# or
yarn add apikit
# For Axios engine (optional)
npm install axios
# For AsyncStorage (React Native CLI)
npm install @react-native-async-storage/async-storage
# For SecureStore (Expo)
expo install expo-secure-store
```

## Usage
```tsx
import { useApi, configureApiKit, asyncStorageToken } from 'apikit';

configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: asyncStorageToken, // or secureStoreToken
  engine: 'fetch', // or 'axios'
});

function MyComponent() {
  const { get, post, loading, error, data } = useApi();
  // ...
}
```

## API
- `useApi()` — main hook
- `configureApiKit(config)` — global config
- Engines: `fetchEngine`, `axiosEngine`
- Token storage: `asyncStorageToken`, `secureStoreToken`

## License
MIT
