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
    
    // 검색 API로 대체 시도
    console.log(`⚠️ PostList에서 게시물 수를 찾지 못함, 검색 API 시도...`);
    const { searchNaverBlog } = require('./naverApi');
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
