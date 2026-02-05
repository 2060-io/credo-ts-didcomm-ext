import { EventEmitter, InjectionSymbols, Repository, type StorageService, inject, injectable } from '@credo-ts/core'

import { DidCommUserProfileRecord } from './DidCommUserProfileRecord'

@injectable()
export class DidCommUserProfileRepository extends Repository<DidCommUserProfileRecord> {
  public readonly DEFAULT_USER_PROFILE_RECORD = 'DEFAULT_USER_PROFILE_RECORD'

  public constructor(
    @inject(InjectionSymbols.StorageService) storageService: StorageService<DidCommUserProfileRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(DidCommUserProfileRecord, storageService, eventEmitter)
  }
}
