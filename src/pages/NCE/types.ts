/** Frozen schemaVersion 1 — mirrors nce-tool/schema/nce-lesson.schema.json. */

export type EndMsSource = 'next_cue' | 'audio_duration' | 'manual' | 'unknown'
export type UnitKind = 'intro' | 'title' | 'question' | 'body'
export type ReviewStatus = 'approved' | 'review' | 'blocked'
export type PracticeMode = 'sentence' | 'article'

export interface NCECue {
  id: string
  sourceEnglish: string
  practiceText: string
  chinese: string
  startMs: number
  endMs: number | null
  endMsSource: EndMsSource
  kind: UnitKind
}

export interface NCEMergeReason {
  code: string
  detail: string | number
}

export interface NCEUnit {
  id: string
  cueIds: string[]
  sourceEnglish: string
  /** The single text used for display AND strict input matching. */
  practiceText: string
  chinese: string
  startMs: number
  endMs: number | null
  endMsSource: EndMsSource
  endTrimMs: number
  kind: UnitKind
  reviewStatus: ReviewStatus
  reviewReasons: string[]
  mergeReasons: NCEMergeReason[]
  signals: string[]
  practicable: boolean
  humanConfirmed: boolean
  alignment?: {
    method: string
    status: string
    startMs: number
    endMs: number | null
    reason: string | null
  }
}

export interface NCEAudio {
  url: string | null
  durationMs: number | null
  verified: boolean
  status: string
  error: string | null
}

export interface NCELesson {
  schemaVersion: number
  id: string
  book: number
  lessonNumbers: number[]
  lessonLabel: string
  title: string
  audio: NCEAudio | null
  playback: { defaultEndTrimMs: number; note: string }
  cues: NCECue[]
  units: NCEUnit[]
  counts: {
    totalCues: number
    totalUnits: number
    approvedUnits: number
    reviewUnits: number
    blockedUnits: number
    practicableUnits: number
    mergedUnits: number
  }
}

export interface NCECatalogEntry {
  id: string
  book: number
  lessonNumbers: number[]
  lessonLabel: string
  title: string
  audioUrl: string | null
  audioStatus: string
  path: string
  counts: NCELesson['counts']
}

export interface NCECatalog {
  schemaVersion: number
  generatedAt: string
  lessons: NCECatalogEntry[]
  summary: Record<string, number>
}

export interface NCEPracticeSettings {
  mode: PracticeMode
  showTranslation: boolean
  /** Show the not-yet-typed target characters, or hide them for dictation-style practice. */
  showAnswer: boolean
  /** Match the word mode default (isIgnoreCaseAtom = true). Punctuation stays strict. */
  ignoreCase: boolean
  /** Include auto-merged Units that are still pending human review. Off by default. */
  includeReviewUnits: boolean
  autoPlay: boolean
  /** Extra tail trim applied by the player; automatic endMs is not the true end of speech. */
  endTrimMs: number
}

export const defaultSettings: NCEPracticeSettings = {
  mode: 'sentence',
  showTranslation: true,
  showAnswer: true,
  ignoreCase: true,
  includeReviewUnits: false,
  autoPlay: true,
  endTrimMs: 0,
}

export interface SentenceResult {
  /** Number of distinct wrong character positions. */
  errors: number
  wrongPositions: number[]
  /** Effective typing time, excluding pauses and pre-typing reading time. */
  elapsedMs: number
  /** Accepted character inputs, excluding backspace. */
  keystrokes: number
  /** Accepted inputs that did not match the target character. */
  wrongKeystrokes: number
}

export interface UnitPracticeResult {
  unitId: string
  practiceText: string
  errors: number
  wrongPositions: number[]
  elapsedMs: number
  keystrokes: number
  wrongKeystrokes: number
}

export interface LivePracticeStats {
  unitId: string | null
  elapsedMs: number
  keystrokes: number
  wrongKeystrokes: number
  errors: number
}
