import type { UserProfileData, PictureData } from '../model'

import { BaseRecord, utils } from '@credo-ts/core'

export interface UserProfileStorageProps extends UserProfileData {
  id?: string
  createdAt?: Date
}

// TODO: Store more data than display name, display picture and description
export class UserProfileRecord extends BaseRecord implements UserProfileStorageProps {
  public displayName?: string
  public displayPicture?: PictureData
  public description?: string

  public static readonly type = 'UserProfileRecord'
  public readonly type = UserProfileRecord.type

  public constructor(props: UserProfileStorageProps) {
    super()

    if (props) {
      this.id = props.id ?? utils.uuid()
      this.createdAt = props.createdAt ?? new Date()
      this.displayName = props.displayName
      this.displayPicture = props.displayPicture
      this.description = props.description
    }
  }

  public getTags() {
    return {
      ...this._tags,
    }
  }
}
