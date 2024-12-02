import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'

interface EMrtdDataRequestOptions {
  id?: string
  parentThreadId?: string
}

export class EMrtdDataRequestMessage extends AgentMessage {
  public constructor(options: EMrtdDataRequestOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      if (options.parentThreadId) {
        this.setThread({ parentThreadId: options.parentThreadId })
      }
    }
  }

  @IsValidMessageType(EMrtdDataRequestMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/mrtd/1.0/emrtd-data-request')
  public readonly type = EMrtdDataRequestMessage.type.messageTypeUri
}
