type DescriptionSectionProps = {
  description: string
}

/**
 * CTFTime から取得した説明文の全文。
 *
 * Discord embed は 400 文字で切り詰めるが、ここでは切らない。改行は CRLF のままの
 * プレーンテキストで、CSS の white-space: pre-line が \r\n を改行として扱うため
 * そのまま渡せる。第三者 API からの未信頼テキストなので dangerouslySetInnerHTML は使わない。
 */
export const DescriptionSection = ({ description }: DescriptionSectionProps) => (
  <div className="space-y-3">
    <h2 className="text-xl font-semibold">説明</h2>
    {description.length > 0 ? (
      <p className="whitespace-pre-line text-sm leading-relaxed">{description}</p>
    ) : (
      <p className="text-sm text-muted-foreground">説明は登録されていません。</p>
    )}
  </div>
)
