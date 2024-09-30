import type { DependencyManager, FeatureRegistry, Module } from '@credo-ts/core'

import { Protocol } from '@credo-ts/core'

import { DidCommMrtdService } from './DidCommMrtdService'
import { DidCommMrtdApi } from './DidCommMrtdApi'
import { MrzDataHandler, MrzRequestHandler } from './handlers'
import { DidCommMrtdRole } from './models'
import { MrzRequestMessage } from './messages'

export class DidCommMrtdModule implements Module {
  public readonly api = DidCommMrtdApi

  public register(dependencyManager: DependencyManager, featureRegistry: FeatureRegistry): void {
    dependencyManager.registerContextScoped(DidCommMrtdApi)

    dependencyManager.registerSingleton(DidCommMrtdService)

    featureRegistry.register(
      new Protocol({
        id: 'https://didcomm.org/mrtd/1.0',
        roles: [
          DidCommMrtdRole.MrzRequester,
          DidCommMrtdRole.MrzResponder,
        ],
      }),
    )

    dependencyManager.registerMessageHandlers([
      new MrzDataHandler(),
      new MrzRequestHandler(),
    ])
  }
}
