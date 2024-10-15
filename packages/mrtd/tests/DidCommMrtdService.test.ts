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

const passport = {}

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

  describe('EMRTD Data process message', () => {
    test('Should create a valid https://didcomm.org/mrtd/1.0/emrtd-data message ', async () => {
      interface Payload {
        connection: typeof mockConnectionRecord
        dataGroups: {
          raw: {
            COM: string
            DG1: string
            DG2: string
            DG11: string
            SOD: string
          }
          parsed: {
            valid: boolean
            fields: {
              COM?: string
              DG1?: string
              DG2?: string
              DG11?: string
              SOD?: string
            }
          }
        }
        threadId: string
      }

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
      const eventPayload = new Promise((resolve) => {
        eventEmitter.on(MrtdEventTypes.EMrtdDataReceived, (event) => {
          resolve(event.payload)
        })
      })

      await didcommMrtdService.processEMrtdData(inboundMessageContext)

      const payload = (await eventPayload) as Payload
      const fieldsValidation = payload.dataGroups.parsed.fields

      const expectedFields = {
        COM: expect.any(String),
        DG2: expect.any(String),
        DG11: expect.any(String),
        SOD: expect.any(String),
      }

      const isFieldsEmpty = fieldsValidation && Object.keys(fieldsValidation).length === 0

      expect(payload).toEqual({
        connection: mockConnectionRecord,
        dataGroups: {
          raw: isFieldsEmpty ? {} : expectedFields,
          parsed: {
            valid: true,
            fields: isFieldsEmpty ? {} : expectedFields,
          },
        },
        threadId: '5678-5678-5678-5678',
      })
    })
  })
})
