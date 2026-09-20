import { createRouter, type ErrorComponentProps, RouterProvider } from '@tanstack/react-router'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { routeTree } from './routeTree.gen'
import './styles/globals.css'

/** 各ルートが独自の境界を持たない場合のフォールバック。個別の境界は __root.tsx 側で上書きする。 */
const DefaultPending = () => <p className="p-6 text-muted-foreground">読み込み中…</p>

const DefaultError = ({ error }: ErrorComponentProps) => {
  const message = error instanceof Error ? error.message : '不明なエラーです。'
  return <p className="p-6 text-destructive">エラーが発生しました: {message}</p>
}

const DefaultNotFound = () => <p className="p-6 text-muted-foreground">ページが見つかりません。</p>

export const router = createRouter({
  routeTree,
  // events 一覧やカレンダーのリンクはホバー時に先読みしておくと詳細への遷移が速い。
  defaultPreload: 'intent',
  // 読み取り専用サイトでは古いデータを見せる不都合より、遷移のたびに取り直すほうが安全。
  defaultPreloadStaleTime: 0,
  scrollRestoration: true,
  defaultPendingComponent: DefaultPending,
  defaultErrorComponent: DefaultError,
  defaultNotFoundComponent: DefaultNotFound,
})

// TanStack Router の型を router インスタンスに合わせて拡張する（公式の定型）。
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

const container = document.getElementById('root')
if (container === null) {
  throw new Error('#root が見つかりません。index.html を確認してください。')
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
