import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommMediaSharingApi } from './DidCommMediaSharingApi'
import { DidCommRequestMediaHandler, DidCommShareMediaHandler } from './handlers'
import { DidCommMediaSharingRole } from './model'
import { DidCommMediaSharingRepository } from './repository'
import { DidCommMediaSharingService } from './services'

export class DidCommMediaSharingModule implements Module {
  public readonly api = DidCommMediaSharingApi

  /**
   * Registers the dependencies of media sharing module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager) {
    // Api
    dependencyManager.registerContextScoped(DidCommMediaSharingApi)

    // Services
    dependencyManager.registerSingleton(DidCommMediaSharingService)

    // Repositories
    dependencyManager.registerSingleton(DidCommMediaSharingRepository)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)
    const mediaSharingService = agentContext.dependencyManager.resolve(DidCommMediaSharingService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/media-sharing/1.0',
        roles: [DidCommMediaSharingRole.Sender, DidCommMediaSharingRole.Receiver],
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new DidCommShareMediaHandler(mediaSharingService),
      new DidCommRequestMediaHandler(),
    ])
  }
}
