// 개별 게시물 분석 및 점수 계산

// 📝 개별 게시물 콘텐츠 점수 (0-100)
function analyzePostContent(post) {
  const { contentLength, imageCount, title } = post;
  
  // 글자 수 점수 (40점)
  let lengthScore = 0;
  if (contentLength >= 3000) lengthScore = 40;
  else if (contentLength >= 2000) lengthScore = 32;
  else if (contentLength >= 1000) lengthScore = 24;
  else if (contentLength >= 500) lengthScore = 16;
  else lengthScore = (contentLength / 500) * 16;
  
  // 이미지 수 점수 (35점)
  let imageScore = 0;
  if (imageCount >= 10) imageScore = 35;
  else if (imageCount >= 7) imageScore = 28;
  else if (imageCount >= 5) imageScore = 21;
  else if (imageCount >= 3) imageScore = 14;
  else imageScore = (imageCount / 3) * 14;
  
  // 제목 품질 점수 (25점)
  const titleLength = title.length;
  let titleScore = 0;
  if (titleLength >= 30 && titleLength <= 60) titleScore = 25;
  else if (titleLength >= 20 && titleLength < 30) titleScore = 20;
  else if (titleLength >= 15 && titleLength < 20) titleScore = 15;
  else if (titleLength < 15) titleScore = 10;
  else titleScore = 12; // 너무 김
  
  const totalScore = Math.round(lengthScore + imageScore + titleScore);
  
  return {
    score: totalScore,
    lengthScore: Math.round(lengthScore),
    imageScore: Math.round(imageScore),
    titleScore: Math.round(titleScore),
  };
}

// 💬 개별 게시물 소셜 점수 (0-100)
function analyzePostSocial(post) {
  const { viewCount, commentCount, likeCount } = post;
  
  // 조회수 점수 (40점)
  let viewScore = 0;
  if (viewCount >= 10000) viewScore = 40;
  else if (viewCount >= 5000) viewScore = 32;
  else if (viewCount >= 2000) viewScore = 24;
  else if (viewCount >= 1000) viewScore = 16;
  else if (viewCount >= 500) viewScore = 8;
  else viewScore = (viewCount / 500) * 8;
  
  // 댓글 수 점수 (30점)
  let commentScore = 0;
  if (commentCount >= 50) commentScore = 30;
  else if (commentCount >= 30) commentScore = 24;
  else if (commentCount >= 20) commentScore = 18;
  else if (commentCount >= 10) commentScore = 12;
  else if (commentCount >= 5) commentScore = 6;
  else commentScore = (commentCount / 5) * 6;
  
  // 공감 수 점수 (30점)
  let likeScore = 0;
  if (likeCount >= 100) likeScore = 30;
  else if (likeCount >= 50) likeScore = 24;
  else if (likeCount >= 30) likeScore = 18;
  else if (likeCount >= 15) likeScore = 12;
  else if (likeCount >= 5) likeScore = 6;
  else likeScore = (likeCount / 5) * 6;
  
  const totalScore = Math.round(viewScore + commentScore + likeScore);
  
  return {
    score: totalScore,
    viewScore: Math.round(viewScore),
    commentScore: Math.round(commentScore),
    likeScore: Math.round(likeScore),
  };
}

// 📊 개별 게시물 영향력 점수 (0-100)
function analyzePostInfluence(post) {
  const { isIndexed, searchRank } = post;
  
  // 검색 노출 점수 (50점)
  const indexScore = isIndexed ? 50 : 0;
  
  // 검색 순위 점수 (50점)
  let rankScore = 0;
  if (searchRank > 0 && searchRank <= 100) {
    if (searchRank <= 3) rankScore = 50;
    else if (searchRank <= 10) rankScore = 45;
    else if (searchRank <= 20) rankScore = 35;
    else if (searchRank <= 30) rankScore = 25;
    else if (searchRank <= 50) rankScore = 15;
    else rankScore = 10;
  }
  
  const totalScore = Math.round(indexScore + rankScore);
  
  return {
    score: totalScore,
    indexScore,
    rankScore: Math.round(rankScore),
  };
}

// 🎯 개별 게시물 종합 점수 계산
function analyzeIndividualPost(post) {
  const contentAnalysis = analyzePostContent(post);
  const socialAnalysis = analyzePostSocial(post);
  const influenceAnalysis = analyzePostInfluence(post);
  
  // 가중치: 영향력 40%, 콘텐츠 35%, 소셜 25%
  const totalScore = Math.round(
    influenceAnalysis.score * 0.40 +
    contentAnalysis.score * 0.35 +
    socialAnalysis.score * 0.25
  );
  
  return {
    totalScore,
    influenceScore: influenceAnalysis.score,
    contentScore: contentAnalysis.score,
    socialScore: socialAnalysis.score,
    details: {
      influence: influenceAnalysis,
      content: contentAnalysis,
      social: socialAnalysis,
    },
  };
}

// 💡 개선 제안 생성
function generateImprovementSuggestions(post, analysis) {
  const suggestions = [];
  
  // 영향력 개선 제안
  if (!post.isIndexed) {
    suggestions.push({
      category: '영향력',
      priority: 'high',
      issue: '검색 노출 안 됨',
      suggestion: '제목에 검색 키워드를 포함하고, 본문에 관련 키워드를 자연스럽게 5회 이상 사용하세요.',
    });
  } else if (post.searchRank > 30) {
    suggestions.push({
      category: '영향력',
      priority: 'medium',
      issue: `검색 순위 낮음 (${post.searchRank}위)`,
      suggestion: '경쟁이 적은 롱테일 키워드로 제목을 수정하고, 관련 블로그 글과 상호 링크를 연결하세요.',
    });
  }
  
  // 콘텐츠 개선 제안
  if (post.contentLength < 1000) {
    suggestions.push({
      category: '콘텐츠',
      priority: 'high',
      issue: `글자 수 부족 (${post.contentLength}자)`,
      suggestion: '최소 1,500자 이상으로 글을 확장하세요. 구체적인 예시, 단계별 설명, 개인 경험을 추가하면 좋습니다.',
    });
  }
  
  if (post.imageCount < 3) {
    suggestions.push({
      category: '콘텐츠',
      priority: 'medium',
      issue: `이미지 부족 (${post.imageCount}개)`,
      suggestion: '최소 5개 이상의 고품질 이미지를 추가하세요. 스크린샷, 인포그래픽, 도표 등이 효과적입니다.',
    });
  }
  
  const titleLength = post.title.length;
  if (titleLength < 15) {
    suggestions.push({
      category: '콘텐츠',
      priority: 'medium',
      issue: '제목 너무 짧음',
      suggestion: '제목을 30~50자로 확장하고, 주요 키워드와 숫자(예: "5가지 방법")를 포함하세요.',
    });
  } else if (titleLength > 70) {
    suggestions.push({
      category: '콘텐츠',
      priority: 'low',
      issue: '제목 너무 김',
      suggestion: '제목을 60자 이내로 축약하여 검색 결과에서 잘리지 않도록 하세요.',
    });
  }
  
  // 소셜 개선 제안
  if (post.viewCount < 500) {
    suggestions.push({
      category: '소셜',
      priority: 'high',
      issue: `조회수 낮음 (${post.viewCount}회)`,
      suggestion: 'SNS(카카오톡, 페이스북, 커뮤니티)에 공유하고, 네이버 카페/밴드에 홍보하세요.',
    });
  }
  
  if (post.commentCount === 0) {
    suggestions.push({
      category: '소셜',
      priority: 'medium',
      issue: '댓글 없음',
      suggestion: '글 마지막에 "여러분의 경험은 어떤가요?"와 같은 질문을 추가하여 댓글을 유도하세요.',
    });
  }
  
  if (post.likeCount < 5) {
    suggestions.push({
      category: '소셜',
      priority: 'low',
      issue: `공감 수 낮음 (${post.likeCount}개)`,
      suggestion: '글 중간과 마지막에 "도움이 되었다면 공감 부탁드려요!"와 같은 멘트를 추가하세요.',
    });
  }
  
  // 참여율 분석
  if (post.viewCount > 0) {
    const engagementRate = ((post.commentCount + post.likeCount) / post.viewCount) * 100;
    if (engagementRate < 1) {
      suggestions.push({
        category: '소셜',
        priority: 'medium',
        issue: `참여율 낮음 (${engagementRate.toFixed(2)}%)`,
        suggestion: '독자와의 소통을 강화하세요. 댓글에 빠르게 답변하고, 이웃 블로그에 방문하세요.',
      });
    }
  }
  
  // 우선순위 정렬
  const priorityOrder = { high: 1, medium: 2, low: 3 };
  suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  return suggestions.slice(0, 5); // 최대 5개 제안
}

module.exports = {
  analyzeIndividualPost,
  generateImprovementSuggestions,
};
