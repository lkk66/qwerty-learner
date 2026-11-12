import type { NCEUnit } from '../types'
import Tooltip from '@/components/Tooltip'
import IconPrev from '~icons/tabler/arrow-narrow-left'
import IconNext from '~icons/tabler/arrow-narrow-right'

interface Props {
  prev: NCEUnit | null
  next: NCEUnit | null
  showTranslation: boolean
  showAnswer: boolean
  onPrev: () => void
  onNext: () => void
}

const arrowShortcut = {
  prev: 'Ctrl + Shift + ArrowLeft',
  next: 'Ctrl + Shift + ArrowRight',
}

function previewText(unit: NCEUnit, hideAnswer: boolean) {
  return hideAnswer ? unit.practiceText.replace(/[^\s]/g, '_') : unit.practiceText
}

export default function SentenceNav({ prev, next, showTranslation, showAnswer, onPrev, onNext }: Props) {
  return (
    <div className="mt-4 flex w-full items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        {prev && (
          <Tooltip content={`快捷键：${arrowShortcut.prev}`} className="w-full">
            <button
              type="button"
              onClick={onPrev}
              className="flex w-full items-center gap-2 text-left text-gray-700 opacity-60 transition-opacity hover:opacity-100 dark:text-gray-400"
            >
              <IconPrev className="shrink-0 text-2xl" />
              <span className="min-w-0">
                <span className="block text-xs text-gray-400">上一句</span>
                <span className="block truncate font-mono text-sm text-gray-700 dark:text-gray-300">{prev.practiceText}</span>
                {showTranslation && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{prev.chinese}</span>}
              </span>
            </button>
          </Tooltip>
        )}
      </div>

      <div className="min-w-0 flex-1 text-right">
        {next && (
          <Tooltip content={`快捷键：${arrowShortcut.next}`} className="w-full">
            <button
              type="button"
              onClick={onNext}
              className="flex w-full items-center justify-end gap-2 text-right text-gray-700 opacity-60 transition-opacity hover:opacity-100 dark:text-gray-400"
            >
              <span className="min-w-0">
                <span className="block text-xs text-gray-400">下一句</span>
                <span className="block truncate font-mono text-sm text-gray-700 dark:text-gray-300">{previewText(next, !showAnswer)}</span>
                {showTranslation && <span className="block truncate text-xs text-gray-500 dark:text-gray-400">{next.chinese}</span>}
              </span>
              <IconNext className="shrink-0 text-2xl" />
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}
