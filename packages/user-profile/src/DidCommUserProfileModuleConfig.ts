/**
 * UserProfileModuleConfigOptions defines the interface for the options of the UserProfileModuleConfig class.
 * This can contain optional parameters that have default values in the config class itself.
 */
export interface DidCommUserProfileModuleConfigOptions {
  /**
   * Whether to automatically send our profile when asked to do so.
   *
   * @default true
   */
  autoSendProfile?: boolean
}

export class DidCommUserProfileModuleConfig {
  #autoSendProfile?: boolean

  private options: DidCommUserProfileModuleConfigOptions

  public constructor(options?: DidCommUserProfileModuleConfigOptions) {
    this.options = options ?? {}
    this.#autoSendProfile = this.options.autoSendProfile
  }

  /** See {@link DidCommUserProfileModuleConfigOptions.autoSendProfile} */
  public get autoSendProfile() {
    return this.#autoSendProfile ?? true
  }
}
