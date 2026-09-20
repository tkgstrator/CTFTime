import { describe, expect, test } from 'bun:test'
import {
  EventDetailResponseSchema,
  EventListResponseSchema,
  type EventSummary,
  EventSummarySchema,
  SummaryResponseSchema,
} from '../src/shared/api'

/** 実データに近い 1 件（FAUST CTF, Attack-Defense）。 */
const EVENT_SUMMARY_FIXTURE: EventSummary = {
  id: 3312,
  title: 'FAUST CTF 2026',
  url: 'https://2026.faustctf.net/',
  ctftimeUrl: 'https://ctftime.org/event/3312/',
  logo: '',
  format: 'Attack-Defense',
  restrictions: 'Open',
  onsite: false,
  location: '',
  weight: 72.29,
  ctftimeParticipants: 120,
  discordParticipants: 4,
  startAt: '2026-06-27T08:00:00.000Z',
  finishAt: '2026-06-27T20:00:00.000Z',
  durationDays: 0,
  durationHours: 12,
  summary: 'Attack-Defense CTF for hardened services.',
  aiPolicy: 'unknown',
  aiSnippets: [],
  announced: true,
}

describe('EventSummarySchema', () => {
  test('往復しても値が変わらない', () => {
    const result = EventSummarySchema.safeParse(EVENT_SUMMARY_FIXTURE)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).toEqual(EVENT_SUMMARY_FIXTURE)
  })

  test('CTFTime の登録チーム数と Discord の参加表明数は別名で、混ざっていない', () => {
    expect(EVENT_SUMMARY_FIXTURE).not.toHaveProperty('participants')
    expect(EVENT_SUMMARY_FIXTURE.ctftimeParticipants).not.toBe(
      EVENT_SUMMARY_FIXTURE.discordParticipants,
    )
  })

  test('参加者数のどちらかが 0 でも 2 つのフィールドは残る', () => {
    const fixture = { ...EVENT_SUMMARY_FIXTURE, discordParticipants: 0 }
    const result = EventSummarySchema.safeParse(fixture)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.discordParticipants).toBe(0)
      expect(result.data.ctftimeParticipants).toBe(120)
    }
  })
})

describe('EventListResponseSchema', () => {
  test('一覧レスポンスの往復', () => {
    const body = {
      items: [EVENT_SUMMARY_FIXTURE],
      total: 1,
      page: 1,
      perPage: 20,
      hasMore: false,
    }
    const result = EventListResponseSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.items[0]?.discordParticipants).toBe(4)
  })
})

describe('EventDetailResponseSchema', () => {
  test('詳細レスポンス（参加者・通知履歴込み）の往復', () => {
    const body = {
      event: {
        ...EVENT_SUMMARY_FIXTURE,
        description: '長い説明文',
        prizes: 'Total Prize Pool: 2 BTC',
        organizers: ['bdhxgrp'],
      },
      participants: [{ userId: '123456789', displayName: 'alice', avatarHash: 'abcdef' }],
      notifications: [{ kind: 'new', sentAt: '2026-06-01T00:00:00.000Z' }],
    }
    const result = EventDetailResponseSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.event.ctftimeParticipants).toBe(120)
      expect(result.data.event.discordParticipants).toBe(4)
    }
  })

  test('display_name / avatar_hash が空文字の古い参加者行も通る', () => {
    const body = {
      event: { ...EVENT_SUMMARY_FIXTURE, description: '', prizes: '', organizers: [] },
      participants: [{ userId: '999', displayName: '', avatarHash: '' }],
      notifications: [],
    }
    expect(EventDetailResponseSchema.safeParse(body).success).toBe(true)
  })
})

describe('SummaryResponseSchema', () => {
  test('events テーブルが空でも lastSyncedAt は null で通る', () => {
    const body = {
      totals: { events: 0, running: 0, upcoming: 0, past: 0, participants: 0, announced: 0 },
      lastSyncedAt: null,
      facets: { formats: [], restrictions: [] },
      next: null,
    }
    expect(SummaryResponseSchema.safeParse(body).success).toBe(true)
  })

  test('next にも 2 種類の参加者数が別名で入る', () => {
    const body = {
      totals: { events: 1, running: 0, upcoming: 1, past: 0, participants: 4, announced: 1 },
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
      facets: { formats: ['Jeopardy'], restrictions: ['Open'] },
      next: EVENT_SUMMARY_FIXTURE,
    }
    const result = SummaryResponseSchema.safeParse(body)
    expect(result.success).toBe(true)
    if (result.success && result.data.next !== null) {
      expect(result.data.next.ctftimeParticipants).toBe(120)
      expect(result.data.next.discordParticipants).toBe(4)
    }
  })
})
