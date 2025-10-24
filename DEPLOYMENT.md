# DEPLOYMENT.md

* Tailwind CDN不使用。本番は `npm run build:css` で `public/styles.css` を生成→配信。
* Vercel 環境変数：`OPENAI_API_KEY`。
* レスポンスヘッダ `application/json; charset=utf-8`。
* 大容量は Vercel Blob へ（後続）。
