import { useEffect, useState } from 'react'
import { fromNow } from '@/shared/datetime'
import { cn } from '@/web/lib/utils'

type CountdownProps = {
  targetIso: string
  className?: string
}

/**
 * 「3日後」「2時間前」の相対表示。fromNow 自体は現在時刻を内部で見るだけなので、
 * 1 分ごとに再レンダーして静止画にならないようにする。
 */
export const Countdown = ({ targetIso, className }: CountdownProps) => {
  const [, setTick] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setTick((tick) => tick + 1), 60_000)
    return () => clearInterval(timer)
  }, [])

  return <span className={cn(className)}>{fromNow(targetIso)}</span>
}
