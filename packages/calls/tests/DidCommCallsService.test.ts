import { JsonTransformer } from '@credo-ts/core'
import { describe, test, expect, beforeAll, afterAll } from 'vitest'

import { DidCommCallsService } from '../src/DidCommCallsService'

import { agent } from './utils/agent'

describe('Didcomm Calls', () => {
  let didcommCallsService: DidCommCallsService

  beforeAll(async () => {
    await agent.initialize()
    didcommCallsService = agent.dependencyManager.resolve(DidCommCallsService)
  })

  afterAll(async () => {
    await agent.shutdown()
  })

  describe('Offer message', () => {
    test('Should create a valid https://didcomm.org/calls/1.0/call-offer message ', async () => {
      const message = didcommCallsService.createOffer({
        callType: 'video',
        description: 'new Call Offer',
        offerStartTime: new Date('2024-12-02T01:26:02Z'),
        offerExpirationTime: new Date('2024-12-02T01:26:03.070Z'),
        parameters: { param: 'value' },
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/calls/1.0/call-offer',
          description: 'new Call Offer',
          call_type: 'video',
          offer_start_time: '2024-12-02T01:26:02.000Z',
          offer_expiration_time: '2024-12-02T01:26:03.070Z',
          parameters: { param: 'value' },
        }),
      )
    })
  })
  describe('Accept message', () => {
    test('Should create a valid https://didcomm.org/calls/1.0/call-accept message ', async () => {
      const message = didcommCallsService.createAccept({
        threadId: '5678-5678-5678-5678',
        parameters: { param: 'value' },
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/calls/1.0/call-accept',
          parameters: { param: 'value' },
          '~thread': expect.objectContaining({ thid: '5678-5678-5678-5678' }),
        }),
      )
    })
  })

  describe('Reject message', () => {
    test('Should create a valid https://didcomm.org/calls/1.0/call-reject message ', async () => {
      const message = didcommCallsService.createReject({
        threadId: '5678-5678-5678-5678',
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/calls/1.0/call-reject',
          '~thread': expect.objectContaining({ thid: '5678-5678-5678-5678' }),
        }),
      )
    })
  })
})
