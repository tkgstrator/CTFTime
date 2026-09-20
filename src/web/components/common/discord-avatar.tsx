import { Avatar, AvatarFallback, AvatarImage } from '@/web/components/ui/avatar'

type DiscordAvatarProps = {
  userId: string
  avatarHash: string
  displayName: string
  size?: 'sm' | 'default' | 'lg'
  className?: string
}

const buildAvatarUrl = (userId: string, avatarHash: string): string =>
  `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.png`

/**
 * 参加表明者のアイコン。avatarHash が空（migration 0002 以前の行）なら画像を出さず
 * フォールバックへ委ねる。displayName も空という最古参の行では、フォールバックの
 * 表示にも userId を使う。
 */
export const DiscordAvatar = ({
  userId,
  avatarHash,
  displayName,
  size = 'default',
  className,
}: DiscordAvatarProps) => {
  const label = displayName.length > 0 ? displayName : userId

  return (
    <Avatar size={size} className={className}>
      {avatarHash.length > 0 ? (
        <AvatarImage src={buildAvatarUrl(userId, avatarHash)} alt={label} />
      ) : null}
      <AvatarFallback>{label.slice(0, 2)}</AvatarFallback>
    </Avatar>
  )
}
