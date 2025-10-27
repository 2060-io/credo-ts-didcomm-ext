import type { ConnectionProfileUpdatedEvent, UserProfileRequestedEvent } from '../src/services'
import type { ConnectionRecord, EncryptedMessage } from '@credo-ts/core'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, DidExchangeState, LogLevel, utils } from '@credo-ts/core'
import { agentDependencies } from '@credo-ts/node'
import { ariesAskar } from '@hyperledger/aries-askar-nodejs'
import { filter, firstValueFrom, map, Subject, timeout } from 'rxjs'

import { UserProfileModule } from '../src/UserProfileModule'
import { getConnectionProfile } from '../src/model'
import { ProfileEventTypes } from '../src/services'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: EncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('profile test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; profile: UserProfileModule }>
  let bobAgent: Agent<{ askar: AskarModule; profile: UserProfileModule }>
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
      modules: { askar: new AskarModule({ ariesAskar }), profile: new UserProfileModule() },
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
      modules: { askar: new AskarModule({ ariesAskar }), profile: new UserProfileModule() },
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

  test('Send stored profile', async () => {
    const profileReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<ConnectionProfileUpdatedEvent>(ProfileEventTypes.ConnectionProfileUpdated).pipe(
        filter((event: ConnectionProfileUpdatedEvent) => event.payload.connection.id === aliceConnectionRecord.id),
        map((event: ConnectionProfileUpdatedEvent) => event.payload.profile),
        timeout(5000),
      ),
    )

    await bobAgent.modules.profile.updateUserProfileData({
      description: 'My bio',
      displayName: 'Bob',
      displayPicture: { mimeType: 'image/png', links: ['http://download'] },
    })
    await bobAgent.modules.profile.sendUserProfile({ connectionId: bobConnectionRecord!.id, sendBackYours: false })

    const profile = await profileReceivedPromise

    expect(profile).toEqual(
      expect.objectContaining({
        displayName: 'Bob',
        description: 'My bio',
        displayPicture: { mimeType: 'image/png', links: ['http://download'] },
      }),
    )
  })

  test('Send stored profile with removed displayPicture and displayIcon', async () => {
    const profileReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<ConnectionProfileUpdatedEvent>(ProfileEventTypes.ConnectionProfileUpdated).pipe(
        filter((event: ConnectionProfileUpdatedEvent) => event.payload.connection.id === aliceConnectionRecord.id),
        map((event: ConnectionProfileUpdatedEvent) => event.payload.profile),
        timeout(5000),
      ),
    )

    await bobAgent.modules.profile.updateUserProfileData({
      description: 'My bio',
      displayName: 'Daniel',
      displayPicture: null,
      displayIcon: '',
    })
    await bobAgent.modules.profile.sendUserProfile({ connectionId: bobConnectionRecord!.id, sendBackYours: false })

    const profile = await profileReceivedPromise

    expect(profile).toEqual(
      expect.objectContaining({
        displayName: 'Daniel',
        description: 'My bio',
        displayPicture: null,
        displayIcon: '',
      }),
    )
  })

  test('Send stored profile with no changes in displayPicture and displayIcon', async () => {
    const profileReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<ConnectionProfileUpdatedEvent>(ProfileEventTypes.ConnectionProfileUpdated).pipe(
        filter((event: ConnectionProfileUpdatedEvent) => event.payload.connection.id === aliceConnectionRecord.id),
        map((event: ConnectionProfileUpdatedEvent) => event.payload.profile),
        timeout(5000),
      ),
    )

    await bobAgent.modules.profile.updateUserProfileData({
      description: 'My bio',
      displayName: 'Daniel',
      displayPicture: undefined,
    })
    await bobAgent.modules.profile.sendUserProfile({ connectionId: bobConnectionRecord!.id, sendBackYours: false })

    const profile = await profileReceivedPromise

    expect(profile).toEqual(
      expect.objectContaining({
        displayName: 'Daniel',
        description: 'My bio',
        displayPicture: undefined,
      }),
    )
  })

  test('Send custom profile', async () => {
    const profileReceivedPromise = firstValueFrom(
      aliceAgent.events.observable<ConnectionProfileUpdatedEvent>(ProfileEventTypes.ConnectionProfileUpdated).pipe(
        filter((event: ConnectionProfileUpdatedEvent) => event.payload.connection.id === aliceConnectionRecord.id),
        map((event: ConnectionProfileUpdatedEvent) => event.payload.profile),
        timeout(5000),
      ),
    )

    await bobAgent.modules.profile.sendUserProfile({
      connectionId: bobConnectionRecord!.id,
      profileData: {
        displayIcon: { base64: 'base64' },
        organizationDid: 'orgDid',
        whatever: 'I want',
      },
      sendBackYours: false,
    })

    const profile = await profileReceivedPromise

    expect(profile).toEqual(
      expect.objectContaining({
        organizationDid: 'orgDid',
        whatever: 'I want',
        displayIcon: { base64: 'base64' },
      }),
    )

    expect(getConnectionProfile(await aliceAgent.connections.getById(aliceConnectionRecord.id))).toEqual(
      expect.objectContaining({
        organizationDid: 'orgDid',
        whatever: 'I want',
        displayIcon: { base64: 'base64' },
      }),
    )
  })

  test('Request profile', async () => {
    const profileRequestedPromise = firstValueFrom(
      aliceAgent.events.observable<UserProfileRequestedEvent>(ProfileEventTypes.UserProfileRequested).pipe(
        filter((event: UserProfileRequestedEvent) => event.payload.connection.id === aliceConnectionRecord.id),
        map((event: UserProfileRequestedEvent) => event.payload.query),
        timeout(5000),
      ),
    )

    await bobAgent.modules.profile.requestUserProfile({ connectionId: bobConnectionRecord.id })

    const profileRequestQuery = await profileRequestedPromise

    expect(profileRequestQuery).toBeUndefined()
  })
})
