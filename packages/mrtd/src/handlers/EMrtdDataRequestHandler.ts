import type { DidCommMrtdService } from '../DidCommMrtdService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { EMrtdDataRequestMessage } from '../messages'

/**
 * Handler for incoming emrtd-data-request messages
 */
export class EMrtdDataRequestHandler implements MessageHandler {
  public supportedMessages = [EMrtdDataRequestMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(inboundMessage: MessageHandlerInboundMessage<EMrtdDataRequestHandler>) {
    await this.mrtdService.processEMrtdDataRequest(inboundMessage)
  }
}
