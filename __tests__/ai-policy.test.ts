import { describe, expect, test } from 'bun:test'
import { detectAiPolicy } from '../src/ctftime/ai-policy'

describe('detectAiPolicy', () => {
  test('AI への言及がなければ unknown', () => {
    const result = detectAiPolicy('A jeopardy style CTF for students.', '')
    expect(result.policy).toBe('unknown')
    expect(result.snippets).toEqual([])
  })

  test('禁止の文脈は banned として拾う', () => {
    const result = detectAiPolicy('The use of AI tools such as ChatGPT is strictly prohibited.')
    expect(result.policy).toBe('banned')
    expect(result.snippets.length).toBeGreaterThan(0)
  })

  test('許可の文脈は allowed として拾う', () => {
    const result = detectAiPolicy('AI assistants are allowed during the competition.')
    expect(result.policy).toBe('allowed')
  })

  test('可否が読み取れない言及は mentioned', () => {
    const result = detectAiPolicy('Please read the AI usage rules on our website before playing.')
    expect(result.policy).toBe('mentioned')
  })

  test('問題ジャンルとしての AI は利用方針として扱わない', () => {
    const result = detectAiPolicy(
      'Challenges span Web, Pwn, Reverse Engineering, Crypto, Forensics, OSINT and AI.',
    )
    expect(result.policy).toBe('unknown')
    expect(result.snippets).toEqual([])
  })

  test('許可と禁止が混在したら禁止を優先する', () => {
    const result = detectAiPolicy(
      'AI is allowed for the warmup round.\n\n' +
        `${'x'.repeat(600)}\n\n` +
        'The use of LLMs is banned in the final round.',
    )
    expect(result.policy).toBe('banned')
  })

  test('日本語の禁止表現も拾う', () => {
    const result = detectAiPolicy('本大会では生成AIの利用を禁止します。')
    expect(result.policy).toBe('banned')
  })

  test('スニペットは原文を保ったまま重複を除く', () => {
    const result = detectAiPolicy('AI is banned. AI is banned.')
    expect(result.snippets).toHaveLength(1)
    expect(result.snippets[0]).toContain('AI is banned.')
  })

  test('スニペットは最大 3 件まで', () => {
    const description = Array.from(
      { length: 6 },
      (_unused, index) => `Rule ${index}: AI usage note ${index}.`,
    ).join(`\n${'y'.repeat(400)}\n`)
    expect(detectAiPolicy(description).snippets.length).toBeLessThanOrEqual(3)
  })
})
