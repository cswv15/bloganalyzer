// 💬 소셜 지수 (0-100) - 가중치 15%
function calculateSocialScore(data) {
  const {
    avgComments,
    avgLikes,
    avgViews,
    engagementRate,
  } = data;
  
  // 평균 댓글 수 (30점)
  let commentScore = 0;
  if (avgComments >= 50) commentScore = 30;
  else if (avgComments >= 30) commentScore = 25;
  else if (avgComments >= 20) commentScore = 20;
  else if (avgComments >= 10) commentScore = 15;
  else if (avgComments >= 5) commentScore = 10;
  else commentScore = (avgComments / 5) * 10;
  
  // 평균 공감 수 (30점)
  let likeScore = 0;
  if (avgLikes >= 100) likeScore = 30;
  else if (avgLikes >= 50) likeScore = 25;
  else if (avgLikes >= 30) likeScore = 20;
  else if (avgLikes >= 15) likeScore = 15;
  else if (avgLikes >= 5) likeScore = 10;
  else likeScore = (avgLikes / 5) * 10;
  
  // 평균 조회수 (25점)
  let viewScore = 0;
  if (avgViews >= 10000) viewScore = 25;
  else if (avgViews >= 5000) viewScore = 20;
  else if (avgViews >= 2000) viewScore = 15;
  else if (avgViews >= 1000) viewScore = 10;
  else if (avgViews >= 500) viewScore = 5;
  else viewScore = (avgViews / 500) * 5;
  
  // 참여율 (15점)
  const engagementScore = Math.min(15, engagementRate * 150);
  
  const totalSocial = Math.min(100, commentScore + likeScore + viewScore + engagementScore);
  
  console.log(`💬 소셜 지수: ${totalSocial.toFixed(1)}점`);
  console.log(`   - 평균 댓글: ${commentScore.toFixed(1)}점 (${avgComments.toFixed(1)}개)`);
  console.log(`   - 평균 공감: ${likeScore.toFixed(1)}점 (${avgLikes.toFixed(1)}개)`);
  console.log(`   - 평균 조회수: ${viewScore.toFixed(1)}점 (${avgViews.toFixed(0)}회)`);
  console.log(`   - 참여율: ${engagementScore.toFixed(1)}점 (${(engagementRate * 100).toFixed(2)}%)`);
  
  return Math.round(totalSocial);
}

module.exports = { calculateSocialScore };
