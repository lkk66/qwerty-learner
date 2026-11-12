import type { LivePracticeStats, NCEUnit, SentenceResult } from '../types'
import { charsEqual, decideInput, firstWrongIndex, isComplete, splitTrailingPunctuation } from '../utils/strictMatch'
import useKeySound from '@/hooks/useKeySounds'
import { isChineseSymbol } from '@/utils'
import { memo, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface Props {
  unit: NCEUnit
  showTranslation: boolean
  showAnswer: boolean
  ignoreCase: boolean
  /** Pause gate: while false no key is consumed and the typing clock stops. */
  active: boolean
  resetKey: number
  onLiveStats: (stats: LivePracticeStats) => void
  onComplete: (result: SentenceResult) => void
}

/**
 * Global keyboard capture, like the original word mode: no click needed.
 * Shows what the user actually typed (not the answer), so a correct character
 * is never painted red. A wrong character must be fixed with backspace before
 * typing continues, which prevents the whole line from shifting out of place.
 */
function SentencePractice({ unit, showTranslation, showAnswer, ignoreCase, active, resetKey, onLiveStats, onComplete }: Props) {
  const { core: target, trailing } = splitTrailingPunctuation(unit.practiceText)
  const [playKeySound, playBeepSound, playHintSound] = useKeySound()
  const [typed, setTyped] = useState('')
  const [imeHint, setImeHint] = useState(false)
  const [finished, setFinished] = useState(false)
  const wrongRef = useRef<Set<number>>(new Set())
  const keystrokesRef = useRef(0)
  const wrongKeystrokesRef = useRef(0)
  const completedRef = useRef(false)
  const activeRef = useRef(active)
  const typedOnceRef = useRef(false)
  const accumulatedMsRef = useRef(0)
  const segmentStartRef = useRef<number | null>(null)
  const onCompleteRef = useRef(onComplete)
  const onLiveStatsRef = useRef(onLiveStats)
  const soundsRef = useRef({ playKeySound, playBeepSound, playHintSound })

  const readElapsed = () => accumulatedMsRef.current + (segmentStartRef.current === null ? 0 : Date.now() - segmentStartRef.current)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])
  useEffect(() => {
    onLiveStatsRef.current = onLiveStats
  }, [onLiveStats])
  useEffect(() => {
    soundsRef.current = { playKeySound, playBeepSound, playHintSound }
  }, [playKeySound, playBeepSound, playHintSound])

  useEffect(() => {
    setTyped('')
    setImeHint(false)
    setFinished(false)
    wrongRef.current = new Set()
    keystrokesRef.current = 0
    wrongKeystrokesRef.current = 0
    completedRef.current = false
    typedOnceRef.current = false
    accumulatedMsRef.current = 0
    segmentStartRef.current = null
    onLiveStatsRef.current({ unitId: unit.id, elapsedMs: 0, keystrokes: 0, wrongKeystrokes: 0, errors: 0 })
  }, [unit.id, resetKey])

  useEffect(() => {
    if (activeRef.current === active) return
    activeRef.current = active
    if (active) {
      // Resume the typing clock only after the first keystroke.
      if (typedOnceRef.current && !completedRef.current) segmentStartRef.current = Date.now()
    } else {
      if (segmentStartRef.current !== null) {
        accumulatedMsRef.current += Date.now() - segmentStartRef.current
        segmentStartRef.current = null
      }
      onLiveStatsRef.current({
        unitId: unit.id,
        elapsedMs: accumulatedMsRef.current,
        keystrokes: keystrokesRef.current,
        wrongKeystrokes: wrongKeystrokesRef.current,
        errors: wrongRef.current.size,
      })
    }
  }, [active, unit.id])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!activeRef.current || completedRef.current) return
      const activeElement = document.activeElement
      if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) return
      if (event.altKey || event.ctrlKey || event.metaKey) return

      if (isChineseSymbol(event.key)) {
        event.preventDefault()
        setImeHint(true)
        return
      }
      if (event.key === 'Backspace') {
        event.preventDefault()
        setTyped((previous) => previous.slice(0, -1))
        soundsRef.current.playKeySound()
        return
      }
      if (event.key.length !== 1) return
      event.preventDefault()

      const candidate = typed + event.key
      const decision = decideInput(target, typed, candidate, { ignoreCase })
      if (!decision.accepted) {
        if (decision.reason === 'pending_error') soundsRef.current.playBeepSound()
        if (decision.reason === 'non_ascii') setImeHint(true)
        return
      }

      setImeHint(false)
      const isCorrect = charsEqual(target[typed.length], event.key, ignoreCase)
      keystrokesRef.current += 1
      if (isCorrect) {
        soundsRef.current.playKeySound()
      } else {
        wrongKeystrokesRef.current += 1
        soundsRef.current.playBeepSound()
      }
      decision.newWrongPositions.forEach((position) => wrongRef.current.add(position))
      if (!typedOnceRef.current) {
        typedOnceRef.current = true
        segmentStartRef.current = Date.now()
      }
      setTyped(decision.typed)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [typed, target, ignoreCase])

  useEffect(() => {
    if (isComplete(target, typed, ignoreCase) && !completedRef.current) {
      completedRef.current = true
      setFinished(true)
      soundsRef.current.playHintSound()
      if (segmentStartRef.current !== null) {
        accumulatedMsRef.current += Date.now() - segmentStartRef.current
        segmentStartRef.current = null
      }
      const result: SentenceResult = {
        errors: wrongRef.current.size,
        wrongPositions: Array.from(wrongRef.current).sort((a, b) => a - b),
        elapsedMs: accumulatedMsRef.current,
        keystrokes: keystrokesRef.current,
        wrongKeystrokes: wrongKeystrokesRef.current,
      }
      onLiveStatsRef.current({
        unitId: unit.id,
        elapsedMs: result.elapsedMs,
        keystrokes: result.keystrokes,
        wrongKeystrokes: result.wrongKeystrokes,
        errors: result.errors,
      })
      // Short buffer: a learner reflexively typing the sentence-final dot is
      // absorbed here instead of becoming the first character of the next unit.
      const timer = window.setTimeout(() => onCompleteRef.current(result), 250)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [typed, target, ignoreCase, unit.id])

  useEffect(() => {
    if (!active || finished) return undefined
    const timer = window.setInterval(() => {
      onLiveStatsRef.current({
        unitId: unit.id,
        elapsedMs: readElapsed(),
        keystrokes: keystrokesRef.current,
        wrongKeystrokes: wrongKeystrokesRef.current,
        errors: wrongRef.current.size,
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [active, finished, unit.id])

  const pendingError = firstWrongIndex(target, typed, ignoreCase) !== null
  const chars: ReactNode[] = []
  Array.from(target).forEach((char, i) => {
    if (i === typed.length && !finished && active) {
      chars.push(
        <span key={`caret-${i}`} className="animate-pulse font-normal text-indigo-500">
          |
        </span>,
      )
    }
    let display: string = char
    let tone = 'text-gray-400 dark:text-gray-500'
    if (i < typed.length) {
      display = typed[i]
      tone = charsEqual(char, typed[i], ignoreCase)
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'rounded bg-red-200 text-red-700 dark:bg-red-900 dark:text-red-200'
    } else if (!showAnswer) {
      display = char === ' ' ? '\u00A0' : '·'
    }
    chars.push(
      <span key={i} className={tone}>
        {display}
      </span>,
    )
  })

  return (
    <div className="w-full">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <p className={`whitespace-pre-wrap font-mono text-xl leading-relaxed tracking-wide ${showAnswer ? 'break-words' : 'break-all'}`}>
          {chars}
          {trailing && (
            <span className="text-gray-400 dark:text-gray-500" title="句尾标点无需录入">
              {trailing}
            </span>
          )}
        </p>
      </div>

      {showTranslation && <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300">{unit.chinese}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
        <span>
          已输入 {typed.length} / {target.length}
        </span>
        <span>错误位置 {wrongRef.current.size}</span>
        <span>直接打字即可 · 句尾标点免录入</span>
        {finished && <span className="text-emerald-600 dark:text-emerald-400">本句完成</span>}
        {pendingError && !finished && <span className="text-red-600 dark:text-red-300">请先退格修正红色字符再继续</span>}
        {imeHint && <span className="text-amber-600 dark:text-amber-400">请切换到英文输入法</span>}
      </div>
    </div>
  )
}

export default memo(SentencePractice)
