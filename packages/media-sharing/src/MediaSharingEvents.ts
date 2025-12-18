import type { MediaSharingState } from './model'
import type { MediaSharingRecord } from './repository'
import type { BaseEvent } from '@credo-ts/core'

export enum MediaSharingEventTypes {
  StateChanged = 'MediaSharingStateChangedEvent',
}

export interface MediaSharingStateChangedEvent extends BaseEvent {
  type: MediaSharingEventTypes.StateChanged
  payload: {
    mediaSharingRecord: MediaSharingRecord
    previousState: MediaSharingState | null
  }
}
