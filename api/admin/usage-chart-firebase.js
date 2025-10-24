// Firebase-based admin usage chart endpoint
import { db } from '../../lib/firebase-db.js';
import { verifyToken } from '../../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
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

    // Get user data to check role
    const userResult = await db.getUserById(decoded.userId);
    if (!userResult.success || userResult.data.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Get usage stats
    const usageResult = await db.getUsageStats();
    if (!usageResult.success) {
      return res.status(500).json({ error: usageResult.error });
    }

    // Process data for chart
    const chartData = {
      labels: [],
      datasets: [
        {
          label: 'Report Generations',
          data: [],
          backgroundColor: 'rgba(59, 130, 246, 0.5)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 1
        }
      ]
    };

    // Group by date
    const dateGroups = {};
    usageResult.data.forEach(usage => {
      if (usage.action === 'report_generation') {
        const date = new Date(usage.timestamp?.seconds * 1000 || usage.timestamp).toISOString().split('T')[0];
        dateGroups[date] = (dateGroups[date] || 0) + 1;
      }
    });

    // Sort dates and create chart data
    const sortedDates = Object.keys(dateGroups).sort();
    chartData.labels = sortedDates;
    chartData.datasets[0].data = sortedDates.map(date => dateGroups[date] || 0);

    return res.status(200).json({
      success: true,
      data: chartData
    });

  } catch (error) {
    console.error('Admin usage chart error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
