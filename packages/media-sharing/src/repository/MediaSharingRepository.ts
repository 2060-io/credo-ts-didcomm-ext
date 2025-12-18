import type { StorageService } from '@credo-ts/core'

import { EventEmitter, InjectionSymbols, Repository } from '@credo-ts/core'
import { inject, scoped, Lifecycle } from 'tsyringe'

import { MediaSharingRecord } from './MediaSharingRecord'

@scoped(Lifecycle.ContainerScoped)
export class MediaSharingRepository extends Repository<MediaSharingRecord> {
  public constructor(
    @inject(InjectionSymbols.StorageService)
    storageService: StorageService<MediaSharingRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(MediaSharingRecord, storageService, eventEmitter)
  }
}
