import { useEffect, useState } from 'react'
import { z } from 'zod'

const HealthSchema = z.object({ ok: z.boolean() })

/** 読み込み中・失敗・成功を取り違えないよう、状態は 1 つの union で持つ。 */
type Health = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' }

const fetchHealth = async (): Promise<Health> => {
  const response = await fetch('/api/health')
  if (!response.ok) {
    return { status: 'error', message: `API が ${response.status} を返しました` }
  }
  const parsed = HealthSchema.safeParse(await response.json())
  if (!parsed.success) {
    return { status: 'error', message: 'API の応答を解釈できませんでした' }
  }
  return { status: 'ready' }
}

/**
 * まだ中身のない仮ページ。ここでは SPA が配信されていることと、
 * 同じ Worker の API に到達できていることだけを確かめる。
 */
export const App = () => {
  const [health, setHealth] = useState<Health>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    fetchHealth()
      .then((next) => {
        if (!controller.signal.aborted) setHealth(next)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setHealth({ status: 'error', message: 'API に接続できませんでした' })
        }
      })
    return () => controller.abort()
  }, [])

  return (
    <main className="shell">
      <h1>ctftime-bot</h1>
      <p className="lead">CTFTime の開催予定を Discord に流し、参加表明を集めます。</p>
      <p className={`status status--${health.status}`}>
        {health.status === 'loading' ? 'API を確認しています…' : null}
        {health.status === 'ready' ? 'API に接続できました。' : null}
        {health.status === 'error' ? health.message : null}
      </p>
    </main>
  )
}
