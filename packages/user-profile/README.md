<p align="center">
  <br />
  <img
    alt="Credo logo"
    src="https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>Credo extension module for DIDComm User Profile protocol</b></h1>
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
    <a href="https://www.npmjs.com/package/@2060.io/credo-ts-didcomm-user-profile"
    ><img
      alt="@2060.io/credo-ts-didcomm-user-profile version"
      src="https://img.shields.io/npm/v/@2060.io/credo-ts-didcomm-user-profile"
  /></a>

</p>
<br />

## Overview

The **DIDComm User Profile** extension module for [Credo](https://github.com/openwallet-foundation/credo-ts.git) enables secure, decentralized sharing and updating of user profile information using DIDComm. It provides APIs, message handlers, and services to manage profile data between agents, including display name, profile picture, description, and preferred language.

## Installation

```bash
npm install @2060.io/credo-ts-didcomm-user-profile
```

## Usage

### Adding the Module to Your Agent

To use the User Profile module, add it to your agent's modules configuration:

```typescript
import { UserProfileModule, UserProfileModuleConfig } from '@2060.io/credo-ts-didcomm-user-profile'

const agent = new Agent({
  modules: {
    // ...other modules
    userProfile: new UserProfileModule(new UserProfileModuleConfig({ autoSendProfile: false })),
  },
})
```

### Handling Profile Events

The module emits events when profile information should be updated or shared. Subscribe to these events to handle profile workflows in your application:

```typescript
import { ProfileMessage } from '@2060.io/vs-agent-model'

const msg = JsonTransformer.fromJSON(message, ProfileMessage)
const { displayImageUrl, displayName, displayIconUrl, description, preferredLanguage } = msg

await agent.modules.userProfile.sendUserProfile({
  connectionId: connection.id,
  profileData: {
    displayName: displayName ?? undefined,
    displayPicture: displayImageUrl ? parsePictureData(displayImageUrl) : undefined,
    displayIcon: displayIconUrl ? parsePictureData(displayIconUrl) : undefined,
    description: description ?? undefined,
    preferredLanguage: preferredLanguage ?? undefined,
  },
})
```

### Features

- **Profile Sharing**: Share user profile information securely between agents.
- **Profile Update**: Update profile details such as display name, image, icon, description, and language.
- **Event-Driven**: React to profile update events for seamless integration.
- **DIDComm Protocol**: Uses DIDComm for secure, interoperable messaging.

## API Reference

See the [source code](./src/) for details on available classes and methods:

- `UserProfileApi`: Main API for profile operations.
- `UserProfileService`: Internal service for profile logic.
- `UserProfileModule`: Module integration for Credo agent.

## Message Types

- `ProfileMessage`
- `RequestProfileMessage`

## License

Apache 2.0

---

For more information, see the [didcomm.org](https://didcomm.org/user-profile/1.0/).
