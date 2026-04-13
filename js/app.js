// ─────────────────────────────────────────
//  app.js  —  대시보드 메인 로직 v2
// ─────────────────────────────────────────

// ── 상수 ──────────────────────────────────
const FLOW_STEPS = ['소재기획','소재제작','소재등록','소재검수','Live'];

const STATUS_STYLE = {
  '진행중':   { bg: '#FAEEDA', c: '#633806' },
  '컨펌대기': { bg: '#EEEDFE', c: '#3C3489' },
  '완료':     { bg: '#EAF3DE', c: '#27500A' },
};

const MEDIA_STYLE = {
  'Meta':       { bg: '#E6F1FB', c: '#0C447C' },
  'GFA':        { bg: '#E1F5EE', c: '#085041' },
  '네이버 BSA': { bg: '#EAF3DE', c: '#27500A' },
  '네이버 PL':  { bg: '#EAF3DE', c: '#27500A' },
  '네이버 쇼검':{ bg: '#EAF3DE', c: '#27500A' },
  '구글':       { bg: '#FAECE7', c: '#712B13' },
  '카카오':     { bg: '#FAEEDA', c: '#633806' },
};
const BID_MEDIA = ['네이버 PL', '네이버 쇼검'];

const ETC_TYPES = {
  '미디어믹스': { icon: '믹', bg: '#E6F1FB', c: '#0C447C' },
  '정산':       { icon: '정', bg: '#EEEDFE', c: '#3C3489' },
  '광고비 확인':{ icon: '확', bg: '#F1EFE8', c: '#5F5E5A' },
  '광고비 충전':{ icon: '충', bg: '#EAF3DE', c: '#27500A' },
  '입찰가 관리':{ icon: '입', bg: '#FAEEDA', c: '#633806' },
  '기타':       { icon: '기', bg: '#F1EFE8', c: '#5F5E5A' },
};

const REPORT_STYLE = {
  '데일리': { bg: '#E6F1FB', c: '#0C447C' },
  '주간':   { bg: '#E1F5EE', c: '#085041' },
  '분기':   { bg: '#EEEDFE', c: '#3C3489' },
  '미팅':   { bg: '#FAEEDA', c: '#633806' },
};

const TODAY = new Date();
TODAY.setHours(0,0,0,0);

// ── 상태 ──────────────────────────────────
let state = {
  view: 'flow',
  flowView: 'board',   // board | list | gantt
  brand: 'all',
  member: 'all',
  filterMedia: 'all',
  filterDue: 'all',
  filterPriority: 'all',
  viewDate: new Date(),
  sortKey: 'due',
  sortAsc: true,
  dragId: null,
  placeholder: null,
};
state.viewDate.setHours(0,0,0,0);

// ── 팀원 유틸 ─────────────────────────────
function getActiveMembers() {
  return (DB.members || []).filter(m => m.status === 'active');
}
function getMemberInfo(name) {
  const colors = ['#7F77DD','#1D9E75','#D85A30','#378ADD','#BA7517','#888780'];
  const initMap = {};
  getActiveMembers().forEach((m, i) => {
    const parts = m.name.split('');
    initMap[m.name] = { initials: parts.slice(0,2).join('').toUpperCase(), color: m.color || colors[i % colors.length] };
  });
  return initMap[name] || { initials: (name||'?').slice(0,2).toUpperCase(), color: '#888780' };
}
function parseAssignees(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}
function renderAvatars(assigneeStr, size = 22) {
  const names = parseAssignees(assigneeStr);
  return names.map((name, i) => {
    const info = getMemberInfo(name);
    const offset = i * (size * 0.6);
    return `<div class="avatar" style="width:${size}px;height:${size}px;background:${info.color}20;color:${info.color};border:1.5px solid ${info.color};font-size:${Math.round(size*0.42)}px;margin-left:${i>0?'-'+Math.round(size*0.3)+'px':'0'};z-index:${10-i};position:relative;" title="${name}">${info.initials}</div>`;
  }).join('');
}

// ── 브랜드 유틸 ───────────────────────────
function brandColor(id) { const b = DB.brands.find(b => b.id === id); return b ? b.color : '#888780'; }
function brandLabel(id) { const b = DB.brands.find(b => b.id === id); return b ? b.label : id; }

// ── 기한 유틸 ─────────────────────────────
function dueInfo(ds) {
  if (!ds) return { label: '기한없음', cls: 'due-none' };
  const d = new Date(ds); d.setHours(0,0,0,0);
  const diff = Math.round((d - TODAY) / 86400000);
  if (diff < 0)   return { label: `D+${Math.abs(diff)} 초과`, cls: 'due-over' };
  if (diff === 0)  return { label: 'D-day', cls: 'due-soon' };
  if (diff <= 3)   return { label: `D-${diff}`, cls: 'due-soon' };
  return { label: `D-${diff}`, cls: 'due-ok' };
}
function fmtDate(d) {
  const days = ['일','월','화','수','목','금','토'];
  return `${d.getMonth()+1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}
function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

// ── Drive 링크 ────────────────────────────
function driveSvg() {
  return `<svg class="drive-icon" viewBox="0 0 24 24" fill="none"><path d="M5 18l4-7 3.5 6H5Z" fill="#185FA5" opacity=".8"/><path d="M12 17l3.5-6 4 7H12Z" fill="#185FA5" opacity=".55"/><path d="M8.5 11l3.5-6 3.5 6h-7Z" fill="#185FA5" opacity=".95"/></svg>`;
}
function driveLink(url, label) {
  if (!url) return '';
  return `<a class="drive-link" href="${url}" target="_blank" rel="noopener">${driveSvg()}<span>${label || '관련 링크'}</span></a>`;
}

// ── 필터 적용 ─────────────────────────────
function applyFilters(tasks) {
  return tasks.filter(t => {
    if (state.brand !== 'all' && t.brand !== state.brand) return false;
    if (state.member !== 'all') {
      const assignees = parseAssignees(t.assignee);
      if (!assignees.includes(state.member)) return false;
    }
    if (state.filterMedia !== 'all') {
      if (state.filterMedia === '네이버' && !t.media?.startsWith('네이버')) return false;
      if (state.filterMedia !== '네이버' && t.media !== state.filterMedia) return false;
    }
    if (state.filterDue !== 'all') {
      const d = new Date(t.due); d.setHours(0,0,0,0);
      const diff = Math.round((d - TODAY) / 86400000);
      if (state.filterDue === 'today' && diff !== 0) return false;
      if (state.filterDue === 'week') {
        const sw = new Date(TODAY); sw.setDate(sw.getDate() - sw.getDay() + 1);
        const ew = new Date(sw); ew.setDate(ew.getDate() + 6);
        if (d < sw || d > ew) return false;
      }
      if (state.filterDue === 'over' && diff >= 0) return false;
    }
    if (state.filterPriority !== 'all' && t.priority !== state.filterPriority) return false;
    return true;
  });
}

// ── 공통 컨트롤 렌더 ──────────────────────
function renderBrandTabs(src) {
  const allBrands = [{ id: 'all', label: '전체', color: '#888780' }, ...DB.brands];
  document.getElementById('brandTabsWrap').innerHTML = allBrands.map(b => {
    const cnt = b.id === 'all' ? src.length : src.filter(t => t.brand === b.id).length;
    return `<button class="btab ${state.brand === b.id ? 'active' : ''}" data-brand="${b.id}">
      <span class="bdot" style="background:${b.color}"></span>${b.label}
      <span class="bcount">${cnt}</span>
    </button>`;
  }).join('');
}

function renderFlowControls() {
  const members = getActiveMembers();
  const mediaList = ['all','Meta','GFA','네이버','구글','카카오'];

  document.getElementById('flowControlsWrap').innerHTML = `
    <div class="controls-bar">
      <div class="ctrl-group">
        <label class="ctrl-label">담당자</label>
        <select class="ctrl-select" id="selMember">
          <option value="all">전체</option>
          ${members.map(m => `<option value="${m.name}" ${state.member===m.name?'selected':''}>${m.name}</option>`).join('')}
        </select>
      </div>
      <div class="ctrl-group">
        <label class="ctrl-label">매체</label>
        <select class="ctrl-select" id="selMedia">
          ${mediaList.map(v => `<option value="${v}" ${state.filterMedia===v?'selected':''}>${v==='all'?'전체':v}</option>`).join('')}
        </select>
      </div>
      <div class="ctrl-group">
        <label class="ctrl-label">기한</label>
        <select class="ctrl-select" id="selDue">
          <option value="all" ${state.filterDue==='all'?'selected':''}>전체</option>
          <option value="today" ${state.filterDue==='today'?'selected':''}>오늘</option>
          <option value="week" ${state.filterDue==='week'?'selected':''}>이번 주</option>
          <option value="over" ${state.filterDue==='over'?'selected':''}>기한 초과</option>
        </select>
      </div>
      <div class="ctrl-group">
        <label class="ctrl-label">우선순위</label>
        <select class="ctrl-select" id="selPriority">
          <option value="all" ${state.filterPriority==='all'?'selected':''}>전체</option>
          <option value="긴급" ${state.filterPriority==='긴급'?'selected':''}>🔴 긴급만</option>
        </select>
      </div>
      <div class="ctrl-spacer"></div>
      <div class="view-toggle">
        <button class="vbtn ${state.flowView==='board'?'active':''}" data-flowview="board">
          <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/></svg>
          보드
        </button>
        <button class="vbtn ${state.flowView==='list'?'active':''}" data-flowview="list">
          <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="7" width="14" height="2" rx="1" fill="currentColor"/><rect x="1" y="12" width="14" height="2" rx="1" fill="currentColor"/></svg>
          리스트
        </button>
        <button class="vbtn ${state.flowView==='gantt'?'active':''}" data-flowview="gantt">
          <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="8" height="2.5" rx="1" fill="currentColor"/><rect x="1" y="7" width="12" height="2.5" rx="1" fill="currentColor"/><rect x="1" y="11" width="6" height="2.5" rx="1" fill="currentColor"/></svg>
          간트
        </button>
      </div>
    </div>`;

  document.getElementById('selMember').addEventListener('change', e => { state.member = e.target.value; renderFlow(); });
  document.getElementById('selMedia').addEventListener('change', e => { state.filterMedia = e.target.value; renderFlow(); });
  document.getElementById('selDue').addEventListener('change', e => { state.filterDue = e.target.value; renderFlow(); });
  document.getElementById('selPriority').addEventListener('change', e => { state.filterPriority = e.target.value; renderFlow(); });
  document.getElementById('flowControlsWrap').querySelectorAll('.vbtn').forEach(btn => {
    btn.addEventListener('click', () => { state.flowView = btn.dataset.flowview; renderFlow(); });
  });
}

function renderMetrics(items, type) {
  const wrap = document.getElementById('metricsWrap');
  if (!wrap) return;
  if (type === 'flow') {
    const live    = items.filter(t => t.step === 'Live').length;
    const over    = items.filter(t => dueInfo(t.due).cls === 'due-over' && t.step !== 'Live').length;
    const confirm = items.filter(t => t.status === '컨펌대기').length;
    const urgent  = items.filter(t => t.priority === '긴급').length;
    wrap.innerHTML = `
      <div class="metric"><div class="mlabel">전체 업무</div><div class="mval">${items.length}</div></div>
      <div class="metric"><div class="mlabel">긴급</div><div class="mval danger">${urgent}</div></div>
      <div class="metric"><div class="mlabel">기한 초과</div><div class="mval danger">${over}</div></div>
      <div class="metric"><div class="mlabel">Live 운영</div><div class="mval info">${live}</div></div>`;
  } else if (type === 'etc') {
    const over = items.filter(t => dueInfo(t.due).cls === 'due-over' && !t.done).length;
    wrap.innerHTML = `
      <div class="metric"><div class="mlabel">전체</div><div class="mval">${items.length}</div></div>
      <div class="metric"><div class="mlabel">완료</div><div class="mval success">${items.filter(t=>t.done).length}</div></div>
      <div class="metric"><div class="mlabel">기한 초과</div><div class="mval danger">${over}</div></div>
      <div class="metric"><div class="mlabel">입찰가 관리</div><div class="mval info">${items.filter(t=>t.type==='입찰가 관리').length}</div></div>`;
  } else if (type === 'report') {
    wrap.innerHTML = `
      <div class="metric"><div class="mlabel">전체</div><div class="mval">${items.length}</div></div>
      <div class="metric"><div class="mlabel">완료</div><div class="mval success">${items.filter(t=>t.done).length}</div></div>
      <div class="metric"><div class="mlabel">미완료</div><div class="mval warn">${items.filter(t=>!t.done).length}</div></div>
      <div class="metric"><div class="mlabel">기한 초과</div><div class="mval danger">${items.filter(t=>dueInfo(t.due).cls==='due-over'&&!t.done).length}</div></div>`;
  } else {
    wrap.innerHTML = '';
  }
}

// ──────────────────────────────────────────
//  뷰 1: 캠페인 플로우
// ──────────────────────────────────────────
function renderFlow() {
  renderBrandTabs(DB.campaign);
  renderFlowControls();
  const ft = applyFilters(DB.campaign);
  renderMetrics(ft, 'flow');

  const panel = document.getElementById('panel-flow');
  let boardEl = panel.querySelector('#flowBoard');
  let listEl  = panel.querySelector('#flowList');
  let ganttEl = panel.querySelector('#flowGantt');
  if (!boardEl) { boardEl = document.createElement('div'); boardEl.id = 'flowBoard'; panel.appendChild(boardEl); }
  if (!listEl)  { listEl  = document.createElement('div'); listEl.id  = 'flowList';  panel.appendChild(listEl); }
  if (!ganttEl) { ganttEl = document.createElement('div'); ganttEl.id = 'flowGantt'; panel.appendChild(ganttEl); }

  boardEl.style.display = state.flowView === 'board' ? '' : 'none';
  listEl.style.display  = state.flowView === 'list'  ? '' : 'none';
  ganttEl.style.display = state.flowView === 'gantt' ? '' : 'none';

  if (state.flowView === 'board') renderFlowBoard(ft, boardEl);
  else if (state.flowView === 'list') renderFlowList(ft, listEl);
  else renderFlowGantt(ft, ganttEl);
}

// ── 보드 뷰 ───────────────────────────────
function renderFlowBoard(ft, container) {
  container.className = 'flow-scroll';
  container.innerHTML = `<div style="display:flex;justify-content:flex-end;margin-bottom:10px;">
    <button class="modal-btn-save" onclick="openModal('bulk')" style="font-size:12px;padding:6px 16px;">+ 캠페인 일정 등록</button>
  </div>
  <div class="flow-board" id="flowBoardInner"></div>`;
  const board = container.querySelector('#flowBoardInner');

  FLOW_STEPS.forEach(step => {
    const isLive = step === 'Live';
    const colTasks = ft.filter(t => t.step === step)
      .sort((a, b) => {
        if (a.priority === '긴급' && b.priority !== '긴급') return -1;
        if (a.priority !== '긴급' && b.priority === '긴급') return 1;
        return 0;
      });
    const col = document.createElement('div');
    col.className = 'flow-col' + (isLive ? ' live-col' : '');
    col.dataset.step = step;
    col.innerHTML = `<div class="col-header">
      <span class="col-name">${step}</span>
      <div style="display:flex;gap:4px;align-items:center;">
        ${isLive ? '<span class="live-badge">LIVE</span>' : ''}
        <span class="col-count">${colTasks.length}</span>
      </div>
    </div>`;
    colTasks.forEach(t => col.appendChild(makeCampaignCard(t)));
    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn'; addBtn.textContent = '+ 추가';
    addBtn.addEventListener('click', () => openModal('add', 'campaign'));
    col.appendChild(addBtn);
    setupDropTarget(col, addBtn, step);
    board.appendChild(col);
  });
}

function makeCampaignCard(t) {
  const due = dueInfo(t.due);
  const isLive = t.step === 'Live';
  const isUrgent = t.priority === '긴급';
  const ms = MEDIA_STYLE[t.media] || null;
  const ss = STATUS_STYLE[t.status] || STATUS_STYLE['진행중'];
  const isBid = t.hasBid && BID_MEDIA.includes(t.media);

  const el = document.createElement('div');
  el.className = 'task-card' + (isLive ? ' live-card' : '') + (isUrgent ? ' urgent-card' : '') + (t.status === '완료' ? ' status-done' : '');
  el.dataset.id = t.id; el.draggable = true;

  el.innerHTML = `
    <button class="card-edit-btn" title="수정">✎</button>
    <button class="card-urgent-btn ${isUrgent ? 'on' : ''}" title="${isUrgent ? '긴급 해제' : '긴급 설정'}" data-id="${t.id}">!</button>
    <div class="card-brand-bar" style="background:${isUrgent ? '#E24B4A' : brandColor(t.brand)}"></div>
    <div class="card-title">${t.title}</div>
    <div class="card-tags">
      ${isUrgent ? `<span class="tag urgent-tag">긴급</span>` : ''}
      <span class="tag" style="background:${ss.bg};color:${ss.c}">${isLive ? '운영중' : t.status}</span>
      ${ms ? `<span class="tag" style="background:${ms.bg};color:${ms.c}">${t.media}</span>` : ''}
      ${isBid ? `<span class="tag bid-tag">입찰가</span>` : ''}
      ${state.brand === 'all' ? `<span class="tag brand-tag">${brandLabel(t.brand)}</span>` : ''}
    </div>
    ${t.notes ? `<div class="card-notes-preview">${t.notes}</div>` : ''}
    ${driveLink(t.driveUrl, t.driveLabel)}
    <div class="card-footer">
      <div style="display:flex;">${renderAvatars(t.assignee)}</div>
      <span class="due-badge ${due.cls}">${isLive ? '' : due.label}</span>
      ${!isLive ? `<label class="done-check campaign-done-check" title="${t.status === '완료' ? '완료 취소' : '완료 체크'}">
        <input type="checkbox" ${t.status === '완료' ? 'checked' : ''} data-id="${t.id}">
        <span class="check-box">${t.status === '완료' ? '✓' : ''}</span>
      </label>` : ''}
    </div>`;

  el.querySelector('.card-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal('edit', 'campaign', t);
  });

  // 완료 체크박스
  el.querySelector('.campaign-done-check input')?.addEventListener('change', async e => {
    e.stopPropagation();
    const newStatus = e.target.checked ? '완료' : '진행중';
    t.status = newStatus;
    try {
      await callAppsScript({ action: 'update', sheetName: 'campaign', id: t.id, row: { status: newStatus } });
    } catch (_) {}
    showToast(newStatus === '완료' ? `"${t.title}" 완료됐어요` : `"${t.title}" 진행중으로 변경됐어요`);
    renderCurrentView();
  });

  el.querySelector('.card-urgent-btn').addEventListener('click', async e => {
    e.stopPropagation();
    const newPriority = t.priority === '긴급' ? '일반' : '긴급';
    t.priority = newPriority;
    try {
      await callAppsScript({ action: 'update', sheetName: 'campaign', id: t.id, row: { priority: newPriority } });
    } catch (_) {}
    showToast(newPriority === '긴급' ? `"${t.title}" 긴급 설정됨` : `"${t.title}" 긴급 해제됨`);
    renderCurrentView();
  });

  el.addEventListener('dragstart', e => { state.dragId = t.id; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  el.addEventListener('dragend', () => { el.classList.remove('dragging'); removePH(); document.querySelectorAll('.flow-col').forEach(c => c.classList.remove('drag-over')); });
  el.addEventListener('dragover', e => {
    e.preventDefault();
    if (Number(el.dataset.id) === state.dragId) return;
    const col = el.closest('.flow-col');
    const rect = el.getBoundingClientRect();
    removePH(); state.placeholder = makePH();
    col.insertBefore(state.placeholder, e.clientY < rect.top + rect.height / 2 ? el : el.nextSibling);
  });
  return el;
}

function setupDropTarget(col, addBtn, step) {
  col.addEventListener('dragover', e => {
    e.preventDefault(); col.classList.add('drag-over');
    const cards = [...col.querySelectorAll('.task-card:not(.dragging):not(.drag-ph)')];
    if (!cards.length) { removePH(); state.placeholder = makePH(); col.insertBefore(state.placeholder, addBtn); }
  });
  col.addEventListener('dragleave', e => { if (!col.contains(e.relatedTarget)) col.classList.remove('drag-over'); });
  col.addEventListener('drop', e => {
    e.preventDefault(); col.classList.remove('drag-over');
    const task = DB.campaign.find(x => x.id === state.dragId); if (!task) return;
    const old = task.step; task.step = step; task.status = step === 'Live' ? '진행중' : task.status;
    removePH(); if (old !== step) showToast(`"${task.title}" → ${step}`);
    renderFlow();
  });
}

function makePH() { const p = document.createElement('div'); p.className = 'task-card drag-ph'; return p; }
function removePH() { if (state.placeholder?.parentNode) state.placeholder.parentNode.removeChild(state.placeholder); state.placeholder = null; }

// ── 리스트 뷰 ─────────────────────────────
function renderFlowList(ft, container) {
  const sorted = [...ft].sort((a, b) => {
    let va = a[state.sortKey] || '', vb = b[state.sortKey] || '';
    if (state.sortKey === 'due') { va = new Date(va).getTime(); vb = new Date(vb).getTime(); }
    return (va < vb ? -1 : va > vb ? 1 : 0) * (state.sortAsc ? 1 : -1);
  });

  const thStyle = (key) => {
    const arrow = state.sortKey === key ? (state.sortAsc ? ' ↑' : ' ↓') : '';
    return `class="list-th sortable" data-sort="${key}"`;
  };

  container.innerHTML = `<div style="overflow-x:auto;">
    <table class="list-table">
      <thead><tr>
        <th ${thStyle('title')}>업무명</th>
        <th ${thStyle('brand')}>브랜드 <span class="col-filter-icon" data-col="brand">▾</span></th>
        <th ${thStyle('step')}>단계 <span class="col-filter-icon" data-col="step">▾</span></th>
        <th>상태</th>
        <th>매체 <span class="col-filter-icon" data-col="media">▾</span></th>
        <th ${thStyle('assignee')}>담당자 <span class="col-filter-icon" data-col="assignee">▾</span></th>
        <th ${thStyle('due')}>기한</th>
        <th>자료</th>
      </tr></thead>
      <tbody id="listTbody"></tbody>
    </table>
  </div>`;

  const tbody = container.querySelector('#listTbody');
  sorted.forEach(t => {
    const due = dueInfo(t.due);
    const isLive = t.step === 'Live';
    const isUrgent = t.priority === '긴급';
    const ms = MEDIA_STYLE[t.media] || null;
    const ss = STATUS_STYLE[t.status] || STATUS_STYLE['진행중'];
    const stepStyle = { '소재기획':{bg:'#EEEDFE',c:'#3C3489'}, '소재제작':{bg:'#FAEEDA',c:'#633806'}, '소재등록':{bg:'#EAF3DE',c:'#27500A'}, '소재검수':{bg:'#EAF3DE',c:'#27500A'}, 'Live':{bg:'#9FE1CB',c:'#04342C'} };
    const sp = stepStyle[t.step] || { bg:'var(--color-background-secondary)', c:'var(--color-text-secondary)' };

    // brand를 문자열로 강제 변환해서 NaN 방지
    const bId    = String(t.brand || '');
    const bLabel = brandLabel(bId) || bId;
    const bColor = brandColor(bId);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="max-width:200px;">
        <span class="list-title-link${isUrgent?' urgent-title':''}" data-id="${t.id}" style="cursor:pointer;font-weight:500;">
          ${isUrgent ? '<span style="color:#E24B4A;margin-right:3px;">!</span>' : ''}${t.title}
        </span>
      </td>
      <td><div style="display:flex;align-items:center;gap:5px;"><span style="width:7px;height:7px;border-radius:50%;background:${bColor};display:inline-block;flex-shrink:0;"></span>${bLabel}</div></td>
      <td><span class="tag" style="background:${sp.bg};color:${sp.c}">${t.step}</span></td>
      <td><span class="tag" style="background:${ss.bg};color:${ss.c}">${isLive?'운영중':t.status}</span></td>
      <td>${ms ? `<span class="tag" style="background:${ms.bg};color:${ms.c}">${t.media}</span>` : ''}</td>
      <td><div style="display:flex;">${renderAvatars(t.assignee, 20)}</div></td>
      <td><span class="due-badge ${due.cls}">${isLive?'운영중':due.label}</span></td>
      <td>${driveLink(t.driveUrl, t.driveLabel)}</td>`;

    // 업무명 클릭 → 수정 모달
    tr.querySelector('.list-title-link').addEventListener('click', () => {
      openModal('edit', 'campaign', t);
    });

    tbody.appendChild(tr);
  });

  container.querySelectorAll('.sortable').forEach(th => {
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (state.sortKey === key) state.sortAsc = !state.sortAsc;
      else { state.sortKey = key; state.sortAsc = true; }
      renderFlowList(ft, container);
    });
  });
}

// ── 간트 뷰 ───────────────────────────────
function renderFlowGantt(ft, container) {
  const DAYS = 14;
  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(TODAY); d.setDate(d.getDate() + i); return d;
  });
  const dayLabels = dates.map(d => `${d.getMonth()+1}/${d.getDate()}`);
  const dayNames  = ['일','월','화','수','목','금','토'];

  const STEP_COLORS = {
    '소재기획': '#AFA9EC',
    '소재제작': '#EF9F27',
    '소재등록': '#97C459',
    '소재검수': '#5DCAA5',
    'Live':     '#1D9E75',
  };

  const colW   = 36;
  const nameW  = 180;
  const stepW  = 72;
  const memberW = 52;

  let html = `<div style="overflow-x:auto;"><table class="gantt-table" style="min-width:${nameW+stepW+memberW+colW*DAYS}px">
    <thead>
      <tr>
        <th style="width:${nameW}px;text-align:left;padding:5px 8px;">업무</th>
        <th style="width:${stepW}px;text-align:center;">단계</th>
        <th style="width:${memberW}px;text-align:center;">담당</th>
        ${dates.map((d,i) => {
          const isToday   = sameDay(d, TODAY);
          const isWeekend = d.getDay()===0||d.getDay()===6;
          return `<th style="width:${colW}px;text-align:center;${isToday?'background:var(--color-background-info);color:var(--color-text-info);font-weight:600;':''}${isWeekend?'opacity:.45':''}">${dayLabels[i]}<br><span style="font-size:9px;">${dayNames[d.getDay()]}</span></th>`;
        }).join('')}
      </tr>
    </thead>
    <tbody>`;

  const sorted  = [...ft].filter(t => t.startDate).sort((a,b) => new Date(a.startDate)-new Date(b.startDate));
  const noDate  = ft.filter(t => !t.startDate);

  [...sorted, ...noDate].forEach(t => {
    const isLive  = t.step === 'Live';
    const bId     = String(t.brand || '');
    const bColor  = brandColor(bId);
    const stepColor = STEP_COLORS[t.step] || bColor;

    const start = t.startDate ? new Date(t.startDate) : null;
    const end   = t.due       ? new Date(t.due)       : null;
    if (start) start.setHours(0,0,0,0);
    if (end)   end.setHours(0,0,0,0);

    const cells = dates.map((d) => {
      const isToday   = sameDay(d, TODAY);
      const isWeekend = d.getDay()===0||d.getDay()===6;
      const bgBase    = isToday ? 'background:var(--color-background-info);' : isWeekend ? 'background:var(--color-background-secondary);' : '';
      if (!start || !end) return `<td style="${bgBase}"></td>`;
      const inRange = d >= start && d <= end;
      if (!inRange) return `<td style="${bgBase}"></td>`;
      const isStart = sameDay(d, start);
      const isEnd   = sameDay(d, end);
      const barStyle = `background:${stepColor};height:16px;margin:3px 1px;border-radius:${isStart?'4px':'0'} ${isEnd?'4px':'0'} ${isEnd?'4px':'0'} ${isStart?'4px':'0'};`;
      return `<td style="${bgBase}padding:0;"><div style="${barStyle}"></div></td>`;
    }).join('');

    const due = dueInfo(t.due);
    const stepStyle = `background:${stepColor}22;color:${stepColor};font-size:10px;padding:1px 6px;border-radius:20px;font-weight:500;white-space:nowrap;`;

    html += `<tr style="cursor:pointer;" class="gantt-row" data-id="${t.id}">
      <td style="padding:4px 8px;max-width:${nameW}px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:11px;color:var(--text-1);" title="${t.title}">
        <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${bColor};margin-right:5px;vertical-align:middle;flex-shrink:0;"></span>
        ${t.priority === '긴급' ? '<span style="color:#E24B4A;font-size:10px;margin-right:3px;font-weight:700;">!</span>' : ''}
        ${t.title}
      </td>
      <td style="padding:4px;text-align:center;"><span style="${stepStyle}">${t.step}</span></td>
      <td style="padding:4px;text-align:center;"><div style="display:flex;justify-content:center;">${renderAvatars(t.assignee, 18)}</div></td>
      ${cells}
    </tr>`;
  });

  html += `</tbody></table></div>`;

  if (!sorted.length && !noDate.length) {
    html = `<div style="padding:2rem;text-align:center;color:var(--color-text-tertiary);font-size:13px;">표시할 업무가 없어요</div>`;
  }
  container.innerHTML = html;

  // 행 클릭 → 수정 모달
  container.querySelectorAll('.gantt-row').forEach(row => {
    row.addEventListener('click', () => {
      const t = DB.campaign.find(x => String(x.id) === String(row.dataset.id));
      if (t) openModal('edit', 'campaign', t);
    });
  });
}

// ──────────────────────────────────────────
//  뷰 2: 데일리 뷰
// ──────────────────────────────────────────
function renderDaily() {
  document.getElementById('brandTabsWrap').innerHTML = '';
  document.getElementById('flowControlsWrap').innerHTML = '';
  document.getElementById('metricsWrap').innerHTML = '';

  const days = ['일','월','화','수','목','금','토'];
  document.getElementById('dailyDateLabel').textContent = fmtDate(state.viewDate);
  const grid = document.getElementById('dailyGrid');
  grid.innerHTML = '';

  const activeMembers = getActiveMembers();
  const filtered = state.member === 'all' ? activeMembers : activeMembers.filter(m => m.name === state.member);

  filtered.forEach(m => {
    const allTasks = [
      ...DB.campaign.map(t => ({ ...t, _src: 'campaign' })),
      ...DB.common.map(t => ({ ...t, _src: 'common' })),
      ...DB.report.map(t => ({ ...t, _src: 'report' })),
    ].filter(t => {
      if (!t.due) return false;
      const assignees = parseAssignees(t.assignee);
      return assignees.includes(m.name) && sameDay(new Date(t.due), state.viewDate);
    });

    const info = getMemberInfo(m.name);
    const col = document.createElement('div');
    col.className = 'daily-col';
    col.innerHTML = `<div class="daily-col-header">
      <div class="avatar" style="width:26px;height:26px;background:${info.color}20;color:${info.color};border:1.5px solid ${info.color};font-size:10px;">${info.initials}</div>
      <span class="daily-col-name">${m.name}</span>
      <span class="daily-col-count">${allTasks.length}건</span>
    </div>`;

    if (!allTasks.length) {
      col.innerHTML += `<div class="daily-empty">업무 없음</div>`;
    } else {
      allTasks.forEach(t => col.appendChild(makeDailyCard(t)));
    }
    grid.appendChild(col);
  });
}

function makeDailyCard(t) {
  const due = dueInfo(t.due);
  const isLive = t.step === 'Live';
  const isReport = t._src === 'report';
  const isEtc = t._src === 'common';
  const ms = t.media ? MEDIA_STYLE[t.media] || null : null;
  const rs = isReport ? REPORT_STYLE[t.type] || null : null;
  const es = isEtc ? ETC_TYPES[t.type] || ETC_TYPES['기타'] : null;
  const ss = t.status ? STATUS_STYLE[t.status] || null : null;
  const stepLabel = isReport ? t.type : isEtc ? (es?.label || '공통') : isLive ? 'Live' : (t.step || '');

  const el = document.createElement('div');
  el.className = 'daily-card' + (isLive ? ' live-card' : '');
  el.innerHTML = `
    <div class="card-brand-bar" style="background:${t.brand ? brandColor(t.brand) : '#888780'}"></div>
    <div class="card-title">${t.title}</div>
    <div class="card-tags">
      ${t.brand ? `<span style="font-size:10px;font-weight:500;color:${brandColor(t.brand)}">${brandLabel(t.brand)}</span>` : '<span class="tag brand-tag">공통</span>'}
      ${rs ? `<span class="tag" style="background:${rs.bg};color:${rs.c}">${t.type}</span>` : ''}
      ${es && isEtc ? `<span class="tag" style="background:${es.bg};color:${es.c}">${es.label}</span>` : ''}
      ${ss && !isEtc && !isReport ? `<span class="tag" style="background:${ss.bg};color:${ss.c}">${t.status}</span>` : ''}
      ${ms ? `<span class="tag" style="background:${ms.bg};color:${ms.c}">${t.media}</span>` : ''}
    </div>
    ${driveLink(t.driveUrl, t.driveLabel)}
    <div class="card-footer">
      <span class="due-badge ${due.cls}">${isLive ? '운영중' : due.label}</span>
      <span class="step-label">${stepLabel}</span>
    </div>`;
  return el;
}

// ──────────────────────────────────────────
//  뷰 3: 공통 업무
// ──────────────────────────────────────────
function renderEtc() {
  document.getElementById('brandTabsWrap').innerHTML = '';
  document.getElementById('flowControlsWrap').innerHTML = '';

  const members = getActiveMembers();
  document.getElementById('memberFilterWrap').innerHTML = `
    <label class="ctrl-label">담당자</label>
    <select class="ctrl-select" id="selMemberEtc">
      <option value="all">전체</option>
      ${members.map(m => `<option value="${m.name}" ${state.member===m.name?'selected':''}>${m.name}</option>`).join('')}
    </select>`;
  document.getElementById('selMemberEtc')?.addEventListener('change', e => { state.member = e.target.value; renderEtc(); });

  const filtered = DB.common.filter(t => state.member === 'all' || parseAssignees(t.assignee).includes(state.member));
  renderMetrics(filtered, 'etc');

  const container = document.getElementById('etcContainer');
  container.innerHTML = '';

  // 추가 버튼
  const addBar = document.createElement('div');
  addBar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:12px;';
  addBar.innerHTML = `<button class="modal-btn-save" onclick="openModal('add','common')" style="font-size:12px;padding:6px 14px;">+ 업무 추가</button>`;
  container.appendChild(addBar);

  Object.entries(ETC_TYPES).forEach(([typeName, style]) => {
    const group = filtered.filter(t => t.type === typeName);
    if (!group.length) return;
    const section = document.createElement('div');
    section.className = 'etc-section';
    section.innerHTML = `<div class="etc-section-title" style="color:${style.c}">${typeName} <span class="etc-count">${group.length}건</span></div><div class="etc-grid"></div>`;
    const grid = section.querySelector('.etc-grid');
    group.forEach(t => grid.appendChild(makeEtcCard(t, style)));
    container.appendChild(section);
  });
}

function makeEtcCard(t, style) {
  const due = dueInfo(t.due);
  const ms = t.media ? MEDIA_STYLE[t.media] || null : null;
  const el = document.createElement('div');
  const isUrgent = t.priority === '긴급';
  el.className = 'etc-card' + (t.done ? ' done-card' : '') + (isUrgent ? ' urgent-card' : '');
  el.innerHTML = `
    <button class="card-edit-btn" title="수정">✎</button>
    <button class="card-urgent-btn ${isUrgent ? 'on' : ''}" title="${isUrgent ? '긴급 해제' : '긴급 설정'}" data-id="${t.id}">!</button>
    <div class="etc-card-icon" style="background:${style.bg};color:${style.c}">${style.icon}</div>
    <div class="card-title">${t.title}</div>
    ${isUrgent ? `<div class="card-tags"><span class="tag urgent-tag">긴급</span></div>` : ''}
    ${t.repeat && t.repeat !== '' ? `<div style="margin-bottom:4px;"><span class="tag" style="background:#E6F1FB;color:#0C447C;">↻ ${t.repeat==='daily'?'매일':t.repeat==='weekly'?'매주':'매월'}</span></div>` : ''}
    ${ms ? `<div class="card-tags"><span class="tag" style="background:${ms.bg};color:${ms.c}">${t.media}</span></div>` : ''}
    ${t.notes ? `<div class="card-notes-preview">${t.notes}</div>` : ''}
    ${driveLink(t.driveUrl, t.driveLabel)}
    <div class="card-footer">
      <div style="display:flex;">${renderAvatars(t.assignee, 20)}</div>
      <span class="due-badge ${due.cls}">${due.label}</span>
      <label class="done-check"><input type="checkbox" ${t.done?'checked':''} data-id="${t.id}"><span class="check-box">${t.done?'✓':''}</span></label>
    </div>`;
  el.querySelector('.card-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal('edit', 'common', t);
  });
  el.querySelector('.card-urgent-btn').addEventListener('click', async e => {
    e.stopPropagation();
    const newPriority = t.priority === '긴급' ? '일반' : '긴급';
    t.priority = newPriority;
    try { await callAppsScript({ action: 'update', sheetName: 'common', id: t.id, row: { priority: newPriority } }); } catch (_) {}
    showToast(newPriority === '긴급' ? `"${t.title}" 긴급 설정됨` : `"${t.title}" 긴급 해제됨`);
    renderEtc();
  });
  el.querySelector('input').addEventListener('change', e => {
    const task = DB.common.find(x => x.id === Number(e.target.dataset.id));
    if (task) { task.done = e.target.checked; renderEtc(); showToast(task.done ? `"${task.title}" 완료` : `"${task.title}" 취소`); }
  });
  return el;
}

// ──────────────────────────────────────────
//  뷰 4: 리포트 · 미팅
// ──────────────────────────────────────────
function renderReport() {
  renderBrandTabs(DB.report);
  document.getElementById('flowControlsWrap').innerHTML = '';

  const members = getActiveMembers();
  document.getElementById('memberFilterWrap').innerHTML = `
    <label class="ctrl-label">담당자</label>
    <select class="ctrl-select" id="selMemberRpt">
      <option value="all">전체</option>
      ${members.map(m => `<option value="${m.name}" ${state.member===m.name?'selected':''}>${m.name}</option>`).join('')}
    </select>`;
  document.getElementById('selMemberRpt')?.addEventListener('change', e => { state.member = e.target.value; renderReport(); });

  const filtered = DB.report.filter(t =>
    (state.brand === 'all' || t.brand === state.brand) &&
    (state.member === 'all' || parseAssignees(t.assignee).includes(state.member))
  );
  renderMetrics(filtered, 'report');
  const grid = document.getElementById('reportGrid');
  grid.innerHTML = '';

  // 추가 버튼
  const addBar = document.createElement('div');
  addBar.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:12px;grid-column:1/-1;';
  addBar.innerHTML = `<button class="modal-btn-save" onclick="openModal('add','report')" style="font-size:12px;padding:6px 14px;">+ 리포트 추가</button>`;
  grid.appendChild(addBar);
  filtered.forEach(t => grid.appendChild(makeReportCard(t)));
}

function makeReportCard(t) {
  const due = dueInfo(t.due);
  const rs = REPORT_STYLE[t.type] || { bg: '#F1EFE8', c: '#5F5E5A' };
  const el = document.createElement('div');
  const isUrgent = t.priority === '긴급';
  el.className = 'report-card' + (t.done ? ' done-card' : '') + (isUrgent ? ' urgent-card' : '');
  el.innerHTML = `
    <button class="card-edit-btn" title="수정">✎</button>
    <button class="card-urgent-btn ${isUrgent ? 'on' : ''}" title="${isUrgent ? '긴급 해제' : '긴급 설정'}" data-id="${t.id}">!</button>
    <div class="report-card-top">
      <div class="report-icon" style="background:${rs.bg};color:${rs.c}">${t.type[0]}</div>
      <div><div class="report-brand" style="color:${brandColor(t.brand)}">${brandLabel(t.brand)}</div><div class="report-type">${t.type}</div></div>
      ${isUrgent ? `<span class="tag urgent-tag" style="margin-left:auto;">긴급</span>` : ''}
      ${t.repeat && t.repeat !== '' ? `<span class="tag" style="background:#E6F1FB;color:#0C447C;margin-left:auto;">↻ ${t.repeat==='daily'?'매일':t.repeat==='weekly'?'매주':'매월'}</span>` : ''}
    </div>
    <div class="card-title">${t.title}</div>
    ${t.notes ? `<div class="card-notes-preview">${t.notes}</div>` : ''}
    ${driveLink(t.driveUrl, t.driveLabel)}
    <div class="card-footer">
      <div style="display:flex;">${renderAvatars(t.assignee, 20)}</div>
      <span class="due-badge ${due.cls}">${due.label}</span>
      <label class="done-check"><input type="checkbox" ${t.done?'checked':''} data-id="${t.id}"><span class="check-box">${t.done?'✓':''}</span></label>
    </div>`;
  el.querySelector('.card-edit-btn').addEventListener('click', e => {
    e.stopPropagation();
    openModal('edit', 'report', t);
  });
  el.querySelector('.card-urgent-btn').addEventListener('click', async e => {
    e.stopPropagation();
    const newPriority = t.priority === '긴급' ? '일반' : '긴급';
    t.priority = newPriority;
    try { await callAppsScript({ action: 'update', sheetName: 'report', id: t.id, row: { priority: newPriority } }); } catch (_) {}
    showToast(newPriority === '긴급' ? `"${t.title}" 긴급 설정됨` : `"${t.title}" 긴급 해제됨`);
    renderReport();
  });
  el.querySelector('input').addEventListener('change', e => {
    const task = DB.report.find(x => x.id === Number(e.target.dataset.id));
    if (task) { task.done = e.target.checked; renderReport(); showToast(task.done ? `"${task.title}" 완료` : `"${task.title}" 취소`); }
  });
  return el;
}

// ── 뷰 전환 ───────────────────────────────
function renderCurrentView() {
  if      (state.view === 'flow')   renderFlow();
  else if (state.view === 'daily')  renderDaily();
  else if (state.view === 'etc')    renderEtc();
  else if (state.view === 'report') renderReport();
}

// ── 토스트 ────────────────────────────────
let toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ── 이벤트 바인딩 ─────────────────────────
function bindEvents() {
  document.querySelectorAll('.view-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      state.view = btn.dataset.view;
      state.brand = 'all'; state.member = 'all';
      state.filterMedia = 'all'; state.filterDue = 'all'; state.filterPriority = 'all';
      document.querySelectorAll('.view-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.view-panel').forEach(p => p.hidden = true);
      document.getElementById('panel-' + state.view).hidden = false;
      renderCurrentView();
    });
  });

  document.getElementById('brandTabsWrap').addEventListener('click', e => {
    const btn = e.target.closest('.btab'); if (!btn) return;
    state.brand = btn.dataset.brand; renderCurrentView();
  });

  document.getElementById('prevDay')?.addEventListener('click', () => { state.viewDate.setDate(state.viewDate.getDate()-1); renderDaily(); });
  document.getElementById('nextDay')?.addEventListener('click', () => { state.viewDate.setDate(state.viewDate.getDate()+1); renderDaily(); });
  document.getElementById('todayBtn')?.addEventListener('click', () => { state.viewDate = new Date(); state.viewDate.setHours(0,0,0,0); renderDaily(); });
}

// ── 진입점 ────────────────────────────────
async function main() {
  document.getElementById('loadingOverlay').style.display = 'flex';
  await initData();
  generateRecurringTasks(); // 반복 업무 자동 생성
  bindEvents();
  renderFlow();
  document.getElementById('loadingOverlay').style.display = 'none';
  startAutoRefresh();
  const badge = document.getElementById('syncBadge');
  badge.textContent = USE_SAMPLE_DATA ? '샘플 데이터' : 'Sheets 연동됨';
  badge.className = USE_SAMPLE_DATA ? 'sync-badge sample' : 'sync-badge live';
}

document.addEventListener('DOMContentLoaded', main);
