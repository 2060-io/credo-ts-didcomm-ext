/**
 * Module configuration options for DidCommMrtdModule.
 */
export interface DidCommMrtdModuleConfigOptions {
  /**
   * URL or local file path for the CSCA Master List (LDIF format).
   */
  masterListCscaLocation?: string
}

/**
 * Wrapper for DidCommMrtdModule configuration.
 * Provides default values and type safety.
 */
export class DidCommMrtdModuleConfig {
  #masterListCscaLocation?: string
  private readonly options: DidCommMrtdModuleConfigOptions

  /**
   * @param options Optional configuration values.
   */
  public constructor(options?: DidCommMrtdModuleConfigOptions) {
    this.options = options ?? {}
    this.#masterListCscaLocation = this.options.masterListCscaLocation
  }

  /**
   * URL or local file path for the CSCA Master List.
   * If undefined, authenticity verification remains disabled.
   */
  public get masterListCscaLocation(): string | undefined {
    return this.#masterListCscaLocation
  }
}
