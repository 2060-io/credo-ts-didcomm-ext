import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { MediaSharingApi } from './MediaSharingApi'
import { MediaSharingRole } from './model'
import { MediaSharingRepository } from './repository'
import { MediaSharingService } from './services'

export class MediaSharingModule implements Module {
  public readonly api = MediaSharingApi

  /**
   * Registers the dependencies of media sharing module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager) {
    // Api
    dependencyManager.registerContextScoped(MediaSharingApi)

    // Services
    dependencyManager.registerSingleton(MediaSharingService)

    // Repositories
    dependencyManager.registerSingleton(MediaSharingRepository)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)
    const mediaSharingService = agentContext.dependencyManager.resolve(MediaSharingService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/media-sharing/1.0',
        roles: [MediaSharingRole.Sender, MediaSharingRole.Receiver],
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      mediaSharingService.getShareHandler(),
      mediaSharingService.getRequestHandler(),
    ])
  }
}
