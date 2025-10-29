// Firebase-based report generation endpoint
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { FirebaseDatabase } from '../../lib/firebase-db.js';
import { verifyToken } from '../../lib/auth.js';

const db = new FirebaseDatabase();

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

    // Check user permissions based on role
    if (userResult.data.role === 'team_member') {
      // Check team member permissions
      const permissionCheck = await db.checkTeamMemberPermissions(decoded.userId, 'canGenerateReports');
      if (!permissionCheck.success || !permissionCheck.hasPermission) {
        return res.status(403).json({
          error: 'レポート生成の権限がありません。管理者にお問い合わせください。',
          code: 'PERMISSION_DENIED'
        });
      }

      // Check monthly usage limit for team members
      const usageResult = await db.getTeamMemberUsage(decoded.userId, 30);
      if (usageResult.success && !usageResult.data.canGenerateMore) {
        return res.status(403).json({
          error: `月間レポート生成上限（${usageResult.data.monthlyLimit}回）に達しました。`,
          code: 'MONTHLY_LIMIT_EXCEEDED',
          usageInfo: usageResult.data
        });
      }
    } else if (userResult.data.role === 'user') {
      // Check trial status for regular users
      const trialResult = await db.checkTrialStatus(decoded.userId);
      if (!trialResult.success) {
        return res.status(500).json({ error: 'Failed to check trial status' });
      }

      if (!trialResult.data.canUseService) {
        const { isDateExpired, isUsageExpired, remainingDays, remainingUsage } = trialResult.data;

        let errorMessage = '試用期間が終了しました。';
        if (isDateExpired && isUsageExpired) {
          errorMessage += '期間と利用回数の両方が上限に達しています。';
        } else if (isDateExpired) {
          errorMessage += '試用期間（2週間）が終了しています。';
        } else if (isUsageExpired) {
          errorMessage += '利用回数（15回）が上限に達しています。';
        }

        // Mark trial as expired if not already done
        if (trialResult.data.subscriptionStatus === 'trial') {
          await db.expireTrial(decoded.userId);
        }

        return res.status(403).json({
          error: errorMessage,
          code: 'TRIAL_EXPIRED',
          trialInfo: {
            isDateExpired,
            isUsageExpired,
            remainingDays,
            remainingUsage
          }
        });
      }
    }
    // Admin users have unlimited access

    const { reportType, customPrompt, inputText, files, additionalInfo } = req.body;

    // Validate report type
    const validReportTypes = ['jp_investment_4part', 'jp_tax_strategy', 'jp_inheritance_strategy', 'custom'];
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

    // Prepare user input content
    let userContent = '';

    // Add input text if provided
    if (inputText && inputText.trim()) {
      userContent += `\n【入力テキスト】\n${inputText.trim()}\n`;
    }

    // Add file contents to the prompt
    if (fileContents.length > 0) {
      userContent += '\n--- 添付ファイル ---\n';
      for (const file of fileContents) {
        if (file.type === 'application/pdf') {
          userContent += `\n【${file.name}】\n${file.content}\n`;
        } else {
          userContent += `\n【${file.name}】\n画像ファイルが添付されています。内容を分析してください。\n`;
        }
      }
      userContent += '\n--- ファイル終了 ---\n';
    }

    // Add user content if we have any
    if (userContent.trim()) {
      messages.push({
        role: 'user',
        content: userContent
      });
    }

    // Handle image attachments for vision model
    const imageAttachments = fileContents.filter(file =>
      file.type.startsWith('image/')
    );

    if (imageAttachments.length > 0 && messages.length > 1) {
      const lastMessage = messages[messages.length - 1];

      // Convert to vision format if we have images
      const contentParts = [
        {
          type: 'text',
          text: lastMessage.content
        }
      ];

      // Add each image
      imageAttachments.forEach(file => {
        contentParts.push({
          type: 'image_url',
          image_url: {
            url: file.content,
            detail: 'high'
          }
        });
      });

      lastMessage.content = contentParts;
    }

    // Validate that we have content to process
    if (messages.length < 2 && (!inputText || !inputText.trim())) {
      return res.status(400).json({
        error: 'テキストまたはファイルを入力してください',
        code: 'NO_INPUT_PROVIDED'
      });
    }

    // Call OpenAI API
    const modelToUse = imageAttachments.length > 0 ? 'gpt-4o' : 'gpt-4o';

    const response = await openai.chat.completions.create({
      model: modelToUse,
      messages: messages,
      max_tokens: 4000,
      temperature: 0.7
    });

    const generatedContent = response.choices[0].message.content;

    // Extract token usage information
    const usage = response.usage || {};
    const promptTokens = usage.prompt_tokens || 0;
    const completionTokens = usage.completion_tokens || 0;
    const totalTokens = usage.total_tokens || 0;

    // Calculate estimated cost
    const estimatedCost = db.calculateTokenCost(promptTokens, completionTokens, modelToUse);

    // Log token usage
    await db.logTokenUsage({
      userId: decoded.userId,
      userEmail: userResult.data.email,
      reportType,
      model: modelToUse,
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCost,
      hasImages: imageAttachments.length > 0,
      fileCount: files ? files.length : 0,
      fileTypes: files ? files.map(f => f.type) : [],
      inputTextLength: inputText ? inputText.length : 0,
      outputTextLength: generatedContent ? generatedContent.length : 0,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Log report generation
    await db.logReportGeneration({
      userId: decoded.userId,
      email: userResult.data.email,
      reportType,
      customPrompt: reportType === 'custom' ? customPrompt : null,
      additionalInfo: additionalInfo || null,
      fileCount: files ? files.length : 0,
      fileNames: files ? files.map(f => f.name) : [],
      tokenUsage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost
      },
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    // Increment trial usage if user is on trial
    if (trialResult.data.subscriptionStatus === 'trial') {
      await db.incrementTrialUsage(decoded.userId);
    }

    // Log usage
    await db.logUsage({
      action: 'report_generation',
      userId: decoded.userId,
      email: userResult.data.email,
      reportType,
      trialUsageCount: trialResult.data.trialUsageCount + (trialResult.data.subscriptionStatus === 'trial' ? 1 : 0),
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });

    return res.status(200).json({
      success: true,
      content: generatedContent,
      markdown: generatedContent, // For backward compatibility
      reportType,
      timestamp: new Date().toISOString(),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCost: estimatedCost.toFixed(6)
      }
    });

  } catch (error) {
    // Enhanced error logging
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      userId: decoded?.userId,
      reportType: req.body?.reportType,
      fileCount: req.body?.files?.length || 0,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      endpoint: '/api/generate-firebase'
    };

    console.error('Generation error:', errorInfo);

    // Log error to database if possible
    try {
      if (decoded?.userId) {
        await db.logUsage({
          action: 'generation_error',
          userId: decoded.userId,
          reportType: req.body?.reportType,
          error: error.message,
          ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
      }
    } catch (logError) {
      console.error('Failed to log generation error to database:', logError);
    }

    // Provide specific error messages based on error type
    let userMessage = 'Internal server error';
    if (error.message.includes('OpenAI')) {
      userMessage = 'AI service temporarily unavailable. Please try again later.';
    } else if (error.message.includes('PDF')) {
      userMessage = 'Failed to process PDF file. Please ensure the file is not corrupted.';
    } else if (error.message.includes('File')) {
      userMessage = 'File processing error. Please check your file format and size.';
    }

    return res.status(500).json({
      error: userMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
