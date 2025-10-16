import type { BaseEvent } from '@credo-ts/core'

export enum ShortenUrlEventTypes {
  RequestShortenedUrlReceived = 'RequestShortenedUrlReceived',
  ShortenedUrlReceived = 'ShortenedUrlReceived',
  InvalidateShortenedUrlReceived = 'InvalidateShortenedUrlReceived',
}

export interface RequestShortenedUrlReceivedEvent extends BaseEvent {
  type: ShortenUrlEventTypes.RequestShortenedUrlReceived
  payload: {
    connectionId: string
    threadId?: string
    url: string
    goalCode: string
    requestedValiditySeconds: number
    shortUrlSlug?: string
  }
}

export interface ShortenedUrlReceivedEvent extends BaseEvent {
  type: ShortenUrlEventTypes.ShortenedUrlReceived
  payload: {
    connectionId: string
    threadId: string
    shortenedUrl: string
    expiresTime?: Number
  }
}

export interface InvalidateShortenedUrlReceivedEvent extends BaseEvent {
  type: ShortenUrlEventTypes.InvalidateShortenedUrlReceived
  payload: {
    connectionId: string
    threadId?: string
    shortenedUrl: string
  }
}
