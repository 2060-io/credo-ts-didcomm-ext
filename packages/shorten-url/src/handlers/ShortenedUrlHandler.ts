import type { DidCommShortenUrlService } from '../DidCommShortenUrlService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { ShortenedUrlMessage } from '../messages'

export class ShortenedUrlHandler implements DidCommMessageHandler {
  public supportedMessages = [ShortenedUrlMessage]
  public constructor(private readonly service: DidCommShortenUrlService) {}
  public async handle(
    inbound: DidCommMessageHandlerInboundMessage<ShortenedUrlHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.service.processShortenedUrl(inbound)
    return undefined
  }
}
