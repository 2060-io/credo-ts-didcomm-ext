import type { MediaSharingService } from '../services'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { RequestMediaMessage } from '../messages'

export class RequestMediaHandler implements MessageHandler {
  public supportedMessages = [RequestMediaMessage]
  private mediaSharingService: MediaSharingService

  public constructor(mediaSharingService: MediaSharingService) {
    this.mediaSharingService = mediaSharingService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<RequestMediaHandler>) {
    inboundMessage.assertReadyConnection()

    // Nothing to do internally. Will be handled by the controller
  }
}
