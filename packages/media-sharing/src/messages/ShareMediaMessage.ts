import { AgentMessage, Attachment, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { DateParser } from '@credo-ts/core/build/utils/transformers'
import { Expose, Transform, Type } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

import { CipheringInfo, SharedMediaItem } from '../repository'

interface SharedMediaItemDescriptorOptions {
  id: string
  attachmentId: string
  description?: string
  ciphering?: CipheringInfo
  metadata?: Record<string, unknown>
}

class SharedMediaItemDescriptor {
  @Expose({ name: '@id' })
  public id!: string

  @Expose({ name: 'attachment_id' })
  @IsString()
  public attachmentId!: string

  public ciphering?: CipheringInfo

  public metadata?: Record<string, unknown>

  public constructor(options: SharedMediaItemDescriptorOptions) {
    if (options) {
      this.id = options.id
      this.attachmentId = options.attachmentId
      this.ciphering = options.ciphering
      this.metadata = options.metadata
    }
  }
}

export interface ShareMediaMessageOptions {
  id?: string
  threadId?: string
  parentThreadId?: string
  sentTime?: Date
  description?: string
  items: SharedMediaItem[]
}

export class ShareMediaMessage extends AgentMessage {
  public constructor(options?: ShareMediaMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()

      if (options.threadId) {
        this.setThread({ threadId: options.threadId })
      }

      if (options.parentThreadId) {
        this.setThread({
          ...this.thread,
          parentThreadId: options.parentThreadId,
        })
      }

      this.sentTime = options.sentTime || new Date()
      this.description = options.description

      // Assign an attachment per item using index as id
      this.items = []

      for (let i = 0; i < options.items.length; i++) {
        const item = options.items[i]
        this.addAppendedAttachment(
          new Attachment({
            id: i.toString(),
            data: { links: [item.uri] },
            byteCount: item.byteCount,
            filename: item.fileName,
            description: item.description,
            mimeType: item.mimeType,
          }),
        )
        this.items.push({
          id: item.id,
          attachmentId: i.toString(),
          ciphering: item.ciphering,
          metadata: item.metadata,
        })
      }
    }
  }

  @IsOptional()
  @IsString()
  public description?: string

  @Expose({ name: 'sent_time' })
  @Transform(({ value }) => DateParser(value))
  @IsDate()
  public sentTime!: Date

  @Type(() => SharedMediaItemDescriptor)
  public items!: SharedMediaItemDescriptor[]

  @IsValidMessageType(ShareMediaMessage.type)
  public readonly type = ShareMediaMessage.type.messageTypeUri
  public static readonly type = parseMessageType('https://didcomm.org/media-sharing/1.0/share-media')
}
