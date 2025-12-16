import { AskarModule } from '@credo-ts/askar'
import { Agent } from '@credo-ts/core'
import { DidCommModule } from '@credo-ts/didcomm'
import { agentDependencies } from '@credo-ts/node'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'

import { DidCommMrtdModule } from '../../src/DidCommMrtdModule'

export const agent: Agent<{ askar: AskarModule; didcomm: DidCommModule; mrtd: DidCommMrtdModule }> = new Agent({
  config: {
    autoUpdateStorageOnStartup: true,
  },
  dependencies: agentDependencies,
  modules: {
    askar: new AskarModule({
      askar: askarNodeJS,
      store: {
        id: 'mrtd-service-test',
        key: 'mrtd-service-test-key',
        database: { type: 'sqlite', config: { inMemory: true } },
      },
    }),
    didcomm: new DidCommModule({
      endpoints: [],
      transports: { inbound: [], outbound: [] },
      credentials: false,
      proofs: false,
      messagePickup: false,
      mediator: false,
      mediationRecipient: false,
      basicMessages: false,
    }),
    mrtd: new DidCommMrtdModule(),
  },
})
