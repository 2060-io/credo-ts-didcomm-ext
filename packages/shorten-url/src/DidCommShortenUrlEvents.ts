import type { DidCommShortenUrlRecord } from './repository'
import type { BaseEvent } from '@credo-ts/core'

export enum DidCommShortenUrlEventTypes {
  DidCommRequestShortenedUrlReceived = 'DidCommRequestShortenedUrlReceived',
  DidCommShortenedUrlReceived = 'DidCommShortenedUrlReceived',
  DidCommInvalidateShortenedUrlReceived = 'DidCommInvalidateShortenedUrlReceived',
  DidCommShortenedUrlInvalidated = 'DidCommShortenedUrlInvalidated',
}

export interface DidCommRequestShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommRequestShortenedUrlReceived
  payload: { shortenUrlRecord: DidCommShortenUrlRecord }
}

export interface DidCommShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommShortenedUrlReceived
  payload: { shortenUrlRecord: DidCommShortenUrlRecord }
}

export interface DidCommInvalidateShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived
  payload: { shortenUrlRecord: DidCommShortenUrlRecord }
}

export interface DidCommShortenedUrlInvalidatedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommShortenedUrlInvalidated
  payload: { shortenUrlRecord: DidCommShortenUrlRecord }
}
