// ─────────────────────────────────────────
//  sheets.js  —  Google Sheets API 연동
// ─────────────────────────────────────────

const SheetsAPI = (() => {
  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

  // 시트 범위 읽기
  async function fetchRange(sheetName) {
    const url = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API 오류: ${res.status}`);
    const json = await res.json();
    return rowsToObjects(json.values || []);
  }

  // 첫 행을 헤더로, 나머지를 객체 배열로 변환
  function rowsToObjects(rows) {
    if (rows.length < 2) return [];
    const [headers, ...data] = rows;
    return data.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const val = row[i] ?? '';
        // 체크박스(TRUE/FALSE 문자열) → boolean
        if (val === 'TRUE') obj[h] = true;
        else if (val === 'FALSE') obj[h] = false;
        // id 등 숫자 → number
        else if (h === 'id' && val !== '') obj[h] = Number(val);
        else obj[h] = val;
      });
      return obj;
    });
  }

  // 전체 데이터 로드
  async function loadAll() {
    const [campaign, common, report, brands, members] = await Promise.all([
      fetchRange(CONFIG.SHEETS.CAMPAIGN),
      fetchRange(CONFIG.SHEETS.COMMON),
      fetchRange(CONFIG.SHEETS.REPORT),
      fetchRange(CONFIG.SHEETS.BRAND),
      fetchRange(CONFIG.SHEETS.MEMBER),
    ]);
    return { campaign, common, report, brands, members };
  }

  // step 업데이트 (드래그 앤 드롭 시 호출)
  // 쓰기는 OAuth가 필요해서 GitHub Actions 방식으로 대체 가능
  // 여기서는 로컬 상태만 업데이트하고 Sheets는 팀원이 직접 수정하는 구조
  function updateLocalStep(tasks, taskId, newStep) {
    const t = tasks.find(x => x.id === taskId);
    if (t) t.step = newStep;
    return tasks;
  }

  function updateLocalDone(tasks, taskId, done) {
    const t = tasks.find(x => x.id === taskId);
    if (t) t.done = done;
    return tasks;
  }

  return { loadAll, updateLocalStep, updateLocalDone };
})();

// ─────────────────────────────────────────
//  데이터 초기화 — Sheets 또는 샘플
// ─────────────────────────────────────────
let DB = { campaign: [], common: [], report: [], brands: [] };

async function initData() {
  if (USE_SAMPLE_DATA) {
    DB = { ...SAMPLE };
    console.info('[Dashboard] 샘플 데이터로 실행 중. config.js에 API Key를 설정하세요.');
    return;
  }
  try {
    DB = await SheetsAPI.loadAll();
    console.info('[Dashboard] Sheets 데이터 로드 완료');
  } catch (e) {
    console.warn('[Dashboard] Sheets 로드 실패, 샘플 데이터로 대체:', e.message);
    DB = { ...SAMPLE };
  }
}

// 자동 새로고침
function startAutoRefresh() {
  if (!CONFIG.REFRESH_INTERVAL || USE_SAMPLE_DATA) return;
  setInterval(async () => {
    try {
      DB = await SheetsAPI.loadAll();
      renderCurrentView();
      showToast('데이터 갱신됨');
    } catch (e) { /* silent */ }
  }, CONFIG.REFRESH_INTERVAL);
}
