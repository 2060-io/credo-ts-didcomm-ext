import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { EMrtdDataMessage } from '../messages'

/**
 * Handler for incoming mrtd-data messages
 */
export class EMrtdDataHandler implements DidCommMessageHandler {
  public supportedMessages = [EMrtdDataMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<EMrtdDataHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.mrtdService.processEMrtdData(inboundMessage)
    return
  }
}
