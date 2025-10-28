# @2060.io/credo-ts-didcomm-shorten-url

DIDComm **Shorten URL 1.0** protocol implementation for `@credo-ts/core`. This module lets an agent play either of the roles defined by the spec:

- **long-url-provider** – asks for a shortened URL
- **url-shortener** – returns a shortened URL and can later invalidate it

> Spec: <https://didcomm.org/shorten-url/1.0/>

---

## Features

- Message models for the whole protocol (ready to use):
  - `request-shortened-url`
  - `shortened-url`
  - `invalidate-shortened-url`
- Typed API to send/receive messages
- Optional maximum validity window for inbound requests (enforce by supplying a positive value)
- Event emission for inbound messages so your app can plug in a real shortener
- Wallet records for each shorten-url exchange (full lifecycle saved in storage)
- Protocol registration with configurable roles for feature discovery

---

## Installation

```bash
yarn add @2060.io/credo-ts-didcomm-shorten-url
# or
npm i @2060.io/credo-ts-didcomm-shorten-url
```

---

## Quick Start

### 1) Register the module

```ts
import { Agent } from '@credo-ts/core'
import { DidCommShortenUrlModule, ShortenUrlRole } from '@2060.io/credo-ts-didcomm-shorten-url'

const agent = new Agent({
  config: { label: 'my-agent' },
  modules: {
    shortenUrl: new DidCommShortenUrlModule({
      // Example: mobile agent acting only as long-url-provider
      roles: [ShortenUrlRole.LongUrlProvider],
      // Optional: enforce a 2 hour maximum validity (set to 0 or omit to allow any value)
      maximumRequestedValiditySeconds: 60 * 60 * 2,
    }),
  },
  // ... transports, storage, logger, etc.
})
```

If you omit the configuration, the module registers both `url-shortener` and `long-url-provider` roles by default, so it “just works”.

Inbound `request-shortened-url` messages that exceed the configured maximum are rejected with a `CredoError` whose message starts with `validity_too_long`, allowing callers to distinguish the cause.

### 2) As **long-url-provider** – request a shortened URL

```ts
const { messageId } = await agent.modules.shortenUrl.requestShortenedUrl({
  connectionId: 'conn-123',
  url: 'https://example.com/very/long/path?query=abc',
  goalCode: 'share_link',
  requestedValiditySeconds: 3600,
  shortUrlSlug: 'my-campaign', // optional
})
```

### 3) As **url-shortener** – listen for inbound requests and reply

```ts
import {
  DidCommShortenUrlEventTypes,
  DidCommRequestShortenedUrlReceivedEvent,
} from '@2060.io/credo-ts-didcomm-shorten-url'

agent.events.on<DidCommRequestShortenedUrlReceivedEvent>(
  DidCommShortenUrlEventTypes.DidCommRequestShortenedUrlReceived,
  async (e) => {
    const { shortenUrlRecord } = e.payload
    const { connectionId, threadId, url } = shortenUrlRecord

    // your real shortener here
    const shortUrl = await myShortener(url!)

    await agent.modules.shortenUrl.sendShortenedUrl({
      connectionId,
      threadId: threadId!,
      shortenedUrl: shortUrl,
      // optional expiration in epoch seconds:
      // expiresTime: Math.floor(Date.now() / 1000) + 3600,
    })
  },
)
```

### 4) Optionally invalidate a shortened URL later

```ts
await agent.modules.shortenUrl.invalidateShortenedUrl({
  connectionId: 'conn-123',
  shortenedUrl: 'https://example.io/a1b2',
})
```

---

## API Overview

### Configuration Options

`DidCommShortenUrlModule` accepts the following options:

- `roles` (default: both roles) – restrict the protocol roles this agent announces/supports.
- `maximumRequestedValiditySeconds` (optional) – positive integer upper bound for `requested_validity_seconds`. Omit or set to `0` to allow any value. Requests that exceed the configured limit are rejected before persisting a record and emit a `validity_too_long` error.

### `DidCommShortenUrlApi`

```ts
requestShortenedUrl(options: {
  connectionId: string
  url: string
  goalCode: string
  requestedValiditySeconds: number
  shortUrlSlug?: string
}): Promise<{ messageId: string }>

sendShortenedUrl(options: {
  connectionId: string
  threadId: string
  shortenedUrl: string
  expiresTime?: number
}): Promise<{ messageId: string }>

invalidateShortenedUrl(options: {
  connectionId: string
  shortenedUrl: string
}): Promise<{ messageId: string }>

deleteById(options: {
  connectionId: string
  recordId: string
}): Promise<{ recordId: string }>
```

- `requestShortenedUrl` throws if the same `threadId` (the request `@id`) was already processed, keeping the exchange idempotent.
- `sendShortenedUrl` throws if a short URL already exists for the same `threadId`. This avoids sending multiple short links for one flow.
- `invalidateShortenedUrl` throws if the link was already invalidated (or never existed for that connection), ensuring the flow stays consistent.
- `deleteById` validates the connection ownership before removing a stored record, so only the owner agent can clean up its shorten-url entries.

All operations persist `DidCommShortenUrlRecord` entries in the agent wallet so you can audit or resume the flow later. Records carry the connection, protocol role, the thread id (we store the `@id` of the original `request-shortened-url`), state, original URL details, shortened URL, and expiration metadata.

---

## Events

The service emits events for inbound messages so you can plug your own logic:

```ts
enum DidCommShortenUrlEventTypes {
  DidCommRequestShortenedUrlReceived = 'DidCommRequestShortenedUrlReceived',
  DidCommShortenedUrlReceived = 'DidCommShortenedUrlReceived',
  DidCommInvalidateShortenedUrlReceived = 'DidCommInvalidateShortenedUrlReceived',
}
```

### Payloads

- **DidCommRequestShortenedUrlReceived**

  ```ts
  {
    connectionId: string
    threadId?: string
    url: string
    goalCode: string
    requestedValiditySeconds: number
    shortUrlSlug?: string
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

- **DidCommShortenedUrlReceived**

  ```ts
  {
    connectionId: string
    threadId: string
    shortenedUrl: string
    expiresTime?: number
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

- **DidCommInvalidateShortenedUrlReceived**

  ```ts
  {
    connectionId: string
    shortenedUrl: string
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

---

## Message Models & JSON Shapes

## Records & Repository

Each API/service call stores a `DidCommShortenUrlRecord` in the wallet. You can resolve the repository through the dependency manager and query the current state:

```ts
import { DidCommShortenUrlRepository, ShortenUrlState } from '@2060.io/credo-ts-didcomm-shorten-url'

const repository = agent.dependencyManager.resolve(DidCommShortenUrlRepository)

const openRequests = await repository.findByQuery(agent.context, {
  connectionId: 'conn-123',
  state: ShortenUrlState.RequestSent,
})
```

States follow the DIDComm spec lifecycle:

- `request-sent` / `request-received` (records include the thread id so you can correlate the later response `thid`)
- `shortened-sent` / `shortened-received`
- `invalidation-sent` / `invalidation-received`

Invalidation calls will fail with an error if no record exists for the provided `shortened_url`, giving you a built-in safety check that only the party who created the short link can invalidate it.

### `request-shortened-url`

Type URI: `https://didcomm.org/shorten-url/1.0/request-shortened-url`

```json
{
  "@type": "https://didcomm.org/shorten-url/1.0/request-shortened-url",
  "@id": "<uuid>",
  "url": "https://example.com/very/long/path?query=abc",
  "goal_code": "share_link",
  "requested_validity_seconds": 3600,
  "short_url_slug": "my-campaign"
}
```

### `shortened-url`

Type URI: `https://didcomm.org/shorten-url/1.0/shortened-url`

```json
{
  "@type": "https://didcomm.org/shorten-url/1.0/shortened-url",
  "@id": "<uuid>",
  "shortened_url": "https://example.io/a1b2",
  "expires_time": 1732665600,
  "~thread": { "thid": "<request-id>" }
}
```

### `invalidate-shortened-url`

Type URI: `https://didcomm.org/shorten-url/1.0/invalidate-shortened-url`

```json
{
  "@type": "https://didcomm.org/shorten-url/1.0/invalidate-shortened-url",
  "@id": "<uuid>",
  "shortened_url": "https://example.io/a1b2",
  "~thread": { "thid": "<optional-request-id>" }
}
```
