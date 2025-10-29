// Simple test endpoint
export default async function handler(req, res) {
  try {
    console.log('Test endpoint called:', req.method, req.url);
    
    res.status(200).json({
      success: true,
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({
      error: 'Test endpoint failed',
      details: error.message
    });
  }
}