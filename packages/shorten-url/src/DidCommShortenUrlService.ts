import { CredoError, EventEmitter, InboundMessageContext, injectable } from '@credo-ts/core'

import {
  DidCommInvalidateShortenedUrlReceivedEvent,
  DidCommRequestShortenedUrlReceivedEvent,
  DidCommShortenUrlEventTypes,
  DidCommShortenedUrlReceivedEvent,
} from './DidCommShortenUrlEvents'
import { InvalidateShortenedUrlMessage, RequestShortenedUrlMessage, ShortenedUrlMessage } from './messages'
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

  public createShortenedUrl(options: { threadId: string; shortenedUrl: string; expiresTime?: number }) {
    return new ShortenedUrlMessage(options)
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

    const existingRecord = await this.repository.findSingleByQuery(inboundMessageContext.agentContext, {
      connectionId: connection.id,
      threadId,
      role: ShortenUrlRole.UrlShortener,
    })

    if (existingRecord) {
      throw new CredoError(`shortened-url request already handled for thread ${threadId}`)
    }

    const record = new DidCommShortenUrlRecord({
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
      },
    })
  }

  public async processShortenedUrl(inboundMessageContext: InboundMessageContext<ShortenedUrlMessage>) {
    const connection = inboundMessageContext.assertReadyConnection()
    const threadId = inboundMessageContext.message.thread?.threadId
    if (!threadId) {
      throw new CredoError('shortened-url message MUST include the thread id of the related request')
    }

    const existingRecord = await this.repository.findSingleByQuery(inboundMessageContext.agentContext, {
      connectionId: connection.id,
      threadId,
      role: ShortenUrlRole.LongUrlProvider,
    })

    if (existingRecord) {
      existingRecord.state = ShortenUrlState.ShortenedReceived
      existingRecord.shortenedUrl = inboundMessageContext.message.shortenedUrl
      existingRecord.expiresTime = inboundMessageContext.message.expiresTime
      await this.repository.update(inboundMessageContext.agentContext, existingRecord)
    } else {
      const record = new DidCommShortenUrlRecord({
        connectionId: connection.id,
        threadId,
        role: ShortenUrlRole.LongUrlProvider,
        state: ShortenUrlState.ShortenedReceived,
        shortenedUrl: inboundMessageContext.message.shortenedUrl,
        expiresTime: inboundMessageContext.message.expiresTime,
      })
      await this.repository.save(inboundMessageContext.agentContext, record)
    }

    this.eventEmitter.emit<DidCommShortenedUrlReceivedEvent>(inboundMessageContext.agentContext, {
      type: DidCommShortenUrlEventTypes.DidCommShortenedUrlReceived,
      payload: {
        connectionId: connection.id,
        threadId,
        shortenedUrl: inboundMessageContext.message.shortenedUrl,
        expiresTime: inboundMessageContext.message.expiresTime,
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
      },
    })
  }
}
