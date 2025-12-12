import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface CallEndMessageOptions {
  id?: string
  threadId?: string
}

export class CallEndMessage extends DidCommMessage {
  public constructor(options: CallEndMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.setThread({ threadId: options.threadId })
    }
  }

  public parameters!: Record<string, unknown>

  public static readonly type = parseMessageType('https://didcomm.org/calls/1.0/call-end')
  @IsValidMessageType(CallEndMessage.type)
  public readonly type = CallEndMessage.type.messageTypeUri
}
