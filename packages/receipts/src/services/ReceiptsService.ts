import { EventEmitter, MessageHandlerInboundMessage } from '@credo-ts/core'
import { Lifecycle, scoped } from 'tsyringe'

import { MessageReceiptsHandler, RequestReceiptsHandler } from '../handlers'
import {
  MessageReceiptsMessage,
  MessageReceiptsMessageOptions,
  RequestReceiptsMessage,
  RequestReceiptsMessageOptions,
} from '../messages'

import { MessageReceiptsReceivedEvent, ReceiptsEventTypes, RequestReceiptsReceivedEvent } from './ReceiptsEvents'

@scoped(Lifecycle.ContainerScoped)
export class ReceiptsService {
  private eventEmitter: EventEmitter

  public constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
  }

  public async createReceiptsMessage(options: MessageReceiptsMessageOptions) {
    const message = new MessageReceiptsMessage(options)

    return message
  }

  public async processReceipts(messageContext: MessageHandlerInboundMessage<MessageReceiptsHandler>) {
    const { message } = messageContext
    const connection = messageContext.assertReadyConnection()

    this.eventEmitter.emit<MessageReceiptsReceivedEvent>(messageContext.agentContext, {
      type: ReceiptsEventTypes.MessageReceiptsReceived,
      payload: {
        connectionId: connection.id,
        receipts: message.receipts,
      },
    })
  }

  public async createRequestReceiptsMessage(options: RequestReceiptsMessageOptions) {
    const message = new RequestReceiptsMessage(options)

    return message
  }

  public async processRequestReceipts(messageContext: MessageHandlerInboundMessage<RequestReceiptsHandler>) {
    const { message } = messageContext
    const connection = messageContext.assertReadyConnection()

    this.eventEmitter.emit<RequestReceiptsReceivedEvent>(messageContext.agentContext, {
      type: ReceiptsEventTypes.RequestReceiptsReceived,
      payload: {
        connectionId: connection.id,
        requestedReceipts: message.requestedReceipts,
      },
    })
  }
}
