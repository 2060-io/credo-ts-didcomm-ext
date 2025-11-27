import type { DidCommShortenUrlRepository } from '../src/repository'
import type { AgentContext, AgentMessage, EventEmitter, InboundMessageContext } from '@credo-ts/core'

import { AckStatus } from '@credo-ts/core'

import { DidCommShortenUrlEventTypes } from '../src/DidCommShortenUrlEvents'
import { DidCommShortenUrlModuleConfig } from '../src/DidCommShortenUrlModuleConfig'
import { DidCommShortenUrlService } from '../src/DidCommShortenUrlService'
import {
  RequestShortenedUrlMessage,
  ShortenedUrlMessage,
  InvalidateShortenedUrlMessage,
  ShortenUrlAckMessage,
} from '../src/messages'
import { ShortenUrlRole, ShortenUrlState } from '../src/models'
import { DidCommShortenUrlRecord } from '../src/repository'

describe('DidCommShortenUrlService', () => {
  let moduleConfig: DidCommShortenUrlModuleConfig
  const dependencyManager = {
    resolve: jest.fn(),
  }
  const agentContext = { dependencyManager } as unknown as AgentContext
  const connection = { id: 'conn-1' }

  const makeCtx = <T extends AgentMessage>(message: T) =>
    ({
      message,
      agentContext,
      assertReadyConnection: () => connection,
    }) as unknown as InboundMessageContext<T>

  const createService = () => {
    const emit = jest.fn()
    const eventEmitter = { emit } as unknown as EventEmitter
    const repository: jest.Mocked<
      Pick<DidCommShortenUrlRepository, 'save' | 'update' | 'findSingleByQuery' | 'getSingleByQuery'>
    > = {
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      findSingleByQuery: jest.fn().mockResolvedValue(null),
      getSingleByQuery: jest.fn().mockRejectedValue(new Error('not found')),
    }

    const service = new DidCommShortenUrlService(eventEmitter, repository as unknown as DidCommShortenUrlRepository)

    return { service, emit, repository }
  }

  beforeEach(() => {
    moduleConfig = new DidCommShortenUrlModuleConfig()
    ;(dependencyManager.resolve as jest.Mock).mockImplementation((token) => {
      if (token === DidCommShortenUrlModuleConfig) return moduleConfig

      throw new Error(`Unexpected dependency request: ${token}`)
    })
  })

  it('createRequest should accept non-negative integer validity', () => {
    const { service } = createService()
    const msg = service.createRequest({
      url: 'https://example.com',
      goalCode: 'shorten',
      requestedValiditySeconds: 0,
    })

    expect(msg).toBeInstanceOf(RequestShortenedUrlMessage)
    expect(msg.requestedValiditySeconds).toBe(0)
  })

  it('createRequest should reject invalid validity values', () => {
    const { service } = createService()

    expect(() =>
      service.createRequest({
        url: 'https://example.com',
        goalCode: 'shorten',
        requestedValiditySeconds: -1,
      }),
    ).toThrow('requested_validity_seconds MUST be a non-negative integer')

    expect(() =>
      service.createRequest({
        url: 'https://example.com',
        goalCode: 'shorten',
        requestedValiditySeconds: 3.5,
      }),
    ).toThrow('requested_validity_seconds MUST be a non-negative integer')
  })

  it('processRequest should emit RequestShortenedUrlReceived and store record', async () => {
    const { service, emit, repository } = createService()

    const msg = new RequestShortenedUrlMessage({
      url: 'https://example.com?oob=abc',
      goalCode: 'shorten.oobv1',
      requestedValiditySeconds: 600,
    })

    await service.processRequest(makeCtx(msg))
    expect(repository.save).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({
        connectionId: 'conn-1',
        threadId: msg.id,
        state: ShortenUrlState.RequestReceived,
        role: ShortenUrlRole.UrlShortener,
        url: 'https://example.com?oob=abc',
      }),
    )
    expect(emit).toHaveBeenCalledTimes(1)
    const [, event] = emit.mock.calls[0]
    expect(event.type).toBe(DidCommShortenUrlEventTypes.DidCommRequestShortenedUrlReceived)
    const savedRecord = (repository.save as jest.Mock).mock.calls[0][1] as DidCommShortenUrlRecord
    expect(event.payload.shortenUrlRecord).toBe(savedRecord)
    expect(event.payload.shortenUrlRecord.state).toBe(ShortenUrlState.RequestReceived)
  })

  it('processRequest should reject invalid requested validity seconds', async () => {
    const { service, emit, repository } = createService()

    const msg = new RequestShortenedUrlMessage({
      url: 'https://example.com',
      goalCode: 'shorten',
      requestedValiditySeconds: 600,
    })

    Reflect.set(msg, 'requestedValiditySeconds', -5)

    await expect(service.processRequest(makeCtx(msg))).rejects.toThrow(
      'request-shortened-url MUST include a non-negative integer requested_validity_seconds',
    )
    expect(emit).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('processRequest should reject when requested validity exceeds module config', async () => {
    const { service, emit, repository } = createService()
    moduleConfig = new DidCommShortenUrlModuleConfig({ maximumRequestedValiditySeconds: 120 })

    const msg = new RequestShortenedUrlMessage({
      url: 'https://example.com?oob=abc',
      goalCode: 'shorten.oobv1',
      requestedValiditySeconds: 200,
    })

    await expect(service.processRequest(makeCtx(msg))).rejects.toThrow('validity_too_long')
    expect(emit).not.toHaveBeenCalled()
    expect(repository.save).not.toHaveBeenCalled()
  })

  it('processShortenedUrl should emit ShortenedUrlReceived', async () => {
    const { service, emit, repository } = createService()

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.RequestSent,
    })
    ;(repository.getSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    const expiresAt = new Date('2024-11-27T12:00:00.000Z')
    const msg = new ShortenedUrlMessage({
      shortenedUrl: 'https://s.io/xyz',
      expiresTime: expiresAt,
    })
    msg.setThread({ threadId: 'req-1' })

    await service.processShortenedUrl(makeCtx(msg))
    expect(repository.getSingleByQuery).toHaveBeenCalledWith(agentContext, {
      connectionId: 'conn-1',
      threadId: 'req-1',
      role: ShortenUrlRole.LongUrlProvider,
    })
    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({
        connectionId: 'conn-1',
        state: ShortenUrlState.ShortenedReceived,
        shortenedUrl: 'https://s.io/xyz',
        expiresTime: expiresAt,
      }),
    )
    const [, event] = emit.mock.calls[0]
    expect(event.type).toBe(DidCommShortenUrlEventTypes.DidCommShortenedUrlReceived)
    expect(event.payload.shortenUrlRecord).toBe(existingRecord)
    expect(event.payload.shortenUrlRecord.state).toBe(ShortenUrlState.ShortenedReceived)
    expect(event.payload.shortenUrlRecord.expiresTime?.toISOString()).toBe(expiresAt.toISOString())
  })

  it('processShortenedUrl should throw if thread id is missing', async () => {
    const { service, emit, repository } = createService()

    const msg = new ShortenedUrlMessage({
      shortenedUrl: 'https://s.io/xyz',
    })
    Reflect.set(msg, 'thread', undefined)

    await expect(service.processShortenedUrl(makeCtx(msg))).rejects.toThrow(
      'shortened-url message MUST include the thread id of the related request',
    )
    expect(emit).not.toHaveBeenCalled()
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('processInvalidate should emit InvalidateShortenedUrlReceived', async () => {
    const { service, emit, repository } = createService()

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.ShortenedSent,
      shortenedUrl: 'https://s.io/xyz',
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    const msg = new InvalidateShortenedUrlMessage({
      shortenedUrl: 'https://s.io/xyz',
    })

    await service.processInvalidate(makeCtx(msg))
    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({ state: ShortenUrlState.InvalidationReceived }),
    )
    const [, event] = emit.mock.calls[0]
    expect(event.type).toBe(DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived)
    expect(event.payload.shortenUrlRecord).toBe(existingRecord)
    expect(event.payload.shortenUrlRecord.state).toBe(ShortenUrlState.InvalidationReceived)
  })

  it('processInvalidate should still update record when expiresTime is in the past', async () => {
    const { service, repository } = createService()

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.ShortenedReceived,
      shortenedUrl: 'https://s.io/expired',
      expiresTime: new Date(Date.now() - 5 * 60 * 1000),
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    const msg = new InvalidateShortenedUrlMessage({
      shortenedUrl: 'https://s.io/expired',
    })

    await service.processInvalidate(makeCtx(msg))
    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({ state: ShortenUrlState.InvalidationReceived }),
    )
  })

  it('processInvalidate should throw when record does not exist', async () => {
    const { service, repository } = createService()
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(null)

    const msg = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://s.io/xyz' })

    await expect(service.processInvalidate(makeCtx(msg))).rejects.toThrow(
      'No shorten-url record found for the provided shortened_url on this connection',
    )
  })

  it('processAck should transition to Invalidated and emit event', async () => {
    const { service, emit, repository } = createService()

    const existingRecord = new DidCommShortenUrlRecord({
      connectionId: 'conn-1',
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.InvalidationSent,
      shortenedUrl: 'https://s.io/xyz',
      invalidationMessageId: 'inv-1',
      threadId: 'thread-1',
    })
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(existingRecord)

    const ack = new ShortenUrlAckMessage({ status: AckStatus.OK, threadId: 'inv-1' })

    await service.processAck(makeCtx(ack))

    expect(repository.update).toHaveBeenCalledWith(
      agentContext,
      expect.objectContaining({ state: ShortenUrlState.Invalidated }),
    )
    const [, event] = emit.mock.calls[0]
    expect(event.type).toBe(DidCommShortenUrlEventTypes.DidCommShortenedUrlInvalidated)
    expect(event.payload.shortenUrlRecord).toBe(existingRecord)
    expect(event.payload.shortenUrlRecord.state).toBe(ShortenUrlState.Invalidated)
  })

  it('processAck should error when no matching record exists', async () => {
    const { service, repository } = createService()
    ;(repository.findSingleByQuery as jest.Mock).mockResolvedValue(null)

    const ack = new ShortenUrlAckMessage({ status: AckStatus.OK, threadId: 'unknown' })
    await expect(service.processAck(makeCtx(ack))).rejects.toThrow(
      'No shorten-url record found for the provided ack thread id on this connection',
    )
  })
})
