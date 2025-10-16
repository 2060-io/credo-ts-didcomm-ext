import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { ShortenedUrlMessage } from '../messages'

export class ShortenedUrlHandler implements MessageHandler {
  public supportedMessages = [ShortenedUrlMessage]
  public constructor(private readonly service: DidCommShortenUrlService) {}
  public async handle(inbound: MessageHandlerInboundMessage<ShortenedUrlHandler>) {
    return this.service.processShortenedUrl(inbound)
  }
}
