import type { DidCommMrtdService } from '../services/DidCommMrtdService'
import type {
  DidCommMessageHandler,
  DidCommMessageHandlerInboundMessage,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { MrtdProblemReportMessage } from '../messages'

export class MrtdProblemReportHandler implements DidCommMessageHandler {
  private mrtdService: DidCommMrtdService

  public supportedMessages = [MrtdProblemReportMessage]

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(
    messageContext: DidCommMessageHandlerInboundMessage<MrtdProblemReportHandler>,
  ): Promise<DidCommOutboundMessageContext | undefined> {
    await this.mrtdService.processProblemReport(messageContext)
    return
  }
}
