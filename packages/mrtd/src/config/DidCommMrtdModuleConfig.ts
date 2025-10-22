/**
 * Module configuration options for DidCommMrtdModule.
 */
export interface DidCommMrtdModuleConfigOptions {
  /**
   * URL or local file path for the CSCA Master List (LDIF format).
   */
  masterListCscaLocation?: string
  /**
   * Optional cache TTL (in seconds) for the downloaded Master List when using a remote source.
   * When set to 0, the file is refreshed on every initialization.
   * When undefined, the cached file is reused indefinitely.
   */
  masterListCscaClearCacheTtlSeconds?: number
}

/**
 * Wrapper for DidCommMrtdModule configuration.
 * Provides default values and type safety.
 */
export class DidCommMrtdModuleConfig {
  #masterListCscaLocation?: string
  #masterListCscaClearCacheTtlSeconds?: number
  private readonly options: DidCommMrtdModuleConfigOptions

  /**
   * @param options Optional configuration values.
   */
  public constructor(options?: DidCommMrtdModuleConfigOptions) {
    this.options = options ?? {}
    this.#masterListCscaLocation = this.options.masterListCscaLocation
    this.#masterListCscaClearCacheTtlSeconds = this.options.masterListCscaClearCacheTtlSeconds
  }

  /**
   * URL or local file path for the CSCA Master List.
   * If undefined, authenticity verification remains disabled.
   */
  public get masterListCscaLocation(): string | undefined {
    return this.#masterListCscaLocation
  }

  /**
   * Cache TTL (in seconds) for the downloaded Master List.
   */
  public get masterListCscaClearCacheTtlSeconds(): number | undefined {
    return this.#masterListCscaClearCacheTtlSeconds
  }
}
