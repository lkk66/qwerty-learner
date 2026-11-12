import type { NCECatalog, NCECatalogEntry } from '../types'

interface Props {
  catalog: NCECatalog
  selectedId: string | null
  onSelect: (entry: NCECatalogEntry) => void
}

const BOOKS = [1, 2, 3, 4]

export default function LessonPicker({ catalog, selectedId, onSelect }: Props) {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 pb-10">
      <div className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        共 {catalog.summary.totalLessons} 课 · {catalog.summary.practicableUnits ?? 0} 个可练习句子
      </div>
      {BOOKS.map((book) => {
        const entries = catalog.lessons.filter((entry) => entry.book === book)
        if (entries.length === 0) return null
        return (
          <section key={book} className="mb-6">
            <h2 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">第 {book} 册</h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const active = entry.id === selectedId
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelect(entry)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      active
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40'
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                      {entry.lessonLabel} · {entry.title}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{entry.counts.practicableUnits} 句可练习</span>
                      <span>·</span>
                      <span>{entry.audioStatus === 'ok' ? '音频可用' : '无音频'}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
