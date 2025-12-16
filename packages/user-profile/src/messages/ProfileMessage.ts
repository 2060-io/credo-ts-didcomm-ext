import type { PictureData, UserProfileData } from '../model'
import type { ParsedMessageType } from '@credo-ts/didcomm'

import { DidCommAttachment, DidCommMessage, IsValidMessageType, parseMessageType } from '@credo-ts/didcomm'
import { Expose } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'

export interface ProfileMessageOptions {
  id?: string
  profile: Partial<UserProfileData> | Record<string, unknown>
  threadId?: string
  parentThreadId?: string
  sendBackYours?: boolean
}

class ProfileForExchange {
  public displayName?: string
  public displayPicture?: string | null
  public displayIcon?: string | null
  public description?: string
  public preferredLanguage?: string
}

export class ProfileMessage extends DidCommMessage {
  public constructor(options?: ProfileMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.setThread({
        threadId: options.threadId,
        parentThreadId: options.parentThreadId,
      })
      this.profile = {
        ...options.profile,
        displayPicture: options.profile.displayPicture ? '#displayPicture' : options.profile.displayPicture,
        displayIcon: options.profile.displayIcon ? '#displayIcon' : options.profile.displayIcon,
      }

      if (options.profile.displayPicture) {
        const pictureData = options.profile.displayPicture as PictureData
        // If there is a display picture, we need to add an attachment including picture data
        this.addAppendedAttachment(
          new DidCommAttachment({
            id: 'displayPicture',
            mimeType: pictureData.mimeType,
            data: {
              base64: pictureData.base64,
              links: pictureData.links,
            },
          }),
        )
      }

      if (options.profile.displayIcon) {
        // If there is a display icon, we need to add an attachment including picture data
        const pictureData = options.profile.displayIcon as PictureData
        this.addAppendedAttachment(
          new DidCommAttachment({
            id: 'displayIcon',
            mimeType: pictureData.mimeType,
            data: {
              base64: pictureData.base64,
              links: pictureData.links,
            },
          }),
        )
      }

      this.sendBackYours = options.sendBackYours ?? false
    }
  }

  public static readonly type: ParsedMessageType = parseMessageType('https://didcomm.org/user-profile/1.0/profile')
  @IsValidMessageType(ProfileMessage.type)
  public readonly type: string = ProfileMessage.type.messageTypeUri

  public profile!: ProfileForExchange | Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  @Expose({ name: 'send_back_yours' })
  public sendBackYours?: boolean
}
