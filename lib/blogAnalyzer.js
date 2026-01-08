const Parser = require('rss-parser');
const { searchNaverBlog } = require('./naverApi');

const parser = new Parser();

// 네이버 블로그 PostList API로 전체 게시물 수 가져오기
async function getTotalPostCount(blogId) {
  try {
    // 방법 1: PostList 페이지에서 가져오기
    const postListUrl = `https://blog.naver.com/PostList.naver?blogId=${blogId}&categoryNo=0&currentPage=1`;
    console.log(`🔍 PostList 조회: ${postListUrl}`);
    
    const response = await fetch(postListUrl);
    const html = await response.text();
    
    // 패턴 1: 전체 게시물 수 (가장 정확)
    const patterns = [
      // "전체보기 (123)" 형식
      /전체보기\s*\((\d{1,3}(?:,\d{3})*)\)/,
      /전체보기.*?(\d{1,3}(?:,\d{3})*)/,
      
      // "전체 N개" 형식
      /전체\s*(\d{1,3}(?:,\d{3})*)\s*개/,
      
      // countList 또는 totalCount JSON
      /"?totalCount"?\s*[:=]\s*(\d+)/,
      /"?countList"?\s*[:=]\s*(\d+)/,
      
      // pcol1 영역
      /pcol1.*?>.*?(\d{1,3}(?:,\d{3})*)/s,
      
      // 기타
      /전체글\s*[:\(]?\s*(\d{1,3}(?:,\d{3})*)/,
    ];
    
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''));
        if (count > 0 && count < 1000000) {
          console.log(`✅ 총 게시물 수 발견: ${count}개 (패턴 매칭)`);
          return count;
        }
      }
    }
    
    console.log(`⚠️ PostList에서 게시물 수를 찾지 못함`);
    return null;
    
  } catch (error) {
    console.error('❌ PostList 조회 실패:', error.message);
    return null;
  }
}

// 네이버 검색 API로 게시물 수 추정
async function getTotalPostCountFromSearchAPI(blogId) {
  try {
    console.log(`🔍 검색 API로 게시물 수 추정: ${blogId}`);
    
    // 블로그 주소로 검색
    const searchResult = await searchNaverBlog(`blog.naver.com/${blogId}`);
    
    if (searchResult && searchResult.total) {
      console.log(`✅ 검색 API total: ${searchResult.total}개`);
      return searchResult.total;
    }
    
    console.log(`⚠️ 검색 API에서 total 없음`);
    return null;
    
  } catch (error) {
    console.error('❌ 검색 API 실패:', error.message);
    return null;
  }
}

// 메인 블로그 페이지에서 게시물 수 가져오기
async function getTotalPostCountFromMainPage(blogId) {
  try {
    const mainUrl = `https://blog.naver.com/${blogId}`;
    console.log(`🔍 메인 페이지 조회: ${mainUrl}`);
    
    const response = await fetch(mainUrl);
    const html = await response.text();
    
    // iframe 내부의 prologue 페이지 URL 추출
    const prologueMatch = html.match(/https?:\/\/blog\.naver\.com\/PostList\.naver\?[^"']+/);
    
    if (prologueMatch) {
      console.log(`📄 Prologue URL 발견: ${prologueMatch[0]}`);
      const prologueResponse = await fetch(prologueMatch[0]);
      const prologueHtml = await prologueResponse.text();
      
      const countMatch = prologueHtml.match(/전체보기\s*\((\d{1,3}(?:,\d{3})*)\)/);
      if (countMatch) {
        const count = parseInt(countMatch[1].replace(/,/g, ''));
        console.log(`✅ Prologue에서 발견: ${count}개`);
        return count;
      }
    }
    
    console.log(`⚠️ 메인 페이지에서 게시물 수 없음`);
    return null;
    
  } catch (error) {
    console.error('❌ 메인 페이지 조회 실패:', error.message);
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
    .replace(/^m\./, '')
    .replace(/\?.*/g, '')
    .toLowerCase()
    .trim();
}

async function checkIndexedStatus(recentPosts, blogId) {
  console.log(`🔎 검색 노출 여부 확인 시작 (${recentPosts.length}개)`);
  
  const results = [];
  
  for (let i = 0; i < recentPosts.length; i++) {
    const post = recentPosts[i];
    
    try {
      const searchResult = await searchNaverBlog(post.title);
      
      if (!searchResult.items || searchResult.items.length === 0) {
        results.push({ ...post, isIndexed: false });
        continue;
      }
      
      const normalizedPostLink = normalizeUrl(post.link);
      let isIndexed = false;
      
      for (let j = 0; j < Math.min(searchResult.items.length, 10); j++) {
        const item = searchResult.items[j];
        const normalizedSearchLink = normalizeUrl(item.link);
        
        if (normalizedSearchLink.includes(normalizedPostLink) || 
            normalizedPostLink.includes(normalizedSearchLink)) {
          isIndexed = true;
          break;
        }
        
        const postLogNo = post.link.match(/logNo=(\d+)/)?.[1];
        const searchLogNo = item.link.match(/logNo=(\d+)/)?.[1];
        
        if (postLogNo && searchLogNo && postLogNo === searchLogNo) {
          isIndexed = true;
          break;
        }
      }
      
      results.push({ ...post, isIndexed });
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error(`검색 실패:`, error.message);
      results.push({ ...post, isIndexed: false });
    }
  }
  
  const indexedCount = results.filter(p => p.isIndexed).length;
  console.log(`✅ 노출: ${indexedCount}개 / 누락: ${results.length - indexedCount}개`);
  
  return results;
}

async function analyzeBlog(blogUrl) {
  try {
    console.log(`\n========================================`);
    console.log(`📊 블로그 분석 시작: ${blogUrl}`);
    console.log(`========================================\n`);
    
    const blogId = blogUrl.replace(/https?:\/\/(blog\.naver\.com\/)?/, '').split('/')[0];
    console.log(`🆔 블로그 ID: ${blogId}`);
    
    // 🎯 총 게시물 수 가져오기 (3가지 방법 시도)
    console.log(`\n📝 총 게시물 수 집계 시작...\n`);
    
    let totalPosts = null;
    let source = '';
    
    // 방법 1: PostList API
    totalPosts = await getTotalPostCount(blogId);
    if (totalPosts) {
      source = 'PostList API';
    }
    
    // 방법 2: 메인 페이지
    if (!totalPosts) {
      totalPosts = await getTotalPostCountFromMainPage(blogId);
      if (totalPosts) source = 'Main Page';
    }
    
    // 방법 3: 검색 API
    if (!totalPosts) {
      totalPosts = await getTotalPostCountFromSearchAPI(blogId);
      if (totalPosts) source = 'Search API';
    }
    
    // 방법 4: RSS (최후의 수단)
    const recentPosts = await getRecentPosts(blogId);
    if (!totalPosts) {
      totalPosts = recentPosts.length;
      source = 'RSS (최소값)';
    }
    
    console.log(`\n✅ 총 게시물 수: ${totalPosts}개 (출처: ${source})\n`);
    
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
    
    console.log(`\n✅ 분석 완료`);
    console.log(`   총점: ${totalScore} | 영향력: ${influenceScore} | 콘텐츠: ${contentScore} | 활동: ${activityScore}`);
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
      rank: Math.floor(100000 / (totalScore || 1)),
      category: '일반',
      recentPosts: recentPostsWithIndex,
    };
    
  } catch (error) {
    console.error('❌ 블로그 분석 중 오류:', error);
    throw error;
  }
}

module.exports = { analyzeBlog };
