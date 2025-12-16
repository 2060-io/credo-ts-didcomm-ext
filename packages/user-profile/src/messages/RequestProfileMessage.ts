import type { UserProfileData } from '../model'
import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

export type UserProfileKey = string | keyof UserProfileData

export interface GetProfileMessageOptions {
  id?: string
  threadId?: string
  query?: UserProfileKey[]
}

export class RequestProfileMessage extends DidCommMessage {
  public constructor(options?: GetProfileMessageOptions) {
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
  @IsValidMessageType(RequestProfileMessage.type)
  public readonly type: string = RequestProfileMessage.type.messageTypeUri

  public query?: UserProfileKey[]
}
