import type { NCEPracticeSettings } from '../types'

interface Props {
  settings: NCEPracticeSettings
  onChange: (next: NCEPracticeSettings) => void
}

export default function PracticeSettings({ settings, onChange }: Props) {
  const patch = (partial: Partial<NCEPracticeSettings>) => onChange({ ...settings, ...partial })

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-3 font-medium text-gray-700 dark:text-gray-200">练习设置</div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label
          className="flex cursor-pointer items-center gap-2 text-gray-600 dark:text-gray-300"
          title="关闭后未输入部分显示为占位符；Ctrl + V 可快速切换"
        >
          <input type="checkbox" checked={settings.showAnswer} onChange={(event) => patch({ showAnswer: event.target.checked })} />
          显示答案
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">Ctrl+V</span>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-gray-600 dark:text-gray-300" title="Ctrl + Shift + V 可快速切换">
          <input
            type="checkbox"
            checked={settings.showTranslation}
            onChange={(event) => patch({ showTranslation: event.target.checked })}
          />
          显示中文翻译
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            Ctrl+Shift+V
          </span>
        </label>

        <label
          className="flex cursor-pointer items-center gap-2 text-gray-600 dark:text-gray-300"
          title="与单词模式一致；标点与空格始终严格"
        >
          <input type="checkbox" checked={settings.ignoreCase} onChange={(event) => patch({ ignoreCase: event.target.checked })} />
          忽略大小写
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-gray-600 dark:text-gray-300">
          <input type="checkbox" checked={settings.autoPlay} onChange={(event) => patch({ autoPlay: event.target.checked })} />
          自动朗读
        </label>

        <label className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          句尾裁剪
          <input
            type="number"
            min={0}
            max={2000}
            step={50}
            value={settings.endTrimMs}
            onChange={(event) => patch({ endTrimMs: Math.max(0, Math.min(2000, Number(event.target.value) || 0)) })}
            className="w-20 rounded border border-gray-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-700"
          />
          ms
        </label>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
        <label className="flex cursor-pointer items-start gap-2 text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={settings.includeReviewUnits}
            onChange={(event) => patch({ includeReviewUnits: event.target.checked })}
            className="mt-1"
          />
          <span>
            包含待复核句子（自动合并的完整句）
            <span className="mt-1 block text-xs text-amber-600 dark:text-amber-400">
              这些句子由多条字幕机械拼接，尚未人工确认分组；默认不进入正式练习。
            </span>
          </span>
        </label>
      </div>

      <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
        自动推导的结束时间不等于语音真正结束的时间，可调裁剪量微调句尾。
      </div>

      <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
        打字无需点击 · Enter 开始/暂停 · Alt+S 跳过 · Ctrl+J 重播朗读 · Ctrl+Shift+←/→ 切换句子
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
        <label className="flex items-center gap-1">
          <input type="radio" checked={settings.mode === 'sentence'} onChange={() => patch({ mode: 'sentence' })} />
          逐句练习
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" checked={settings.mode === 'article'} onChange={() => patch({ mode: 'article' })} />
          整篇练习
        </label>
      </div>
    </div>
  )
}
