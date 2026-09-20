/**
 * スラッシュコマンドを Discord に登録する。
 *
 *   bun run discord:register            # グローバル登録（反映に最大 1 時間）
 *   GUILD_ID=... bun run discord:register  # ギルド限定（即時反映。開発中はこちら）
 *
 * 認証情報は .dev.vars か環境変数から読む。
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { COMMANDS } from '../src/discord/commands'

const loadDevVars = (): Record<string, string> => {
  try {
    const raw = readFileSync(resolve(process.cwd(), '.dev.vars'), 'utf-8')
    return Object.fromEntries(
      raw
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && !line.startsWith('#'))
        .map((line: string) => {
          const separator = line.indexOf('=')
          const key = line.slice(0, separator).trim()
          const value = line.slice(separator + 1).trim()
          return [key, value.replace(/^["']|["']$/g, '')]
        }),
    )
  } catch {
    // .dev.vars が無い場合は環境変数だけで動かす。
    return {}
  }
}

const devVars = loadDevVars()
const pick = (key: string): string => {
  const fromEnv = process.env[key]
  if (fromEnv !== undefined && fromEnv.length > 0) return fromEnv
  const fromFile = devVars[key]
  return fromFile === undefined ? '' : fromFile
}

const EnvSchema = z.object({
  applicationId: z.string().nonempty(),
  botToken: z.string().nonempty(),
  guildId: z.string().trim().default(''),
})

const parsed = EnvSchema.safeParse({
  applicationId: pick('DISCORD_APPLICATION_ID'),
  botToken: pick('DISCORD_BOT_TOKEN'),
  guildId: pick('GUILD_ID'),
})

if (!parsed.success) {
  console.error(
    'DISCORD_APPLICATION_ID と DISCORD_BOT_TOKEN を .dev.vars か環境変数に設定してください。',
  )
  process.exit(1)
}

const { applicationId, botToken, guildId } = parsed.data
const endpoint =
  guildId.length > 0
    ? `https://discord.com/api/v10/applications/${applicationId}/guilds/${guildId}/commands`
    : `https://discord.com/api/v10/applications/${applicationId}/commands`

const response = await fetch(endpoint, {
  method: 'PUT',
  headers: { Authorization: `Bot ${botToken}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(COMMANDS),
})

if (!response.ok) {
  console.error(`登録に失敗しました (${response.status}):`, await response.text())
  process.exit(1)
}

console.log(
  `${guildId.length > 0 ? `ギルド ${guildId}` : 'グローバル'} に ${COMMANDS.length} 件のコマンドを登録しました。`,
)
