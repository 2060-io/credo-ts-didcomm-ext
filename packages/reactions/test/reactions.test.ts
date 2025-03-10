import type { MessageReactionsReceivedEvent } from '../src'
import type { ConnectionRecord, EncryptedMessage } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, DidExchangeState, LogLevel } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { filter, firstValueFrom, map, Subject, timeout } from 'rxjs'
import { v4 as uuid } from 'uuid'

import { ReactionsEventTypes } from '../src'
import { DidCommReactionsModule } from '../src/DidCommReactionsModule'
import { MessageReactionAction } from '../src/messages/MessageReactionsMessage'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('reactions test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; reactions: DidCommReactionsModule }>
  let bobAgent: Agent<{ askar: AskarModule; reactions: DidCommReactionsModule }>
  let aliceWalletId: string
  let aliceWalletKey: string
  let bobWalletId: string
  let bobWalletKey: string
  let aliceConnectionRecord: ConnectionRecord
  let bobConnectionRecord: ConnectionRecord

  beforeEach(async () => {
    aliceWalletId = uuid()
    aliceWalletKey = uuid()
    bobWalletId = uuid()
    bobWalletKey = uuid()

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
      modules: { askar: new AskarModule({ ariesAskar }), reactions: new DidCommReactionsModule() },
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
      modules: { askar: new AskarModule({ ariesAskar }), reactions: new DidCommReactionsModule() },
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

  test('Send a basic message reaction', async () => {
    const receiptsReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<MessageReactionsReceivedEvent>(ReactionsEventTypes.MessageReactionsReceived).pipe(
        filter((event: MessageReactionsReceivedEvent) => event.payload.connectionId === aliceConnectionRecord.id),
        map((event: MessageReactionsReceivedEvent) => event.payload.reactions),
        timeout(5000),
      ),
    )

    await bobAgent.modules.reactions.send({
      connectionId: bobConnectionRecord!.id,
      reactions: [{ messageId: 'messageId', action: MessageReactionAction.React, emoji: '😀' }],
    })

    const receipts = await receiptsReceivedPromise

    expect(receipts.length).toEqual(1)
    expect(receipts[0]).toEqual(
      expect.objectContaining({
        messageId: 'messageId',
        action: MessageReactionAction.React,
        emoji: '😀',
      }),
    )
  })
})
