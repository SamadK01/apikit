# ApiKit

> **Write once, request anywhere—no boilerplate, no confusion, just clean code.**

ApiKit is the ultimate, modern API toolkit for React Native and Expo. It automates everything you repeat in API calls—loading, error, data states, token injection, smart response parsing, network status, timeout/cancel, global 401 handling, retry logic, and friendly error messages. Fetch is the default engine, but you can switch to Axios with one line. TypeScript-first, tree-shakable, minimal bundle size. For beginners and pros alike.

---

## 🚀 Why ApiKit?
- **One hook, all power:** `useApi()` handles everything—no more manual state, try/catch, or header plumbing.
- **Fetch-first, Axios-compatible:** Use the fastest native fetch, or switch to Axios (with interceptors/cancel tokens) instantly.
- **Expo & React Native CLI:** Works out-of-the-box in all RN/Expo projects (Android/iOS/Web).
- **Automatic token management:** Securely injects tokens from AsyncStorage, SecureStore, MMKV, or your own storage.
- **Smart response parsing:** Handles JSON, text, FormData, binary—no manual parsing needed.
- **Network-aware:** Detects offline/online, retries smartly, and gives user-friendly errors.
- **Minimal, fast, and extensible:** Tree-shakable, TypeScript-ready, and easy to extend.

---

## ✨ Features
- Single, readable hook: `useApi()`
- Built-in loading, error, data states
- Automatic token injection (AsyncStorage, SecureStore, MMKV, or custom)
- Smart response parsing (JSON, text, FormData, binary)
- Network status detection
- Timeout & cancel support
- Global 401 handling
- Retry logic
- Friendly error messages ("No Internet", "Server Error", validation, etc.)
- Fetch default, Axios optional (with interceptors/cancel tokens)
- TypeScript support, tree-shakable, minimal bundle size
- Expo & React Native CLI compatible

---

## 📦 Installation

### 1. Install ApiKit
```sh
npm install react-native-apikit
# or
yarn add react-native-apikit
```

### 2. (Optional) For Axios engine
```sh
npm install axios
```

### 3. For Token Storage (Choose ONE based on your project)

#### For React Native CLI (Recommended)
```sh
npm install @react-native-async-storage/async-storage
```

#### For Expo projects only
```sh
expo install expo-secure-store
```

#### For Fastest Storage (MMKV)
```sh
npm install react-native-mmkv
```

**Note:** 
- Use `@react-native-async-storage/async-storage` for React Native CLI projects
- Use `expo-secure-store` only for Expo projects
- Use `react-native-mmkv` for best performance (recommended for large apps)
- ApiKit will show helpful warnings if the required storage dependency isn't installed

---

## ⚡️ Quick Start

### 1. Configure ApiKit (global setup)
```tsx
import { configureApiKit, asyncStorageToken, secureStoreToken, mmkvToken } from 'react-native-apikit';

// For React Native CLI (recommended)
configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: asyncStorageToken, // Use this for React Native CLI
  engine: 'fetch', // or 'axios'
  retry: 2, // auto-retry failed requests
  timeout: 10000, // 10s timeout
  onUnauthorized: () => {/* handle global 401 */},
});

// For Expo projects only
configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: secureStoreToken, // Use this for Expo
  engine: 'fetch',
  retry: 2,
  timeout: 10000,
  onUnauthorized: () => {/* handle global 401 */},
});

// For Fastest Storage (MMKV)
configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: mmkvToken, // Use this for best performance
  engine: 'fetch',
  retry: 2,
  timeout: 10000,
  onUnauthorized: () => {/* handle global 401 */},
});
```

### 2. Use the `useApi` hook in your components
```tsx
import { useApi } from 'react-native-apikit';

function UserList() {
  const { get, post, loading, error, data } = useApi();

  useEffect(() => {
    get('/users');
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error.message}</Text>;
  return <FlatList data={data} renderItem={...} />;
}
```

---

## 🛠 Usage Examples

### GET request
```tsx
const { get, data, loading, error } = useApi();
get('/users');
```

### POST request with body
```tsx
post('/login', { email, password });
```

### Custom headers, params, and error handling
```tsx
get('/profile', {
  headers: { 'X-Custom': 'value' },
  params: { lang: 'en' },
  timeout: 5000,
});
```

### Switch to Axios engine
```tsx
configureApiKit({ engine: 'axios' });
```

### Use SecureStore for Expo
```tsx
configureApiKit({ tokenStorage: secureStoreToken });
```

### Use MMKV for Fastest Storage
```tsx
configureApiKit({ tokenStorage: mmkvToken });
```

### Custom token storage
```tsx
const myStorage = {
  getToken: async () => ..., setToken: async (t) => ..., removeToken: async () => ...
};
configureApiKit({ tokenStorage: myStorage });
```

---

## 🔒 Token Management
- **Automatic:** All requests include your token (Bearer) if available.
- **Storage options:** 
  - `asyncStorageToken` (React Native CLI - recommended)
  - `secureStoreToken` (Expo projects only)
  - `mmkvToken` (Fastest, recommended for large apps)
  - Custom storage implementation
- **Set/Remove token:**
  ```js
  // For React Native CLI
  await asyncStorageToken.setToken('your-token');
  await asyncStorageToken.removeToken();
  
  // For Expo
  await secureStoreToken.setToken('your-token');
  await secureStoreToken.removeToken();

  // For MMKV
  await mmkvToken.setToken('your-token');
  await mmkvToken.removeToken();
  ```

---

## 🌐 Network, Timeout, Retry, Cancel
- **Network status:** Detects offline/online, returns friendly errors.
- **Timeout:** Set per-request or globally.
- **Retry:** Auto-retry failed requests (configurable).
- **Cancel:** Cancel requests with AbortController (fetch) or cancel tokens (axios).

---

## 🧩 Advanced: Custom Engine & Extensibility
- **Custom engine:**
  ```js
  const myEngine = { request: async (config) => { /* ... */ } };
  configureApiKit({ engine: myEngine });
  ```
- **Interceptors (Axios):** Use axios as usual, all interceptors/cancel tokens work.
- **Global 401:** Handle unauthorized globally with `onUnauthorized`.

---

## 🆚 ApiKit vs Others
| Feature                | ApiKit | react-query | swr | axios | fetch |
|------------------------|:------:|:-----------:|:---:|:-----:|:-----:|
| React Native/Expo      |   ✅   |      ⚠️      | ⚠️  |   ✅   |  ✅   |
| useApi hook            |   ✅   |      ❌      | ❌  |   ❌   |  ❌   |
| Built-in loading/error |   ✅   |      ✅      | ✅  |   ❌   |  ❌   |
| Token injection        |   ✅   |      ❌      | ❌  |   ❌   |  ❌   |
| Engine switch (fetch/axios) | ✅ | ❌ | ❌ | ✅ | ✅ |
| Network/timeout/cancel |   ✅   |      ⚠️      | ⚠️  |   ⚠️   |  ⚠️   |
| Retry logic            |   ✅   |      ✅      | ✅  |   ⚠️   |  ⚠️   |
| Global 401             |   ✅   |      ❌      | ❌  |   ❌   |  ❌   |
| Tree-shakable/minimal  |   ✅   |      ❌      | ❌  |   ❌   |  ✅   |
| TypeScript-first       |   ✅   |      ✅      | ✅  |   ⚠️   |  ⚠️   |

---

## 🏆 Best Practices
- Use `configureApiKit` at app startup (App.js/ts).
- Use `useApi` in every screen/component for clean, isolated API logic.
- **For React Native CLI:** Use `asyncStorageToken` (install `@react-native-async-storage/async-storage`)
- **For Expo:** Use `secureStoreToken` (install `expo-secure-store`)
- **For Fastest Storage:** Use `mmkvToken` (install `react-native-mmkv`)
- Use Axios engine only if you need interceptors or advanced cancel tokens.
- Always handle `loading` and `error` states in UI.

---

## 🔄 Migrating from Axios/Fetch/Other Hooks
- Replace all manual fetch/axios calls with `useApi().get/post/put/patch/del`.
- Remove manual state, try/catch, and token/header plumbing.
- Use ApiKit's built-in error and loading states.

---

## 🧑‍💻 Real-World Examples

### React Native CLI Example
```tsx
import { configureApiKit, useApi, asyncStorageToken } from 'react-native-apikit';

configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: asyncStorageToken, // For React Native CLI
  engine: 'fetch',
});

export default function App() {
  const { get, post, loading, error, data } = useApi();

  useEffect(() => {
    get('/me');
  }, []);

  // ...render UI
}
```

### Expo Example
```tsx
import { configureApiKit, useApi, secureStoreToken } from 'react-native-apikit';

configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: secureStoreToken, // For Expo only
  engine: 'fetch',
});

export default function App() {
  const { get, post, loading, error, data } = useApi();

  useEffect(() => {
    get('/me');
  }, []);

  // ...render UI
}
```

### MMKV Example
```tsx
import { configureApiKit, useApi, mmkvToken } from 'react-native-apikit';

configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: mmkvToken, // For best performance
  engine: 'fetch',
});

export default function App() {
  const { get, post, loading, error, data } = useApi();

  useEffect(() => {
    get('/me');
  }, []);

  // ...render UI
}
```

---

## 📚 API Reference
### `configureApiKit(config)`
Set global config (baseUrl, engine, tokenStorage, retry, timeout, onUnauthorized, headers).

### `useApi()`
Returns `{ get, post, put, patch, del, loading, error, data, reset }`.

### Engines
- `fetchEngine` (default)
- `axiosEngine` (optional, install axios)

### Token Storage
- `asyncStorageToken` (React Native CLI - recommended)
- `secureStoreToken` (Expo projects only)
- `mmkvToken` (Fastest, recommended for large apps)
- Custom: `{ getToken, setToken, removeToken }`

---

## 📲 Platform Support
- **Android:** 100% compatible (Expo & RN CLI)
- **iOS:** 100% compatible (Expo & RN CLI)
- **Web:** Works with fetch engine (limited features)

---

## 📝 License
MIT

---

## 🙋 FAQ
**Q: Can I use ApiKit in Expo Go?**
A: Yes! Use `secureStoreToken` for token storage and install `expo-secure-store`.

**Q: Can I use ApiKit in React Native CLI?**
A: Yes! Use `asyncStorageToken` for token storage and install `@react-native-async-storage/async-storage`.

**Q: Can I use ApiKit with MMKV?**
A: Yes! Use `mmkvToken` for fastest storage and install `react-native-mmkv`.

**Q: How do I switch to Axios?**
A: `configureApiKit({ engine: 'axios' })` and install `axios`.

**Q: How do I handle file uploads?**
A: Pass `FormData` as `data` in your request.

**Q: How do I add global headers?**
A: Use `headers` in `configureApiKit`.

**Q: How do I catch validation errors?**
A: All errors are parsed and available in the `error` object from `useApi`.

**Q: What if I don't install the storage dependency?**
A: ApiKit will show helpful console warnings and return null for token operations.

---

## 🤝 Contributing
Pull requests, issues, and suggestions welcome!

---

## 🔗 Links
- [ApiKit GitHub](https://github.com/SamadK01/apikit)
- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Axios](https://axios-http.com/)
- [MMKV](https://github.com/mrousavy/react-native-mmkv)
