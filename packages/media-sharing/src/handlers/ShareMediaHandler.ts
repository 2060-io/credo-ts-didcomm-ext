import type { MediaSharingService } from '../services'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { ShareMediaMessage } from '../messages/ShareMediaMessage'

export class ShareMediaHandler implements DidCommMessageHandler {
  public supportedMessages = [ShareMediaMessage]
  private mediaSharingService: MediaSharingService

  public constructor(mediaSharingService: MediaSharingService) {
    this.mediaSharingService = mediaSharingService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<ShareMediaHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()

    await this.mediaSharingService.processShareMedia(inboundMessage)
    return undefined
  }
}
