/**
 * 네이버 검색 API 관련 함수
 */

// 네이버 블로그 검색 API 호출
async function searchNaverBlog(blogId, clientId, clientSecret) {
  const searchQuery = `blog.naver.com/${blogId}`;
  const apiUrl = `https://openapi.naver.com/v1/search/blog.json?query=${encodeURIComponent(searchQuery)}&display=100`;

  const response = await fetch(apiUrl, {
    headers: {
      'X-Naver-Client-Id': clientId,
      'X-Naver-Client-Secret': clientSecret,
    },
  });

  if (!response.ok) {
    throw new Error(`Naver API error: ${response.status}`);
  }

  return await response.json();
}

// 특정 블로그의 게시물만 필터링
function filterBlogPosts(naverData, blogId) {
  const allItems = naverData.items || [];
  
  return allItems.filter(item => {
    const blogLink = item.bloggerlink || item.link || '';
    return blogLink.includes(`blog.naver.com/${blogId}`);
  });
}

module.exports = {
  searchNaverBlog,
  filterBlogPosts
};
