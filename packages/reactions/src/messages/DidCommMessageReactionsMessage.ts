import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform, TransformationType, Type } from 'class-transformer'
import { IsArray, IsEnum, IsString, IsDate, IsInstance, ValidateNested } from 'class-validator'

export enum DidCommMessageReactionAction {
  React = 'react',
  Unreact = 'unreact',
}

export interface DidCommMessageReactionOptions {
  messageId: string
  emoji: string
  action: DidCommMessageReactionAction
  timestamp?: Date
}
export class DidCommMessageReaction {
  public constructor(options: DidCommMessageReactionOptions) {
    if (options) {
      this.messageId = options.messageId
      this.action = options.action
      this.emoji = options.emoji
      this.timestamp = options.timestamp ?? new Date()
    }
  }

  @Expose({ name: 'message_id' })
  @IsString()
  public messageId!: string

  @IsString()
  public emoji!: string

  @IsEnum(DidCommMessageReactionAction)
  public action!: string

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

export interface MessageReactionsMessageOptions {
  id?: string
  reactions: DidCommMessageReaction[]
}

export class MessageReactionsMessage extends DidCommMessage {
  public constructor(options: MessageReactionsMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.reactions = options.reactions
    }
  }

  @Type(() => DidCommMessageReaction)
  @IsArray()
  @ValidateNested()
  @IsInstance(DidCommMessageReaction, { each: true })
  public reactions!: DidCommMessageReaction[]

  public static readonly type: ParsedMessageType = parseMessageType(
    'https://didcomm.org/reactions/1.0/message-reactions',
  )
  public readonly type = MessageReactionsMessage.type.messageTypeUri
}
