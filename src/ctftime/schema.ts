import { z } from 'zod'

/**
 * CTFTime は未設定の文字列フィールドを null ではなく空文字で返し、
 * description には CRLF がそのまま入る。trim だけかけて素通しする。
 */
const externalText = z.string().trim()

export const CtftimeOrganizerSchema = z.object({
  id: z.number().int(),
  name: externalText,
})

export const CtftimeDurationSchema = z.object({
  days: z.number().int().nonnegative(),
  hours: z.number().int().nonnegative(),
})

export const CtftimeEventSchema = z.object({
  id: z.number().int(),
  ctf_id: z.number().int(),
  title: externalText,
  description: externalText,
  url: externalText,
  ctftime_url: externalText,
  logo: externalText,
  format: externalText,
  restrictions: externalText,
  location: externalText,
  prizes: externalText,
  onsite: z.boolean(),
  weight: z.number(),
  participants: z.number().int().nonnegative(),
  start: z.iso.datetime({ offset: true }),
  finish: z.iso.datetime({ offset: true }),
  duration: CtftimeDurationSchema,
  organizers: z.array(CtftimeOrganizerSchema).default([]),
})

export type CtftimeEvent = z.infer<typeof CtftimeEventSchema>

export const CtftimeEventListSchema = z.array(CtftimeEventSchema)
