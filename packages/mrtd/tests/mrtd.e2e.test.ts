import type { ConnectionRecord, EncryptedMessage } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, DidExchangeState, LogLevel, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { Subject } from 'rxjs'

import { DidCommMrtdModule } from '../src/DidCommMrtdModule'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('profile test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; mrtd: DidCommMrtdModule }>
  let bobAgent: Agent<{ askar: AskarModule; mrtd: DidCommMrtdModule }>
  let aliceWalletId: string
  let aliceWalletKey: string
  let bobWalletId: string
  let bobWalletKey: string
  let aliceConnectionRecord: ConnectionRecord
  let bobConnectionRecord: ConnectionRecord

  beforeEach(async () => {
    aliceWalletId = utils.uuid()
    aliceWalletKey = utils.uuid()
    bobWalletId = utils.uuid()
    bobWalletKey = utils.uuid()

    const aliceMessages = new Subject<SubjectMessage>()
    const bobMessages = new Subject<SubjectMessage>()

    const subjectMap = {
      'rxjs:alice': aliceMessages,
      'rxjs:bob': bobMessages,
    }

    // Initialize alice
    aliceAgent = new Agent({
      config: {
        label: 'alice',
        endpoints: ['rxjs:alice'],
        walletConfig: { id: aliceWalletId, key: aliceWalletKey },
        logger,
      },
      dependencies: agentDependencies,
      modules: { askar: new AskarModule({ ariesAskar }), mrtd: new DidCommMrtdModule() },
    })

    aliceAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
    aliceAgent.registerInboundTransport(new SubjectInboundTransport(aliceMessages))
    await aliceAgent.initialize()

    // Initialize bob
    bobAgent = new Agent({
      config: {
        endpoints: ['rxjs:bob'],
        label: 'bob',
        walletConfig: { id: bobWalletId, key: bobWalletKey },
        logger,
      },
      dependencies: agentDependencies,
      modules: { askar: new AskarModule({ ariesAskar }), mrtd: new DidCommMrtdModule() },
    })

    bobAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
    bobAgent.registerInboundTransport(new SubjectInboundTransport(bobMessages))
    await bobAgent.initialize()

    const outOfBandRecord = await aliceAgent.oob.createInvitation({
      autoAcceptConnection: true,
    })

    const { connectionRecord } = await bobAgent.oob.receiveInvitationFromUrl(
      outOfBandRecord.outOfBandInvitation.toUrl({ domain: 'https://example.com/ssi' }),
      { autoAcceptConnection: true },
    )

    bobConnectionRecord = await bobAgent.connections.returnWhenIsConnected(connectionRecord!.id)
    expect(bobConnectionRecord.state).toBe(DidExchangeState.Completed)

    aliceConnectionRecord = (await aliceAgent.connections.findAllByOutOfBandId(outOfBandRecord.id))[0]
    aliceConnectionRecord = await aliceAgent.connections.returnWhenIsConnected(aliceConnectionRecord!.id)
    expect(aliceConnectionRecord.state).toBe(DidExchangeState.Completed)
  })

  afterEach(async () => {
    // Wait for messages to flush out
    await new Promise((r) => setTimeout(r, 1000))

    if (aliceAgent) {
      await aliceAgent.shutdown()

      if (aliceAgent.wallet.isInitialized && aliceAgent.wallet.isProvisioned) {
        await aliceAgent.wallet.delete()
      }
    }

    if (bobAgent) {
      await bobAgent.shutdown()

      if (bobAgent.wallet.isInitialized && bobAgent.wallet.isProvisioned) {
        await bobAgent.wallet.delete()
      }
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
