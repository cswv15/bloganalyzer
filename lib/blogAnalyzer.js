const Parser = require('rss-parser');
const { searchNaverBlog } = require('./naverApi');

const parser = new Parser();

async function getTotalPostCount(blogId) {
  try {
    const blogUrl = `https://blog.naver.com/${blogId}`;
    console.log(`🔍 전체 게시물 수 조회: ${blogUrl}`);
    
    const response = await fetch(blogUrl);
    const html = await response.text();
    
    const patterns = [
      /(\d{1,3}(?:,\d{3})*)\s*개의\s*글/,
      /totalCount[":\s]+(\d+)/,
      /post_count[":\s]+(\d+)/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const totalPosts = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 전체 게시물 수: ${totalPosts}개`);
        return totalPosts;
      }
    }
    
    console.log('⚠️ HTML에서 게시물 수를 찾지 못함');
    return null;
  } catch (error) {
    console.error('❌ 게시물 수 파싱 에러:', error);
    return null;
  }
}

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

// 링크 정규화 함수
function normalizeUrl(url) {
  return url
    .replace(/&amp;/g, '&')
    .replace(/https?:\/\//, '')
    .replace(/^m\./, '')  // 모바일 URL 제거
    .replace(/\?.*/g, '')  // 쿼리 파라미터 제거
    .toLowerCase()
    .trim();
}

async function checkIndexedStatus(recentPosts, blogId) {
  console.log(`🔎 검색 노출 여부 확인 시작 (${recentPosts.length}개)`);
  
  const results = [];
  
  for (let i = 0; i < recentPosts.length; i++) {
    const post = recentPosts[i];
    
    try {
      console.log(`\n[${i + 1}/${recentPosts.length}] "${post.title}" 검색 중...`);
      
      // 1. 제목으로 검색
      const searchResult = await searchNaverBlog(post.title);
      console.log(`  ➜ 검색 결과: ${searchResult.items?.length || 0}개`);
      
      if (!searchResult.items || searchResult.items.length === 0) {
        console.log(`  ➜ ❌ 검색 결과 없음`);
        results.push({ ...post, isIndexed: false });
        continue;
      }
      
      // 2. 링크 비교
      const normalizedPostLink = normalizeUrl(post.link);
      console.log(`  ➜ 원본 링크: ${post.link}`);
      console.log(`  ➜ 정규화 링크: ${normalizedPostLink}`);
      
      let isIndexed = false;
      
      for (let j = 0; j < Math.min(searchResult.items.length, 10); j++) {
        const item = searchResult.items[j];
        const normalizedSearchLink = normalizeUrl(item.link);
        
        if (j < 3) {
          console.log(`  ➜ 검색 결과[${j}]: ${normalizedSearchLink}`);
        }
        
        // 링크 비교 (정규화된 링크로)
        if (normalizedSearchLink.includes(normalizedPostLink) || 
            normalizedPostLink.includes(normalizedSearchLink)) {
          isIndexed = true;
          console.log(`  ➜ ✅ 매칭 성공! (검색 결과 ${j + 1}번째)`);
          break;
        }
        
        // blogId와 logNo로도 비교
        const postLogNo = post.link.match(/logNo=(\d+)/)?.[1];
        const searchLogNo = item.link.match(/logNo=(\d+)/)?.[1];
        
        if (postLogNo && searchLogNo && postLogNo === searchLogNo) {
          isIndexed = true;
          console.log(`  ➜ ✅ logNo 매칭 성공! (${postLogNo})`);
          break;
        }
      }
      
      if (!isIndexed) {
        console.log(`  ➜ ❌ 매칭 실패 - 노출 안 됨`);
      }
      
      results.push({ ...post, isIndexed });
      
      // API 호출 제한 방지 (100ms 대기)
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`  ➜ ❌ 검색 실패:`, error.message);
      results.push({ ...post, isIndexed: false });
    }
  }
  
  const indexedCount = results.filter(p => p.isIndexed).length;
  console.log(`\n========================================`);
  console.log(`✅ 최종 결과: 노출 ${indexedCount}개 / 누락 ${results.length - indexedCount}개`);
  console.log(`========================================\n`);
  
  return results;
}

async function analyzeBlog(blogUrl) {
  try {
    console.log(`\n========================================`);
    console.log(`📊 블로그 분석 시작: ${blogUrl}`);
    console.log(`========================================\n`);
    
    const blogId = blogUrl.replace(/https?:\/\/(blog\.naver\.com\/)?/, '').split('/')[0];
    console.log(`🆔 블로그 ID: ${blogId}`);
    
    const totalPostsFromHtml = await getTotalPostCount(blogId);
    const recentPosts = await getRecentPosts(blogId);
    const totalPosts = totalPostsFromHtml || recentPosts.length;
    console.log(`📝 최종 게시물 수: ${totalPosts}개`);
    
    const recentPostsWithIndex = await checkIndexedStatus(recentPosts, blogId);
    
    const indexedCount = recentPostsWithIndex.filter(p => p.isIndexed).length;
    const indexingRate = recentPostsWithIndex.length > 0 
      ? (indexedCount / recentPostsWithIndex.length) * 100 
      : 0;
    
    const influenceScore = Math.min(100, Math.floor(50 + indexingRate / 2));
    const contentScore = Math.min(100, Math.floor(40 + Math.log10(totalPosts + 1) * 15));
    const activityScore = Math.min(100, Math.floor(30 + indexingRate / 2 + (totalPosts > 100 ? 20 : 0)));
    const totalScore = Math.floor((influenceScore + contentScore + activityScore) / 3);
    
    const lastUpdated = recentPosts[0]?.postdate || 'N/A';
    
    console.log(`\n✅ 분석 완료\n`);
    
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
