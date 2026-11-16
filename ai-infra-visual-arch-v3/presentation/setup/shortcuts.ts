import { defineShortcutsSetup } from '@slidev/types'

// Slidev next/prev consumes clicks first, then changes slides.
export default defineShortcutsSetup((_context, shortcuts) => shortcuts)
