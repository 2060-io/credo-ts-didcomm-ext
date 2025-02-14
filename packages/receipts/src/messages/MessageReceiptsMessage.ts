import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose, Transform, TransformationType, Type } from 'class-transformer'
import { IsArray, IsInstance, IsString, IsDate, IsEnum, ValidateNested } from 'class-validator'

import { MessageState } from './MessageState'

export interface MessageReceiptOptions {
  messageId: string
  state: MessageState
  timestamp?: Date
}

export class MessageReceipt {
  public constructor(options: MessageReceiptOptions) {
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

export interface MessageReceiptsMessageOptions {
  id?: string
  receipts: MessageReceipt[]
}

export class MessageReceiptsMessage extends AgentMessage {
  public constructor(options?: MessageReceiptsMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.receipts = options.receipts
    }
  }

  @IsValidMessageType(MessageReceiptsMessage.type)
  public readonly type = MessageReceiptsMessage.type.messageTypeUri
  public static readonly type = parseMessageType('https://didcomm.org/receipts/1.0/message-receipts')

  @Type(() => MessageReceipt)
  @IsArray()
  @ValidateNested()
  @IsInstance(MessageReceipt, { each: true })
  public receipts!: MessageReceipt[]
}
