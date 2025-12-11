import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { AckStatus, getOutboundDidCommMessageContext } from '@credo-ts/didcomm'

import { InvalidateShortenedUrlMessage, ShortenUrlAckMessage } from '../messages'

export class InvalidateShortenedUrlHandler implements DidCommMessageHandler {
  public supportedMessages = [InvalidateShortenedUrlMessage]
  public constructor(private readonly service: DidCommShortenUrlService) {}
  public async handle(
    inbound: DidCommMessageHandlerInboundMessage<InvalidateShortenedUrlHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.service.processInvalidate(inbound)

    // Send the explicit Ack required by the protocol once the shortened URL is invalidated
    const connection = inbound.assertReadyConnection()
    const ack = new ShortenUrlAckMessage({
      status: AckStatus.OK,
      threadId: inbound.message.id,
    })

    return getOutboundDidCommMessageContext(inbound.agentContext, {
      connectionRecord: connection,
      message: ack,
      lastReceivedMessage: inbound.message,
    })
  }
}
