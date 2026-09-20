type PrizesSectionProps = {
  prizes: string
}

/**
 * 賞品・賞金の記載。
 *
 * CTFTime の prizes は完全な自由記述で、「Total Prize Pool: 2 BTC」もあれば
 * 「TBD」だけのことも、「現地参加チームのみ」のように条件が本文にしか
 * 書かれていないこともある。金額として構造化すると条件が落ちて誤解を生むので、
 * AI 利用方針と同じく要約せず原文のまま出す。
 */
export const PrizesSection = ({ prizes }: PrizesSectionProps) => (
  <div className="space-y-3">
    <h2 className="text-xl font-semibold">賞品・賞金</h2>
    {prizes.length > 0 ? (
      <>
        <p className="max-w-3xl whitespace-pre-line text-sm leading-relaxed">{prizes}</p>
        <p className="text-xs text-muted-foreground">
          CTFTime に登録された原文です。条件や金額の確定状況は大会の公式サイトを確認してください。
        </p>
      </>
    ) : (
      <p className="text-sm text-muted-foreground">賞品・賞金の記載はありません。</p>
    )}
  </div>
)
