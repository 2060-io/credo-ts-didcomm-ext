import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'
import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { ReceiptsApi } from './ReceiptsApi'
import { MessageReceiptsHandler, RequestReceiptsHandler } from './handlers'
import { ReceiptsService } from './services'

export class ReceiptsModule implements Module {
  public readonly api = ReceiptsApi

  /**
   * Registers the dependencies of the question answer module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager) {
    // Api
    dependencyManager.registerContextScoped(ReceiptsApi)

    // Services
    dependencyManager.registerSingleton(ReceiptsService)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve<DidCommFeatureRegistry>(DidCommFeatureRegistry)
    const messageHandlerRegistry =
      agentContext.dependencyManager.resolve<DidCommMessageHandlerRegistry>(DidCommMessageHandlerRegistry)
    const receiptsService = agentContext.dependencyManager.resolve(ReceiptsService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/receipts/1.0',
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new MessageReceiptsHandler(receiptsService),
      new RequestReceiptsHandler(receiptsService),
    ])
  }
}
