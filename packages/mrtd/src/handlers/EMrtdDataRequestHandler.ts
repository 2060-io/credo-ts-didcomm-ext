import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { EMrtdDataRequestMessage } from '../messages'

/**
 * Handler for incoming emrtd-data-request messages
 */
export class EMrtdDataRequestHandler implements DidCommMessageHandler {
  public supportedMessages = [EMrtdDataRequestMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<EMrtdDataRequestHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.mrtdService.processEMrtdDataRequest(inboundMessage)
    return
  }
}
