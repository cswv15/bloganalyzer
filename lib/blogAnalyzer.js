const { getTotalPostCount, getRecentPosts, getPostDetails, checkIndexedStatus } = require('./dataCollector');
const { calculateInfluenceScore } = require('./scores/influenceScore');
const { calculateContentScore } = require('./scores/contentScore');
const { calculateActivityScore } = require('./scores/activityScore');
const { calculateSocialScore } = require('./scores/socialScore');
const { calculateGrowthScore } = require('./scores/growthScore');
const { calculateGrade, calculateEstimatedRank } = require('./utils');

async function analyzeBlog(blogUrl) {
  try {
    console.log(`\n========================================`);
    console.log(`📊 블로그 분석 시작: ${blogUrl}`);
    console.log(`========================================\n`);
    
    const blogId = blogUrl.replace(/https?:\/\/(blog\.naver\.com\/)?/, '').split('/')[0];
    console.log(`🆔 블로그 ID: ${blogId}`);
    
    // 1단계: 기본 데이터 수집
    console.log(`\n[1단계] 기본 데이터 수집 중...\n`);
    const totalPosts = await getTotalPostCount(blogId) || 0;
    const recentPosts = await getRecentPosts(blogId, 30);
    
    // 2단계: 검색 노출 분석
    console.log(`\n[2단계] 검색 노출 분석 중...\n`);
    const indexedPosts = await checkIndexedStatus(recentPosts, blogId);
    
    // 3단계: 상세 데이터 수집
    console.log(`\n[3단계] 게시물 상세 분석 중 (10개)...\n`);
    const detailedPosts = [];
    for (let i = 0; i < Math.min(10, indexedPosts.length); i++) {
      const post = indexedPosts[i];
      console.log(`  [${i + 1}/10] ${post.title.substring(0, 30)}...`);
      const details = await getPostDetails(post.link);
      detailedPosts.push({ ...post, ...details });
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // 4단계: 통계 계산
    console.log(`\n[4단계] 통계 계산 중...\n`);
    
    // 검색 순위 통계
    const rankedPosts = indexedPosts.filter(p => p.isIndexed && p.searchRank > 0);
    const avgSearchRank = rankedPosts.length > 0
      ? rankedPosts.reduce((sum, p) => sum + p.searchRank, 0) / rankedPosts.length
      : -1;
    const topRankCount = rankedPosts.filter(p => p.searchRank <= 10).length;
    
    // 콘텐츠 통계
    const avgContentLength = detailedPosts.length > 0
      ? detailedPosts.reduce((sum, p) => sum + p.contentLength, 0) / detailedPosts.length
      : 0;
    const avgImageCount = detailedPosts.length > 0
      ? detailedPosts.reduce((sum, p) => sum + p.imageCount, 0) / detailedPosts.length
      : 0;
    const avgTitleLength = recentPosts.length > 0
      ? recentPosts.reduce((sum, p) => sum + p.title.length, 0) / recentPosts.length
      : 0;
    const contentQualityScore = Math.min(25, (avgTitleLength / 50) * 25);
    
    // 활동 통계
    const now = new Date();
    const postDates = recentPosts.filter(p => p.pubDate).map(p => new Date(p.pubDate));
    const lastPostDays = postDates.length > 0
      ? Math.floor((now - postDates[0]) / (1000 * 60 * 60 * 24))
      : 999;
    const recent30Days = postDates.filter(d => (now - d) / (1000 * 60 * 60 * 24) <= 30);
    const postingFrequency = recent30Days.length;
    
    let postingRegularity = 0;
    if (postDates.length >= 3) {
      const intervals = [];
      for (let i = 1; i < postDates.length; i++) {
        intervals.push((postDates[i - 1] - postDates[i]) / (1000 * 60 * 60 * 24));
      }
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce((sum, val) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);
      postingRegularity = Math.max(0, 1 - (stdDev / avgInterval));
    }
    
    // 소셜 통계
    const avgComments = detailedPosts.length > 0
      ? detailedPosts.reduce((sum, p) => sum + p.commentCount, 0) / detailedPosts.length
      : 0;
    const avgLikes = detailedPosts.length > 0
      ? detailedPosts.reduce((sum, p) => sum + p.likeCount, 0) / detailedPosts.length
      : 0;
    const avgViews = detailedPosts.length > 0
      ? detailedPosts.reduce((sum, p) => sum + p.viewCount, 0) / detailedPosts.length
      : 0;
    const engagementRate = avgViews > 0 ? (avgComments + avgLikes) / avgViews : 0;
    
    // 성장 트렌드
    const firstHalf = detailedPosts.slice(0, Math.floor(detailedPosts.length / 2));
    const secondHalf = detailedPosts.slice(Math.floor(detailedPosts.length / 2));
    const avgViewsFirst = firstHalf.length > 0
      ? firstHalf.reduce((sum, p) => sum + p.viewCount, 0) / firstHalf.length
      : 0;
    const avgViewsSecond = secondHalf.length > 0
      ? secondHalf.reduce((sum, p) => sum + p.viewCount, 0) / secondHalf.length
      : 0;
    const viewTrend = avgViewsFirst > 0 ? (avgViewsSecond - avgViewsFirst) / avgViewsFirst : 0;
    const postTrend = recent30Days.length >= 15 ? 1 : recent30Days.length / 15;
    
    // 5단계: 5대 지수 계산
    console.log(`\n[5단계] 5대 핵심 지수 계산 중...\n`);
    
    const influenceScore = calculateInfluenceScore({
      indexedPosts,
      avgSearchRank,
      topRankCount,
      totalPosts,
    });
    
    const contentScore = calculateContentScore({
      totalPosts,
      avgContentLength,
      avgImageCount,
      contentQualityScore,
    });
    
    const activityScore = calculateActivityScore({
      recentPosts,
      postingFrequency,
      postingRegularity,
      lastPostDays,
    });
    
    const socialScore = calculateSocialScore({
      avgComments,
      avgLikes,
      avgViews,
      engagementRate,
    });
    
    const growthScore = calculateGrowthScore({
      recentPosts,
      viewTrend,
      postTrend,
    });
    
    // 6단계: 최종 점수 계산
    const totalScore = Math.round(
      influenceScore * 0.30 +
      contentScore * 0.25 +
      activityScore * 0.20 +
      socialScore * 0.15 +
      growthScore * 0.10
    );
    
    const grade = calculateGrade(totalScore);
    const estimatedRank = calculateEstimatedRank(totalScore);
    
    console.log(`\n========================================`);
    console.log(`✅ 분석 완료!`);
    console.log(`========================================`);
    console.log(`🏆 총점: ${totalScore}점 (${grade} 등급)`);
    console.log(`   📊 영향력: ${influenceScore}점 (30%)`);
    console.log(`   📝 콘텐츠: ${contentScore}점 (25%)`);
    console.log(`   🔥 활동: ${activityScore}점 (20%)`);
    console.log(`   💬 소셜: ${socialScore}점 (15%)`);
    console.log(`   📈 성장: ${growthScore}점 (10%)`);
    console.log(`========================================\n`);
    
    return {
      blogUrl,
      blogName: blogId,
      totalScore,
      grade,
      influenceScore,
      contentScore,
      activityScore,
      socialScore,
      growthScore,
      totalPosts,
      totalVisitors: Math.floor(avgViews * totalPosts),
      avgCommentsPerPost: Math.round(avgComments),
      avgLikesPerPost: Math.round(avgLikes),
      avgViewsPerPost: Math.round(avgViews),
      lastUpdated: recentPosts[0]?.postdate || 'N/A',
      rank: estimatedRank,
      category: '일반',
      recentPosts: indexedPosts.slice(0, 10).map(p => ({
        title: p.title,
        link: p.link,
        postdate: p.postdate,
        isIndexed: p.isIndexed,
        searchRank: p.searchRank,
      })),
      statistics: {
        avgSearchRank: avgSearchRank > 0 ? Math.round(avgSearchRank) : null,
        topRankCount,
        indexingRate: Math.round((indexedPosts.filter(p => p.isIndexed).length / indexedPosts.length) * 100),
        postingFrequency,
        lastPostDays,
        avgContentLength: Math.round(avgContentLength),
        avgImageCount: Math.round(avgImageCount * 10) / 10,
        engagementRate: Math.round(engagementRate * 10000) / 100,
      },
    };
    
  } catch (error) {
    console.error('❌ 블로그 분석 중 오류:', error);
    throw error;
  }
}

module.exports = { analyzeBlog };
