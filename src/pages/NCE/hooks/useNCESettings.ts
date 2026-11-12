import { type NCEPracticeSettings, defaultSettings } from '../types'
import { atom, useAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

/** Merge with defaults so settings saved by an older build keep sane values. */
const storedSettingsAtom = atomWithStorage<Partial<NCEPracticeSettings>>('ncePracticeSettings', {})

const settingsAtom = atom(
  (get): NCEPracticeSettings => ({ ...defaultSettings, ...get(storedSettingsAtom) }),
  (_get, set, next: NCEPracticeSettings) => set(storedSettingsAtom, next),
)

export function useNCESettings() {
  return useAtom(settingsAtom)
}
