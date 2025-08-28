<p align="center">
  <br />
  <img
    alt="Credo logo"
    src="https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>Credo extension module for DIDComm Media Sharing protocol</b></h1>
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
  <a href="https://www.npmjs.com/package/@2060.io/credo-ts-didcomm-media-sharing"
    ><img
      alt="@2060.io/credo-ts-didcomm-media-sharing version"
      src="https://img.shields.io/npm/v/@2060.io/credo-ts-didcomm-media-sharing"
  /></a>
</p>
<br />

## Overview

The **Media Sharing** extension module for [Credo](https://github.com/openwallet-foundation/credo-ts) enables agents to securely exchange media files (images, audio, video, documents) using DIDComm protocols. It supports encrypted transmission, rich metadata, and event-driven workflows for handling shared media.

## Installation

```bash
npm install @2060.io/credo-ts-didcomm-media-sharing
```

## Usage

### Adding the Module to Your Agent

To use the Media Sharing module, add it to your agent's modules configuration:

```typescript
import { MediaSharingModule } from '@2060.io/credo-ts-didcomm-media-sharing'

const agent = new Agent({
  modules: {
    // ...other modules
    media: new MediaSharingModule(),
  },
})
```

### Create Media

Create media sharing events to process media record:

```typescript
// Create media record entry
const newRecord = await agent.modules.media.create({
  connectionId: connection.id,
  items: [item],
  metadata: { ...originalRecord.metadata },
  description: originalRecord.description,
})
```

### Encryption and Security

Media items can be transmitted with encryption. The `ciphering` property in each media item describes the encryption method and keys used. This ensures that only authorized recipients can access the shared files.

### Features

- **Secure Media Exchange**: Send and receive encrypted media files over DIDComm.
- **Rich Metadata Support**: Share media with metadata such as preview, duration, dimensions, and more.
- **Event Subscription**: Listen for media sharing events to trigger workflows or update UI.
- **Protocol Integration**: Seamless integration with Credo agent and DIDComm protocols.

## API Reference

See the [source code](./src/) for details on available classes and methods:

- [`MediaSharingApi`](./src/MediaSharingApi.ts): Main API for sending and receiving media.
- [`MediaSharingModule`](./src/MediaSharingModule.ts): Module integration for Credo agent.
- [`MediaSharingEvents`](./src/MediaSharingEvents.ts): Event types and payloads.

## License

Apache 2.0

---

For more information, see the [didcomm.org](https://didcomm.org/media-sharing/1.0/).
