// In-memory pub/sub used to push chat activity to connected clients over SSE.
//
// This works for a single Node process. For multi-instance deployments, swap
// the implementation for Redis pub/sub or a similar shared transport; the
// publish/subscribe surface below is intentionally tiny to make that easy.

import type { ChatMessageDTO } from "@/lib/chat/service";

export type ChatEvent =
  | { type: "message"; conversationId: string; organizationId: string; message: ChatMessageDTO }
  | { type: "conversation"; conversationId: string; organizationId: string }
  | { type: "ping" };

type Listener = (event: ChatEvent) => void;

class ChatBus {
  private listeners = new Map<string, Set<Listener>>();
  private counter = 0;

  subscribe(topic: string, listener: Listener): () => void {
    let set = this.listeners.get(topic);
    if (!set) {
      set = new Set();
      this.listeners.set(topic, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) this.listeners.delete(topic);
    };
  }

  publish(topic: string, event: ChatEvent): void {
    const set = this.listeners.get(topic);
    if (!set) return;
    this.counter += 1;
    for (const listener of [...set]) {
      try {
        listener(event);
      } catch {
        // A dropped client must never break the publisher.
      }
    }
  }

  topicCount(topic: string): number {
    return this.listeners.get(topic)?.size ?? 0;
  }
}

const globalForBus = globalThis as unknown as { __hdfChatBus?: ChatBus };

export const chatBus: ChatBus = (globalForBus.__hdfChatBus ??= new ChatBus());
