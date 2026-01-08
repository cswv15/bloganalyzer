/**
 * 네이버 검색 API 관련 함수
 */

// 네이버 블로그 검색 API 호출 (여러 페이지 가져오기)
async function searchNaverBlog(blogId, clientId, clientSecret) {
  const allItems = [];
  
  // 최대 3페이지 검색 (100개씩 총 300개)
  for (let page = 0; page < 3; page++) {
    const start = page * 100 + 1;
    
    // 검색 쿼리: 블로그 아이디로 검색하고 날짜순 정렬
    const searchQuery = blogId;
    const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(searchQuery)}&display=100&start=${start}&sort=date`;

    try {
      const response = await fetch(apiUrl, {
        headers: {
          'X-Naver-Client-Id': clientId,
          'X-Naver-Client-Secret': clientSecret,
        },
      });

      if (!response.ok) {
        throw new Error(`Naver API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log(`[DEBUG] Page ${page + 1}: Found ${data.items?.length || 0} items`);
      
      if (data.items && data.items.length > 0) {
        allItems.push(...data.items);
      }
      
      // 더 이상 결과가 없으면 중단
      if (!data.items || data.items.length < 100) {
        break;
      }
    } catch (error) {
      console.error(`Error fetching page ${page + 1}:`, error);
      break;
    }
  }

  console.log(`[DEBUG] Total items from API: ${allItems.length}`);
  return { items: allItems };
}

// 특정 블로그의 게시물만 필터링 (더 강화된 필터링)
function filterBlogPosts(naverData, blogId) {
  const allItems = naverData.items || [];
  
  console.log(`[DEBUG] Filtering ${allItems.length} items for blogId: ${blogId}`);
  
  // 정확한 블로그 URL 패턴들
  const patterns = [
    `blog.naver.com/${blogId}`,
    `blog.naver.com/${blogId}/`,
    `//blog.naver.com/${blogId}`,
  ];
  
  const filtered = allItems.filter(item => {
    const blogLink = item.bloggerlink || '';
    const postLink = item.link || '';
    
    // bloggerlink 또는 link에 정확한 블로그 주소가 있는지 확인
    const matches = patterns.some(pattern => 
      blogLink.includes(pattern) || postLink.includes(pattern)
    );
    
    if (!matches && allItems.indexOf(item) < 5) {
      // 처음 5개 아이템의 링크를 로그로 출력
      console.log(`[DEBUG] Filtered out - bloggerlink: ${blogLink}, link: ${postLink}`);
    }
    
    return matches;
  });
  
  console.log(`[DEBUG] After filtering: ${filtered.length} items`);
  
  // 날짜순으로 정렬 (최신순)
  filtered.sort((a, b) => {
    const dateA = a.postdate ? new Date(a.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : new Date(0);
    const dateB = b.postdate ? new Date(b.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')) : new Date(0);
    return dateB - dateA;
  });
  
  return filtered;
}

module.exports = {
  searchNaverBlog,
  filterBlogPosts
};
