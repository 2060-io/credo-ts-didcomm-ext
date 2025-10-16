import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { getOutboundMessageContext } from '@credo-ts/core'
import { AckMessage, AckStatus } from '@credo-ts/core/build/modules/common/messages/AckMessage'

import { InvalidateShortenedUrlMessage } from '../messages'

export class InvalidateShortenedUrlHandler implements MessageHandler {
  public supportedMessages = [InvalidateShortenedUrlMessage]
  public constructor(private readonly service: DidCommShortenUrlService) {}
  public async handle(inbound: MessageHandlerInboundMessage<InvalidateShortenedUrlHandler>) {
    await this.service.processInvalidate(inbound)

    // Send the explicit Ack required by the protocol once the shortened URL is invalidated
    const connection = inbound.assertReadyConnection()
    const ack = new AckMessage({
      status: AckStatus.OK,
      threadId: inbound.message.id,
    })

    return getOutboundMessageContext(inbound.agentContext, {
      connectionRecord: connection,
      message: ack,
      lastReceivedMessage: inbound.message,
    })
  }
}
