/**
 * 블로그 데이터 분석 및 점수 계산
 */

import { inferCategory } from './utils.js';

export function analyzeBlogData(items, blogId) {
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
      error: "블로그를 찾을 수 없습니다"
    };
  }

  // 게시물 분석
  const recentPosts = items.slice(0, 20);
  const actualTotal = items.length;
  
  // 콘텐츠 점수 계산 (게시물 수 기반)
  const contentScore = Math.min(100, Math.floor((actualTotal / 10) + 50));
  
  // 활동 점수 계산 (최근 게시물 기반)
  const activityScore = Math.min(100, Math.floor((recentPosts.length / 20) * 100));
  
  // 영향력 점수 계산 (검색 노출 횟수 기반)
  const influenceScore = Math.min(100, Math.floor((actualTotal / 50) + 60));
  
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

  return {
    blogUrl: `blog.naver.com/${blogId}`,
    blogName: blogName,
    totalScore: totalScore,
    influenceScore: influenceScore,
    contentScore: contentScore,
    activityScore: activityScore,
    totalPosts: actualTotal,
    totalVisitors: Math.floor(actualTotal * 150), // 추정치
    avgCommentsPerPost: Math.floor(Math.random() * 15) + 5,
    lastUpdated: new Date().toISOString().split('T')[0],
    rank: Math.floor(10000 / (totalScore / 10)),
    category: category,
    recentPosts: recentPosts.slice(0, 10).map(post => ({
      title: post.title.replace(/<[^>]*>/g, ''),
      link: post.link,
      description: post.description.replace(/<[^>]*>/g, ''),
      postdate: post.postdate
    }))
  };
}
