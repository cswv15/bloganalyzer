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
    if (items.length > 0) {
      console.log(`[DEBUG] RSS Link Example: ${items[0].link}`);
    }
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

// 링크에서 글 번호만 추출
function extractPostNumber(link) {
  // 다양한 형식 지원
  // 1. blog.naver.com/blogId/223123456
  // 2. blog.naver.com/PostView.nhn?logNo=223123456
  
  // logNo= 형식
  let match = link.match(/logNo=(\d+)/);
  if (match) {
    return match[1];
  }
  
  // /숫자 형식
  match = link.match(/\/(\d+)(?:[?&#]|$)/);
  if (match) {
    return match[1];
  }
  
  return null;
}

// 제목 + 블로그ID로 검색해서 해당 글이 검색 결과에 있는지 확인
async function checkPostIndexingByTitle(post, blogId, clientId, clientSecret) {
  const searchQuery = `${post.title} ${blogId}`;
  const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(searchQuery)}&display=30`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.log(`[DEBUG] Search failed for "${post.title}"`);
      return false;
    }

    const data = await response.json();
    
    const postNumber = extractPostNumber(post.link);
    
    console.log(`[DEBUG] ========================================`);
    console.log(`[DEBUG] Title: "${post.title}"`);
    console.log(`[DEBUG] RSS Link: ${post.link}`);
    console.log(`[DEBUG] Post Number: ${postNumber}`);
    console.log(`[DEBUG] Search Results: ${data.items.length}`);
    
    // 검색 결과 링크 샘플 출력
    if (data.items.length > 0) {
      console.log(`[DEBUG] Search Result Links (first 3):`);
      for (let i = 0; i < Math.min(3, data.items.length); i++) {
        console.log(`[DEBUG]   ${i+1}. ${data.items[i].link}`);
        console.log(`[DEBUG]      blogger: ${data.items[i].bloggerlink}`);
      }
    }
    
    // 검색 결과에서 해당 글 찾기
    let isIndexed = false;
    
    for (const item of data.items) {
      const itemPostNumber = extractPostNumber(item.link);
      const itemBlogLink = item.bloggerlink || '';
      
      // 같은 블로그인지 확인
      const isSameBlog = itemBlogLink.includes(blogId) || item.link.includes(blogId);
      
      if (!isSameBlog) {
        continue;
      }
      
      // 포스트 번호로 비교
      if (postNumber && itemPostNumber && postNumber === itemPostNumber) {
        console.log(`[DEBUG] ✓ MATCH FOUND!`);
        console.log(`[DEBUG]   RSS: ${post.link} (${postNumber})`);
        console.log(`[DEBUG]   API: ${item.link} (${itemPostNumber})`);
        isIndexed = true;
        break;
      }
    }
    
    console.log(`[DEBUG] Result: ${isIndexed ? '✓ 검색노출' : '✗ 누락'}`);
    console.log(`[DEBUG] ========================================`);
    
    return isIndexed;
    
  } catch (error) {
    console.error(`[DEBUG] Error: ${error.message}`);
    return false;
  }
}

// 최근 글들의 인덱싱 상태 확인
async function checkRecentPostsIndexing(recentPosts, blogId, clientId, clientSecret) {
  const results = [];
  
  for (const post of recentPosts) {
    const isIndexed = await checkPostIndexingByTitle(post, blogId, clientId, clientSecret);
    
    results.push({
      ...post,
      isIndexed: isIndexed
    });
    
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const indexedCount = results.filter(r => r.isIndexed).length;
  console.log(`[DEBUG] ========================================`);
  console.log(`[DEBUG] FINAL RESULT: ${indexedCount}/${results.length} posts indexed`);
  console.log(`[DEBUG] ========================================`);
  
  return results;
}

// 블로그 이름 가져오기
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
