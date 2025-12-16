import type { UserProfileService } from '../services'

import {
  type DidCommMessageHandler,
  type DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { RequestProfileMessage } from '../messages'

export class RequestProfileHandler implements DidCommMessageHandler {
  public supportedMessages = [RequestProfileMessage]
  private userProfileService: UserProfileService

  public constructor(userProfileService: UserProfileService) {
    this.userProfileService = userProfileService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<RequestProfileHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    const connection = inboundMessage.assertReadyConnection()

    const payload = await this.userProfileService.processRequestProfile(inboundMessage)

    if (payload) {
      return new DidCommOutboundMessageContext(payload, { agentContext: inboundMessage.agentContext, connection })
    }
  }
}
