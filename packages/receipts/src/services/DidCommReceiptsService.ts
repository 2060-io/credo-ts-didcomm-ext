import type { MessageReceiptsReceivedEvent, RequestReceiptsReceivedEvent } from './ReceiptsEvents'
import type { DidCommInboundMessageContext } from '@credo-ts/didcomm'

import { EventEmitter } from '@credo-ts/core'
import { Lifecycle, scoped } from 'tsyringe'

import {
  DidCommMessageReceiptsMessage,
  type DidCommMessageReceiptsMessageOptions,
  DidCommRequestReceiptsMessage,
  type DidCommRequestReceiptsMessageOptions,
} from '../messages'

import { ReceiptsEventTypes } from './ReceiptsEvents'

@scoped(Lifecycle.ContainerScoped)
export class DidCommReceiptsService {
  private eventEmitter: EventEmitter

  public constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter
  }

  public async createReceiptsMessage(options: DidCommMessageReceiptsMessageOptions) {
    const message = new DidCommMessageReceiptsMessage(options)

    return message
  }

  public async processReceipts(messageContext: DidCommInboundMessageContext<DidCommMessageReceiptsMessage>) {
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

  public async createRequestReceiptsMessage(options: DidCommRequestReceiptsMessageOptions) {
    const message = new DidCommRequestReceiptsMessage(options)

    return message
  }

  public async processRequestReceipts(messageContext: DidCommInboundMessageContext<DidCommRequestReceiptsMessage>) {
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
