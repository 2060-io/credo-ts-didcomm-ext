import { Lifecycle, scoped } from 'tsyringe'

import { MrzDataMessage, MrzRequestMessage } from './messages'

@scoped(Lifecycle.ContainerScoped)
export class DidCommMrtdService {
  public createMrzData(options: { mrzData: string; threadId?: string }) {
    const { mrzData: mrz, threadId } = options
    return new MrzDataMessage({ mrz, threadId })
  }

  public createMrzRequest(options: { parentThreadId?: string }) {
    const { parentThreadId } = options
    return new MrzRequestMessage({ parentThreadId })
  }
}
