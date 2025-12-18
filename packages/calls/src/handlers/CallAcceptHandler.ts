import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { CallAcceptMessage } from '../messages/CallAcceptMessage'

/**
 * Handler for incoming call accept messages
 */
export class CallAcceptHandler implements DidCommMessageHandler {
  public supportedMessages = [CallAcceptMessage]

  /**
  /* We don't really need to do anything with this at the moment
  /* The result can be hooked into through the generic message processed event
   */
  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<CallAcceptHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()
    return
  }
}
