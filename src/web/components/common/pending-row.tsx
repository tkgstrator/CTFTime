import { Skeleton } from '@/web/components/ui/skeleton'
import { cn } from '@/web/lib/utils'

type PendingRowProps = {
  className?: string
}

/** 一覧の読み込み中プレースホルダ。1 行ぶんの骨格を実際の行と合わせ、レイアウトが崩れないようにする。 */
export const PendingRow = ({ className }: PendingRowProps) => (
  <div className={cn('flex flex-col gap-2 px-3 py-4', className)}>
    <Skeleton className="h-5 w-2/3" />
    <Skeleton className="h-4 w-1/3" />
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
  </div>
)
