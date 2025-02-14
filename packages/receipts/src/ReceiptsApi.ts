import {
  CredoError,
  ConnectionService,
  injectable,
  MessageSender,
  AgentContext,
  OutboundMessageContext,
} from '@credo-ts/core'

import { MessageReceiptsHandler, RequestReceiptsHandler } from './handlers'
import { MessageReceipt, MessageReceiptOptions, RequestedReceipt, RequestedReceiptOptions } from './messages'
import { ReceiptsService } from './services'

@injectable()
export class ReceiptsApi {
  private messageSender: MessageSender
  private receiptsService: ReceiptsService
  private connectionService: ConnectionService
  private agentContext: AgentContext

  public constructor(
    agentContext: AgentContext,
    messageSender: MessageSender,
    receiptsService: ReceiptsService,
    connectionService: ConnectionService,
  ) {
    this.agentContext = agentContext
    this.messageSender = messageSender
    this.receiptsService = receiptsService
    this.connectionService = connectionService
    this.agentContext.dependencyManager.registerMessageHandlers([
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
      new OutboundMessageContext(message, { agentContext: this.agentContext, connection }),
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
      new OutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
  }
}
