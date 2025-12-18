import 'reflect-metadata'
import type { DidCommMessage } from '@credo-ts/didcomm'

import { JsonTransformer } from '@credo-ts/core'
import { describe, it, expect } from 'vitest'

import { RequestShortenedUrlMessage, ShortenedUrlMessage, InvalidateShortenedUrlMessage } from '../src/messages'

// Type helper to project messages to DIDComm V2 format
const toDidCommV2 = (message: DidCommMessage) => {
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
    it('should expose shortened_url / expires_time (DATE) in JSON', () => {
      const expiresAt = new Date('2024-11-27T12:00:00.000Z')
      const msg = new ShortenedUrlMessage({
        id: 'msg-123',
        threadId: 'rec-123',
        shortenedUrl: 'https://test.io/a1b2',
        expiresTime: expiresAt,
      })

      expect(msg.type).toBe('https://didcomm.org/shorten-url/1.0/shortened-url')

      expect(JsonTransformer.toJSON(msg)).toMatchObject({
        shortened_url: 'https://test.io/a1b2',
        expires_time: expiresAt.toISOString(),
      })
    })

    it('should allow missing expires_time', () => {
      const msg = new ShortenedUrlMessage({
        threadId: 'rec-123',
        shortenedUrl: 'https://test.io/a1b2',
      })
      const json = JsonTransformer.toJSON(msg) as Record<string, unknown>
      expect(json['expires_time']).toBeUndefined()
    })

    it('should project to DIDComm V2 structure', () => {
      const expiresAt = new Date('2024-11-27T12:00:00.000Z')
      const msg = new ShortenedUrlMessage({
        id: 'msg-123',
        threadId: 'rec-123',
        shortenedUrl: 'https://test.io/a1b2',
        expiresTime: expiresAt,
      })

      expect(toDidCommV2(msg)).toEqual({
        type: 'https://didcomm.org/shorten-url/1.0/shortened-url',
        id: msg.id,
        thid: 'rec-123',
        body: {
          shortened_url: 'https://test.io/a1b2',
          expires_time: expiresAt.toISOString(),
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
