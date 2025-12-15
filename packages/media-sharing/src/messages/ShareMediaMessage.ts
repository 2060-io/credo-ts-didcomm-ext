import type { CipheringInfo, SharedMediaItem } from '../repository'

import { DidCommAttachment, DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform, Type } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

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

// helper: credo-ts/didcomm’s DateParser isn’t a public export; importing from build/* breaks bundlers/resolvers.
const toDate = (value: unknown) => {
  // Local helper: credo-ts/didcomm’s DateParser isn’t a public export; importing from build/* breaks bundlers/resolvers.
  if (value instanceof Date) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : parsed
  }
  return value
}

export class ShareMediaMessage extends DidCommMessage {
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
          new DidCommAttachment({
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
  @Transform(({ value }) => toDate(value))
  @IsDate()
  public sentTime!: Date

  @Type(() => SharedMediaItemDescriptor)
  public items!: SharedMediaItemDescriptor[]

  public static readonly type = parseMessageType('https://didcomm.org/media-sharing/1.0/share-media')
  @IsValidMessageType(ShareMediaMessage.type)
  public readonly type = ShareMediaMessage.type.messageTypeUri
}
