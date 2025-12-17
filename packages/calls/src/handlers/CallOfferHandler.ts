import type { DidCommCallsService } from '../DidCommCallsService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { CallOfferMessage } from '../messages/CallOfferMessage'

/**
 * Handler for incoming call offer messages
 */
export class CallOfferHandler implements DidCommMessageHandler {
  public supportedMessages = [CallOfferMessage]
  /**
  /* We don't really need to do anything with this at the moment
  /* The result can be hooked into through the generic message processed event
   */
  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<CallOfferHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()
    return
  }
}
