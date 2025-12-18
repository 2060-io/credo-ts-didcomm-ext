import type { Query, QueryOptions } from '@credo-ts/core'

import { AgentContext, injectable } from '@credo-ts/core'
import { DidCommConnectionService, DidCommMessageSender, DidCommOutboundMessageContext } from '@credo-ts/didcomm'

import { DidCommMediaSharingRecord, SharedMediaItem, type SharedMediaItemOptions } from './repository'
import { DidCommMediaSharingService } from './services'

export interface DidCommMediaSharingCreateOptions {
  connectionId: string
  parentThreadId?: string
  description?: string
  metadata?: Record<string, unknown>
  items?: SharedMediaItem[]
}

export interface DidCommMediaSharingShareOptions {
  recordId: string
  parentThreadId?: string
  description?: string
  items?: SharedMediaItemOptions[]
}

export interface DidCommMediaSharingRequestOptions {
  connectionId: string
  parentThreadId?: string
  description?: string
  itemIds: string[]
}

@injectable()
export class DidCommMediaSharingApi {
  public constructor(
    private readonly messageSender: DidCommMessageSender,
    private readonly mediaSharingService: DidCommMediaSharingService,
    private readonly connectionService: DidCommConnectionService,
    private readonly agentContext: AgentContext,
  ) {}

  /**
   * Sender role: create a new shared media record (no actual message will be sent)
   *
   */
  public async create(options: DidCommMediaSharingCreateOptions) {
    const connection = await this.connectionService.getById(this.agentContext, options.connectionId)

    const record = await this.mediaSharingService.createRecord(this.agentContext, {
      connectionRecord: connection,
      parentThreadId: options.parentThreadId,
      items: options.items,
      description: options.description,
      metadata: options.metadata,
    })

    return record
  }

  /**
   * Sender role: share media, providing actual file description details
   */
  public async share(options: DidCommMediaSharingShareOptions) {
    const record = await this.mediaSharingService.getById(this.agentContext, options.recordId)
    const connection = await this.connectionService.getById(this.agentContext, record.connectionId)

    const { message: payload } = await this.mediaSharingService.createMediaShare(this.agentContext, {
      record,
      items: options.items?.map((item) => new SharedMediaItem(item)),
      description: options.description,
      parentThreadId: options.parentThreadId,
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(payload, {
        agentContext: this.agentContext,
        connection,
        associatedRecord: record,
      }),
    )

    return record
  }

  /**
   * Receiver role: request media
   */
  public async request(options: DidCommMediaSharingRequestOptions) {
    const connection = await this.connectionService.getById(this.agentContext, options.connectionId)

    const { message: payload } = await this.mediaSharingService.createMediaRequest(this.agentContext, {
      connectionId: options.connectionId,
      itemIds: options.itemIds,
      description: options.description,
      parentThreadId: options.parentThreadId,
    })

    await this.messageSender.sendMessage(
      new DidCommOutboundMessageContext(payload, {
        agentContext: this.agentContext,
        connection,
      }),
    )
  }

  public async setMetadata(recordId: string, key: string, value: unknown) {
    const record = await this.mediaSharingService.getById(this.agentContext, recordId)
    record.metadata.set(key, value)
    await this.mediaSharingService.update(this.agentContext, record)
  }

  /**
   * Retrieve all records
   *
   * @returns List containing all records
   */
  public getAll(): Promise<DidCommMediaSharingRecord[]> {
    return this.mediaSharingService.getAll(this.agentContext)
  }

  /**
   * Find all Media Sharing record matching a given query
   *
   * @param query the record id
   * @param queryOptions The query options
   * @returns  array containing all matching records
   */
  public async findAllByQuery(
    query: Query<DidCommMediaSharingRecord>,
    queryOptions?: QueryOptions,
  ): Promise<DidCommMediaSharingRecord[]> {
    return this.mediaSharingService.findAllByQuery(this.agentContext, query, queryOptions)
  }

  /**
   * Find a record by id
   *
   * @param recordId the record id
   * @returns  the record or null if not found
   */
  public findById(recordId: string): Promise<DidCommMediaSharingRecord | null> {
    return this.mediaSharingService.findById(this.agentContext, recordId)
  }

  /**
   * Find a record by thread id
   *
   * @param recordId the record id
   * @returns  the record or null if not found
   */
  public findByThreadId(recordId: string): Promise<DidCommMediaSharingRecord | null> {
    return this.mediaSharingService.findByThreadId(this.agentContext, recordId)
  }
}
