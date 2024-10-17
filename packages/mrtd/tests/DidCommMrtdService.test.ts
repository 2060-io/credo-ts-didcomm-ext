import type { EMrtdDataReceivedEvent } from '../src/DidCommMrtdEvents'
import type { Agent } from '@credo-ts/core'

import {
  AgentContext,
  ConnectionRecord,
  DidExchangeRole,
  DidExchangeState,
  EventEmitter,
  InboundMessageContext,
  JsonTransformer,
} from '@credo-ts/core'

import { MrtdEventTypes } from '../src/DidCommMrtdEvents'
import { DidCommMrtdService } from '../src/DidCommMrtdService'
import { EMrtdDataMessage } from '../src/messages'

import { setupAgent } from './utils/agent'

const passport = {} // For testing purposes, replace this value with a JSON file that contains the attributes: COM, DG1, DG2, DG11, and SOD.

const isPassportEmpty = !passport || (passport && Object.keys(passport).length === 0)

describe('Didcomm MRTD', () => {
  let agent: Agent
  let didcommMrtdService: DidCommMrtdService
  let agentContext: AgentContext

  beforeAll(async () => {
    agent = await setupAgent({
      name: 'mrtd service test',
    })
    didcommMrtdService = agent.dependencyManager.resolve(DidCommMrtdService)
    agentContext = agent.dependencyManager.resolve(AgentContext)
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
        dataGroups: passport,
      })

      const jsonMessage = JsonTransformer.toJSON(message)

      expect(jsonMessage).toEqual(
        expect.objectContaining({
          '@id': expect.any(String),
          '@type': 'https://didcomm.org/mrtd/1.0/emrtd-data',
          dataGroups: isPassportEmpty
            ? {}
            : {
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

  describe('EMRTD Data process message', () => {
    test('Should create a valid https://didcomm.org/mrtd/1.0/emrtd-data message ', async () => {
      const emrtdDataMessage = new EMrtdDataMessage({
        threadId: '5678-5678-5678-5678',
        dataGroups: passport,
      })

      const mockConnectionRecord = new ConnectionRecord({
        id: 'mockConnectionId',
        state: DidExchangeState.Completed,
        role: DidExchangeRole.Responder,
      })

      const inboundMessageContext = new InboundMessageContext<EMrtdDataMessage>(emrtdDataMessage, {
        agentContext: agentContext,
        connection: mockConnectionRecord,
      })

      const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
      const event = new Promise((resolve) => {
        eventEmitter.on(MrtdEventTypes.EMrtdDataReceived, (event: EMrtdDataReceivedEvent) => {
          resolve(event)
        })
      })

      await didcommMrtdService.processEMrtdData(inboundMessageContext)

      const payload = ((await event) as EMrtdDataReceivedEvent).payload

      const expectedRaw = expect.objectContaining({
        COM: expect.any(String),
        DG1: expect.any(String),
        DG2: expect.any(String),
        SOD: expect.any(String),
      })

      const expectedFields = expect.objectContaining({
        com: expect.any(Object),
        mrzData: expect.any(String),
        images: expect.any(Array),
        securityObjectOfDocument: expect.any(Object),
      })

      expect(payload).toEqual({
        connection: mockConnectionRecord,
        dataGroups: {
          raw: isPassportEmpty ? {} : expectedRaw,
          parsed: {
            valid: isPassportEmpty ? false : true,
            fields: isPassportEmpty ? undefined : expectedFields,
          },
        },
        threadId: '5678-5678-5678-5678',
      })
    })
  })
})
