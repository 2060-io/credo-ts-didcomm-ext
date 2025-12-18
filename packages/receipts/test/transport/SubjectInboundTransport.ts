import type { AgentContext } from '@credo-ts/core'
import type {
  DidCommEncryptedMessage,
  DidCommInboundTransport,
  DidCommMessage,
  DidCommTransportSession,
} from '@credo-ts/didcomm'
import type { Subscription } from 'rxjs'

import { CredoError, utils } from '@credo-ts/core'
import { DidCommMessageReceiver, DidCommTransportService } from '@credo-ts/didcomm'
import { Subject } from 'rxjs'

export type SubjectMessage = { message: DidCommEncryptedMessage; replySubject?: Subject<SubjectMessage> }

export class SubjectInboundTransport implements DidCommInboundTransport {
  public readonly ourSubject: Subject<SubjectMessage>
  private subscription?: Subscription
  private agentContext?: AgentContext

  public constructor(ourSubject = new Subject<SubjectMessage>()) {
    this.ourSubject = ourSubject
  }

  public async start(agentContext: AgentContext) {
    this.agentContext = agentContext
    this.subscribe()
  }

  public async stop() {
    this.subscription?.unsubscribe()
  }

  private subscribe() {
    if (!this.agentContext) throw new CredoError('SubjectInboundTransport not started')

    const logger = this.agentContext.config.logger
    const transportService = this.agentContext.dependencyManager.resolve(DidCommTransportService)
    const messageReceiver = this.agentContext.dependencyManager.resolve(DidCommMessageReceiver)

    this.subscription = this.ourSubject.subscribe({
      next: async ({ message, replySubject }: SubjectMessage) => {
        logger.test('Received message')

        let session: SubjectTransportSession | undefined
        if (replySubject) {
          session = new SubjectTransportSession(`subject-session-${utils.uuid()}`, replySubject)

          replySubject.subscribe({
            complete: () => {
              if (session) {
                transportService.removeSession(session)
              }
            },
          })

          transportService.saveSession(session)
        }

        await messageReceiver.receiveMessage(message, { session })
      },
    })
  }
}

export class SubjectTransportSession implements DidCommTransportSession {
  public id: string
  public readonly type = 'subject'
  public keys?: DidCommTransportSession['keys']
  public inboundMessage?: DidCommMessage
  public connectionId?: string
  private replySubject: Subject<SubjectMessage>

  public constructor(id: string, replySubject: Subject<SubjectMessage>, connectionId?: string) {
    this.id = id
    this.replySubject = replySubject
    this.connectionId = connectionId
  }

  public async send(agentContext: AgentContext, encryptedMessage: DidCommEncryptedMessage): Promise<void> {
    this.replySubject.next({ message: encryptedMessage })
  }

  public async close(): Promise<void> {
    this.replySubject.complete()
  }
}
