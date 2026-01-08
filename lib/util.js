/**
 * 유틸리티 함수 모음
 */

// 블로그 URL에서 ID 추출
export function extractBlogId(url) {
  const patterns = [
    /blog\.naver\.com\/([^\/\?]+)/,
    /\/([^\/\?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return url.trim();
}

// 카테고리 추론 함수
export function inferCategory(items) {
  const keywords = {
    "맛집": ["맛집", "음식", "먹방", "레스토랑", "카페"],
    "여행": ["여행", "관광", "투어", "호텔"],
    "IT/기술": ["개발", "프로그래밍", "코딩", "IT", "기술"],
    "패션": ["패션", "옷", "스타일", "코디"],
    "뷰티": ["뷰티", "화장품", "메이크업", "스킨케어"],
    "육아": ["육아", "아기", "출산", "유아"],
    "요리": ["요리", "레시피", "조리법"],
    "운동": ["운동", "헬스", "피트니스", "다이어트"],
  };

  const allText = items
    .slice(0, 10)
    .map(item => item.title + ' ' + item.description)
    .join(' ')
    .toLowerCase();

  for (const [category, words] of Object.entries(keywords)) {
    if (words.some(word => allText.includes(word))) {
      return category;
    }
  }

  return "라이프스타일";
}
