import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { RequestShortenedUrlMessage } from '../messages'

export class RequestShortenedUrlHandler implements MessageHandler {
  public supportedMessages = [RequestShortenedUrlMessage]
  public constructor(private readonly service: DidCommShortenUrlService) {}
  public async handle(inbound: MessageHandlerInboundMessage<RequestShortenedUrlHandler>) {
    return this.service.processRequest(inbound)
  }
}
