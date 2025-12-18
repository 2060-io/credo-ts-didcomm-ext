import type { DidCommMessageReceipt, DidCommRequestedReceipt } from '../messages'
import type { BaseEvent } from '@credo-ts/core'

export enum ReceiptsEventTypes {
  MessageReceiptsReceived = 'MessageReceiptsReceived ',
  RequestReceiptsReceived = 'RequestReceiptsReceived ',
}

export interface MessageReceiptsReceivedEvent extends BaseEvent {
  type: ReceiptsEventTypes.MessageReceiptsReceived
  payload: {
    connectionId: string
    receipts: DidCommMessageReceipt[]
  }
}

export interface RequestReceiptsReceivedEvent extends BaseEvent {
  type: ReceiptsEventTypes.RequestReceiptsReceived
  payload: {
    connectionId: string
    requestedReceipts: DidCommRequestedReceipt[]
  }
}
