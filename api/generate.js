import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { requireAuth, setSecurityHeaders } from '../../lib/auth.js';
import { getDatabase } from '../lib/database.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Set security headers
  setSecurityHeaders(res);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Session-Token');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Use authentication middleware
  return requireAuth(req, res, async () => {
    try {
    const { reportType, inputText, files = [], options = {} } = req.body;

    // Validation
    if (!reportType) {
      return res.status(400).json({ error: 'reportType is required' });
    }

    if (!inputText?.trim() && files.length === 0) {
      return res.status(400).json({ error: 'Either inputText or files are required' });
    }

    // Check total file size (4.5MB limit)
    const totalSize = files.reduce((sum, file) => sum + (file.base64?.length * 0.75 || 0), 0);
    if (totalSize > 4.5 * 1024 * 1024) {
      return res.status(413).json({ error: 'Total file size exceeds 4.5MB limit' });
    }

    // Validate file types
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        return res.status(400).json({ error: `File type ${file.type} not allowed` });
      }
    }

    // Process files and extract text
    let processedContent = inputText || '';
    const fileContents = [];

    for (const file of files) {
      try {
        if (file.type === 'application/pdf') {
          const pdfBuffer = Buffer.from(file.base64, 'base64');
          const pdfData = await pdf(pdfBuffer);
          fileContents.push(`PDF: ${file.name}\n${pdfData.text}`);
        } else if (file.type.startsWith('image/')) {
          // For images, we'll pass the base64 data URL to OpenAI
          const dataUrl = `data:${file.type};base64,${file.base64}`;
          fileContents.push(`Image: ${file.name} (${dataUrl})`);
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        fileContents.push(`Error processing ${file.name}: Could not extract content`);
      }
    }

    if (fileContents.length > 0) {
      processedContent += '\n\n--- 添付ファイル ---\n' + fileContents.join('\n\n');
    }

    // Load the appropriate prompt template
    const promptTemplate = await loadPromptTemplate(reportType);
    if (!promptTemplate && reportType !== 'custom') {
      return res.status(400).json({ error: `Invalid reportType: ${reportType}` });
    }

    // Prepare messages for OpenAI
    const messages = [
      {
        role: 'system',
        content: promptTemplate || 'プロフェッショナルなレポートを作成してください。'
      },
      {
        role: 'user',
        content: processedContent
      }
    ];

    // Configure OpenAI request
    const requestConfig = {
      model: 'gpt-4o',
      messages,
      temperature: 0.7,
      max_tokens: 4000,
    };

    // Add structured output if requested
    if (options.structured) {
      requestConfig.response_format = {
        type: 'json_object'
      };
    }

      // Call OpenAI API
      const completion = await openai.chat.completions.create(requestConfig);
      const responseContent = completion.choices[0].message.content;

      // Log usage
      const db = getDatabase();
      const ipAddress = req.headers['x-forwarded-for'] || 
                       req.connection.remoteAddress || 
                       req.socket.remoteAddress ||
                       (req.connection.socket ? req.connection.socket.remoteAddress : null);
      
      const totalFileSize = files.reduce((sum, file) => sum + (file.base64?.length * 0.75 || 0), 0);
      
      await db.logUsage(
        req.user.id, 
        'report_generated', 
        reportType, 
        files.length, 
        totalFileSize, 
        ipAddress
      );

      // Prepare response
      const response = {
        markdown: responseContent
      };

      // Add structured JSON if requested
      if (options.structured) {
        try {
          response.json = JSON.parse(responseContent);
        } catch (error) {
          console.error('Error parsing structured output:', error);
          // Fall back to markdown only
        }
      }

      res.status(200).json(response);

    } catch (error) {
      console.error('API Error:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  });
}

async function loadPromptTemplate(reportType) {
  const promptMap = {
    'jp_investment_4part': await loadPromptFromFile('jp_investment_4part'),
    'jp_tax_strategy': await loadPromptFromFile('jp_tax_strategy'),
    'jp_inheritance_strategy': await loadPromptFromFile('jp_inheritance_strategy'),
    'comparison_analysis': '比較分析レポートを作成してください。複数のデータを比較し、相対的な優劣、特徴、推奨事項を明確に示してください。比較結果は表形式で整理し、具体的な根拠とともに提示してください。',
    'exec_summary': 'エグゼクティブサマリーを作成してください。重要なポイントを簡潔にまとめ、意思決定に必要な情報を提供してください。',
    'detailed_analysis': '詳細な分析レポートを作成してください。データに基づいた客観的な分析と、具体的な根拠を示してください。',
    'action_plan': 'アクションプランを作成してください。具体的なステップ、期限、責任者を明確にし、実行可能な計画を提示してください。',
    'risk_brief': 'リスク分析レポートを作成してください。主要なリスクを特定し、影響度と対策を明示してください。',
    'custom': null // Custom prompts are handled directly in the input text
  };

  return promptMap[reportType] || null;
}

async function loadPromptFromFile(filename) {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const promptPath = path.join(process.cwd(), 'PROMPTS', `${filename}.md`);
    const content = await fs.readFile(promptPath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Error loading prompt file ${filename}:`, error);
    return null;
  }
}
