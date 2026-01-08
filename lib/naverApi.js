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
    
    // XML 파싱 (간단한 정규식 사용)
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    
    while ((match = itemRegex.exec(xmlText)) !== null) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
      const descriptionMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      
      if (titleMatch && linkMatch) {
        items.push({
          title: titleMatch[1],
          link: linkMatch[1],
          description: descriptionMatch ? descriptionMatch[1].replace(/<[^>]*>/g, '').substring(0, 200) : '',
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

// 네이버 블로그 검색 API 호출 (보조 데이터)
async function searchNaverBlog(blogId, clientId, clientSecret) {
  const searchQuery = `blog:${blogId}`;
  const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(searchQuery)}&display=30&sort=date`;

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      console.log(`[DEBUG] Search API failed: ${response.status}`);
      return { items: [] };
    }

    const data = await response.json();
    console.log(`[DEBUG] Search API: Found ${data.items?.length || 0} items`);
    
    return data;
  } catch (error) {
    console.error('[DEBUG] Search API error:', error);
    return { items: [] };
  }
}

// 특정 블로그의 게시물만 필터링
function filterBlogPosts(naverData, blogId) {
  const allItems = naverData.items || [];
  
  const patterns = [
    `blog.naver.com/${blogId}`,
    `blog.naver.com/${blogId}/`,
    `//blog.naver.com/${blogId}`,
  ];
  
  const filtered = allItems.filter(item => {
    const blogLink = item.bloggerlink || '';
    const postLink = item.link || '';
    
    return patterns.some(pattern => 
      blogLink.includes(pattern) || postLink.includes(pattern)
    );
  });
  
  return filtered;
}

// 블로그 이름 가져오기
async function getBlogName(blogId, clientId, clientSecret) {
  const searchData = await searchNaverBlog(blogId, clientId, clientSecret);
  const filtered = filterBlogPosts(searchData, blogId);
  
  if (filtered.length > 0 && filtered[0].bloggername) {
    return filtered[0].bloggername;
  }
  
  return blogId;
}

module.exports = {
  fetchBlogRSS,
  searchNaverBlog,
  filterBlogPosts,
  getBlogName
};
