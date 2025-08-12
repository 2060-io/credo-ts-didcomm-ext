import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { MrzDataRequestMessage } from '../messages'

/**
 * Handler for incoming mrz-data-request messages
 */
export class MrzDataRequestHandler implements MessageHandler {
  public supportedMessages = [MrzDataRequestMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<MrzDataRequestHandler>) {
    await this.mrtdService.processMrzDataRequest(inboundMessage)
  }
}
