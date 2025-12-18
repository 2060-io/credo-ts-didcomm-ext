import { DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose } from 'class-transformer'
import { IsString } from 'class-validator'

export interface InvalidateShortenedUrlMessageOptions {
  id?: string
  shortenedUrl: string
}

export class InvalidateShortenedUrlMessage extends DidCommMessage {
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
  public static readonly type: ReturnType<typeof parseMessageType> = parseMessageType(
    'https://didcomm.org/shorten-url/1.0/invalidate-shortened-url',
  )

  @IsValidMessageType(InvalidateShortenedUrlMessage.type)
  public readonly type = InvalidateShortenedUrlMessage.type.messageTypeUri
}
