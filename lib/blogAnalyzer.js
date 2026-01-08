/**
 * 블로그 데이터 분석 및 점수 계산
 */

const { inferCategory } = require('./utils');

function analyzeBlogData(allItems, recentPostsWithIndexing, blogId, blogName) {
  const totalPosts = allItems.length;
  
  // 실제 게시물이 없는 경우
  if (totalPosts === 0) {
    return {
      blogUrl: `blog.naver.com/${blogId}`,
      blogName: blogName || blogId,
      totalScore: 0,
      influenceScore: 0,
      contentScore: 0,
      activityScore: 0,
      totalPosts: 0,
      totalVisitors: 0,
      avgCommentsPerPost: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
      rank: 999999,
      category: "기타",
      recentPosts: [],
      error: "블로그를 찾을 수 없거나 공개된 글이 없습니다"
    };
  }
  
  console.log(`[DEBUG] analyzeBlogData called with ${recentPostsWithIndexing.length} recent posts`);
  
  // 🔥 디버깅: 전달받은 데이터 확인
  recentPostsWithIndexing.forEach((post, index) => {
    console.log(`[DEBUG] Post ${index+1}: "${post.title}" - isIndexed: ${post.isIndexed}`);
  });
  
  // 누락 통계 (최근 10개 기준)
  const indexedCount = recentPostsWithIndexing.filter(item => item.isIndexed === true).length;
  const notIndexedCount = recentPostsWithIndexing.length - indexedCount;
  const indexingRate = recentPostsWithIndexing.length > 0 
    ? (indexedCount / recentPostsWithIndexing.length * 100).toFixed(1) 
    : 100;
  
  console.log(`[DEBUG] Indexing stats: ${indexedCount} indexed, ${notIndexedCount} not indexed, rate: ${indexingRate}%`);
  
  // 콘텐츠 점수 계산
  let contentScore;
  if (totalPosts <= 50) {
    contentScore = totalPosts;
  } else if (totalPosts <= 200) {
    contentScore = 50 + Math.floor((totalPosts - 50) / 150 * 30);
  } else {
    contentScore = 80 + Math.min(20, Math.floor((totalPosts - 200) / 100 * 20));
  }
  contentScore = Math.min(100, contentScore);
  
  // 활동 점수 계산
  const activityScore = Math.min(100, Math.floor((totalPosts / 100) * 60 + 40));
  
  // 영향력 점수 계산 (최근 글 인덱싱률 반영)
  const baseInfluence = Math.floor((totalPosts / 200) * 50);
  const indexingBonus = Math.floor((parseFloat(indexingRate) / 100) * 50);
  const influenceScore = Math.min(100, baseInfluence + indexingBonus);
  
  // 전체 점수
  const totalScore = Math.floor(
    (influenceScore * 0.4) + 
    (contentScore * 0.3) + 
    (activityScore * 0.3)
  );

  // 카테고리 추론
  const category = inferCategory(allItems);
  
  // 최신 업데이트 날짜
  let lastUpdated = new Date().toISOString().split('T')[0];
  if (allItems[0]?.postdate) {
    const dateStr = allItems[0].postdate;
    lastUpdated = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  }

  // 🔥 recentPosts 매핑 확인
  const mappedRecentPosts = recentPostsWithIndexing.map(post => {
    const mapped = {
      title: post.title,
      link: post.link,
      postdate: post.postdate ? post.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : '',
      isIndexed: post.isIndexed === true  // 명시적으로 true인지 확인
    };
    console.log(`[DEBUG] Mapping post: "${post.title}" -> isIndexed: ${post.isIndexed} -> ${mapped.isIndexed}`);
    return mapped;
  });

  return {
    blogUrl: `blog.naver.com/${blogId}`,
    blogName: blogName || blogId,
    totalScore: totalScore,
    influenceScore: influenceScore,
    contentScore: contentScore,
    activityScore: activityScore,
    totalPosts: totalPosts,
    totalVisitors: Math.floor(totalPosts * 150),
    avgCommentsPerPost: Math.floor(Math.random() * 15) + 5,
    lastUpdated: lastUpdated,
    rank: Math.max(1, Math.floor(100000 / (totalScore + 1))),
    category: category,
    recentPosts: mappedRecentPosts
  };
}

module.exports = {
  analyzeBlogData
};
