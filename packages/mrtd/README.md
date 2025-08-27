<p align="center">
  <br />
  <img
    alt="Credo logo"
    src="https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>Credo extension module for DIDComm Machine Readable Travel Documents</b></h1>
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
  <a href="https://www.npmjs.com/package/@2060.io/credo-ts-didcomm-mrtd"
    ><img
      alt="@2060.io/credo-ts-didcomm-mrtd version"
      src="https://img.shields.io/npm/v/@2060.io/credo-ts-didcomm-mrtd"
  /></a>
</p>
<br />

## Overview

The **DIDComm MRTD** (Machine Readable Travel Documents) extension module for [Credo](https://github.com/openwallet-foundation/credo-ts.git) enables agents to exchange and verify travel document data using DIDComm protocols. It supports secure transmission of MRZ (Machine Readable Zone) and other ICAO data groups, with authenticity and integrity checks.

## Installation

```bash
npm install @2060.io/credo-ts-didcomm-mrtd
```

## Usage

### Adding the Module to Your Agent

To use the MRTD module, add it to your agent's modules configuration:

> **Note:** The `masterListCscaLocation` must point to the **official ICAO Master List (CSCA certificates)** corresponding to the version you are working with. Make sure you always provide the up-to-date and correct list according to the ICAO release you intend to support. The Master List is typically distributed with an **`.ldif` extension**. For further details, see [**mrtd-authenticity-integrity.md**](./docs/mrtd-authenticity-integrity.md).

```typescript
import { DidCommMrtdModule } from '@2060.io/credo-ts-didcomm-mrtd'

const agent = new VSAgent({
  modules: {
    // ...other modules
    mrtd: new DidCommMrtdModule({ masterListCscaLocation: options.masterListCscaLocation }),
  },
})
```

Example agent modules configuration:

```typescript
type VsAgentModules = {
  // ...
  mrtd: DidCommMrtdModule
}
```

### Receiving MRTD Messages

Subscribe to MRTD events to process incoming travel document data:

```typescript
import {
  MrtdEventTypes,
  EMrtdDataReceivedEvent,
  EMrtdDataSubmitMessage,
  MrtdSubmitState,
} from '@2060.io/credo-ts-didcomm-mrtd'

agent.events.on(MrtdEventTypes.EMrtdDataReceived, async ({ payload }: EMrtdDataReceivedEvent) => {
  const { connection, dataGroups, threadId } = payload

  const msg = new EMrtdDataSubmitMessage({
    connectionId: connection.id,
    threadId,
    state: MrtdSubmitState.Submitted,
    dataGroups,
  })

  msg.id = await getRecordId(agent, msg.id)
  await sendMessageReceivedEvent(agent, msg, msg.timestamp, config)
})
```

### Important Message Types

The library provides several message and data types for handling MRTD data:

```typescript
import { EMrtdData, MrzData } from '@2060.io/credo-ts-didcomm-mrtd'

// EMrtdData: Represents the full set of MRTD data groups (DG1, DG2, etc.)
// MrzData: Represents parsed MRZ (Machine Readable Zone) information
```

## Features

- **Secure MRTD Data Exchange**: Transmit ICAO-compliant travel document data over DIDComm.
- **Authenticity & Integrity Checks**: Validate document authenticity using CSCA master lists.
- **Event Subscription**: Listen for MRTD data events to trigger workflows or update UI.
- **Protocol Integration**: Seamless integration with Credo agent and DIDComm protocols.

## API Reference

See the [source code](./src/) for details on available classes and methods:

- [`DidCommMrtdApi`](./src/DidCommMrtdApi.ts): Main API for sending and receiving MRTD data.
- [`DidCommMrtdService`](./src/DidCommMrtdService.ts): Internal service for MRTD logic.
- [`DidCommMrtdModule`](./src/DidCommMrtdModule.ts): Module integration for Credo agent.
- [`DidCommMrtdEvents`](./src/DidCommMrtdEvents.ts): Event types and payloads.

## License

Apache 2.0

---

For more information, see the [docs](./docs/) folder for protocol details
