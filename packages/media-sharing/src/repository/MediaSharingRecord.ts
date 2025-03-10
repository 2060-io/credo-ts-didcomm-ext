import { CredoError, BaseRecord, utils } from '@credo-ts/core'
import { Type } from 'class-transformer'

import { MediaSharingRole, MediaSharingState } from '../model'

export interface CipheringInfo {
  algorithm: string
  parameters: Record<string, unknown>
}

export interface SharedMediaItemOptions {
  id?: string
  uri: string
  mimeType: string
  description?: string
  byteCount?: number
  fileName?: string
  ciphering?: CipheringInfo
  metadata?: Record<string, unknown>
}

export class SharedMediaItem {
  public id!: string
  public uri!: string
  public mimeType!: string
  public description?: string
  public byteCount?: number
  public fileName?: string
  public ciphering?: CipheringInfo
  public metadata?: Record<string, unknown>

  public constructor(options: SharedMediaItemOptions) {
    if (options) {
      this.id = options.id ?? utils.uuid()
      this.uri = options.uri
      this.mimeType = options.mimeType
      this.description = options.description
      this.byteCount = options.byteCount
      this.fileName = options.fileName
      this.ciphering = options.ciphering
      this.metadata = options.metadata
    }
  }
}

export interface MediaSharingStorageProps {
  id?: string
  createdAt?: Date
  connectionId: string
  threadId?: string
  parentThreadId?: string
  role: MediaSharingRole
  state: MediaSharingState
  description?: string
  items?: SharedMediaItem[]
  metadata?: Record<string, unknown>
  sentTime?: Date
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class MediaSharingRecord extends BaseRecord<any, any, any> {
  public connectionId!: string
  public threadId?: string
  public parentThreadId?: string
  public role!: MediaSharingRole
  public state!: MediaSharingState
  public description?: string
  public sentTime?: Date

  @Type(() => SharedMediaItem)
  public items?: SharedMediaItem[]

  public static readonly type = 'MediaSharingRecord'
  public readonly type = MediaSharingRecord.type

  public constructor(props: MediaSharingStorageProps) {
    super()
    if (props) {
      this.id = props.id ?? utils.uuid()
      this.createdAt = props.createdAt ?? new Date()
      this.role = props.role
      this.state = props.state
      this.connectionId = props.connectionId
      this.threadId = props.threadId
      this.parentThreadId = props.parentThreadId
      this.description = props.description
      this.items = props.items ?? []
      this.sentTime = props.sentTime
      if (props.metadata) {
        Object.keys(props.metadata).forEach((key) => {
          this.metadata.set(key, props.metadata?.[key])
        })
      }
    }
  }

  public getTags() {
    return {
      ...this._tags,
      threadId: this.threadId,
      parentThreadId: this.parentThreadId,
      connectionId: this.connectionId,
      role: this.role,
      state: this.state,
    }
  }

  public assertRole(expectedRole: MediaSharingRole) {
    if (this.role !== expectedRole) {
      throw new CredoError(`Media sharing record has invalid role ${this.role}. Expected role ${expectedRole}.`)
    }
  }

  public assertState(expectedStates: MediaSharingState | MediaSharingState[]) {
    if (!Array.isArray(expectedStates)) {
      expectedStates = [expectedStates]
    }

    if (!expectedStates.includes(this.state)) {
      throw new Error(
        `Media sharing record is in invalid state ${this.state}. Valid states are: ${expectedStates.join(', ')}.`,
      )
    }
  }
}
