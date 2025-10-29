#!/usr/bin/env node

/**
 * Fix database imports in API files
 */

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiFiles = [
  'api/user/token-usage.js',
  'api/user/team-usage.js',
  'api/trial/upgrade.js',
  'api/trial/status.js',
  'api/trial/check.js',
  'api/custom-prompts/save.js',
  'api/custom-prompts/list.js',
  'api/custom-prompts/delete.js',
  'api/auth/register-firebase.js',
  'api/auth/login-firebase.js',
  'api/admin/usage-chart-firebase.js',
  'api/admin/trial-stats.js',
  'api/admin/token-stats.js',
  'api/admin/team-members.js',
  'api/admin/stats-firebase.js',
  'api/admin/recent-activity-firebase.js',
  'api/admin/custom-prompts.js'
];

async function fixFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);
    let content = await fs.readFile(fullPath, 'utf8');
    
    // Replace the import statement
    const oldImport = "import { db } from '../../lib/firebase-db.js';";
    const newImport = "import { FirebaseDatabase } from '../../lib/firebase-db.js';\n\nconst db = new FirebaseDatabase();";
    
    if (content.includes(oldImport)) {
      content = content.replace(oldImport, newImport);
      await fs.writeFile(fullPath, content, 'utf8');
      console.log(`✅ Fixed: ${filePath}`);
    } else {
      console.log(`⏭️  Skipped: ${filePath} (already fixed or different pattern)`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

async function main() {
  console.log('🔧 Fixing database imports in API files...\n');
  
  for (const file of apiFiles) {
    await fixFile(file);
  }
  
  console.log('\n✅ Database import fixes completed!');
}

main().catch(console.error);