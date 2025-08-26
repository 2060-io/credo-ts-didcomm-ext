<p align="center">
  <br />
  <img
    alt="Credo logo"
    src="https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>Credo extension module for DIDComm Calls</b></h1>
<p align="center">
  <a
    href="https://raw.githubusercontent.com/openwallet-foundation/credo-ts-ext/main/LICENSE"
    ><img
      alt="License"
      src="https://img.shields.io/badge/License-Apache%202.0-blue.svg"
  /></a>
  <a href="https://www.typescriptlang.org/"
    ><img
      alt="typescript"
      src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg"
  /></a>
    <a href="https://www.npmjs.com/package/@2060.io/credo-ts-didcomm-calls"
    ><img
      alt="@2060.io/credo-ts-didcomm-calls version"
      src="https://img.shields.io/npm/v/@2060.io/credo-ts-didcomm-calls"
  /></a>

</p>
<br />

## Overview

The **DIDComm Calls** extension module for [Credo](https://github.com/openwallet-foundation/credo-ts.git) enables secure, decentralized call signaling using the DIDComm protocol. It provides APIs, message handlers, and services to initiate, accept, and manage call offers between agents.

## Installation

```bash
npm install @2060.io/credo-ts-didcomm-calls
```

## Usage

### Adding the Module to Your Agent

To use the DIDComm Calls module, add it to your agent's modules configuration:

```typescript
import { DidCommCallsModule } from '@2060.io/credo-ts-didcomm-calls'

const agent = new VSAgent({
  modules: {
    // ...other modules
    calls: new DidCommCallsModule(),
  },
})
```

Example agent modules configuration:

```typescript
type VSAgentModules = {
  calls: DidCommCallsModule
  credentials: CredentialsModule<
    [V2CredentialProtocol<[LegacyIndyCredentialFormatService, AnonCredsCredentialFormatService]>]
  >
}
```

### Sending a Call Offer

To initiate a call, send a `CallOfferRequestMessage` using the API:

```typescript
const callOffer = message as CallOfferMessage
const msg = new CallOfferRequestMessage({
  id: await getRecordId(agent, message.id),
  connectionId: connection.id,
  offerExpirationTime: callOffer.offerExpirationTime ?? undefined,
  offerStartTime: callOffer.offerStartTime ?? undefined,
  description: callOffer.description,
  parameters: callOffer.parameters,
  threadId: message.thread?.threadId,
  timestamp: new Date(),
})
await agent.modules.calls.sendCallOffer(msg)
```

### Handling Call Events

The module emits events for call offers, acceptances, and terminations. Subscribe to these events to handle call workflows in your application.

## Features

- **Call Offer**: Initiate a call with another agent using DIDComm messages.
- **Call Accept/Reject**: Respond to incoming call offers.
- **Call Termination**: End an ongoing call.
- **Threading and Expiration**: Support for threading and offer expiration times.

## API Reference

See the [source code](./src/) for details on available classes and methods:

- `DidCommCallsApi`: Main API for call operations.
- `DidCommCallsService`: Internal service for call logic.
- `DidCommCallsModule`: Module integration for Credo agent.

## Message Types

- `CallOfferMessage`
- `CallOfferRequestMessage`
- `CallAcceptMessage`
- `CallTerminateMessage`

## License

Apache 2.0

---

For more information, see the [Credo documentation](https://github.com/openwallet-foundation/credo-ts.git).
