import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface CallRejectMessageOptions {
  id?: string
  threadId?: string
}

export class CallRejectMessage extends DidCommMessage {
  public constructor(options: CallRejectMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.setThread({ threadId: options.threadId })
    }
  }

  public parameters!: Record<string, unknown>

  public static readonly type = parseMessageType('https://didcomm.org/calls/1.0/call-reject')
  @IsValidMessageType(CallRejectMessage.type)
  public readonly type = CallRejectMessage.type.messageTypeUri
}
