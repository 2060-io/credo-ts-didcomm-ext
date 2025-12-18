import type { MediaSharingService } from '../services'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { RequestMediaMessage } from '../messages'

export class RequestMediaHandler implements DidCommMessageHandler {
  public supportedMessages = [RequestMediaMessage]
  private mediaSharingService: MediaSharingService

  public constructor(mediaSharingService: MediaSharingService) {
    this.mediaSharingService = mediaSharingService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<RequestMediaHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()
    return
  }
}
