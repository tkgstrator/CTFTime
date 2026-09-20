import { describe, expect, test } from 'bun:test'
import { CtftimeEventListSchema } from '../src/ctftime/schema'
import { toStoredEvent } from '../src/db/model'

/** CTFTime API の実レスポンスから 1 件を抜き出したもの。 */
const SAMPLE_EVENT = {
  organizers: [{ id: 193805, name: 'bdhxgrp' }],
  ctftime_url: 'https://ctftime.org/event/3374/',
  ctf_id: 1653,
  weight: 0.0,
  duration: { hours: 0, days: 2 },
  live_feed: '',
  logo: 'https://ctftime.org//media/events/logo_134.png',
  id: 3374,
  title: 'BCS CTF 2026',
  start: '2026-09-25T14:00:00+00:00',
  participants: 31,
  location: '',
  finish: '2026-09-27T14:00:00+00:00',
  description: 'AI tools are not allowed during this competition.',
  format: 'Jeopardy',
  is_votable_now: false,
  prizes: '',
  format_id: 1,
  onsite: false,
  restrictions: 'Open',
  url: 'https://ctf.bcsictfest.com/',
  public_votable: true,
}

const SAMPLE = [SAMPLE_EVENT]

describe('CtftimeEventListSchema', () => {
  test('実レスポンスをパースできる', () => {
    const result = CtftimeEventListSchema.safeParse(SAMPLE)
    expect(result.success).toBe(true)
  })

  test('未知のフィールドがあってもパースを妨げない', () => {
    const result = CtftimeEventListSchema.safeParse([{ ...SAMPLE_EVENT, brand_new_field: 1 }])
    expect(result.success).toBe(true)
  })

  test('必須フィールドが欠けたら失敗する', () => {
    const { title: _title, ...withoutTitle } = SAMPLE_EVENT
    expect(CtftimeEventListSchema.safeParse([withoutTitle]).success).toBe(false)
  })
})

describe('toStoredEvent', () => {
  const parsed = CtftimeEventListSchema.safeParse(SAMPLE)
  if (!parsed.success) throw new Error('サンプルのパースに失敗しました')
  const first = parsed.data[0]
  if (first === undefined) throw new Error('サンプルが空です')
  const event = toStoredEvent(first)

  test('時刻を UTC の ISO8601 に正規化する', () => {
    expect(event.startAt).toBe('2026-09-25T14:00:00.000Z')
    expect(event.finishAt).toBe('2026-09-27T14:00:00.000Z')
  })

  test('主催者名を取り出す', () => {
    expect(event.organizers).toEqual(['bdhxgrp'])
  })

  test('description から AI 方針を判定する', () => {
    expect(event.aiPolicy).toBe('banned')
    expect(event.aiSnippets.length).toBeGreaterThan(0)
  })
})
