import type { MessageReceipt, RequestedReceipt } from '../messages'
import type { BaseEvent } from '@credo-ts/core'

export enum ReceiptsEventTypes {
  MessageReceiptsReceived = 'MessageReceiptsReceived ',
  RequestReceiptsReceived = 'RequestReceiptsReceived ',
}

export interface MessageReceiptsReceivedEvent extends BaseEvent {
  type: ReceiptsEventTypes.MessageReceiptsReceived
  payload: {
    connectionId: string
    receipts: MessageReceipt[]
  }
}

export interface RequestReceiptsReceivedEvent extends BaseEvent {
  type: ReceiptsEventTypes.RequestReceiptsReceived
  payload: {
    connectionId: string
    requestedReceipts: RequestedReceipt[]
  }
}
