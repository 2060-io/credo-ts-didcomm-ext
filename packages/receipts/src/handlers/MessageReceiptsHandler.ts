import type { ReceiptsService } from '../services'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { MessageReceiptsMessage } from '../messages'

export class MessageReceiptsHandler implements DidCommMessageHandler {
  public supportedMessages = [MessageReceiptsMessage]
  private receiptsService: ReceiptsService

  public constructor(receiptsService: ReceiptsService) {
    this.receiptsService = receiptsService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<MessageReceiptsHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.receiptsService.processReceipts(inboundMessage)
    return undefined
  }
}
