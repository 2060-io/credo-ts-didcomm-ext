import type { UserProfileData } from '../model'
import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

export type DidCommUserProfileKey = string | keyof UserProfileData

export interface DidCommGetProfileMessageOptions {
  id?: string
  threadId?: string
  query?: DidCommUserProfileKey[]
}

export class DidCommRequestProfileMessage extends DidCommMessage {
  public constructor(options?: DidCommGetProfileMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.query = options.query
      this.setThread({
        threadId: options.threadId,
      })
    }
  }

  public static readonly type: ParsedMessageType = parseMessageType(
    'https://didcomm.org/user-profile/1.0/request-profile',
  )
  @IsValidMessageType(DidCommRequestProfileMessage.type)
  public readonly type: string = DidCommRequestProfileMessage.type.messageTypeUri

  public query?: DidCommUserProfileKey[]
}
