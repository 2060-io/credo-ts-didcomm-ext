import type { DidCommConnectionRecord } from '@credo-ts/didcomm'
import type { MediaSharingRecord, SharedMediaItem } from '../repository'

export interface CreateMediaSharingRecordOptions {
  connectionRecord: DidCommConnectionRecord
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
