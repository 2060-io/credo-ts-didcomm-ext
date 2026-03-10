import { EventEmitter, InjectionSymbols, Repository, type StorageService, inject } from '@credo-ts/core'

import { DidCommShortenUrlRecord } from './DidCommShortenUrlRecord'

export class DidCommShortenUrlRepository extends Repository<DidCommShortenUrlRecord> {
  public constructor(
    @inject(InjectionSymbols.StorageService)
    storageService: StorageService<DidCommShortenUrlRecord>,
    eventEmitter: EventEmitter,
  ) {
    super(DidCommShortenUrlRecord, storageService, eventEmitter)
  }
}
