import type { ReceiptsService } from '../services'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { RequestReceiptsMessage } from '../messages'

export class RequestReceiptsHandler implements DidCommMessageHandler {
  public supportedMessages = [RequestReceiptsMessage]
  private receiptsService: ReceiptsService

  public constructor(receiptsService: ReceiptsService) {
    this.receiptsService = receiptsService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<RequestReceiptsHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.receiptsService.processRequestReceipts(inboundMessage)
    return
  }
}
