import type { DidCommShortenUrlModuleConfigOptions } from './DidCommShortenUrlModuleConfig'
import type { AgentContext, DependencyManager, Module } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry, DidCommProtocol } from '@credo-ts/didcomm'

import { DidCommShortenUrlApi } from './DidCommShortenUrlApi'
import { DidCommShortenUrlModuleConfig } from './DidCommShortenUrlModuleConfig'
import { DidCommShortenUrlService } from './DidCommShortenUrlService'
import {
  AckShortenUrlHandler,
  InvalidateShortenedUrlHandler,
  RequestShortenedUrlHandler,
  ShortenedUrlHandler,
} from './handlers'
import { DidCommShortenUrlRepository } from './repository'

export class DidCommShortenUrlModule implements Module {
  public readonly config: DidCommShortenUrlModuleConfig
  public readonly api = DidCommShortenUrlApi

  public constructor(config?: DidCommShortenUrlModuleConfig | DidCommShortenUrlModuleConfigOptions) {
    this.config = config instanceof DidCommShortenUrlModuleConfig ? config : new DidCommShortenUrlModuleConfig(config)
  }

  public register(dependencyManager: DependencyManager): void {
    dependencyManager.registerContextScoped(DidCommShortenUrlApi)
    dependencyManager.registerInstance(DidCommShortenUrlModuleConfig, this.config)
    dependencyManager.registerSingleton(DidCommShortenUrlRepository)
    dependencyManager.registerSingleton(DidCommShortenUrlService)
  }

  public async initialize(agentContext: AgentContext): Promise<void> {
    const featureRegistry = agentContext.dependencyManager.resolve(DidCommFeatureRegistry)
    const messageHandlerRegistry = agentContext.dependencyManager.resolve(DidCommMessageHandlerRegistry)
    const service = agentContext.dependencyManager.resolve(DidCommShortenUrlService)

    featureRegistry.register(
      new DidCommProtocol({
        id: 'https://didcomm.org/shorten-url/1.0',
        roles: this.config.roles,
      }),
    )

    messageHandlerRegistry.registerMessageHandlers([
      new RequestShortenedUrlHandler(service),
      new ShortenedUrlHandler(service),
      new InvalidateShortenedUrlHandler(service),
      new AckShortenUrlHandler(service),
    ])
  }
}
