import type { Agent } from '@credo-ts/core'

import { JsonTransformer } from '@credo-ts/core'

import { DidCommMrtdService } from '../src/DidCommMrtdService'

import { setupAgent } from './utils/agent'

describe('Didcomm MRTD', () => {
  let agent: Agent
  let didcommMrtdService: DidCommMrtdService

  beforeAll(async () => {
    agent = await setupAgent({
      name: 'mrtd service test',
    })
    didcommMrtdService = agent.dependencyManager.resolve(DidCommMrtdService)
  })

  afterAll(async () => {
    await agent.shutdown()
    await agent.wallet.delete()
  })

  describe('MRZ Data message', () => {
    test('Should create a valid https://didcomm.org/mrtd/1.0/mrz-data message ', async () => {
      const message = didcommMrtdService.createMrzData({
        threadId: '5678-5678-5678-5678',
        mrzData: 'Something',
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/mrtd/1.0/mrz-data',
          mrzData: 'Something',
          '~thread': expect.objectContaining({ thid: '5678-5678-5678-5678' }),
        }),
      )
    })
  })
})
