import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsInt, IsOptional, IsString } from 'class-validator'

export interface ShortenedUrlMessageOptions {
  id?: string
  threadId: string
  shortenedUrl: string
  expiresTime?: number
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
  @IsInt()
  @Expose({ name: 'expires_time' })
  public expiresTime?: number

  @IsValidMessageType(ShortenedUrlMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/shorten-url/1.0/shortened-url')
  public readonly type = ShortenedUrlMessage.type.messageTypeUri
}
