# locable-drawing-manager

LOCABLE 図面管理・LOD管理・変更影響管理システム（MVP）

案件管理システムではなく、案件を切り替えられる図面管理システムとして開発する。

## 技術構成

- フロントエンド: Vite + React + TypeScript
- ホスティング: Cloudflare Pages
- API: Cloudflare Pages Functions (`functions/api`)
- DB: Cloudflare D1 (`migrations/`)
- 認証: Cloudflare Access
- ファイル本体: Google Drive（DBにはURLのみ保持）

## セットアップ

```bash
npm install
npm run dev
```

## D1マイグレーション

```bash
# ローカル開発DBへ適用
npm run db:migrate:dev

# 開発用リモートD1へ適用
npm run db:migrate:remote:dev

# 本番用リモートD1へ適用
npm run db:migrate:remote:prod
```

`wrangler.toml` の `database_id` は実際のD1データベース作成後に差し替えること。

## ディレクトリ構成

```text
src/pages/        画面（ダッシュボード、図面管理、変更項目、設定）
src/components/   共通コンポーネント
functions/api/    Cloudflare Pages Functions（API）
migrations/       D1マイグレーションSQL
```

## ドキュメント

開発仕様書・進行マニュアルは別途共有のもの（2026-06-27版）を参照。
