import { AgentContext, CredoError, injectable } from '@credo-ts/core'
import { DidCommConnectionService, DidCommMessageSender, DidCommOutboundMessageContext } from '@credo-ts/didcomm'

import { DidCommReactionsService } from './DidCommReactionsService'
import { DidCommMessageReaction, type DidCommMessageReactionOptions } from './messages/DidCommMessageReactionsMessage'

@injectable()
export class DidCommReactionsApi {
  private messageSender: DidCommMessageSender
  private reactionsService: DidCommReactionsService
  private connectionService: DidCommConnectionService
  private agentContext: AgentContext

  public constructor(
    messageSender: DidCommMessageSender,
    reactionsService: DidCommReactionsService,
    connectionService: DidCommConnectionService,
    agentContext: AgentContext,
  ) {
    this.messageSender = messageSender
    this.reactionsService = reactionsService
    this.connectionService = connectionService
    this.agentContext = agentContext
  }

  public async send(options: { connectionId: string; reactions: DidCommMessageReactionOptions[] }) {
    const connection = await this.connectionService.findById(this.agentContext, options.connectionId)

    if (!connection) {
      throw new CredoError(`Connection not found with id ${options.connectionId}`)
    }

    const message = await this.reactionsService.createReactionsMessage({
      reactions: options.reactions.map((item) => new DidCommMessageReaction(item)),
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(message, { agentContext: this.agentContext, connection }),
    )
  }
}
