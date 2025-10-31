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
    const { api, repository, connectionService } = createApi()
    const record = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'conn-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.InvalidationReceived,
    })
    ;(connectionService.findById as jest.Mock).mockResolvedValue({ id: 'conn-1' })
    ;(repository.getById as jest.Mock).mockResolvedValue(record)

    await expect(api.deleteById({ connectionId: 'conn-1', recordId: 'rec-1' })).resolves.toEqual({ recordId: 'rec-1' })
    expect(repository.delete).toHaveBeenCalledWith(agentContext, record)
  })

  it('deleteById should throw when record does not belong to connection', async () => {
    const { api, repository } = createApi()
    const record = new DidCommShortenUrlRecord({
      id: 'rec-1',
      connectionId: 'other-conn',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.InvalidationReceived,
    })
    ;(repository.getById as jest.Mock).mockResolvedValue(record)

    await expect(api.deleteById({ connectionId: 'conn-1', recordId: 'rec-1' })).rejects.toThrow(
      'Shortened URL record rec-1 does not belong to connection conn-1',
    )
    expect(repository.delete).not.toHaveBeenCalled()
  })

  it('deleteById should throw when connection does not exist', async () => {
    const { api, connectionService } = createApi()
    ;(connectionService.findById as jest.Mock).mockResolvedValue(null)

    await expect(api.deleteById({ connectionId: 'missing', recordId: 'rec-1' })).rejects.toThrow(
      'Connection not found with id missing',
    )
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
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.RequestReceived,
      requestedValiditySeconds: 300,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    await api.sendShortenedUrl({
      connectionId: 'conn-1',
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
    })

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
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: expectedExpires,
    })
  })

  it('sendShortenedUrl should error if shortened already sent', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.ShortenedSent,
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    await expect(
      api.sendShortenedUrl({ connectionId: 'conn-1', threadId: 'req-1', shortenedUrl: 'https://test.io/new' }),
    ).rejects.toThrow('Shortened URL already generated for thread req-1')
  })

  it('sendShortenedUrl should error if record already contains shortenedUrl', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.RequestReceived,
      shortenedUrl: 'https://test.io/old',
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    await expect(
      api.sendShortenedUrl({ connectionId: 'conn-1', threadId: 'req-1', shortenedUrl: 'https://test.io/new' }),
    ).rejects.toThrow('Shortened URL already generated for thread req-1')
  })

  it('sendShortenedUrl should error if the record was invalidated', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.InvalidationSent,
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    await expect(
      api.sendShortenedUrl({ connectionId: 'conn-1', threadId: 'req-1', shortenedUrl: 'https://test.io/new' }),
    ).rejects.toThrow('already invalidated')
  })

  it('invalidateShortenedUrl should require existing record', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' })
    ;(shortenService.createInvalidate as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.ShortenedReceived,
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    await api.invalidateShortenedUrl({ connectionId: 'conn-1', shortenedUrl: 'https://test.io/xyz' })

    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({ state: ShortenUrlState.InvalidationSent }),
    )
  })

  it('invalidateShortenedUrl should throw if no record', async () => {
    const { api, shortenService, repository } = createApi()
    ;(shortenService.createInvalidate as jest.Mock).mockReturnValue(
      new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' }),
    )
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(null)

    await expect(
      api.invalidateShortenedUrl({ connectionId: 'conn-1', shortenedUrl: 'https://test.io/xyz' }),
    ).rejects.toThrow('No shorten-url record found for the provided shortened_url on this connection')
  })

  it('invalidateShortenedUrl should error if already invalidated', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/xyz' })
    ;(shortenService.createInvalidate as jest.Mock).mockReturnValue(message)

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.InvalidationSent,
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    await expect(
      api.invalidateShortenedUrl({ connectionId: 'conn-1', shortenedUrl: 'https://test.io/xyz' }),
    ).rejects.toThrow('already been invalidated')
  })

  it('sendShortenedUrl should store provided expiresTime when creating new record', async () => {
    const { api, shortenService, repository } = createApi()

    const message = new ShortenedUrlMessage({
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
    })
    ;(shortenService.createShortenedUrl as jest.Mock).mockReturnValue(message)
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(null)

    const providedExpires = new Date('2024-02-01T10:00:00.000Z')

    await api.sendShortenedUrl({
      connectionId: 'conn-1',
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: providedExpires,
    })

    expect(repository.save).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({
        expiresTime: providedExpires,
      }),
    )
    expect(shortenService.createShortenedUrl).toHaveBeenCalledWith({
      threadId: 'req-1',
      shortenedUrl: 'https://test.io/xyz',
      expiresTime: providedExpires,
    })
  })
})
