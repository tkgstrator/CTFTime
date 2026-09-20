/**
 * イベントデータの出典が CTFTime であることの明記。
 * /about に保持期間や判定の性質を書くが、出典だけは全ページの足元で常に見えるようにする。
 */
export const SiteFooter = () => (
  <footer className="border-t">
    <div className="mx-auto max-w-5xl px-4 py-6 text-xs text-muted-foreground">
      <p>
        イベント情報は{' '}
        <a
          href="https://ctftime.org/"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-4 hover:text-foreground"
        >
          CTFTime
        </a>{' '}
        から取得しています。参加表明は Discord サーバー上で行ってください。
      </p>
    </div>
  </footer>
)
