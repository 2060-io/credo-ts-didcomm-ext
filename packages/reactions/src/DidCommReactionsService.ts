import type { DidCommMessageReactionsReceivedEvent } from './DidcommReactionsEvents'
import type { MessageReactionsMessageOptions } from './messages'
import type { DidCommInboundMessageContext } from '@credo-ts/didcomm'

import { EventEmitter, injectable } from '@credo-ts/core'

import { DidCommReactionsEventTypes } from './DidcommReactionsEvents'
import { MessageReactionsMessage } from './messages'

@injectable()
export class DidCommReactionsService {
  private eventEmitter: EventEmitter

  public constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
  }

  public async createReactionsMessage(options: MessageReactionsMessageOptions) {
    const message = new MessageReactionsMessage(options)

    return message
  }

  public async processReactions(messageContext: DidCommInboundMessageContext<MessageReactionsMessage>) {
    const { message } = messageContext
    const connection = messageContext.assertReadyConnection()

    this.eventEmitter.emit<DidCommMessageReactionsReceivedEvent>(messageContext.agentContext, {
      type: DidCommReactionsEventTypes.DidCommMessageReactionsReceived,
      payload: {
        connectionId: connection.id,
        reactions: message.reactions,
      },
    })
  }
}
