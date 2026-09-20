import { EVENT_RANGES, type EventQuery } from '@/shared/api'
import { Tabs, TabsList, TabsTrigger } from '@/web/components/ui/tabs'

type RangeTabsProps = {
  value: EventQuery['range']
  onChange: (range: EventQuery['range']) => void
  className?: string
}

const RANGE_LABELS: Record<EventQuery['range'], string> = {
  running: '開催中',
  upcoming: 'これから',
  past: '過去',
  all: 'すべて',
}

/** 「いま」を左端にする閲覧順。EVENT_RANGES の宣言順（既定値の都合で upcoming が先頭）とは別に持つ。 */
const RANGE_ORDER: EventQuery['range'][] = ['running', 'upcoming', 'past', 'all']

const isEventRange = (value: string): value is EventQuery['range'] =>
  EVENT_RANGES.some((range) => range === value)

/** 開催中 / これから / 過去 / すべて の切り替え。過去イベントは専用ページではなくここに集約する。 */
export const RangeTabs = ({ value, onChange, className }: RangeTabsProps) => (
  <Tabs
    value={value}
    onValueChange={(next) => {
      if (isEventRange(next)) onChange(next)
    }}
    className={className}
  >
    <TabsList>
      {RANGE_ORDER.map((range) => (
        <TabsTrigger key={range} value={range}>
          {RANGE_LABELS[range]}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
)
