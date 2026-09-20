# ctftime-bot

CTFTime のイベント情報を取得して Discord に通知する Bot。
Cloudflare Workers の Cron Triggers で動き、常駐プロセスを持たない。

- **新規登録**されたイベントを告知し、その場に「参加する」ボタンを出す
- ボタンを押したイベントについてだけ、**24時間前 / 1時間前 / 開始 / 終了**に通知する
- 各イベントの **AI 利用可否**を description から拾って、判定と原文の抜粋を並べて表示する

## AI 利用可否について

CTFTime の API には AI 利用可否を表すフィールドが無い。
そこで `description` と `prizes` の本文から AI への言及を探し、周辺の語で可否を推定している。

| 表示 | 意味 |
| --- | --- |
| 🟢 利用可の記述あり | 近くに allowed / permitted などがある |
| 🔴 禁止の記述あり | 近くに prohibited / not allowed / 禁止 などがある |
| 🟡 言及あり（可否は要確認） | AI に触れているが可否を読み取れない |
| ⚪ 記載なし | AI 利用方針についての記述が見つからない |

推定は外れる。だから判定ラベルの下には必ず**原文の抜粋を引用で添える**——読む側が原文で確かめられるなら、
誤判定は誤解ではなく単なるノイズで済む。最終的な可否は必ず公式ルールで確認すること。

なお「Web, Pwn, Crypto, … and AI」のような**問題ジャンルとしての AI** は利用方針ではないので、
利用文脈（use / tool / assistant / rule / 利用 / 禁止 …）が近くに無い言及は判定から除外している。
実データ 33 件で試したところ、この除外を入れる前は 4 件中 2 件が誤検出だった。

## 構成

```
src/
├── index.ts              Hono アプリ（/interactions）と scheduled ハンドラ
├── config.ts             バインディングの検証
├── ctftime/
│   ├── client.ts         CTFTime API の取得
│   ├── schema.ts         レスポンスの Zod スキーマ
│   └── ai-policy.ts      AI 利用可否の推定
├── db/
│   ├── model.ts          保存形式への変換（時刻は UTC ISO8601 に正規化）
│   └── repository.ts     D1 アクセス
├── discord/
│   ├── verify.ts         Ed25519 署名検証
│   ├── rest.ts           メッセージ投稿・編集
│   ├── embed.ts          Embed とボタンの組み立て
│   ├── commands.ts       スラッシュコマンド定義
│   └── interactions.ts   インタラクション処理
└── jobs/
    ├── sync.ts           CTFTime 同期と新規告知
    └── remind.ts         参加表明者向けリマインダ
```

Gateway には繋がない。Discord の **Interactions Endpoint URL**（HTTPS に署名付き POST が飛んでくる方式）
を使うので、Workers だけで Bot が成立する。

## セットアップ

所要 15 分ほど。Cloudflare の無料プランで動く。

### 0. 用意するもの

- [Bun](https://bun.sh)（wrangler もこれ経由で動かすので Node.js の準備は要らない）
- Cloudflare アカウント（Workers と D1 が使えれば無料プランでよい）
- Discord サーバの管理権限（Bot を招待するのに必要）

`biome-plugins` を git submodule で参照しているので、クローンは再帰的に行う。

```bash
git clone --recursive <このリポジトリの URL> ctftime-bot
cd ctftime-bot
bun install
```

すでに `--recursive` なしでクローンしてしまった場合は `git submodule update --init` で追える。
（`biome-plugins` が空だと `bun run lint` が落ちる）

初回だけ Cloudflare にログインしておく。

```bash
bunx wrangler login
```

### 1. Discord アプリケーションを作る

[Discord Developer Portal](https://discord.com/developers/applications) で New Application。

- **General Information** の Application ID と Public Key を控える
- **Bot** タブで Reset Token してトークンを控える（一度しか表示されない）
- **OAuth2 > URL Generator** で `bot` と `applications.commands` を選び、
  Bot Permissions に `Send Messages` と `Embed Links` を付けてサーバに招待する

### 2. D1 を作る

```bash
bun install
bunx wrangler d1 create ctftime-bot
```

出力された `database_id` を `wrangler.toml` の `REPLACE_WITH_D1_DATABASE_ID` に書き込む
（`[[d1_databases]]` と `[[env.production.d1_databases]]` の両方）。staging も使うなら同様に。

```bash
bun run db:migrate        # 本番の D1 にスキーマを適用
```

### 3. 設定を入れる

通知先チャンネルは `wrangler.toml` の `[vars]` に書く（機密ではないため）。

```toml
DISCORD_CHANNEL_ID = "123456789012345678"
```

認証情報は secret で渡す。

```bash
bunx wrangler secret put DISCORD_APPLICATION_ID
bunx wrangler secret put DISCORD_PUBLIC_KEY
bunx wrangler secret put DISCORD_BOT_TOKEN
```

ローカルで動かす分は `.dev.vars` に書く（git 管理外）。

```bash
cp .dev.vars.example .dev.vars
```

### 4. デプロイして Discord に繋ぐ

```bash
bun run deploy
```

デプロイで出た URL に `/interactions` を付けたものを、Developer Portal の
**General Information > Interactions Endpoint URL** に設定して保存する。
保存時に Discord が署名付きの PING を投げて検証するので、ここで弾かれる場合は
`DISCORD_PUBLIC_KEY` を確認する。

最後にスラッシュコマンドを登録する。

認証情報は `.dev.vars` から読むので、手順 3 で用意してあれば引数は要らない。

```bash
# 全サーバ向け（反映に最大 1 時間かかる）
bun run discord:register

# 開発中はギルド限定にすると即時反映される
GUILD_ID=<サーバID> bun run discord:register
```

`.dev.vars` を使わないなら `DISCORD_APPLICATION_ID=... DISCORD_BOT_TOKEN=... bun run discord:register`
のように環境変数で渡してもよい（環境変数のほうが優先される）。

初回の cron 実行は**告知をしない**。イベントを取り込むだけで、全件を通知済みとして記録する
（そうしないと既存の数十件が一斉に流れる）。「初期同期が完了しました」とだけ投稿される。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `/ctf upcoming [days]` | 開催予定のイベント一覧（既定 14 日先まで、最大 10 件） |
| `/ctf joined` | 自分が参加表明したイベント一覧 |
| `/ctf info <event_id>` | イベント詳細と参加ボタン。AI 利用可否の原文つき |

いずれも本人にだけ見える（ephemeral）。参加表明は告知メッセージのボタンからでも、
`/ctf info` のボタンからでも同じように登録される。

## 設定項目

`wrangler.toml` の `[vars]`。新規告知の絞り込みに使う。リマインダ側には効かない。

| 変数 | 既定 | 内容 |
| --- | --- | --- |
| `DISCORD_CHANNEL_ID` | （必須） | 告知・リマインダの投稿先 |
| `ANNOUNCE_MIN_WEIGHT` | `0` | CTFTime の weight がこれ未満のイベントは告知しない |
| `ANNOUNCE_ONSITE` | `false` | オンサイト開催を告知するか |
| `ANNOUNCE_RESTRICTIONS` | `Open` | 告知する参加条件（カンマ区切り。`Open,Academic` など） |
| `ANNOUNCE_FORMATS` | `Jeopardy,Attack-Defense,Hack quest` | 告知する形式（カンマ区切り） |
| `LOOKAHEAD_DAYS` | `60` | 何日先までのイベントを取得するか |

## 通知のタイミング

cron は 15 分おき。各通知は `notifications` テーブルで（イベント × 種類）ごとに 1 回だけと保証される。

| 種類 | 条件 | 対象 |
| --- | --- | --- |
| `new` | 新しく CTFTime に載った | チャンネル全体 |
| `reminder_24h` | 開始まで 22〜24 時間 | 参加表明者をメンション |
| `reminder_1h` | 開始まで 30〜60 分 | 同上 |
| `start` | 開催中になった | 同上 |
| `end` | 終了した | 同上 |

窓を cron 間隔より広く取ってあるのは、実行が 1 回飛んでも取りこぼさないため。
送信に失敗した場合は通知済みの記録を取り消すので、次の cron で再試行される。

終了から 30 日経ったイベントは同期のたびに削除される（参加表明と通知履歴も連鎖して消える）。

## ローカル開発

```bash
cp .dev.vars.example .dev.vars   # 手順 3 で作っていなければここで
bun run db:migrate:local
bun run dev --test-scheduled
```

- `curl "http://localhost:8787/__scheduled?cron=*/15+*+*+*+*"` で cron を手動実行できる
- `/interactions` は署名検証を通るので、試すには Ed25519 で署名した POST を投げる必要がある
- D1 の中身は `bunx wrangler d1 execute ctftime-bot --local --command "SELECT ..."` で覗ける

```bash
bun run typecheck
bun run lint
bun test
```

## GitHub Actions でのデプロイ

`.github/workflows/deployment.yaml` が入っている。PR がマージされたとき、または手動実行で動く。
マイグレーションを当ててからデプロイする順序になっているので、スキーマ変更を含む PR でも壊れない。

リポジトリの **Settings > Secrets and variables > Actions** に 2 つ登録する。

| Secret | 取得場所 |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Cloudflare ダッシュボード > My Profile > API Tokens（`Edit Cloudflare Workers` テンプレート + D1 の編集権限） |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages の右サイドバー |

デフォルトブランチ宛の PR は production、それ以外は staging に出る。
staging を使うなら `bunx wrangler d1 create ctftime-bot-staging` で DB を作り、
`wrangler.toml` の `[[env.staging.d1_databases]]` に `database_id` を書いておく。
secret も環境ごとに必要（`bunx wrangler secret put DISCORD_BOT_TOKEN --env staging`）。

## つまずいたら

**Interactions Endpoint URL の保存が弾かれる**
Discord が署名付きの PING を投げて検証している。デプロイ済みか、URL の末尾が `/interactions` か、
`DISCORD_PUBLIC_KEY` が Bot Token ではなく General Information の Public Key かを確認する。
`bunx wrangler tail` を流しながら保存すると、リクエストが届いているかどうかが分かる。

**`/ctf` がサーバに出てこない**
グローバル登録は反映に最大 1 時間かかる。`GUILD_ID=... bun run discord:register` なら即時。
それでも出ないなら、招待 URL に `applications.commands` スコープが入っていなかった可能性が高い
（入れ直して招待し直す）。

**通知が来ない**
まず `bunx wrangler tail` で cron が動いているかを見る。動いているのに投稿されない場合は、
`DISCORD_CHANNEL_ID` が正しいか、Bot がそのチャンネルで `Send Messages` と `Embed Links` を持つか、
`ANNOUNCE_MIN_WEIGHT` などのフィルタで弾かれていないかを順に確認する。
**初回の cron は仕様として告知しない**（「セットアップ」の手順 4 を参照）。

**`bun run lint` が大量に落ちる**
`biome-plugins` submodule が空。`git submodule update --init` で取得する。

**`d1 migrations apply` が database not found になる**
`wrangler.toml` の `database_id` が `REPLACE_WITH_D1_DATABASE_ID` のまま。
`bunx wrangler d1 list` で ID を確認して書き込む。

## 既知の制約

- AI 利用可否はキーワード推定なので、公式ルールページにしか書かれていない方針は拾えない
- CTFTime API は開始時刻が範囲内のイベントしか返さないため、`LOOKAHEAD_DAYS` より先のイベントは
  その日が近づくまで検知されない
- 参加表明はユーザ単位。チーム単位の管理はしていない
