import type { MessageReactionsReceivedEvent } from './DidcommReactionsEvents'
import type { MessageReactionsMessageOptions } from './messages'
import type { DidCommInboundMessageContext } from '@credo-ts/didcomm'

import { EventEmitter, injectable } from '@credo-ts/core'

import { ReactionsEventTypes } from './DidcommReactionsEvents'
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

    this.eventEmitter.emit<MessageReactionsReceivedEvent>(messageContext.agentContext, {
      type: ReactionsEventTypes.MessageReactionsReceived,
      payload: {
        connectionId: connection.id,
        reactions: message.reactions,
      },
    })
  }
}
