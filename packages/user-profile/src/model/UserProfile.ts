export interface PictureData {
  mimeType?: string
  links?: string[]
  base64?: string
}

export interface UserProfileData {
  displayName?: string
  displayPicture?: PictureData | null | ''
  displayIcon?: PictureData | null | ''
  description?: string
  preferredLanguage?: string
}
