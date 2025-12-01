import { AckMessage, AckStatus, IsValidMessageType, parseMessageType } from '@credo-ts/core'

export class ShortenUrlAckMessage extends AckMessage {
  public constructor(options: { status: AckStatus; threadId: string }) {
    super(options)
    this.type = ShortenUrlAckMessage.type.messageTypeUri
  }

  @IsValidMessageType(ShortenUrlAckMessage.type)
  public readonly type: string

  public static readonly type = parseMessageType('https://didcomm.org/shorten-url/1.0/ack')
}
