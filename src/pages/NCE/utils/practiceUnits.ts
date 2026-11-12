import type { NCEUnit, PracticeMode } from '../types'

export function practiceUnits(sentenceUnits: NCEUnit[], mode: PracticeMode, lessonId: string): NCEUnit[] {
  if (mode !== 'article' || sentenceUnits.length === 0) return sentenceUnits
  const first = sentenceUnits[0]
  const last = sentenceUnits[sentenceUnits.length - 1]
  return [
    {
      ...first,
      id: `article-${lessonId}`,
      cueIds: sentenceUnits.flatMap((unit) => unit.cueIds),
      sourceEnglish: sentenceUnits.map((unit) => unit.sourceEnglish).join(' '),
      practiceText: sentenceUnits.map((unit) => unit.practiceText).join(' '),
      chinese: sentenceUnits.map((unit) => unit.chinese).join(' '),
      endMs: last.endMs,
      endMsSource: last.endMsSource,
      endTrimMs: last.endTrimMs,
      alignment: sentenceUnits.some((unit) => unit.alignment?.reason === 'HUMAN_AUDIO_REJECTED')
        ? { method: 'review', status: 'requires_review', reason: 'HUMAN_AUDIO_REJECTED', startMs: first.startMs, endMs: last.endMs }
        : undefined,
    },
  ]
}
