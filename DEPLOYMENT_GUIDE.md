# 🚀 デプロイメントガイド

## 📋 事前準備

### 1. 必要なアカウント
- [ ] GitHub アカウント
- [ ] Vercel アカウント
- [ ] OpenAI API キー

### 2. 環境変数の準備
```bash
# 本番用の強力なJWTシークレットを生成
# 例: openssl rand -base64 32
JWT_SECRET=your-very-strong-production-secret

# OpenAI API キー
OPENAI_API_KEY=your_openai_api_key_here

# 本番環境URL（デプロイ後に設定）
FRONTEND_URL=https://your-domain.vercel.app
```

## 🔧 GitHub デプロイ

### ステップ 1: Git リポジトリ初期化
```bash
# プロジェクトディレクトリで実行
git init
git add .
git commit -m "Initial commit: Japanese report generation app with authentication"
```

### ステップ 2: GitHub リポジトリ作成
1. GitHub で新しいリポジトリを作成
   - リポジトリ名: `proformer-1-page-report`
   - 説明: `Japanese report generation app with authentication`
   - 公開/非公開: 選択

2. リモートリポジトリを追加
```bash
git remote add origin https://github.com/YOUR_USERNAME/proformer-1-page-report.git
git branch -M main
git push -u origin main
```

## ☁️ Vercel デプロイ

### ステップ 1: Vercel アカウント設定
1. [Vercel](https://vercel.com) にアクセス
2. GitHub アカウントでサインアップ
3. GitHub リポジトリをインポート

### ステップ 2: プロジェクト設定
1. **Import Git Repository** でリポジトリを選択
2. **Project Name**: `proformer-1-page-report`
3. **Framework Preset**: `Other`
4. **Root Directory**: `./`
5. **Build Command**: `npm run build`
6. **Output Directory**: `./`
7. **Install Command**: `npm install`

### ステップ 3: 環境変数設定
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

### ステップ 4: デプロイ実行
1. **Deploy** ボタンをクリック
2. デプロイ完了まで待機（通常2-3分）
3. 本番URLを確認

## 🧪 デプロイ後テスト

### 1. 基本動作確認
```bash
# 本番URLにアクセス
https://your-domain.vercel.app

# 確認項目
- [ ] ホームページが表示される
- [ ] ログインページが表示される
- [ ] 登録ページが表示される
- [ ] 管理者ダッシュボードが表示される
```

### 2. 認証機能テスト
1. **ユーザー登録テスト**
   - 新しいアカウントを作成
   - 強力なパスワードを設定
   - 登録成功を確認

2. **ログインテスト**
   - 作成したアカウントでログイン
   - セッション作成を確認
   - ログアウト機能をテスト

### 3. レポート生成テスト
1. **基本レポート生成**
   - テキストを入力
   - レポート種別を選択
   - 生成ボタンをクリック
   - レポートが生成されることを確認

2. **ファイル付きレポート生成**
   - PDFファイルをアップロード
   - レポート生成を実行
   - ファイル処理が正常に動作することを確認

3. **三つの主要レポート**
   - 投資分析（4部構成）
   - 税務戦略（減価償却）
   - 相続対策戦略
   - 各レポートが正常に生成されることを確認

4. **カスタムプロンプト**
   - カスタムプロンプトを選択
   - 独自の分析要求を入力
   - カスタムレポートが生成されることを確認

5. **比較分析**
   - 複数ファイルをアップロード
   - 比較分析を選択
   - 比較レポートが生成されることを確認

### 4. 管理者機能テスト
1. **管理者ダッシュボード**
   - 管理者権限でログイン
   - ダッシュボードにアクセス
   - 統計データが表示されることを確認

2. **使用状況監視**
   - ユーザー活動を確認
   - システム統計を確認
   - 最近のアクティビティを確認

### 5. セキュリティテスト
1. **認証セキュリティ**
   - 無効な認証情報でログイン試行
   - レート制限が適用されることを確認
   - セッション管理が正常に動作することを確認

2. **入力検証**
   - 不正な入力を送信
   - 適切なエラーハンドリングを確認
   - セキュリティヘッダーを確認

## 🔧 トラブルシューティング

### よくある問題と解決方法

#### 1. 環境変数エラー
**症状**: `OPENAI_API_KEY is not defined`
**解決方法**:
```bash
# Vercel ダッシュボードで環境変数を再設定
# 本番環境で正しい値が設定されているか確認
```

#### 2. データベースエラー
**症状**: ユーザー登録でエラー
**解決方法**:
```bash
# SQLite データベースが正常に作成されているか確認
# データベースファイルの権限を確認
```

#### 3. CORS エラー
**症状**: フロントエンドからAPI呼び出しでエラー
**解決方法**:
```bash
# FRONTEND_URL 環境変数を正しく設定
# CORS ヘッダーが正しく設定されているか確認
```

#### 4. OpenAI API エラー
**症状**: レポート生成でエラー
**解決方法**:
```bash
# OPENAI_API_KEY が正しく設定されているか確認
# API キーの有効性を確認
# レート制限に達していないか確認
```

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

### 本番運用開始
- [ ] 全機能の動作確認完了
- [ ] セキュリティテスト完了
- [ ] パフォーマンステスト完了
- [ ] ドキュメント整備完了
- [ ] 監視体制構築完了

## 🆘 サポート

### 問題が発生した場合
1. [GitHub Issues](https://github.com/your-repo/issues) で既存の問題を確認
2. 新しい Issue を作成
3. 詳細なエラー情報と再現手順を提供

### 緊急時の対応
1. Vercel ダッシュボードでログを確認
2. 環境変数を再確認
3. 必要に応じてロールバックを実行

## 📚 関連ドキュメント

- [README.md](README.md) - プロジェクト概要
- [PRD.md](PRD.md) - プロダクト要件定義
- [SECURITY.md](SECURITY.md) - セキュリティガイド
- [TEST_PLAN.md](TEST_PLAN.md) - テスト計画
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) - デプロイメントチェックリスト
