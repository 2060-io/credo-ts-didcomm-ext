import type { UserProfileService } from '../services'

import {
  type DidCommMessageHandler,
  type DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { ProfileMessage } from '../messages'

export class ProfileHandler implements DidCommMessageHandler {
  public supportedMessages = [ProfileMessage]
  private userProfileService: UserProfileService

  public constructor(userProfileService: UserProfileService) {
    this.userProfileService = userProfileService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<ProfileHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    const connection = inboundMessage.assertReadyConnection()

    const payload = await this.userProfileService.processProfile(inboundMessage)

    if (payload) {
      return new DidCommOutboundMessageContext(payload, { agentContext: inboundMessage.agentContext, connection })
    }
  }
}
