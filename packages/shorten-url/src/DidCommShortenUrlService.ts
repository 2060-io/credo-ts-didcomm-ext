import { CredoError, EventEmitter, InboundMessageContext, injectable } from '@credo-ts/core'

import {
  InvalidateShortenedUrlReceivedEvent,
  RequestShortenedUrlReceivedEvent,
  ShortenUrlEventTypes,
  ShortenedUrlReceivedEvent,
} from './DidCommShortenUrlEvents'
import { RequestShortenedUrlMessage, ShortenedUrlMessage, InvalidateShortenedUrlMessage } from './messages'

@injectable()
export class DidCommShortenUrlService {
  public constructor(private readonly eventEmitter: EventEmitter) {}

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

  public createInvalidate(options: { shortenedUrl: string; threadId?: string }) {
    return new InvalidateShortenedUrlMessage(options)
  }

  // Process inbound messages and emit events
  public async processRequest(ctx: InboundMessageContext<RequestShortenedUrlMessage>) {
    const conn = ctx.assertReadyConnection()
    const requestedValiditySeconds = ctx.message.requestedValiditySeconds
    if (!Number.isInteger(requestedValiditySeconds) || requestedValiditySeconds < 0) {
      throw new CredoError('request-shortened-url MUST include a non-negative integer requested_validity_seconds')
    }
    this.eventEmitter.emit<RequestShortenedUrlReceivedEvent>(ctx.agentContext, {
      type: ShortenUrlEventTypes.RequestShortenedUrlReceived,
      payload: {
        connectionId: conn.id,
        threadId: ctx.message.thread?.threadId,
        url: ctx.message.url,
        goalCode: ctx.message.goalCode,
        requestedValiditySeconds,
        shortUrlSlug: ctx.message.shortUrlSlug,
      },
    })
  }

  public async processShortenedUrl(ctx: InboundMessageContext<ShortenedUrlMessage>) {
    const conn = ctx.assertReadyConnection()
    const threadId = ctx.message.thread?.threadId
    if (!threadId) {
      throw new CredoError('shortened-url message MUST include the thread id of the related request')
    }
    this.eventEmitter.emit<ShortenedUrlReceivedEvent>(ctx.agentContext, {
      type: ShortenUrlEventTypes.ShortenedUrlReceived,
      payload: {
        connectionId: conn.id,
        threadId,
        shortenedUrl: ctx.message.shortenedUrl,
        expiresTime: ctx.message.expiresTime,
      },
    })
  }

  public async processInvalidate(ctx: InboundMessageContext<InvalidateShortenedUrlMessage>) {
    const conn = ctx.assertReadyConnection()
    this.eventEmitter.emit<InvalidateShortenedUrlReceivedEvent>(ctx.agentContext, {
      type: ShortenUrlEventTypes.InvalidateShortenedUrlReceived,
      payload: {
        connectionId: conn.id,
        threadId: ctx.message.thread?.threadId,
        shortenedUrl: ctx.message.shortenedUrl,
      },
    })
  }
}
