import type { DidCommUserProfileService } from '../services'

import {
  type DidCommMessageHandler,
  type DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { DidCommProfileMessage } from '../messages'

export class DidCommProfileHandler implements DidCommMessageHandler {
  public supportedMessages = [DidCommProfileMessage]
  private userProfileService: DidCommUserProfileService

  public constructor(userProfileService: DidCommUserProfileService) {
    this.userProfileService = userProfileService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<DidCommProfileHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    const connection = inboundMessage.assertReadyConnection()

    const payload = await this.userProfileService.processProfile(inboundMessage)

    if (payload) {
      return new DidCommOutboundMessageContext(payload, { agentContext: inboundMessage.agentContext, connection })
    }
  }
}
