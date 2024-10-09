import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'

interface EMrtdDataMessageOptions {
  id?: string
  threadId?: string
  dataGroups: Record<string, string>
}

export class EMrtdDataMessage extends AgentMessage {
  public constructor(options: EMrtdDataMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.dataGroups = options.dataGroups
      this.setThread({ threadId: options.threadId })
    }
  }

  public dataGroups!: Record<string, string>

  @IsValidMessageType(EMrtdDataMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/mrtd/1.0/emrtd-data')
  public readonly type = EMrtdDataMessage.type.messageTypeUri
}
