import type { ConnectionRecord, EncryptedMessage } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { firstValueFrom, ReplaySubject, Subject } from 'rxjs'

import { MediaSharingModule } from '../src/MediaSharingModule'
import { MediaSharingRecord } from '../src/repository'

import { recordsAddedByType } from './recordUtils'
import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = {
  message: EncryptedMessage
  replySubject?: Subject<SubjectMessage>
}

describe('media test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; media: MediaSharingModule }>
  let bobAgent: Agent<{ askar: AskarModule; media: MediaSharingModule }>
  let aliceWalletId: string
  let aliceWalletKey: string
  let bobWalletId: string
  let bobWalletKey: string
  let aliceConnectionRecord: ConnectionRecord | undefined
  let bobConnectionRecord: ConnectionRecord | undefined

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
      modules: { askar: new AskarModule({ ariesAskar }), media: new MediaSharingModule() },
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
      modules: { askar: new AskarModule({ ariesAskar }), media: new MediaSharingModule() },
    })

    bobAgent.registerOutboundTransport(new SubjectOutboundTransport(subjectMap))
    bobAgent.registerInboundTransport(new SubjectInboundTransport(bobMessages))
    await bobAgent.initialize()

    const outOfBandRecord = await aliceAgent.oob.createInvitation({
      autoAcceptConnection: true,
    })

    const { connectionRecord } = await bobAgent.oob.receiveInvitationFromUrl(
      outOfBandRecord.outOfBandInvitation.toUrl({
        domain: 'https://example.com/ssi',
      }),
      { autoAcceptConnection: true },
    )

    bobConnectionRecord = await bobAgent.connections.returnWhenIsConnected(connectionRecord!.id)
    aliceConnectionRecord = (await aliceAgent.connections.findAllByOutOfBandId(outOfBandRecord.id))[0]
    aliceConnectionRecord = await aliceAgent.connections.returnWhenIsConnected(aliceConnectionRecord!.id)
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

  test('Create media and share it', async () => {
    const subjectAlice = new ReplaySubject<MediaSharingRecord>()
    const subjectBob = new ReplaySubject<MediaSharingRecord>()
    recordsAddedByType(aliceAgent, MediaSharingRecord).pipe().subscribe(subjectAlice)

    const aliceRecord = await aliceAgent.modules.media.create({
      connectionId: aliceConnectionRecord!.id,
      metadata: {
        metadataKey1: 'metadata-val',
        metadataKey2: { key21: 'value21', key22: 'value22' },
      },
    })

    expect(aliceRecord.metadata.get('metadataKey1')).toEqual('metadata-val')
    expect(aliceRecord.metadata.get('metadataKey2')).toMatchObject({
      key21: 'value21',
      key22: 'value22',
    })

    await aliceAgent.modules.media.share({
      recordId: aliceRecord.id,
      items: [{ mimeType: 'image/png', uri: 'http://blabla', metadata: { duration: 14 } }],
    })

    recordsAddedByType(bobAgent, MediaSharingRecord)
      //.pipe(filter((e) => e.state === MediaSharingState.MediaShared))
      .subscribe(subjectBob)

    const bobRecord = await firstValueFrom(subjectBob)
    await firstValueFrom(subjectAlice)

    expect(bobRecord.items?.length).toBe(1)
    expect(bobRecord.items![0].mimeType).toBe('image/png')
    expect(bobRecord.items![0].uri).toBe('http://blabla')
    expect(bobRecord.items![0].metadata!.duration).toBe(14)

    // Now retrieve from repository
    const recordFromRepo = await bobAgent.modules.media.findById(bobRecord.id)
    expect(recordFromRepo).toBeDefined()
    expect(recordFromRepo!.items?.length).toBe(1)

    const item = recordFromRepo!.items![0]
    expect(item.mimeType).toBe('image/png')
    expect(item.uri).toBe('http://blabla')
    expect(item.metadata!.duration).toBe(14)
  })
})
