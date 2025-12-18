import './setup'

import type { MessageReceiptsReceivedEvent, RequestReceiptsReceivedEvent } from '../src/services'
import type { DidCommConnectionRecord, DidCommEncryptedMessage } from '@credo-ts/didcomm'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { DidCommDidExchangeState, DidCommModule } from '@credo-ts/didcomm'
import { agentDependencies } from '@credo-ts/node'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'
import { filter, firstValueFrom, map, Subject, timeout } from 'rxjs'

import { DidCommReceiptsModule } from '../src/DidCommReceiptsModule'
import { MessageState } from '../src/messages'
import { ReceiptsEventTypes } from '../src/services'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: DidCommEncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('receipts test', () => {
  let aliceAgent: Agent<{ receipts: DidCommReceiptsModule; askar: AskarModule; didcomm: DidCommModule }>
  let bobAgent: Agent<{ receipts: DidCommReceiptsModule; askar: AskarModule; didcomm: DidCommModule }>
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
          receipts: new DidCommReceiptsModule(),
        },
      })

    // Initialize alice
    aliceAgent = buildAgent('alice', 'rxjs:alice', aliceMessages, subjectMap)
    await aliceAgent.initialize()

    // Initialize bob
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

  test('Send a basic message receipt', async () => {
    const receiptsReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<MessageReceiptsReceivedEvent>(ReceiptsEventTypes.MessageReceiptsReceived).pipe(
        filter((event: MessageReceiptsReceivedEvent) => event.payload.connectionId === aliceConnectionRecord.id),
        map((event: MessageReceiptsReceivedEvent) => event.payload.receipts),
        timeout(5000),
      ),
    )

    await bobAgent.modules.receipts.send({
      connectionId: bobConnectionRecord!.id,
      receipts: [{ messageId: 'messageId', state: MessageState.Received }],
    })

    const receipts = await receiptsReceivedPromise

    expect(receipts.length).toEqual(1)
    expect(receipts[0]).toEqual(
      expect.objectContaining({
        messageId: 'messageId',
        state: MessageState.Received,
      }),
    )
  })

  test('Request receipts', async () => {
    const receiptsReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<RequestReceiptsReceivedEvent>(ReceiptsEventTypes.RequestReceiptsReceived).pipe(
        filter((event: RequestReceiptsReceivedEvent) => event.payload.connectionId === aliceConnectionRecord.id),
        map((event: RequestReceiptsReceivedEvent) => event.payload.requestedReceipts),
        timeout(5000),
      ),
    )

    await bobAgent.modules.receipts.request({
      connectionId: bobConnectionRecord!.id,
      requestedReceipts: [{ messageType: 'messageType', states: [MessageState.Viewed, MessageState.Received] }],
    })

    const receipts = await receiptsReceivedPromise

    expect(receipts.length).toEqual(1)
    expect(receipts[0]).toEqual(
      expect.objectContaining({
        messageType: 'messageType',
        states: [MessageState.Viewed, MessageState.Received],
      }),
    )
  })
})
