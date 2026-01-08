/**
 * 네이버 블로그 RSS 및 검색 API 관련 함수
 */

// RSS 피드에서 블로그 글 가져오기
async function fetchBlogRSS(blogId) {
  const rssUrl = `https://rss.blog.naver.com/${blogId}.xml`;
  
  try {
    const response = await fetch(rssUrl);
    
    if (!response.ok) {
      throw new Error(`RSS fetch error: ${response.status}`);
    }
    
    const xmlText = await response.text();
    
    // XML 파싱
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1],
          link: linkMatch[1],
          pubDate: pubDateMatch ? pubDateMatch[1] : '',
          postdate: pubDateMatch ? formatDate(pubDateMatch[1]) : ''
        });
      }
    }
    
    console.log(`[DEBUG] RSS Feed: Found ${items.length} items`);
    return items;
    
  } catch (error) {
    console.error('[DEBUG] RSS fetch failed:', error.message);
    return [];
  }
}

// 날짜 포맷 변환 (RFC 822 -> YYYYMMDD)
function formatDate(rfc822Date) {
  try {
    const date = new Date(rfc822Date);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  } catch (error) {
    return '';
  }
}

// 링크에서 글 번호만 추출 (더 정확한 비교를 위해)
function extractPostNumber(link) {
  // blog.naver.com/blogId/223123456 형식에서 223123456만 추출
  const match = link.match(/\/(\d+)$/);
  return match ? match[1] : null;
}

// 제목으로 검색해서 해당 글이 검색 결과에 있는지 확인
async function checkPostIndexingByTitle(post, blogId, clientId, clientSecret) {
  const searchQuery = post.title;
  const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(searchQuery)}&display=100`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.log(`[DEBUG] Title search failed for "${post.title}"`);
      return false;
    }

    const data = await response.json();
    
    // RSS 글의 포스트 번호 추출
    const postNumber = extractPostNumber(post.link);
    
    console.log(`[DEBUG] Searching for: "${post.title}"`);
    console.log(`[DEBUG] RSS Link: ${post.link}, Post Number: ${postNumber}`);
    console.log(`[DEBUG] Search results: ${data.items.length} items`);
    
    // 검색 결과에서 해당 글 찾기
    let isIndexed = false;
    
    for (const item of data.items) {
      const itemPostNumber = extractPostNumber(item.link);
      const itemBlogLink = item.bloggerlink || '';
      
      // 1. 포스트 번호로 비교 (가장 정확)
      if (postNumber && itemPostNumber === postNumber && itemBlogLink.includes(blogId)) {
        console.log(`[DEBUG] ✓ Found by post number: ${item.link}`);
        isIndexed = true;
        break;
      }
      
      // 2. 링크 정규화 후 비교
      const normalizedPostLink = post.link.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
      const normalizedItemLink = item.link.replace(/^https?:\/\//, '').replace(/\/$/, '').toLowerCase();
      
      if (normalizedPostLink === normalizedItemLink) {
        console.log(`[DEBUG] ✓ Found by exact link match: ${item.link}`);
        isIndexed = true;
        break;
      }
    }
    
    console.log(`[DEBUG] "${post.title}" → ${isIndexed ? '✓ 검색노출' : '✗ 누락'}`);
    
    return isIndexed;
    
  } catch (error) {
    console.error(`[DEBUG] Error checking "${post.title}":`, error.message);
    return false;
  }
}

// 최근 글들의 인덱싱 상태 확인
async function checkRecentPostsIndexing(recentPosts, blogId, clientId, clientSecret) {
  const results = [];
  
  for (const post of recentPosts) {
    // 제목으로 검색해서 누락 체크
    const isIndexed = await checkPostIndexingByTitle(post, blogId, clientId, clientSecret);
    
    results.push({
      ...post,
      isIndexed: isIndexed
    });
    
    // API 호출 간격 (Rate Limit 방지)
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// 블로그 이름 가져오기 (간단한 검색)
async function getBlogName(blogId, clientId, clientSecret) {
  const searchQuery = `blog.naver.com/${blogId}`;
  const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(searchQuery)}&display=10`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      return blogId;
    }

    const data = await response.json();
    
    // 해당 블로그의 글을 찾아서 블로그명 추출
    for (const item of data.items || []) {
      const blogLink = item.bloggerlink || '';
      if (blogLink.includes(`blog.naver.com/${blogId}`)) {
        return item.bloggername || blogId;
      }
    }
    
    return blogId;
  } catch (error) {
    console.error('[DEBUG] getBlogName error:', error);
    return blogId;
  }
}

module.exports = {
  fetchBlogRSS,
  checkRecentPostsIndexing,
  getBlogName
};
