import { Link } from '@tanstack/react-router'
import { MenuIcon } from 'lucide-react'
import { Button } from '@/web/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/web/components/ui/sheet'

/** 5 ページぶんのナビゲーション項目。ヘッダーとモバイルメニューの両方から参照する。 */
const NAV_ITEMS = [
  { to: '/', label: 'ホーム' },
  { to: '/events', label: 'イベント' },
  { to: '/calendar', label: 'カレンダー' },
  { to: '/about', label: 'About' },
] as const

/**
 * 現在地は下線で示す。border は常に 2px 確保しておき、色だけ変える
 * （出し入れすると項目の高さが変わって、ヘッダーごと揺れるため）。
 *
 * 色の指定に activeProps の className を使うと、border-transparent と
 * border-primary が同じ詳細度で競合して CSS の定義順次第になる。
 * TanStack Router が付ける data-status="active" を属性セレクタで拾えば
 * 詳細度が上がるので、こちらで確実に上書きする。
 */
const NAV_LINK_CLASS_NAME =
  'inline-flex h-14 items-center border-b-2 border-transparent text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground'

/** モバイルメニューは縦並びなので、下線ではなく左の線で示す。 */
const MENU_LINK_CLASS_NAME =
  'border-l-2 border-transparent pl-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:border-primary data-[status=active]:text-foreground'

/** 見た目は data-status で当てるので、activeProps は支援技術向けの印だけ持つ。 */
const ACTIVE_PROPS = { 'aria-current': 'page' } as const

/**
 * `/` は前方一致だと全ページに一致してしまうので、ホームだけ完全一致にする。
 * 逆にイベントは /events/123 でも「イベント」を選択状態にしたいので前方一致のまま。
 */
const isExact = (to: string): boolean => to === '/'

export const SiteHeader = () => (
  <header className="border-b bg-background">
    <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
      {/* ナビが text-sm なので、サイト名は 1 段上げて主従をはっきりさせる。 */}
      <Link to="/" className="text-xl font-semibold tracking-tight">
        CTFTime Watch
      </Link>

      <nav className="hidden items-center gap-6 sm:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={NAV_LINK_CLASS_NAME}
            activeProps={ACTIVE_PROPS}
            activeOptions={{ exact: isExact(item.to) }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="sm:hidden" aria-label="メニューを開く">
            <MenuIcon />
          </Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>メニュー</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-4 px-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={MENU_LINK_CLASS_NAME}
                activeProps={ACTIVE_PROPS}
                activeOptions={{ exact: isExact(item.to) }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  </header>
)
