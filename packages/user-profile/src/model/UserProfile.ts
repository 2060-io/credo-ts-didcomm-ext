import type { BaseRecord } from '@credo-ts/core'

export interface PictureData {
  mimeType?: string
  links?: string[]
  base64?: string
}

export interface DidCommUserProfileData {
  displayName?: string
  displayPicture?: PictureData | null | ''
  displayIcon?: PictureData | null | ''
  description?: string
  preferredLanguage?: string
}

export interface GetUserProfileDataReturnType extends DidCommUserProfileData {
  updatedAt: BaseRecord['updatedAt']
}
