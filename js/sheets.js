// ─────────────────────────────────────────
//  sheets.js  —  Google Sheets API 연동
// ─────────────────────────────────────────

const SheetsAPI = (() => {
  const BASE        = 'https://sheets.googleapis.com/v4/spreadsheets';
  const CACHE_KEY   = 'dashboard_cache';
  const CACHE_TTL   = 5 * 60 * 1000; // 5분

  // ── 캐시 읽기 ────────────────────────────
  function getCache() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data;
    } catch { return null; }
  }

  function setCache(data) {
    try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
  }

  function clearCache() {
    try { sessionStorage.removeItem(CACHE_KEY); } catch {}
  }

  // ── 단일 시트 읽기 ────────────────────────
  async function fetchRange(sheetName) {
    const url = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(sheetName)}?key=${CONFIG.API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Sheets API 오류 (${sheetName}): ${res.status}`);
    const json = await res.json();
    return rowsToObjects(json.values || []);
  }

  // ── 배치 API — 한 번의 요청으로 모든 시트 읽기 ──
  async function fetchAllBatch(sheetNames) {
    const ranges = sheetNames.map(s => `ranges=${encodeURIComponent(s)}`).join('&');
    const url    = `${BASE}/${CONFIG.SPREADSHEET_ID}/values:batchGet?${ranges}&key=${CONFIG.API_KEY}`;
    const res    = await fetch(url);
    if (!res.ok) throw new Error(`Sheets 배치 API 오류: ${res.status}`);
    const json = await res.json();
    return (json.valueRanges || []).map(vr => rowsToObjects(vr.values || []));
  }

  // ── 행 → 객체 변환 ────────────────────────
  function rowsToObjects(rows) {
    if (rows.length < 2) return [];
    const [headers, ...data] = rows;
    return data.map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        const val = row[i] ?? '';
        if      (val === 'TRUE')                         obj[h] = true;
        else if (val === 'FALSE')                        obj[h] = false;
        // id는 숫자면 숫자로, 문자열이면 문자열로 (브랜드마스터는 문자열 id)
        else if (h === 'id' && val !== '') {
          const n = Number(val);
          obj[h] = isNaN(n) ? String(val) : n;
        }
        // brand, assignee 등 텍스트 컬럼은 항상 문자열로
        else if (h === 'brand' || h === 'assignee' ||
                 h === 'media' || h === 'step'    ||
                 h === 'status'|| h === 'category'||
                 h === 'type'  || h === 'repeat'  ||
                 h === 'priority')                       obj[h] = String(val);
        else                                             obj[h] = val;
      });
      return obj;
    });
  }

  // ── 전체 데이터 로드 (배치 + 캐시) ──────────
  async function loadAll(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = getCache();
      if (cached) {
        console.info('[Dashboard] 캐시에서 로드');
        return cached;
      }
    }

    const sheetNames = [
      CONFIG.SHEETS.CAMPAIGN,
      CONFIG.SHEETS.COMMON,
      CONFIG.SHEETS.REPORT,
      CONFIG.SHEETS.BRAND,
      CONFIG.SHEETS.MEMBER,
      CONFIG.SHEETS.RESOURCES || '자료실',
    ];

    const [campaign, common, report, brands, members, resources] = await fetchAllBatch(sheetNames);
    const data = { campaign, common, report, brands, members, resources };
    setCache(data);
    console.info('[Dashboard] Sheets 배치 로드 완료');
    return data;
  }

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

  return { loadAll, clearCache, updateLocalStep, updateLocalDone };
})();

// ─────────────────────────────────────────
//  데이터 초기화
// ─────────────────────────────────────────
let DB = { campaign:[], common:[], report:[], brands:[], members:[], resources:[] };

async function initData() {
  try {
    DB = await SheetsAPI.loadAll();
  } catch (e) {
    console.warn('[Dashboard] Sheets 로드 실패:', e.message);
    DB = { campaign:[], common:[], report:[], brands:[], members:[], resources:[] };
  }
}

// ── 자동 새로고침 ─────────────────────────
function startAutoRefresh() {
  if (!CONFIG.REFRESH_INTERVAL) return;
  setInterval(async () => {
    try {
      DB = await SheetsAPI.loadAll(true);
      renderCurrentView();
    } catch (e) { /* silent */ }
  }, CONFIG.REFRESH_INTERVAL);
}
