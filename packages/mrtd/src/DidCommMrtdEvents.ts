import type { MrzData } from './models/MrzData'
import type { BaseEvent, ConnectionRecord } from '@credo-ts/core'

export enum MrtdEventTypes {
  MrzDataReceived = 'MrzDataReceived',
  MrzDataRequested = 'MrzDataRequested',
}

export interface MrzDataReceivedEvent extends BaseEvent {
  type: MrtdEventTypes.MrzDataReceived
  payload: {
    connection: ConnectionRecord
    mrzData?: MrzData
    threadId: string
  }
}

export interface MrzDataRequestedEvent extends BaseEvent {
  type: MrtdEventTypes.MrzDataRequested
  payload: {
    connection: ConnectionRecord
    threadId: string
    parentThreadId?: string
  }
}
