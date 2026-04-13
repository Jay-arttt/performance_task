// ─────────────────────────────────────────
//  config.js  —  Sheets 연동 설정
//  배포 전 아래 값을 채워주세요
// ─────────────────────────────────────────

const CONFIG = {
  // Google Sheets API Key (읽기 전용, 공개 시트용)
  // Google Cloud Console → API & Services → Credentials에서 발급
  API_KEY: 'AIzaSyCW8VT0yfP3ZZbk66kj9hDE6jUAdE31HvU',

  // Spreadsheet ID (Sheets URL에서 /d/ 뒤 문자열)
  // 예: https://docs.google.com/spreadsheets/d/[이부분]/edit
  SPREADSHEET_ID: '1DL-qfAUbym0biC2Xm6zaXrN1A1B9XzW1SFUhxuIDcLo',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwj_PYQYBSQHuDDNMy1CLmZf4L_fS7ys485vldX8T8nshTHNUC3g0JNUViZFPpQWsf1bg/exec',

  // 시트 이름 (Sheets 하단 탭 이름과 정확히 일치해야 함)
  SHEETS: {
    MEMBER:   '팀원마스터',
    CAMPAIGN: '캠페인업무',
    COMMON:   '공통업무',
    REPORT:   '리포트미팅',
    BRAND:    '브랜드마스터',
  },

  // 자동 새로고침 주기 (밀리초, 0 = 비활성)
  REFRESH_INTERVAL: 60000, // 1분
};

// 오프라인 / 설정 전 fallback 여부
// true = 샘플 데이터로 동작, false = Sheets 필수
const USE_SAMPLE_DATA = CONFIG.API_KEY === 'YOUR_GOOGLE_API_KEY';
