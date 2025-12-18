import type { AgentContext, Logger } from '@credo-ts/core'
import type { DidCommOutboundPackage, DidCommOutboundTransport } from '@credo-ts/didcomm'

import { CredoError, InjectionSymbols, utils } from '@credo-ts/core'
import { DidCommMessageReceiver, DidCommTransportService } from '@credo-ts/didcomm'
import { Subject, take, takeUntil } from 'rxjs'

import { SubjectTransportSession, type SubjectMessage } from './SubjectInboundTransport'

export class SubjectOutboundTransport implements DidCommOutboundTransport {
  private logger?: Logger
  private subjectMap: { [key: string]: Subject<SubjectMessage> | undefined }
  private agentContext?: AgentContext
  private stop$?: Subject<boolean>
  private messageReceiver?: DidCommMessageReceiver
  private transportService?: DidCommTransportService

  public supportedSchemes = ['rxjs', 'wss']

  public constructor(subjectMap: { [key: string]: Subject<SubjectMessage> | undefined }) {
    this.subjectMap = subjectMap
  }

  public async start(agentContext: AgentContext): Promise<void> {
    this.agentContext = agentContext
    this.logger = agentContext.config.logger
    this.stop$ = agentContext.dependencyManager.resolve(InjectionSymbols.Stop$)
    this.messageReceiver = agentContext.dependencyManager.resolve(DidCommMessageReceiver)
    this.transportService = agentContext.dependencyManager.resolve(DidCommTransportService)
  }

  public async stop(): Promise<void> {
    // No logic needed
  }

  public async sendMessage(outboundPackage: DidCommOutboundPackage) {
    if (!this.agentContext || !this.logger || !this.stop$ || !this.messageReceiver || !this.transportService) {
      throw new CredoError('Outbound transport is not active. Not sending message.')
    }

    this.logger.debug(`Sending outbound message to endpoint ${outboundPackage.endpoint}`, {
      endpoint: outboundPackage.endpoint,
    })
    const { payload, endpoint, connectionId } = outboundPackage

    if (!endpoint) {
      throw new CredoError('Cannot send message to subject without endpoint')
    }

    const subject = this.subjectMap[endpoint]

    if (!subject) {
      throw new CredoError(`No subject found for endpoint ${endpoint}`)
    }

    // Create a replySubject just for this session. Both ends will be able to close it,
    // mimicking a transport like http or websocket. Close session automatically when agent stops
    const replySubject = new Subject<SubjectMessage>()
    const session = new SubjectTransportSession(`subject-session-${utils.uuid()}`, replySubject, connectionId)

    const cleanup = () => this.transportService?.removeSession(session)

    this.stop$.pipe(take(1)).subscribe(() => !replySubject.closed && replySubject.complete())

    replySubject.pipe(takeUntil(this.stop$)).subscribe({
      next: async ({ message }: SubjectMessage) => {
        this.logger?.test('Received message')

        await this.messageReceiver!.receiveMessage(message, { session })
      },
      complete: cleanup,
    })

    this.transportService.saveSession(session)

    subject.next({ message: payload, replySubject })
  }
}
