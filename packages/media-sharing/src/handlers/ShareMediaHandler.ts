import type { MediaSharingService } from '../services'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { ShareMediaMessage } from '../messages/ShareMediaMessage'

export class ShareMediaHandler implements MessageHandler {
  public supportedMessages = [ShareMediaMessage]
  private mediaSharingService: MediaSharingService

  public constructor(mediaSharingService: MediaSharingService) {
    this.mediaSharingService = mediaSharingService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<ShareMediaHandler>) {
    inboundMessage.assertReadyConnection()

    await this.mediaSharingService.processShareMedia(inboundMessage)
  }
}
