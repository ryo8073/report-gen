#!/usr/bin/env node

/**
 * MVP Server - Minimal Viable Product
 * Bypasses Firebase for immediate functionality testing
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3005;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Serve static files
app.use(express.static('.'));

// Mock user data
const mockUsers = {
  'test@example.com': {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    password: 'testpassword123', // In real app, this would be hashed
    role: 'user',
    isActive: true
  },
  'admin@example.com': {
    id: 'admin-123',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'adminpassword123',
    role: 'admin',
    isActive: true
  }
};

let currentSession = null;

// Mock authentication endpoints
app.post('/api/auth/login-firebase', (req, res) => {
  const { email, password } = req.body;
  
  console.log('Login attempt:', { email, password });
  
  const user = mockUsers[email];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Create session
  currentSession = {
    userId: user.id,
    email: user.email,
    role: user.role
  };
  
  // Set cookie
  res.cookie('token', 'mock-token-123', { 
    httpOnly: true, 
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });
  
  res.json({
    success: true,
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

app.get('/api/auth/me-firebase', (req, res) => {
  if (!currentSession) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const user = Object.values(mockUsers).find(u => u.id === currentSession.userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({
    success: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  currentSession = null;
  res.clearCookie('token');
  res.json({ success: true, message: 'Logout successful' });
});

// Mock report generation
app.post('/api/generate-firebase', (req, res) => {
  console.log('Report generation request:', req.body);
  
  if (!currentSession) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const { reportType, inputText, files } = req.body;
  
  if (!reportType) {
    return res.status(400).json({ error: 'Report type is required' });
  }
  
  // Mock report content based on type
  let mockContent = '';
  switch (reportType) {
    case 'jp_investment_4part':
      mockContent = `# 投資分析レポート

## 1. Executive Summary（投資概要）
この投資案件は、安定した収益性と成長性を兼ね備えた魅力的な投資機会です。

## 2. Benefits（投資の優位性）
- 高い収益率（FCR: 8.5%）
- 安定したキャッシュフロー
- 優良立地による資産価値の維持

## 3. Risks（潜在リスクの分析）
- 市場変動リスク
- 金利上昇リスク
- 流動性リスク

## 4. Evidence（定量的証拠）
- 投資額: ¥50,000,000
- 年間収益: ¥4,250,000
- ROI: 8.5%`;
      break;
      
    case 'jp_tax_strategy':
      mockContent = `# 税務戦略レポート

## 減価償却による節税効果分析

### 戦略サマリー
不動産投資による減価償却を活用し、年間約¥500,000の節税効果を実現。

### 減価償却スケジュール
- 建物価格: ¥30,000,000
- 耐用年数: 22年
- 年間減価償却額: ¥1,363,636

### 節税効果
- 所得税率30%の場合: ¥409,091/年
- 住民税10%の場合: ¥136,364/年
- 合計節税効果: ¥545,455/年`;
      break;
      
    case 'jp_inheritance_strategy':
      mockContent = `# 相続対策戦略レポート

## 収益不動産活用による相続税圧縮効果

### 戦略概要
収益不動産の取得により、相続税評価額を約30%圧縮し、相続税負担を軽減。

### 評価減効果
- 土地: 路線価による評価（時価の約80%）
- 建物: 固定資産税評価額（時価の約70%）
- 賃貸割合による減額: 30%

### 節税効果試算
- 現金保有時の相続税: ¥15,000,000
- 不動産転換後の相続税: ¥10,500,000
- 節税効果: ¥4,500,000`;
      break;
      
    case 'custom':
      mockContent = `# カスタムレポート

${inputText || 'カスタムプロンプトに基づいた分析結果'}

## 分析結果
提供された情報に基づき、以下の分析を実施いたします。

### 主要なポイント
1. データの傾向分析
2. リスク要因の特定
3. 改善提案

### 結論
総合的な評価として、現在の状況は良好であり、継続的な監視と適切な対策により、さらなる改善が期待できます。`;
      break;
      
    default:
      mockContent = `# ${reportType} レポート

## 概要
${inputText || 'レポートの内容がここに表示されます。'}

## 分析結果
詳細な分析結果をここに記載します。

## 推奨事項
1. 継続的な監視
2. 定期的な見直し
3. 適切な対策の実施`;
  }
  
  // Add file information if files were uploaded
  if (files && files.length > 0) {
    mockContent += `\n\n## 添付ファイル分析\n`;
    files.forEach(file => {
      mockContent += `- ${file.name}: ${file.type}\n`;
    });
  }
  
  // Mock token usage
  const mockUsage = {
    promptTokens: Math.floor(Math.random() * 1000) + 500,
    completionTokens: Math.floor(Math.random() * 500) + 200,
    totalTokens: 0,
    estimatedCost: '0.001500'
  };
  mockUsage.totalTokens = mockUsage.promptTokens + mockUsage.completionTokens;
  
  res.json({
    success: true,
    content: mockContent,
    markdown: mockContent,
    reportType,
    timestamp: new Date().toISOString(),
    usage: mockUsage
  });
});

// Mock trial status
app.get('/api/trial/status', (req, res) => {
  if (!currentSession) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  res.json({
    success: true,
    trial: {
      isTrialActive: true,
      subscriptionStatus: 'trial',
      remainingDays: 10,
      remainingUsage: 12,
      trialUsageCount: 3,
      trialMaxUsage: 15,
      canUseService: true
    }
  });
});

// Serve HTML files
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 MVP Server running at http://localhost:${PORT}`);
  console.log('📋 Test credentials:');
  console.log('  User: test@example.com / testpassword123');
  console.log('  Admin: admin@example.com / adminpassword123');
  console.log('\n✅ Ready for testing!');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down MVP server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down MVP server...');
  process.exit(0);
});