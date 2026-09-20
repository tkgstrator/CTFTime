import { Link } from '@tanstack/react-router'
import dayjs from 'dayjs'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { buttonVariants } from '@/web/components/ui/button'

type CalendarNavProps = {
  /** 表示中の月。月初日の YYYY-MM-DD（monthBounds / monthGridDays が受け取れる ISO）。 */
  month: string
}

/** 今月の月初日。「今日」ボタンの遷移先。 */
const currentMonth = (): string => dayjs().startOf('month').format('YYYY-MM-DD')

const shiftMonth = (month: string, delta: number): string =>
  dayjs(month).add(delta, 'month').format('YYYY-MM-DD')

/**
 * 月送りのナビゲーション。月を URL の search に持たせているので、
 * 前月・次月・今日への遷移はすべて Link（=リンクとして共有可能）にする。
 */
export const CalendarNav = ({ month }: CalendarNavProps) => (
  <div className="flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl font-semibold sm:text-3xl">{dayjs(month).format('YYYY年M月')}</h1>
    <div className="flex items-center gap-2">
      <Link
        to="/calendar"
        search={{ month: shiftMonth(month, -1) }}
        aria-label="前の月へ"
        className={buttonVariants({ variant: 'outline', size: 'icon' })}
      >
        <ChevronLeftIcon />
      </Link>
      <Link
        to="/calendar"
        search={{ month: currentMonth() }}
        className={buttonVariants({ variant: 'outline', size: 'sm' })}
      >
        今日
      </Link>
      <Link
        to="/calendar"
        search={{ month: shiftMonth(month, 1) }}
        aria-label="次の月へ"
        className={buttonVariants({ variant: 'outline', size: 'icon' })}
      >
        <ChevronRightIcon />
      </Link>
    </div>
  </div>
)
