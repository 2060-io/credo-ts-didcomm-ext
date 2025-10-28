import {
  OutboundMessageContext,
  AgentContext,
  ConnectionService,
  injectable,
  MessageSender,
  MessageHandlerRegistry,
  CredoError,
} from '@credo-ts/core'

import { DidCommShortenUrlService } from './DidCommShortenUrlService'
import { RequestShortenedUrlHandler, ShortenedUrlHandler, InvalidateShortenedUrlHandler } from './handlers'
import { ShortenUrlRole, ShortenUrlState } from './models'
import { DidCommShortenUrlRecord, DidCommShortenUrlRepository } from './repository'

@injectable()
export class DidCommShortenUrlApi {
  public constructor(
    private readonly messageHandlerRegistry: MessageHandlerRegistry,
    private readonly messageSender: MessageSender,
    private readonly shortenService: DidCommShortenUrlService,
    private readonly shortenUrlRepository: DidCommShortenUrlRepository,
    private readonly connectionService: ConnectionService,
    private readonly agentContext: AgentContext,
  ) {
    this.registerMessageHandlers()
  }

  public async requestShortenedUrl(options: {
    connectionId: string
    url: string
    goalCode: string
    requestedValiditySeconds: number
    shortUrlSlug?: string
  }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)
    if (!connection) throw new CredoError(`Connection not found with id ${options.connectionId}`)
    if (!Number.isInteger(options.requestedValiditySeconds) || options.requestedValiditySeconds < 0) {
      throw new CredoError('requestedValiditySeconds MUST be a non-negative integer')
    }

    const message = this.shortenService.createRequest({
      url: options.url,
      goalCode: options.goalCode,
      requestedValiditySeconds: options.requestedValiditySeconds,
      shortUrlSlug: options.shortUrlSlug,
    })
    // Create and save record
    const record = new DidCommShortenUrlRecord({
      connectionId: connection.id,
      threadId: message.id,
      role: ShortenUrlRole.LongUrlProvider,
      state: ShortenUrlState.RequestSent,
      url: options.url,
      goalCode: options.goalCode,
      requestedValiditySeconds: options.requestedValiditySeconds,
      shortUrlSlug: options.shortUrlSlug,
    })
    await this.shortenUrlRepository.save(this.agentContext, record)

    await this.messageSender.sendMessage(
      new OutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
    return { messageId: message.id }
  }

  public async sendShortenedUrl(options: {
    connectionId: string
    threadId: string
    shortenedUrl: string
    expiresTime?: number
  }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)
    if (!connection) throw new CredoError(`Connection not found with id ${options.connectionId}`)

    const message = this.shortenService.createShortenedUrl({
      threadId: options.threadId,
      shortenedUrl: options.shortenedUrl,
      expiresTime: options.expiresTime,
    })
    // Update or create record
    const record = await this.shortenUrlRepository.findSingleByQuery(this.agentContext, {
      connectionId: connection.id,
      threadId: options.threadId,
      role: ShortenUrlRole.UrlShortener,
    })
    if (record) {
      if (record.shortenedUrl) {
        throw new CredoError(
          `Shortened URL already generated for thread ${options.threadId} (existing shortened URL: ${record.shortenedUrl}).`,
        )
      }

      if (record.state === ShortenUrlState.InvalidationSent) {
        throw new CredoError(
          `Cannot send shortened URL for thread ${options.threadId} because it was already invalidated.`,
        )
      }

      if (record.state !== ShortenUrlState.RequestReceived) {
        throw new CredoError(
          `Shortened URL already generated for thread ${options.threadId} (current state: ${record.state}).`,
        )
      }
      record.shortenedUrl = options.shortenedUrl
      record.expiresTime = options.expiresTime
      record.state = ShortenUrlState.ShortenedSent
      await this.shortenUrlRepository.update(this.agentContext, record)
    } else {
      // Create new record
      const newRecord = new DidCommShortenUrlRecord({
        connectionId: connection.id,
        threadId: options.threadId,
        role: ShortenUrlRole.UrlShortener,
        state: ShortenUrlState.ShortenedSent,
        shortenedUrl: options.shortenedUrl,
        expiresTime: options.expiresTime,
      })
      await this.shortenUrlRepository.save(this.agentContext, newRecord)
    }

    await this.messageSender.sendMessage(
      new OutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
    return { messageId: message.id }
  }

  public async invalidateShortenedUrl(options: { connectionId: string; shortenedUrl: string }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)
    if (!connection) throw new CredoError(`Connection not found with id ${options.connectionId}`)

    const message = this.shortenService.createInvalidate({
      shortenedUrl: options.shortenedUrl,
    })
    // Update record
    const record = await this.shortenUrlRepository.findSingleByQuery(this.agentContext, {
      connectionId: connection.id,
      shortenedUrl: options.shortenedUrl,
      role: ShortenUrlRole.LongUrlProvider,
    })

    if (!record) {
      throw new CredoError('No shorten-url record found for the provided shortened_url on this connection')
    }

    if (record.state === ShortenUrlState.InvalidationSent) {
      throw new CredoError(`Shortened URL ${options.shortenedUrl} has already been invalidated on this connection`)
    }

    record.state = ShortenUrlState.InvalidationSent
    await this.shortenUrlRepository.update(this.agentContext, record)

    await this.messageSender.sendMessage(
      new OutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
    return { messageId: message.id }
  }

  public async deleteById(options: { connectionId: string; recordId: string }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)
    if (!connection) throw new CredoError(`Connection not found with id ${options.connectionId}`)

    const record = await this.shortenUrlRepository.getById(this.agentContext, options.recordId)
    if (record.connectionId !== connection.id) {
      throw new CredoError(
        `Shortened URL record ${options.recordId} does not belong to connection ${options.connectionId}`,
      )
    }

    await this.shortenUrlRepository.delete(this.agentContext, record)
    return { recordId: options.recordId }
  }

  private registerMessageHandlers() {
    this.messageHandlerRegistry.registerMessageHandler(new RequestShortenedUrlHandler(this.shortenService))
    this.messageHandlerRegistry.registerMessageHandler(new ShortenedUrlHandler(this.shortenService))
    this.messageHandlerRegistry.registerMessageHandler(new InvalidateShortenedUrlHandler(this.shortenService))
  }
}
