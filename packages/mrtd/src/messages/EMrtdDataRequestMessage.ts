import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface EMrtdDataRequestOptions {
  id?: string
  parentThreadId?: string
}

export class EMrtdDataRequestMessage extends DidCommMessage {
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/mrtd/1.0/emrtd-data-request')

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
  public readonly type = EMrtdDataRequestMessage.type.messageTypeUri
}
