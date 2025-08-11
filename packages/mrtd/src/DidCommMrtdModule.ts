import type { DependencyManager, FeatureRegistry, Module } from '@credo-ts/core'
import { Protocol } from '@credo-ts/core'

import { DidCommMrtdApi } from './DidCommMrtdApi'
import { DidCommMrtdService } from './DidCommMrtdService'
import { DidCommMrtdRole } from './models'
import { CscaMasterListService, SodVerifierService } from './services'

import { DidCommMrtdModuleConfig, DidCommMrtdModuleConfigOptions } from './config/DidCommMrtdModuleConfig'

/**
 * Module configuration and registration for DIDComm MRTD.
 */
export class DidCommMrtdModule implements Module {
  public readonly config: DidCommMrtdModuleConfig
  public readonly api = DidCommMrtdApi

  /**
   * @param config Optional module configuration.
   */
  public constructor(config?: DidCommMrtdModuleConfigOptions) {
    this.config = new DidCommMrtdModuleConfig(config)
  }

  /**
   * Registers services and protocol definitions with the dependency manager.
   */
  public register(dependencyManager: DependencyManager, featureRegistry: FeatureRegistry): void {
    // Register API
    dependencyManager.registerContextScoped(DidCommMrtdApi)

    // Register configuration instance
    dependencyManager.registerInstance(DidCommMrtdModuleConfig, this.config)

    // Register services
    dependencyManager.registerSingleton(CscaMasterListService)
    dependencyManager.registerSingleton(SodVerifierService)

    // Register primary service
    dependencyManager.registerSingleton(DidCommMrtdService)

    // Register DIDComm MRTD protocol and roles
    featureRegistry.register(
      new Protocol({
        id: 'https://didcomm.org/mrtd/1.0',
        roles: [
          DidCommMrtdRole.MrzRequester,
          DidCommMrtdRole.MrzResponder,
          DidCommMrtdRole.EMrtdDataRequester,
          DidCommMrtdRole.EMrtdDataResponder,
        ],
      }),
    )
  }
}
