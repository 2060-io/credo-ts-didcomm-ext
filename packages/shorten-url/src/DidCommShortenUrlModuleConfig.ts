import { ShortenUrlRole } from './models'

export interface DidCommShortenUrlModuleConfigOptions {
  /**
   * Defaults to both url-shortener and long-url-provider.
   */
  roles?: ShortenUrlRole[]
  /**
   * Maximum requested validity (seconds) accepted from request-shortened-url messages.
   * When omitted, a default of 24 hours is enforced. Set to null to disable the maximum.
   */
  maximumRequestedValiditySeconds?: number | null
}

const DefaultShortenUrlRoles = [ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider] as const
const DefaultMaximumRequestedValiditySeconds = 60 * 60 * 24

export class DidCommShortenUrlModuleConfig {
  #roles?: ShortenUrlRole[]
  #maximumRequestedValiditySeconds?: number
  private readonly options: DidCommShortenUrlModuleConfigOptions

  public constructor(options?: DidCommShortenUrlModuleConfigOptions) {
    this.options = options ?? {}
    this.#roles = this.options.roles
    const maximumRequestedValiditySeconds = this.options.maximumRequestedValiditySeconds
    if (maximumRequestedValiditySeconds === undefined) {
      this.#maximumRequestedValiditySeconds = DefaultMaximumRequestedValiditySeconds
    } else if (maximumRequestedValiditySeconds === null) {
      this.#maximumRequestedValiditySeconds = undefined
    } else if (!Number.isInteger(maximumRequestedValiditySeconds) || maximumRequestedValiditySeconds <= 0) {
      throw new Error('maximumRequestedValiditySeconds must be a positive integer')
    } else {
      this.#maximumRequestedValiditySeconds = maximumRequestedValiditySeconds
    }
  }

  /**
   * Roles supported by this agent for the shorten-url 1.0 protocol.
   * Defaults to both url-shortener and long-url-provider.
   */
  public get roles(): ShortenUrlRole[] {
    const roles = this.#roles ?? DefaultShortenUrlRoles

    return Array.from(new Set(roles))
  }

  /**
   * Maximum requested validity (seconds) accepted from request-shortened-url messages.
   * When undefined, there is no enforced maximum.
   */
  public get maximumRequestedValiditySeconds(): number | undefined {
    return this.#maximumRequestedValiditySeconds
  }
}
