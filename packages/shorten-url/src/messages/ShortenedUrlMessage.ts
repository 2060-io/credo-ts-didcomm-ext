import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose, Transform, TransformationType } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

export interface ShortenedUrlMessageOptions {
  id?: string
  threadId: string
  shortenedUrl: string
  expiresTime?: Date
}

export class ShortenedUrlMessage extends AgentMessage {
  public constructor(options: ShortenedUrlMessageOptions) {
    super()
    if (options) {
      this.id = options.id ?? this.generateId()
      this.setThread({ threadId: options.threadId })
      this.shortenedUrl = options.shortenedUrl
      this.expiresTime = options.expiresTime
    }
  }

  @IsString()
  @Expose({ name: 'shortened_url' })
  public shortenedUrl!: string

  @IsOptional()
  @IsDate()
  @Expose({ name: 'expires_time' })
  @Transform(({ value, type }) => {
    if (value == null) return value
    // Helper to check for valid Date
    const isValidDate = (v: any): v is Date => v instanceof Date && !isNaN(v.getTime())

    // Serialize Date to ISO string
    if (type === TransformationType.CLASS_TO_PLAIN) return isValidDate(value) ? value.toISOString() : value
    // Deserialize ISO string to Date
    if (type === TransformationType.PLAIN_TO_CLASS) {
      if (isValidDate(value)) return value
      const d = new Date(value)
      return isNaN(d.getTime()) ? value : d
    }

    return value
  })
  public expiresTime?: Date

  @IsValidMessageType(ShortenedUrlMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/shorten-url/1.0/shortened-url')
  public readonly type = ShortenedUrlMessage.type.messageTypeUri
}
