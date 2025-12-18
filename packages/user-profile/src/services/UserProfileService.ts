import type { DidCommGetProfileMessageOptions, DidCommProfileMessageOptions } from '../messages'
import type { UserProfileData } from '../model'
import type {
  ConnectionProfileUpdatedEvent,
  UserProfileRequestedEvent,
  UserProfileUpdatedEvent,
} from './UserProfileEvents'

import { AgentContext, EventEmitter } from '@credo-ts/core'
import { DidCommConnectionService, DidCommInboundMessageContext, DidCommConnectionRecord } from '@credo-ts/didcomm'
import { Lifecycle, scoped } from 'tsyringe'

import { UserProfileModuleConfig } from '../DidCommUserProfileModuleConfig'
import { DidCommRequestProfileMessage, DidCommProfileMessage } from '../messages'
import { getConnectionProfile, setConnectionProfile } from '../model'
import { UserProfileRepository, UserProfileRecord } from '../repository'

import { ProfileEventTypes } from './UserProfileEvents'

@scoped(Lifecycle.ContainerScoped)
export class DidCommUserProfileService {
  private userProfileRepository: UserProfileRepository
  private connectionService: DidCommConnectionService
  private eventEmitter: EventEmitter

  public constructor(
    userProfileRepository: UserProfileRepository,
    connectionService: DidCommConnectionService,
    eventEmitter: EventEmitter,
  ) {
    this.userProfileRepository = userProfileRepository
    this.connectionService = connectionService
    this.eventEmitter = eventEmitter
  }

  /**
   * Update current User Profile Record, persisting it in repository
   *
   * @param props object containing fields to be updated
   *
   * @returns updated User Profile Record
   */
  public async updateUserProfile(agentContext: AgentContext, props: Partial<UserProfileData>) {
    const userProfile = await this.getUserProfile(agentContext)
    const previousUserProfileData = {
      displayName: userProfile.displayName,
      displayPicture: userProfile.displayPicture,
      preferredLanguage: userProfile.preferredLanguage,
    }

    Object.assign(userProfile, props)
    await this.userProfileRepository.update(agentContext, userProfile)

    this.eventEmitter.emit<UserProfileUpdatedEvent>(agentContext, {
      type: ProfileEventTypes.UserProfileUpdated,
      payload: {
        userProfile,
        previousUserProfileData,
      },
    })

    return userProfile
  }

  /**
   * Get user profile. If not exists yet, it creates it with default
   * values.
   *
   * @returns User Profile Record
   */
  public async getUserProfile(agentContext: AgentContext): Promise<UserProfileRecord> {
    let userProfileRecord = await this.userProfileRepository.findById(
      agentContext,
      this.userProfileRepository.DEFAULT_USER_PROFILE_RECORD,
    )

    // If we don't have an user profile record yet, create it
    if (!userProfileRecord) {
      userProfileRecord = new UserProfileRecord({
        id: this.userProfileRepository.DEFAULT_USER_PROFILE_RECORD,
      })
      await this.userProfileRepository.save(agentContext, userProfileRecord)
    }

    return userProfileRecord
  }

  public async processProfile(messageContext: DidCommInboundMessageContext<DidCommProfileMessage>) {
    const connection = messageContext.assertReadyConnection()

    const agentContext = messageContext.agentContext

    let currentProfile = getConnectionProfile(connection)
    const receivedProfile = messageContext.message.profile

    const displayPictureData = receivedProfile.displayPicture
      ? messageContext.message.getAppendedAttachmentById('displayPicture')
      : undefined

    const displayIconData = receivedProfile.displayIcon
      ? messageContext.message.getAppendedAttachmentById('displayIcon')
      : undefined

    // TODO: use composed objects
    const newProfile: UserProfileData = {
      ...receivedProfile,
      displayPicture: displayPictureData
        ? {
            mimeType: displayPictureData?.mimeType,
            base64: displayPictureData?.data.base64,
            links: displayPictureData?.data.links,
          }
        : receivedProfile.displayPicture === '' || receivedProfile.displayPicture === null
          ? receivedProfile.displayPicture
          : currentProfile?.displayPicture,
      displayIcon: displayIconData
        ? {
            mimeType: displayIconData?.mimeType,
            base64: displayIconData?.data.base64,
            links: displayIconData?.data.links,
          }
        : receivedProfile.displayIcon === '' || receivedProfile.displayIcon === null
          ? receivedProfile.displayIcon
          : currentProfile?.displayIcon,
    }
    if (currentProfile) {
      Object.assign(currentProfile, newProfile)
    } else {
      currentProfile = newProfile
    }

    setConnectionProfile(connection, currentProfile ?? {})

    await this.connectionService.update(agentContext, connection)

    this.eventEmitter.emit<ConnectionProfileUpdatedEvent>(agentContext, {
      type: ProfileEventTypes.ConnectionProfileUpdated,
      payload: {
        connection,
        profile: getConnectionProfile(connection) ?? {},
        sendBackYoursRequested: messageContext.message.sendBackYours,
        threadId: messageContext.message.threadId,
        parentThreadId: messageContext.message.thread?.parentThreadId,
      },
    })
    const config = messageContext.agentContext.dependencyManager.resolve(UserProfileModuleConfig)
    if (messageContext.message.sendBackYours && config.autoSendProfile) {
      return this.createProfileMessageAsReply(agentContext, connection, messageContext.message.threadId)
    }
  }

  public async createProfileMessage(options: DidCommProfileMessageOptions) {
    const message = new DidCommProfileMessage(options)

    return message
  }

  public async createRequestProfileMessage(options: DidCommGetProfileMessageOptions) {
    const message = new DidCommRequestProfileMessage(options)

    return message
  }

  public async processRequestProfile(messageContext: DidCommInboundMessageContext<DidCommRequestProfileMessage>) {
    const connection = messageContext.assertReadyConnection()

    this.eventEmitter.emit<UserProfileRequestedEvent>(messageContext.agentContext, {
      type: ProfileEventTypes.UserProfileRequested,
      payload: {
        connection,
        query: messageContext.message.query,
        threadId: messageContext.message.threadId,
        parentThreadId: messageContext.message.thread?.parentThreadId,
      },
    })

    const config = messageContext.agentContext.dependencyManager.resolve(UserProfileModuleConfig)

    if (config.autoSendProfile) {
      return await this.createProfileMessageAsReply(
        messageContext.agentContext,
        connection,
        messageContext.message.threadId,
      )
    }
  }

  private async createProfileMessageAsReply(
    agentContext: AgentContext,
    connection: DidCommConnectionRecord,
    threadId: string,
  ) {
    const userProfile = await this.getUserProfile(agentContext)
    const profile: UserProfileData = {
      displayName: userProfile.displayName,
      displayPicture: userProfile.displayPicture,
      displayIcon: userProfile.displayIcon,
      description: userProfile.description,
      preferredLanguage: userProfile.preferredLanguage,
    }

    const message = this.createProfileMessage({
      profile,
      threadId,
    })

    return message
  }
}
