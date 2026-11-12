/**
 * Pure strict-input rules for sentence practice. Extracted so they can be
 * verified without a browser (scripts/verify-nce-logic.mjs).
 *
 * practiceText is the display and comparison target. Case sensitivity is
 * configurable (defaults to the word mode behaviour: ignore case), while
 * spaces and punctuation are always strict.
 */

export type RejectReason = 'composing' | 'too_long' | 'newline' | 'non_ascii' | 'pending_error'

export interface DecideOptions {
  isComposing?: boolean
  ignoreCase?: boolean
}

export interface InputDecision {
  accepted: boolean
  reason: RejectReason | null
  typed: string
  newWrongPositions: number[]
  isAppend: boolean
}

const ASCII_PRINTABLE = /^[\x20-\x7E]*$/
const TRAILING_PUNCTUATION = new Set(['.', ',', ';', ':', '!', '?', "'", '"', ')', ']', '}'])

export interface SplitText {
  /** Part the learner actually types. */
  core: string
  /** Sentence-final punctuation that is displayed but never typed. */
  trailing: string
}

/**
 * Sentence-final punctuation is shown but excluded from input and judgement.
 * Stripping stops at the first non-punctuation character from the right, so
 * apostrophes inside words (can't, It's) are never touched.
 */
export function splitTrailingPunctuation(text: string): SplitText {
  let end = text.length
  while (end > 0 && TRAILING_PUNCTUATION.has(text[end - 1])) end -= 1
  if (end === 0) return { core: text, trailing: '' }
  return { core: text.slice(0, end), trailing: text.slice(end) }
}

export function charsEqual(expected: string, actual: string, ignoreCase: boolean): boolean {
  if (expected === undefined || actual === undefined) return false
  return ignoreCase ? expected.toLowerCase() === actual.toLowerCase() : expected === actual
}

/** First position where the typed text disagrees with the target, or null. */
export function firstWrongIndex(target: string, typed: string, ignoreCase: boolean): number | null {
  for (let i = 0; i < typed.length; i++) {
    if (!charsEqual(target[i], typed[i], ignoreCase)) return i
  }
  return null
}

export function decideInput(target: string, previous: string, candidate: string, options: DecideOptions = {}): InputDecision {
  const { isComposing = false, ignoreCase = true } = options
  const reject = (reason: RejectReason): InputDecision => ({
    accepted: false,
    reason,
    typed: previous,
    newWrongPositions: [],
    isAppend: false,
  })

  if (isComposing) return reject('composing')
  if (candidate.length > target.length) return reject('too_long')
  if (candidate.includes('\n') || candidate.includes('\r')) return reject('newline')
  if (!ASCII_PRINTABLE.test(candidate)) return reject('non_ascii')

  const isAppend = candidate.length > previous.length
  // A wrong character must be corrected by backspace before typing continues,
  // otherwise every following character shifts and the whole line turns red.
  if (isAppend && firstWrongIndex(target, previous, ignoreCase) !== null) return reject('pending_error')

  const newWrongPositions: number[] = []
  for (let i = 0; i < candidate.length; i++) {
    if (!charsEqual(target[i], candidate[i], ignoreCase)) newWrongPositions.push(i)
  }
  return { accepted: true, reason: null, typed: candidate, newWrongPositions, isAppend }
}

export function isComplete(target: string, typed: string, ignoreCase = true): boolean {
  if (target.length === 0 || typed.length !== target.length) return false
  return firstWrongIndex(target, typed, ignoreCase) === null
}
