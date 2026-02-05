import type { DidCommUserProfileKey } from '../messages'
import type { DidCommUserProfileData } from '../model'
import type { DidCommUserProfileRecord } from '../repository'
import type { BaseEvent } from '@credo-ts/core'
import type { DidCommConnectionRecord } from '@credo-ts/didcomm'

export enum DidCommProfileEventTypes {
  UserProfileUpdated = 'DidCommUserProfileUpdated',
  UserProfileRequested = 'DidCommUserProfileRequested',
  ConnectionProfileUpdated = 'DidCommConnectionProfileUpdated',
}

export interface DidCommUserProfileRequestedEvent extends BaseEvent {
  type: DidCommProfileEventTypes.UserProfileRequested
  payload: {
    connection: DidCommConnectionRecord
    query?: DidCommUserProfileKey[]
    threadId: string
    parentThreadId?: string
  }
}

export interface DidCommUserProfileUpdatedEvent extends BaseEvent {
  type: DidCommProfileEventTypes.UserProfileUpdated
  payload: {
    userProfile: DidCommUserProfileRecord
    previousUserProfileData: DidCommUserProfileData
  }
}

export interface DidCommConnectionProfileUpdatedEvent extends BaseEvent {
  type: DidCommProfileEventTypes.ConnectionProfileUpdated
  payload: {
    profile: DidCommUserProfileData
    connection: DidCommConnectionRecord
    sendBackYoursRequested?: boolean
    threadId?: string
    parentThreadId?: string
  }
}
