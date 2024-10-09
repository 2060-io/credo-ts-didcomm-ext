import type { DidCommMrtdService } from '../DidCommMrtdService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { EMrtdDataMessage } from '../messages'

/**
 * Handler for incoming mrtd-data messages
 */
export class EMrtdDataHandler implements MessageHandler {
  public supportedMessages = [EMrtdDataMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<EMrtdDataHandler>) {
    await this.mrtdService.processEMrtdData(inboundMessage)
  }
}
