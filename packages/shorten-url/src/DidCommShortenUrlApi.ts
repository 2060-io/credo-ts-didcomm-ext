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

  /**
   * Sends a RequestShortenedUrlMessage to the specified connection.
   * @param options.connectionId - The ID of the connection to send the message to.
   * @param options.url - The original URL to be shortened.
   * @param options.goalCode - The goal code for the URL shortening request.
   * @param options.requestedValiditySeconds - The requested validity period in seconds for the shortened URL.
   * @param options.shortUrlSlug - (Optional) A custom slug for the shortened URL.
   * @returns An object containing the ID of the sent message.
   */
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

  /**
   * Sends a ShortenedUrlMessage on behalf of the record's connection.
   * @param options.recordId - The ID of the shorten-url record.
   * @param options.shortenedUrl - The shortened URL to include in the message.
   * @param options.expiresTime - (Optional) The expiration time of the shortened URL.
   * @returns An object containing the ID of the sent message.
   */
  public async sendShortenedUrl(options: { recordId: string; shortenedUrl: string; expiresTime?: Date }) {
    const record = await this.shortenUrlRepository.getById(this.agentContext, options.recordId)
    if (!record.connectionId) {
      throw new CredoError(`Shorten-url record ${options.recordId} does not have an associated connection.`)
    }

    const connection = await this.connectionService.findById(this.agentContext, record.connectionId)
    if (!connection) throw new CredoError(`Connection not found with id ${record.connectionId}`)

    let expiresAt: Date | undefined
    if (options.expiresTime) {
      if (!(options.expiresTime instanceof Date) || Number.isNaN(options.expiresTime.getTime())) {
        throw new CredoError('expiresTime must be a valid Date instance')
      }
      expiresAt = options.expiresTime
    }

    if (record.role !== ShortenUrlRole.UrlShortener) {
      throw new CredoError(`Shorten-url record ${options.recordId} is not owned by the url-shortener role`)
    }

    if (record.shortenedUrl) {
      throw new CredoError(
        `Shortened URL already generated for record ${options.recordId} (existing shortened URL: ${record.shortenedUrl}).`,
      )
    }

    if (record.state === ShortenUrlState.InvalidationSent) {
      throw new CredoError(
        `Cannot send shortened URL for record ${options.recordId} because it was already invalidated.`,
      )
    }

    if (record.state !== ShortenUrlState.RequestReceived) {
      throw new CredoError(
        `Shortened URL already generated for record ${options.recordId} (current state: ${record.state}).`,
      )
    }

    if (!expiresAt && record.requestedValiditySeconds && record.requestedValiditySeconds > 0) {
      const createdAt = record.createdAt ?? new Date()
      expiresAt = new Date(createdAt.getTime() + record.requestedValiditySeconds * 1000)
    }

    record.shortenedUrl = options.shortenedUrl
    record.expiresTime = expiresAt
    record.state = ShortenUrlState.ShortenedSent
    await this.shortenUrlRepository.update(this.agentContext, record)

    const message = this.shortenService.createShortenedUrl({
      id: record.id,
      shortenedUrl: options.shortenedUrl,
      expiresTime: expiresAt,
    })

    await this.messageSender.sendMessage(
      new OutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
    return { messageId: message.id }
  }

  /**
   * Invalidates a previously sent shortened URL by sending an InvalidateShortenedUrlMessage.
   * @param options.connectionId - The ID of the connection to send the invalidation message to.
   * @param options.shortenedUrl - The shortened URL to be invalidated.
   * @returns An object containing the ID of the sent invalidation message.
   */
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

  /**
   * Deletes a shorten-url record by its ID for a specific connection.
   * @param options.connectionId - The ID of the connection.
   * @param options.recordId - The ID of the shorten-url record to be deleted.
   * @returns An object containing the ID of the deleted record.
   */
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
