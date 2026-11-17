# ApiKit

> A small, typed API foundation for React Native and Expo.

[![npm](https://img.shields.io/npm/v/react-native-apikit.svg?style=flat-square)](https://www.npmjs.com/package/react-native-apikit)
[![license](https://img.shields.io/badge/license-MIT-0ea5e9.svg?style=flat-square)](LICENSE)
![architecture](https://img.shields.io/badge/architecture-v2.1-111827.svg?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-first-3178C6.svg?style=flat-square)
![dependencies](https://img.shields.io/badge/runtime%20dependencies-0-10b981.svg?style=flat-square)

ApiKit gives React Native and Expo applications one consistent path for REST, authentication, pagination, uploads, offline mutations, and streamed AI responses. It uses native `fetch` by default, has zero required runtime dependencies, and keeps optional platform integrations lazy-loaded.

## Install

```sh
npm install react-native-apikit
# or: yarn add react-native-apikit
# or: pnpm add react-native-apikit
```

Optional integrations are installed only when you use them:

```sh
npm install react-native-mmkv                    # fast native persistence
npm install @react-native-async-storage/async-storage
npx expo install expo-secure-store                # Expo secure token storage
npm install axios                                 # optional transport
```

## Quick start

Initialize the client once at application startup:

```ts
import { configureApiKit, mmkvToken } from 'react-native-apikit';

configureApiKit({ baseUrl: 'https://api.example.com', tokenStorage: mmkvToken });
```

Then request data from a component:

```tsx
import { useEffect } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { useApi } from 'react-native-apikit';

function Profile() {
  const { get, data, loading, error } = useApi<User>();
  useEffect(() => { get('/me'); }, [get]);
  if (loading) return <ActivityIndicator />;
  if (error) return <Text>{error.message}</Text>;
  return <Text>{data?.name}</Text>;
}
```

## Configuration

`configureApiKit` configures the default singleton used by `useApi` and `apiClient`.

```ts
import {
  configureApiKit,
  asyncStorageToken,
  asyncStorage,
} from 'react-native-apikit';

configureApiKit({
  baseUrl: 'https://api.example.com/v1',
  tokenStorage: asyncStorageToken,
  offlineStorage: asyncStorage,
  cacheNamespace: currentUser.id, // isolate cached data by account
  offlineMaxRetries: 5,
  timeout: 10_000,
  retry: 2,
  headers: { 'X-App-Version': '2.1.0' },
  refreshToken: async () => {
    const response = await fetch('https://api.example.com/v1/auth/refresh', { method: 'POST' });
    return (await response.json()).accessToken;
  },
  onUnauthorized: () => {
    // Clear navigation state and show the sign-in flow.
  },
  onRequest: request => request,
  onResponse: response => response,
  onError: error => error,
});
```

When a request receives `401`, ApiKit shares a single refresh operation across concurrent requests, stores the returned token, and retries the affected request once. If refresh fails, `onTokenRefreshFailed` and then `onUnauthorized` can handle the sign-out flow.

### Storage adapters

| Adapter | Intended use |
| --- | --- |
| `mmkvToken`, `mmkvStorage` | React Native MMKV; fast native token and queue persistence |
| `asyncStorageToken`, `asyncStorage` | React Native CLI with AsyncStorage |
| `secureStoreToken`, `secureStore` | Expo SecureStore; use for sensitive small values |
| Custom adapters | Any `TokenStorage` or `KeyValueStorage` implementation |

Auth storage and offline-queue storage are deliberately separate. Never use a token adapter as queue storage.

## REST requests

`useApi<T>()` owns `loading`, `data`, and `error` for one component. Every request is cancelable and outstanding requests are aborted when the component unmounts.

```tsx
const { post, loading, error } = useApi<Session>();

const signIn = async () => {
  const request = post('/sessions', { email, password });
  const { data, error } = await request.promise;
  if (data) console.log(data.accessToken);
  if (error) console.warn(error.message);
};
```

Use `apiClient` outside React, for services and state stores:

```ts
import { apiClient } from 'react-native-apikit';

const { data, error } = await apiClient.get<User>('/users/42', {
  params: { include: 'teams' },
  schema: UserSchema,
});
```

Use `createApiClient` when services need distinct configuration:

```ts
import { createApiClient } from 'react-native-apikit';

export const billingClient = createApiClient({
  baseUrl: 'https://billing.example.com',
  timeout: 15_000,
});
```

## Infinite pagination

`usePaginatedApi` supports page/offset and cursor APIs. It exposes `data`, `loadMore`, `hasMore`, `isLoading`, `isLoadingMore`, `isRefreshing`, `refresh`, and `error`.

### Offset or page API

```tsx
const products = usePaginatedApi<Product>('/products', {
  mode: 'offset',
  pageSize: 20,
  pageParamName: 'page',
  pageSizeParamName: 'limit',
  params: { category: 'shoes' },
  getPage: response => ({
    items: response.items,
    hasMore: response.page < response.totalPages,
  }),
});

<FlatList
  data={products.data}
  onEndReached={products.loadMore}
  refreshing={products.isRefreshing}
  onRefresh={products.refresh}
  ListFooterComponent={products.isLoadingMore ? <ActivityIndicator /> : null}
/>
```

### Cursor API

```ts
const feed = usePaginatedApi<Post>('/feed', {
  mode: 'cursor',
  pageSize: 25,
  cursorParamName: 'after',
  getPage: response => ({
    items: response.data,
    nextCursor: response.pageInfo.endCursor,
    hasMore: response.pageInfo.hasNextPage,
  }),
});
```

ApiKit recognizes `items`, `data`, or `results` by default. Prefer `getPage` for a stable, explicit contract with your API.

## AI streaming

`useAiStream` streams SSE or text responses into state, handles fragmented events, estimates token count, and can stop an in-flight stream.

```tsx
const { text, isStreaming, tokenCount, stream, stop, error } = useAiStream();

async function ask(prompt: string) {
  await stream('/chat/completions', {
    method: 'POST',
    body: {
      model: 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    },
    mode: 'openai',
  });
}
```

`mode: 'openai'` understands OpenAI-compatible delta events as well as common Anthropic, Gemini, and `{ text }` / `{ content }` SSE payloads. Use `mode: 'text'` for plain chunked text. `tokenCount` is an estimate (roughly four characters per token), not provider billing data.

## Agent tools and function calling

`useAgentTool` sends a normalized strict function-tool definition to your agent endpoint, validates the returned tool arguments, and makes one correction request by default when the model returns malformed JSON or arguments that fail validation. It is provider-neutral: your endpoint may adapt the normalized payload to OpenAI, Anthropic, Gemini, or an internal agent runtime.

```tsx
import { useAgentTool } from 'react-native-apikit';
import { z } from 'zod';

const WeatherArgs = z.object({
  city: z.string().min(1),
  units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
});

function WeatherTool() {
  const weather = useAgentTool({
    endpoint: '/agent/tools',
    name: 'get_weather',
    description: 'Returns the current weather for a city.',
    schema: {
      safeParse: WeatherArgs.safeParse,
      // Zod v4 or a schema adapter can supply this for the agent definition.
      jsonSchema: {
        type: 'object',
        properties: { city: { type: 'string' }, units: { enum: ['celsius', 'fahrenheit'] } },
        required: ['city'],
        additionalProperties: false,
      },
    },
    maxCorrectionAttempts: 1,
  });

  const run = async () => {
    const result = await weather.execute({ message: 'What is the weather in Karachi?' });
    if (result.data) callWeatherService(result.data);
    console.log(result.telemetry.totalTokens, result.telemetry.requestId);
  };
}
```

For service-layer code, use `executeAgentTool(options, input)`. `telemetry` reads standard provider usage/request headers when exposed by the backend. It is not a substitute for provider-side billing records. Tool calls are validated locally; always authorize and validate the eventual side effect on your server.

## Offline mutations

ApiKit queues failed non-GET requests only when the error is recognized as a network failure and that request explicitly opts in. Queue entries are FIFO and persist when `offlineStorage` is configured. Supply an idempotency key for mutations that may be replayed safely; duplicate queued keys are coalesced.

```ts
import { apiClient, offlineQueue, mmkvStorage } from 'react-native-apikit';

configureApiKit({
  baseUrl: 'https://api.example.com',
  offlineStorage: mmkvStorage,
});

await apiClient.post('/posts/42/likes', {}, {
  offlineQueue: true,
  idempotencyKey: `like:${currentUser.id}:42`,
  retryUnsafe: true,
});

// Run sync when your connectivity layer reports that the device is online.
await offlineQueue.sync(apiClient);
```

To automatically sync after connectivity restores, connect the queue to your app's connectivity provider. This keeps NetInfo optional and ApiKit at zero required runtime dependencies:

```ts
offlineQueue.startAutoSync(apiClient, onOnline => {
  const unsubscribe = connectivity.subscribe(state => {
    if (state.isConnected) onOnline();
  });
  return unsubscribe;
});
```

## Uploads

```ts
const form = new FormData();
form.append('avatar', { uri, name: 'avatar.jpg', type: 'image/jpeg' } as any);

const { data, error } = await apiClient.upload('/me/avatar', form, {
  onUploadProgress: ({ percent }) => setProgress(percent),
});
```

## API reference

| Export | Purpose |
| --- | --- |
| `configureApiKit(config)` | Configure the default client, engine, auth, retries, cache, and interceptors |
| `apiClient` / `createApiClient(config)` | Promise-based API clients for non-React code or isolated services |
| `useApi<T>()` | Component-scoped REST request state and cancellation |
| `usePaginatedApi<T>(url, options)` | Offset/page or cursor infinite-list state |
| `useAiStream()` | SSE and chunked-text state for LLM or streaming endpoints |
| `useAgentTool(options)` / `executeAgentTool` | Strict function-call formatting, validation, correction feedback, and telemetry |
| `offlineQueue` | Inspect, synchronize, clear, and auto-sync queued mutations |
| `uploadFile` / `apiClient.upload` | XMLHttpRequest uploads with progress callbacks |
| `fetchEngine`, `axiosEngine` | Native default and optional Axios transports |
| `mmkvToken`, `asyncStorageToken`, `secureStoreToken` | Token storage adapters |
| `mmkvStorage`, `asyncStorage`, `secureStore` | Key/value storage adapters |

### `ApiKitConfig`

| Option | Description |
| --- | --- |
| `baseUrl` | Prefix for relative URLs |
| `engine` | `'fetch'`, `'axios'`, or an `ApiEngine` |
| `tokenStorage` | Bearer-token adapter |
| `offlineStorage` | Persistent `KeyValueStorage` for offline mutations |
| `refreshToken` | Returns a new access token after a 401 |
| `retry`, `retryAfter429`, `maxRetryDelay` | Retry and rate-limit policy |
| `timeout`, `headers` | Default transport options |
| `onRequest`, `onResponse`, `onError` | Global interceptors |
| `cache` | Optional GET cache adapter |
| `cacheNamespace` | Per-user/account cache key prefix |
| `offlineMaxRetries` | Upper limit for replaying an offline mutation |

## Compatibility

- React `>=17`
- React Native `>=0.64`
- Expo and React Native CLI
- Android, iOS, and fetch-capable web targets

## Reliability notes

- ApiKit retries GET, PUT, and DELETE requests by default. POST and PATCH are retried only when both `retryUnsafe` and an `idempotencyKey` are supplied.
- The default cache is application-defined. Use a per-account `cacheNamespace` and clear cache/queue data during sign-out.
- Native background execution, resumable transfers, and network-status detection require an app-provided native integration; they are intentionally not claimed as dependency-free capabilities.
- Run `npm test` for the bundled regression suite. It compiles the package first and verifies timeout composition, offline idempotency de-duplication, and retry utilities.

## License

MIT © [SamadK01](https://github.com/SamadK01)
