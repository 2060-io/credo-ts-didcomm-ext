import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'

import { UserProfileData } from '../model'

export type UserProfileKey = string | keyof UserProfileData

export interface GetProfileMessageOptions {
  id?: string
  threadId?: string
  query?: UserProfileKey[]
}

export class RequestProfileMessage extends AgentMessage {
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

  @IsValidMessageType(RequestProfileMessage.type)
  public readonly type = RequestProfileMessage.type.messageTypeUri
  public static readonly type = parseMessageType('https://didcomm.org/user-profile/1.0/request-profile')

  public query?: UserProfileKey[]
}
