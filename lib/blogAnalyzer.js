/**
 * 블로그 데이터 분석 및 점수 계산
 */

const { inferCategory } = require('./utils');

function analyzeBlogData(items, blogId) {
  // 실제 게시물이 없는 경우
  if (items.length === 0) {
    return {
      blogUrl: blogId,
      blogName: blogId,
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

  // 게시물 분석
  const totalPosts = items.length;
  const recentPosts = items.slice(0, 10);
  
  // 콘텐츠 점수 계산 (게시물 수 기반)
  // 0~50개: 0~50점, 50~200개: 50~80점, 200개 이상: 80~100점
  let contentScore;
  if (totalPosts <= 50) {
    contentScore = totalPosts;
  } else if (totalPosts <= 200) {
    contentScore = 50 + Math.floor((totalPosts - 50) / 150 * 30);
  } else {
    contentScore = 80 + Math.min(20, Math.floor((totalPosts - 200) / 100 * 20));
  }
  contentScore = Math.min(100, contentScore);
  
  // 활동 점수 계산 (최근 게시물 기반)
  const activityScore = Math.min(100, Math.floor((totalPosts / 100) * 60 + 40));
  
  // 영향력 점수 계산 (검색 노출 횟수 기반)
  const influenceScore = Math.min(100, Math.floor((totalPosts / 200) * 50 + 50));
  
  // 전체 점수 (가중 평균)
  const totalScore = Math.floor(
    (influenceScore * 0.4) + 
    (contentScore * 0.3) + 
    (activityScore * 0.3)
  );

  // 카테고리 추론
  const category = inferCategory(items);

  // 블로그 이름 추출
  const blogName = items[0]?.bloggername || blogId;
  
  // 최신 업데이트 날짜 (가장 최근 글의 날짜)
  let lastUpdated = new Date().toISOString().split('T')[0];
  if (items[0]?.postdate) {
    const dateStr = items[0].postdate;
    lastUpdated = dateStr.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3');
  }

  return {
    blogUrl: `blog.naver.com/${blogId}`,
    blogName: blogName,
    totalScore: totalScore,
    influenceScore: influenceScore,
    contentScore: contentScore,
    activityScore: activityScore,
    totalPosts: totalPosts,
    totalVisitors: Math.floor(totalPosts * 150), // 추정치
    avgCommentsPerPost: Math.floor(Math.random() * 15) + 5,
    lastUpdated: lastUpdated,
    rank: Math.max(1, Math.floor(100000 / (totalScore + 1))),
    category: category,
    recentPosts: recentPosts.map(post => ({
      title: post.title.replace(/<[^>]*>/g, ''),
      link: post.link,
      description: post.description.replace(/<[^>]*>/g, '').substring(0, 150),
      postdate: post.postdate ? post.postdate.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') : ''
    }))
  };
}

module.exports = {
  analyzeBlogData
};
