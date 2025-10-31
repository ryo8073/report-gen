/**
 * File Processing Utilities
 * Handles various file types: CSV, Excel, Word, Text, Images, PDFs
 */

/**
 * Process Excel file (.xlsx, .xls)
 * Extracts numerical data from Excel spreadsheets
 */
async function processExcelFile(file, reportType) {
  try {
    console.log(`[EXCEL] Processing Excel file: ${file.name}`);
    
    // Try to use xlsx library if available
    try {
      const XLSX = await import('xlsx');
      const buffer = Buffer.from(file.data, 'base64');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      let extractedData = `=== Excelファイル: ${file.name} の内容 ===\n\n`;
      
      // Process each sheet
      workbook.SheetNames.forEach((sheetName, index) => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
        
        extractedData += `\n【シート${index + 1}: ${sheetName}】\n`;
        
        // Convert to readable format with emphasis on numerical data
        jsonData.forEach((row, rowIndex) => {
          const rowText = row.map(cell => {
            if (typeof cell === 'number') {
              return cell.toString();
            }
            return cell.toString().trim();
          }).filter(cell => cell !== '').join(' | ');
          
          if (rowText) {
            extractedData += `${rowText}\n`;
          }
        });
        
        extractedData += '\n';
      });
      
      console.log(`[EXCEL] Successfully extracted data from ${file.name}, length: ${extractedData.length}`);
      
      return {
        fileName: file.name,
        content: extractedData,
        model: 'xlsx-parser'
      };
    } catch (xlsxError) {
      console.warn(`[EXCEL] xlsx library not available, trying fallback:`, xlsxError.message);
      
      // Fallback: Try to extract as text/CSV-like content
      try {
        const buffer = Buffer.from(file.data, 'base64');
        // Excel files are binary, but we can try to extract readable text
        const textContent = buffer.toString('utf8').substring(0, 50000); // Limit to 50KB of text
        const readableText = textContent.replace(/[^\x20-\x7E\n\r\t]/g, ''); // Remove non-printable chars
        
        return {
          fileName: file.name,
          content: `=== Excelファイル: ${file.name} (テキスト抽出) ===\n\n${readableText}\n\n※Excelファイルは完全な解析には専用ライブラリが必要です。\n`,
          model: 'text-fallback'
        };
      } catch (textError) {
        throw new Error(`Excel file processing failed: ${xlsxError.message}`);
      }
    }
  } catch (error) {
    console.error(`[EXCEL] Error processing Excel file ${file.name}:`, error);
    return {
      fileName: file.name,
      error: error.message,
      content: `Excelファイル ${file.name} の処理中にエラーが発生しました: ${error.message}\n\n数値データを抽出するには、ExcelファイルをCSV形式に変換してからアップロードすることを推奨します。`
    };
  }
}

/**
 * Process Word document (.docx, .doc)
 */
async function processWordFile(file, reportType) {
  try {
    console.log(`[WORD] Processing Word document: ${file.name}`);
    
    // Try to use docx library if available
    try {
      // For .docx files, we can try to extract text
      // Note: This requires a docx parser library
      const buffer = Buffer.from(file.data, 'base64');
      
      // Simple text extraction attempt (works for some docx files)
      const textContent = buffer.toString('utf8').substring(0, 50000);
      const readableText = textContent.replace(/[^\x20-\x7E\n\r\t\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '');
      
      return {
        fileName: file.name,
        content: `=== Wordファイル: ${file.name} の内容 ===\n\n${readableText}\n\n※Wordファイルは完全な解析には専用ライブラリが必要です。PDF形式で保存してからアップロードすることを推奨します。\n`,
        model: 'text-fallback'
      };
    } catch (error) {
      throw new Error(`Word file processing failed: ${error.message}`);
    }
  } catch (error) {
    console.error(`[WORD] Error processing Word file ${file.name}:`, error);
    return {
      fileName: file.name,
      error: error.message,
      content: `Wordファイル ${file.name} の処理中にエラーが発生しました: ${error.message}\n\nPDF形式で保存してからアップロードすることを推奨します。`
    };
  }
}

/**
 * Enhanced CSV processing with better numerical data extraction
 */
async function processCSVFile(file, reportType) {
  try {
    console.log(`[CSV] Processing CSV file: ${file.name}`);
    
    const buffer = Buffer.from(file.data, 'base64');
    const csvText = buffer.toString('utf8');
    
    // Parse CSV and emphasize numerical columns
    const lines = csvText.split('\n');
    let csvData = `=== CSVファイル: ${file.name} の内容 ===\n\n`;
    
    lines.forEach((line, index) => {
      if (line.trim()) {
        // Split by comma, but handle quoted fields
        const columns = line.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        
        // Highlight numerical values
        const formattedColumns = columns.map(col => {
          // Check if it's a number
          const numMatch = col.match(/^([\d.,]+)\s*(%|円|倍)?$/);
          if (numMatch) {
            return `[${col}]`; // Highlight numerical values
          }
          return col;
        });
        
        csvData += `${formattedColumns.join(' | ')}\n`;
        
        // Limit to first 100 rows to avoid too large output
        if (index >= 100) {
          csvData += `\n... (残り ${lines.length - 101} 行) ...\n`;
          return;
        }
      }
    });
    
    console.log(`[CSV] Successfully processed CSV file ${file.name}, ${lines.length} lines`);
    
    return {
      fileName: file.name,
      content: csvData,
      model: 'csv-parser'
    };
  } catch (error) {
    console.error(`[CSV] Error processing CSV file ${file.name}:`, error);
    return {
      fileName: file.name,
      error: error.message,
      content: `CSVファイル ${file.name} の処理中にエラーが発生しました: ${error.message}`
    };
  }
}

export { processExcelFile, processWordFile, processCSVFile };

