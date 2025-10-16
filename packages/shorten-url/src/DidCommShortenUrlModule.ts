import type { DependencyManager, FeatureRegistry, Module } from '@credo-ts/core'

import { Protocol } from '@credo-ts/core'

import { DidCommShortenUrlApi } from './DidCommShortenUrlApi'
import { DidCommShortenUrlService } from './DidCommShortenUrlService'
import { ShortenUrlRole } from './models'

export class DidCommShortenUrlModule implements Module {
  public readonly api = DidCommShortenUrlApi

  public register(dependencyManager: DependencyManager, featureRegistry: FeatureRegistry): void {
    dependencyManager.registerContextScoped(DidCommShortenUrlApi)
    dependencyManager.registerSingleton(DidCommShortenUrlService)

    featureRegistry.register(
      new Protocol({
        id: 'https://didcomm.org/shorten-url/1.0',
        roles: [ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider],
      }),
    )
  }
}
