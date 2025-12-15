import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommReactionsService } from './DidCommReactionsService'
import { DidCommReactionsApi } from './DidcommReactionsApi'
import { MessageReactionsHandler } from './handlers'
import { DidCommReactionRole } from './models'

export class DidCommReactionsModule implements Module {
  public readonly api = DidCommReactionsApi

  public register(dependencyManager: DependencyManager): void {
    dependencyManager.registerContextScoped(DidCommReactionsApi)

    dependencyManager.registerSingleton(DidCommReactionsService)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)
    const reactionsService = agentContext.dependencyManager.resolve(DidCommReactionsService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/reactions/1.0',
        roles: [DidCommReactionRole.Receiver, DidCommReactionRole.Sender],
      }),
    )

    messageHandlerRegistry.registerMessageHandler(new MessageReactionsHandler(reactionsService))
  }
}
