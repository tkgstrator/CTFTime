import { Hono } from 'hono'
import { api } from './api'
import { type Bindings, parseConfig } from './config'
import { handleInteraction } from './discord/interactions'
import { verifyDiscordRequest } from './discord/verify'
import { runReminders } from './jobs/remind'
import { syncEvents } from './jobs/sync'

const app = new Hono<{ Bindings: Bindings }>()

app.route('/api', api)

/**
 * Discord の Interactions Endpoint URL に設定する先。
 * 署名検証に失敗したら 401 を返す（Discord の登録チェックがこれを見ている）。
 */
app.post('/interactions', async (c) => {
  const config = parseConfig(c.env)
  const body = await c.req.text()
  const verified = await verifyDiscordRequest(
    config.publicKey,
    c.req.header('X-Signature-Ed25519'),
    c.req.header('X-Signature-Timestamp'),
    body,
  )
  if (!verified) {
    return c.text('invalid request signature', 401)
  }

  const parsedBody = JSON.parse(body)
  return c.json(await handleInteraction(parsedBody, c.env.DB))
})

/**
 * /api（JSON 404 は api.notFound が返す）と /interactions 以外は SPA の領分。
 * run_worker_first で Worker を通ったものの、Hono のどのルートにも一致しない
 * パスはここで静的アセットへフォールバックする（SPA のクライアントサイド
 * ルーティングと、生成された routeTree.gen.ts の対象パスを両方生かすため）。
 */
app.notFound((c) => c.env.ASSETS.fetch(c.req.raw))

export default {
  fetch: app.fetch,

  /** cron から呼ばれる。同期 → リマインダの順で回す。 */
  scheduled: async (_controller: ScheduledController, env: Bindings, ctx: ExecutionContext) => {
    const config = parseConfig(env)
    ctx.waitUntil(
      (async () => {
        const sync = await syncEvents(env, config)
        const remind = await runReminders(env, config)
        console.log(
          `同期: ${sync.fetched} 件取得 / ${sync.announced} 件告知${sync.seeded ? '（初期同期）' : ''}、リマインダ: ${remind.sent} 件送信`,
        )
      })(),
    )
  },
}
