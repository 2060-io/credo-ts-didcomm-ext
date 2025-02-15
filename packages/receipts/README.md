<p align="center">
  <br />
  <img
    alt="Credo logo"
    src="https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>Credo extension module for Message Receipts protocol</b></h1>
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
    <a href="https://www.npmjs.com/package/credo-ts-receipts"
    ><img
      alt="@2060.io/credo-ts-receipts"
      src="https://img.shield.io/npm/v/@2060.io/credo-ts-receipts"
  /></a>

</p>
<br />

This module is used to provide an Agent built with [Credo](https://github.com/openwallet-foundation/credo-ts) means to manage [Receipts protocol](https://didcomm.org/receipts/1.0/).

It's conceived as an extension module for Credo which can be injected to an existing agent instance:

```ts
import { ReceiptsModule } from 'credo-ts-receipts'

const agent = new Agent({
  config: {
    /* agent config */
  },
  dependencies,
  modules: { receipts: new ReceiptsModule() },
})
```

Once instantiated, media module API can be accessed under `agent.modules.receipts` namespace

## Usage

> **TODO**
