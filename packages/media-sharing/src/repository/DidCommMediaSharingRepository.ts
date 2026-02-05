import type { StorageService } from '@credo-ts/core'

import { EventEmitter, InjectionSymbols, Repository, inject } from '@credo-ts/core'

import { DidCommMediaSharingRecord } from './DidCommMediaSharingRecord'

export class DidCommMediaSharingRepository extends Repository<DidCommMediaSharingRecord> {
  public constructor(
    @inject(InjectionSymbols.StorageService)
    storageService: StorageService<DidCommMediaSharingRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(DidCommMediaSharingRecord, storageService, eventEmitter)
  }
}
