import { EventEmitter, InboundMessageContext } from '@credo-ts/core'
import * as Mrz from 'mrz'
import { Lifecycle, scoped } from 'tsyringe'

import {
  EMrtdDataReceivedEvent,
  EMtdDataRequestedEvent,
  MrtdEventTypes,
  MrzDataReceivedEvent,
  MrzDataRequestedEvent,
} from './DidCommMrtdEvents'
import { EMrtdDataMessage, EMrtdDataRequestMessage, MrzDataMessage, MrzDataRequestMessage } from './messages'

@scoped(Lifecycle.ContainerScoped)
export class DidCommMrtdService {
  public createMrzData(options: { mrzData: string | string[]; threadId?: string }) {
    const { mrzData, threadId } = options
    return new MrzDataMessage({ mrzData, threadId })
  }

  public createMrzRequest(options: { parentThreadId?: string }) {
    const { parentThreadId } = options
    return new MrzDataRequestMessage({ parentThreadId })
  }

  public async processMrzData(messageContext: InboundMessageContext<MrzDataMessage>) {
    const connection = messageContext.assertReadyConnection()
    const { agentContext, message } = messageContext

    let parsed
    try {
      const parseResult = Mrz.parse(message.mrzData)

      parsed = { valid: parseResult.valid, fields: parseResult.fields, format: parseResult.format }
    } catch (error) {
      // Unsupported format. Send raw data anyway
      parsed = { valid: false, fields: {} }
    }

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<MrzDataReceivedEvent>(agentContext, {
      type: MrtdEventTypes.MrzDataReceived,
      payload: {
        connection,
        mrzData: { raw: message.mrzData, parsed },
        threadId: message.threadId,
      },
    })
  }

  public async processMrzDataRequest(messageContext: InboundMessageContext<MrzDataRequestMessage>) {
    const connection = messageContext.assertReadyConnection()
    const { agentContext, message } = messageContext

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<MrzDataRequestedEvent>(agentContext, {
      type: MrtdEventTypes.MrzDataRequested,
      payload: {
        connection,
        parentThreadId: message.thread?.parentThreadId,
        threadId: message.threadId,
      },
    })
  }

  public async processEMrtdData(messageContext: InboundMessageContext<EMrtdDataMessage>) {
    const connection = messageContext.assertReadyConnection()
    const { agentContext, message } = messageContext

    /*let parsed
    try {
      const parseResult = Mrz.parse(message.mrzData)

      parsed = { valid: parseResult.valid, fields: parseResult.fields, format: parseResult.format }
    } catch (error) {
      // Unsupported format. Send raw data anyway
      parsed = { valid: false, fields: {} }
    }*/

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<EMrtdDataReceivedEvent>(agentContext, {
      type: MrtdEventTypes.EMrtdDataReceived,
      payload: {
        connection,
        dataGroups: message.dataGroups,
        threadId: message.threadId,
      },
    })
  }

  public async processEMrtdDataRequest(messageContext: InboundMessageContext<EMrtdDataRequestMessage>) {
    const connection = messageContext.assertReadyConnection()
    const { agentContext, message } = messageContext

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<EMtdDataRequestedEvent>(agentContext, {
      type: MrtdEventTypes.EMrtdDataRequested,
      payload: {
        connection,
        parentThreadId: message.thread?.parentThreadId,
        threadId: message.threadId,
      },
    })
  }
}
