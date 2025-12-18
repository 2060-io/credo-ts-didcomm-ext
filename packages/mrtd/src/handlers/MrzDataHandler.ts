import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { MrzDataMessage } from '../messages'

/**
 * Handler for incoming mrz messages
 */
export class MrzDataHandler implements DidCommMessageHandler {
  public supportedMessages = [MrzDataMessage]

  private mrtdService: DidCommMrtdService

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<MrzDataHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.mrtdService.processMrzData(inboundMessage)
    return
  }
}
