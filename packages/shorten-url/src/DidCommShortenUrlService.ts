import { AckStatus, CredoError, EventEmitter, InboundMessageContext, injectable } from '@credo-ts/core'

import {
  DidCommInvalidateShortenedUrlReceivedEvent,
  DidCommRequestShortenedUrlReceivedEvent,
  DidCommShortenUrlEventTypes,
  DidCommShortenedUrlReceivedEvent,
  DidCommShortenedUrlInvalidatedEvent,
} from './DidCommShortenUrlEvents'
import { DidCommShortenUrlModuleConfig } from './DidCommShortenUrlModuleConfig'
import {
  InvalidateShortenedUrlMessage,
  RequestShortenedUrlMessage,
  ShortenedUrlMessage,
  ShortenUrlAckMessage,
} from './messages'
import { ShortenUrlRole, ShortenUrlState } from './models'
import { DidCommShortenUrlRecord, DidCommShortenUrlRepository } from './repository'

@injectable()
export class DidCommShortenUrlService {
  public constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly repository: DidCommShortenUrlRepository,
  ) {}

  // Create messages to send
  public createRequest(options: {
    url: string
    goalCode: string
    requestedValiditySeconds: number
    shortUrlSlug?: string
  }) {
    if (!Number.isInteger(options.requestedValiditySeconds) || options.requestedValiditySeconds < 0) {
      throw new CredoError('requested_validity_seconds MUST be a non-negative integer')
    }
    return new RequestShortenedUrlMessage(options)
  }

  public createShortenedUrl(options: { id: string; shortenedUrl: string; expiresTime?: Date }) {
    return new ShortenedUrlMessage({
      id: options.id,
      shortenedUrl: options.shortenedUrl,
      expiresTime: options.expiresTime,
    })
  }

  public createInvalidate(options: { shortenedUrl: string }) {
    return new InvalidateShortenedUrlMessage(options)
  }

  // Process inbound messages and emit events
  public async processRequest(inboundMessageContext: InboundMessageContext<RequestShortenedUrlMessage>) {
    const connection = inboundMessageContext.assertReadyConnection()
    const requestedValiditySeconds = inboundMessageContext.message.requestedValiditySeconds
    const threadId = inboundMessageContext.message.id
    if (!Number.isInteger(requestedValiditySeconds) || requestedValiditySeconds < 0) {
      throw new CredoError('request-shortened-url MUST include a non-negative integer requested_validity_seconds')
    }

    const config = inboundMessageContext.agentContext.dependencyManager.resolve(DidCommShortenUrlModuleConfig)
    const maximumRequestedValiditySeconds = config.maximumRequestedValiditySeconds
    if (maximumRequestedValiditySeconds !== undefined && requestedValiditySeconds > maximumRequestedValiditySeconds) {
      throw new CredoError(
        `validity_too_long: requested_validity_seconds (${requestedValiditySeconds}) exceeds maximum of ${maximumRequestedValiditySeconds}`,
      )
    }

    const existingRecord = await this.repository.findSingleByQuery(inboundMessageContext.agentContext, {
      connectionId: connection.id,
      role: ShortenUrlRole.UrlShortener,
      url: inboundMessageContext.message.url,
    })

    if (existingRecord) {
      throw new CredoError(`shortened-url request already handled for thread ${threadId}`)
    }

    const record = new DidCommShortenUrlRecord({
      id: inboundMessageContext.message.id,
      connectionId: connection.id,
      threadId,
      role: ShortenUrlRole.UrlShortener,
      state: ShortenUrlState.RequestReceived,
      url: inboundMessageContext.message.url,
      goalCode: inboundMessageContext.message.goalCode,
      requestedValiditySeconds,
      shortUrlSlug: inboundMessageContext.message.shortUrlSlug,
    })
    await this.repository.save(inboundMessageContext.agentContext, record)

    this.eventEmitter.emit<DidCommRequestShortenedUrlReceivedEvent>(inboundMessageContext.agentContext, {
      type: DidCommShortenUrlEventTypes.DidCommRequestShortenedUrlReceived,
      payload: {
        connectionId: connection.id,
        threadId: inboundMessageContext.message.thread?.threadId,
        url: inboundMessageContext.message.url,
        goalCode: inboundMessageContext.message.goalCode,
        requestedValiditySeconds,
        shortUrlSlug: inboundMessageContext.message.shortUrlSlug,
        shortenUrlRecord: record,
      },
    })
  }

  public async processShortenedUrl(inboundMessageContext: InboundMessageContext<ShortenedUrlMessage>) {
    const connection = inboundMessageContext.assertReadyConnection()
    const threadId = inboundMessageContext.message.thread?.threadId
    if (!threadId) {
      throw new CredoError('shortened-url message MUST include the thread id of the related request')
    }

    const record = await this.repository.getSingleByQuery(inboundMessageContext.agentContext, {
      connectionId: connection.id,
      threadId,
      role: ShortenUrlRole.LongUrlProvider,
    })

    const messageExpiresTime = inboundMessageContext.message.expiresTime
    let expiresAt: Date | undefined
    if (messageExpiresTime !== undefined) {
      if (!(messageExpiresTime instanceof Date) || Number.isNaN(messageExpiresTime.getTime())) {
        throw new CredoError('shortened-url message includes an invalid expires_time')
      }
      expiresAt = messageExpiresTime
    }

    record.state = ShortenUrlState.ShortenedReceived
    record.shortenedUrl = inboundMessageContext.message.shortenedUrl
    record.expiresTime = expiresAt
    await this.repository.update(inboundMessageContext.agentContext, record)

    this.eventEmitter.emit<DidCommShortenedUrlReceivedEvent>(inboundMessageContext.agentContext, {
      type: DidCommShortenUrlEventTypes.DidCommShortenedUrlReceived,
      payload: {
        connectionId: connection.id,
        threadId,
        shortenedUrl: inboundMessageContext.message.shortenedUrl,
        expiresTime: expiresAt,
        shortenUrlRecord: record,
      },
    })
  }

  public async processInvalidate(inboundMessageContext: InboundMessageContext<InvalidateShortenedUrlMessage>) {
    const connection = inboundMessageContext.assertReadyConnection()

    const record = await this.repository.findSingleByQuery(inboundMessageContext.agentContext, {
      connectionId: connection.id,
      shortenedUrl: inboundMessageContext.message.shortenedUrl,
      role: ShortenUrlRole.UrlShortener,
    })

    if (!record) {
      throw new CredoError('No shorten-url record found for the provided shortened_url on this connection')
    }

    record.state = ShortenUrlState.InvalidationReceived
    await this.repository.update(inboundMessageContext.agentContext, record)

    this.eventEmitter.emit<DidCommInvalidateShortenedUrlReceivedEvent>(inboundMessageContext.agentContext, {
      type: DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived,
      payload: {
        connectionId: connection.id,
        shortenedUrl: inboundMessageContext.message.shortenedUrl,
        shortenUrlRecord: record,
      },
    })
  }

  public async processAck(inboundMessageContext: InboundMessageContext<ShortenUrlAckMessage>) {
    const connection = inboundMessageContext.assertReadyConnection()
    const threadId = inboundMessageContext.message.threadId

    if (!threadId) {
      throw new CredoError('shorten-url ack MUST include the thread id of the related invalidation message')
    }

    if (inboundMessageContext.message.status !== AckStatus.OK) {
      throw new CredoError(`Unexpected ack status ${inboundMessageContext.message.status} for shorten-url invalidation`)
    }

    const record = await this.repository.findSingleByQuery(inboundMessageContext.agentContext, {
      connectionId: connection.id,
      role: ShortenUrlRole.LongUrlProvider,
      invalidationMessageId: threadId,
    })

    if (!record) {
      throw new CredoError('No shorten-url record found for the provided ack thread id on this connection')
    }

    if (!record.shortenedUrl) {
      throw new CredoError('Cannot mark shortened-url record as invalidated because it does not contain a shortened URL')
    }

    if (record.state === ShortenUrlState.Invalidated) return

    if (record.state !== ShortenUrlState.InvalidationSent) {
      throw new CredoError(`Received shorten-url ack in unexpected state ${record.state}`)
    }

    record.state = ShortenUrlState.Invalidated
    await this.repository.update(inboundMessageContext.agentContext, record)

    this.eventEmitter.emit<DidCommShortenedUrlInvalidatedEvent>(inboundMessageContext.agentContext, {
      type: DidCommShortenUrlEventTypes.DidCommShortenedUrlInvalidated,
      payload: {
        connectionId: connection.id,
        shortenedUrl: record.shortenedUrl,
        invalidationMessageId: threadId,
        threadId: record.threadId,
        shortenUrlRecord: record,
      },
    })
  }
}
