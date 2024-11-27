import { ProblemReportMessageOptions, ProblemReportMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'

export type MrtdProblemReportMessageOptions = ProblemReportMessageOptions

/**
 * @see TODO
 */
export class MrtdProblemReportMessage extends ProblemReportMessage {
  /**
   * Create new MrtdProblemReportMessage instance.
   * @param options
   */
  public constructor(options: MrtdProblemReportMessageOptions) {
    super(options)
  }

  @IsValidMessageType(MrtdProblemReportMessage.type)
  public readonly type = MrtdProblemReportMessage.type.messageTypeUri
  public static readonly type = parseMessageType('https://didcomm.org/mrtd/1.0/problem-report')
}
