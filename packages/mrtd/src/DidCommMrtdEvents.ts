import type { MrzData, EMrtdData } from './models'
import type { BaseEvent, ConnectionRecord } from '@credo-ts/core'

export enum MrtdEventTypes {
  EMrtdDataReceived = 'EMrtdDataReceived',
  EMrtdDataRequested = 'EMrtdDataRequested',
  MrzDataReceived = 'MrzDataReceived',
  MrzDataRequested = 'MrzDataRequested',
}

export interface MrzDataReceivedEvent extends BaseEvent {
  type: MrtdEventTypes.MrzDataReceived
  payload: {
    connection: ConnectionRecord
    mrzData: MrzData
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

export interface EMrtdDataReceivedEvent extends BaseEvent {
  type: MrtdEventTypes.EMrtdDataReceived
  payload: {
    connection: ConnectionRecord
    dataGroups: EMrtdData
    threadId: string
  }
}

export interface EMtdDataRequestedEvent extends BaseEvent {
  type: MrtdEventTypes.EMrtdDataRequested
  payload: {
    connection: ConnectionRecord
    threadId: string
    parentThreadId?: string
  }
}
