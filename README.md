# ApiKit ⚡️

> **The modern, ultra-lightweight, AI-ready API toolkit for React Native and Expo.**  
> *Zero runtime dependencies. Featherweight (< 15KB gzipped). Full TypeScript support.*

[![npm version](https://img.shields.io/npm/v/react-native-apikit.svg?style=flat-square)](https://www.npmjs.com/package/react-native-apikit)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/SamadK01/apikit/pulls)

---

## 🆕 What's New in v2.0.0 (Pro & AI-Ready Release)

- 🤖 **LLM / AI Streaming Hook (`useAiStream`):** First-class Server-Sent Events (SSE) streaming for OpenAI, Claude, DeepSeek, and Gemini in React Native.
- 🔄 **Silent Token Refresh Queue:** Automatically catches 401s, calls `refreshToken()`, and transparently replays pending requests.
- 📶 **Persistent Offline Queue (`offlineQueue`):** Auto-captures failed mutations (POST, PUT, DELETE) and auto-syncs when internet restores.
- ⏳ **Smart Rate-Limit Backoff (429 & Retry-After):** Automatically respects `Retry-After` and LLM rate-limit headers with jittered backoff.
- 📤 **Native File Upload with Progress (`uploadFile`):** Real-time percentage tracking for photos, videos, and FormData without bulky libraries.
- 🛡 **Runtime Schema Validation:** Compatible with Zod, Yup, Valibot, and TypeBox out-of-the-box.
- 🏢 **Multi-Client Support (`createApiClient`):** Spin up isolated instances with independent base URLs and tokens for microservices.
- 📊 **In-App Network & AI Token Logger (`apiLogger`):** Visual request/response timing and LLM token usage estimator in dev mode.
- 🗄 **Zero-Crash Storage Adapters:** MMKV, AsyncStorage, and SecureStore are now safely lazy-loaded—never crash on missing optional modules.

---

## 📦 Installation

```sh
npm install react-native-apikit
# or
yarn add react-native-apikit
# or
pnpm add react-native-apikit
```

### Optional Storage Engine (Choose what you use)

```sh
# For MMKV (Fastest, recommended)
npm install react-native-mmkv

# For React Native CLI
npm install @react-native-async-storage/async-storage

# For Expo
npx expo install expo-secure-store

# For Axios engine (Optional, fetch is default)
npm install axios
```

---

## 🚀 Quick Start

### 1. Configure ApiKit globally

```tsx
import { configureApiKit, mmkvToken, asyncStorageToken, secureStoreToken } from 'react-native-apikit';

configureApiKit({
  baseUrl: 'https://api.example.com',
  tokenStorage: mmkvToken, // or asyncStorageToken, secureStoreToken
  retry: 2,
  timeout: 10000,
  debug: __DEV__, // In-app network logger
  // Silent Token Refresh
  refreshToken: async () => {
    const res = await fetch('https://api.example.com/auth/refresh');
    const data = await res.json();
    return data.accessToken;
  },
  onUnauthorized: () => {
    // Navigate to Login screen
  },
});
```

---

## 💡 Core Features & Examples

### 1. 🤖 AI & LLM Streaming (`useAiStream`)

Stream real-time responses from OpenAI, Anthropic, Gemini, or custom SSE backends directly into your React Native UI:

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { useAiStream } from 'react-native-apikit';

export function ChatScreen() {
  const [prompt, setPrompt] = useState('');
  const { text, isStreaming, tokensCount, stream, stop } = useAiStream();

  const handleSend = () => {
    stream('/chat/completions', {
      method: 'POST',
      body: {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      },
    });
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <ScrollView style={{ flex: 1 }}>
        <Text>{text}</Text>
      </ScrollView>
      
      {isStreaming && (
        <Text style={{ color: 'gray' }}>Streaming... (~{tokensCount} tokens)</Text>
      )}

      <TextInput value={prompt} onChangeText={setPrompt} placeholder="Ask anything..." />
      <Button title={isStreaming ? "Stop" : "Send"} onPress={isStreaming ? stop : handleSend} />
    </View>
  );
}
```

---

### 2. ⚡️ The Classic `useApi` Hook

Handles `data`, `loading`, `error`, and request cancellation out of the box:

```tsx
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, FlatList, Button } from 'react-native';
import { useApi } from 'react-native-apikit';

export function UserList() {
  const { get, data, loading, error } = useApi<User[]>();

  useEffect(() => {
    const request = get('/users');
    return () => request.cancel(); // Auto-cancel on unmount
  }, []);

  if (loading) return <ActivityIndicator />;
  if (error) return <Text>Error: {error.message}</Text>;

  return (
    <FlatList
      data={data}
      keyExtractor={item => String(item.id)}
      renderItem={({ item }) => <Text>{item.name}</Text>}
    />
  );
}
```

---

### 3. 📤 File & Media Upload with Progress

Upload images, videos, and documents with real-time percentage progress:

```tsx
import { apiClient } from 'react-native-apikit';

async function uploadAvatar(fileUri: string) {
  const formData = new FormData();
  formData.append('avatar', {
    uri: fileUri,
    type: 'image/jpeg',
    name: 'avatar.jpg',
  } as any);

  const { data, error } = await apiClient.upload('/user/avatar', formData, {
    onUploadProgress: ({ percent, loaded, total }) => {
      console.log(`Upload: ${percent}% (${loaded}/${total} bytes)`);
    },
  });

  if (error) {
    console.error('Upload failed:', error.message);
  } else {
    console.log('Uploaded successfully:', data);
  }
}
```

---

### 4. 📶 Offline Mutation Queue (`offlineQueue`)

Never lose user actions when the connection drops:

```tsx
import { apiClient, offlineQueue } from 'react-native-apikit';

// Send a like/comment with offline queue enabled
await apiClient.post('/posts/1/like', {}, { offlineQueue: true });

// Sync pending items when back online:
const results = await offlineQueue.sync(apiClient);
console.log(`Synced ${results.length} offline mutations`);
```

---

### 5. 🛡 Runtime Schema Validation (Zod / Yup)

Safely validate responses and guarantee typed models:

```tsx
import { z } from 'zod';
import { apiClient } from 'react-native-apikit';

const UserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
});

const { data, error } = await apiClient.get('/profile', {
  schema: UserSchema,
});
```

---

### 6. 🏢 Multi-Client Architecture (`createApiClient`)

Create isolated client instances for different services or microservices:

```tsx
import { createApiClient } from 'react-native-apikit';

// Auth Microservice
export const authClient = createApiClient({
  baseUrl: 'https://auth.company.com/api',
});

// Payments Microservice
export const paymentClient = createApiClient({
  baseUrl: 'https://payments.company.com/api',
  timeout: 15000,
});

// Use client-scoped hook
export function PaymentStatus() {
  const { get, data, loading } = paymentClient.useApi();
  // ...
}
```

---

### 7. 📄 Infinite Pagination (`usePaginatedApi`)

```tsx
import { usePaginatedApi } from 'react-native-apikit';

export function ProductsScreen() {
  const { data, loading, hasMore, nextPage, refresh } = usePaginatedApi<Product>('/products', {
    pageSize: 20,
  });

  return (
    <FlatList
      data={data}
      onEndReached={nextPage}
      refreshing={loading}
      onRefresh={refresh}
      renderItem={({ item }) => <Text>{item.title}</Text>}
    />
  );
}
```

---

## ⚙️ Configuration Reference

```ts
interface ApiKitConfig {
  baseUrl?: string;
  engine?: 'fetch' | 'axios' | ApiEngine;
  tokenStorage?: TokenStorage; // mmkvToken | asyncStorageToken | secureStoreToken
  refreshToken?: () => Promise<string | null>; // Silent token refresh
  onUnauthorized?: () => void; // Global 401 handler
  retry?: number; // Auto-retry attempts (default: 0)
  retryAfter429?: boolean; // AI/Rate-limit auto-backoff (default: true)
  timeout?: number; // Default timeout ms (default: 10000)
  headers?: Record<string, string>;
  debug?: boolean; // In-app network logger with AI token tracking
  onRequest?: (config: ApiRequestConfig) => Promise<ApiRequestConfig> | ApiRequestConfig;
  onResponse?: (response: ApiResponse) => Promise<ApiResponse> | ApiResponse;
  onError?: (error: ApiError) => Promise<ApiError> | ApiError;
  cache?: ApiCache; // In-memory or custom cache
}
```

---

## 📄 License

MIT © [SamadK01](https://github.com/SamadK01)
