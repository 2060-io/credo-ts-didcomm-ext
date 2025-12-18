import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface MrzRequestOptions {
  id?: string
  parentThreadId?: string
}

export class MrzDataRequestMessage extends DidCommMessage {
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/mrtd/1.0/mrz-data-request')

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
  public readonly type = MrzDataRequestMessage.type.messageTypeUri
}
