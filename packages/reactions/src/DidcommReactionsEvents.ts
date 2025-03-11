import type { MessageReaction } from './messages'
import type { BaseEvent } from '@credo-ts/core'

export enum ReactionsEventTypes {
  MessageReactionsReceived = 'MessageReactionsReceived',
}

export interface MessageReactionsReceivedEvent extends BaseEvent {
  type: ReactionsEventTypes.MessageReactionsReceived
  payload: {
    connectionId: string
    reactions: MessageReaction[]
  }
}
