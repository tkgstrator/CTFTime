import { describe, expect, test } from 'bun:test'
import dayjs from 'dayjs'
import { buildEventQuery } from '../src/db/browse'
import { EVENT_QUERY_DEFAULTS, EVENT_SORTS } from '../src/shared/api'

const NOW = dayjs('2026-01-01T00:00:00.000Z')

const countPlaceholders = (where: string): number => {
  const matches = where.match(/\?/g)
  return matches === null ? 0 : matches.length
}

describe('buildEventQuery', () => {
  test('upcoming は start_at > now を条件にする', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'upcoming' }, NOW)
    expect(plan.where).toBe('start_at > ?')
    expect(plan.params).toEqual([NOW.toISOString()])
  })

  test('running は開始済みかつ未終了を条件にする', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'running' }, NOW)
    expect(plan.where).toBe('start_at <= ? AND finish_at > ?')
    expect(plan.params).toEqual([NOW.toISOString(), NOW.toISOString()])
  })

  test('past は finish_at <= now を条件にする', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'past' }, NOW)
    expect(plan.where).toBe('finish_at <= ?')
    expect(plan.params).toEqual([NOW.toISOString()])
  })

  test('all は時刻の条件を付けず、フィルタが無ければ 1 = 1 になる', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'all' }, NOW)
    expect(plan.where).toBe('1 = 1')
    expect(plan.params).toEqual([])
  })

  test('sort はホワイトリストの列名しか出さない', () => {
    const allowedColumns = new Set(['start_at', 'weight', 'participants', 'title'])
    for (const sort of EVENT_SORTS) {
      const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, sort }, NOW)
      const [column] = plan.orderBy.split(' ')
      expect(allowedColumns.has(column === undefined ? '' : column)).toBe(true)
    }
  })

  test('sort の向きも sort 値ごとに正しい', () => {
    const upcoming = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, sort: '-weight' }, NOW)
    expect(upcoming.orderBy).toBe('weight DESC, id ASC')
    const title = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, sort: 'title' }, NOW)
    expect(title.orderBy).toBe('title ASC, id ASC')
  })

  test('ORDER BY には常に id ASC のタイブレークを付ける', () => {
    for (const sort of EVENT_SORTS) {
      const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, sort }, NOW)
      expect(plan.orderBy.endsWith(', id ASC')).toBe(true)
    }
  })

  test('q は % と _ をエスケープしてバインドする（列名ではなく値として渡す）', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'all', q: '50%_off' }, NOW)
    expect(plan.where).toContain("ESCAPE '\\'")
    expect(plan.params).toContain('50\\%\\_off')
  })

  test('q に含まれるバックスラッシュも二重エスケープする', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'all', q: 'a\\b' }, NOW)
    expect(plan.params).toContain('a\\\\b')
  })

  test('format / restrictions / ai / onsite / from / to をすべて指定すると AND で連結される', () => {
    const plan = buildEventQuery(
      {
        ...EVENT_QUERY_DEFAULTS,
        range: 'running',
        q: 'ctf',
        format: 'Jeopardy',
        restrictions: 'Open',
        ai: 'banned',
        onsite: 'onsite',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      },
      NOW,
    )
    expect(plan.where).toContain('format = ?')
    expect(plan.where).toContain('restrictions = ?')
    expect(plan.where).toContain('ai_policy = ?')
    expect(plan.where).toContain('onsite = ?')
    expect(plan.where).toContain('finish_at >= ?')
    expect(plan.where).toContain('start_at <= ?')
  })

  test('バインドするパラメータ数はプレースホルダの数と一致する（全フィルタ指定時）', () => {
    const plan = buildEventQuery(
      {
        ...EVENT_QUERY_DEFAULTS,
        range: 'running',
        q: 'ctf',
        format: 'Jeopardy',
        restrictions: 'Open',
        ai: 'banned',
        onsite: 'onsite',
        from: '2026-01-01T00:00:00.000Z',
        to: '2026-02-01T00:00:00.000Z',
      },
      NOW,
    )
    expect(countPlaceholders(plan.where)).toBe(plan.params.length)
  })

  test('バインドするパラメータ数はプレースホルダの数と一致する（デフォルト設定）', () => {
    const plan = buildEventQuery(EVENT_QUERY_DEFAULTS, NOW)
    expect(countPlaceholders(plan.where)).toBe(plan.params.length)
  })

  test('フィルタを何も指定しなければ AND で連結する条件が無い', () => {
    const plan = buildEventQuery({ ...EVENT_QUERY_DEFAULTS, range: 'all' }, NOW)
    expect(plan.where.includes('AND')).toBe(false)
  })
})
