import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { MrzRequestMessage } from '../messages'

/**
 * Handler for incoming mrz-request messages
 */
export class MrzRequestHandler implements MessageHandler {
  public supportedMessages = [MrzRequestMessage]

  public async handle(inboundMessage: MessageHandlerInboundMessage<MrzRequestHandler>) {
    inboundMessage.assertReadyConnection()
  }
}
