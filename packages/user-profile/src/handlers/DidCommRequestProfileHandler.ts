import type { DidCommUserProfileService } from '../services'

import {
  type DidCommMessageHandler,
  type DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { DidCommRequestProfileMessage } from '../messages'

export class DidCommRequestProfileHandler implements DidCommMessageHandler {
  public supportedMessages = [DidCommRequestProfileMessage]
  private userProfileService: DidCommUserProfileService

  public constructor(userProfileService: DidCommUserProfileService) {
    this.userProfileService = userProfileService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<DidCommRequestProfileHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    const connection = inboundMessage.assertReadyConnection()

    const payload = await this.userProfileService.processRequestProfile(inboundMessage)

    if (payload) {
      return new DidCommOutboundMessageContext(payload, { agentContext: inboundMessage.agentContext, connection })
    }
  }
}
