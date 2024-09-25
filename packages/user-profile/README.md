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
      src="https://img.shield.io/npm/v/@2060.io/credo-ts-didcomm-user-profile"
  /></a>

</p>
<br />

This module is used to provide an Agent built with [Credo](https://github.com/openwallet-foundation/credo-ts) means to manage [User Profile protocol](https://didcomm.org/user-profile/1.0).

It's conceived as an extension module for Credo which can be injected to an existing agent instance:

```ts
import { UserProfileModule } from 'credo-ts-user-profile'

const agent = new Agent({
  config: {
    /* agent config */
  },
  dependencies,
  modules: { userProfile: new UserProfileModule() },
})
```

Once instantiated, module API can be accessed under `agent.modules.userProfile` namespace.

## Usage

> **TODO**
