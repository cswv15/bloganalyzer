// 📊 영향력 지수 (0-100) - 가중치 30%
function calculateInfluenceScore(data) {
  const { 
    indexedPosts,
    avgSearchRank,
    topRankCount,
    totalPosts,
  } = data;
  
  // 검색 노출률 (40점)
  const indexingRate = indexedPosts.length > 0 
    ? (indexedPosts.filter(p => p.isIndexed).length / indexedPosts.length) * 100 
    : 0;
  const indexingScore = (indexingRate / 100) * 40;
  
  // 평균 검색 순위 (30점)
  let rankScore = 0;
  if (avgSearchRank > 0 && avgSearchRank <= 100) {
    if (avgSearchRank <= 10) rankScore = 30;
    else if (avgSearchRank <= 30) rankScore = 20 + ((30 - avgSearchRank) / 20) * 10;
    else if (avgSearchRank <= 50) rankScore = 10 + ((50 - avgSearchRank) / 20) * 10;
    else rankScore = 5 + ((100 - avgSearchRank) / 50) * 5;
  }
  
  // 상위 노출 비율 (20점)
  const topRankRate = indexedPosts.length > 0 
    ? (topRankCount / indexedPosts.length) * 100 
    : 0;
  const topRankScore = (topRankRate / 100) * 20;
  
  // 블로그 권위도 (10점)
  let authorityScore = 0;
  if (totalPosts >= 1000) authorityScore = 10;
  else if (totalPosts >= 500) authorityScore = 8;
  else if (totalPosts >= 200) authorityScore = 6;
  else if (totalPosts >= 100) authorityScore = 4;
  else if (totalPosts >= 50) authorityScore = 2;
  
  const totalInfluence = Math.min(100, indexingScore + rankScore + topRankScore + authorityScore);
  
  console.log(`📊 영향력 지수: ${totalInfluence.toFixed(1)}점`);
  console.log(`   - 검색 노출률: ${indexingScore.toFixed(1)}점 (${indexingRate.toFixed(1)}%)`);
  console.log(`   - 평균 검색 순위: ${rankScore.toFixed(1)}점 (평균 ${avgSearchRank.toFixed(1)}위)`);
  console.log(`   - 상위 노출률: ${topRankScore.toFixed(1)}점 (${topRankRate.toFixed(1)}%)`);
  console.log(`   - 블로그 권위도: ${authorityScore.toFixed(1)}점`);
  
  return Math.round(totalInfluence);
}

module.exports = { calculateInfluenceScore };
