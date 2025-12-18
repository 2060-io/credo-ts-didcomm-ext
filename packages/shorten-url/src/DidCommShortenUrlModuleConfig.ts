import { ShortenUrlRole } from './models'

export interface DidCommShortenUrlModuleConfigOptions {
  /**
   * Defaults to both url-shortener and long-url-provider.
   */
  roles?: ShortenUrlRole[]
  /**
   * Maximum requested validity (seconds) accepted from request-shortened-url messages.
   * Values > 0 enforce the provided maximum.
   * 0 or undefined remove the maximum.
   */
  maximumRequestedValiditySeconds?: number
}

const DefaultShortenUrlRoles = [ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider] as const

export class DidCommShortenUrlModuleConfig {
  #roles?: ShortenUrlRole[]
  #maximumRequestedValiditySeconds?: number
  private readonly options: DidCommShortenUrlModuleConfigOptions

  public constructor(options?: DidCommShortenUrlModuleConfigOptions) {
    this.options = options ?? {}
    this.#roles = this.options.roles
    const maximumRequestedValiditySeconds = this.options.maximumRequestedValiditySeconds
    if (maximumRequestedValiditySeconds === undefined || maximumRequestedValiditySeconds === 0) {
      this.#maximumRequestedValiditySeconds = undefined
    } else if (!Number.isInteger(maximumRequestedValiditySeconds)) {
      throw new Error('maximumRequestedValiditySeconds must be an integer')
    } else if (maximumRequestedValiditySeconds < 0) {
      throw new Error('maximumRequestedValiditySeconds must be zero or a positive integer')
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
