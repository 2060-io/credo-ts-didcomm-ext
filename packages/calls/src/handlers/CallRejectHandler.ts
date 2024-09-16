import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { CallRejectMessage } from '../messages/CallRejectMessage'

/**
 * Handler for incoming call offer messages
 */
export class CallRejectHandler implements MessageHandler {
  public supportedMessages = [CallRejectMessage]

  /**
  /* We don't really need to do anything with this at the moment
  /* The result can be hooked into through the generic message processed event
   */
  public async handle(inboundMessage: MessageHandlerInboundMessage<CallRejectHandler>) {
    inboundMessage.assertReadyConnection()
  }
}
