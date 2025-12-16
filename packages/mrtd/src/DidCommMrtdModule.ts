import type { DidCommMrtdModuleConfigOptions } from './config/DidCommMrtdModuleConfig'
import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommMrtdApi } from './DidCommMrtdApi'
import { DidCommMrtdModuleConfig } from './config/DidCommMrtdModuleConfig'
import {
  EMrtdDataHandler,
  EMrtdDataRequestHandler,
  MrtdProblemReportHandler,
  MrzDataHandler,
  MrzDataRequestHandler,
} from './handlers'
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
  public register(dependencyManager: DependencyManager): void {
    // Register API
    dependencyManager.registerContextScoped(DidCommMrtdApi)

    // Register configuration instance
    dependencyManager.registerInstance(DidCommMrtdModuleConfig, this.config)

    // Register services
    dependencyManager.registerSingleton(CscaMasterListService)
    dependencyManager.registerSingleton(SodVerifierService)

    // Register primary service
    dependencyManager.registerSingleton(DidCommMrtdService)
  }

  /**
   * Initializes the module (e.g. by pre-loading the CSCA Master List if configured).
   */
  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve<DidCommFeatureRegistry>(DidCommFeatureRegistry)
    const messageHandlerRegistry =
      agentContext.dependencyManager.resolve<DidCommMessageHandlerRegistry>(DidCommMessageHandlerRegistry)
    const mrtdService = agentContext.dependencyManager.resolve(DidCommMrtdService)

    // Register DIDComm MRTD protocol and roles
    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/mrtd/1.0',
        roles: [
          DidCommMrtdRole.MrzRequester,
          DidCommMrtdRole.MrzResponder,
          DidCommMrtdRole.EMrtdDataRequester,
          DidCommMrtdRole.EMrtdDataResponder,
        ],
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new MrzDataHandler(mrtdService),
      new MrzDataRequestHandler(mrtdService),
      new EMrtdDataHandler(mrtdService),
      new EMrtdDataRequestHandler(mrtdService),
      new MrtdProblemReportHandler(mrtdService),
    ])

    const logger = agentContext.config.logger

    if (!this.config.masterListCscaLocation) {
      logger.info('[DidCommMrtdModule] MASTER_LIST_CSCA_LOCATION not set; eMRTD verification remains disabled.')
      return
    }

    const csaMasterList = agentContext.dependencyManager.resolve(CscaMasterListService)
    logger.debug('[DidCommMrtdModule] Preload CSCA MasterList...')

    csaMasterList
      .initialize()
      .then(() => {
        logger.debug(
          `[DidCommMrtdModule] CSCA MasterList loaded (${csaMasterList.getTrustAnchors().length} CSCA anchors).`,
        )
      })
      .catch((e) => {
        logger.error(
          `[DidCommMrtdModule] CSCA MasterList Preload failed: ${e instanceof Error ? e.message : String(e)}`,
        )
      })
  }
}
