import { createRootRoute, type ErrorComponentProps, Link, Outlet } from '@tanstack/react-router'
import { EVENT_QUERY_DEFAULTS } from '@/shared/api'
import { SiteFooter } from '@/web/components/layout/site-footer'
import { SiteHeader } from '@/web/components/layout/site-header'
import { buttonVariants } from '@/web/components/ui/button'
import { TooltipProvider } from '@/web/components/ui/tooltip'

/**
 * 全ページ共通のシェル。404 とエラー画面もここで最終形まで書く
 * （他ユニットが触らないようにするため。競合防止）。
 */
export const Route = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  errorComponent: RootError,
})

function RootLayout() {
  return (
    <TooltipProvider>
      <div className="flex min-h-svh flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Outlet />
        </main>
        <SiteFooter />
      </div>
    </TooltipProvider>
  )
}

function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold">ページが見つかりませんでした</h1>
      <p className="text-muted-foreground">
        URL が間違っているか、ページが移動した可能性があります。
      </p>
      <div className="flex gap-3">
        <Link to="/" className={buttonVariants({ variant: 'default' })}>
          ホームへ戻る
        </Link>
        <Link
          to="/events"
          search={EVENT_QUERY_DEFAULTS}
          className={buttonVariants({ variant: 'outline' })}
        >
          イベント一覧を見る
        </Link>
      </div>
    </div>
  )
}

function RootError({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : '不明なエラーです。'
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">エラー</p>
      <h1 className="text-2xl font-semibold text-destructive">問題が発生しました</h1>
      <p className="text-muted-foreground">{message}</p>
      <Link to="/" className={buttonVariants({ variant: 'default' })}>
        ホームへ戻る
      </Link>
    </div>
  )
}
