import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react'
import type { EventQuery } from '@/shared/api'
import { buttonVariants } from '@/web/components/ui/button'
import { Pagination, PaginationContent, PaginationItem } from '@/web/components/ui/pagination'
import { cn } from '@/web/lib/utils'

type EventsPaginationProps = {
  query: EventQuery
  total: number
  className?: string
}

/** 現在ページの前後 2 つだけを出す。件数が多くても番号が横に伸びすぎないように。 */
const PAGE_SPREAD = 2

const buildPageNumbers = (current: number, lastPage: number): number[] => {
  const start = Math.max(1, current - PAGE_SPREAD)
  const end = Math.min(lastPage, current + PAGE_SPREAD)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

const Ellipsis = () => (
  <span aria-hidden="true" className="flex size-9 items-center justify-center">
    <MoreHorizontalIcon className="size-4" />
  </span>
)

/**
 * ページ送り。shadcn の Pagination 部品（PaginationLink 等）は素の <a> を返す作りで
 * SPA の遷移に使えないため、骨格（nav/ul/li）だけを ui/pagination から借り、
 * リンク自体は TanStack Router の Link + buttonVariants で組み直す。
 */
export const EventsPagination = ({ query, total, className }: EventsPaginationProps) => {
  const lastPage = Math.max(1, Math.ceil(total / query.perPage))
  if (lastPage <= 1) return null

  const pageNumbers = buildPageNumbers(query.page, lastPage)
  const firstShown = pageNumbers[0]
  const lastShown = pageNumbers[pageNumbers.length - 1]
  const showLeadingEllipsis = firstShown !== undefined && firstShown > 1
  const showTrailingEllipsis = lastShown !== undefined && lastShown < lastPage
  const isFirstPage = query.page <= 1
  const isLastPage = query.page >= lastPage

  return (
    <Pagination className={className}>
      <PaginationContent>
        <PaginationItem>
          <Link
            to="/events"
            search={{ ...query, page: Math.max(1, query.page - 1) }}
            aria-disabled={isFirstPage}
            aria-label="前のページ"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'gap-1 px-2.5',
              isFirstPage && 'pointer-events-none opacity-50',
            )}
          >
            <ChevronLeftIcon />
            <span className="hidden sm:block">前へ</span>
          </Link>
        </PaginationItem>

        {showLeadingEllipsis ? (
          <PaginationItem>
            <Ellipsis />
          </PaginationItem>
        ) : null}

        {pageNumbers.map((page) => (
          <PaginationItem key={page}>
            <Link
              to="/events"
              search={{ ...query, page }}
              aria-current={page === query.page ? 'page' : undefined}
              className={cn(
                buttonVariants({
                  variant: page === query.page ? 'outline' : 'ghost',
                  size: 'icon',
                }),
                page === query.page && 'pointer-events-none',
              )}
            >
              {page}
            </Link>
          </PaginationItem>
        ))}

        {showTrailingEllipsis ? (
          <PaginationItem>
            <Ellipsis />
          </PaginationItem>
        ) : null}

        <PaginationItem>
          <Link
            to="/events"
            search={{ ...query, page: Math.min(lastPage, query.page + 1) }}
            aria-disabled={isLastPage}
            aria-label="次のページ"
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'gap-1 px-2.5',
              isLastPage && 'pointer-events-none opacity-50',
            )}
          >
            <span className="hidden sm:block">次へ</span>
            <ChevronRightIcon />
          </Link>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  )
}
