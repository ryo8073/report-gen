// Simple Generate API - no authentication needed for trial
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
    const { formData } = req.body;
    
    // Simple report generation without authentication
    const report = {
      id: Date.now().toString(),
      title: 'Investment Analysis Report',
      content: 'Generated investment report content...',
      createdAt: new Date().toISOString()
    };

    return res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Generate API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};