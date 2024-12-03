import { AgentMessage, IsValidMessageType, parseMessageType } from '@credo-ts/core'
import { DateTransformer } from '@credo-ts/core/build/utils/transformers'
import { Expose } from 'class-transformer'
import { IsDate, IsOptional, IsString } from 'class-validator'

export type DidCommCallType = 'audio' | 'video' | 'service'

interface CallOfferMessageOptions {
  id?: string
  callType: DidCommCallType
  offerExpirationTime?: Date
  offerStartTime?: Date
  description?: string
  parameters: Record<string, unknown>
}

export class CallOfferMessage extends AgentMessage {
  public constructor(options: CallOfferMessageOptions) {
    super()

    if (options) {
      this.id = options.id ?? this.generateId()
      this.callType = options.callType
      this.description = options.description
      this.offerExpirationTime = options.offerExpirationTime
      this.offerStartTime = options.offerStartTime
      this.parameters = options.parameters
    }
  }

  @IsString()
  @Expose({ name: 'call_type' })
  public callType!: string

  @IsDate()
  @IsOptional()
  @Expose({ name: 'offer_expiration_time' })
  @DateTransformer()
  public offerExpirationTime?: Date

  @IsDate()
  @IsOptional()
  @DateTransformer()
  @Expose({ name: 'offer_start_time' })
  public offerStartTime?: Date

  @IsOptional()
  public description?: string

  public parameters!: Record<string, unknown>

  @IsValidMessageType(CallOfferMessage.type)
  public static readonly type = parseMessageType('https://didcomm.org/calls/1.0/call-offer')
  public readonly type = CallOfferMessage.type.messageTypeUri
}
