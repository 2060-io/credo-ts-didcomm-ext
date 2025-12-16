import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { MrzDataRequestMessage } from '../messages'

/**
 * Handler for incoming mrz-data-request messages
 */
export class MrzDataRequestHandler implements DidCommMessageHandler {
  public supportedMessages = [MrzDataRequestMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<MrzDataRequestHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.mrtdService.processMrzDataRequest(inboundMessage)
    return
  }
}
