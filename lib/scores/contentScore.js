// 📝 콘텐츠 지수 (0-100) - 가중치 25%
function calculateContentScore(data) {
  const {
    totalPosts,
    avgContentLength,
    avgImageCount,
    contentQualityScore,
  } = data;
  
  // 게시물 양 (25점)
  let quantityScore = 0;
  if (totalPosts >= 1000) quantityScore = 25;
  else if (totalPosts >= 500) quantityScore = 20;
  else if (totalPosts >= 200) quantityScore = 15;
  else if (totalPosts >= 100) quantityScore = 10;
  else if (totalPosts >= 50) quantityScore = 5;
  else quantityScore = (totalPosts / 50) * 5;
  
  // 평균 글 길이 (25점)
  let lengthScore = 0;
  if (avgContentLength >= 3000) lengthScore = 25;
  else if (avgContentLength >= 2000) lengthScore = 20;
  else if (avgContentLength >= 1000) lengthScore = 15;
  else if (avgContentLength >= 500) lengthScore = 10;
  else lengthScore = (avgContentLength / 500) * 10;
  
  // 멀티미디어 활용도 (25점)
  let mediaScore = 0;
  if (avgImageCount >= 10) mediaScore = 25;
  else if (avgImageCount >= 7) mediaScore = 20;
  else if (avgImageCount >= 5) mediaScore = 15;
  else if (avgImageCount >= 3) mediaScore = 10;
  else mediaScore = (avgImageCount / 3) * 10;
  
  // 콘텐츠 품질 (25점)
  const qualityScore = Math.min(25, contentQualityScore);
  
  const totalContent = Math.min(100, quantityScore + lengthScore + mediaScore + qualityScore);
  
  console.log(`📝 콘텐츠 지수: ${totalContent.toFixed(1)}점`);
  console.log(`   - 게시물 양: ${quantityScore.toFixed(1)}점 (${totalPosts}개)`);
  console.log(`   - 평균 글 길이: ${lengthScore.toFixed(1)}점 (${avgContentLength.toFixed(0)}자)`);
  console.log(`   - 멀티미디어: ${mediaScore.toFixed(1)}점 (평균 ${avgImageCount.toFixed(1)}개)`);
  console.log(`   - 콘텐츠 품질: ${qualityScore.toFixed(1)}점`);
  
  return Math.round(totalContent);
}

module.exports = { calculateContentScore };
