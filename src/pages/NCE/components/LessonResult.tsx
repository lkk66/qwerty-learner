import type { LessonTotals } from '../hooks/useLessonSession'
import type { NCECatalogEntry, UnitPracticeResult } from '../types'
import { formatDuration } from '../utils/formatDuration'
import Tooltip from '@/components/Tooltip'
import RemarkRing from '@/pages/Typing/components/ResultScreen/RemarkRing'
import IconCheckCircle from '~icons/heroicons/check-circle-solid'
import IconFaceSmile from '~icons/heroicons/face-smile-solid'
import IconX from '~icons/tabler/x'

interface Props {
  entry: NCECatalogEntry
  nextEntry: NCECatalogEntry | null
  totals: LessonTotals
  wrongResults: UnitPracticeResult[]
  unitCount: number
  onNext: () => void
  onRestart: () => void
  onDictationRestart: () => void
  onExit: () => void
  onRetry: (unitId: string) => void
}

function conclusion(accuracy: number, wrongCount: number, completed: number, skipped: number) {
  if (completed === 0) return skipped > 0 ? '本课句子均被跳过，可以重新练习。' : '还没有完成任何句子。'
  if (wrongCount === 0) {
    return skipped > 0 ? `完成的 ${completed} 句全部通过，另有 ${skipped} 句被跳过。` : '全部一次通过，表现不错！'
  }
  if (accuracy >= 85) return `只有 ${wrongCount} 句需要再练，整体很稳。`
  if (accuracy >= 70) return '有些小问题，再练一遍会更稳。'
  return '错误较多，再来一次如何？'
}

const outlineButton =
  'h-11 rounded-lg border border-gray-300 bg-white px-5 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600'

export default function LessonResult({
  entry,
  nextEntry,
  totals,
  wrongResults,
  unitCount,
  onNext,
  onRestart,
  onDictationRestart,
  onExit,
  onRetry,
}: Props) {
  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-gray-200/80 dark:bg-gray-900/80">
      <div className="relative flex min-h-full items-center justify-center p-4">
        <div className="my-card relative flex w-[92vw] max-w-5xl flex-col rounded-2xl bg-white p-6 shadow-lg dark:bg-gray-800 md:p-9">
          <button
            type="button"
            onClick={onExit}
            className="absolute right-5 top-5 rounded p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="返回选课"
          >
            <IconX className="text-xl" />
          </button>

          <div className="pr-8 text-center">
            <div className="text-lg font-medium text-gray-800 dark:text-gray-100">
              {entry.lessonLabel} · {entry.title}
            </div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              本课练习完成 · 共 {unitCount} 句{totals.skipped > 0 ? ` · 跳过 ${totals.skipped} 句` : ''}
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-6 md:flex-row md:items-stretch">
            <div className="flex flex-row flex-wrap justify-center gap-4 md:flex-col md:justify-start">
              <RemarkRing remark={`${totals.accuracy}%`} caption="正确率" percentage={totals.accuracy} />
              <RemarkRing remark={formatDuration(totals.elapsedMs)} caption="打字用时" />
              <RemarkRing remark={totals.cpm + ''} caption="CPM" />
            </div>

            <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-indigo-50 dark:bg-gray-700">
              <div className="flex items-center justify-between px-5 pt-4 text-sm text-gray-600 dark:text-gray-300">
                <span>错句 {wrongResults.length} 句</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">错误位置 {totals.errors} 处</span>
              </div>
              <div className="customized-scrollbar flex max-h-72 min-h-[8rem] flex-1 flex-wrap content-start gap-2 overflow-y-auto px-5 py-4">
                {totals.completed === 0 ? (
                  <div className="flex w-full flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="text-sm">本课还没有完成记录</span>
                  </div>
                ) : wrongResults.length === 0 ? (
                  <div className="flex w-full flex-col items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <IconCheckCircle className="h-8 w-8" />
                    <span className="text-sm">没有错句</span>
                  </div>
                ) : (
                  wrongResults.map((result) => (
                    <button
                      key={result.unitId}
                      type="button"
                      onClick={() => onRetry(result.unitId)}
                      title="点击重练该句"
                      className="flex max-w-full items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-left text-xs text-gray-700 transition-colors hover:border-indigo-400 hover:bg-indigo-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:border-indigo-500"
                    >
                      <span className="max-w-[16rem] truncate font-mono">{result.practiceText}</span>
                      <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-red-600 dark:bg-red-900/50 dark:text-red-300">
                        {result.errors}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-indigo-200/60 px-5 py-3 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200">
                <IconFaceSmile className="h-5 w-5 shrink-0 text-indigo-500" />
                <span>{conclusion(totals.accuracy, wrongResults.length, totals.completed, totals.skipped)}</span>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Tooltip content="快捷键：Shift + Enter">
              <button type="button" className={outlineButton} onClick={onDictationRestart}>
                默写重练
              </button>
            </Tooltip>
            <Tooltip content="快捷键：Space">
              <button type="button" className={outlineButton} onClick={onRestart}>
                重新练习
              </button>
            </Tooltip>
            {nextEntry && (
              <Tooltip content="快捷键：Enter">
                <button type="button" className="my-btn-primary h-11 px-6 text-sm" onClick={onNext}>
                  下一课：{nextEntry.lessonLabel}
                </button>
              </Tooltip>
            )}
            <Tooltip content="快捷键：Esc">
              <button type="button" className={outlineButton} onClick={onExit}>
                返回选课
              </button>
            </Tooltip>
          </div>

          <div className="mt-4 text-center text-[11px] text-gray-400 dark:text-gray-500">
            {nextEntry ? `下一课：${nextEntry.lessonLabel} · ${nextEntry.title}` : '已经是最后一课，可以重新练习巩固'}
          </div>
        </div>
      </div>
    </div>
  )
}
