import type { LessonTotals } from '../hooks/useLessonSession'
import { formatDuration } from '../utils/formatDuration'
import InfoBox from '@/pages/Typing/components/Speed/InfoBox'

export default function LessonSpeed({ totals }: { totals: LessonTotals }) {
  return (
    <div className="my-card flex w-full rounded-xl bg-white p-4 py-6 opacity-60 transition-colors duration-300 dark:bg-gray-800">
      <InfoBox info={formatDuration(totals.elapsedMs)} description="时间" />
      <InfoBox info={totals.keystrokes + ''} description="输入数" />
      <InfoBox info={totals.cpm + ''} description="CPM" />
      <InfoBox info={totals.correctKeystrokes + ''} description="正确数" />
      <InfoBox info={totals.accuracy + '%'} description="正确率" />
    </div>
  )
}
