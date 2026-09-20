import { Link } from '@tanstack/react-router'
import { AI_POLICY_DETAIL, type AiPolicy } from '@/ctftime/ai-policy'
import { Badge } from '@/web/components/ui/badge'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/web/components/ui/hover-card'
import { cn } from '@/web/lib/utils'

type AiPolicyBadgeProps = {
  policy: AiPolicy
  aiSnippets: string[]
  /** リンク先のイベント詳細ページ。判定の裏付け（#ai セクション）へ必ず辿れるようにする。 */
  eventId: number
  className?: string
}

/** AI_POLICY_DETAIL の tone を、globals.css で定義した ai-* トークンに対応させる。 */
const TONE_CLASS_NAME: Record<AiPolicy, string> = {
  allowed: 'bg-ai-positive text-ai-positive-foreground',
  banned: 'bg-ai-negative text-ai-negative-foreground',
  mentioned: 'bg-ai-caution text-ai-caution-foreground',
  unknown: 'bg-ai-neutral text-ai-neutral-foreground',
}

const NO_SNIPPET_NOTE = '公式ルールも確認してください。'

/**
 * AI 利用方針の判定バッジ。
 *
 * 判定は本文からの推測なので外れうる。原文スニペットが無い場合でも、
 * 「判定はしたが裏付けが無い」を隠さず、バッジ自体に確認を促す注記を必ず載せる
 * ——「裏付けへの経路を持たない判定」を作らないことが、この AI 判定機能の設計の核心。
 */
export const AiPolicyBadge = ({ policy, aiSnippets, eventId, className }: AiPolicyBadgeProps) => {
  const detail = AI_POLICY_DETAIL[policy]
  const hasSnippets = aiSnippets.length > 0
  const title = hasSnippets ? detail.label : `${detail.label} — ${NO_SNIPPET_NOTE}`

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Badge title={title} className={cn(TONE_CLASS_NAME[policy], className)}>
          {detail.label}
        </Badge>
      </HoverCardTrigger>
      <HoverCardContent className="space-y-2 text-sm">
        {hasSnippets ? (
          <ul className="list-disc space-y-1 pl-4">
            {aiSnippets.map((snippet) => (
              <li key={snippet}>{snippet}</li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground">
            本文に AI 関連の記述は見つかりませんでした。{NO_SNIPPET_NOTE}
          </p>
        )}
        <Link
          to="/events/$eventId"
          params={{ eventId: String(eventId) }}
          hash="ai"
          className="text-primary underline underline-offset-4"
        >
          イベント詳細で確認する
        </Link>
      </HoverCardContent>
    </HoverCard>
  )
}
