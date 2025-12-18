import type { DidCommFeatureOptions } from '@credo-ts/didcomm'

import { DidCommFeature } from '@credo-ts/didcomm'

export interface CapabilityOptions extends Omit<DidCommFeatureOptions, 'type'> {
  value: unknown
}

export class Capability extends DidCommFeature {
  public constructor(props: CapabilityOptions) {
    super({ ...props, type: Capability.type })

    if (props) {
      this.value = props.value
    }
  }

  public static readonly type = 'capability'

  public value!: unknown
}
