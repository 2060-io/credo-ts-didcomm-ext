import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommReceiptsApi } from './DidCommReceiptsApi'
import { DidCommMessageReceiptsHandler, DidCommRequestReceiptsHandler } from './handlers'
import { DidCommReceiptsService } from './services'

export class DidCommReceiptsModule implements Module {
  public readonly api = DidCommReceiptsApi

  /**
   * Registers the dependencies of the question answer module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager) {
    // Api
    dependencyManager.registerContextScoped(DidCommReceiptsApi)

    // Services
    dependencyManager.registerSingleton(DidCommReceiptsService)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve<DidCommFeatureRegistry>(DidCommFeatureRegistry)
    const messageHandlerRegistry =
      agentContext.dependencyManager.resolve<DidCommMessageHandlerRegistry>(DidCommMessageHandlerRegistry)
    const receiptsService = agentContext.dependencyManager.resolve(DidCommReceiptsService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/receipts/1.0',
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new DidCommMessageReceiptsHandler(receiptsService),
      new DidCommRequestReceiptsHandler(receiptsService),
    ])
  }
}
