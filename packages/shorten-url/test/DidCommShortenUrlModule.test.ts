import type { DependencyManager, FeatureRegistry } from '@credo-ts/core'

import { DidCommShortenUrlApi } from '../src/DidCommShortenUrlApi'
import { DidCommShortenUrlModule } from '../src/DidCommShortenUrlModule'
import { DidCommShortenUrlModuleConfig } from '../src/DidCommShortenUrlModuleConfig'
import { DidCommShortenUrlService } from '../src/DidCommShortenUrlService'
import { ShortenUrlRole } from '../src/models'
import { DidCommShortenUrlRepository } from '../src/repository'

describe('DidCommShortenUrlModuleConfig', () => {
  it('defaults to both roles', () => {
    const config = new DidCommShortenUrlModuleConfig()
    expect(config.roles).toEqual([ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider])
  })

  it('returns configured roles without duplicates', () => {
    const config = new DidCommShortenUrlModuleConfig({
      roles: [ShortenUrlRole.LongUrlProvider, ShortenUrlRole.LongUrlProvider],
    })
    expect(config.roles).toEqual([ShortenUrlRole.LongUrlProvider])
  })
})

describe('DidCommShortenUrlModule', () => {
  const createDependencies = () => {
    const dependencyManagerMock = {
      registerContextScoped: jest.fn(),
      registerInstance: jest.fn(),
      registerSingleton: jest.fn(),
    }

    const featureRegistryMock = {
      register: jest.fn(),
    }

    return {
      dependencyManager: dependencyManagerMock as unknown as DependencyManager,
      featureRegistry: featureRegistryMock as unknown as FeatureRegistry,
      dependencyManagerMock,
      featureRegistryMock,
    }
  }

  it('registers defaults when no config is provided', () => {
    const module = new DidCommShortenUrlModule()
    const { dependencyManager, featureRegistry, dependencyManagerMock, featureRegistryMock } = createDependencies()

    module.register(dependencyManager, featureRegistry)

    expect(dependencyManagerMock.registerContextScoped).toHaveBeenCalledWith(DidCommShortenUrlApi)
    expect(dependencyManagerMock.registerInstance).toHaveBeenCalledWith(DidCommShortenUrlModuleConfig, module.config)
    expect(dependencyManagerMock.registerSingleton).toHaveBeenNthCalledWith(1, DidCommShortenUrlRepository)
    expect(dependencyManagerMock.registerSingleton).toHaveBeenNthCalledWith(2, DidCommShortenUrlService)

    const protocol = featureRegistryMock.register.mock.calls[0][0]
    expect(protocol.roles).toEqual([ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider])
  })

  it('registers provided roles from config options', () => {
    const module = new DidCommShortenUrlModule({ roles: [ShortenUrlRole.LongUrlProvider] })
    const { dependencyManager, featureRegistry, featureRegistryMock } = createDependencies()

    module.register(dependencyManager, featureRegistry)

    const protocol = featureRegistryMock.register.mock.calls[0][0]
    expect(protocol.roles).toEqual([ShortenUrlRole.LongUrlProvider])
  })
})
