import type { DependencyManager, Module, AgentContext } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommCallsService } from './DidCommCallsService'
import { DidCommCallsApi } from './DidcommCallsApi'
import { CallAcceptHandler, CallEndHandler, CallOfferHandler, CallRejectHandler } from './handlers'
import { DidCommCallRole } from './models'

export class DidCommCallsModule implements Module {
  public readonly api = DidCommCallsApi

  public register(dependencyManager: DependencyManager): void {
    dependencyManager.registerContextScoped(DidCommCallsApi)

    dependencyManager.registerSingleton(DidCommCallsService)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/calls/1.0',
        roles: [
          DidCommCallRole.VideoCaller,
          DidCommCallRole.VideoCallee,
          DidCommCallRole.AudioCallee,
          DidCommCallRole.AudioCaller,
        ],
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new CallAcceptHandler(),
      new CallRejectHandler(),
      new CallOfferHandler(),
      new CallEndHandler(),
    ])
  }
}
