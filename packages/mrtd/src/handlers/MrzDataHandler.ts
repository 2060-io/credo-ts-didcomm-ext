import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { MrzDataMessage } from '../messages'

/**
 * Handler for incoming mrz messages
 */
export class MrzDataHandler implements MessageHandler {
  public supportedMessages = [MrzDataMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<MrzDataHandler>) {
    await this.mrtdService.processMrzData(inboundMessage)
  }
}
