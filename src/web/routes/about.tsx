import { createFileRoute } from '@tanstack/react-router'
import { Separator } from '@/web/components/ui/separator'

/**
 * 告知条件・AI 判定の性質・保持期間・出典の説明。埋め草ではない正典ページ。
 * 各所のバッジやリンク（例: ai-policy.tsx の「判定の仕組み」リンク）は
 * ここへ辿り着ける前提で書かれているので、リンク先の見出しを削らないこと。
 */
export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl space-y-10 px-4 py-10">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">About</h1>
        <p className="text-muted-foreground">
          このサイトは、Discord ボットが CTFTime
          から同期しているイベント情報を、認証なしで誰でも読める形にしたものです。参加表明のような書き込みを伴う操作は
          Discord サーバー側で行うもので、このサイト自体には参加登録の機能はありません。
        </p>
        <p className="text-sm text-muted-foreground">
          日時はすべて閲覧環境のローカルタイムゾーンで表示しています。日時の表示にカーソルを乗せる（スマートフォンではタップする）と
          UTC 表記も確認できます。
        </p>
      </div>

      <Separator />

      <div className="scroll-mt-20 space-y-3" id="ai-policy">
        <h2 className="text-xl font-semibold">AI 利用方針の判定について</h2>
        <p className="text-muted-foreground">
          CTFTime の API には「AI
          の利用可否」を表すフィールドがありません。この判定は各イベントの説明文を読み、AI
          への言及の周辺にある語（許可・禁止・使用不可
          など）から機械的に拾っているだけの推測（ヒューリスティック）です。文面によっては外れます。
        </p>
        <p className="text-muted-foreground">
          そのため判定には必ず、判断の根拠にした原文スニペットが一緒に表示されます。判定結果だけを鵜呑みにせず、根拠になった原文を自分の目で確認できることを優先しています。最終的な可否は各大会の公式ルールが常に優先するので、判定結果はあくまで確認の手がかりとして使ってください。
        </p>
      </div>

      <Separator />

      <div className="scroll-mt-20 space-y-3" id="announce-filter">
        <h2 className="text-xl font-semibold">「Discord 未告知」について</h2>
        <p className="text-muted-foreground">
          データベースには CTFTime が返す全イベントを保存していますが、Discord
          チャンネルに告知するのは
          weight（大会の格付け）・オンサイト開催かどうか・参加条件（restrictions）・出題形式（format）という運営側の設定を満たしたイベントだけです。
        </p>
        <p className="text-muted-foreground">
          このフィルタで外れたイベントもデータ自体は消えずここに残っています。Discord
          の通知だけでは見えない大会までまとめて拾えることが、このサイトを別に用意している大きな理由の一つです。
        </p>
      </div>

      <Separator />

      <div className="scroll-mt-20 space-y-3" id="retention">
        <h2 className="text-xl font-semibold">データの保持と出典</h2>
        <p className="text-muted-foreground">
          一度取得したイベントは削除しません。終了した大会も参加表明や通知履歴とあわせて残るので、アーカイブは運用を続けるほど厚くなっていきます。逆に、ボットが動き出す前に終わった大会はそもそも取得していないため、過去に遡れる範囲には限りがあります。
        </p>
        <p className="text-muted-foreground">
          イベント情報の出典は{' '}
          <a
            href="https://ctftime.org/"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4"
          >
            CTFTime
          </a>{' '}
          です。より正確な最新情報や、ここに残っていない過去の大会の記録は CTFTime
          側を参照してください。
        </p>
      </div>
    </section>
  )
}
