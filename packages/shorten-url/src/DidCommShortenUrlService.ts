import { CredoError, EventEmitter, InboundMessageContext, injectable } from '@credo-ts/core'

import {
  DidCommInvalidateShortenedUrlReceivedEvent,
  DidCommRequestShortenedUrlReceivedEvent,
  DidCommShortenUrlEventTypes,
  DidCommShortenedUrlReceivedEvent,
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

  public createInvalidate(options: { shortenedUrl: string }) {
    return new InvalidateShortenedUrlMessage(options)
  }

  // Process inbound messages and emit events
  public async processRequest(inboundMessageContext: InboundMessageContext<RequestShortenedUrlMessage>) {
    const connection = inboundMessageContext.assertReadyConnection()
    const requestedValiditySeconds = inboundMessageContext.message.requestedValiditySeconds
    if (!Number.isInteger(requestedValiditySeconds) || requestedValiditySeconds < 0) {
      throw new CredoError('request-shortened-url MUST include a non-negative integer requested_validity_seconds')
    }
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
    this.eventEmitter.emit<DidCommInvalidateShortenedUrlReceivedEvent>(inboundMessageContext.agentContext, {
      type: DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived,
      payload: {
        connectionId: connection.id,
        shortenedUrl: inboundMessageContext.message.shortenedUrl,
      },
    })
  }
}
