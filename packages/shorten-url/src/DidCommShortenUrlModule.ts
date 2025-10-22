import type { DidCommShortenUrlModuleConfigOptions } from './DidCommShortenUrlModuleConfig'
import type { DependencyManager, FeatureRegistry, Module } from '@credo-ts/core'

import { Protocol } from '@credo-ts/core'

import { DidCommShortenUrlApi } from './DidCommShortenUrlApi'
import { DidCommShortenUrlModuleConfig } from './DidCommShortenUrlModuleConfig'
import { DidCommShortenUrlService } from './DidCommShortenUrlService'
import { DidCommShortenUrlRepository } from './repository'

export class DidCommShortenUrlModule implements Module {
  public readonly config: DidCommShortenUrlModuleConfig
  public readonly api = DidCommShortenUrlApi

  public constructor(config?: DidCommShortenUrlModuleConfig | DidCommShortenUrlModuleConfigOptions) {
    this.config = config instanceof DidCommShortenUrlModuleConfig ? config : new DidCommShortenUrlModuleConfig(config)
  }

  public register(dependencyManager: DependencyManager, featureRegistry: FeatureRegistry): void {
    dependencyManager.registerContextScoped(DidCommShortenUrlApi)
    dependencyManager.registerInstance(DidCommShortenUrlModuleConfig, this.config)
    dependencyManager.registerSingleton(DidCommShortenUrlRepository)
    dependencyManager.registerSingleton(DidCommShortenUrlService)

    featureRegistry.register(
      new Protocol({
        id: 'https://didcomm.org/shorten-url/1.0',
        roles: this.config.roles,
      }),
    )
  }
}
