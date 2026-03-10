import type { DidCommGetProfileMessageOptions, DidCommProfileMessageOptions } from '../messages'
import type { DidCommUserProfileData } from '../model'
import type {
  DidCommConnectionProfileUpdatedEvent,
  DidCommUserProfileRequestedEvent,
  DidCommUserProfileUpdatedEvent,
} from './DidCommUserProfileEvents'

import { injectable, AgentContext, EventEmitter } from '@credo-ts/core'
import { DidCommConnectionService, DidCommInboundMessageContext, DidCommConnectionRecord } from '@credo-ts/didcomm'

import { DidCommUserProfileModuleConfig } from '../DidCommUserProfileModuleConfig'
import { DidCommRequestProfileMessage, DidCommProfileMessage } from '../messages'
import { getConnectionProfile, setConnectionProfile } from '../model'
import { DidCommUserProfileRepository, DidCommUserProfileRecord } from '../repository'

import { DidCommProfileEventTypes } from './DidCommUserProfileEvents'

@injectable()
export class DidCommUserProfileService {
  private userProfileRepository: DidCommUserProfileRepository
  private connectionService: DidCommConnectionService
  private eventEmitter: EventEmitter

  public constructor(
    userProfileRepository: DidCommUserProfileRepository,
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
  public async updateUserProfile(agentContext: AgentContext, props: Partial<DidCommUserProfileData>) {
    const userProfile = await this.getUserProfile(agentContext)
    const previousUserProfileData = {
      displayName: userProfile.displayName,
      displayPicture: userProfile.displayPicture,
      preferredLanguage: userProfile.preferredLanguage,
    }

    Object.assign(userProfile, props)
    await this.userProfileRepository.update(agentContext, userProfile)

    this.eventEmitter.emit<DidCommUserProfileUpdatedEvent>(agentContext, {
      type: DidCommProfileEventTypes.UserProfileUpdated,
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
  public async getUserProfile(agentContext: AgentContext): Promise<DidCommUserProfileRecord> {
    let userProfileRecord = await this.userProfileRepository.findById(
      agentContext,
      this.userProfileRepository.DEFAULT_USER_PROFILE_RECORD,
    )

    // If we don't have an user profile record yet, create it
    if (!userProfileRecord) {
      userProfileRecord = new DidCommUserProfileRecord({
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
    const newProfile: DidCommUserProfileData = {
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

    this.eventEmitter.emit<DidCommConnectionProfileUpdatedEvent>(agentContext, {
      type: DidCommProfileEventTypes.ConnectionProfileUpdated,
      payload: {
        connection,
        profile: getConnectionProfile(connection) ?? {},
        sendBackYoursRequested: messageContext.message.sendBackYours,
        threadId: messageContext.message.threadId,
        parentThreadId: messageContext.message.thread?.parentThreadId,
      },
    })
    const config = messageContext.agentContext.dependencyManager.resolve(DidCommUserProfileModuleConfig)
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

    this.eventEmitter.emit<DidCommUserProfileRequestedEvent>(messageContext.agentContext, {
      type: DidCommProfileEventTypes.UserProfileRequested,
      payload: {
        connection,
        query: messageContext.message.query,
        threadId: messageContext.message.threadId,
        parentThreadId: messageContext.message.thread?.parentThreadId,
      },
    })

    const config = messageContext.agentContext.dependencyManager.resolve(DidCommUserProfileModuleConfig)

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
    const profile: DidCommUserProfileData = {
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
