import type { MessageReceiptOptions, RequestedReceiptOptions } from './messages'

import { AgentContext, CredoError, injectable } from '@credo-ts/core'
import {
  DidCommConnectionService,
  DidCommMessageHandlerRegistry,
  DidCommMessageSender,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { MessageReceiptsHandler, RequestReceiptsHandler } from './handlers'
import { MessageReceipt, RequestedReceipt } from './messages'
import { ReceiptsService } from './services'

@injectable()
export class ReceiptsApi {
  private messageSender: DidCommMessageSender
  private receiptsService: ReceiptsService
  private connectionService: DidCommConnectionService
  private agentContext: AgentContext

  public constructor(
    agentContext: AgentContext,
    messageSender: DidCommMessageSender,
    receiptsService: ReceiptsService,
    connectionService: DidCommConnectionService,
    messageHandlerRegistry: DidCommMessageHandlerRegistry,
  ) {
    this.agentContext = agentContext
    this.messageSender = messageSender
    this.receiptsService = receiptsService
    this.connectionService = connectionService

    messageHandlerRegistry.registerMessageHandlers([
      new MessageReceiptsHandler(this.receiptsService),
      new RequestReceiptsHandler(this.receiptsService),
    ])
  }

  public async send(options: { connectionId: string; receipts: MessageReceiptOptions[] }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)

    if (!connection) {
      throw new CredoError(`Connection not found with id ${options.connectionId}`)
    }

    const message = await this.receiptsService.createReceiptsMessage({
      receipts: options.receipts.map((item) => new MessageReceipt(item)),
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
  }

  public async request(options: { connectionId: string; requestedReceipts: RequestedReceiptOptions[] }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)

    if (!connection) {
      throw new CredoError(`Connection not found with id ${options.connectionId}`)
    }

    const message = await this.receiptsService.createRequestReceiptsMessage({
      requestedReceipts: options.requestedReceipts.map((item) => new RequestedReceipt(item)),
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
  }
}
