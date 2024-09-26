import { AgentMessage, Attachment, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { Expose } from 'class-transformer'
import { IsBoolean, IsOptional } from 'class-validator'

import { PictureData, UserProfileData } from '../model'

export interface ProfileMessageOptions {
  id?: string
  profile: Partial<UserProfileData> | Record<string, unknown>
  threadId?: string
  sendBackYours?: boolean
}

class ProfileForExchange {
  public displayName?: string
  public displayPicture?: string
  public displayIcon?: string
  public description?: string
  public preferredLanguage?: string
}

export class ProfileMessage extends AgentMessage {
  public constructor(options?: ProfileMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.setThread({
        threadId: options.threadId,
      })
      this.profile = {
        ...options.profile,
        displayPicture: options.profile.displayPicture ? '#displayPicture' : undefined,
        displayIcon: options.profile.displayIcon ? '#displayIcon' : undefined,
      }

      if (options.profile.displayPicture) {
        const pictureData = options.profile.displayPicture as PictureData
        // If there is a display picture, we need to add an attachment including picture data
        this.addAppendedAttachment(
          new Attachment({
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
          new Attachment({
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

  @IsValidMessageType(ProfileMessage.type)
  public readonly type = ProfileMessage.type.messageTypeUri
  public static readonly type = parseMessageType('https://didcomm.org/user-profile/1.0/profile')

  public profile!: ProfileForExchange | Record<string, unknown>

  @IsOptional()
  @IsBoolean()
  @Expose({ name: 'send_back_yours' })
  public sendBackYours?: boolean
}
