import type { CipheringInfo, SharedMediaItem } from '../repository'

import { DidCommAttachment, DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose, Transform, Type } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

import { toDate } from '../utils/utils'

interface DidCommSharedMediaItemDescriptorOptions {
  id: string
  attachmentId: string
  description?: string
  ciphering?: CipheringInfo
  metadata?: Record<string, unknown>
}

class DidCommSharedMediaItemDescriptor {
  @Expose({ name: '@id' })
  public id!: string

  @Expose({ name: 'attachment_id' })
  @IsString()
  public attachmentId!: string

  public ciphering?: CipheringInfo

  public metadata?: Record<string, unknown>

  public constructor(options: DidCommSharedMediaItemDescriptorOptions) {
    if (options) {
      this.id = options.id
      this.attachmentId = options.attachmentId
      this.ciphering = options.ciphering
      this.metadata = options.metadata
    }
  }
}

export interface DidCommShareMediaMessageOptions {
  id?: string
  threadId?: string
  parentThreadId?: string
  sentTime?: Date
  description?: string
  items: SharedMediaItem[]
}

export class DidCommShareMediaMessage extends DidCommMessage {
  public constructor(options?: DidCommShareMediaMessageOptions) {
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

  @Type(() => DidCommSharedMediaItemDescriptor)
  public items!: DidCommSharedMediaItemDescriptor[]

  public static readonly type = parseMessageType('https://didcomm.org/media-sharing/1.0/share-media')
  @IsValidMessageType(DidCommShareMediaMessage.type)
  public readonly type = DidCommShareMediaMessage.type.messageTypeUri
}
