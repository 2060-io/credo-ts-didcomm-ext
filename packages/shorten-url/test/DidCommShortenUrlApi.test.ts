import type { DidCommShortenUrlService } from '../src/DidCommShortenUrlService'
import type { DidCommShortenUrlRepository } from '../src/repository'
import type { AgentContext, ConnectionService, MessageHandlerRegistry, MessageSender } from '@credo-ts/core'

import { DidCommShortenUrlApi } from '../src/DidCommShortenUrlApi'
import { RequestShortenedUrlMessage, ShortenedUrlMessage, InvalidateShortenedUrlMessage } from '../src/messages'
import { ShortenUrlRole, ShortenUrlState } from '../src/models'
import { DidCommShortenUrlRecord } from '../src/repository'

describe('DidCommShortenUrlApi', () => {
  const agentContext = {} as AgentContext
  const connection = { id: 'conn-1' }

  const createApi = () => {
    const messageHandlerRegistryMock = {
      registerMessageHandler: jest.fn(),
    }
    const messageSenderMock = {
      sendMessage: jest.fn().mockResolvedValue(undefined),
    }
    const shortenService = {
      createRequest: jest.fn(),
      createShortenedUrl: jest.fn(),
      createInvalidate: jest.fn(),
    } as unknown as DidCommShortenUrlService
    const connectionServiceMock = {
      findById: jest.fn().mockResolvedValue(connection),
    }
    const repositoryMock = {
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findSingleByQuery: jest.fn().mockResolvedValue(null),
      getById: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    }

    const api = new DidCommShortenUrlApi(
      messageHandlerRegistryMock as unknown as MessageHandlerRegistry,
      messageSenderMock as unknown as MessageSender,
      shortenService,
      repositoryMock as unknown as DidCommShortenUrlRepository,
      connectionServiceMock as unknown as ConnectionService,
      agentContext,
    )

    return {
      api,
      messageSender: messageSenderMock,
      shortenService,
      connectionService: connectionServiceMock,
      repository: repositoryMock,
    }
  }

  it('deleteById should remove record when connection matches', async () => {
    const { api, repository } = createApi()
    const record = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.InvalidationReceived,
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(record)

    await expect(api.deleteById({ recordId: 'rec-1' })).resolves.toEqual({ recordId: 'rec-1' })
    expect(repository.delete).toHaveBeenCalledWith(agentContext, record)
  })

  it('deleteById should throw when record lacks connection data', async () => {
    const { api, repository } = createApi()
    const record = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: undefined as unknown as string,
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.InvalidationReceived,
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(record)

    await expect(api.deleteById({ recordId: 'rec-1' })).rejects.toThrow(
      'Shorten-url record rec-1 does not have an associated connection.',
    )
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('requestShortenedUrl should store record and send message', async () => {
    const { api, shortenService, repository, messageSender } = createApi()

    const message = new RequestShortenedUrlMessage({
      url: 'https://example.com',
      goalCode: 'shorten',
      requestedValiditySeconds: 3600,
    })
    ;(shortenService.createRequest as jest.Mock).mockReturnValue(message)

    await api.requestShortenedUrl({
      connectionId: 'conn-1',
      url: 'https://example.com',
      goalCode: 'shorten',
      requestedValiditySeconds: 3600,
    })

    expect(repository.save).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({
        connectionId: 'conn-1',
        threadId: message.id,
        role: ShortenUrlRole.LongUrlProvider,
        state: ShortenUrlState.RequestSent,
      }),
    )
    expect(messageSender.sendMessage).toHaveBeenCalled()
  })

  it('sendShortenedUrl should update existing record', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      id: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.RequestReceived,
      requestedValiditySeconds: 300,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await api.sendShortenedUrl({ recordId: 'rec-1', shortenedUrl: 'https://test.io/xyz' })

    const expectedExpires = new Date(existingRecord.createdAt!.getTime() + 300 * 1000)
    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({
        state: ShortenUrlState.ShortenedSent,
        shortenedUrl: 'https://test.io/xyz',
        expiresTime: expectedExpires,
      }),
    )
    expect(shortenService.createShortenedUrl).toHaveBeenCalledWith({
      id: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: expectedExpires,
    })
  })

  it('sendShortenedUrl should error if shortened already sent', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      id: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.ShortenedSent,
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await expect(api.sendShortenedUrl({ recordId: 'rec-1', shortenedUrl: 'https://test.io/new' })).rejects.toThrow(
      'Shortened URL already generated for record rec-1',
    )
  })

  it('sendShortenedUrl should error if record already contains shortenedUrl', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      id: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.RequestReceived,
      shortenedUrl: 'https://test.io/old',
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await expect(api.sendShortenedUrl({ recordId: 'rec-1', shortenedUrl: 'https://test.io/new' })).rejects.toThrow(
      'Shortened URL already generated for record rec-1',
    )
  })

  it('sendShortenedUrl should error if the record was invalidated', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      id: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.InvalidationSent,
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await expect(api.sendShortenedUrl({ recordId: 'rec-1', shortenedUrl: 'https://test.io/new' })).rejects.toThrow(
      'already invalidated',
    )
  })

  it('invalidateShortenedUrl should require existing record', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' })
    ;(shortenService.createInvalidate as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.ShortenedReceived,
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await api.invalidateShortenedUrl({ recordId: 'rec-1' })

    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({ state: ShortenUrlState.InvalidationSent }),
    )
  })

  it('invalidateShortenedUrl should throw if record lookup fails', async () => {
    const { api, repository } = createApi()
    ;(repository.getById as jest.Mock).mockRejectedValue(new Error('not found'))

    await expect(api.invalidateShortenedUrl({ recordId: 'missing' })).rejects.toThrow('not found')
  })

  it('invalidateShortenedUrl should error if already invalidated', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' })
    ;(shortenService.createInvalidate as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.InvalidationSent,
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await expect(api.invalidateShortenedUrl({ recordId: 'rec-1' })).rejects.toThrow('already been invalidated')
  })

  it('invalidateShortenedUrl should allow invalidation even if the record is already expired', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' })
    ;(shortenService.createInvalidate as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.ShortenedReceived,
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: new Date(Date.now() - 60 * 60 * 1000),
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    await api.invalidateShortenedUrl({ recordId: 'rec-1' })
    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({ state: ShortenUrlState.InvalidationSent }),
    )
  })

  it('sendShortenedUrl should store provided expiresTime on existing record', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.RequestReceived,
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(existingRecord)

    const providedExpires = new Date('2024-02-01T10:00:00.000Z')

    await api.sendShortenedUrl({
      recordId: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: providedExpires,
    })

    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({
        expiresTime: providedExpires,
        shortenedUrl: 'https://test.io/xyz',
      }),
    )
    expect(repository.save).not.toHaveBeenCalled()
    expect(shortenService.createShortenedUrl).toHaveBeenCalledWith({
      id: 'rec-1',
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: providedExpires,
    })
  })
})
