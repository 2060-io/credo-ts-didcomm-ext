import { AgentContext, injectable } from '@credo-ts/core'
import { DidCommConnectionService, DidCommMessageSender, DidCommOutboundMessageContext } from '@credo-ts/didcomm'

import { DidCommCallsService } from './DidCommCallsService'
import { DidCommCallType } from './messages/CallOfferMessage'

@injectable()
export class DidCommCallsApi {
  public constructor(
    private readonly messageSender: DidCommMessageSender,
    private readonly didcommCallsService: DidCommCallsService,
    private readonly connectionService: DidCommConnectionService,
    private readonly agentContext: AgentContext,
  ) {}

  public async offer(options: {
    connectionId: string
    callType: DidCommCallType
    offerExpirationTime?: Date
    offerStartTime?: Date
    description?: string
    parameters: Record<string, unknown>
  }) {
    const { connectionId, callType, offerExpirationTime, offerStartTime, description, parameters } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommCallsService.createOffer({
      callType,
      offerExpirationTime,
      offerStartTime,
      description,
      parameters,
    })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async accept(options: { connectionId: string; threadId?: string; parameters: Record<string, unknown> }) {
    const { connectionId, threadId, parameters } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommCallsService.createAccept({ threadId, parameters })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async reject(options: { connectionId: string; threadId?: string }) {
    const { connectionId, threadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommCallsService.createReject({ threadId })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async hangup(options: { connectionId: string; threadId?: string }) {
    const { connectionId, threadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommCallsService.createEnd({ threadId })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }
}
