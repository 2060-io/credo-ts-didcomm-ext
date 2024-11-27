import type { DidCommMrtdService } from '../DidCommMrtdService'
import type { MessageHandler, MessageHandlerInboundMessage } from '@credo-ts/core'

import { MrtdProblemReportMessage } from '../messages'

export class MrtdProblemReportHandler implements MessageHandler {
  private mrtdService: DidCommMrtdService

  public supportedMessages = [MrtdProblemReportMessage]

  public constructor(mrtdService: DidCommMrtdService) {
    this.mrtdService = mrtdService
  }

  public async handle(messageContext: MessageHandlerInboundMessage<MrtdProblemReportHandler>) {
    await this.mrtdService.processProblemReport(messageContext)
  }
}
