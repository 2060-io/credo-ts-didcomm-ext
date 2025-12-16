import './setup'

import type { ConnectionProfileUpdatedEvent, UserProfileRequestedEvent } from '../src/services'
import type { DidCommConnectionRecord, DidCommEncryptedMessage } from '@credo-ts/didcomm'

import { AskarModule } from '@credo-ts/askar'
import { Agent, ConsoleLogger, LogLevel } from '@credo-ts/core'
import { DidCommDidExchangeState, DidCommModule } from '@credo-ts/didcomm'
import { agentDependencies } from '@credo-ts/node'
import { askarNodeJS } from '@openwallet-foundation/askar-nodejs'
import { filter, firstValueFrom, map, Subject, timeout } from 'rxjs'

import { UserProfileModule } from '../src/UserProfileModule'
import { getConnectionProfile } from '../src/model'
import { ProfileEventTypes } from '../src/services'

import { SubjectInboundTransport } from './transport/SubjectInboundTransport'
import { SubjectOutboundTransport } from './transport/SubjectOutboundTransport'

const logger = new ConsoleLogger(LogLevel.off)

export type SubjectMessage = { message: DidCommEncryptedMessage; replySubject?: Subject<SubjectMessage> }

describe('profile test', () => {
  let aliceAgent: Agent<{ askar: AskarModule; profile: UserProfileModule; didcomm: DidCommModule }>
  let bobAgent: Agent<{ askar: AskarModule; profile: UserProfileModule; didcomm: DidCommModule }>
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
          profile: new UserProfileModule(),
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

    expect(getConnectionProfile(await aliceAgent.didcomm.connections.getById(aliceConnectionRecord.id))).toEqual(
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
