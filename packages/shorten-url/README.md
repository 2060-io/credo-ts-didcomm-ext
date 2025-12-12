# @2060.io/credo-ts-didcomm-shorten-url

DIDComm **Shorten URL 1.0** protocol implementation for `@credo-ts/core`. This module lets an agent play either of the roles defined by the spec:

- **long-url-provider** – asks for a shortened URL and can later invalidate it
- **url-shortener** – returns a shortened URL and processes invalidate requests

> Spec: <https://didcomm.org/shorten-url/1.0/>

---

## Features

- Message models for the whole protocol (ready to use):
  - `request-shortened-url`
  - `shortened-url`
  - `invalidate-shortened-url`
- Typed API to send/receive messages
- Optional maximum validity window for inbound requests (enforce by supplying a positive value)
- Automatic DIDComm timestamp conversion for shortened-url responses (work with `Date`, sent as ISO strings)
- Event emission for inbound messages so your app can plug in a real shortener
- Automatic Ack replies for `invalidate-shortened-url` messages (url-shortener role) using the protocol’s own ack type, plus an event on the requester side when the ack arrives
- Wallet records for each shorten-url exchange (full lifecycle saved in storage)
- Protocol registration with configurable roles for feature discovery

---

## Installation

```bash
pnpm add @2060.io/credo-ts-didcomm-shorten-url
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
    const { url } = shortenUrlRecord

    // your real shortener here
    const shortUrl = await myShortener(url!)

    await agent.modules.shortenUrl.sendShortenedUrl({
      recordId: shortenUrlRecord.id,
      shortenedUrl: shortUrl,
      // optional expiration time (Date). When omitted, we reuse the requester’s validity window if provided.
      // expiresTime: new Date(Date.now() + 60 * 60 * 1000),
    })
  },
)
```

### 4) Optionally invalidate a shortened URL later

When acting as the **long-url-provider**, you can ask the url-shortener to invalidate a previously issued short link. Look up the stored record from when you received the shortened URL (for example, from the `DidCommShortenedUrlReceived` event) and pass its id to the API:

```ts
const recordId = shortenUrlRecord.id
const { messageId: invalidateMessageId } = await agent.modules.shortenUrl.invalidateShortenedUrl({ recordId })
// We persist invalidateMessageId on the record to correlate the Ack that comes back from the url-shortener.

// Listen for the ack on the same agent (long-url-provider) to confirm completion
import { DidCommShortenUrlEventTypes, DidCommShortenedUrlInvalidatedEvent } from '@2060.io/credo-ts-didcomm-shorten-url'

agent.events.on<DidCommShortenedUrlInvalidatedEvent>(
  DidCommShortenUrlEventTypes.DidCommShortenedUrlInvalidated,
  ({ payload }) => {
    const { shortenUrlRecord } = payload
    console.log('Short link invalidated:', shortenUrlRecord.shortenedUrl)
  },
)
```

On the **url-shortener** agent subscribe to `DidCommInvalidateShortenedUrlReceived` so you can stop serving the revoked URL. The handler automatically returns the DIDComm `ack` that the spec requires, so your app only needs to update its own state:

```ts
import {
  DidCommInvalidateShortenedUrlReceivedEvent,
  DidCommShortenUrlEventTypes,
} from '@2060.io/credo-ts-didcomm-shorten-url'

agent.events.on<DidCommInvalidateShortenedUrlReceivedEvent>(
  DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived,
  async ({ payload }) => {
    const { shortenUrlRecord } = payload

    await disableShortUrlLocally(shortenUrlRecord.shortenedUrl!)
    await agent.modules.shortenUrl.deleteById({ recordId: shortenUrlRecord.id })
    // The Ack mandated by https://didcomm.org/shorten-url/1.0/ is already sent back to the long-url-provider by the handler.
  },
)
```

> **Important:** Only the `long-url-provider` role may call `invalidateShortenedUrl`. The url-shortener receives the message, emits the event above, and automatically acknowledges it per the protocol. This keeps both agents aligned with the [invalidate-shortened-url](https://didcomm.org/shorten-url/1.0/#invalidate-shortened-url) flow.
> The Ack is fully handled for you; the returned `messageId` equals the `~thread.thid` if you need to correlate logs or metrics.

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
  recordId: string
  shortenedUrl: string
  expiresTime?: Date
}): Promise<{ messageId: string }>

invalidateShortenedUrl(options: {
  recordId: string
}): Promise<{ messageId: string }>

deleteById(options: {
  recordId: string
}): Promise<{ recordId: string }>
```

- `requestShortenedUrl` throws if the same `threadId` (the request `@id`) was already processed, keeping the exchange idempotent.
- `sendShortenedUrl` throws if the referenced record already has a shortened URL or was invalidated. Pass the record id from the inbound event; the API automatically reuses the stored `connectionId`. If `expiresTime` is omitted and the request contained `requested_validity_seconds`, the expiration is derived automatically (`createdAt + validity`) and sent as an ISO-8601 string per DIDComm best practices.
- `invalidateShortenedUrl` throws if the link was already invalidated (or never existed) and only sends `invalidate-shortened-url` when the stored record belongs to the `long-url-provider` role. Once the url-shortener processes the message, it automatically responds with the spec-defined Ack.
- `deleteById` validates the connection ownership before removing a stored record, so only the owner agent can clean up its shorten-url entries.

All operations persist `DidCommShortenUrlRecord` entries in the agent wallet so you can audit or resume the flow later. Records carry the connection, protocol role, the thread id (we store the `@id` of the original `request-shortened-url`), state, original URL details, shortened URL, and expiration metadata.

---

## Events

The service emits events for inbound messages so you can plug your own logic. Timestamp fields are exposed as `Date` instances to your handler, but are serialized to ISO-8601 strings on the wire:

```ts
enum DidCommShortenUrlEventTypes {
  DidCommRequestShortenedUrlReceived = 'DidCommRequestShortenedUrlReceived',
  DidCommShortenedUrlReceived = 'DidCommShortenedUrlReceived',
  DidCommInvalidateShortenedUrlReceived = 'DidCommInvalidateShortenedUrlReceived',
  DidCommShortenedUrlInvalidated = 'DidCommShortenedUrlInvalidated',
}
```

### Payloads

- **DidCommRequestShortenedUrlReceived**

  ```ts
  {
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

- **DidCommShortenedUrlReceived**

  ```ts
  {
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

- **DidCommInvalidateShortenedUrlReceived**

  ```ts
  {
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

  > The handler that raises this event already returned an `ack` with `status = ok` to the sender, fulfilling the DIDComm requirement while giving you a clean hook to update your business logic.

- **DidCommShortenedUrlInvalidated** (emitted on the long-url-provider when the url-shortener’s ack arrives)

  ```ts
  {
    shortenUrlRecord: DidCommShortenUrlRecord
  }
  ```

  > This confirms the invalidation round-trip is complete. The record state is set to `invalidated`.

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
- `invalidated` (set when the long-url-provider receives the protocol ack from the url-shortener)

Invalidation calls will fail with an error if no record exists for the provided `shortened_url`, giving you a built-in safety check that only the agent that requested the short link (and still holds the record) can invalidate it.

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
