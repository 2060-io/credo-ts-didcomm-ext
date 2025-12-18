import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

interface MrzMessageOptions {
  id?: string
  threadId?: string
  mrzData: string | string[]
}

export class MrzDataMessage extends DidCommMessage {
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/mrtd/1.0/mrz-data')

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
  public readonly type = MrzDataMessage.type.messageTypeUri
}
