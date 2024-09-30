import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { MrzDataMessage } from '../messages'

/**
 * Handler for incoming mrz messages
 */
export class MrzDataHandler implements MessageHandler {
  public supportedMessages = [MrzDataMessage]

  public async handle(inboundMessage: MessageHandlerInboundMessage<MrzDataHandler>) {
    inboundMessage.assertReadyConnection()
  }
}
