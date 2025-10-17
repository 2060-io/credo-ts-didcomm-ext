import type { BaseEvent } from '@credo-ts/core'

export enum DidCommShortenUrlEventTypes {
  DidCommRequestShortenedUrlReceived = 'DidCommRequestShortenedUrlReceived',
  DidCommShortenedUrlReceived = 'DidCommShortenedUrlReceived',
  DidCommInvalidateShortenedUrlReceived = 'DidCommInvalidateShortenedUrlReceived',
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
  }
}

export interface DidCommShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommShortenedUrlReceived
  payload: {
    connectionId: string
    threadId: string
    shortenedUrl: string
    expiresTime?: number
  }
}

export interface DidCommInvalidateShortenedUrlReceivedEvent extends BaseEvent {
  type: DidCommShortenUrlEventTypes.DidCommInvalidateShortenedUrlReceived
  payload: {
    connectionId: string
    threadId?: string
    shortenedUrl: string
  }
}
