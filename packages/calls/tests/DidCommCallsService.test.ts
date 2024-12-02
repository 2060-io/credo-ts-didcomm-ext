import type { Agent } from '@credo-ts/core'

import { JsonTransformer } from '@credo-ts/core'

import { DidCommCallsService } from '../src/DidCommCallsService'

import { setupAgent } from './utils/agent'

describe('Didcomm Calls', () => {
  let agent: Agent
  let didcommCallsService: DidCommCallsService

  beforeAll(async () => {
    agent = await setupAgent({
      name: 'calls service test',
    })
    didcommCallsService = agent.dependencyManager.resolve(DidCommCallsService)
  })

  afterAll(async () => {
    await agent.shutdown()
    await agent.wallet.delete()
  })

  describe('Offer message', () => {
    test('Should create a valid https://didcomm.org/calls/1.0/call-offer message ', async () => {
      const message = didcommCallsService.createOffer({
        callType: 'video',
        description: 'new Call Offer',
        parameters: { param: 'value' },
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/calls/1.0/call-offer',
          callType: 'video',
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
