// 링크 정규화
function normalizeUrl(url) {
  return url
    .replace(/&amp;/g, '&')
    .replace(/https?:\/\//, '')
    .replace(/^m\./, '')
    .replace(/\?.*/g, '')
    .toLowerCase()
    .trim();
}

// 등급 계산
function calculateGrade(score) {
  if (score >= 90) return 'S';
  if (score >= 80) return 'A+';
  if (score >= 75) return 'A';
  if (score >= 70) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'D';
}

// 예상 랭킹 계산
function calculateEstimatedRank(score) {
  return Math.floor(Math.pow(10, 6 - (score / 20)));
}

module.exports = {
  normalizeUrl,
  calculateGrade,
  calculateEstimatedRank,
};
