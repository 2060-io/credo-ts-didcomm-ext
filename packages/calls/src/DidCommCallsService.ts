import { Lifecycle, scoped } from 'tsyringe'

import { CallAcceptMessage } from './messages/CallAcceptMessage'
import { CallEndMessage } from './messages/CallEndMessage'
import { CallOfferMessage, DidCommCallType } from './messages/CallOfferMessage'
import { CallRejectMessage } from './messages/CallRejectMessage'

@scoped(Lifecycle.ContainerScoped)
export class DidCommCallsService {
  public createOffer(options: {
    callType: DidCommCallType
    offerExpirationTime?: Date
    offerStartTime?: Date
    description?: string
    parameters: Record<string, unknown>
  }) {
    const { callType, offerExpirationTime, offerStartTime, description, parameters } = options
    return new CallOfferMessage({ callType, offerExpirationTime, offerStartTime, description, parameters })
  }

  public createAccept(options: { threadId?: string; parameters: Record<string, unknown> }) {
    const { threadId, parameters } = options
    return new CallAcceptMessage({
      threadId,
      parameters,
    })
  }

  public createReject(options: { threadId?: string }) {
    const { threadId } = options
    return new CallRejectMessage({
      threadId,
    })
  }

  public createEnd(options: { threadId?: string }) {
    const { threadId } = options
    return new CallEndMessage({
      threadId,
    })
  }
}
