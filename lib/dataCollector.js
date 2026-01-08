// 개별 게시물 상세 정보 가져오기
async function getPostDetails(postUrl) {
  try {
    // 네이버 블로그는 iframe 구조라서 모바일 버전으로 접근 시도
    let urlToFetch = postUrl;
    
    // 데스크톱 URL을 모바일 URL로 변환
    if (postUrl.includes('blog.naver.com') && !postUrl.includes('m.blog.naver.com')) {
      urlToFetch = postUrl.replace('blog.naver.com', 'm.blog.naver.com');
      console.log(`📱 모바일 버전으로 시도: ${urlToFetch}`);
    }
    
    const response = await fetch(urlToFetch, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      }
    });
    
    if (!response.ok) {
      console.warn(`⚠️ HTTP ${response.status}, 기본값 반환`);
      return { viewCount: 0, commentCount: 0, likeCount: 0, contentLength: 0, imageCount: 0 };
    }
    
    const html = await response.text();
    console.log(`📄 HTML 길이: ${html.length}자`);
    
    // 조회수 추출 (여러 패턴 시도)
    const viewPatterns = [
      /조회\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /조회수\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /"?viewCnt"?\s*[:=]\s*"?(\d+)"?/i,
      /pcol2.*?(\d{1,3}(?:,\d{3})*)/s,
      /stat_count.*?(\d{1,3}(?:,\d{3})*)/s,
    ];
    
    let viewCount = 0;
    for (const pattern of viewPatterns) {
      const match = html.match(pattern);
      if (match) {
        viewCount = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 조회수 발견 (패턴): ${viewCount}`);
        break;
      }
    }
    
    // 댓글 수 추출
    const commentPatterns = [
      /댓글\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /"?commentCnt"?\s*[:=]\s*"?(\d+)"?/i,
      /"?commentCount"?\s*[:=]\s*"?(\d+)"?/i,
      /comment_count["\s:]*(\d+)/i,
      /cbox_module.*?댓글\s*(\d+)/s,
    ];
    
    let commentCount = 0;
    for (const pattern of commentPatterns) {
      const match = html.match(pattern);
      if (match) {
        commentCount = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 댓글 수 발견: ${commentCount}`);
        break;
      }
    }
    
    // 공감 수 추출
    const likePatterns = [
      /공감\s*[:\s]*(\d{1,3}(?:,\d{3})*)/i,
      /"?sympathyCnt"?\s*[:=]\s*"?(\d+)"?/i,
      /"?sympathyCount"?\s*[:=]\s*"?(\d+)"?/i,
      /sympathy_count["\s:]*(\d+)/i,
      /like_count["\s:]*(\d+)/i,
    ];
    
    let likeCount = 0;
    for (const pattern of likePatterns) {
      const match = html.match(pattern);
      if (match) {
        likeCount = parseInt(match[1].replace(/,/g, ''));
        console.log(`✅ 공감 수 발견: ${likeCount}`);
        break;
      }
    }
    
    // 본문 내용 추출 (여러 패턴 시도)
    let contentLength = 0;
    
    // 패턴 1: 스마트 에디터 3.0
    let contentMatch = html.match(/<div[^>]*class="[^"]*se-main-container[^"]*"[^>]*>(.*?)<\/div>\s*<\/div>\s*<\/div>/s);
    
    // 패턴 2: 스마트 에디터 2.0
    if (!contentMatch) {
      contentMatch = html.match(/<div[^>]*id="postViewArea"[^>]*>(.*?)<\/div>/s);
    }
    
    // 패턴 3: 구 에디터
    if (!contentMatch) {
      contentMatch = html.match(/<div[^>]*class="[^"]*post-view[^"]*"[^>]*>(.*?)<\/div>/s);
    }
    
    // 패턴 4: 모바일 버전
    if (!contentMatch) {
      contentMatch = html.match(/<div[^>]*class="[^"]*post_ct[^"]*"[^>]*>(.*?)<\/div>/s);
    }
    
    // 패턴 5: se_component_wrap (더 넓은 범위)
    if (!contentMatch) {
      contentMatch = html.match(/<div[^>]*class="[^"]*se_component_wrap[^"]*"[^>]*>(.*?)<\/div>/s);
    }
    
    if (contentMatch) {
      const textContent = contentMatch[1]
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
      
      contentLength = textContent.length;
      console.log(`✅ 본문 길이: ${contentLength}자`);
      console.log(`📝 미리보기: ${textContent.substring(0, 100)}...`);
    } else {
      console.warn(`⚠️ 본문 내용을 찾지 못함, HTML 샘플:`);
      console.log(html.substring(0, 500));
    }
    
    // 이미지 개수 추출 (여러 패턴)
    const imageMatches = [
      ...html.matchAll(/<img[^>]*>/gi),
      ...html.matchAll(/<se-image[^>]*>/gi),
      ...html.matchAll(/data-src="[^"]*\.(jpg|jpeg|png|gif|webp)/gi),
    ];
    
    const imageCount = imageMatches.length;
    console.log(`✅ 이미지 개수: ${imageCount}개`);
    
    // 최종 결과 로그
    console.log(`📊 파싱 결과: 조회 ${viewCount}, 댓글 ${commentCount}, 공감 ${likeCount}, 글자 ${contentLength}, 이미지 ${imageCount}`);
    
    return {
      viewCount,
      commentCount,
      likeCount,
      contentLength,
      imageCount,
    };
  } catch (error) {
    console.error('❌ 게시물 상세 조회 실패:', error.message);
    return {
      viewCount: 0,
      commentCount: 0,
      likeCount: 0,
      contentLength: 0,
      imageCount: 0,
    };
  }
}
