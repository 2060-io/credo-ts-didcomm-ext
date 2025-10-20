import type { ShortenUrlRole, ShortenUrlState } from '../models'

import { BaseRecord, utils } from '@credo-ts/core'

export interface DidCommShortenUrlRecordProps {
  id?: string
  createdAt?: Date
  connectionId: string
  requestId?: string
  role: ShortenUrlRole
  state: ShortenUrlState
  url?: string
  shortenedUrl?: string
  goalCode?: string
  requestedValiditySeconds?: number
  shortUrlSlug?: string
  expiresTime?: number
}

export class DidCommShortenUrlRecord extends BaseRecord {
  public connectionId!: string
  public requestId?: string
  public role!: ShortenUrlRole
  public state!: ShortenUrlState
  public url?: string
  public shortenedUrl?: string
  public goalCode?: string
  public requestedValiditySeconds?: number
  public shortUrlSlug?: string
  public expiresTime?: number

  public static readonly type = 'DidCommShortenUrlRecord'
  public readonly type = DidCommShortenUrlRecord.type

  public constructor(props: DidCommShortenUrlRecordProps) {
    super()
    if (props) {
      this.id = props.id ?? utils.uuid()
      this.createdAt = props.createdAt ?? new Date()
      this.connectionId = props.connectionId
      this.requestId = props.requestId
      this.role = props.role
      this.state = props.state
      this.url = props.url
      this.shortenedUrl = props.shortenedUrl
      this.goalCode = props.goalCode
      this.requestedValiditySeconds = props.requestedValiditySeconds
      this.shortUrlSlug = props.shortUrlSlug
      this.expiresTime = props.expiresTime
    }
  }

  public getTags() {
    return {
      ...this._tags,
      connectionId: this.connectionId,
      role: this.role,
      state: this.state,
      ...(this.requestId ? { requestId: this.requestId } : {}),
      ...(this.shortenedUrl ? { shortenedUrl: this.shortenedUrl } : {}),
    }
  }
}
