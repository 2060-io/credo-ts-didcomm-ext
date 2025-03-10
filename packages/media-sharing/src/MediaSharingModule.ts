import type { DependencyManager, FeatureRegistry, Module } from '@credo-ts/core'

import { Protocol } from '@credo-ts/core'

import { MediaSharingApi } from './MediaSharingApi'
import { MediaSharingRole } from './model'
import { MediaSharingRepository } from './repository'
import { MediaSharingService } from './services'

export class MediaSharingModule implements Module {
  public readonly api = MediaSharingApi

  /**
   * Registers the dependencies of media sharing module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager, featureRegistry: FeatureRegistry) {
    // Api
    dependencyManager.registerContextScoped(MediaSharingApi)

    // Services
    dependencyManager.registerSingleton(MediaSharingService)

    // Repositories
    dependencyManager.registerSingleton(MediaSharingRepository)

    // Feature Registry
    featureRegistry.register(
      new Protocol({
        id: 'https://didcomm.org/media-sharing/1.0',
        roles: [MediaSharingRole.Sender, MediaSharingRole.Receiver],
      }),
    )
  }
}
