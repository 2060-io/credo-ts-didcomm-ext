import type { BaseRecord } from '@credo-ts/core'

export interface PictureData {
  mimeType?: string
  links?: string[]
  base64?: string
}

export interface UserProfileData {
  displayName?: string
  displayPicture?: PictureData
  displayIcon?: PictureData
  description?: string
  preferredLanguage?: string
}

export interface GetUserProfileDataReturnType extends UserProfileData {
  updatedAt: BaseRecord['updatedAt']
}
