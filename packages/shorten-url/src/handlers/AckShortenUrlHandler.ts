import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { ShortenUrlAckMessage } from '../messages'

export class AckShortenUrlHandler implements DidCommMessageHandler {
  public supportedMessages = [ShortenUrlAckMessage]

  public constructor(private readonly service: DidCommShortenUrlService) {}

  public async handle(
    inbound: DidCommMessageHandlerInboundMessage<AckShortenUrlHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.service.processAck(inbound)
    return undefined
  }
}
