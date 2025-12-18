import type { DidCommMediaSharingRecord, SharedMediaItem } from '../repository'
import type { DidCommConnectionRecord } from '@credo-ts/didcomm'

export interface DidCommCreateMediaSharingRecordOptions {
  connectionRecord: DidCommConnectionRecord
  parentThreadId?: string
  description?: string
  items?: SharedMediaItem[]
  metadata?: Record<string, unknown>
}

export interface DidCommShareMediaSharingRecordOptions {
  record: DidCommMediaSharingRecord
  parentThreadId?: string
  description?: string
  items?: SharedMediaItem[]
}

export interface DidCommRequestMediaSharingRecordOptions {
  connectionId: string
  parentThreadId?: string
  description?: string
  itemIds: string[]
}
