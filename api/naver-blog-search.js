/**
 * Vercel Serverless Function
 * 네이버 블로그 분석 API 엔드포인트
 */

const { extractBlogId } = require('../lib/utils');
const { fetchBlogRSS, getBlogName } = require('../lib/naverApi');
const { analyzeBlogData } = require('../lib/blogAnalyzer');

module.exports = async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { blogUrl } = req.body;

  if (!blogUrl) {
    return res.status(400).json({ error: 'blogUrl is required' });
  }

  // 환경 변수에서 네이버 API 키 가져오기
  const CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'API credentials not configured' });
  }

  try {
    // 1. 블로그 ID 추출
    const blogId = extractBlogId(blogUrl);
    console.log(`[DEBUG] Analyzing blog: ${blogId}`);
    
    // 2. RSS 피드에서 블로그 글 가져오기
    const rssItems = await fetchBlogRSS(blogId);
    
    if (rssItems.length === 0) {
      return res.status(404).json({ 
        error: '블로그를 찾을 수 없거나 공개된 글이 없습니다',
        blogId: blogId
      });
    }
    
    // 3. 블로그 이름 가져오기 (검색 API 활용)
    const blogName = await getBlogName(blogId, CLIENT_ID, CLIENT_SECRET);
    
    // 4. 블로그 분석 점수 계산
    const analysisResult = analyzeBlogData(rssItems, blogId, blogName);

    return res.status(200).json(analysisResult);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Failed to analyze blog',
      message: error.message 
    });
  }
};
