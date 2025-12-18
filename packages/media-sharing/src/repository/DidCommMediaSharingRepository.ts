import type { StorageService } from '@credo-ts/core'

import { EventEmitter, InjectionSymbols, Repository } from '@credo-ts/core'
import { inject, scoped, Lifecycle } from 'tsyringe'

import { DidCommMediaSharingRecord } from './DidCommMediaSharingRecord'

@scoped(Lifecycle.ContainerScoped)
export class DidCommMediaSharingRepository extends Repository<DidCommMediaSharingRecord> {
  public constructor(
    @inject(InjectionSymbols.StorageService)
    storageService: StorageService<DidCommMediaSharingRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(DidCommMediaSharingRecord, storageService, eventEmitter)
  }
}
