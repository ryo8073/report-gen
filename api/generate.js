// Report Generation API - Trial Version with OpenAI Integration
const OpenAI = require('openai');

// Initialize OpenAI client
let openai;
try {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY environment variable is not set');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

// Report type prompts
const REPORT_PROMPTS = {
  jp_investment_4part: `あなたは経験豊富な投資アドバイザーです。以下の情報を基に、4部構成の投資分析レポートを作成してください。

構成:
1. 投資概要と現状分析
2. リスク評価と市場分析
3. 推奨投資戦略
4. 実行計画と注意事項

レポートは専門的でありながら、クライアントが理解しやすい内容にしてください。`,

  jp_tax_strategy: `あなたは税務の専門家です。以下の情報を基に、減価償却を活用した税務戦略レポートを作成してください。

含めるべき内容:
- 現在の税務状況分析
- 減価償却による節税効果の試算
- 推奨する投資商品と戦略
- 実行スケジュールと注意点
- 長期的な税務メリット

具体的な数値を用いて、わかりやすく説明してください。`,

  jp_inheritance_strategy: `あなたは相続対策の専門家です。以下の情報を基に、相続対策戦略レポートを作成してください。

含めるべき内容:
- 現在の資産状況と相続税試算
- 相続税軽減策の提案
- 不動産投資による相続対策効果
- 生前贈与や信託の活用方法
- 実行優先順位と具体的手順

法的な観点も含めて、実践的なアドバイスを提供してください。`,

  custom: `以下の要求に基づいて、専門的で詳細なレポートを作成してください。`
};

module.exports = async (req, res) => {
  const { method } = req;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if OpenAI is available
    if (!openai) {
      return res.status(500).json({ 
        error: 'OpenAI service is not available. Please check configuration.' 
      });
    }

    const { reportType, inputText, files, additionalInfo, options } = req.body;

    // Validate input
    if (!reportType) {
      return res.status(400).json({ error: 'Report type is required' });
    }

    if (!inputText && (!files || files.length === 0)) {
      return res.status(400).json({ error: 'Input text or files are required' });
    }

    // Process the request
    const report = await generateReport({
      reportType,
      inputText,
      files,
      additionalInfo,
      options
    });

    return res.status(200).json({
      success: true,
      report
    });

  } catch (error) {
    console.error('Generate API error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'API rate limit exceeded. Please try again later.' 
      });
    }
    
    if (error.status === 401) {
      return res.status(500).json({ 
        error: 'API configuration error. Please contact support.' 
      });
    }

    return res.status(500).json({ 
      error: 'Failed to generate report. Please try again.' 
    });
  }
};

async function generateReport({ reportType, inputText, files, additionalInfo, options }) {
  // Get the appropriate prompt
  const basePrompt = REPORT_PROMPTS[reportType] || REPORT_PROMPTS.custom;
  
  // Process files if any
  let fileContent = '';
  if (files && files.length > 0) {
    fileContent = await processFiles(files);
  }

  // Build the full prompt
  let fullPrompt = basePrompt;
  
  if (inputText) {
    fullPrompt += `\n\n【入力データ】\n${inputText}`;
  }
  
  if (fileContent) {
    fullPrompt += `\n\n【添付ファイル内容】\n${fileContent}`;
  }

  if (additionalInfo && Object.keys(additionalInfo).length > 0) {
    fullPrompt += `\n\n【追加情報】\n${JSON.stringify(additionalInfo, null, 2)}`;
  }

  // Call OpenAI API
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: "あなたは経験豊富な投資・税務・相続の専門家です。クライアント向けに専門的で実践的なレポートを作成してください。"
      },
      {
        role: "user",
        content: fullPrompt
      }
    ],
    max_tokens: 4000,
    temperature: 0.7,
  });

  const content = completion.choices[0].message.content;

  return {
    id: Date.now().toString(),
    title: getReportTitle(reportType),
    content: content,
    createdAt: new Date().toISOString(),
    usage: {
      promptTokens: completion.usage.prompt_tokens,
      completionTokens: completion.usage.completion_tokens,
      totalTokens: completion.usage.total_tokens,
      estimatedCost: `$${(completion.usage.total_tokens * 0.00003).toFixed(4)}`
    }
  };
}

async function processFiles(files) {
  let content = '';
  
  for (const file of files) {
    try {
      // Decode base64 file
      const buffer = Buffer.from(file.data, 'base64');
      
      if (file.type === 'application/pdf') {
        // For now, just indicate PDF was uploaded
        // In a full implementation, you'd use a PDF parser
        content += `\n[PDF File: ${file.name}]\n`;
        content += `PDF content processing would be implemented here.\n`;
      } else if (file.type.startsWith('image/')) {
        // For now, just indicate image was uploaded
        // In a full implementation, you'd use OCR
        content += `\n[Image File: ${file.name}]\n`;
        content += `Image content processing would be implemented here.\n`;
      } else {
        // Try to read as text
        content += `\n[File: ${file.name}]\n`;
        content += buffer.toString('utf8').substring(0, 1000) + '...\n';
      }
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      content += `\n[Error processing file: ${file.name}]\n`;
    }
  }
  
  return content;
}

function getReportTitle(reportType) {
  const titles = {
    jp_investment_4part: '投資分析レポート（4部構成）',
    jp_tax_strategy: '税務戦略レポート（減価償却活用）',
    jp_inheritance_strategy: '相続対策戦略レポート',
    custom: 'カスタムレポート'
  };
  
  return titles[reportType] || 'レポート';
}