import { EventEmitter, InjectionSymbols, Repository, type StorageService } from '@credo-ts/core'
import { inject, scoped, Lifecycle } from 'tsyringe'

import { DidCommShortenUrlRecord } from './DidCommShortenUrlRecord'

@scoped(Lifecycle.ContainerScoped)
export class DidCommShortenUrlRepository extends Repository<DidCommShortenUrlRecord> {
  public constructor(
    @inject(InjectionSymbols.StorageService)
    storageService: StorageService<DidCommShortenUrlRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(DidCommShortenUrlRecord, storageService, eventEmitter)
  }
}
