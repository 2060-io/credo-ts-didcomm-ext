import { OutboundMessageContext, AgentContext, ConnectionService, injectable, MessageSender } from '@credo-ts/core'

import { DidCommMrtdService } from './DidCommMrtdService'

@injectable()
export class DidCommMrtdApi {
  private messageSender: MessageSender
  private didcommMrtdService: DidCommMrtdService
  private connectionService: ConnectionService
  private agentContext: AgentContext

  public constructor(
    messageSender: MessageSender,
    didcommMrtdService: DidCommMrtdService,
    connectionService: ConnectionService,
    agentContext: AgentContext,
  ) {
    this.messageSender = messageSender
    this.didcommMrtdService = didcommMrtdService
    this.connectionService = connectionService
    this.agentContext = agentContext
  }

  public async sendMrzString(options: { connectionId: string; mrz: string; threadId?: string }) {
    const { connectionId, mrz, threadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createMrzData({ mrzData: mrz, threadId })

    const outbound = new OutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async requestMrzString(options: { connectionId: string; parentThreadId?: string }) {
    const { connectionId, parentThreadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createMrzRequest({ parentThreadId })

    const outbound = new OutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }
}
