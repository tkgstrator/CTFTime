import dayjs from 'dayjs'
import { Hono } from 'hono'
import { z } from 'zod'
import type { Bindings } from '@/config'
import { listEvents, listNotifications, toEventDetail, toEventSummary } from '@/db/browse'
import { countParticipantsByEvent, getEvent, listParticipants } from '@/db/repository'
import type { EventDetailResponse, EventListResponse } from '@/shared/api'
import { EventQuerySchema } from '@/shared/api'
import { badRequestError, notFoundError } from './errors'

export const eventsRoute = new Hono<{ Bindings: Bindings }>()

const describeQueryIssues = (issues: readonly { path: PropertyKey[]; message: string }[]): string =>
  issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join(' / ')

eventsRoute.get('/events', async (c) => {
  const parsedQuery = EventQuerySchema.safeParse(c.req.query())
  if (!parsedQuery.success) {
    throw badRequestError(describeQueryIssues(parsedQuery.error.issues))
  }
  const query = parsedQuery.data
  const now = dayjs()
  const { items, total } = await listEvents(c.env.DB, query, now)

  const eventIds = items.map((event) => event.id)
  const participantCounts = await countParticipantsByEvent(c.env.DB, eventIds)
  const summaries = items.map((event) => {
    const count = participantCounts.get(event.id)
    return toEventSummary(event, count === undefined ? 0 : count)
  })

  const body: EventListResponse = {
    items: summaries,
    total,
    page: query.page,
    perPage: query.perPage,
    hasMore: query.page * query.perPage < total,
  }
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(body)
})

eventsRoute.get('/events/:id', async (c) => {
  const parsedId = z.coerce.number().int().safeParse(c.req.param('id'))
  if (!parsedId.success) {
    throw badRequestError('id は整数で指定してください')
  }

  const event = await getEvent(c.env.DB, parsedId.data)
  if (event === null) {
    throw notFoundError(`event ${parsedId.data} は見つかりません`)
  }

  const [participants, notifications] = await Promise.all([
    listParticipants(c.env.DB, event.id),
    listNotifications(c.env.DB, event.id),
  ])

  const body: EventDetailResponse = {
    event: toEventDetail(event, participants.length),
    participants,
    notifications,
  }
  c.header('Cache-Control', 'public, max-age=60')
  return c.json(body)
})
