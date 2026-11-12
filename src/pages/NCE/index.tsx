import LessonPicker from './components/LessonPicker'
import LessonResult from './components/LessonResult'
import LessonSpeed from './components/LessonSpeed'
import PracticeSettings from './components/PracticeSettings'
import SentenceList from './components/SentenceList'
import SentenceNav from './components/SentenceNav'
import SentencePractice from './components/SentencePractice'
import { saveMistake } from './db'
import { useLessonSession } from './hooks/useLessonSession'
import { useNCECatalog } from './hooks/useNCECatalog'
import { useNCELesson } from './hooks/useNCELesson'
import { useNCEProgress } from './hooks/useNCEProgress'
import { useNCESettings } from './hooks/useNCESettings'
import { useSegmentAudio } from './hooks/useSegmentAudio'
import type { NCECatalogEntry, NCEPracticeSettings, SentenceResult } from './types'
import { practiceUnits } from './utils/practiceUnits'
import Header from '@/components/Header'
import Layout from '@/components/Layout'
import Tooltip from '@/components/Tooltip'
import { useConfetti } from '@/pages/Typing/hooks/useConfetti'
import { isOpenDarkModeAtom } from '@/store'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { NavLink } from 'react-router-dom'
import IconEyeSlash from '~icons/heroicons/eye-slash-solid'
import IconEye from '~icons/heroicons/eye-solid'
import IconMoon from '~icons/heroicons/moon-solid'
import IconSun from '~icons/heroicons/sun-solid'
import IconMaximize from '~icons/tabler/arrows-maximize'
import IconLanguage from '~icons/tabler/language'
import IconLanguageOff from '~icons/tabler/language-off'

const LAST_LESSON_KEY = 'nceLastLessonId'

const navClass =
  'block whitespace-nowrap rounded-lg px-3 py-1 text-sm transition-colors duration-300 hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-gray-200'

const iconButtonClass =
  'flex items-center justify-center rounded p-1 text-lg text-gray-500 transition-colors hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-gray-300'

const outlineButton =
  'rounded border border-gray-300 px-3 py-1 text-sm transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'

function rememberLesson(id: string) {
  try {
    window.localStorage.setItem(LAST_LESSON_KEY, id)
  } catch {
    // localStorage may be unavailable in embedded contexts
  }
}

export default function NCEPage() {
  const { catalog, error: catalogError, reload } = useNCECatalog()
  const [settings, setSettings] = useNCESettings()
  const [isOpenDarkMode, setIsOpenDarkMode] = useAtom(isOpenDarkModeAtom)
  const [selected, setSelected] = useState<NCECatalogEntry | null>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [selectionRestored, setSelectionRestored] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [flash, setFlash] = useState<string | null>(null)
  const {
    results: sessionResults,
    skipped: skippedUnits,
    totals: sessionTotals,
    wrongResults,
    recordResult,
    recordSkip,
    updateLive,
    resetLive,
    reset: resetSession,
  } = useLessonSession()
  const skipAutoPlayRef = useRef(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!catalog || selectionRestored) return
    setSelectionRestored(true)
    try {
      const savedId = window.localStorage.getItem(LAST_LESSON_KEY)
      if (savedId) {
        const found = catalog.lessons.find((entry) => entry.id === savedId)
        if (found) setSelected(found)
      }
    } catch {
      // localStorage may be unavailable in embedded contexts
    }
  }, [catalog, selectionRestored])

  const nextEntry = useMemo(() => {
    if (!catalog || !selected) return null
    const position = catalog.lessons.findIndex((entry) => entry.id === selected.id)
    return position >= 0 && position + 1 < catalog.lessons.length ? catalog.lessons[position + 1] : null
  }, [catalog, selected])

  const { lesson, error: lessonError, isLoading } = useNCELesson(selected?.path ?? null)
  const sentenceUnits = useMemo(
    () =>
      (lesson?.units ?? []).filter(
        (unit) => unit.practicable || (settings.includeReviewUnits && unit.kind === 'body' && unit.reviewStatus === 'review'),
      ),
    [lesson, settings.includeReviewUnits],
  )
  const units = useMemo(() => practiceUnits(sentenceUnits, settings.mode, lesson?.id ?? ''), [sentenceUnits, settings.mode, lesson?.id])
  const unitIds = useMemo(() => units.map((unit) => unit.id), [units])
  const allUnitIds = useMemo(() => (lesson?.units ?? []).map((unit) => unit.id), [lesson])
  const { index, setIndex, restored, notice, persist, reset } = useNCEProgress(selected?.id ?? null, settings.mode, unitIds, allUnitIds)
  const audio = useSegmentAudio(lesson?.audio?.url ?? null, lesson?.audio?.durationMs ?? null, settings.endTrimMs)
  const playAudio = audio.play
  const stopAudio = audio.stop

  const lessonReady = Boolean(selected && lesson && lesson.id === selected.id)
  const practiceReady = Boolean(lessonReady && units.length > 0 && restored)
  const canPractice = practiceReady && index < units.length
  const isLessonFinished = practiceReady && index >= units.length
  const showResult = started && isLessonFinished
  const current = practiceReady ? units[index] : undefined
  const prevUnit = practiceReady && index > 0 ? units[index - 1] : null
  const nextUnit = practiceReady && index + 1 < units.length ? units[index + 1] : null
  const audioUnavailable = Boolean(lessonReady && lesson && (!lesson.audio?.verified || !lesson.audio?.url))

  useEffect(() => {
    resetSession()
    setResetKey((key) => key + 1)
    setPaused(false)
    setStarted(false)
    stopAudio()
  }, [selected?.id, settings.mode, settings.includeReviewUnits, resetSession, stopAudio])

  const playRef = useRef(playAudio)
  useEffect(() => {
    playRef.current = playAudio
  }, [playAudio])

  useEffect(() => {
    if (!started || paused || !restored || !current || !settings.autoPlay) return
    if (skipAutoPlayRef.current) {
      skipAutoPlayRef.current = false
      return
    }
    void playRef.current(current)
    // Playback follows the sentence, not every settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, started, paused, restored, settings.autoPlay])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [current?.id])

  const handleSelect = (entry: NCECatalogEntry) => {
    stopAudio()
    setSelected(entry)
    setStarted(false)
    setPaused(false)
    setListOpen(false)
    resetSession()
    rememberLesson(entry.id)
  }

  const handleStart = useCallback(() => {
    if (!current) return
    setStarted(true)
    setPaused(false)
    if (settings.autoPlay) {
      skipAutoPlayRef.current = true
      void playAudio(current)
    }
  }, [current, settings.autoPlay, playAudio])

  const handleTogglePause = useCallback(() => {
    if (!started || isLessonFinished) return
    if (!paused) stopAudio()
    setPaused(!paused)
  }, [started, isLessonFinished, paused, stopAudio])

  const handleComplete = useCallback(
    (result: SentenceResult) => {
      if (!selected || !current) return
      recordResult(current, result)
      if (result.errors > 0) {
        void saveMistake(selected.id, current.id, current.practiceText, result.wrongPositions).catch(() => undefined)
      }
      const next = index + 1
      if (next >= units.length) {
        setPaused(false)
        setListOpen(false)
        stopAudio()
      }
      setIndex(next)
      void persist(next, units[next]?.id ?? current.id, next >= units.length)
    },
    [selected, current, index, units, recordResult, setIndex, persist, stopAudio],
  )

  const handleSkip = useCallback(() => {
    if (!current) return
    recordSkip(current)
    resetLive()
    const next = Math.min(index + 1, units.length)
    if (next >= units.length) {
      setPaused(false)
      setListOpen(false)
      stopAudio()
    }
    setIndex(next)
    void persist(next, units[next]?.id ?? current.id, next >= units.length)
  }, [current, index, units, recordSkip, resetLive, setIndex, persist, stopAudio])

  const handleNavigate = useCallback(
    (target: number) => {
      if (target < 0 || target >= units.length) return
      stopAudio()
      resetLive()
      setIndex(target)
      setPaused(false)
      void persist(target, units[target].id, false)
    },
    [units, stopAudio, resetLive, setIndex, persist],
  )

  const handleRestart = useCallback(
    async (autoStart = true) => {
      const needsManualPlay = started && !paused && current?.id === units[0]?.id
      await reset()
      resetSession()
      setResetKey((key) => key + 1)
      setPaused(false)
      setListOpen(false)
      setStarted(autoStart)
      stopAudio()
      if (autoStart && settings.autoPlay && units[0] && needsManualPlay) {
        void playAudio(units[0])
      }
    },
    [started, paused, current?.id, units, reset, resetSession, stopAudio, playAudio, settings.autoPlay],
  )

  const handleDictationRestart = useCallback(() => {
    setSettings({ ...settings, showAnswer: false })
    void handleRestart(true)
  }, [settings, setSettings, handleRestart])

  const handleNextLesson = useCallback(() => {
    if (!nextEntry) {
      setFlash('已经是最后一课，可以重新练习巩固')
      return
    }
    stopAudio()
    resetSession()
    setResetKey((key) => key + 1)
    setSelected(nextEntry)
    setStarted(false)
    setPaused(false)
    setListOpen(false)
    setShowSettings(false)
    rememberLesson(nextEntry.id)
  }, [nextEntry, stopAudio, resetSession])

  const handleExit = useCallback(() => {
    stopAudio()
    resetSession()
    setSelected(null)
    setStarted(false)
    setPaused(false)
    setListOpen(false)
    setShowSettings(false)
    setImmersive(false)
  }, [stopAudio, resetSession])

  const handleRetryUnit = useCallback(
    (unitId: string) => {
      const target = units.findIndex((unit) => unit.id === unitId)
      if (target >= 0) handleNavigate(target)
    },
    [units, handleNavigate],
  )

  const handleOpenList = () => {
    if (started && !isLessonFinished) {
      stopAudio()
      setPaused(true)
    }
    setListOpen(true)
  }

  const handleJumpToList = (target: number) => {
    setListOpen(false)
    handleNavigate(target)
  }

  const toggleShowAnswer = () => setSettings({ ...settings, showAnswer: !settings.showAnswer })
  const toggleTranslation = () => setSettings({ ...settings, showTranslation: !settings.showTranslation })

  const handleSettingsChange = (next: NCEPracticeSettings) => {
    if (next.mode !== settings.mode || next.includeReviewUnits !== settings.includeReviewUnits) {
      setStarted(false)
      setPaused(false)
      stopAudio()
    }
    setSettings(next)
  }

  const toggleImmersive = () => {
    const next = !immersive
    setImmersive(next)
    setShowSettings(false)
    setListOpen(false)
    if (next) setFlash('再次按下 Alt + M 可退出沉浸模式')
  }

  useEffect(() => {
    if (!flash) return undefined
    const timer = window.setTimeout(() => setFlash(null), 2000)
    return () => window.clearTimeout(timer)
  }, [flash])

  useHotkeys(
    'enter',
    () => {
      if (!started) {
        handleStart()
      } else if (isLessonFinished) {
        handleNextLesson()
      } else {
        handleTogglePause()
      }
    },
    { preventDefault: true, enabled: practiceReady && !paused && !listOpen },
    [started, isLessonFinished, practiceReady, paused, listOpen, handleStart, handleNextLesson, handleTogglePause],
  )

  useHotkeys(
    'space',
    () => {
      void handleRestart(true)
    },
    { preventDefault: true, enabled: isLessonFinished && !listOpen },
    [isLessonFinished, listOpen, handleRestart],
  )

  useHotkeys('shift+enter', handleDictationRestart, { preventDefault: true, enabled: isLessonFinished && !listOpen }, [
    isLessonFinished,
    listOpen,
    handleDictationRestart,
  ])

  useHotkeys(
    'esc',
    () => {
      if (isLessonFinished) {
        handleExit()
      } else if (started) {
        handleTogglePause()
      }
    },
    { preventDefault: true, enabled: Boolean(selected) && !listOpen },
    [selected, listOpen, isLessonFinished, started, handleExit, handleTogglePause],
  )

  useHotkeys('alt+s', handleSkip, { preventDefault: true, enabled: canPractice && started && !paused && !listOpen }, [
    canPractice,
    started,
    paused,
    listOpen,
    handleSkip,
  ])

  useHotkeys(
    'ctrl+j',
    () => {
      if (current) void playAudio(current)
    },
    { preventDefault: true, enabled: canPractice && started && !paused && !listOpen },
    [canPractice, started, paused, listOpen, current, playAudio],
  )

  useHotkeys('ctrl+shift+v', toggleTranslation, { preventDefault: true, enabled: Boolean(selected) }, [selected, toggleTranslation])

  useHotkeys('ctrl+v', toggleShowAnswer, { preventDefault: true, enabled: Boolean(selected) }, [selected, toggleShowAnswer])

  useHotkeys('alt+m', toggleImmersive, { preventDefault: true, enabled: Boolean(selected) }, [selected, toggleImmersive])

  useHotkeys('ctrl+d', () => setIsOpenDarkMode((old) => !old), { preventDefault: true, enableOnFormTags: true }, [setIsOpenDarkMode])

  useHotkeys(
    'ctrl+shift+arrowleft',
    () => {
      if (prevUnit) handleNavigate(index - 1)
    },
    {
      preventDefault: true,
      enabled: canPractice && started && !paused && !listOpen && settings.mode === 'sentence',
    },
    [canPractice, started, paused, listOpen, settings.mode, prevUnit, index, handleNavigate],
  )

  useHotkeys(
    'ctrl+shift+arrowright',
    () => {
      if (nextUnit) handleNavigate(index + 1)
    },
    {
      preventDefault: true,
      enabled: canPractice && started && !paused && !listOpen && settings.mode === 'sentence',
    },
    [canPractice, started, paused, listOpen, settings.mode, nextUnit, index, handleNavigate],
  )

  useEffect(() => {
    if (!paused || !started || listOpen) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key === 'Enter' || event.key.length === 1) {
        event.preventDefault()
        setPaused(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [paused, started, listOpen])

  useEffect(() => {
    if (started || paused || listOpen || showSettings || !canPractice) return undefined
    const onKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      if (activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeElement.tagName)) return
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.key.length === 1) {
        event.preventDefault()
        handleStart()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [started, paused, listOpen, showSettings, canPractice, handleStart])

  useEffect(() => {
    if (!started || paused || !canPractice) return undefined
    const onBlur = () => {
      stopAudio()
      setPaused(true)
    }
    window.addEventListener('blur', onBlur)
    return () => window.removeEventListener('blur', onBlur)
  }, [started, paused, canPractice, stopAudio])

  useConfetti(showResult)

  const audioStatusText =
    audio.status === 'playing'
      ? '朗读中…'
      : audio.status === 'blocked'
      ? '自动播放被拦截，请点击朗读'
      : audio.status === 'error'
      ? audio.error
      : ''

  return (
    <Layout>
      {flash && (
        <div
          className="pointer-events-none fixed left-1/2 top-6 z-40 -translate-x-1/2 rounded-lg bg-gray-800/90 px-4 py-2 text-sm text-white shadow-lg dark:bg-gray-100/90 dark:text-gray-900"
          role="status"
        >
          {flash}
        </div>
      )}
      {!immersive && (
        <Header>
          <NavLink to="/" className={navClass}>
            单词练习
          </NavLink>
          <span className="whitespace-nowrap px-2 text-sm font-medium text-gray-700 dark:text-gray-200">新概念英语</span>
          {selected && (
            <button type="button" className={navClass} onClick={handleExit}>
              选课
            </button>
          )}
          {selected && (
            <button type="button" className={navClass} onClick={() => setShowSettings((value) => !value)}>
              设置
            </button>
          )}
          {selected && (
            <>
              <Tooltip content="显示答案（Ctrl + V）">
                <button
                  type="button"
                  className={`${iconButtonClass} ${settings.showAnswer ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                  onClick={toggleShowAnswer}
                  aria-label="显示答案"
                >
                  {settings.showAnswer ? <IconEye /> : <IconEyeSlash />}
                </button>
              </Tooltip>
              <Tooltip content="显示中文翻译（Ctrl + Shift + V）">
                <button
                  type="button"
                  className={`${iconButtonClass} ${settings.showTranslation ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                  onClick={toggleTranslation}
                  aria-label="显示中文翻译"
                >
                  {settings.showTranslation ? <IconLanguage /> : <IconLanguageOff />}
                </button>
              </Tooltip>
            </>
          )}
          <Tooltip content="深色模式（Ctrl + D）">
            <button type="button" className={iconButtonClass} onClick={() => setIsOpenDarkMode((old) => !old)} aria-label="切换深色模式">
              {isOpenDarkMode ? <IconMoon /> : <IconSun />}
            </button>
          </Tooltip>
          {selected && (
            <Tooltip content="沉浸模式（Alt + M）">
              <button
                type="button"
                className={`${iconButtonClass} ${immersive ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
                onClick={toggleImmersive}
                aria-label="切换沉浸模式"
              >
                <IconMaximize />
              </button>
            </Tooltip>
          )}
        </Header>
      )}

      <div ref={scrollRef} className="w-full flex-1 overflow-auto">
        {catalogError && (
          <div className="mx-auto max-w-2xl rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">
            {catalogError}
            <button type="button" className="ml-3 underline" onClick={reload}>
              重试
            </button>
          </div>
        )}

        {catalog && !selected && <LessonPicker catalog={catalog} selectedId={null} onSelect={handleSelect} />}

        {selected && (
          <div className="mx-auto w-full max-w-4xl space-y-4 px-6 pb-10 pt-4">
            {showSettings && !immersive && <PracticeSettings settings={settings} onChange={handleSettingsChange} />}

            {lessonReady && units.length > 0 && !immersive && (
              <>
                <div className="flex items-baseline justify-between">
                  <h1 className="text-lg font-medium text-gray-800 dark:text-gray-100">
                    {selected.lessonLabel} · {selected.title}
                  </h1>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    第 {Math.min(index + 1, units.length)} / {units.length} 句
                  </span>
                </div>

                <div className="h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full rounded bg-indigo-500 transition-all"
                    style={{ width: `${(Math.min(index, units.length) / units.length) * 100}%` }}
                  />
                </div>
              </>
            )}

            {lessonError && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-200">{lessonError}</div>
            )}
            {notice && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">{notice}</div>
            )}
            {isLoading && <div className="text-sm text-gray-500 dark:text-gray-400">课文加载中…</div>}

            {lessonReady && units.length === 0 && (
              <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                本课没有已通过审核的可练习句子，请先在转换器中完成人工复核。
              </div>
            )}

            {audioUnavailable && (
              <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                本课音频不可用，打字练习不受影响。
              </div>
            )}

            {lessonReady && units.length > 0 && !restored && <div className="text-sm text-gray-500 dark:text-gray-400">进度恢复中…</div>}

            {lessonReady && units.length > 0 && restored && isLessonFinished && !started && (
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                <div className="text-lg font-medium text-gray-800 dark:text-gray-100">本课练习完成</div>
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">共 {units.length} 句</div>
                {nextEntry && (
                  <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    下一课：{nextEntry.lessonLabel} · {nextEntry.title}
                  </div>
                )}
                <div className="mt-5 flex flex-wrap justify-center gap-3">
                  {nextEntry && (
                    <Tooltip content="快捷键：Enter">
                      <button type="button" className="my-btn-primary" onClick={handleNextLesson}>
                        下一课
                      </button>
                    </Tooltip>
                  )}
                  <Tooltip content="快捷键：Space">
                    <button type="button" className={outlineButton} onClick={() => void handleRestart(true)}>
                      重新练习
                    </button>
                  </Tooltip>
                  <Tooltip content="快捷键：Shift + Enter">
                    <button type="button" className={outlineButton} onClick={handleDictationRestart}>
                      默写重练
                    </button>
                  </Tooltip>
                  <Tooltip content="快捷键：Esc">
                    <button type="button" className={outlineButton} onClick={handleExit}>
                      返回选课
                    </button>
                  </Tooltip>
                </div>
                <div className="mt-4 text-[11px] text-gray-400 dark:text-gray-500">
                  Enter 下一课 · Space 重新练习 · Shift+Enter 默写重练 · Esc 返回选课
                </div>
              </div>
            )}

            {lessonReady && units.length > 0 && restored && !isLessonFinished && (
              <>
                {started && current ? (
                  <>
                    <div className="relative">
                      <SentencePractice
                        key={current.id}
                        unit={current}
                        showTranslation={settings.showTranslation}
                        showAnswer={settings.showAnswer}
                        ignoreCase={settings.ignoreCase}
                        active={!paused}
                        resetKey={resetKey}
                        onLiveStats={updateLive}
                        onComplete={handleComplete}
                      />
                      {paused && (
                        <button
                          type="button"
                          onClick={handleTogglePause}
                          className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/60 backdrop-blur-sm dark:bg-gray-900/60"
                          aria-label="继续练习"
                        >
                          <span className="text-center">
                            <span className="block text-lg font-medium text-gray-800 dark:text-gray-100">已暂停</span>
                            <span className="mt-1 block text-sm text-gray-500 dark:text-gray-400">按 Enter 或任意键继续</span>
                          </span>
                        </button>
                      )}
                    </div>

                    {!immersive && settings.mode === 'sentence' && (
                      <SentenceNav
                        prev={prevUnit}
                        next={nextUnit}
                        showTranslation={settings.showTranslation}
                        showAnswer={settings.showAnswer}
                        onPrev={() => handleNavigate(index - 1)}
                        onNext={() => handleNavigate(index + 1)}
                      />
                    )}

                    {!immersive ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <Tooltip content="快捷键：Ctrl + J">
                            <button
                              type="button"
                              className={outlineButton}
                              onClick={() => {
                                if (current) void playAudio(current)
                              }}
                            >
                              {audio.status === 'blocked' ? '点击朗读' : '重播朗读'}
                            </button>
                          </Tooltip>
                          <Tooltip content="快捷键：Alt + S">
                            <button type="button" className={outlineButton} onClick={handleSkip}>
                              跳过本句
                            </button>
                          </Tooltip>
                          <button type="button" className={outlineButton} onClick={() => setResetKey((key) => key + 1)}>
                            清空重打
                          </button>
                          <Tooltip content="快捷键：Enter">
                            <button type="button" className={outlineButton} onClick={handleTogglePause}>
                              {paused ? '继续' : '暂停'}
                            </button>
                          </Tooltip>
                          <button type="button" className={outlineButton} onClick={() => void handleRestart(true)}>
                            从头开始
                          </button>
                          <span className="text-xs text-gray-500 dark:text-gray-400">{audioStatusText}</span>
                        </div>

                        <div className="text-[11px] text-gray-400 dark:text-gray-500">
                          Alt+S 跳过 · Ctrl+J 重播 · Enter 暂停 · Ctrl+Shift+←/→ 切句 · Ctrl+Shift+V 翻译 · Ctrl+V 答案 · Alt+M 沉浸
                        </div>
                      </>
                    ) : (
                      <div className="text-center text-[11px] text-gray-400 dark:text-gray-500">
                        Alt+M 退出沉浸 · Enter 暂停 · Alt+S 跳过 · Ctrl+J 重播
                        {audio.status === 'blocked' ? ' · 自动播放被拦截，Ctrl+J 可朗读' : ''}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-xl border border-gray-200 bg-white p-8 text-center dark:border-gray-700 dark:bg-gray-800">
                    <div className="text-lg font-medium text-gray-800 dark:text-gray-100">
                      {settings.mode === 'article' ? '整篇打字练习' : '逐句打字练习'}
                    </div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      严格区分标点与空格 · 可退格纠错
                      {settings.showTranslation ? ' · 显示中文翻译' : ''}
                      {settings.autoPlay ? ' · 自动朗读' : ''}
                    </p>
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500">按任意键或 Enter 开始 · 共 {units.length} 句</p>
                    {immersive && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">Alt+M 退出沉浸模式</p>}
                    <button type="button" className="my-btn-primary mt-5" onClick={handleStart}>
                      开始练习
                    </button>
                  </div>
                )}
              </>
            )}

            {lessonReady && units.length > 0 && restored && started && !isLessonFinished && !immersive && (
              <div className="sticky bottom-0 z-10 pt-2">
                <LessonSpeed totals={sessionTotals} />
              </div>
            )}
          </div>
        )}
      </div>

      {showResult && lessonReady && selected && (
        <LessonResult
          entry={selected}
          nextEntry={nextEntry}
          totals={sessionTotals}
          wrongResults={wrongResults}
          unitCount={units.length}
          onNext={handleNextLesson}
          onRestart={() => void handleRestart(true)}
          onDictationRestart={handleDictationRestart}
          onExit={handleExit}
          onRetry={handleRetryUnit}
        />
      )}

      {lessonReady && units.length > 0 && !immersive && !showResult && (
        <SentenceList
          open={listOpen}
          units={units}
          currentIndex={index}
          results={sessionResults}
          skipped={skippedUnits}
          showTranslation={settings.showTranslation}
          onOpen={handleOpenList}
          onClose={() => setListOpen(false)}
          onJump={handleJumpToList}
        />
      )}
    </Layout>
  )
}
