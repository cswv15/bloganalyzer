const Parser = require('rss-parser');
const { searchNaverBlog } = require('./naverApi');
const { normalizeUrl } = require('./utils');

const parser = new Parser();

// iframe 본문 URL 추출 및 접근
async function getIframeContent(postUrl) {
  try {
    const mainResponse = await fetch(postUrl);
    const mainHtml = await mainResponse.text();
    
    const iframeMatch = mainHtml.match(/<iframe[^>]*src="([^"]*(?:PostView\.naver|PostView\.nhn)[^"]*)"/i);
    
    if (iframeMatch) {
      let iframeUrl = iframeMatch[1];
      
      if (iframeUrl.startsWith('//')) {
        iframeUrl = 'https:' + iframeUrl;
      } else if (iframeUrl.startsWith('/')) {
        iframeUrl = 'https://blog.naver.com' + iframeUrl;
      }
      
      console.log(`🖼️ iframe URL 발견: ${iframeUrl}`);
      
      const iframeResponse = await fetch(iframeUrl);
      const iframeHtml = await iframeResponse.text();
      
      return iframeHtml;
    }
    
    return null;
  } catch (error) {
    console.error('❌ iframe 접근 실패:', error.message);
    return null;
  }
}

// 총 게시물 수 가져오기
async function getTotalPostCount(blogId) {
  try {
    const postListUrl = `https://blog.naver.com/PostList.naver?blogId=${blogId}&categoryNo=0&currentPage=1`;
    console.log(`🔍 PostList 조회: ${postListUrl}`);
    
    const response = await fetch(postListUrl);
    const html = await response.text();
    
    console.log(`📄 HTML 길이: ${html.length}자`);
    
    const patterns = [
      /전체보기\s*\((\d{1,3}(?:,\d{3})*)\)/,
      /전체\s*(\d{1,3}(?:,\d{3})*)\s*개/,
      /"?totalCount"?\s*[:=]\s*(\d+)/,
      /categoryName.*?전체.*?(\d{1,3}(?:,\d{3})*)/s,
      /<em[^>]*>전체<\/em>.*?\((\d{1,3}(?:,\d{3})*)\)/s,
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = html.match(pattern);
      if (match) {
        const count = parseInt(match[1].replace(/,/g, ''));
        if (count > 0 && count < 1000000) {
          console.log(`✅ 패턴 ${i + 1}번으로 총 게시물 수 발견: ${count}개`);
          return count;
        }
      }
    }
    
    console.log(`⚠️ PostList에서 게시물 수를 찾지 못함, 검색 API 시도...`);
    const searchResult = await searchNaverBlog(`blog.naver.com/${blogId}`);
    
    if (searchResult && searchResult.total) {
      console.log(`✅ 검색 API로 발견: ${searchResult.total}개`);
      return searchResult.total;
    }
    
    console.log(`❌ 모든 방법 실패`);
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

// 개별 게시물 상세 정보 가져오기 (개선된 버전)
async function getPostDetails(postUrl) {
  try {
    let html = null;
    
    // 1차 시도: iframe 본문 직접 접근
    console.log(`🔍 [${postUrl}] 1차 시도: iframe 본문 추출`);
    html = await getIframeContent(postUrl);
    
    // 2차 시도: 모바일 버전
    if (!html || html.length < 1000) {
      console.log(`🔍 2차 시도: 모바일 버전`);
      let urlToFetch = postUrl.replace('blog.naver.com', 'm.blog.naver.com');
      
      const response = await fetch(urlToFetch, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
        }
      });
      
      if (response.ok) {
        html = await response.text();
      }
    }
    
    // 3차 시도: 데스크톱 버전
    if (!html || html.length < 1000) {
      console.log(`🔍 3차 시도: 데스크톱 버전`);
      const response = await fetch(postUrl);
      if (response.ok) {
        html = await response.text();
      }
    }
    
    if (!html) {
      console.warn(`⚠️ 모든 방법 실패, 기본값 반환`);
      return { viewCount: 0, commentCount: 0, likeCount: 0, contentLength: 0, imageCount: 0 };
    }
    
    console.log(`📄 HTML 총 길이: ${html.length}자`);
    
    // 조회수 추출
    const viewPatterns = [
      /조회\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /조회수\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /"?viewCnt"?\s*[:=]\s*"?(\d+)"?/i,
      /pcol2.*?(\d{1,3}(?:,\d{3})*)/s,
      /stat_count.*?(\d{1,3}(?:,\d{3})*)/s,
    ];
    
    let viewCount = 0;
    for (const pattern of viewPatterns) {
      const match = html.match(pattern);
      if (match) {
        viewCount = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 조회수: ${viewCount}`);
        break;
      }
    }
    
    // 댓글 수 추출
    const commentPatterns = [
      /댓글\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /"?commentCnt"?\s*[:=]\s*"?(\d+)"?/i,
      /"?commentCount"?\s*[:=]\s*"?(\d+)"?/i,
      /comment_count["\s:]*(\d+)/i,
      /cbox_module.*?댓글\s*(\d+)/s,
    ];
    
    let commentCount = 0;
    for (const pattern of commentPatterns) {
      const match = html.match(pattern);
      if (match) {
        commentCount = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 댓글 수: ${commentCount}`);
        break;
      }
    }
    
    // 공감 수 추출
    const likePatterns = [
      /공감\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /"?sympathyCnt"?\s*[:=]\s*"?(\d+)"?/i,
      /"?sympathyCount"?\s*[:=]\s*"?(\d+)"?/i,
      /sympathy_count["\s:]*(\d+)/i,
      /like_count["\s:]*(\d+)/i,
    ];
    
    let likeCount = 0;
    for (const pattern of likePatterns) {
      const match = html.match(pattern);
      if (match) {
        likeCount = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 공감 수: ${likeCount}`);
        break;
      }
    }
    
    // ========================================
    // 본문 내용 추출 (개선된 로직)
    // ========================================
    let contentLength = 0;
    let contentHtml = '';
    
    // 패턴들을 순서대로 시도
    const contentPatterns = [
      // 스마트 에디터 3.0 - se-main-container
      { name: 'SE3.0', regex: /<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/i },
      
      // 스마트 에디터 3.0 - 더 넓은 범위
      { name: 'SE3.0-wide', regex: /<div[^>]*class="[^"]*se_component_wrap[^"]*"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*(?:comment|another_category|relate_post))/i },
      
      // 스마트 에디터 2.0
      { name: 'SE2.0', regex: /<div[^>]*id="postViewArea"[^>]*>([\s\S]*?)<\/div>/i },
      
      // 모바일 버전
      { name: 'Mobile', regex: /<div[^>]*class="[^"]*post_ct[^"]*"[^>]*>([\s\S]*?)<\/div>/i },
      
      // 구 에디터
      { name: 'Old', regex: /<div[^>]*class="[^"]*post-view[^"]*"[^>]*>([\s\S]*?)<\/div>/i },
      
      // 본문 전체 (마지막 시도)
      { name: 'Fallback', regex: /<div[^>]*id=".*?post.*?"[^>]*>([\s\S]*?)(?=<div[^>]*class="[^"]*(?:comment|another_category))/i },
    ];
    
    for (const { name, regex } of contentPatterns) {
      const match = html.match(regex);
      if (match && match[1]) {
        contentHtml = match[1];
        console.log(`✅ 본문 패턴 발견: ${name}, HTML 길이: ${contentHtml.length}자`);
        break;
      }
    }
    
    if (contentHtml) {
      // HTML 태그 제거 및 텍스트 추출
      const textContent = contentHtml
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<iframe[^>]*>.*?<\/iframe>/gis, '')
        .replace(/<noscript[^>]*>.*?<\/noscript>/gis, '')
        .replace(/<!--.*?-->/gs, '')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<\/div>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&#\d+;/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      contentLength = textContent.length;
      console.log(`✅ 본문 글자 수: ${contentLength}자`);
      console.log(`📝 미리보기: ${textContent.substring(0, 150).replace(/\n/g, ' ')}...`);
    } else {
      console.warn(`⚠️ 본문을 찾지 못함, HTML 시작 부분:`);
      console.log(html.substring(0, 1000));
    }
    
    // ========================================
    // 이미지 개수 추출 (개선된 로직 - 본문 영역만)
    // ========================================
    let imageCount = 0;
    
    if (contentHtml) {
      // 본문 HTML에서만 이미지 카운트
      const imageUrls = new Set(); // 중복 제거
      
      // img 태그
      const imgMatches = contentHtml.matchAll(/<img[^>]*src="([^"]+)"/gi);
      for (const match of imgMatches) {
        const src = match[1];
        // 아이콘, 이모티콘, 광고 제외
        if (!src.includes('emoticon') && 
            !src.includes('icon') && 
            !src.includes('ad.') &&
            !src.includes('banner') &&
            !src.includes('logo') &&
            src.length > 20) {
          imageUrls.add(src);
        }
      }
      
      // se-image (스마트 에디터 3.0)
      const seImageMatches = contentHtml.matchAll(/<se-image[^>]*data-src="([^"]+)"/gi);
      for (const match of seImageMatches) {
        imageUrls.add(match[1]);
      }
      
      // data-src 속성
      const dataSrcMatches = contentHtml.matchAll(/data-src="([^"]*\.(jpg|jpeg|png|gif|webp)[^"]*)"/gi);
      for (const match of dataSrcMatches) {
        const src = match[1];
        if (!src.includes('emoticon') && !src.includes('icon')) {
          imageUrls.add(src);
        }
      }
      
      imageCount = imageUrls.size;
      console.log(`✅ 본문 이미지 개수: ${imageCount}개 (중복 제거됨)`);
    } else {
      // 본문을 못 찾은 경우 전체 HTML에서 추정 (보수적으로)
      const allImages = html.match(/<img[^>]*src="[^"]*\.(jpg|jpeg|png|gif|webp)[^"]*"/gi) || [];
      imageCount = Math.min(allImages.length, 20); // 최대 20개로 제한
      console.log(`⚠️ 본문 없음, 전체 이미지 추정: ${imageCount}개 (최대 20개 제한)`);
    }
    
    // 최종 결과
    console.log(`📊 최종 결과: 조회 ${viewCount}, 댓글 ${commentCount}, 공감 ${likeCount}, 글자 ${contentLength}, 이미지 ${imageCount}`);
    console.log(`----------------------------------------`);
    
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
