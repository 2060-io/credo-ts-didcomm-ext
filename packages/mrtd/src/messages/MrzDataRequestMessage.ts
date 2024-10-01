import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'

interface MrzRequestOptions {
  id?: string
  parentThreadId?: string
}

export class MrzDataRequestMessage extends AgentMessage {
  public constructor(options: MrzRequestOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      if (options.parentThreadId) {
        this.setThread({ parentThreadId: options.parentThreadId })
      }
    }
  }

  @IsValidMessageType(MrzDataRequestMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/mrtd/1.0/mrz-data-request')
  public readonly type = MrzDataRequestMessage.type.messageTypeUri
}
