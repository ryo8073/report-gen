# クライアント向けレポート生成システム

プロフェッショナルなレポートを自動生成するWebアプリケーション。投資分析、税務戦略、相続対策などの専門的なレポートをAIで生成します。

**注意**: 本システムは一時的な試用サイトとして運用されており、認証機能は無効化されています。

## 🎯 主な機能

### 📊 レポート生成
- **投資分析（4部構成）**: Executive Summary、Benefits、Risks、Evidence
- **税務戦略（減価償却）**: 年収・家族構成を考慮した節税分析
- **相続対策戦略**: 資産情報・法定相続人を基にした相続税対策
- **比較分析**: 複数の物件や投資案件の比較分析

### ✏️ 編集機能
- **WYSIWYGエディタ**: Wordライクな編集体験（HTMLとして直接編集可能）
- **リアルタイムプレビュー**: 編集内容の即座な確認
- **印刷プレビュー**: 印刷・PDF出力前の確認表示
- **Markdown対応**: Markdown形式のコンテンツを自動的にHTMLに変換して表示

### 📤 エクスポート機能
- **PDF出力**: 高品質なPDFドキュメント生成
- **Word出力**: Microsoft Word形式でのエクスポート（オプション）
- **印刷**: ブラウザ標準の印刷機能に対応

## 🚀 クイックスタート

### 1. 依存関係のインストール
```bash
npm install
```

### 2. 環境変数の設定
```bash
# .env.exampleをコピーして.envを作成（存在する場合）
cp .env.example .env
```

`.env`ファイルに以下の値を設定：

```env
# OpenAI設定（必須）
OPENAI_API_KEY=sk-proj-xxxxxxxxxx

# Google AI (Gemini) 設定（オプション - フォールバック用）
GOOGLE_AI_API_KEY=your-google-ai-api-key

# その他
NODE_ENV=development
PORT=3000
```

**注意**: 
- OpenAI APIキーが必須です
- Google AI APIキーは任意（OpenAIが失敗した場合のフォールバックとして使用）
- 認証機能は無効化されているため、Firebase設定は不要です

### 3. 開発サーバー起動
```bash
# 通常の開発サーバー
npm run dev

# または、デバッグ用サーバー（問題がある場合）
npm run debug
```

サーバーは `http://localhost:3000` で起動します。

## 📝 使用方法

### レポート生成の流れ

1. **レポートタイプの選択**
   - 投資分析レポート（4部構成）
   - 税務戦略レポート
   - 相続対策戦略レポート
   - 比較分析レポート

2. **データの入力**
   - テキスト入力欄に分析したいデータを入力
   - PDFや画像ファイルを添付可能（投資分析レポートなど）

3. **レポート生成**
   - 「レポートを生成」ボタンをクリック
   - AIがプロンプトテンプレートに基づいてレポートを生成

4. **レポートの編集**
   - 編集タブでWYSIWYGエディタを使用して内容を編集
   - リアルタイムで変更が反映されます

5. **エクスポート**
   - PDF出力、Word出力、印刷プレビュー機能を利用

## 📁 プロジェクト構造

```
├── api/                      # API エンドポイント
│   └── generate.js          # レポート生成API
├── lib/                     # ライブラリ
│   ├── pdf-export-manager.js      # PDFエクスポート
│   ├── enhanced-wysiwyg-editor.js  # WYSIWYGエディタ
│   ├── markdown-renderer.js       # Markdownレンダリング
│   └── performance-optimization-manager.js  # パフォーマンス最適化
├── PROMPTS/                 # レポートテンプレート（重要）
│   ├── jp_investment_4part.md
│   ├── jp_tax_strategy.md
│   ├── jp_inheritance_strategy.md
│   └── comparison_analysis.md
├── index.html              # メインページ
├── investment-analysis.html # 投資分析専用ページ
└── server.js               # Expressサーバー
```

## 🔑 環境変数

最小限の設定（`.env`ファイル）:

```env
# OpenAI API（必須）
OPENAI_API_KEY=sk-proj-your-openai-api-key-here

# Google AI (Gemini) - オプション（フォールバック用）
GOOGLE_AI_API_KEY=your-google-ai-api-key

# サーバー設定
PORT=3000
NODE_ENV=development
```

## 🛠 API エンドポイント

### レポート生成
- `POST /api/generate` - レポート生成

**リクエスト例:**
```json
{
  "reportType": "jp_investment_4part",
  "inputText": "物件データ...",
  "files": [],
  "additionalInfo": {}
}
```

**レスポンス例:**
```json
{
  "success": true,
  "report": {
    "content": "生成されたレポート内容（Markdown形式）",
    "title": "投資分析レポート",
    "usage": {
      "promptTokens": 1500,
      "completionTokens": 2000,
      "totalTokens": 3500
    }
  }
}
```

## 🔧 トラブルシューティング

### レポート生成が動作しない場合

1. **環境変数の確認**
   - OpenAI APIキーが正しく設定されているか確認
   - `.env`ファイルがプロジェクトルートに存在するか確認

2. **APIキーの確認**
   ```bash
   # OpenAI設定の検証
   npm run openai:validate
   
   # Google AI設定の検証（オプション）
   npm run google-ai:validate
   ```

3. **サーバーログの確認**
   - ブラウザのコンソールでエラーを確認
   - サーバーのターミナル出力を確認

4. **プロンプトファイルの確認**
   - `PROMPTS/`フォルダ内の`.md`ファイルが正しく読み込まれているか確認
   - サーバー起動時のログで「PROMPT MANAGER」のメッセージを確認

### よくある問題

**Q: レポートが生成されない**
- APIキーが正しく設定されているか確認
- ネットワーク接続を確認
- サーバーログでエラーメッセージを確認

**Q: 印刷プレビューやエディタでMarkdown記法（##、**など）が表示される**
- これは既に修正済みです。ページをリロードしてください

**Q: PDF出力が空になる**
- ブラウザのコンソールでエラーを確認
- PDFエクスポートマネージャーのログを確認

## 📚 プロンプトテンプレート

レポート生成に使用されるプロンプトテンプレートは`PROMPTS/`フォルダ内にあります：

- `jp_investment_4part.md`: 投資分析レポート（4部構成）
- `jp_tax_strategy.md`: 税務戦略レポート
- `jp_inheritance_strategy.md`: 相続対策戦略レポート
- `comparison_analysis.md`: 比較分析レポート

プロンプトを変更する場合は、該当ファイルを編集し、サーバーを再起動してください。

詳細なプロンプト管理方法については、`PROMPT_MAINTENANCE_GUIDE.md`を参照してください。

## 🧪 テスト

### レポート生成テスト
```bash
npm run test:reports
```

### API統合テスト
```bash
npm run test:integration
```

### OpenAI設定テスト
```bash
npm run test:openai
```

### Google AI設定テスト（オプション）
```bash
npm run test:google-ai
```

## 🎨 機能詳細

### WYSIWYGエディタ
- **ドキュメントライクな編集**: Wordのような編集体験
- **リアルタイムプレビュー**: 編集内容が即座に反映
- **Markdown自動変換**: Markdown記法を自動的にHTMLに変換して表示

### 印刷プレビュー
- **正確なページレイアウト**: 印刷時の表示を正確に再現
- **ページネーション**: 複数ページのドキュメントに対応
- **ズーム機能**: 表示倍率の調整が可能

### PDFエクスポート
- **高品質な出力**: プロフェッショナルなドキュメント生成
- **ヘッダー・フッター対応**: カスタムヘッダー・フッターの設定可能

## 🔒 セキュリティについて

**注意**: 本システムは一時的な試用サイトとして運用されており：
- 認証機能は無効化されています
- すべてのユーザーが自由にレポートを生成できます
- APIキーはサーバー側で管理され、クライアントには公開されません

## 📝 ライセンス

このプロジェクトは商用利用を想定したサービスです。

## 🤝 サポート

技術的な問題や質問については、開発チームまでお問い合わせください。

## 📖 関連ドキュメント

- `PROMPT_MAINTENANCE_GUIDE.md`: プロンプトテンプレートの管理方法
- `API_SPEC.md`: API仕様詳細
- `SETUP.md`: 詳細なセットアップ手順（開発者向け）