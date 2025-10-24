# API_SPEC.md

## エンドポイント

`POST /api/generate`

### Request Body

```json
{
  "reportType": "exec_summary|detailed_analysis|action_plan|risk_brief|jp_investment_4part|jp_tax_strategy|jp_inheritance_strategy",
  "inputText": "string",
  "files": [{"name":"file.pdf","type":"application/pdf","base64":"..."}],
  "options": {"language": "ja|en", "structured": false}
}
```

### Response

* Markdownモード: `{ "markdown": "..." }`
* 構造化モード: `{ "markdown": "...", "json": { /* スキーマ準拠 */ } }`

### バリデーション

* 合計~4.5MB以内（超過時は 413）。
* MIME: `image/png`,`image/jpeg`,`application/pdf`。
* 既定言語: `ja`。

### エンコーディング

* 受送信ヘッダ：`charset=utf-8` を明示。
