---
name: kotowari
description: kotowari の Issue / ADR / Page の置き場、接頭辞、相互リンク、git に載せない範囲。ワークスペースの Markdown を直接編集するときに使う。
---

# kotowari

kotowari は一人用のローカル課題管理である。中核は **Issue（何をするか）** と **ADR（なぜそう決めたか）** である。扱いは別、番号もディレクトリも共有しない。結びは多対多の参照である。

データは `$KOTOWARI_HOME`（既定 `.kotowari/`）の下だけに書く。リポジトリルートには生やさない。

## どれを触るか

- **Issue**: 実装仕事。`issues/00012/README.md`。表示は `ISS-12`。ひな型は `$KOTOWARI_HOME/TEMPLATE/ISSUE.md`
- **ADR**: 意思決定と実験。`adr/00001/README.md`。表示は `ADR-1`。ひな型は `$KOTOWARI_HOME/TEMPLATE/ADR.md`。実験コードは `experiments/` に置く。文書用の HTML、SVG、画像は `assets/` に置く。**削除しない**。番号は RFC と同じく追記だけである。置き換えは後続 ADR を書き、旧 ADR を `superseded` にする。提案ごと捨てるときは `rejected`。一度採った判断を下ろすときは `deprecated`

frontmatter の `title`、`created`、`updated` は必須である。欠けていれば `kotowari check` が診断する。新規作成は TEMPLATE の本文骨格を使う。一覧は `kotowari list --issues` と `kotowari list --adr` である。ADR の作成は `kotowari adr new TITLE`。置き換えは `--supersedes N`。目次とグラフは `kotowari adr generate toc` / `graph`。
- **Page**: 軽量メモ。Design Doc の置き場。意思決定の正ではない

Issue だけのチケット、ADR だけの決定、どちらも許す。片方を作ってももう片方は自動では作らない。

接頭辞の既定は `ISS` と `ADR`。`workspace.toml` の `issuePrefix` / `adrPrefix` で利用者が変える。パスは番号だけなので、接頭辞を変えてもディレクトリは動かない。

## リンク

双方の README frontmatter に相手の番号を書く。

Issue: `adrs = [1, 2]`
ADR: `issues = [12, 15]`

UI / API でリンクしたときは両側が更新される。ファイルを直接いじって片側だけになったものは `kotowari check` が見つける。自動修復しない。直すときは両方を揃える。

## git と同期

- `adr/` 全体は git に載せない（実験と日本語ドラフト）
- `kotowari push` は Issue の README を送る。ADR は `README.md`、`PUBLISH.md`、`assets/` を送る。`experiments/` は送らない
- `$KOTOWARI_HOME` の外へは書かない。OSS リポの `docs/adr/` へ置くのは人間またはエージェントのコピー

エージェントはファイルを直接書いてよい。次の API 読み込みで UI に載る。

## 文書の図

ADR 本文から `![構成図](assets/architecture.html)` のような相対パスで参照する。
HTML は CSS を使えるが JavaScript は実行しない。
通常の HTML コードブロックはコード例として表示する。
本文中へ直接図を書く場合だけ `html-diagram` コードブロックを使う。
文書用アセットをワークスペース外へ置かず、シンボリックリンクを使わない。
ADR の任意の所属 Project は frontmatter の `project = "slug"` で指定する。
UI と同時に編集するときは最新のファイルを読み直し、他の変更を保持する。
