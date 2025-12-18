import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Type } from 'class-transformer'
import { IsArray, IsInstance, IsString, ValidateNested } from 'class-validator'

import { MessageState } from './MessageState'

export interface DidCommRequestedReceiptOptions {
  messageType: string
  states?: MessageState[]
}

export class DidCommRequestedReceipt {
  public constructor(options: DidCommRequestedReceiptOptions) {
    if (options) {
      this.messageType = options.messageType
      this.states = options.states
    }
  }

  @Expose({ name: 'message_type' })
  @IsString()
  public messageType!: string

  @IsArray()
  public states?: MessageState[]
}

export interface DidCommRequestReceiptsMessageOptions {
  id?: string
  requestedReceipts: DidCommRequestedReceipt[]
}

export class DidCommRequestReceiptsMessage extends DidCommMessage {
  public constructor(options?: DidCommRequestReceiptsMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.requestedReceipts = options.requestedReceipts
    }
  }

  public readonly type = DidCommRequestReceiptsMessage.type.messageTypeUri
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/receipts/1.0/request-receipts')

  @Expose({ name: 'requested_receipts' })
  @Type(() => DidCommRequestedReceipt)
  @IsArray()
  @ValidateNested()
  @IsInstance(DidCommRequestedReceipt, { each: true })
  public requestedReceipts!: DidCommRequestedReceipt[]
}
