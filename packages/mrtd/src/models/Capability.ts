import type { FeatureOptions } from '@credo-ts/core'

import { Feature } from '@credo-ts/core'

export interface CapabilityOptions extends Omit<FeatureOptions, 'type'> {
  value: unknown
}

export class Capability extends Feature {
  public constructor(props: CapabilityOptions) {
    super({ ...props, type: Capability.type })

    if (props) {
      this.value = props.value
    }
  }

  public static readonly type = 'capability'

  public value!: unknown
}
