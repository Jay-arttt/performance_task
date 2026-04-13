// ─────────────────────────────────────────
//  config.js  —  Sheets 연동 설정
//  배포 전 아래 값을 채워주세요
// ─────────────────────────────────────────

const CONFIG = {
  // Google Sheets API Key (읽기 전용, 공개 시트용)
  // Google Cloud Console → API & Services → Credentials에서 발급
  API_KEY: 'YOUR_GOOGLE_API_KEY',

  // Spreadsheet ID (Sheets URL에서 /d/ 뒤 문자열)
  // 예: https://docs.google.com/spreadsheets/d/[이부분]/edit
  SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',

  // 시트 이름 (Sheets 하단 탭 이름과 정확히 일치해야 함)
  SHEETS: {
    MEMBER:    '팀원마스터',
    CAMPAIGN:  '캠페인업무',
    COMMON:    '공통업무',
    REPORT:    '리포트미팅',
    BRAND:     '브랜드마스터',
    RESOURCES: '자료실',
  },

  // 자동 새로고침 주기 (밀리초, 0 = 비활성)
  REFRESH_INTERVAL: 60000, // 1분
};

// 오프라인 / 설정 전 fallback 여부
// Sheets 연동 완료 후 sample-data.js 불필요
