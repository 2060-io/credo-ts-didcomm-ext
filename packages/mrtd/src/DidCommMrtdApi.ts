import { OutboundMessageContext, AgentContext, ConnectionService, injectable, MessageSender } from '@credo-ts/core'

import { DidCommMrtdService } from './DidCommMrtdService'
import { MrzDataHandler, MrzDataRequestHandler } from './handlers'

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

    this.agentContext.dependencyManager.registerMessageHandlers([
      new MrzDataHandler(this.didcommMrtdService),
      new MrzDataRequestHandler(this.didcommMrtdService),
    ])
  }

  public async sendMrzString(options: { connectionId: string; mrzData: string | string[]; threadId?: string }) {
    const { connectionId, mrzData, threadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createMrzData({ mrzData, threadId })

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
