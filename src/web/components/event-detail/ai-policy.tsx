import { Link } from '@tanstack/react-router'
import { AI_POLICY_DETAIL, type AiPolicy } from '@/ctftime/ai-policy'
import { cn } from '@/web/lib/utils'

type AiPolicySectionProps = {
  policy: AiPolicy
  snippets: string[]
}

/** AI_POLICY_DETAIL の tone を globals.css の ai-* トークンに対応させる。ai-policy-badge.tsx と同じ対応。 */
const TONE_CLASS_NAME: Record<AiPolicy, string> = {
  allowed: 'bg-ai-positive text-ai-positive-foreground',
  banned: 'bg-ai-negative text-ai-negative-foreground',
  mentioned: 'bg-ai-caution text-ai-caution-foreground',
  unknown: 'bg-ai-neutral text-ai-neutral-foreground',
}

/**
 * AI 利用方針。この判定は description からの推測で外れることがあるため、
 * ここが原文スニペットを隠さず全件見せる正典の場所になる
 * （AiPolicyBadge の hover card はここへのリンクを持つだけ）。
 *
 * 色付きの丸絵文字は使わず、tone の色とラベル文言（4 状態で言い回しが異なる）の
 * 両方で見分けられるようにする。色だけに頼らないための冗長化。
 */
export const AiPolicySection = ({ policy, snippets }: AiPolicySectionProps) => {
  const detail = AI_POLICY_DETAIL[policy]

  return (
    <div id="ai" className="scroll-mt-20 space-y-3">
      <h2 className="text-xl font-semibold">AI 利用</h2>
      <span
        className={cn(
          'inline-flex w-fit items-center rounded-full px-3 py-1 text-sm font-medium',
          TONE_CLASS_NAME[policy],
        )}
      >
        {detail.label}
      </span>
      {snippets.length > 0 ? (
        <ul className="space-y-2">
          {snippets.map((snippet) => (
            <li
              key={snippet}
              className="border-l-2 border-muted-foreground/30 bg-muted px-4 py-3 text-sm text-muted-foreground"
            >
              {snippet}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          description に AI 関連の記述が見つかりませんでした。判定は推測であり外れることがあるので、
          <Link to="/about" className="text-primary underline underline-offset-4">
            判定の仕組み
          </Link>
          を確認のうえ、公式ルールも参照してください。
        </p>
      )}
    </div>
  )
}
