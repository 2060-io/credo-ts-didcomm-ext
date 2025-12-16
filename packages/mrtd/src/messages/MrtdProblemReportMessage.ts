import type { DidCommProblemReportMessageOptions, ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommProblemReportMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

export type MrtdProblemReportMessageOptions = DidCommProblemReportMessageOptions

/**
 * @see TODO
 */
export class MrtdProblemReportMessage extends DidCommProblemReportMessage {
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/mrtd/1.0/problem-report')

  /**
   * Create new MrtdProblemReportMessage instance.
   * @param options
   */
  public constructor(options: MrtdProblemReportMessageOptions) {
    super(options)
  }

  @IsValidMessageType(MrtdProblemReportMessage.type)
  public readonly type = MrtdProblemReportMessage.type.messageTypeUri
}
