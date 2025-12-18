<p align="center">
  <br />
  <img
    alt="Credo logo"
    src="https://github.com/openwallet-foundation/credo-ts/blob/c7886cb8377ceb8ee4efe8d264211e561a75072d/images/credo-logo.png"
    height="250px"
  />
</p>
<h1 align="center"><b>Credo extension module for DIDComm Message Reactions protocol</b></h1>
<p align="center">
  <a
    href="https://raw.githubusercontent.com/openwallet-foundation/credo-ts-ext/main/LICENSE"
    ><img
      alt="License"
      src="https://img.shields.io/badge/License-Apache%202.0-blue.svg"
  /></a>
  <a href="https://www.typescriptlang.org/"
    ><img
      alt="typescript"
      src="https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg"
  /></a>
  <a href="https://www.npmjs.com/package/@2060.io/credo-ts-didcomm-reactions"
    ><img
      alt="@2060.io/credo-ts-didcomm-reactions"
      src="https://img.shields.io/npm/v/@2060.io/credo-ts-didcomm-reactions"
  /></a>
</p>
<br />

## Overview

The **Message Reactions** extension module for [Credo](https://github.com/openwallet-foundation/credo-ts) enables agents to manage [Reactions protocol](https://didcomm.org/reactions/1.0/), allowing users to send and receive emoji reactions to messages between agents.

## Installation

```bash
npm install @2060.io/credo-ts-didcomm-reactions
```

## Usage

### Adding the Module to Your Agent

To use the Reactions module, add it to your agent's modules configuration:

```typescript
import { DidCommReactionsModule } from '@2060.io/credo-ts-didcomm-reactions'

const agent = new Agent({
  modules: {
    // ...other modules
    reactions: new DidCommReactionsModule(),
  },
})
```

### Sending Message Reactions

To send message reactions (e.g., emoji reactions or to remove a reaction):

```typescript
const didcommReactions = [{ messageId: associatedMessageId ?? '', action: DidCommMessageReactionAction.React, emoji }]

// To remove a previous reaction:
didcommReactions.push({
  messageId: associatedMessageId ?? '',
  action: DidCommMessageReactionAction.Unreact,
  emoji: myPreviousReaction.emoji,
})

await agent.modules.reactions.send({
  connectionId: connection.id,
  reactions: didcommReactions,
})
```

You can also send reactions in response to an action:

```typescript
if (action.type === AgentActionType.SendReaction) {
  const parameters = action.parameters as {
    didcommConnectionId: string
    didcommReactions: {
      messageId: string
      action: DidCommMessageReactionAction
      emoji: string
    }[]
  }

  const { didcommConnectionId, didcommReactions } = parameters

  return async (options: { agent: MobileAgent }) => {
    await options.agent.modules.reactions.send({
      connectionId: didcommConnectionId,
      reactions: didcommReactions,
    })
    return { outgoingMessageType: DidCommMessageReactionsMessage.type.messageTypeUri }
  }
}
```

### Handling Reaction Events

Subscribe to reaction events to update your UI or message store when reactions are received:

```typescript
import { MessageReactionsReceivedEvent } from '@2060.io/credo-ts-didcomm-reactions'

const messageReactionsReceivedListener = async (data: MessageReactionsReceivedEvent) => {
  const reactions = data.payload.reactions

  // Example: update message reactions in your store
  for (const reaction of reactions) {
    const relatedEntries = findAllByAssociatedMessageId(realm, reaction.messageId)
    for (const entry of relatedEntries) {
      const entryReactions = entry.reactions ? entry.reactions : []

      const reactionIndex = entryReactions.findIndex(
        (item) => item.role === ChatEntryRole.Receiver && item.emoji === reaction.emoji,
      )

      if (reaction.action === 'react' && reactionIndex === -1) {
        entryReactions.push({ emoji: reaction.emoji, role: ChatEntryRole.Receiver })
      }
      if (reaction.action === 'unreact' && reactionIndex !== -1) {
        entryReactions.splice(reactionIndex, 1)
      }
      entry.reactions = entryReactions
      entry.updatedAt = new Date().getTime()
    }
  }
}

// Subscribe to the event
agent.events.on('DidCommMessageReactionsReceived', messageReactionsReceivedListener)
```

## Features

- **Send Message Reactions**: React to messages with emojis or remove reactions.
- **Event Subscription**: Listen for reaction events to update UI or trigger workflows.
- **Protocol Integration**: Seamless integration with Credo agent and DIDComm protocols.

## API Reference

See the [source code](./src/) for details on available classes and methods:

- [`DidCommReactionsApi`](./src/DidCommReactionsApi.ts): Main API for sending reactions.
- [`DidCommReactionsService`](./src/services/DidCommReactionsService.ts): Internal service for reaction logic.
- [`DidCommReactionsModule`](./src/DidCommReactionsModule.ts): Module integration for Credo agent.

## License

Apache 2.0

---

For more information, see the [Credo documentation](https://github.com/openwallet-foundation/credo-ts.git).
