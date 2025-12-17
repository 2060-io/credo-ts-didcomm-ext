import type { DidCommReceiptsService } from '../services'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { DidCommRequestReceiptsMessage } from '../messages'

export class DidCommRequestReceiptsHandler implements DidCommMessageHandler {
  public supportedMessages = [DidCommRequestReceiptsMessage]
  private receiptsService: DidCommReceiptsService

  public constructor(receiptsService: DidCommReceiptsService) {
    this.receiptsService = receiptsService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<DidCommRequestReceiptsHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.receiptsService.processRequestReceipts(inboundMessage)
    return
  }
}
