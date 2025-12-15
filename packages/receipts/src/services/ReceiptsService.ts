import { EventEmitter } from '@credo-ts/core'
import type { DidCommInboundMessageContext } from '@credo-ts/didcomm'
import { Lifecycle, scoped } from 'tsyringe'

import { MessageReceiptsHandler, RequestReceiptsHandler } from '../handlers'
import {
  MessageReceiptsMessage,
  type MessageReceiptsMessageOptions,
  RequestReceiptsMessage,
  type RequestReceiptsMessageOptions,
} from '../messages'

import type { MessageReceiptsReceivedEvent, RequestReceiptsReceivedEvent } from './ReceiptsEvents'
import { ReceiptsEventTypes } from './ReceiptsEvents'

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

  public async processReceipts(messageContext: DidCommInboundMessageContext<MessageReceiptsMessage>) {
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

  public async processRequestReceipts(messageContext: DidCommInboundMessageContext<RequestReceiptsMessage>) {
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
