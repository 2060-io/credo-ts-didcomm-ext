import type { UserProfileService } from '../services'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { OutboundMessageContext } from '@credo-ts/core'

import { RequestProfileMessage } from '../messages'

export class RequestProfileHandler implements MessageHandler {
  public supportedMessages = [RequestProfileMessage]
  private userProfileService: UserProfileService

  public constructor(userProfileService: UserProfileService) {
    this.userProfileService = userProfileService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<RequestProfileHandler>) {
    const connection = inboundMessage.assertReadyConnection()

    const payload = await this.userProfileService.processRequestProfile(inboundMessage)

    if (payload) {
      return new OutboundMessageContext(payload, { agentContext: inboundMessage.agentContext, connection })
    }
  }
}
