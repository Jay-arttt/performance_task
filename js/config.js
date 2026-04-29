// ─────────────────────────────────────────
//  config.js  —  Sheets 연동 설정
//  배포 전 아래 값을 채워주세요
// ─────────────────────────────────────────

const CONFIG = {
  // Google Sheets API Key (읽기 전용, 공개 시트용)
  API_KEY: 'YOUR_GOOGLE_API_KEY',

  // Spreadsheet ID
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',

  // Apps Script 배포 URL (쓰기용)
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby-o20oLOUFU5dWn7V7TOok-oqxkAwc3zDXJVXIpMayPQeXFa-FUSvK_g3vmZM8LTwRaQ/exec',

  // 시트 이름
  SHEETS: {
    MEMBER:    '팀원마스터',
    CAMPAIGN:  '캠페인업무',
    COMMON:    '공통업무',
    REPORT:    '리포트미팅',
    BRAND:     '브랜드마스터',
    RESOURCES: '자료실',
    NOTICE:    '공지',
  },

  // 자동 새로고침 주기 (밀리초, 0 = 비활성)
  REFRESH_INTERVAL: 60000,
};

// 오프라인 / 설정 전 fallback 여부
// Sheets 연동 완료 후 sample-data.js 불필요
