import type { DidCommMrtdModuleConfigOptions } from './config/DidCommMrtdModuleConfig'
import type { AgentContext, DependencyManager, FeatureRegistry, Module } from '@credo-ts/core'

import { Protocol } from '@credo-ts/core'

import { DidCommMrtdApi } from './DidCommMrtdApi'
import { DidCommMrtdModuleConfig } from './config/DidCommMrtdModuleConfig'
import { DidCommMrtdRole } from './models'
import { CscaMasterListService, SodVerifierService } from './services'
import { DidCommMrtdService } from './services/DidCommMrtdService'

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

  /**
   * Initializes the module (e.g. by pre-loading the CSCA Master List if configured).
   */
  public async initialize(agentContext: AgentContext): Promise<void> {
    const logger = agentContext.config.logger

    if (!this.config.masterListCscaLocation) {
      logger.info('[DidCommMrtdModule] MASTER_LIST_CSCA_LOCATION not set; eMRTD verification remains disabled.')
      return
    }

    try {
      const csaMasterList = agentContext.dependencyManager.resolve(CscaMasterListService)
      logger.debug('[DidCommMrtdModule] Preload CSCA MasterList...')
      csaMasterList.initialize()
      logger.debug(
        `[DidCommMrtdModule] CSCA MasterList loaded (${csaMasterList.getTrustAnchors().length} CSCA anchors).`,
      )
    } catch (e) {
      logger.error(`[DidCommMrtdModule] CSCA MasterList Preload failed: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
}
