import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { RequestShortenedUrlMessage } from '../messages'

export class RequestShortenedUrlHandler implements DidCommMessageHandler {
  public supportedMessages = [RequestShortenedUrlMessage]
  public constructor(private readonly service: DidCommShortenUrlService) {}
  public async handle(
    inbound: DidCommMessageHandlerInboundMessage<RequestShortenedUrlHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.service.processRequest(inbound)
    return undefined
  }
}
