// 📈 성장 지수 (0-100) - 가중치 10%
function calculateGrowthScore(data) {
  const {
    recentPosts,
    viewTrend,
    postTrend,
  } = data;
  
  // 조회수 트렌드 (50점)
  const trendScore = Math.min(50, viewTrend * 50 + 25);
  
  // 포스팅 증가 추세 (50점)
  const postTrendScore = Math.min(50, postTrend * 50 + 25);
  
  const totalGrowth = Math.min(100, trendScore + postTrendScore);
  
  console.log(`📈 성장 지수: ${totalGrowth.toFixed(1)}점`);
  console.log(`   - 조회수 트렌드: ${trendScore.toFixed(1)}점`);
  console.log(`   - 포스팅 증가세: ${postTrendScore.toFixed(1)}점`);
  
  return Math.round(totalGrowth);
}

module.exports = { calculateGrowthScore };
