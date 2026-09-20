import { type FormEvent, useEffect, useState } from 'react'
import { AI_POLICY_DETAIL } from '@/ctftime/ai-policy'
import {
  AI_FILTERS,
  EVENT_SORTS,
  type EventQuery,
  ONSITE_FILTERS,
  PRIZE_FILTERS,
} from '@/shared/api'
import { Button } from '@/web/components/ui/button'
import { Input } from '@/web/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/web/components/ui/select'
import { cn } from '@/web/lib/utils'

type Facets = { formats: string[]; restrictions: string[] }

/** page 以外の絞り込み項目。変更したら常にページを 1 に戻すので、page は onChange の対象に含めない。 */
type FilterPatch = Partial<Omit<EventQuery, 'page'>>

type EventFiltersProps = {
  query: EventQuery
  facets: Facets
  onChange: (patch: FilterPatch) => void
  className?: string
}

const SORT_LABELS: Record<EventQuery['sort'], string> = {
  start: '開始が早い順',
  '-start': '開始が遅い順',
  weight: 'Weight が低い順',
  '-weight': 'Weight が高い順',
  participants: 'CTFTime 登録チームが少ない順',
  '-participants': 'CTFTime 登録チームが多い順',
  title: 'タイトル順',
}

const ONSITE_LABELS: Record<(typeof ONSITE_FILTERS)[number], string> = {
  any: 'すべて',
  online: 'オンライン',
  onsite: '現地開催',
}

/**
 * prizes は自由記述で、「TBD」だけ書かれた未定のイベントが実データの 3 割ほどある。
 * それらは「あり」に数えても役に立たないので、ラベルの側で未定を含むことを明示する。
 */
const PRIZE_LABELS: Record<(typeof PRIZE_FILTERS)[number], string> = {
  any: 'すべて',
  yes: '記載あり',
  no: 'なし・未定',
}

const AI_LABELS: Record<(typeof AI_FILTERS)[number], string> = {
  any: 'すべて',
  allowed: AI_POLICY_DETAIL.allowed.label,
  banned: AI_POLICY_DETAIL.banned.label,
  mentioned: AI_POLICY_DETAIL.mentioned.label,
  unknown: AI_POLICY_DETAIL.unknown.label,
}

const isAiFilter = (value: string): value is (typeof AI_FILTERS)[number] =>
  AI_FILTERS.some((filter) => filter === value)

const isOnsiteFilter = (value: string): value is (typeof ONSITE_FILTERS)[number] =>
  ONSITE_FILTERS.some((filter) => filter === value)

const isPrizeFilter = (value: string): value is (typeof PRIZE_FILTERS)[number] =>
  PRIZE_FILTERS.some((filter) => filter === value)

const isEventSort = (value: string): value is EventQuery['sort'] =>
  EVENT_SORTS.some((sort) => sort === value)

/** Radix の Select は value="" を許さないので、「すべて」専用の番人値を挟んで '' と行き来する。 */
const ALL_VALUE = '__all__'
const toSelectValue = (value: string): string => (value.length === 0 ? ALL_VALUE : value)
const fromSelectValue = (value: string): string => (value === ALL_VALUE ? '' : value)

/**
 * 形式・参加制限・AI 判定・現地/オンライン・並べ替え・自由検索。
 * デスクトップの横並びとモバイルの Sheet 内、両方から同じ形で使う。
 */
export const EventFilters = ({ query, facets, onChange, className }: EventFiltersProps) => {
  const [searchDraft, setSearchDraft] = useState(query.q)

  // 戻る/進むや「すべて見る」リンクで URL 側から q が変わったら、下書きも合わせる。
  useEffect(() => {
    setSearchDraft(query.q)
  }, [query.q])

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onChange({ q: searchDraft.trim() })
  }

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <Input
          type="search"
          placeholder="タイトルで検索"
          aria-label="イベント名で検索"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
        />
        <Button type="submit" variant="secondary">
          検索
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-format">
            形式
          </label>
          <Select
            value={toSelectValue(query.format)}
            onValueChange={(value) => onChange({ format: fromSelectValue(value) })}
          >
            <SelectTrigger id="filter-format" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>すべて</SelectItem>
              {facets.formats.map((format) => (
                <SelectItem key={format} value={format}>
                  {format}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor="filter-restrictions"
          >
            参加制限
          </label>
          <Select
            value={toSelectValue(query.restrictions)}
            onValueChange={(value) => onChange({ restrictions: fromSelectValue(value) })}
          >
            <SelectTrigger id="filter-restrictions" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>すべて</SelectItem>
              {facets.restrictions.map((restriction) => (
                <SelectItem key={restriction} value={restriction}>
                  {restriction}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-ai">
            AI 利用方針
          </label>
          <Select
            value={query.ai}
            onValueChange={(value) => {
              if (isAiFilter(value)) onChange({ ai: value })
            }}
          >
            <SelectTrigger id="filter-ai" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_FILTERS.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {AI_LABELS[filter]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-onsite">
            開催形態
          </label>
          <Select
            value={query.onsite}
            onValueChange={(value) => {
              if (isOnsiteFilter(value)) onChange({ onsite: value })
            }}
          >
            <SelectTrigger id="filter-onsite" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ONSITE_FILTERS.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {ONSITE_LABELS[filter]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-prize">
            賞金
          </label>
          <Select
            value={query.prize}
            onValueChange={(value) => {
              if (isPrizeFilter(value)) onChange({ prize: value })
            }}
          >
            <SelectTrigger id="filter-prize" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIZE_FILTERS.map((filter) => (
                <SelectItem key={filter} value={filter}>
                  {PRIZE_LABELS[filter]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 flex flex-col gap-1.5 sm:col-span-4">
          <label className="text-xs font-medium text-muted-foreground" htmlFor="filter-sort">
            並べ替え
          </label>
          <Select
            value={query.sort}
            onValueChange={(value) => {
              if (isEventSort(value)) onChange({ sort: value })
            }}
          >
            <SelectTrigger id="filter-sort" className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_SORTS.map((sort) => (
                <SelectItem key={sort} value={sort}>
                  {SORT_LABELS[sort]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
