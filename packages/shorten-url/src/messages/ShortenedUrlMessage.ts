import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform, TransformationType } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

export interface ShortenedUrlMessageOptions {
  id?: string
  threadId: string
  shortenedUrl: string
  expiresTime?: Date
}

export class ShortenedUrlMessage extends DidCommMessage {
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
    const isValidDate = (v: unknown): v is Date => v instanceof Date && !isNaN(v.getTime())

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

  public static readonly type: ReturnType<typeof parseMessageType> = parseMessageType(
    'https://didcomm.org/shorten-url/1.0/shortened-url',
  )
  @IsValidMessageType(ShortenedUrlMessage.type)
  public readonly type = ShortenedUrlMessage.type.messageTypeUri
}
