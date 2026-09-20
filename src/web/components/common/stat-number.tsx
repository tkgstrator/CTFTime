import { cn } from '@/web/lib/utils'

type StatNumberProps = {
  label: string
  value: number
  className?: string
}

/** ホームの全体カウンタなど、数字 1 つを見出しとして見せる共通の形。 */
export const StatNumber = ({ label, value, className }: StatNumberProps) => (
  <div className={cn('flex flex-col gap-1', className)}>
    <span className="text-3xl font-semibold tabular-nums">{value.toLocaleString('ja-JP')}</span>
    <span className="text-sm text-muted-foreground">{label}</span>
  </div>
)
