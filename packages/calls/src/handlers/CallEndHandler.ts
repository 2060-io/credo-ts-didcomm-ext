import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { CallEndMessage } from '../messages/CallEndMessage'

/**
 * Handler for incoming call offer messages
 */
export class CallEndHandler implements DidCommMessageHandler {
  public supportedMessages = [CallEndMessage]

  /**
  /* We don't really need to do anything with this at the moment
  /* The result can be hooked into through the generic message processed event
   */
  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<CallEndHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()
    return
  }
}
