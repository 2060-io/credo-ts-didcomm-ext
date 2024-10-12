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

  describe('EMRTD Data message', () => {
    test('Should create a valid https://didcomm.org/mrtd/1.0/emrtd-data message ', async () => {
      const message = didcommMrtdService.createEMrtdData({
        threadId: '5678-5678-5678-5678',
        dataGroups: {
          COM: 'Something',
          DG1: 'Something',
          DG2: 'Something',
          DG11: 'Something',
          SOD: 'Something',
        },
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/mrtd/1.0/emrtd-data',
          dataGroups: {
            COM: expect.any(String),
            DG1: expect.any(String),
            DG2: expect.any(String),
            DG11: expect.any(String),
            SOD: expect.any(String),
          },
          '~thread': expect.objectContaining({ thid: '5678-5678-5678-5678' }),
        }),
      )
    })
  })
})
