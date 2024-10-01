import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'

interface MrzMessageOptions {
  id?: string
  threadId?: string
  mrzData: string | string[]
}

export class MrzDataMessage extends AgentMessage {
  public constructor(options: MrzMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.mrzData = options.mrzData
      this.setThread({ threadId: options.threadId })
    }
  }

  public mrzData!: string | string[]

  @IsValidMessageType(MrzDataMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/mrtd/1.0/mrz-data')
  public readonly type = MrzDataMessage.type.messageTypeUri
}
