# クライアント向けレポート生成システム

プロフェッショナルなレポートを自動生成するWebアプリケーション。投資分析、税務戦略、相続対策などの専門的なレポートをAIで生成します。

## 🎯 主な機能

### 📊 レポート生成
- **投資分析（4部構成）**: Executive Summary、Benefits、Risks、Evidence
- **税務戦略（減価償却）**: 年収・家族構成を考慮した節税分析
- **相続対策戦略**: 資産情報・法定相続人を基にした相続税対策
- **カスタムプロンプト**: 独自の分析要求に対応

### 👤 ユーザー管理
- **試用期間システム**: 2週間または15回の利用制限
- **認証システム**: Firebase Authentication
- **カスタムプロンプト保存**: ユーザー別のプロンプト管理

### 🔧 管理機能
- **Admin Dashboard**: 使用統計、ユーザー管理
- **試用期間統計**: コンバージョン率、利用状況分析
- **カスタムプロンプト管理**: 全ユーザーのプロンプト確認・削除

## 🚀 セットアップ

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
```bash
# .env.exampleをコピーして.envを作成
cp .env.example .env

# .envファイルを編集して実際の値を設定
# - OPENAI_API_KEY: OpenAIのAPIキー
# - JWT_SECRET: ランダムな文字列（セキュリティ用）
# - Firebase関連の設定値
```

### 3. Firebase設定
```bash
# Firebase設定の検証
npm run firebase:validate

# 環境変数チェック
npm run firebase:env-check

# データベース初期化
npm run db:init

# 管理者ユーザー作成
npm run admin:init
```

### 4. 開発サーバー起動
```bash
# 通常の開発サーバー
npm run dev

# または、デバッグ用サーバー（問題がある場合）
npm run debug
```

サーバーは `http://localhost:3000` で起動します。

### 🔧 トラブルシューティング

レポート生成が動作しない場合：

1. **環境変数の確認**
   ```bash
   npm run firebase:env-check
   ```

2. **デバッグサーバーでテスト**
   ```bash
   npm run debug
   # http://localhost:3001 でアクセス
   ```

3. **APIキーの確認**
   - OpenAI APIキーが正しく設定されているか
   - Firebase設定が正しいか

4. **ログの確認**
   - ブラウザのコンソールでエラーを確認
   - サーバーのログを確認

## 🧪 テスト

### 全テスト実行
```bash
npm run test:all
```

### 個別テスト
```bash
npm run test:auth      # 認証システムテスト
npm run test:reports   # レポート生成テスト
npm run test:trial     # 試用期間システムテスト
```

## 📁 プロジェクト構造

```
├── api/                    # API エンドポイント
│   ├── auth/              # 認証関連
│   ├── admin/             # 管理者機能
│   ├── custom-prompts/    # カスタムプロンプト管理
│   └── trial/             # 試用期間管理
├── lib/                   # ライブラリ
│   ├── firebase-admin.js  # Firebase Admin SDK
│   ├── firebase-db.js     # データベース操作
│   └── auth.js           # 認証ヘルパー
├── scripts/              # セットアップスクリプト
├── PROMPTS/              # レポートテンプレート
├── *.html               # フロントエンド画面
└── test-*.js           # テストスクリプト
```

## 🔑 環境変数

`.env` ファイルに以下を設定：

```env
# Firebase設定
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com

# JWT設定
JWT_SECRET=your-jwt-secret-key

# OpenAI設定
OPENAI_API_KEY=your-openai-api-key

# その他
NODE_ENV=development
```

## 💰 試用期間システム

### 制限内容
- **期間制限**: 登録から2週間
- **利用制限**: レポート生成15回まで
- **制限到達時**: 有料プランへの誘導

### 料金プラン
- **ベーシック**: ¥2,980/月（月50回まで）
- **プロ**: ¥4,980/月（無制限）
- **エンタープライズ**: お問い合わせ

## 🛠 開発

### API エンドポイント

#### 認証
- `POST /api/auth/register-firebase` - ユーザー登録
- `POST /api/auth/login-firebase` - ログイン
- `GET /api/auth/me-firebase` - ユーザー情報取得
- `POST /api/auth/logout` - ログアウト

#### レポート生成
- `POST /api/generate-firebase` - レポート生成

#### 試用期間
- `GET /api/trial/status` - 試用期間状況確認
- `POST /api/trial/upgrade` - アップグレード（デモ）

#### カスタムプロンプト
- `POST /api/custom-prompts/save` - プロンプト保存
- `GET /api/custom-prompts/list` - プロンプト一覧
- `DELETE /api/custom-prompts/delete` - プロンプト削除

#### 管理者
- `GET /api/admin/stats-firebase` - 使用統計
- `GET /api/admin/trial-stats` - 試用期間統計
- `GET /api/admin/custom-prompts` - カスタムプロンプト管理

### データベーススキーマ

#### users コレクション
```javascript
{
  id: string,
  email: string,
  password: string,
  role: 'user' | 'admin',
  isActive: boolean,
  // 試用期間情報
  trialStartDate: timestamp,
  trialEndDate: timestamp,
  trialUsageCount: number,
  trialMaxUsage: number,
  subscriptionStatus: 'trial' | 'trial_expired' | 'active',
  subscriptionPlan: string | null
}
```

#### custom_prompts コレクション
```javascript
{
  id: string,
  userId: string,
  userEmail: string,
  title: string,
  content: string,
  description: string,
  tags: string[],
  isActive: boolean,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 📝 ライセンス

このプロジェクトは商用利用を想定した有料サービスです。

## 🤝 サポート

技術的な問題や質問については、開発チームまでお問い合わせください。