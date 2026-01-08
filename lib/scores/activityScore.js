// 🔥 활동 지수 (0-100) - 가중치 20%
function calculateActivityScore(data) {
  const {
    recentPosts,
    postingFrequency,
    postingRegularity,
    lastPostDays,
  } = data;
  
  // 포스팅 빈도 (30점)
  let frequencyScore = 0;
  if (postingFrequency >= 20) frequencyScore = 30;
  else if (postingFrequency >= 15) frequencyScore = 25;
  else if (postingFrequency >= 10) frequencyScore = 20;
  else if (postingFrequency >= 5) frequencyScore = 15;
  else if (postingFrequency >= 1) frequencyScore = 10;
  else frequencyScore = 0;
  
  // 포스팅 규칙성 (30점)
  const regularityScore = Math.min(30, postingRegularity * 30);
  
  // 최근성 (40점)
  let recencyScore = 0;
  if (lastPostDays <= 1) recencyScore = 40;
  else if (lastPostDays <= 3) recencyScore = 35;
  else if (lastPostDays <= 7) recencyScore = 30;
  else if (lastPostDays <= 14) recencyScore = 20;
  else if (lastPostDays <= 30) recencyScore = 10;
  else if (lastPostDays <= 60) recencyScore = 5;
  else recencyScore = 0;
  
  const totalActivity = Math.min(100, frequencyScore + regularityScore + recencyScore);
  
  console.log(`🔥 활동 지수: ${totalActivity.toFixed(1)}점`);
  console.log(`   - 포스팅 빈도: ${frequencyScore.toFixed(1)}점 (최근 30일 ${postingFrequency}개)`);
  console.log(`   - 포스팅 규칙성: ${regularityScore.toFixed(1)}점`);
  console.log(`   - 최근성: ${recencyScore.toFixed(1)}점 (${lastPostDays}일 전)`);
  
  return Math.round(totalActivity);
}

module.exports = { calculateActivityScore };
