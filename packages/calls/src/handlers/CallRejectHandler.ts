import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { CallRejectMessage } from '../messages/CallRejectMessage'

/**
 * Handler for incoming call offer messages
 */
export class CallRejectHandler implements DidCommMessageHandler {
  public supportedMessages = [CallRejectMessage]

  /**
  /* We don't really need to do anything with this at the moment
  /* The result can be hooked into through the generic message processed event
   */
  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<CallRejectHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()
    return
  }
}
