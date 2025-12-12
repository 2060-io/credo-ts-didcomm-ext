import { DidCommAckMessage, AckStatus, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'

export class ShortenUrlAckMessage extends DidCommAckMessage {
  public constructor(options: { status: AckStatus; threadId: string }) {
    super(options)
    this.type = 'https://didcomm.org/shorten-url/1.0/ack'
  }

  @IsValidMessageType(ShortenUrlAckMessage.type)
  public readonly type: string

  public static readonly type: ReturnType<typeof parseMessageType> = parseMessageType(
    'https://didcomm.org/shorten-url/1.0/ack',
  )
}
