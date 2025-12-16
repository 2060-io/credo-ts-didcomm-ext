import './setup'

import type { DidCommConnectionRecord, DidCommEncryptedMessage } from '@credo-ts/didcomm'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { DidCommDidExchangeState, DidCommModule } from '@credo-ts/didcomm'
import { agentDependencies } from '@credo-ts/node'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'
import { Subject } from 'rxjs'

import { DidCommMrtdModule } from '../src/DidCommMrtdModule'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: DidCommEncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('profile test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; mrtd: DidCommMrtdModule; didcomm: DidCommModule }>
  let bobAgent: Agent<{ askar: AskarModule; mrtd: DidCommMrtdModule; didcomm: DidCommModule }>
  let aliceConnectionRecord: DidCommConnectionRecord
  let bobConnectionRecord: DidCommConnectionRecord

  beforeEach(async () => {
    const aliceMessages = new Subject<SubjectMessage>()
    const bobMessages = new Subject<SubjectMessage>()

    const subjectMap = {
      'rxjs:alice': aliceMessages,
      'rxjs:bob': bobMessages,
    }

    const buildAgent = (label: string, endpoint: string, inbound: Subject<SubjectMessage>, map: typeof subjectMap) =>
      new Agent({
        config: {
          logger,
          autoUpdateStorageOnStartup: true,
        },
        dependencies: agentDependencies,
        modules: {
          askar: new AskarModule({
            askar: askarNodeJS,
            store: {
              id: `${label}-store`,
              key: `${label}-key`,
              database: { type: 'sqlite', config: { inMemory: true } },
            },
          }),
          didcomm: new DidCommModule({
            endpoints: [endpoint],
            transports: {
              inbound: [new SubjectInboundTransport(inbound)],
              outbound: [new SubjectOutboundTransport(map)],
            },
            credentials: false,
            proofs: false,
            messagePickup: false,
            mediator: false,
            mediationRecipient: false,
            basicMessages: false,
          }),
          mrtd: new DidCommMrtdModule(),
        },
      })

    aliceAgent = buildAgent('alice', 'rxjs:alice', aliceMessages, subjectMap)
    await aliceAgent.initialize()

    bobAgent = buildAgent('bob', 'rxjs:bob', bobMessages, subjectMap)
    await bobAgent.initialize()

    const outOfBandRecord = await aliceAgent.didcomm.oob.createInvitation({
      autoAcceptConnection: true,
      label: 'alice',
    })

    const { connectionRecord } = await bobAgent.didcomm.oob.receiveInvitationFromUrl(
      outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'https://example.com/ssi' }),
      { autoAcceptConnection: true, label: 'bob' },
    )

    bobConnectionRecord = await bobAgent.didcomm.connections.returnWhenIsConnected(connectionRecord!.id)
    expect(bobConnectionRecord.state).toBe(DidCommDidExchangeState.Completed)

    aliceConnectionRecord = (await aliceAgent.didcomm.connections.findAllByOutOfBandId(outOfBandRecord.id))[0]
    aliceConnectionRecord = await aliceAgent.didcomm.connections.returnWhenIsConnected(aliceConnectionRecord!.id)
    expect(aliceConnectionRecord.state).toBe(DidCommDidExchangeState.Completed)
  })

  afterEach(async () => {
    // Wait for messages to flush out
    await new Promise((r) => setTimeout(r, 1000))

    if (aliceAgent?.isInitialized) {
      await aliceAgent.shutdown()
    }

    if (bobAgent?.isInitialized) {
      await bobAgent.shutdown()
    }
  })

  test('Set and query an NFC support', async () => {
    // Bob requests MRTD capabilities. eMRTD read support is false, since it is not set
    let response = await bobAgent.modules.mrtd.requestMrtdCapabilities({
      connectionId: bobConnectionRecord.id,
      awaitDisclosure: true,
    })
    expect(response.eMrtdReadSupported).toBeFalsy()

    // Alice sets eMRTD read support. When Bob queries for it, he should get a true value
    await aliceAgent.modules.mrtd.setMrtdCapabilities({ eMrtdReadSupported: true })

    response = await bobAgent.modules.mrtd.requestMrtdCapabilities({
      connectionId: bobConnectionRecord.id,
      awaitDisclosure: true,
    })
    expect(response.eMrtdReadSupported).toBeTruthy()

    // Alice now sets eMRTD read support to false. When Bob queries for it, he should get a false value

    await aliceAgent.modules.mrtd.setMrtdCapabilities({ eMrtdReadSupported: false })

    response = await bobAgent.modules.mrtd.requestMrtdCapabilities({
      connectionId: bobConnectionRecord.id,
      awaitDisclosure: true,
    })
    expect(response.eMrtdReadSupported).toBeFalsy()
  })
})
