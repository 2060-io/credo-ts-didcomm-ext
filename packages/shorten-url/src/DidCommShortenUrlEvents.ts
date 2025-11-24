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
  payload: {
    connectionId: string
    threadId?: string
    url: string
    goalCode: string
    requestedValiditySeconds: number
    shortUrlSlug?: string
    shortenUrlRecord: DidCommShortenUrlRecord
  }
}

export interface DidCommShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommShortenedUrlReceived
  payload: {
    connectionId: string
    threadId: string
    shortenedUrl: string
    expiresTime?: Date
    shortenUrlRecord: DidCommShortenUrlRecord
  }
}

export interface DidCommInvalidateShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived
  payload: {
    connectionId: string
    shortenedUrl: string
    shortenUrlRecord: DidCommShortenUrlRecord
  }
}

export interface DidCommShortenedUrlInvalidatedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommShortenedUrlInvalidated
  payload: {
    connectionId: string
    shortenedUrl: string
    invalidationMessageId: string
    threadId?: string
    shortenUrlRecord: DidCommShortenUrlRecord
  }
}
