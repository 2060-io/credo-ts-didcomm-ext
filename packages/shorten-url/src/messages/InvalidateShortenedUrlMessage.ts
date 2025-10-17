import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

export interface InvalidateShortenedUrlMessageOptions {
  id?: string
  shortenedUrl: string
}

export class InvalidateShortenedUrlMessage extends AgentMessage {
  public constructor(options: InvalidateShortenedUrlMessageOptions) {
    super()
    if (options) {
      this.id = options.id ?? this.generateId()
      this.shortenedUrl = options.shortenedUrl
    }
  }

  @IsString()
  @Expose({ name: 'shortened_url' })
  public shortenedUrl!: string

  @IsValidMessageType(InvalidateShortenedUrlMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/shorten-url/1.0/invalidate-shortened-url')
  public readonly type = InvalidateShortenedUrlMessage.type.messageTypeUri
}
