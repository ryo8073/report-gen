# セットアップガイド

このプロジェクトをローカル環境で動作させるための詳細な手順です。

## 📋 前提条件

- Node.js 18.0.0以上
- npm または yarn
- OpenAI APIアカウント
- Firebase プロジェクト

## 🔧 詳細セットアップ手順

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

```bash
# テンプレートファイルをコピー
cp .env.example .env
```

`.env`ファイルを編集して以下の値を設定：

#### OpenAI設定
```env
OPENAI_API_KEY=sk-proj-xxxxxxxxxx
```

#### JWT設定
```env
JWT_SECRET=your-secure-random-string-here
```

#### Firebase設定
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY_ID=your-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
```

### 4. Firebase プロジェクトの設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. Firestore データベースを有効化
3. サービスアカウントキーを生成
4. 生成されたキー情報を`.env`に設定

### 5. データベースの初期化

```bash
# Firebase設定の検証
npm run firebase:validate

# データベース初期化
npm run db:init

# 管理者ユーザー作成
npm run admin:init
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセス

## 🧪 動作確認

### 基本機能テスト
```bash
# 認証システムテスト
npm run test:auth

# レポート生成テスト
npm run test:reports

# 試用期間システムテスト
npm run test:trial

# Token追跡テスト
npm run test:tokens

# 全テスト実行
npm run test:all
```

### デバッグモード
問題がある場合は、デバッグサーバーを使用：

```bash
npm run debug
```

`http://localhost:3001` でアクセスし、基本的な動作を確認

## 🔍 トラブルシューティング

### よくある問題

1. **レポート生成が動作しない**
   - OpenAI APIキーが正しく設定されているか確認
   - ブラウザのコンソールでエラーを確認

2. **Firebase接続エラー**
   - Firebase設定が正しいか確認
   - サービスアカウントキーの形式が正しいか確認

3. **認証エラー**
   - JWT_SECRETが設定されているか確認
   - データベースが初期化されているか確認

### ログの確認方法

- **ブラウザ**: 開発者ツール → Console
- **サーバー**: ターミナルでサーバーログを確認

## 📞 サポート

問題が解決しない場合は、以下の情報を含めてお問い合わせください：

- エラーメッセージ
- ブラウザのコンソールログ
- サーバーのログ
- 実行した手順