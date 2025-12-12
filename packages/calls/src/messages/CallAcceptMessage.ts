import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface CallAcceptMessageOptions {
  id?: string
  threadId?: string
  parameters: Record<string, unknown>
}

export class CallAcceptMessage extends DidCommMessage {
  public constructor(options: CallAcceptMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.parameters = options.parameters
      this.setThread({ threadId: options.threadId })
    }
  }

  public parameters!: Record<string, unknown>

  public static readonly type = parseMessageType('https://didcomm.org/calls/1.0/call-accept')
  @IsValidMessageType(CallAcceptMessage.type)
  public readonly type = CallAcceptMessage.type.messageTypeUri
}
