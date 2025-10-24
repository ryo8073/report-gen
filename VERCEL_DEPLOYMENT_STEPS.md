# 🚀 Vercel デプロイメント手順

## ✅ GitHub デプロイ完了
- リポジトリ: https://github.com/ryo8073/report-gen.git
- ブランチ: main
- 全ファイルが正常にアップロードされました

## ☁️ Vercel デプロイ手順

### ステップ 1: Vercel アカウント設定
1. [Vercel](https://vercel.com) にアクセス
2. **Sign Up** をクリック
3. **Continue with GitHub** を選択
4. GitHub アカウントで認証

### ステップ 2: プロジェクトインポート
1. Vercel ダッシュボードで **"New Project"** をクリック
2. **Import Git Repository** で `ryo8073/report-gen` を選択
3. **Import** をクリック

### ステップ 3: プロジェクト設定
```
Project Name: report-gen
Framework Preset: Other
Root Directory: ./
Build Command: npm run build
Output Directory: ./
Install Command: npm install
```

### ステップ 4: 環境変数設定
Vercel ダッシュボードの **Settings > Environment Variables** で以下を設定：

#### 必須環境変数
```
OPENAI_API_KEY = your_openai_api_key_here
JWT_SECRET = your-very-strong-production-secret
NODE_ENV = production
```

#### 推奨環境変数
```
FRONTEND_URL = https://your-domain.vercel.app
```

### ステップ 5: デプロイ実行
1. **Deploy** ボタンをクリック
2. デプロイ完了まで待機（通常2-3分）
3. 本番URLを確認

## 🧪 デプロイ後テスト

### 1. 基本動作確認
- [ ] ホームページ: `https://your-domain.vercel.app`
- [ ] ログインページ: `https://your-domain.vercel.app/login.html`
- [ ] 登録ページ: `https://your-domain.vercel.app/register.html`
- [ ] 管理者ダッシュボード: `https://your-domain.vercel.app/admin.html`

### 2. 認証機能テスト
- [ ] ユーザー登録（強力なパスワードで）
- [ ] ログイン・ログアウト
- [ ] セッション管理

### 3. レポート生成テスト
- [ ] テキストのみレポート生成
- [ ] ファイル付きレポート生成
- [ ] 三つの主要日本語レポート
- [ ] カスタムプロンプト
- [ ] 比較分析

### 4. 管理者機能テスト
- [ ] 管理者ダッシュボードアクセス
- [ ] 統計データ表示
- [ ] 使用状況監視

## 🔧 トラブルシューティング

### よくある問題

#### 1. 環境変数エラー
**症状**: `OPENAI_API_KEY is not defined`
**解決方法**: Vercel ダッシュボードで環境変数を再設定

#### 2. データベースエラー
**症状**: ユーザー登録でエラー
**解決方法**: SQLite データベースが正常に作成されているか確認

#### 3. CORS エラー
**症状**: フロントエンドからAPI呼び出しでエラー
**解決方法**: FRONTEND_URL 環境変数を正しく設定

#### 4. OpenAI API エラー
**症状**: レポート生成でエラー
**解決方法**: OPENAI_API_KEY が正しく設定されているか確認

## 📊 監視・メンテナンス

### 1. ログ監視
- Vercel ダッシュボードでログを確認
- エラーログの監視
- パフォーマンスメトリクスの確認

### 2. セキュリティ監視
- 認証失敗の監視
- 異常なアクセスパターンの検出
- セッション管理の監視

### 3. 使用状況監視
- ユーザー登録数の監視
- レポート生成数の監視
- システム使用率の監視

## 🎯 成功基準

### デプロイ成功の条件
- [ ] 全ページが正常に表示される
- [ ] 認証機能が正常に動作する
- [ ] レポート生成が正常に動作する
- [ ] 管理者機能が正常に動作する
- [ ] セキュリティ機能が正常に動作する
- [ ] パフォーマンスが期待値を満たす
- [ ] エラーログが最小限である

## 🆘 サポート

### 問題が発生した場合
1. Vercel ダッシュボードでログを確認
2. 環境変数を再確認
3. 必要に応じて再デプロイを実行

### 緊急時の対応
1. Vercel ダッシュボードでログを確認
2. 環境変数を再確認
3. 必要に応じてロールバックを実行

## 📚 関連ドキュメント

- [README.md](README.md) - プロジェクト概要
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - 詳細デプロイメントガイド
- [SECURITY.md](SECURITY.md) - セキュリティガイド
- [TEST_PLAN.md](TEST_PLAN.md) - テスト計画
