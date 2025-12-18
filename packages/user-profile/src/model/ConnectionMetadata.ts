import type { UserProfileData } from './UserProfile'
import type { DidCommConnectionRecord } from '@credo-ts/didcomm'

export const getConnectionProfile = (record: DidCommConnectionRecord) =>
  record.metadata.get('UserProfile') as UserProfileData | null

export const setConnectionProfile = (
  record: DidCommConnectionRecord,
  metadata: UserProfileData | Record<string, unknown>,
) => record.metadata.add('UserProfile', metadata)
