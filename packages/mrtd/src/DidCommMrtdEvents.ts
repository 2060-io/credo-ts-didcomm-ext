import type { MrzData, EMrtdData } from './models'
import type { BaseEvent, ConnectionRecord, DescriptionOptions } from '@credo-ts/core'

export enum MrtdEventTypes {
  EMrtdDataReceived = 'EMrtdDataReceived',
  EMrtdDataRequested = 'EMrtdDataRequested',
  MrzDataReceived = 'MrzDataReceived',
  MrzDataRequested = 'MrzDataRequested',
  MrtdProblemReport = 'MrtdProblemReport',
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

export interface EMrtdDataRequestedEvent extends BaseEvent {
  type: MrtdEventTypes.EMrtdDataRequested
  payload: {
    connection: ConnectionRecord
    threadId: string
    parentThreadId?: string
  }
}

export interface MrtdProblemReportEvent extends BaseEvent {
  type: MrtdEventTypes.MrtdProblemReport
  payload: {
    connection: ConnectionRecord
    description: DescriptionOptions
    threadId: string
    parentThreadId?: string
  }
}
