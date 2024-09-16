import type { InitConfig } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, HttpOutboundTransport, WsOutboundTransport } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'

import { DidCommCallsModule } from '../../src'

export const setupAgent = async ({ name }: { name: string }) => {
  const agentConfig: InitConfig = {
    label: name,
    walletConfig: {
      id: name,
      key: 'someKey',
    },
    autoUpdateStorageOnStartup: true,
  }

  const agent = new Agent({
    config: agentConfig,
    dependencies: agentDependencies,
    modules: {
      askar: new AskarModule({
        ariesAskar,
      }),
      calls: new DidCommCallsModule(),
    },
  })

  agent.registerOutboundTransport(new HttpOutboundTransport())
  agent.registerOutboundTransport(new WsOutboundTransport())

  await agent.initialize()
  return agent
}
