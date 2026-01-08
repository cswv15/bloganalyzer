const Parser = require('rss-parser');
const { searchNaverBlog } = require('./naverApi');

const parser = new Parser();

/**
 * HTML 파싱으로 전체 게시물 수 가져오기
 */
async function getTotalPostCount(blogId) {
  try {
    const blogUrl = `https://blog.naver.com/${blogId}`;
    console.log(`🔍 전체 게시물 수 조회: ${blogUrl}`);
    
    const response = await fetch(blogUrl);
    const html = await response.text();
    
    // "1,342개의 글" 같은 패턴 찾기
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*개의\s*글/,
      /totalCount["\s:]+(\d+)/,
      /post_count["\s:]+(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const totalPosts = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 전체 게시물 수 파싱 성공: ${totalPosts}개`);
        return totalPosts;
      }
    }
    
    console.log('⚠️ HTML에서 게시물 수를 찾지 못했습니다');
    return null;
  } catch (error) {
    console.error('❌ 게시물 수 파싱 에러:', error);
    return null;
  }
}

/**
 * RSS 피드에서 최근 글 10개 가져오기
 */
async function getRecentPosts(blogId) {
  try {
    const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`;
    console.log(`📡 RSS 피드 조회: ${rssUrl}`);
    
    const feed = await parser.parseURL(rssUrl);
    const recentPosts = feed.items.slice(0, 10).map(item => ({
      title: item.title,
      link: item.link,
      postdate: item.pubDate ? new Date(item.pubDate).toISOString().split('T')[0] : 'N/A',
    }));
    
    console.log(`✅ RSS에서 ${recentPosts.length}개 글 수집`);
    return recentPosts;
  } catch (error) {
    console.error('❌ RSS 피드 조회 실패:', error);
    return [];
  }
}

/**
 * 검색 API로 노출 여부 확인
 */
async function checkIndexedStatus(recentPosts) {
  console.log(`🔎 검색 노출 여부 확인 시작 (${recentPosts.length}개)`);
  
  const results = await Promise.all(
    recentPosts.map(async (post) => {
      try {
        const searchResult = await searchNaverBlog(post.title);
        
        // 검색 결과에서 정확히 일치하는 링크 찾기
        const isIndexed = searchResult.items.some(item => {
          const searchLink = item.link.replace(/&amp;/g, '&');
          const postLink = post.link.replace(/&amp;/g, '&');
          return searchLink === postLink;
        });
        
        return { ...post, isIndexed };
      } catch (error) {
        console.error(`❌ "${post.title}" 검색 실패:`, error);
        return { ...post, isIndexed: false };
      }
    })
  );
  
  const indexedCount = results.filter(p => p.isIndexed).length;
  console.log(`✅ 노출: ${indexedCount}개 / 누락: ${results.length - indexedCount}개`);
  
  return results;
}

/**
 * 블로그 분석 (메인 함수)
 */
async function analyzeBlog(blogUrl) {
  try {
    console.log(`\n========================================`);
    console.log(`📊 블로그 분석 시작: ${blogUrl}`);
    console.log(`========================================\n`);
    
    // 1. 블로그 ID 추출
    const blogId = blogUrl.replace(/https?:\/\/(blog\.naver\.com\/)?/, '').split('/')[0];
    console.log(`🆔 블로그 ID: ${blogId}`);
    
    // 2. 전체 게시물 수 가져오기 (HTML 파싱)
    const totalPostsFromHtml = await getTotalPostCount(blogId);
    
    // 3. RSS에서 최근 글 가져오기
    const recentPosts = await getRecentPosts(blogId);
    
    // 4. 전체 게시물 수 결정 (HTML 파싱 우선, 실패 시 RSS 개수)
    const totalPosts = totalPostsFromHtml || recentPosts.length;
    console.log(`📝 최종 게시물 수: ${totalPosts}개`);
    
    // 5. 검색 노출 여부 확인
    const recentPostsWithIndex = await checkIndexedStatus(recentPosts);
    
    // 6. 점수 계산
    const indexedCount = recentPostsWithIndex.filter(p => p.isIndexed).length;
    const indexingRate = recentPostsWithIndex.length > 0 
      ? (indexedCount / recentPostsWithIndex.length) * 100 
      : 0;
    
    const influenceScore = Math.min(100, Math.floor(50 + indexingRate / 2));
    const contentScore = Math.min(100, Math.floor(40 + Math.log10(totalPosts + 1) * 15));
    const activityScore = Math.min(100, Math.floor(30 + indexingRate / 2 + (totalPosts > 100 ? 20 : 0)));
    const totalScore = Math.floor((influenceScore + contentScore + activityScore) / 3);
    
    // 7. 마지막 포스팅 날짜
    const lastUpdated = recentPosts[0]?.postdate || 'N/A';
    
    console.log(`\n========================================`);
    console.log(`✅ 분석 완료`);
    console.log(`========================================\n`);
    
    return {
      blogUrl,
      blogName: blogId,
      totalScore,
      influenceScore,
      contentScore,
      activityScore,
      totalPosts,
      totalVisitors: Math.floor(totalPosts * 450),
      avgCommentsPerPost: Math.floor(Math.random() * 5) + 2,
      lastUpdated,
      rank: Math.floor(100000 / totalScore),
      category: '일반',
      recentPosts: recentPostsWithIndex,
    };
    
  } catch (error) {
    console.error('❌ 블로그 분석 중 오류:', error);
    throw error;
  }
}

module.exports = { analyzeBlog };
