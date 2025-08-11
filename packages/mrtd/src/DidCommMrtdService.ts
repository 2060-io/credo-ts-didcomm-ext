import { AgentContext, EventEmitter, InboundMessageContext } from '@credo-ts/core'
import * as Mrz from 'mrz'
import { Lifecycle, scoped } from 'tsyringe'

import {
  EMrtdDataReceivedEvent,
  EMrtdDataRequestedEvent,
  MrtdEventTypes,
  MrtdProblemReportEvent,
  MrzDataReceivedEvent,
  MrzDataRequestedEvent,
} from './DidCommMrtdEvents'
import {
  EMrtdDataMessage,
  EMrtdDataRequestMessage,
  MrtdProblemReportMessage,
  MrzDataMessage,
  MrzDataRequestMessage,
} from './messages'
import { parseEMrtdData } from './models'

import { CscaMasterListService, SodVerifierService } from './services'

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
      const parseResult = Mrz.parse(message.mrzData, { autocorrect: true })

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

  public createEMrtdData(options: { dataGroups: Record<string, string>; threadId?: string }) {
    const { dataGroups, threadId } = options
    return new EMrtdDataMessage({ dataGroups, threadId })
  }

  public createEMrtdDataRequest(options: { parentThreadId?: string }) {
    const { parentThreadId } = options
    return new EMrtdDataRequestMessage({ parentThreadId })
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

    let parsed

    try {
      const parseResult = parseEMrtdData(message.dataGroups)

      parsed = { valid: true, fields: parseResult }
    } catch (error) {
      // Unsupported format. Send raw data anyway
      parsed = { valid: false }
    }

    const verification = await this.sodVerification(agentContext, message.dataGroups).catch((e) => ({
      authenticity: false,
      integrity: false,
      details: e instanceof Error ? e.message : String(e),
    }))

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<EMrtdDataReceivedEvent>(agentContext, {
      type: MrtdEventTypes.EMrtdDataReceived,
      payload: {
        connection,
        dataGroups: { raw: message.dataGroups, parsed, verification },
        threadId: message.threadId,
      },
    })
  }

  /**
   * Verifies the SOD and returns the verification result.
   * @param agentContext The agent context.
   * @param dataGroupsBase64 Base64-encoded eMRTD data groups.
   * @returns Verification result with authenticity and integrity flags, and optional details.
   */
  private async sodVerification(
    agentContext: AgentContext,
    dataGroupsBase64: Record<string, string>,
  ): Promise<{ authenticity: boolean; integrity: boolean; details?: string } | undefined> {
    const sodB64 = dataGroupsBase64?.SOD
    if (!sodB64) return undefined

    const sodBuffer = Buffer.from(sodB64, 'base64')
    const dgMap: Record<string, Buffer> = {}

    for (const [name, b64] of Object.entries(dataGroupsBase64)) {
      if (!b64 || name.toUpperCase() === 'SOD') continue
      dgMap[name] = Buffer.from(b64, 'base64')
    }

    // Ensure Master List is loaded once and cached in memory
    const mlService = agentContext.dependencyManager.resolve(CscaMasterListService)
    await mlService.initialize()
    

    const verifier = agentContext.dependencyManager.resolve(SodVerifierService)
    return verifier.verifySod(sodBuffer, dgMap)
  }

  public async processEMrtdDataRequest(messageContext: InboundMessageContext<EMrtdDataRequestMessage>) {
    const connection = messageContext.assertReadyConnection()
    const { agentContext, message } = messageContext

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<EMrtdDataRequestedEvent>(agentContext, {
      type: MrtdEventTypes.EMrtdDataRequested,
      payload: {
        connection,
        parentThreadId: message.thread?.parentThreadId,
        threadId: message.threadId,
      },
    })
  }

  public async createProblemReport(options: { parentThreadId: string; reason: string }) {
    const message = new MrtdProblemReportMessage({
      description: {
        en: '',
        code: options.reason,
      },
    })
    message.setThread({ parentThreadId: options.parentThreadId })
    return message
  }

  public async processProblemReport(messageContext: InboundMessageContext<MrtdProblemReportMessage>) {
    const connection = messageContext.assertReadyConnection()
    const { agentContext, message } = messageContext

    const eventEmitter = agentContext.dependencyManager.resolve(EventEmitter)
    eventEmitter.emit<MrtdProblemReportEvent>(agentContext, {
      type: MrtdEventTypes.MrtdProblemReport,
      payload: {
        connection,
        description: message.description,
        parentThreadId: message.thread?.parentThreadId,
        threadId: message.threadId,
      },
    })
  }
}
