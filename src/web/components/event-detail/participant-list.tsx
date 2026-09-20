import type { Participant } from '@/shared/api'
import { DiscordAvatar } from '@/web/components/common/discord-avatar'
import { EmptyState } from '@/web/components/common/empty-state'

type ParticipantListProps = {
  participants: Participant[]
}

/** displayName が空（migration 0002 以前の行）なら userId を代わりに出す。 */
const participantLabel = (participant: Participant): string =>
  participant.displayName.length > 0 ? participant.displayName : participant.userId

/**
 * Discord で参加表明した人の一覧。Discord embed はメンションの羅列だけだが、
 * ここでは表示名とアイコンを添える。空の行は「参加者ゼロ」という実際に出荷される状態で、
 * 例外ではなく通常の表示として扱う。
 */
export const ParticipantList = ({ participants }: ParticipantListProps) => (
  <div className="space-y-3">
    <h2 className="text-xl font-semibold">参加表明</h2>
    {participants.length === 0 ? (
      <EmptyState
        title="まだ参加表明がありません"
        description="Discord のボタンから参加できます。"
      />
    ) : (
      <ul className="flex flex-wrap gap-3">
        {participants.map((participant) => (
          <li
            key={participant.userId}
            className="flex items-center gap-2 rounded-full border py-1 pr-3 pl-1"
          >
            <DiscordAvatar
              userId={participant.userId}
              avatarHash={participant.avatarHash}
              displayName={participant.displayName}
              size="sm"
            />
            <span className="text-sm">{participantLabel(participant)}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
)
