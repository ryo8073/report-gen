// Firebase-based report generation endpoint
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { db } from '../../lib/firebase-db.js';
import { verifyToken } from '../../lib/auth.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Load prompt template from file
async function loadPromptTemplate(templateName) {
  try {
    const templatePath = `./PROMPTS/${templateName}.md`;
    const fs = await import('fs');
    const template = fs.readFileSync(templatePath, 'utf8');
    return template;
  } catch (error) {
    console.error(`Error loading template ${templateName}:`, error);
    return null;
  }
}

// Parse PDF content
async function parsePDF(buffer) {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF');
  }
}

// Convert image to base64
function imageToBase64(buffer, mimeType) {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user data
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || !userResult.data.isActive) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    const { reportType, customPrompt, files } = req.body;

    // Validate report type
    const validReportTypes = ['jp_investment_4part', 'jp_tax_strategy', 'jp_inheritance_strategy', 'comparison_analysis', 'custom'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({ error: 'Invalid report type' });
    }

    // Handle custom prompt
    if (reportType === 'custom' && !customPrompt) {
      return res.status(400).json({ error: 'Custom prompt is required for custom reports' });
    }

    // Process files
    let fileContents = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const { name, type, data } = file;
        
        // Validate file size (4.5MB limit)
        const buffer = Buffer.from(data, 'base64');
        if (buffer.length > 4.5 * 1024 * 1024) {
          return res.status(400).json({ error: `File ${name} exceeds 4.5MB limit` });
        }

        // Validate MIME type
        const validTypes = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg'
        ];
        
        if (!validTypes.includes(type)) {
          return res.status(400).json({ error: `Unsupported file type: ${type}` });
        }

        if (type === 'application/pdf') {
          const text = await parsePDF(buffer);
          fileContents.push({
            name,
            type,
            content: text
          });
        } else {
          const base64Data = imageToBase64(buffer, type);
          fileContents.push({
            name,
            type,
            content: base64Data
          });
        }
      }
    }

    // Load prompt template
    let promptTemplate = '';
    if (reportType === 'custom') {
      promptTemplate = customPrompt;
    } else if (reportType === 'comparison_analysis') {
      promptTemplate = 'Please analyze and compare the provided documents, highlighting key differences, similarities, and insights.';
    } else {
      const template = await loadPromptTemplate(reportType);
      if (!template) {
        return res.status(500).json({ error: 'Failed to load prompt template' });
      }
      promptTemplate = template;
    }

    // Prepare OpenAI request
    const messages = [
      {
        role: 'system',
        content: promptTemplate
      }
    ];

    // Add file contents to the prompt
    if (fileContents.length > 0) {
      let fileContentText = '\n\n--- 添付ファイル ---\n';
      for (const file of fileContents) {
        if (file.type === 'application/pdf') {
          fileContentText += `\n【${file.name}】\n${file.content}\n`;
        } else {
          fileContentText += `\n【${file.name}】\n画像ファイルが添付されています。\n`;
        }
      }
      fileContentText += '\n--- ファイル終了 ---\n';
      
      messages.push({
        role: 'user',
        content: fileContentText
      });
    }

    // Add image attachments if any
    const imageAttachments = fileContents.filter(file => 
      file.type.startsWith('image/')
    );

    if (imageAttachments.length > 0) {
      const lastMessage = messages[messages.length - 1];
      lastMessage.content = [
        {
          type: 'text',
          text: lastMessage.content
        },
        ...imageAttachments.map(file => ({
          type: 'image_url',
          image_url: {
            url: file.content
          }
        }))
      ];
    }

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7
    });

    const generatedContent = response.choices[0].message.content;

    // Log report generation
    await db.logReportGeneration({
      userId: decoded.userId,
      email: userResult.data.email,
      reportType,
      customPrompt: reportType === 'custom' ? customPrompt : null,
      fileCount: files ? files.length : 0,
      fileNames: files ? files.map(f => f.name) : [],
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Log usage
    await db.logUsage({
      action: 'report_generation',
      userId: decoded.userId,
      email: userResult.data.email,
      reportType,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      content: generatedContent,
      reportType,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generation error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
