import { ShortenUrlRole } from './models'

export interface DidCommShortenUrlModuleConfigOptions {
  /**
   * Defaults to both url-shortener and long-url-provider.
   */
  roles?: ShortenUrlRole[]
}

const DefaultShortenUrlRoles = [ShortenUrlRole.UrlShortener, ShortenUrlRole.LongUrlProvider] as const

export class DidCommShortenUrlModuleConfig {
  #roles?: ShortenUrlRole[]
  private readonly options: DidCommShortenUrlModuleConfigOptions

  public constructor(options?: DidCommShortenUrlModuleConfigOptions) {
    this.options = options ?? {}
    this.#roles = this.options.roles
  }

  /**
   * Roles supported by this agent for the shorten-url 1.0 protocol.
   * Defaults to both url-shortener and long-url-provider.
   */
  public get roles(): ShortenUrlRole[] {
    const roles = this.#roles ?? DefaultShortenUrlRoles

    return Array.from(new Set(roles))
  }
}
