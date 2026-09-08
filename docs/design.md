# kotowari 設計

kotowari は一人で使うローカルファーストなプロジェクト管理・意思決定記録ツールである。
Web UI から Issue、Project、ADR、Page を作成し、文書を読み書きする。
Linear の密度とキーボード操作を借りるが、チーム製品の複製ではない。
二つの中核は **Issue**（何をするか）と **ADR**（なぜそう決めたか）である。
扱いは別であり、番号もディレクトリも共有しない。
結びは多対多の参照である。
データは Markdown、TOML、JSONL を正とし、SQLite は持たない。
エージェントがファイルを直接編集でき、次の API 読み込みで UI に載る。

## 誰のための kotowari か

利用者は常に一人である。
担当者、メンバー、Inbox、通知、権限、リアルタイム共同編集は持たない。
複数人で同じワークスペースを共有する前提も持たない。

複数マシン間の受け渡しは、自分用のスナップショットとして `kotowari push` と `kotowari pull` で行う。
マージはしない。
後勝ちの置き換えである。

## 残すもの

Issue、ADR、Board、Project、Cycle、Label、Page、キーボード操作、コマンドパレット、skills である。
Cycle は自分の時間枠である。チームのスプリントではない。
サブ Issue は大きい仕事を自分で分解するための親子関係である。
カスタム View は、よく使う絞り込みを名前付きで残すものである。
コメントは会話ではなく、自分へのメモである。
Page は軽量メモである。Design Doc の置き場であり、意思決定の正ではない。

## 含めないもの

次は人と組織のための機能であり、今後も入れない。

- 担当者、メンバー、チーム、権限
- Inbox、通知、リアルタイム同期
- ブロック関係、見積もり
- Issue への汎用添付、Initiative
- 内蔵のコーディングエージェント、任意の JavaScript アプリ実行
- GitHub Issue 連携
- SQLite（正としてもキャッシュとしても）

最初のスライスでは、kotowari 自身がベンチや翻訳を行うこともしない。

## ワークスペース

既定はカレントディレクトリの `.kotowari/` である。
環境変数 `KOTOWARI_HOME` があればそれを使う。
初期化の判定は `workspace.toml` の有無である。
`kotowari init` は対象プロジェクトの `.agents/skills/` へ製品 skills をコピーする。

```
$KOTOWARI_HOME/
  workspace.toml
  labels.toml
  projects/<slug>.toml
  cycles/<n>.toml
  views/<slug>.toml
  issues/00012/README.md
  adr/00001/README.md
  adr/00001/PUBLISH.md
  adr/00001/assets/diagram.html
  adr/00001/experiments/
  .history/
  .local/ai/
  pages/<slug>.md
  TEMPLATE/ISSUE.md
  TEMPLATE/ADR.md
  activities.jsonl
```

番号は 5 桁ゼロ埋めである。
カウンタは Issue と ADR で別である。
接頭辞の既定は `ISS` と `ADR` であり、`workspace.toml` の `issuePrefix` / `adrPrefix` で変えられる。
パスは番号だけなので、接頭辞を変えてもディレクトリは動かない。
既存の `issues/ISS-n.md` と `issues/SEN-n.md` は読み込み時に `issues/0000n/README.md` へ移す。

Issue と ADR と Page は `+++` で囲んだ TOML frontmatter と Markdown 本文である。
kotowari が読むのは各件の `README.md`（と ADR の `PUBLISH.md`）だけである。
Issue 配下の他ファイルは無視する。
図や画像は `adr/NNNNN/assets/` に置く。
実験コードは `adr/NNNNN/experiments/` に置く。
文書の保存履歴は `.history/`、ACP の会話状態は `.local/ai/` に保存する。
メモは Issue ファイルの `[[comments]]` に置く。
活動履歴は追記の JSONL である。
サブ Issue は frontmatter の `parent`（親の識別子）で表す。
循環参照は拒否する。

リンクは双方の frontmatter に書く。

Issue: `adrs = [1, 2]`
ADR: `issues = [12, 15]`

UI と API でリンクしたときは両側を更新する。
ファイルを直接いじって片側だけになったものは `kotowari check` が見つけて診断する。
自動修復はしない。

## ランタイム

`kotowari` は単一の Go バイナリである。短い別名は作らない。

- `kotowari init`：`.kotowari/` と空の `workspace.toml` を作り、skills を `.agents/skills/` へコピーする
- `kotowari serve`：JSON API と SPA を `127.0.0.1:7730` で出す
- `kotowari list`：`--issues` と `--adr` で識別子とタイトルを一覧する。`--status` で絞り、`--long` で状態と日付も出す
- `kotowari adr new [--supersedes N] [--status proposed] [--issue N] TITLE`：ADR を作る。エディタは開かない。`--supersedes` は旧 ADR を `superseded` にする
- `kotowari adr status <id> <status>`：状態を変える。`superseded --by N` は後続 ADR の `supersedes` を結ぶ
- `kotowari adr generate toc`：Markdown の目次を標準出力へ出す
- `kotowari adr generate graph`：supersede 関係の Mermaid グラフを標準出力へ出す
- `kotowari adr export <id>`：英語 `PUBLISH.md` を標準出力へ出す
- `kotowari push`：自分の GHCR 参照へスナップショットを送る
- `kotowari pull`：スナップショットでローカルを置き換える
- `kotowari status`：未 push の有無と最後の digest
- `kotowari check`：ファイルの意味的な壊れを一覧する。片側リンク、存在しない `supersedes`、後続のない `superseded` を含む

認証トークンはファイルに保存しない。
`GITHUB_TOKEN`、なければ `gh auth token` を使う。

開発時は Vite+ が API へプロキシする。
本番バイナリは SPA を `go:embed` で同梱する。

## データ模型

時刻は RFC3339 の UTC で保存する。
表示だけがワークスペースのタイムゾーンに従う。
API の読み書きは毎回ディスクから読み直す。

### Workspace

名前、GHCR 参照、タイムゾーン、Issue と ADR の接頭辞、`lastPushedAt`、`lastPushedDigest`、同期基準の `contentHash` を持つ。
ローカルに1つだけである。

### Project

名前、slug、説明、状態、開始日、目標日を持つ。
進捗は紐づく Issue の完了割合から API が算出する。
詳細画面には関連する ADR と Page を表示し、Project に紐づけた ADR を作成できる。

### Cycle

番号、開始、終了、状態を持つ。
状態は `upcoming`、`active`、`completed` のいずれかである。
`active` は同時に1つだけとする。
ある Cycle を `active` にしたとき、それまで `active` だった Cycle は `completed` にする。
これは自分の集中期間であり、チームのイテレーション計画ではない。

### Label

名前と色を持つ。
Issue と多対多で結ぶ。

### View

名前、slug、表示（`list` または `board`）、任意の絞り込みを持つ。
絞り込みは状態、Project、Cycle、Label、優先度である。
他人向けの共有 View や、メンバー単位のフィルタは持たない。
ファイル名が slug である。

### Issue

識別子の既定は `ISS-n` である。
ファイルは `issues/0000n/README.md` である。
ひな型は `TEMPLATE/ISSUE.md` である。
frontmatter の `title`、`created`、`updated` は必須である。
タイトル、本文、状態、優先度、Label、任意の Project、任意の Cycle、任意の期限、並び順、任意の親 Issue、リンク済み ADR 番号を持つ。
状態は `backlog`、`todo`、`in_progress`、`done`、`canceled` である。
担当者は持たない。
親は高々1つである。深さの上限は設けない。循環は拒否する。

### ADR

識別子の既定は `ADR-n` である。
ファイルは `adr/0000n/README.md` である。
ひな型は `TEMPLATE/ADR.md` である。
frontmatter の `title`、`created`、`updated` は必須である。
公開用は `adr/0000n/PUBLISH.md` である。
任意の Project を frontmatter の `project` で参照する。
状態は `proposed`、`rejected`、`accepted`、`deprecated`、`superseded` である。
ADR は削除しない。番号は RFC と同じく単調増加であり、欠番を埋めるために再利用しない。
判断をやり直すときは後続の ADR を書き、旧 ADR を `superseded` にする。
`superseded` は後続の ADR が前の ADR を置き換えたときだけ使う。
`rejected` は提案全体を採らなかったとき使う。一度 `accepted` にした判断を下ろすときは `deprecated` にする。
`kotowari adr new --supersedes N` と `kotowari adr status <id> superseded --by N` は旧 ADR の状態を `superseded` にする。
`kotowari check` は存在しない `supersedes` と、後続のない `superseded` を診断する。自動修復しない。
作業 README は日本語である。公開用は英語であり、kotowari は翻訳しない。
空の ADR には問い、評価関数、候補（良い点 / 中立 / 悪い点）、実験、結果、決定（選んだ候補、良い点と悪い点、確認）、前提の骨格を置く。
公開用 `PUBLISH.md` は MADR の英語見出し（Context and Problem Statement、Decision Drivers、Considered Options、Decision Outcome、Consequences、Confirmation、More Information）に実験と結果を挟む。

### メモ

Issue に紐づく本文と作成時刻だけを持つ。
編集と削除は提供しない。

### Page

タイトル、slug、本文、任意の親、任意の Project、状態、文書日付、tags を持つ。
軽量メモと Design Doc に使う。

## skills

リポジトリの `skills/` に 3 本だけ置く。

- `kotowari`：パス、接頭辞、相互リンク、`adr/` を git に載せないこと
- `design-doc`：代替案、懸念点、未決定事項。置き場は Page
- `ablation`：評価関数が先。PoC は `adr/NNNNN/experiments/`。比較も引用もない決定は禁止

## UI

起動直後は `/issues` を出す。
左ナビは Issues、Board、ADRs、Projects、Cycles、Pages である。
ボードの行は Issue のままである。

経路は `/issues`、`/board`、`/issues/{identifier}`、`/adrs`、`/adrs/{identifier}`、`/projects`、`/projects/{slug}`、`/cycles`、`/cycles/{number}`、`/views/{slug}`、`/pages`、`/pages/{slug}` である。
保存した View は左ナビに並ぶ。

キーボードは `Mod+K`、`c`（Issue）、`p`（ADR）、`j` / `k`、`Enter`、`Esc`、`s`、`1` から `4` である。
今 Issue を見ていれば、新規 ADR の初期リンクにそれを入れる。必須ではない。

Issue 詳細と ADR 詳細から、リンクの追加、解除、遷移ができる。
ADR 本文を Issue 詳細に埋め込まない。

## 文書の閲覧と編集

Markdown は markdown-it でレンダリングし、表、引用、画像、コード、見出し目次を表示する。
通常の Markdown に書いた HTML はテキストとして扱う。
HTML/CSS の図は `![構成図](assets/diagram.html)`、または `html-diagram` コードフェンスで埋め込む。
HTML の図は sandbox 付き iframe と CSP で表示し、スクリプトは実行しない。
CSS は図の HTML 内に記述する。
アセット配信は ADR の `assets/` 内に限定する。

Issue、ADR、Page の本文は明示的に保存する。
保存時に本文の revision を照合し、外部編集と競合した場合は上書きせず比較画面を出す。
利用者が内容を統合し、現在の版を基準として保存し直す。
未保存の下書きはブラウザに保持し、再読み込み時に復元する。
保存前の本文を履歴に残し、以前の版を下書きとして取り出せる。
外部編集は定期的に再取得し、編集中の下書きを保持する。

変更した管理ファイルだけを書き換え、無関係な文書のコメントや書式を保持する。
各ファイルは一時ファイルから rename して更新する。
複数ファイルをまたぐトランザクションや、外部プロセスとの排他ロックは提供しない。
外部編集との完全な同時書き込みを保証するものではない。

ADR 一覧は状態と Project で絞り込める。
詳細から前後の決定に移動し、再検討用の後続 ADR を作成できる。
Web UI の Export は README、PUBLISH、assets を ZIP にまとめる。
CLI の `adr export` は従来どおり PUBLISH 本文を標準出力に出す。
検索は Issue、ADR、Page の本文と ADR の公開本文も対象にし、一致箇所の抜粋を表示する。

## Web UI からの AI 利用

kotowari は ACP クライアントとして外部エージェントを起動する。
最初の接続先は `codex-acp` とする。
エージェント本体、推論ループ、ツール実行は kotowari に実装しない。

Issue、ADR、Page ごとに会話を持ち、現在の文書と配置規則をプロンプトに添える。
ACP の初期化、セッション作成・再開、応答表示、権限要求への回答、認証、キャンセルを扱う。
再開は接続先の `loadSession` capability が必要であり、未対応の場合はエラーを表示し、利用者が新しい会話を開始する。
ファイル・ターミナル操作を kotowari の ACP client capability としては公開しない。
接続先が持つツールの権限要求を Web UI に表示する。
会話状態とセッション ID はローカルだけに保存する。

`codex-acp` を PATH に置いて `kotowari serve` を起動する。
別の実行ファイルや引数を使う場合は、JSON 配列で指定する。
シェル文字列としては評価しない。

```sh
npm install -g @agentclientprotocol/codex-acp
KOTOWARI_ACP_COMMAND='["codex-acp"]' kotowari serve
```

認証が必要な場合は接続先が提示する認証方法を AI パネルから開始する。
ACP プロセスの作業ディレクトリはワークスペースとする。
サーバーの終了時は起動したプロセスを終了する。

## 同期

成果物の参照は `ghcr.io/<user>/kotowari` である。
自分のマシン間のバックアップであり、共有ディレクトリではない。
`kotowari pull` はローカルが dirty なら中止する。
起動時自動同期と `--force` pull は持たない。
スナップショットには管理対象の Markdown、設定、活動履歴、テンプレートと ADR の `assets/` を含める。
`experiments/`、`.history/`、`.local/` は含めない。
文書からアセットへのリンクは相対パスのまま保存する。
同期対象の内容からハッシュを計算し、更新日時を書き換えない外部編集やアセットの追加・削除も dirty と判定する。
push 中に変更が入った場合は、実際に送ったスナップショットを基準にするため未送信の変更が残る。
pull はアセットを置き換え、ローカルの実験ディレクトリを保持する。

## 代替案

Issue 番号と ADR 番号を同一にする案は採らない。
1 つの ADR が複数 Issue に効く場合と、1 つの Issue が複数の決定を経る場合に壊れるからである。

Issue 配下に `ADR.md` を入れる案は採らない。
実験砂場は ADR 側にだけ置く。

SQLite を正またはキャッシュにする案は採らない。
エージェントがファイルを grep して provenance を辿れることが本体だからである。

Cycle をチームのスプリントと同一視して削除する案は採らない。
個人の時間枠として残す。

サブ Issue をブロック関係まで広げる案は採らない。
親子だけにする。
依存の表現は見積もりや担当者と結びつきやすいためである。

カスタム View をチーム共有の画面として入れる案は採らない。
自分の絞り込みの保存だけにする。

Page から ADR ディレクトリへ自動移行する案は採らない。

Nygard 既定テンプレ、作成時の `$EDITOR` 起動、Graphviz、mdbook 出力は採らない。
ADR の正は `adr/NNNNN/README.md` であり、目次とグラフは標準出力へ出すだけにする。

MADR の YAML frontmatter、`nnnn-title.md`、decision-makers / consulted / informed は採らない。
一人用なので RACI 欄は持たない。候補の賛否は決定の後ではなく `候補` の下に置く。実験が後から来るからである。
日本語 README の `評価関数` は MADR の Decision Drivers に当たるが、名前は変えない。

## 実装した改善と検証

| 改善 | 検証 |
| --- | --- |
| ADR 配下の図・画像、同期、ZIP 出力 | store/API テスト、ブラウザのダウンロード |
| Markdown と HTML/CSS 図の表示 | レンダラーの単体テスト、iframe のスクリプト禁止をブラウザで確認 |
| 保存競合、下書き復元、履歴、外部更新 | store/API テスト、ブラウザで外部編集からの復旧 |
| Project と ADR/Page の関連、ADR の絞り込みと後続作成 | store テスト、ADR のブラウザ操作 |
| 本文検索と抜粋 | store テスト |
| ACP の会話・権限・キャンセル | プロトコルの subprocess テスト、ブラウザテスト、実際の codex-acp との接続 |
| CI の errcheck エラー | listener の Close エラー処理を修正し、task check で検証 |

## 懸念点

親 Issue とカスタム View は実装済みである。
片側リンクは診断するが直さない。
エージェントがファイルを直接書いた直後は一時的に不整合になり得る。
会話の長期保持と大きなワークスペースでのポーリング負荷には、今後の計測と保持上限の設計が必要である。

## 未決定事項

親子はリストで一段下げて示す。深さの上限は設けない。
View の絞り込みに全文検索 `q` は持たない。状態、Project、Cycle、Label、優先度だけである。
ベンチ実行、翻訳、探索オーケストレーション、GitHub や PR や CI の置き換えは今はやらない。
