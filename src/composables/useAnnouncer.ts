import { nextTick, readonly, ref } from 'vue'

const message = ref('')
let sequence = 0

/**
 * Screen-reader announcements through a single polite live region.
 * Clearing before setting makes repeated identical messages re-announce.
 */
export function useAnnouncer() {
  async function announce(text: string): Promise<void> {
    const id = ++sequence
    message.value = ''
    await nextTick()
    if (id === sequence) message.value = text
  }

  return { announcement: readonly(message), announce }
}
