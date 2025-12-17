import type { DependencyManager, Module, AgentContext } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommUserProfileApi } from './DidCommUserProfileApi'
import { UserProfileModuleConfig } from './DidCommUserProfileModuleConfig'
import { DidCommProfileHandler, DidCommRequestProfileHandler } from './handlers'
import { DidCommUserProfileService } from './services'

export class DidCommUserProfileModule implements Module {
  public readonly config: UserProfileModuleConfig
  public readonly api = DidCommUserProfileApi

  public constructor(config?: UserProfileModuleConfig) {
    this.config = new UserProfileModuleConfig(config)
  }

  /**
   * Registers the dependencies of the question answer module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager) {
    // Api
    dependencyManager.registerContextScoped(DidCommUserProfileApi)

    // Config
    dependencyManager.registerInstance(UserProfileModuleConfig, this.config)

    // Services
    dependencyManager.registerSingleton(DidCommUserProfileService)
  }

  public async initialize(agentContext: AgentContext) {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)
    const userProfileService = agentContext.dependencyManager.resolve(DidCommUserProfileService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/user-profile/1.0',
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new DidCommProfileHandler(userProfileService),
      new DidCommRequestProfileHandler(userProfileService),
    ])
  }
}
