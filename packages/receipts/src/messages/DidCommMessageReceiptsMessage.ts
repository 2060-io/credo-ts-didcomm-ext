import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform, TransformationType, Type } from 'class-transformer'
import { IsArray, IsInstance, IsString, IsDate, IsEnum, ValidateNested } from 'class-validator'

import { MessageState } from './MessageState'

export interface DidCommMessageReceiptOptions {
  messageId: string
  state: MessageState
  timestamp?: Date
}

export class DidCommMessageReceipt {
  public constructor(options: DidCommMessageReceiptOptions) {
    if (options) {
      this.messageId = options.messageId
      this.state = options.state
      this.timestamp = options.timestamp ?? new Date()
    }
  }

  @Expose({ name: 'message_id' })
  @IsString()
  public messageId!: string

  @IsEnum(MessageState)
  public state!: MessageState

  @Transform(({ value, type }) => {
    if (type === TransformationType.CLASS_TO_PLAIN) {
      return Math.floor(value.getTime() / 1000)
    }

    if (type === TransformationType.PLAIN_TO_CLASS) {
      return new Date(value * 1000)
    }
  })
  @IsDate()
  public timestamp!: Date
}

export interface DidCommMessageReceiptsMessageOptions {
  id?: string
  receipts: DidCommMessageReceipt[]
}

export class DidCommMessageReceiptsMessage extends DidCommMessage {
  public constructor(options?: DidCommMessageReceiptsMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.receipts = options.receipts
    }
  }

  public readonly type = DidCommMessageReceiptsMessage.type.messageTypeUri
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/receipts/1.0/message-receipts')

  @Type(() => DidCommMessageReceipt)
  @IsArray()
  @ValidateNested()
  @IsInstance(DidCommMessageReceipt, { each: true })
  public receipts!: DidCommMessageReceipt[]
}
