import type { DidCommReactionsService } from '../DidCommReactionsService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { MessageReactionsMessage } from '../messages/MessageReactionsMessage'

export class MessageReactionsHandler implements MessageHandler {
  public supportedMessages = [MessageReactionsMessage]

  private reactionsService: DidCommReactionsService

  public constructor(didcommReactionsService: DidCommReactionsService) {
    this.reactionsService = didcommReactionsService
  }
  public async handle(inboundMessage: MessageHandlerInboundMessage<MessageReactionsHandler>) {
    return this.reactionsService.processReactions(inboundMessage)
  }
}
