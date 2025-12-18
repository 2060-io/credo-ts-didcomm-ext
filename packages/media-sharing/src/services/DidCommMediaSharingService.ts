import type {
  DidCommCreateMediaSharingRecordOptions,
  DidCommRequestMediaSharingRecordOptions,
  DidCommShareMediaSharingRecordOptions,
} from './DidCommMediaSharingServiceOptions'
import type { Query, QueryOptions } from '@credo-ts/core'

import { AgentContext, CredoError, EventEmitter } from '@credo-ts/core'
import { DidCommInboundMessageContext } from '@credo-ts/didcomm'
import { Lifecycle, scoped } from 'tsyringe'

import { DidCommMediaSharingEventTypes, type DidCommMediaSharingStateChangedEvent } from '../DidCommMediaSharingEvents'
import { DidCommRequestMediaMessage, DidCommShareMediaMessage } from '../messages'
import { DidCommMediaSharingRole, DidCommMediaSharingState } from '../model'
import { DidCommMediaSharingRepository, DidCommMediaSharingRecord, SharedMediaItem } from '../repository'

@scoped(Lifecycle.ContainerScoped)
export class DidCommMediaSharingService {
  private mediaSharingRepository: DidCommMediaSharingRepository
  private eventEmitter: EventEmitter

  public constructor(mediaSharingRepository: DidCommMediaSharingRepository, eventEmitter: EventEmitter) {
    this.mediaSharingRepository = mediaSharingRepository
    this.eventEmitter = eventEmitter
  }

  /**
   * Creates a new record
   *
   * @param options
   * @returns
   */
  public async createRecord(agentContext: AgentContext, options: DidCommCreateMediaSharingRecordOptions) {
    // Create record
    const record = new DidCommMediaSharingRecord({
      connectionId: options.connectionRecord.id,
      parentThreadId: options.parentThreadId,
      role: DidCommMediaSharingRole.Sender,
      state: DidCommMediaSharingState.Init,
      description: options.description,
      items: options.items,
      metadata: options.metadata,
    })

    await this.mediaSharingRepository.save(agentContext, record)

    this.eventEmitter.emit<DidCommMediaSharingStateChangedEvent>(agentContext, {
      type: DidCommMediaSharingEventTypes.StateChanged,
      payload: {
        mediaSharingRecord: record,
        previousState: null,
      },
    })

    return record
  }

  /**
   * Creates a media share
   * @param options
   * @returns
   */
  public async createMediaShare(agentContext: AgentContext, options: DidCommShareMediaSharingRecordOptions) {
    const record = options.record
    const previousState = options.record.state

    if (options.description) {
      record.description = options.description
    }

    if (options.items) {
      record.items = options.items
    }

    if (options.parentThreadId) {
      record.parentThreadId = options.parentThreadId
    }

    if (!record.items) {
      throw new CredoError('MediaSharingRecord does not contain any item to share')
    }

    // Create message
    const message = new DidCommShareMediaMessage({
      parentThreadId: record.parentThreadId,
      description: record.description,
      items: record.items,
    })

    // Update record
    record.threadId = message.id
    record.state = DidCommMediaSharingState.MediaShared

    await this.mediaSharingRepository.update(agentContext, record)

    this.eventEmitter.emit<DidCommMediaSharingStateChangedEvent>(agentContext, {
      type: DidCommMediaSharingEventTypes.StateChanged,
      payload: {
        mediaSharingRecord: record,
        previousState: previousState,
      },
    })

    return { record, message }
  }

  /**
   * Creates a media request
   * @param options
   * @returns
   */
  public async createMediaRequest(agentContext: AgentContext, options: DidCommRequestMediaSharingRecordOptions) {
    // Create message
    const message = new DidCommRequestMediaMessage({
      parentThreadId: options.parentThreadId,
      description: options.description,
      itemIds: options.itemIds,
    })

    return { message }
  }

  public async processShareMedia(messageContext: DidCommInboundMessageContext<DidCommShareMediaMessage>) {
    const { message } = messageContext

    const record = await this.findByThreadId(messageContext.agentContext, message.threadId)

    // Media sharing record already exists
    if (record) {
      throw new CredoError(`There is already a MediaSharingRecord with thread Id ${message.threadId}`)
    } else {
      const connection = messageContext.assertReadyConnection()

      if (message.items.length === 0) {
        throw new CredoError('There are no valid items in MediaSharingRecord')
      }

      // Process items
      const items: SharedMediaItem[] = []

      for (const item of message.items) {
        const relatedAttachment = message.appendedAttachments?.find((attachment) => attachment.id === item.attachmentId)
        if (!relatedAttachment) {
          throw new CredoError(`No attachment found for shared item ${item.id}`)
        }

        if (!relatedAttachment.mimeType) {
          throw new CredoError(`Missing MIME type for shared item ${item.id}`)
        }

        if (!relatedAttachment.data.links || !relatedAttachment.data.links.length) {
          throw new CredoError(`Missing URI for for shared item ${item.id}`)
        }

        items.push({
          id: item.id,
          ciphering: item.ciphering,
          metadata: item.metadata,
          mimeType: relatedAttachment.mimeType,
          uri: relatedAttachment.data.links[0],
          byteCount: relatedAttachment.byteCount,
          description: relatedAttachment.description,
          fileName: relatedAttachment.filename,
        })
      }

      // New record
      const record = new DidCommMediaSharingRecord({
        connectionId: connection.id,
        threadId: message.id,
        parentThreadId: messageContext.message.thread?.parentThreadId,
        state: DidCommMediaSharingState.MediaShared,
        role: DidCommMediaSharingRole.Receiver,
        items,
        description: message.description,
        sentTime: message.sentTime,
      })

      await this.mediaSharingRepository.save(messageContext.agentContext, record)

      this.eventEmitter.emit<DidCommMediaSharingStateChangedEvent>(messageContext.agentContext, {
        type: DidCommMediaSharingEventTypes.StateChanged,
        payload: {
          mediaSharingRecord: record,
          previousState: null,
        },
      })
    }

    return record
  }

  /**
   * Retrieve all media sharing records
   *
   * @returns List containing all auth code records
   */
  public getAll(agentContext: AgentContext): Promise<DidCommMediaSharingRecord[]> {
    return this.mediaSharingRepository.getAll(agentContext)
  }

  /**
   * Find all media sharing records by query
   *
   * @returns Returns all matching records
   */
  public async findAllByQuery(
    agentContext: AgentContext,
    mediaQuery: Query<DidCommMediaSharingRecord>,
    queryOptions?: QueryOptions,
  ) {
    return this.mediaSharingRepository.findByQuery(agentContext, mediaQuery, queryOptions)
  }

  /**
   * Retrieve a record by id
   *
   * @param recordId The record id
   * @throws {RecordNotFoundError} If no record is found
   * @return The record
   *
   */
  public getById(agentContext: AgentContext, recordId: string): Promise<DidCommMediaSharingRecord> {
    return this.mediaSharingRepository.getById(agentContext, recordId)
  }

  /**
   * Find a record by id
   *
   * @param recordId record id
   * @returns The record or null if not found
   */
  public findById(agentContext: AgentContext, recordId: string): Promise<DidCommMediaSharingRecord | null> {
    return this.mediaSharingRepository.findById(agentContext, recordId)
  }

  /**
   * Delete a record by id
   *
   * @param recordId the record id
   */
  public async deleteById(agentContext: AgentContext, recordId: string) {
    const mediaSharingRecord = await this.getById(agentContext, recordId)
    return this.mediaSharingRepository.delete(agentContext, mediaSharingRecord)
  }

  /**
   * Retrieve a record by thread id
   *
   * @param threadId The thread id
   * @throws {RecordNotFoundError} If no record is found
   * @throws {RecordDuplicateError} If multiple records are found
   * @returns The media sharing record
   */
  public async findByThreadId(agentContext: AgentContext, threadId: string): Promise<DidCommMediaSharingRecord | null> {
    return this.mediaSharingRepository.findSingleByQuery(agentContext, {
      threadId,
    })
  }

  /**
   * Retrieve auth code records by connection id
   *
   * @param connectionId The connection id
   * @param threadId The thread id
   * @throws {RecordNotFoundError} If no record is found
   * @throws {RecordDuplicateError} If multiple records are found
   * @returns The media sharing record
   */
  public async findAllByConnectionId(
    agentContext: AgentContext,
    connectionId: string,
  ): Promise<DidCommMediaSharingRecord[]> {
    return this.mediaSharingRepository.findByQuery(agentContext, {
      connectionId,
    })
  }

  /**
   * Update a record in storage repository, making it persistent
   *
   * @param record
   * @returns
   */
  public async update(agentContext: AgentContext, record: DidCommMediaSharingRecord) {
    return await this.mediaSharingRepository.update(agentContext, record)
  }
}
