/** Handler for a single event type. */
export type EventHandler<T> = (payload: T) => void

/** Minimal, type-safe publish/subscribe bus (Observer pattern). */
export interface EventBus<Events extends object> {
  on<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): () => void
  off<K extends keyof Events>(type: K, handler: EventHandler<Events[K]>): void
  emit<K extends keyof Events>(type: K, payload: Events[K]): void
  clear(): void
}

/** Creates an {@link EventBus}. `on` returns an unsubscribe function. */
export function createEventBus<Events extends object>(): EventBus<Events> {
  const handlers = new Map<keyof Events, Set<EventHandler<never>>>()
  return {
    on(type, handler) {
      let set = handlers.get(type)
      if (!set) handlers.set(type, (set = new Set()))
      set.add(handler as EventHandler<never>)
      return () => this.off(type, handler)
    },
    off(type, handler) {
      handlers.get(type)?.delete(handler as EventHandler<never>)
    },
    emit(type, payload) {
      for (const handler of [...(handlers.get(type) ?? [])]) {
        ;(handler as EventHandler<typeof payload>)(payload)
      }
    },
    clear() {
      handlers.clear()
    },
  }
}
