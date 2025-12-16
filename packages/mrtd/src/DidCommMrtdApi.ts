import { AgentContext, injectable } from '@credo-ts/core'
import {
  DidCommConnectionService,
  DidCommDiscoverFeaturesApi,
  DidCommFeature,
  DidCommFeatureRegistry,
  DidCommMessageSender,
  DidCommOutboundMessageContext,
} from '@credo-ts/didcomm'

import { Capability } from './models/Capability'
import { MrtdCapabilities } from './models/MrtdCapabilities'
import { MrtdProblemReportReason } from './models/ProblemReportReason'
import { DidCommMrtdService } from './services/DidCommMrtdService'

@injectable()
export class DidCommMrtdApi {
  private messageSender: DidCommMessageSender
  private didcommMrtdService: DidCommMrtdService
  private connectionService: DidCommConnectionService
  private agentContext: AgentContext

  public constructor(
    messageSender: DidCommMessageSender,
    didcommMrtdService: DidCommMrtdService,
    connectionService: DidCommConnectionService,
    agentContext: AgentContext,
  ) {
    this.messageSender = messageSender
    this.didcommMrtdService = didcommMrtdService
    this.connectionService = connectionService
    this.agentContext = agentContext
  }

  public async sendMrzString(options: { connectionId: string; mrzData: string | string[]; threadId?: string }) {
    const { connectionId, mrzData, threadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createMrzData({ mrzData, threadId })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async requestMrzString(options: { connectionId: string; parentThreadId?: string }) {
    const { connectionId, parentThreadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createMrzRequest({ parentThreadId })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async sendEMrtdData(options: { connectionId: string; dataGroups: Record<string, string>; threadId?: string }) {
    const { connectionId, dataGroups, threadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createEMrtdData({ dataGroups, threadId })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  public async requestEMrtdData(options: { connectionId: string; parentThreadId?: string }) {
    const { connectionId, parentThreadId } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = this.didcommMrtdService.createEMrtdDataRequest({ parentThreadId })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  /**
   * Sends a problem report message to complete an unsuccessful MRTD flow.
   *
   * @See {MrtdProblemReportReason} for possible reasons according to the protocol
   *
   * @param options
   * @returns
   */
  public async sendProblemReport(options: { connectionId: string; threadId: string; reason: MrtdProblemReportReason }) {
    const { connectionId, threadId, reason } = options
    const connection = await this.connectionService.getById(this.agentContext, connectionId)
    connection.assertReady()

    const message = await this.didcommMrtdService.createProblemReport({ parentThreadId: threadId, reason })

    const outbound = new DidCommOutboundMessageContext(message, {
      agentContext: this.agentContext,
      connection: connection,
    })
    await this.messageSender.sendMessage(outbound)

    return { messageId: message.id }
  }

  /**
   * Sets the MRTD capabilities for the current Agent. This will be disclosed every time
   * a DIDComm connection queries using Discover Fatures protocol
   * @param options: eMrtdReadSupported: boolean indicating if the device supports eMRTD reading
   */
  public async setMrtdCapabilities(options: { eMrtdReadSupported: boolean }) {
    const featureRegistry = this.agentContext.dependencyManager.resolve<DidCommFeatureRegistry>(DidCommFeatureRegistry)

    // TODO: This is a hack to allow features to be overwritten. This should be fixed in Credo
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features = (featureRegistry as any).features as DidCommFeature[]

    const existingItemIndex = features.findIndex((item) => item.id === MrtdCapabilities.EMrtdReadSupport)
    if (existingItemIndex !== -1) {
      features.splice(existingItemIndex, 1)
    }
    featureRegistry.register(
      new Capability({ id: MrtdCapabilities.EMrtdReadSupport, value: options.eMrtdReadSupported }),
    )
  }

  /**
   * Actively queries a DIDComm connection for MRTD-related capabilities
   *
   * This process can be done sync or async. In async case, the caller to this method should listen for
   * Discover Features Disclosure events
   * @param connectionId
   */
  public async requestMrtdCapabilities(options: {
    connectionId: string
    awaitDisclosure?: boolean
    awaitDisclosureTimeoutMs?: number
  }) {
    const { connectionId, awaitDisclosure, awaitDisclosureTimeoutMs } = options
    const discoverFeatures =
      this.agentContext.dependencyManager.resolve<DidCommDiscoverFeaturesApi>(DidCommDiscoverFeaturesApi)

    const disclosures = await discoverFeatures.queryFeatures({
      connectionId,
      protocolVersion: 'v2',
      queries: [{ featureType: 'capability', match: 'mrtd.*' }],
      awaitDisclosures: awaitDisclosure,
      awaitDisclosuresTimeoutMs: awaitDisclosureTimeoutMs,
    })

    return {
      eMrtdReadSupported: disclosures.features?.some(
        (feature) => feature.id === MrtdCapabilities.EMrtdReadSupport && (feature as Capability).value === true,
      ),
    }
  }
}
