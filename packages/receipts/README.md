# Credo Extension Module for Message Receipts Protocol

![Credo logo](https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png)

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://raw.githubusercontent.com/openwallet-foundation/credo-ts-ext/main/LICENSE)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](https://www.typescriptlang.org/)
[![@2060.io/credo-ts-didcomm-receipts](https://img.shields.io/npm/v/@2060.io/credo-ts-didcomm-receipts)](https://www.npmjs.com/package/credo-ts-didcomm-receipts)

## Overview

The **Message Receipts** extension module for [Credo](https://github.com/openwallet-foundation/credo-ts) enables agents to manage [Receipts protocol](https://didcomm.org/receipts/1.0/), allowing tracking and acknowledgment of message states (e.g., received, viewed) between agents.

## Installation

```bash
npm install @2060.io/credo-ts-didcomm-receipts
```

## Usage

Adding the Module to Your Agent
To use the Receipts module, add it to your agent's modules configuration:

```typescript
import { ReceiptsModule } from '@2060.io/credo-ts-didcomm-receipts'

const agent = new Agent({
  modules: {
    // ...other modules
    receipts: new ReceiptsModule(),
  },
})
```

### Sending Message Receipts

To send message receipts (e.g., when a message is received or viewed):

```typescript
await agent.modules.receipts.send({
  connectionId: connection.id,
  receipts: [
    { messageId: 'message-id', state: MessageState.Received },
    { messageId: 'message-id', state: MessageState.Viewed },
  ],
})
```

### Requesting Message Receipts

To request receipts for specific messages or message types:

```typescript
await agent.modules.receipts.request({
  connectionId: connection.id,
  requestedReceipts: [
    {
      messageType: 'https://didcomm.org/my-protocol/1.0/my-message',
      states: [MessageState.Received, MessageState.Viewed],
    },
  ],
})
```

### Handling Receipt Events

Subscribe to receipt events to react to incoming receipts:

```typescript
import { ReceiptsEventTypes, MessageReceiptsReceivedEvent } from '@2060.io/credo-ts-didcomm-receipts'

agent.events.on(ReceiptsEventTypes.MessageReceiptsReceived, async ({ payload }: MessageReceiptsReceivedEvent) => {
  const connectionId = payload.connectionId
  const receipts = payload.receipts

  receipts.forEach((receipt) => {
    const { messageId, timestamp, state } = receipt
    sendMessageStateUpdatedEvent({ agent, messageId, connectionId, state, timestamp, config })
  })
})
```

### Features

- **Send Message Receipts**: Notify other agents about message states (received, viewed, etc.).
- **Request Receipts**: Ask for receipts for specific messages or message types.
- **Event Subscription**: Listen for receipt events to update UI or trigger workflows.
- **Protocol Integration**: Seamless integration with Credo agent and DIDComm protocols.

## API Reference

See the [source code](./src/) for details on available classes and methods:

- [`DidCommReceiptsApi`:](./src/DidCommReceiptsApi.ts) Main API for sending and requesting receipts.
- [`DidCommReceiptsService`:](./src/services/DidCommReceiptsService.ts) Internal service for receipt logic.
- [`DidCommReceiptsModule`:](./src/DidCommReceiptsModule.ts) Module integration for Credo agent.

## License

Apache 2.0

---

For more information, see the [didcomm.org](https://didcomm.org/receipts/1.0/).
