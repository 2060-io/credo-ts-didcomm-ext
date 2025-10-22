import 'reflect-metadata'
import type { AgentMessage } from '@credo-ts/core'

import { JsonTransformer } from '@credo-ts/core'

import { RequestShortenedUrlMessage, ShortenedUrlMessage, InvalidateShortenedUrlMessage } from '../src/messages'

// Type helper to project messages to DIDComm V2 format
const toDidCommV2 = (message: AgentMessage) => {
  const json = JsonTransformer.toJSON(message) as Record<string, unknown>
  const { ['@type']: type, ['@id']: id, ['~thread']: thread, ...body } = json

  return {
    type,
    id,
    ...(thread && typeof thread === 'object' && thread !== null && 'thid' in thread
      ? { thid: (thread as Record<string, unknown>).thid }
      : {}),
    body,
  }
}

describe('DIDComm Shorten URL Message models', () => {
  describe('RequestShortenedUrlMessage', () => {
    it('should initialize required fields and expose snake_case in JSON', () => {
      const msg = new RequestShortenedUrlMessage({
        url: 'https://test.com/path?x=1',
        goalCode: 'shorten',
        requestedValiditySeconds: 3600,
        shortUrlSlug: 'my-slug',
      })

      expect(msg.type).toBe('https://didcomm.org/shorten-url/1.0/request-shortened-url')

      expect(JsonTransformer.toJSON(msg)).toMatchObject({
        url: 'https://test.com/path?x=1',
        goal_code: 'shorten',
        requested_validity_seconds: 3600,
        short_url_slug: 'my-slug',
      })
    })

    it('should allow slug to be omitted while keeping validity required', () => {
      const msg = new RequestShortenedUrlMessage({
        url: 'https://test.com',
        goalCode: 'share_link',
        requestedValiditySeconds: 0,
      })
      const json = JsonTransformer.toJSON(msg) as Record<string, unknown>
      expect(json['requested_validity_seconds']).toBe(0)
      expect(json['short_url_slug']).toBeUndefined()
    })

    it('should project to DIDComm V2 structure', () => {
      const msg = new RequestShortenedUrlMessage({
        url: 'https://test.com/path?x=1',
        goalCode: 'shorten',
        requestedValiditySeconds: 3600,
        shortUrlSlug: 'my-slug',
      })

      expect(toDidCommV2(msg)).toEqual({
        type: 'https://didcomm.org/shorten-url/1.0/request-shortened-url',
        id: msg.id,
        body: {
          url: 'https://test.com/path?x=1',
          goal_code: 'shorten',
          requested_validity_seconds: 3600,
          short_url_slug: 'my-slug',
        },
      })
    })
  })

  describe('ShortenedUrlMessage', () => {
    it('should set thread id and expose shortened_url / expires_time (INTEGER) in JSON', () => {
      const msg = new ShortenedUrlMessage({
        threadId: 'req-123',
        shortenedUrl: 'https://test.io/a1b2',
        expiresTime: 1732665600,
      })

      expect(msg.type).toBe('https://didcomm.org/shorten-url/1.0/shortened-url')

      expect(JsonTransformer.toJSON(msg)).toMatchObject({
        shortened_url: 'https://test.io/a1b2',
        expires_time: 1732665600,
      })
      expect(JsonTransformer.toJSON(msg)).toHaveProperty('~thread.thid', 'req-123')
    })

    it('should allow missing expires_time', () => {
      const msg = new ShortenedUrlMessage({
        threadId: 'req-123',
        shortenedUrl: 'https://test.io/a1b2',
      })
      const json = JsonTransformer.toJSON(msg) as Record<string, unknown>
      expect(json['expires_time']).toBeUndefined()
    })

    it('should project to DIDComm V2 structure with thid', () => {
      const msg = new ShortenedUrlMessage({
        threadId: 'req-123',
        shortenedUrl: 'https://test.io/a1b2',
        expiresTime: 1732665600,
      })

      expect(toDidCommV2(msg)).toEqual({
        type: 'https://didcomm.org/shorten-url/1.0/shortened-url',
        id: msg.id,
        thid: 'req-123',
        body: {
          shortened_url: 'https://test.io/a1b2',
          expires_time: 1732665600,
        },
      })
    })
  })

  describe('InvalidateShortenedUrlMessage', () => {
    it('should expose shortened_url in JSON without thread metadata', () => {
      const msg = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/a1b2' })

      expect(msg.type).toBe('https://didcomm.org/shorten-url/1.0/invalidate-shortened-url')

      const json = JsonTransformer.toJSON(msg) as Record<string, unknown>
      expect(json['shortened_url']).toBe('https://test.io/a1b2')
      expect(json['~thread']).toBeUndefined()
    })

    it('should project to DIDComm V2 structure without thread', () => {
      const msg = new InvalidateShortenedUrlMessage({ shortenedUrl: 'https://test.io/a1b2' })

      expect(toDidCommV2(msg)).toEqual({
        type: 'https://didcomm.org/shorten-url/1.0/invalidate-shortened-url',
        id: msg.id,
        body: {
          shortened_url: 'https://test.io/a1b2',
        },
      })
    })
  })
})
