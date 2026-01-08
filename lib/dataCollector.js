const Parser = require('rss-parser');
const { searchNaverBlog } = require('./naverApi');
const { normalizeUrl } = require('./utils');

const parser = new Parser();

// 총 게시물 수 가져오기
async function getTotalPostCount(blogId) {
  try {
    const postListUrl = `https://blog.naver.com/PostList.naver?blogId=${blogId}&categoryNo=0&currentPage=1`;
    console.log(`🔍 PostList 조회: ${postListUrl}`);
    
    const response = await fetch(postListUrl);
    const html = await response.text();
    
    const patterns = [
      /전체보기\s*\((\d{1,3}(?:,\d{3})*)\)/,
      /전체\s*(\d{1,3}(?:,\d{3})*)\s*개/,
      /"?totalCount"?\s*[:=]\s*(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''));
        if (count > 0 && count < 1000000) {
          console.log(`✅ 총 게시물 수: ${count}개`);
          return count;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('❌ PostList 조회 실패:', error.message);
    return null;
  }
}

// RSS에서 최근 게시물 가져오기
async function getRecentPosts(blogId, limit = 30) {
  try {
    const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`;
    console.log(`📡 RSS 피드 조회: ${rssUrl}`);
    
    const feed = await parser.parseURL(rssUrl);
    const recentPosts = feed.items.slice(0, limit).map(item => ({
      title: item.title,
      link: item.link,
      description: item.contentSnippet || item.description || '',
      pubDate: item.pubDate,
      postdate: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : 'N/A',
    }));
    
    console.log(`✅ RSS에서 ${recentPosts.length}개 글 수집`);
    return recentPosts;
  } catch (error) {
    console.error('❌ RSS 피드 조회 실패:', error);
    return [];
  }
}

// 개별 게시물 상세 정보 가져오기
async function getPostDetails(postUrl) {
  try {
    const response = await fetch(postUrl);
    const html = await response.text();
    
    const viewMatch = html.match(/조회\s*(\d{1,3}(?:,\d{3})*)/i) || 
                      html.match(/pcol2.*?(\d{1,3}(?:,\d{3})*)/s);
    const viewCount = viewMatch ? parseInt(viewMatch[1].replace(/,/g, '')) : 0;
    
    const commentMatch = html.match(/댓글\s*(\d{1,3}(?:,\d{3})*)/i) ||
                         html.match(/commentCount["\s:]*(\d+)/i);
    const commentCount = commentMatch ? parseInt(commentMatch[1].replace(/,/g, '')) : 0;
    
    const likeMatch = html.match(/공감\s*(\d{1,3}(?:,\d{3})*)/i) ||
                      html.match(/sympathyCount["\s:]*(\d+)/i);
    const likeCount = likeMatch ? parseInt(likeMatch[1].replace(/,/g, '')) : 0;
    
    const contentMatch = html.match(/<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>(.*?)<\/div>/s);
    const contentLength = contentMatch ? contentMatch[1].replace(/<[^>]*>/g, '').length : 0;
    
    const imageCount = (html.match(/<img[^>]*>/gi) || []).length;
    
    return {
      viewCount,
      commentCount,
      likeCount,
      contentLength,
      imageCount,
    };
  } catch (error) {
    console.error('❌ 게시물 상세 조회 실패:', error.message);
    return {
      viewCount: 0,
      commentCount: 0,
      likeCount: 0,
      contentLength: 0,
      imageCount: 0,
    };
  }
}

// 검색 노출 여부 + 검색 순위 확인
async function checkIndexedStatus(recentPosts, blogId) {
  console.log(`🔎 검색 노출 여부 확인 시작 (${recentPosts.length}개)`);
  
  const results = [];
  
  for (let i = 0; i < recentPosts.length; i++) {
    const post = recentPosts[i];
    
    try {
      const searchResult = await searchNaverBlog(post.title);
      
      if (!searchResult.items || searchResult.items.length === 0) {
        results.push({ 
          ...post, 
          isIndexed: false,
          searchRank: -1,
          totalResults: 0,
        });
        continue;
      }
      
      const normalizedPostLink = normalizeUrl(post.link);
      let isIndexed = false;
      let searchRank = -1;
      
      for (let j = 0; j < Math.min(searchResult.items.length, 100); j++) {
        const item = searchResult.items[j];
        const normalizedSearchLink = normalizeUrl(item.link);
        
        if (normalizedSearchLink.includes(normalizedPostLink) || 
            normalizedPostLink.includes(normalizedSearchLink)) {
          isIndexed = true;
          searchRank = j + 1;
          break;
        }
        
        const postLogNo = post.link.match(/logNo=(\d+)/)?.[1];
        const searchLogNo = item.link.match(/logNo=(\d+)/)?.[1];
        
        if (postLogNo && searchLogNo && postLogNo === searchLogNo) {
          isIndexed = true;
          searchRank = j + 1;
          break;
        }
      }
      
      results.push({ 
        ...post, 
        isIndexed,
        searchRank,
        totalResults: searchResult.total || 0,
      });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`검색 실패:`, error.message);
      results.push({ 
        ...post, 
        isIndexed: false,
        searchRank: -1,
        totalResults: 0,
      });
    }
  }
  
  const indexedCount = results.filter(p => p.isIndexed).length;
  console.log(`✅ 노출: ${indexedCount}개 / 누락: ${results.length - indexedCount}개`);
  
  return results;
}

module.exports = {
  getTotalPostCount,
  getRecentPosts,
  getPostDetails,
  checkIndexedStatus,
};
