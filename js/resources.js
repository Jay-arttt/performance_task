// ─────────────────────────────────────────
//  resources.js  —  자료실 탭 (테이블 뷰)
// ─────────────────────────────────────────
//
//  Sheets "자료실" 시트 컬럼:
//  id | category | title | url | description | updatedAt | pinned
//
//  카테고리 — 자료실 시트의 category 값에서 자동 추출
//  pinned   — 체크박스 TRUE/FALSE, 핀 고정 시 최상단 표시
// ─────────────────────────────────────────

const CAT_COLOR_POOL = [
  {bg:'#F1EFE8',c:'#5F5E5A'},
  {bg:'#E6F1FB',c:'#0C447C'},
  {bg:'#EEEDFE',c:'#3C3489'},
  {bg:'#EAF3DE',c:'#27500A'},
  {bg:'#FCEBEB',c:'#791F1F'},
  {bg:'#FAEEDA',c:'#633806'},
  {bg:'#E1F5EE',c:'#085041'},
  {bg:'#FBEAF0',c:'#72243E'},
];

let _catColorCache = {};
function catStyle(cat) {
  if (_catColorCache[cat]) return _catColorCache[cat];
  const all  = getUniqueCats(getResources());
  const idx  = all.indexOf(cat);
  const style = CAT_COLOR_POOL[idx % CAT_COLOR_POOL.length] || CAT_COLOR_POOL[0];
  _catColorCache[cat] = style;
  return style;
}
function getUniqueCats(resources) {
  const seen = new Set();
  resources.forEach(r => { if (r.category) seen.add(r.category); });
  return [...seen];
}

const SAMPLE_RESOURCES = [
  { id:1, category:'공지',      title:'5월 캠페인 일정 공지',      url:'',  description:'5월 전체 킥오프 일정 및 주의사항',   updatedAt:'2026-04-13', pinned:true  },
  { id:2, category:'계정정보',  title:'Meta 광고 계정 정보',        url:'#', description:'브랜드별 Meta 계정 ID',             updatedAt:'2026-04-10', pinned:false },
  { id:3, category:'계정정보',  title:'네이버 광고 계정 정보',      url:'#', description:'네이버 SA·쇼핑 계정 목록',          updatedAt:'2026-04-10', pinned:false },
  { id:4, category:'소재가이드',title:'소재 제작 가이드 (공통)',    url:'#', description:'매체별 소재 규격 및 가이드라인',     updatedAt:'2026-04-05', pinned:false },
  { id:5, category:'소재가이드',title:'스케쳐스 브랜드 가이드',    url:'#', description:'스케쳐스 CI/BI 및 소재 제작 규칙',  updatedAt:'2026-03-28', pinned:false },
  { id:6, category:'광고',      title:'브랜드별 월간 예산 시트',   url:'#', description:'전 브랜드 광고비 예산 현황',        updatedAt:'2026-04-12', pinned:false },
  { id:7, category:'광고',      title:'광고비 충전 가이드',         url:'#', description:'매체별 충전 방법 및 담당자',        updatedAt:'2026-03-15', pinned:false },
  { id:8, category:'공통',      title:'온보딩 가이드',              url:'#', description:'신규 팀원 업무 온보딩 자료',        updatedAt:'2026-03-01', pinned:false },
];

let resCatFilter = '';
let resSearch    = '';
let resSortKey   = 'updatedAt';
let resSortAsc   = false;

function getResources() {
  return (DB.resources && DB.resources.length) ? DB.resources : SAMPLE_RESOURCES;
}

// ──────────────────────────────────────────
//  메인 렌더
// ──────────────────────────────────────────
function renderResources() {
  document.getElementById('brandTabsWrap').innerHTML    = '';
  document.getElementById('flowControlsWrap').innerHTML = '';
  document.getElementById('memberFilterWrap').innerHTML = '';
  document.getElementById('metricsWrap').innerHTML      = '';

  _catColorCache = {};
  const cats = getUniqueCats(getResources());

  const panel = document.getElementById('panel-resources');
  panel.innerHTML = `
    <div class="res-toolbar" id="resToolbar">
      <select class="ctrl-select" id="resCatSel">
        <option value="">카테고리 전체</option>
        ${getUniqueCats(getResources()).map(c => `<option value="${c}" ${resCatFilter===c?'selected':''}>${c}</option>`).join('')}
      </select>
      <input class="res-search" id="resSearch" placeholder="제목 검색..." value="${resSearch}">
      <span class="res-count" id="resCount"></span>
      <button class="modal-btn-save" onclick="openResourceModal()" style="font-size:12px;padding:6px 14px;flex-shrink:0;">+ 자료 추가</button>
    </div>
    <div class="tbl-wrap">
      <table class="res-table">
        <thead>
          <tr>
            <th style="width:28px;"></th>
            <th class="res-th-sort" data-key="category">카테고리</th>
            <th class="res-th-sort" data-key="title">제목 <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;">클릭하면 수정</span></th>
            <th>설명</th>
            <th>링크</th>
            <th class="res-th-sort" data-key="updatedAt">업데이트</th>
          </tr>
        </thead>
        <tbody id="resTbody"></tbody>
      </table>
    </div>
    <div style="margin-top:10px;font-size:11px;color:var(--color-text-tertiary);">
      카테고리 추가 · 변경은 Google Sheets "자료실" 시트의 category 컬럼에서 직접 하시면 대시보드에 자동 반영돼요.
    </div>`;

  document.getElementById('resCatSel').addEventListener('change', e => { resCatFilter = e.target.value; renderResTable(); });
  document.getElementById('resSearch').addEventListener('input',  e => { resSearch = e.target.value; renderResTable(); });
  document.querySelectorAll('.res-th-sort').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (resSortKey === key) resSortAsc = !resSortAsc;
      else { resSortKey = key; resSortAsc = true; }
      renderResTable();
    });
  });

  renderResTable();
}

function renderResTable() {
  const resources = getResources();

  const filtered = resources.filter(r => {
    const matchCat    = !resCatFilter || r.category === resCatFilter;
    const matchSearch = !resSearch    ||
      r.title.toLowerCase().includes(resSearch.toLowerCase()) ||
      (r.description||'').toLowerCase().includes(resSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  // 핀 고정 항목 최상단, 나머지 정렬
  const pinned   = filtered.filter(r => r.pinned === true || r.pinned === 'TRUE');
  const unpinned = filtered.filter(r => !r.pinned || r.pinned === 'FALSE');
  const sortedUnpinned = [...unpinned].sort((a, b) => {
    const va = String(a[resSortKey] || '');
    const vb = String(b[resSortKey] || '');
    return (va < vb ? -1 : va > vb ? 1 : 0) * (resSortAsc ? 1 : -1);
  });
  const sorted = [...pinned, ...sortedUnpinned];

  // 정렬 화살표
  document.querySelectorAll('.res-th-sort').forEach(th => {
    const key   = th.dataset.key;
    const label = { category:'카테고리', title:'제목', updatedAt:'업데이트' }[key] || key;
    const arrow = resSortKey === key ? (resSortAsc ? ' ↑' : ' ↓') : '';
    th.textContent = label + arrow;
    th.dataset.key = key;
  });

  document.getElementById('resCount').textContent = `${sorted.length}건`;

  const tbody = document.getElementById('resTbody');
  if (!sorted.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="padding:2rem;text-align:center;color:var(--color-text-tertiary);font-size:12px;">자료가 없어요</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  sorted.forEach(r => {
    const cs       = catStyle(r.category);
    const isPinned = r.pinned === true || r.pinned === 'TRUE';
    const tr       = document.createElement('tr');
    tr.className   = isPinned ? 'res-pinned-row' : '';

    tr.innerHTML = `
      <td style="width:28px;text-align:center;">
        <button class="res-pin-btn ${isPinned ? 'pinned' : ''}" data-id="${r.id}" title="${isPinned ? '핀 해제' : '핀 고정'}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
          </svg>
        </button>
      </td>
      <td><span class="res-cat-badge" style="background:${cs.bg};color:${cs.c};">${r.category}</span></td>
      <td>
        <span class="res-title-link" data-id="${r.id}" title="클릭하면 수정">
          ${isPinned ? '<span class="res-pin-indicator">📌</span>' : ''}${r.title}
        </span>
      </td>
      <td class="res-desc-cell">${r.description || ''}</td>
      <td>${r.url
        ? `<a class="res-open-btn" href="${r.url}" target="_blank" rel="noopener">
             <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>열기
           </a>`
        : `<span style="font-size:10px;color:var(--color-text-tertiary);">링크없음</span>`}
      </td>
      <td style="font-size:11px;color:var(--color-text-tertiary);white-space:nowrap;">${r.updatedAt || ''}</td>`;

    // 핀 버튼
    tr.querySelector('.res-pin-btn').addEventListener('click', async e => {
      e.stopPropagation();
      const resources = getResources();
      const target    = resources.find(x => String(x.id) === String(r.id));
      if (!target) return;
      const newPinned = !(target.pinned === true || target.pinned === 'TRUE');
      target.pinned = newPinned;
      try {
        if (CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL') {
          callAppsScript({ action:'update', sheetName:'resources', id:target.id, row:{ pinned: newPinned ? 'TRUE' : 'FALSE' } });
        }
      } catch (_) {}
      showToast(newPinned ? `"${target.title}" 핀 고정됐어요` : `"${target.title}" 핀 해제됐어요`);
      renderResTable();
    });

    // 제목 클릭 → 수정 모달
    tr.querySelector('.res-title-link').addEventListener('click', () => {
      const res = getResources().find(x => String(x.id) === String(r.id));
      if (res) openResourceModal(res);
    });

    tbody.appendChild(tr);
  });
}

// ── 자료 추가 · 수정 모달 ─────────────────
function openResourceModal(resource = null) {
  const existing = document.getElementById('taskModal');
  if (existing) existing.remove();

  const isEdit = !!resource;
  const v = (key, fallback = '') => resource ? (resource[key] ?? fallback) : fallback;
  const cats = getUniqueCats(getResources());

  const catOpts = cats.map(c =>
    `<option value="${c}" ${v('category') === c ? 'selected' : ''}>${c}</option>`
  ).join('');

  const isPinned = v('pinned') === true || v('pinned') === 'TRUE';

  const overlay = document.createElement('div');
  overlay.id        = 'taskModal';
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  overlay.innerHTML = `<div class="modal-box">
    <div class="modal-header">
      <span class="modal-title">${isEdit ? '자료 수정' : '자료 추가'}</span>
      <button class="modal-close">✕</button>
    </div>
    <form id="resourceForm" autocomplete="off" style="display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0;">
      <div class="modal-body">
        <div class="field-group">
          <label class="field-label">카테고리<span class="field-required">*</span></label>
          <select class="field-input" name="category" required>
            ${catOpts}
            <option value="__new__">+ 새 카테고리 직접 입력</option>
          </select>
        </div>
        <div class="field-group" id="newCatGroup" style="display:none;">
          <label class="field-label">새 카테고리 이름</label>
          <input class="field-input" type="text" id="newCatInput" placeholder="카테고리명 입력">
        </div>
        <div class="field-group">
          <label class="field-label">제목<span class="field-required">*</span></label>
          <input class="field-input" type="text" name="title" value="${v('title')}" required placeholder="자료명 입력">
        </div>
        <div class="field-group">
          <label class="field-label">링크 (Drive URL)</label>
          <input class="field-input" type="text" name="url" value="${v('url')}" placeholder="https://drive.google.com/...">
        </div>
        <div class="field-group">
          <label class="field-label">설명</label>
          <textarea class="field-input field-textarea" name="description" rows="2" placeholder="간단한 설명">${v('description')}</textarea>
        </div>
        <div class="field-group field-check-group">
          <label class="field-check-label">
            <input type="checkbox" name="pinned" ${isPinned ? 'checked' : ''}>
            <span>핀 고정 (항상 최상단에 표시)</span>
          </label>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="modal-btn-cancel" onclick="closeModal()">취소</button>
        <button type="submit" class="modal-btn-save" id="resSaveBtn">저장</button>
      </div>
    </form>
  </div>`;

  document.body.appendChild(overlay);
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);

  // 새 카테고리 입력 토글
  overlay.querySelector('[name=category]').addEventListener('change', e => {
    const show = e.target.value === '__new__';
    overlay.querySelector('#newCatGroup').style.display = show ? '' : 'none';
  });

  overlay.querySelector('#resourceForm').addEventListener('submit', async e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const row      = Object.fromEntries(formData.entries());

    // 새 카테고리 처리
    if (row.category === '__new__') {
      const newCat = overlay.querySelector('#newCatInput').value.trim();
      if (!newCat) { showToast('카테고리명을 입력해주세요'); return; }
      row.category = newCat;
    }

    row.pinned    = overlay.querySelector('[name=pinned]').checked ? 'TRUE' : 'FALSE';
    row.updatedAt = new Date().toISOString().slice(0, 10);

    // 로컬 즉시 반영
    if (!DB.resources) DB.resources = [];
    if (isEdit) {
      const idx = DB.resources.findIndex(r => String(r.id) === String(resource.id));
      if (idx !== -1) DB.resources[idx] = { ...resource, ...row };
      else DB.resources.push({ ...row, id: resource.id });
    } else {
      row.id = Date.now();
      DB.resources.push(row);
    }
    _catColorCache = {};
    showToast(isEdit ? '자료가 수정됐어요' : '자료가 추가됐어요');
    closeModal();
    renderResources();

    // 백그라운드 Sheets 저장
    if (CONFIG.APPS_SCRIPT_URL && CONFIG.APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL') {
      callAppsScript({ action: isEdit ? 'update' : 'add', sheetName: 'resources', id: resource?.id, row }, { silent:true });
    }
  });

  requestAnimationFrame(() => overlay.classList.add('show'));
}
