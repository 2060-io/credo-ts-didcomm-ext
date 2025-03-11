import {
  AgentContext,
  ConnectionService,
  injectable,
  MessageSender,
  OutboundMessageContext,
  Query,
  QueryOptions,
} from '@credo-ts/core'

import { RequestMediaHandler, ShareMediaHandler } from './handlers'
import { MediaSharingRecord, SharedMediaItem, SharedMediaItemOptions } from './repository'
import { MediaSharingService } from './services'

export interface MediaSharingCreateOptions {
  connectionId: string
  parentThreadId?: string
  description?: string
  metadata?: Record<string, unknown>
  items?: SharedMediaItem[]
}

export interface MediaSharingShareOptions {
  recordId: string
  parentThreadId?: string
  description?: string
  items?: SharedMediaItemOptions[]
}

export interface MediaSharingRequestOptions {
  connectionId: string
  parentThreadId?: string
  description?: string
  itemIds: string[]
}

@injectable()
export class MediaSharingApi {
  private messageSender: MessageSender
  private mediaSharingService: MediaSharingService
  private connectionService: ConnectionService
  private agentContext: AgentContext

  public constructor(
    messageSender: MessageSender,
    mediaSharingService: MediaSharingService,
    connectionService: ConnectionService,
    agentContext: AgentContext,
  ) {
    this.messageSender = messageSender
    this.mediaSharingService = mediaSharingService
    this.connectionService = connectionService
    this.agentContext = agentContext

    this.agentContext.dependencyManager.registerMessageHandlers([
      new ShareMediaHandler(this.mediaSharingService),
      new RequestMediaHandler(this.mediaSharingService),
    ])
  }

  /**
   * Sender role: create a new shared media record (no actual message will be sent)
   *
   */
  public async create(options: MediaSharingCreateOptions) {
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
  public async share(options: MediaSharingShareOptions) {
    const record = await this.mediaSharingService.getById(this.agentContext, options.recordId)
    const connection = await this.connectionService.getById(this.agentContext, record.connectionId)

    const { message: payload } = await this.mediaSharingService.createMediaShare(this.agentContext, {
      record,
      items: options.items?.map((item) => new SharedMediaItem(item)),
      description: options.description,
      parentThreadId: options.parentThreadId,
    })

    await this.messageSender.sendMessage(
      new OutboundMessageContext(payload, {
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
  public async request(options: MediaSharingRequestOptions) {
    const connection = await this.connectionService.getById(this.agentContext, options.connectionId)

    const { message: payload } = await this.mediaSharingService.createMediaRequest(this.agentContext, {
      connectionId: options.connectionId,
      itemIds: options.itemIds,
      description: options.description,
      parentThreadId: options.parentThreadId,
    })

    await this.messageSender.sendMessage(
      new OutboundMessageContext(payload, {
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
  public getAll(): Promise<MediaSharingRecord[]> {
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
    query: Query<MediaSharingRecord>,
    queryOptions?: QueryOptions,
  ): Promise<MediaSharingRecord[]> {
    return this.mediaSharingService.findAllByQuery(this.agentContext, query, queryOptions)
  }

  /**
   * Find a record by id
   *
   * @param recordId the record id
   * @returns  the record or null if not found
   */
  public findById(recordId: string): Promise<MediaSharingRecord | null> {
    return this.mediaSharingService.findById(this.agentContext, recordId)
  }

  /**
   * Find a record by thread id
   *
   * @param recordId the record id
   * @returns  the record or null if not found
   */
  public findByThreadId(recordId: string): Promise<MediaSharingRecord | null> {
    return this.mediaSharingService.findByThreadId(this.agentContext, recordId)
  }
}
