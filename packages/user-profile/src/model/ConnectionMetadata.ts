import type { UserProfileData } from './UserProfile'
import type { ConnectionRecord } from '@credo-ts/core'

export const getConnectionProfile = (record: ConnectionRecord) =>
  record.metadata.get('UserProfile') as UserProfileData | null

export const setConnectionProfile = (record: ConnectionRecord, metadata: UserProfileData | Record<string, unknown>) =>
  record.metadata.add('UserProfile', metadata)
