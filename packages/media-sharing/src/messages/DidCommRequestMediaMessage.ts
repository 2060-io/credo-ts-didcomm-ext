import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

import { toDate } from '../utils/utils'

export interface DidCommRequestMediaMessageOptions {
  id?: string
  threadId?: string
  parentThreadId?: string
  sentTime?: Date
  description?: string
  itemIds: string[]
}

export class DidCommRequestMediaMessage extends DidCommMessage {
  public constructor(options?: DidCommRequestMediaMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()

      if (options.threadId) {
        this.setThread({ threadId: options.threadId })
      }

      if (options.parentThreadId) {
        this.setThread({
          ...this.thread,
          parentThreadId: options.parentThreadId,
        })
      }

      this.sentTime = options.sentTime || new Date()
      this.description = options.description

      this.itemIds = options.itemIds
    }
  }

  @IsOptional()
  @IsString()
  public description?: string

  @Expose({ name: 'sent_time' })
  @Transform(({ value }) => toDate(value))
  @IsDate()
  public sentTime!: Date

  public itemIds!: string[]

  public static readonly type = parseMessageType('https://didcomm.org/media-sharing/1.0/request-media')
  @IsValidMessageType(DidCommRequestMediaMessage.type)
  public readonly type = DidCommRequestMediaMessage.type.messageTypeUri
}
