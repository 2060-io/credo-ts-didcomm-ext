import type { AgentContext, DependencyManager } from '@credo-ts/core'

import { DidCommFeatureRegistry, DidCommMessageHandlerRegistry } from '@credo-ts/didcomm'
import { vi, describe } from 'vitest'

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
    expect(config.maximumRequestedValiditySeconds).toBeUndefined()
  })

  it('returns configured roles without duplicates', () => {
    const config = new DidCommShortenUrlModuleConfig({
      roles: [ShortenUrlRole.LongUrlProvider, ShortenUrlRole.LongUrlProvider],
    })
    expect(config.roles).toEqual([ShortenUrlRole.LongUrlProvider])
  })

  it('accepts maximumRequestedValiditySeconds when positive integer', () => {
    const config = new DidCommShortenUrlModuleConfig({ maximumRequestedValiditySeconds: 86_400 })
    expect(config.maximumRequestedValiditySeconds).toBe(86_400)
  })

  it('throws when maximumRequestedValiditySeconds is not a positive integer', () => {
    expect(() => new DidCommShortenUrlModuleConfig({ maximumRequestedValiditySeconds: -1 })).toThrow(
      'maximumRequestedValiditySeconds must be zero or a positive integer',
    )
    expect(() => new DidCommShortenUrlModuleConfig({ maximumRequestedValiditySeconds: 12.5 })).toThrow(
      'maximumRequestedValiditySeconds must be an integer',
    )
  })

  it('treats zero as disabling the maximum', () => {
    const config = new DidCommShortenUrlModuleConfig({ maximumRequestedValiditySeconds: 0 })
    expect(config.maximumRequestedValiditySeconds).toBeUndefined()
  })
})

describe('DidCommShortenUrlModule', () => {
  const createDependencies = () => {
    const dependencyManagerMock = {
      registerContextScoped: vi.fn(),
      registerInstance: vi.fn(),
      registerSingleton: vi.fn(),
      resolve: vi.fn(),
    }

    return {
      dependencyManager: dependencyManagerMock as unknown as DependencyManager,
      dependencyManagerMock,
    }
  }

  it('registers defaults when no config is provided', () => {
    const module = new DidCommShortenUrlModule()
    const { dependencyManager, dependencyManagerMock } = createDependencies()

    module.register(dependencyManager)

    expect(dependencyManagerMock.registerContextScoped).toHaveBeenCalledWith(DidCommShortenUrlApi)
    expect(dependencyManagerMock.registerInstance).toHaveBeenCalledWith(DidCommShortenUrlModuleConfig, module.config)
    expect(dependencyManagerMock.registerSingleton).toHaveBeenNthCalledWith(1, DidCommShortenUrlRepository)
    expect(dependencyManagerMock.registerSingleton).toHaveBeenNthCalledWith(2, DidCommShortenUrlService)
  })

  it('registers provided roles from config options', () => {
    const module = new DidCommShortenUrlModule({ roles: [ShortenUrlRole.LongUrlProvider] })
    const { dependencyManager } = createDependencies()

    module.register(dependencyManager)

    expect(module.config.roles).toEqual([ShortenUrlRole.LongUrlProvider])
  })

  it('initializes protocol and handlers with the agent context', async () => {
    const module = new DidCommShortenUrlModule()
    const featureRegistryMock = { register: vi.fn() }
    const messageHandlerRegistryMock = { registerMessageHandlers: vi.fn() }
    const serviceMock = {} as DidCommShortenUrlService

    const dependencyManager = {
      resolve: vi.fn((token) => {
        if (token === DidCommFeatureRegistry) return featureRegistryMock
        if (token === DidCommMessageHandlerRegistry) return messageHandlerRegistryMock
        if (token === DidCommShortenUrlService) return serviceMock
        throw new Error(`Unexpected resolve token ${String(token)}`)
      }),
    }

    const agentContext = { dependencyManager } as unknown as AgentContext
    await module.initialize(agentContext)

    expect(featureRegistryMock.register).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'https://didcomm.org/shorten-url/1.0',
        roles: [ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider],
      }),
    )
    expect(messageHandlerRegistryMock.registerMessageHandlers).toHaveBeenCalled()
  })
})
