import type { DidCommMessageReaction } from './messages'
import type { BaseEvent } from '@credo-ts/core'

export enum DidCommReactionsEventTypes {
  DidCommMessageReactionsReceived = 'DidCommMessageReactionsReceived',
}

export interface DidCommMessageReactionsReceivedEvent extends BaseEvent {
  type: DidCommReactionsEventTypes.DidCommMessageReactionsReceived
  payload: {
    connectionId: string
    reactions: DidCommMessageReaction[]
  }
}
