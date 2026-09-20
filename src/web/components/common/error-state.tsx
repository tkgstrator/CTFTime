import { TriangleAlertIcon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/web/components/ui/alert'
import { cn } from '@/web/lib/utils'

type ErrorStateProps = {
  title?: string
  message: string
  className?: string
}

/**
 * API 呼び出し失敗の共通表示。ルートローダの throw を errorComponent が受け、
 * ここでユーザーに見せる文言に変換する。
 */
export const ErrorState = ({
  title = '読み込みに失敗しました',
  message,
  className,
}: ErrorStateProps) => (
  <Alert variant="destructive" className={cn(className)}>
    <TriangleAlertIcon />
    <AlertTitle>{title}</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
)
