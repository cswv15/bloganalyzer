const { analyzeBlog } = require('../../lib/blogAnalyzer');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { blogUrl } = req.body;

    if (!blogUrl) {
      return res.status(400).json({ error: '블로그 URL이 필요합니다' });
    }

    console.log(`📥 요청 받음: ${blogUrl}`);

    const result = await analyzeBlog(blogUrl);

    console.log(`✅ 응답 전송:`, result);
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ API 에러:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze blog', 
      message: error.message
    });
  }
};
