/**
 * CTFTime の API には AI 利用可否を表すフィールドが無い。
 * description / prizes の本文から AI への言及を拾い、周辺の語で許可・禁止を推定する。
 *
 * 推定は当たらないことがある前提で、判定と一緒に必ず原文スニペットを返す。
 * 読む側が原文で確かめられるなら、誤判定は誤解ではなく単なるノイズで済む。
 */

export const AI_POLICY_VALUES = ['allowed', 'banned', 'mentioned', 'unknown'] as const

export type AiPolicy = (typeof AI_POLICY_VALUES)[number]

export type AiPolicyResult = {
  policy: AiPolicy
  /** AI に言及している箇所の原文（前後を含む抜粋）。 */
  snippets: string[]
}

/** AI への言及を拾うパターン。語境界を入れて英単語の一部に当たらないようにする。 */
const AI_MENTION =
  /\bAI\b|\bA\.I\.|\bLLMs?\b|chat\s?-?gpt|\bgpt-?\d|\bcopilot\b|generative\s+\w+|artificial\s+intelligence|machine\s+learning|生成\s*AI|人工知能/gi

/** 言及箇所の周辺にあれば「禁止」と見なす語。 */
const BAN_HINT =
  /not\s+allow|not\s+permitted|disallow|prohibit|forbidd?en|forbid|\bbann?ed\b|\bno\s+(?:use\s+of\s+)?(?:ai|llm)|without\s+(?:the\s+use\s+of\s+)?(?:ai|llm)|禁止|不可|使用できません|認められません/i

/**
 * 「not allowed」のような否定つきの許可語。
 * これを先に落としておかないと、禁止文を許可とも読んでしまう。
 */
const NEGATED_ALLOW =
  /\b(?:not|never|no\s+longer|isn't|aren't|won't|cannot|can't|may\s+not|must\s+not)\s+(?:be\s+)?(?:allowed|permitted|used?)\b/gi

/** 言及箇所の周辺にあれば「許可」と見なす語。 */
const ALLOW_HINT =
  /\ballowed\b|\bpermitted\b|permissible|encouraged|\bwelcome\b|free\s+to\s+use|you\s+may\s+use|feel\s+free|許可|可能|自由に|認められ(?!ませ)/i

/** スニペットとして切り出す前後の文字数。 */
const CONTEXT_RADIUS = 140

/**
 * 判定に使う周辺文字数。
 * 広く取ると、離れた場所にある無関係な「allowed」まで拾ってしまう。
 */
const HINT_RADIUS = 100

/**
 * 「AI を使ってよいか」の話かどうかを見分ける語。
 * これが近くに無い AI は、Web や Pwn と並べて書かれた問題ジャンルとしての AI で、
 * 利用方針とは関係がないことがほとんど。
 */
const USAGE_CONTEXT =
  /\b(?:use|usage|using|used|tool|tools|assistant|assistance|agent|agents|help|solve|solving|rule|rules|policy|policies|allowed|permitted|prohibit|forbidd?en|bann?ed|cheat)\b|利用|使用|使っ|ツール|禁止|許可/i

const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim()

const hintContext = (haystack: string, index: number, length: number): string =>
  haystack.slice(
    Math.max(0, index - HINT_RADIUS),
    Math.min(haystack.length, index + length + HINT_RADIUS),
  )

const classifySnippet = (context: string): AiPolicy => {
  const banned = BAN_HINT.test(context)
  const allowed = ALLOW_HINT.test(context.replace(NEGATED_ALLOW, ' '))
  if (banned && !allowed) return 'banned'
  if (allowed && !banned) return 'allowed'
  return 'mentioned'
}

const extractSnippet = (haystack: string, index: number, length: number): string => {
  const head = Math.max(0, index - CONTEXT_RADIUS)
  const tail = Math.min(haystack.length, index + length + CONTEXT_RADIUS)
  const body = normalizeWhitespace(haystack.slice(head, tail))
  const prefix = head > 0 ? '…' : ''
  const suffix = tail < haystack.length ? '…' : ''
  return `${prefix}${body}${suffix}`
}

/**
 * 複数の言及が食い違ったときの優先順位。
 * 禁止の見落としが一番損害が大きいので、禁止を最優先で拾い上げる。
 */
const reducePolicy = (found: AiPolicy[]): AiPolicy => {
  if (found.length === 0) return 'unknown'
  if (found.includes('banned')) return 'banned'
  if (found.includes('allowed')) return 'allowed'
  return 'mentioned'
}

/** イベント本文から AI 利用方針を推定する。 */
export const detectAiPolicy = (...texts: string[]): AiPolicyResult => {
  const haystack = texts.filter((text) => text.length > 0).join('\n\n')
  const matches = Array.from(haystack.matchAll(AI_MENTION))
    .map((match) => ({ match, context: hintContext(haystack, match.index, match[0].length) }))
    .filter((entry) => USAGE_CONTEXT.test(entry.context))

  const found = matches.map((entry) => classifySnippet(entry.context))
  const snippets = matches
    .map(({ match }) => extractSnippet(haystack, match.index, match[0].length))
    .filter((snippet, position, all) => all.indexOf(snippet) === position)
    .slice(0, 3)

  return { policy: reducePolicy(found), snippets }
}

/** Discord 表示用のラベル。 */
export const describeAiPolicy = (policy: AiPolicy): string => {
  if (policy === 'allowed') return '🟢 利用可の記述あり'
  if (policy === 'banned') return '🔴 禁止の記述あり'
  if (policy === 'mentioned') return '🟡 言及あり（可否は要確認）'
  return '⚪ 記載なし'
}
