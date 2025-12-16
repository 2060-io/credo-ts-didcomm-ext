import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommMessage, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Type } from 'class-transformer'
import { IsArray, IsInstance, IsString, ValidateNested } from 'class-validator'

import { MessageState } from './MessageState'

export interface RequestedReceiptOptions {
  messageType: string
  states?: MessageState[]
}

export class RequestedReceipt {
  public constructor(options: RequestedReceiptOptions) {
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

export interface RequestReceiptsMessageOptions {
  id?: string
  requestedReceipts: RequestedReceipt[]
}

export class RequestReceiptsMessage extends DidCommMessage {
  public constructor(options?: RequestReceiptsMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.requestedReceipts = options.requestedReceipts
    }
  }

  public readonly type = RequestReceiptsMessage.type.messageTypeUri
  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/receipts/1.0/request-receipts')

  @Expose({ name: 'requested_receipts' })
  @Type(() => RequestedReceipt)
  @IsArray()
  @ValidateNested()
  @IsInstance(RequestedReceipt, { each: true })
  public requestedReceipts!: RequestedReceipt[]
}
