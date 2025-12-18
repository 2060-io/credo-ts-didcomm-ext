import type { DidCommMessageReceiptOptions, DidCommRequestedReceiptOptions } from './messages'

import { AgentContext, CredoError, injectable } from '@credo-ts/core'
import { DidCommConnectionService, DidCommMessageSender, DidCommOutboundMessageContext } from '@credo-ts/didcomm'

import { DidCommMessageReceipt, DidCommRequestedReceipt } from './messages'
import { DidCommReceiptsService } from './services'

@injectable()
export class DidCommReceiptsApi {
  private messageSender: DidCommMessageSender
  private receiptsService: DidCommReceiptsService
  private connectionService: DidCommConnectionService
  private agentContext: AgentContext

  public constructor(
    agentContext: AgentContext,
    messageSender: DidCommMessageSender,
    receiptsService: DidCommReceiptsService,
    connectionService: DidCommConnectionService,
  ) {
    this.agentContext = agentContext
    this.messageSender = messageSender
    this.receiptsService = receiptsService
    this.connectionService = connectionService
  }

  public async send(options: { connectionId: string; receipts: DidCommMessageReceiptOptions[] }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)

    if (!connection) {
      throw new CredoError(`Connection not found with id ${options.connectionId}`)
    }

    const message = await this.receiptsService.createReceiptsMessage({
      receipts: options.receipts.map((item) => new DidCommMessageReceipt(item)),
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
  }

  public async request(options: { connectionId: string; requestedReceipts: DidCommRequestedReceiptOptions[] }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)

    if (!connection) {
      throw new CredoError(`Connection not found with id ${options.connectionId}`)
    }

    const message = await this.receiptsService.createRequestReceiptsMessage({
      requestedReceipts: options.requestedReceipts.map((item) => new DidCommRequestedReceipt(item)),
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
  }
}
