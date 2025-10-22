// ShortenUrlState defines the various states a DidCommShortenUrlRecord
export enum ShortenUrlState {
  RequestSent = 'request-sent',
  RequestReceived = 'request-received',
  ShortenedSent = 'shortened-sent',
  ShortenedReceived = 'shortened-received',
  InvalidationSent = 'invalidation-sent',
  InvalidationReceived = 'invalidation-received',
}
