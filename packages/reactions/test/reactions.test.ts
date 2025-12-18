import './setup'

import type { DidCommMessageReactionsReceivedEvent } from '../src'
import type { DidCommConnectionRecord, DidCommEncryptedMessage } from '@credo-ts/didcomm'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { DidCommDidExchangeState, DidCommModule } from '@credo-ts/didcomm'
import { agentDependencies } from '@credo-ts/node'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'
import { filter, firstValueFrom, map, Subject, timeout } from 'rxjs'

import { DidCommReactionsEventTypes } from '../src'
import { DidCommReactionsModule } from '../src/DidCommReactionsModule'
import { DidCommMessageReactionAction } from '../src/messages/DidCommMessageReactionsMessage'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: DidCommEncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('reactions test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; reactions: DidCommReactionsModule; didcomm: DidCommModule }>
  let bobAgent: Agent<{ askar: AskarModule; reactions: DidCommReactionsModule; didcomm: DidCommModule }>
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
          reactions: new DidCommReactionsModule(),
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

  test('Send a basic message reaction', async () => {
    const receiptsReceivedPromise = firstValueFrom(
      aliceAgent.events
        .observable<DidCommMessageReactionsReceivedEvent>(DidCommReactionsEventTypes.DidCommMessageReactionsReceived)
        .pipe(
          filter(
            (event: DidCommMessageReactionsReceivedEvent) => event.payload.connectionId === aliceConnectionRecord.id,
          ),
          map((event: DidCommMessageReactionsReceivedEvent) => event.payload.reactions),
          timeout(5000),
        ),
    )

    await bobAgent.modules.reactions.send({
      connectionId: bobConnectionRecord!.id,
      reactions: [{ messageId: 'messageId', action: DidCommMessageReactionAction.React, emoji: '😀' }],
    })

    const receipts = await receiptsReceivedPromise

    expect(receipts.length).toEqual(1)
    expect(receipts[0]).toEqual(
      expect.objectContaining({
        messageId: 'messageId',
        action: DidCommMessageReactionAction.React,
        emoji: '😀',
      }),
    )
  })
})
