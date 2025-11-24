import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { ShortenUrlAckMessage } from '../messages'

export class AckShortenUrlHandler implements MessageHandler {
  public supportedMessages = [ShortenUrlAckMessage]

  public constructor(private readonly service: DidCommShortenUrlService) {}

  public async handle(inbound: MessageHandlerInboundMessage<AckShortenUrlHandler>) {
    return this.service.processAck(inbound)
  }
}
