import type { DidCommReactionsService } from '../DidCommReactionsService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { MessageReactionsMessage } from '../messages/DidCommMessageReactionsMessage'

export class DidCommMessageReactionsHandler implements DidCommMessageHandler {
  public supportedMessages = [MessageReactionsMessage]

  private reactionsService: DidCommReactionsService

  public constructor(didcommReactionsService: DidCommReactionsService) {
    this.reactionsService = didcommReactionsService
  }
  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<DidCommMessageReactionsHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.reactionsService.processReactions(inboundMessage)
    return
  }
}
