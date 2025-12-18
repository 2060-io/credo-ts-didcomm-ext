import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface EMrtdDataMessageOptions {
  id?: string
  threadId?: string
  dataGroups: Record<string, string>
}

export class EMrtdDataMessage extends DidCommMessage {
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/mrtd/1.0/emrtd-data')

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
  public readonly type = EMrtdDataMessage.type.messageTypeUri
}
