import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { DidCommRequestMediaMessage } from '../messages'

export class DidCommRequestMediaHandler implements DidCommMessageHandler {
  public supportedMessages = [DidCommRequestMediaMessage]

  public async handle(
    inboundMessage: DidCommMessageHandlerInboundMessage<DidCommRequestMediaHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    inboundMessage.assertReadyConnection()
    return
  }
}
