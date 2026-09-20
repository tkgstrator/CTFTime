/**
 * 日時の整形をここ 1 箇所に集める。
 *
 * Discord は <t:unix:F> というネイティブ記法で各自のローカル時刻に描画してくれるが、
 * Web にはそれが無いので自前で整形する必要がある。
 *
 * web/lib ではなく shared に置いているのは __tests__ から import するため。
 * テストは DOM 型なしで動くので、ここも DOM に触れてはいけない。
 */

import dayjs from 'dayjs'
import 'dayjs/locale/ja'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(relativeTime)
dayjs.extend(localizedFormat)
dayjs.locale('ja')

/** 閲覧者のローカル時刻。例: 2026年9月25日 22:30 */
export const formatLocal = (iso: string): string => dayjs(iso).format('LLL')

/** 日付のみ。カレンダーの見出しなど。 */
export const formatDate = (iso: string): string => dayjs(iso).format('LL')

/** 時刻のみ。同じ日の中で開始と終了を並べるとき。 */
export const formatTime = (iso: string): string => dayjs(iso).format('HH:mm')

/** ツールチップに出す UTC 表記。ローカル時刻の裏付けとして添える。 */
export const formatUtc = (iso: string): string => `${dayjs.utc(iso).format('YYYY-MM-DD HH:mm')} UTC`

/** 「3日後」「2時間前」。 */
export const fromNow = (iso: string): string => dayjs(iso).fromNow()

/** 開催期間。同日で終わるなら終了側は時刻だけにする。 */
export const formatRange = (startIso: string, finishIso: string): string => {
  const start = dayjs(startIso)
  const finish = dayjs(finishIso)
  if (start.isSame(finish, 'day')) return `${start.format('LLL')} 〜 ${finish.format('HH:mm')}`
  return `${start.format('LLL')} 〜 ${finish.format('LLL')}`
}

/** 開催中か。両端の扱いは D1 側のクエリ（start_at <= now < finish_at）と揃えている。 */
export const isRunning = (startIso: string, finishIso: string, nowIso: string): boolean =>
  startIso <= nowIso && finishIso > nowIso

export const isPast = (finishIso: string, nowIso: string): boolean => finishIso <= nowIso

/**
 * カレンダーのグリッドに必要な範囲。月の 1 日を含む週の頭から、
 * 末日を含む週の終わりまで。API の from / to にそのまま渡せる ISO を返す。
 */
export const monthBounds = (monthIso: string): { from: string; to: string } => {
  const base = dayjs(monthIso).startOf('month')
  return {
    from: base.startOf('week').startOf('day').toISOString(),
    to: base.endOf('month').endOf('week').endOf('day').toISOString(),
  }
}

/** 月グリッドの 42 マス分の日付。 */
export const monthGridDays = (monthIso: string): string[] => {
  const start = dayjs(monthIso).startOf('month').startOf('week').startOf('day')
  return Array.from({ length: 42 }, (_, index) => start.add(index, 'day').toISOString())
}

export const isSameDay = (a: string, b: string): boolean => dayjs(a).isSame(dayjs(b), 'day')

/** その日にイベントが掛かっているか。複数日にまたがる開催を拾うため両端を見る。 */
export const overlapsDay = (startIso: string, finishIso: string, dayIso: string): boolean => {
  const dayStart = dayjs(dayIso).startOf('day')
  const dayEnd = dayjs(dayIso).endOf('day')
  return dayjs(startIso).isBefore(dayEnd) && dayjs(finishIso).isAfter(dayStart)
}
