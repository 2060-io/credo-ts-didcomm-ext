import type { DependencyManager, Module, AgentContext } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { UserProfileApi } from './UserProfileApi'
import { UserProfileModuleConfig } from './UserProfileModuleConfig'
import { ProfileHandler, RequestProfileHandler } from './handlers'
import { UserProfileService } from './services'

export class UserProfileModule implements Module {
  public readonly config: UserProfileModuleConfig
  public readonly api = UserProfileApi

  public constructor(config?: UserProfileModuleConfig) {
    this.config = new UserProfileModuleConfig(config)
  }

  /**
   * Registers the dependencies of the question answer module on the dependency manager.
   */
  public register(dependencyManager: DependencyManager) {
    // Api
    dependencyManager.registerContextScoped(UserProfileApi)

    // Config
    dependencyManager.registerInstance(UserProfileModuleConfig, this.config)

    // Services
    dependencyManager.registerSingleton(UserProfileService)
  }

  public async initialize(agentContext: AgentContext) {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/user-profile/1.0',
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new ProfileHandler(agentContext.dependencyManager.resolve(UserProfileService)),
      new RequestProfileHandler(agentContext.dependencyManager.resolve(UserProfileService)),
    ])
  }
}
