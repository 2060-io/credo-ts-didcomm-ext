import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose, Transform } from 'class-transformer'
import { IsISO8601, IsOptional, IsString } from 'class-validator'

export interface ShortenedUrlMessageOptions {
  id?: string
  threadId: string
  shortenedUrl: string
  expiresTime?: string
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
  @IsISO8601()
  @Expose({ name: 'expires_time' })
  @Transform(({ value }) => (value instanceof Date ? value.toISOString() : value), { toPlainOnly: true })
  public expiresTime?: string

  @IsValidMessageType(ShortenedUrlMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/shorten-url/1.0/shortened-url')
  public readonly type = ShortenedUrlMessage.type.messageTypeUri
}
