import type { NCEUnit, UnitPracticeResult } from '../types'
import Drawer from '@/components/Drawer'
import { Dialog } from '@headlessui/react'
import * as ScrollArea from '@radix-ui/react-scroll-area'
import classNames from 'classnames'
import IconList from '~icons/tabler/list'
import IconX from '~icons/tabler/x'

interface Props {
  open: boolean
  units: NCEUnit[]
  currentIndex: number
  results: Record<string, UnitPracticeResult>
  skipped: string[]
  showTranslation: boolean
  onOpen: () => void
  onClose: () => void
  onJump: (index: number) => void
}

type UnitState = 'current' | 'error' | 'done' | 'skipped' | 'todo'

function unitState(unit: NCEUnit, index: number, props: Pick<Props, 'currentIndex' | 'results' | 'skipped'>): UnitState {
  if (index === props.currentIndex) return 'current'
  const result = props.results[unit.id]
  if (result) return result.errors > 0 ? 'error' : 'done'
  if (props.skipped.includes(unit.id)) return 'skipped'
  return 'todo'
}

const stateLabel: Record<UnitState, string> = {
  current: '当前',
  error: '有错',
  done: '完成',
  skipped: '跳过',
  todo: '',
}

const stateClass: Record<UnitState, string> = {
  current: 'text-indigo-500',
  error: 'text-red-500',
  done: 'text-emerald-500',
  skipped: 'text-amber-500',
  todo: 'text-transparent',
}

export default function SentenceList({ open, units, currentIndex, results, skipped, showTranslation, onOpen, onClose, onJump }: Props) {
  return (
    <>
      <button
        type="button"
        onClick={onOpen}
        className="fixed left-0 top-[50%] z-20 rounded-lg rounded-l-none bg-indigo-50 px-2 py-3 text-lg hover:bg-indigo-200 focus:outline-none dark:bg-indigo-900 dark:hover:bg-indigo-800"
        aria-label="打开句子列表"
        title="句子列表"
      >
        <IconList className="h-6 w-6 text-indigo-500 dark:text-white" />
      </button>

      <Drawer open={open} onClose={onClose} classNames="bg-stone-50 dark:bg-gray-900">
        <Dialog.Title as="h3" className="flex items-center justify-between p-4 text-lg font-medium leading-6 dark:text-gray-50">
          <span>
            句子列表
            <span className="ml-2 text-xs font-normal text-gray-500 dark:text-gray-400">
              第 {Math.min(currentIndex + 1, units.length)} / {units.length} 句
            </span>
          </span>
          <IconX onClick={onClose} className="cursor-pointer" />
        </Dialog.Title>
        <ScrollArea.Root className="flex-1 select-none overflow-y-auto">
          <ScrollArea.Viewport className="h-full w-full px-3 pb-4">
            <div className="flex h-full w-full flex-col gap-1">
              {units.map((unit, index) => {
                const state = unitState(unit, index, { currentIndex, results, skipped })
                const result = results[unit.id]
                return (
                  <button
                    key={unit.id}
                    type="button"
                    onClick={() => onJump(index)}
                    className={classNames(
                      'flex w-full items-start gap-3 rounded-xl p-3 text-left shadow transition-colors focus:outline-none',
                      index === currentIndex
                        ? 'bg-indigo-50 dark:bg-indigo-800 dark:bg-opacity-20'
                        : 'bg-white hover:bg-indigo-50/60 dark:bg-gray-700 dark:bg-opacity-20 dark:hover:bg-gray-700',
                    )}
                  >
                    <span className="mt-0.5 w-7 shrink-0 text-right font-mono text-xs text-gray-400">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block font-mono text-sm leading-relaxed text-gray-700 dark:text-gray-100">
                        {unit.practiceText}
                      </span>
                      {showTranslation && (
                        <span className="mt-1 line-clamp-1 block text-xs text-gray-500 dark:text-gray-400">{unit.chinese}</span>
                      )}
                      {result && result.errors > 0 && <span className="mt-1 block text-xs text-red-400">错误位置 {result.errors} 处</span>}
                    </span>
                    <span className={classNames('shrink-0 text-xs', stateClass[state])}>{stateLabel[state]}</span>
                  </button>
                )
              })}
            </div>
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar className="flex touch-none select-none bg-transparent" orientation="vertical" />
        </ScrollArea.Root>
      </Drawer>
    </>
  )
}
