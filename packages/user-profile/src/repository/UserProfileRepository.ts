import { EventEmitter, InjectionSymbols, Repository, type StorageService, inject } from '@credo-ts/core'

import { UserProfileRecord } from './UserProfileRecord'

export class UserProfileRepository extends Repository<UserProfileRecord> {
  public readonly DEFAULT_USER_PROFILE_RECORD = 'DEFAULT_USER_PROFILE_RECORD'

  public constructor(
    @inject(InjectionSymbols.StorageService) storageService: StorageService<UserProfileRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(UserProfileRecord, storageService, eventEmitter)
  }
}
