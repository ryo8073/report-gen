# クライアント向けレポート生成アプリ

認証システム付きの日本語レポート生成アプリケーション。ユーザー登録・ログイン機能により使用状況を追跡し、テキスト・画像・PDFからOpenAI APIでプロフェッショナルな日本語レポートを自動生成します。

## 🚀 主要機能

### 認証システム
- **ユーザー登録・ログイン**: bcrypt + JWT による安全な認証
- **セッション管理**: HTTP-only クッキーによるセキュアなセッション
- **レート制限**: ブルートフォース攻撃対策
- **使用状況追跡**: 匿名化された統計データ

### レポート生成
- **3つの主要日本語テンプレート**:
  - 投資分析（4部構成）
  - 税務戦略（減価償却）
  - 相続対策戦略
- **カスタムプロンプト**: 独自の分析要求に対応
- **比較分析**: 複数データの相対評価
- **汎用レポート**: エグゼクティブサマリー、詳細分析等

### ファイル処理
- **対応形式**: PDF、PNG、JPG
- **ドラッグ&ドロップ**: 直感的なファイルアップロード
- **サイズ制限**: 合計4.5MB以内
- **テキスト抽出**: PDFからの自動テキスト抽出

### 管理者機能
- **ダッシュボード**: システム使用統計
- **アクティビティ監視**: ユーザー活動の追跡
- **セキュリティログ**: 認証・セキュリティ監視

## 🛠️ 技術スタック

- **フロントエンド**: HTML5、CSS3、Vanilla JavaScript
- **バックエンド**: Node.js (Vercel Functions)
- **認証**: bcryptjs、jsonwebtoken
- **データベース**: SQLite（開発）/ PostgreSQL（本番推奨）
- **AI**: OpenAI GPT-4 API
- **デプロイ**: Vercel

## 📦 セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd proformer-1-page-report
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境変数の設定

`.env` ファイルを作成：

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# JWT Secret (generate a strong secret for production)
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

## 🏗️ プロジェクト構造

```
├── api/
│   ├── auth/
│   │   ├── login.js          # ログインAPI
│   │   ├── register.js       # 登録API
│   │   ├── logout.js         # ログアウトAPI
│   │   └── me.js            # ユーザー情報API
│   ├── admin/
│   │   ├── stats.js         # 統計API
│   │   ├── usage-chart.js   # 使用状況API
│   │   └── recent-activity.js # アクティビティAPI
│   └── generate.js          # レポート生成API
├── lib/
│   ├── auth.js              # 認証ユーティリティ
│   └── database.js          # データベース管理
├── PROMPTS/
│   ├── jp_investment_4part.md
│   ├── jp_tax_strategy.md
│   └── jp_inheritance_strategy.md
├── public/
│   └── styles.css           # ビルド済みCSS
├── index.html               # メインアプリ
├── login.html               # ログインページ
├── register.html            # 登録ページ
├── admin.html               # 管理者ダッシュボード
└── 各種ドキュメント
```

## 🔐 セキュリティ機能

### パスワードセキュリティ
- bcrypt（salt rounds: 12）による強力なハッシュ化
- 強力なパスワード要件（8文字以上、大文字・小文字・数字）
- 平文でのパスワード保存なし

### セッション管理
- JWT トークン（7日間有効）
- HTTP-only クッキー
- セッション無効化機能

### レート制限
- 認証エンドポイント：15分間に5回まで
- IPアドレスベースの制限
- 自動的な古い試行のクリーンアップ

### セキュリティヘッダー
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin

## 📊 使用状況追跡

### 追跡される情報
- ユーザーアクション（ログイン、レポート生成等）
- ファイルアップロード統計
- レポート生成頻度
- IPアドレス（匿名化）

### プライバシー保護
- 個人を特定できる情報は最小限
- 匿名化された統計データ
- 管理者のみが統計にアクセス可能

## 🚀 デプロイ

### Vercel へのデプロイ

1. **GitHub リポジトリの作成**
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <your-github-repo-url>
git push -u origin main
```

2. **Vercel での設定**
   - Vercel アカウントで GitHub リポジトリをインポート
   - 環境変数を設定：
     - `OPENAI_API_KEY`
     - `JWT_SECRET`
     - `FRONTEND_URL`
     - `NODE_ENV=production`

3. **デプロイ実行**
   - Vercel が自動的にデプロイを実行
   - 本番URLが提供される

### 環境変数（本番）

```bash
OPENAI_API_KEY=your_production_openai_key
JWT_SECRET=your_very_strong_production_secret
FRONTEND_URL=https://your-domain.vercel.app
NODE_ENV=production
```

## 🧪 テスト

### テスト実行
```bash
# 単体テスト（将来実装）
npm test

# 統合テスト（将来実装）
npm run test:integration

# セキュリティテスト（将来実装）
npm run test:security
```

### テストカバレッジ
- 認証機能テスト
- レポート生成テスト
- ファイルアップロードテスト
- セキュリティテスト
- パフォーマンステスト

## 📚 ドキュメント

- [PRD.md](PRD.md) - プロダクト要件定義
- [USER_STORIES.md](USER_STORIES.md) - ユーザーストーリー
- [GHERKIN_SCENARIOS.md](GHERKIN_SCENARIOS.md) - Gherkin シナリオ
- [TEST_PLAN.md](TEST_PLAN.md) - テスト計画
- [SECURITY.md](SECURITY.md) - セキュリティガイド

## 🤝 貢献

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは内部使用目的で作成されています。

## 🆘 サポート

問題が発生した場合：
1. [Issues](https://github.com/your-repo/issues) で既存の問題を確認
2. 新しい Issue を作成
3. 詳細なエラー情報と再現手順を提供
