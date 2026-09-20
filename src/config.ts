import { z } from 'zod'

/**
 * Worker のバインディング。D1 以外は wrangler.toml の [vars] か
 * `wrangler secret` から文字列として渡ってくる。
 */
export type Bindings = {
  DB: D1Database
  /** wrangler.toml の [assets] が張るバインディング。SPA へのフォールバックに使う。 */
  ASSETS: Fetcher
  DISCORD_APPLICATION_ID: string
  DISCORD_PUBLIC_KEY: string
  DISCORD_BOT_TOKEN: string
  DISCORD_CHANNEL_ID: string
  ANNOUNCE_MIN_WEIGHT: string
  ANNOUNCE_ONSITE: string
  ANNOUNCE_RESTRICTIONS: string
  ANNOUNCE_FORMATS: string
  LOOKAHEAD_DAYS: string
}

/** `Open,Academic` のようなカンマ区切りを配列にする。空要素は捨てる。 */
const csvList = z
  .string()
  .trim()
  .transform((value) => value.split(',').map((item) => item.trim()))
  .pipe(z.array(z.string().nonempty()))

export const ConfigSchema = z.object({
  applicationId: z.string().nonempty(),
  publicKey: z.string().nonempty(),
  botToken: z.string().nonempty(),
  channelId: z.string().nonempty(),
  announceMinWeight: z.coerce.number().nonnegative(),
  announceOnsite: z.stringbool(),
  announceRestrictions: csvList,
  announceFormats: csvList,
  lookaheadDays: z.coerce.number().int().positive().max(365),
})

export type Config = z.infer<typeof ConfigSchema>

/**
 * バインディングを検証済みの設定に変換する。
 * 設定漏れは起動直後に気付きたいので、ここで例外にする。
 */
export const parseConfig = (env: Bindings): Config => {
  const result = ConfigSchema.safeParse({
    applicationId: env.DISCORD_APPLICATION_ID,
    publicKey: env.DISCORD_PUBLIC_KEY,
    botToken: env.DISCORD_BOT_TOKEN,
    channelId: env.DISCORD_CHANNEL_ID,
    announceMinWeight: env.ANNOUNCE_MIN_WEIGHT,
    announceOnsite: env.ANNOUNCE_ONSITE,
    announceRestrictions: env.ANNOUNCE_RESTRICTIONS,
    announceFormats: env.ANNOUNCE_FORMATS,
    lookaheadDays: env.LOOKAHEAD_DAYS,
  })
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' / ')
    throw new Error(`環境変数の設定が不足しています — ${detail}`)
  }
  return result.data
}
