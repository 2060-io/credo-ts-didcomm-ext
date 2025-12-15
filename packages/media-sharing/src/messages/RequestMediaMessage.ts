import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

export interface RequestMediaMessageOptions {
  id?: string
  threadId?: string
  parentThreadId?: string
  sentTime?: Date
  description?: string
  itemIds: string[]
}
// Local helper: credo-ts/didcomm’s DateParser isn’t a public export; importing from build/* breaks bundlers/resolvers.

const toDate = (value: unknown) => {
  // Local helper: credo-ts/didcomm’s DateParser isn’t a public export; importing from build/* breaks bundlers/resolvers.
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed
  }
  return value
}

export class RequestMediaMessage extends DidCommMessage {
  public constructor(options?: RequestMediaMessageOptions) {
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
  @IsValidMessageType(RequestMediaMessage.type)
  public readonly type = RequestMediaMessage.type.messageTypeUri
}
