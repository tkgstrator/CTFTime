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

const NAV_LINK_CLASS_NAME =
  'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground'
const NAV_LINK_ACTIVE_PROPS = { className: 'text-foreground' }

export const SiteHeader = () => (
  <header className="border-b bg-background">
    <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
      <Link to="/" className="text-base font-semibold">
        ctftime-bot
      </Link>

      <nav className="hidden items-center gap-6 sm:flex">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={NAV_LINK_CLASS_NAME}
            activeProps={NAV_LINK_ACTIVE_PROPS}
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
                className={NAV_LINK_CLASS_NAME}
                activeProps={NAV_LINK_ACTIVE_PROPS}
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
