import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsInt, IsOptional, IsString, Min } from 'class-validator'

export interface RequestShortenedUrlMessageOptions {
  id?: string
  url: string
  goalCode: string
  requestedValiditySeconds: number
  shortUrlSlug?: string
}

export class RequestShortenedUrlMessage extends AgentMessage {
  public constructor(options: RequestShortenedUrlMessageOptions) {
    super()
    if (options) {
      this.id = options.id ?? this.generateId()
      this.url = options.url
      this.goalCode = options.goalCode
      this.requestedValiditySeconds = options.requestedValiditySeconds
      this.shortUrlSlug = options.shortUrlSlug
    }
  }

  @IsString()
  public url!: string

  @IsString()
  @Expose({ name: 'goal_code' })
  public goalCode!: string

  @IsInt()
  @Min(0)
  @Expose({ name: 'requested_validity_seconds' })
  public requestedValiditySeconds!: number

  @IsOptional()
  @IsString()
  @Expose({ name: 'short_url_slug' })
  public shortUrlSlug?: string

  @IsValidMessageType(RequestShortenedUrlMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/shorten-url/1.0/request-shortened-url')
  public readonly type = RequestShortenedUrlMessage.type.messageTypeUri
}
