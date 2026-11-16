import { defineShortcutsSetup } from '@slidev/types'

// Route standard presenter keys through the current scene before leaving its page.
// A single shortcut owns each key; child iframes forward only at their boundary.
export default defineShortcutsSetup((context, shortcuts) => {
  const forward = new Set(['next_space', 'next_right', 'next_page_key', 'next_down'])
  const backward = new Set(['prev_space', 'prev_left', 'prev_page_key', 'prev_up'])
  return shortcuts.map(shortcut => {
    const direction = forward.has(shortcut.name || '') ? 1 : backward.has(shortcut.name || '') ? -1 : 0
    if (!direction) return shortcut
    return {...shortcut, fn: () => {
      const no = Number(location.pathname.match(/\/(\d+)\/?$/)?.[1])
      const scene = document.querySelector(`.slidev-page-${no} .slide`) as HTMLElement & {__deckAdvance?: (direction: number) => boolean}
      if (scene && !scene.__deckAdvance) return
      if (scene?.__deckAdvance?.(direction)) return
      direction > 0 ? context.next() : context.prev()
    }}
  })
})
