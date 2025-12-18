import type { DidCommReceiptsService } from '../services'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { DidCommMessageReceiptsMessage } from '../messages'

export class DidCommMessageReceiptsHandler implements DidCommMessageHandler {
  public supportedMessages = [DidCommMessageReceiptsMessage]
  private receiptsService: DidCommReceiptsService

  public constructor(receiptsService: DidCommReceiptsService) {
    this.receiptsService = receiptsService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<DidCommMessageReceiptsHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.receiptsService.processReceipts(inboundMessage)
    return undefined
  }
}
