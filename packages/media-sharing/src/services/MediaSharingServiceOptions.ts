import type { MediaSharingRecord, SharedMediaItem } from '../repository'
import type { ConnectionRecord } from '@credo-ts/core'

export interface CreateMediaSharingRecordOptions {
  connectionRecord: ConnectionRecord
  parentThreadId?: string
  description?: string
  items?: SharedMediaItem[]
  metadata?: Record<string, unknown>
}

export interface ShareMediaSharingRecordOptions {
  record: MediaSharingRecord
  parentThreadId?: string
  description?: string
  items?: SharedMediaItem[]
}

export interface RequestMediaSharingRecordOptions {
  connectionId: string
  parentThreadId?: string
  description?: string
  itemIds: string[]
}
