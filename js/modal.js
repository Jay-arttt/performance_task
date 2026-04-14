// ─────────────────────────────────────────
//  modal.js  —  업무 추가 · 수정 · 캠페인 일괄 등록
// ─────────────────────────────────────────

const MEDIA_LIST = ['Meta','GFA','네이버 BSA','네이버 PL','네이버 쇼검','네이버 보장','네이버 신검','구글','카카오'];
const FLOW_STEPS_BULK = ['소재기획','소재제작','소재등록','소재검수'];

// ── Apps Script 워밍업 ────────────────────
// 페이지 로드 시 콜드 스타트 미리 해결
function warmUpAppsScript() {
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL') return;
  fetch(CONFIG.APPS_SCRIPT_URL, { method: 'GET' }).catch(() => {});
}

// ── API 호출 (낙관적 업데이트) ───────────
// fire-and-forget: 화면은 즉시 갱신, Sheets 저장은 백그라운드에서
function callAppsScript(payload, { silent = false } = {}) {
  if (!CONFIG.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL === 'YOUR_APPS_SCRIPT_URL') {
    return Promise.resolve({ success: true, id: payload.row?.id || Date.now() });
  }
  return fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  .then(res => res.json())
  .then(json => {
    if (!json.success && !silent) console.warn('[Sheets] 저장 실패:', json.error);
    return json;
  })
  .catch(err => {
    if (!silent) console.warn('[Sheets] 네트워크 오류:', err.message);
    return { success: false };
  });
}

// ── 날짜 헬퍼 (한국 서울 시간 기준) ─────────
function todayStr() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}
function nextDay(dateStr) {
  if (!dateStr) return '';
  // 날짜 문자열을 직접 조작해서 타임존 오류 방지
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + 1);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

// ── 모달 열기 ─────────────────────────────
function openModal(mode, sheetName, task = null) {
  const existing = document.getElementById('taskModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'taskModal';
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  if (mode === 'bulk') {
    overlay.innerHTML = buildBulkModalHTML();
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    initBulkModal();
  } else {
    overlay.innerHTML = buildModalHTML(mode, sheetName, task);
    document.body.appendChild(overlay);
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.querySelector('#modalForm').addEventListener('submit', async e => {
      e.preventDefault();
      await submitModal(mode, sheetName, task);
    });
    // 숨기기 버튼
    overlay.querySelector('#modalHideBtn')?.addEventListener('click', () => {
      const dbKey = {campaign:'campaign',common:'common',report:'report'}[sheetName];
      if (!dbKey || !task) return;
      const t = DB[dbKey].find(x => String(x.id) === String(task.id));
      if (!t) return;
      const newHidden = !(t.hidden === true || t.hidden === 'TRUE');
      t.hidden = newHidden;
      callAppsScript({ action:'update', sheetName, id:task.id, row:{ hidden: newHidden ? 'TRUE' : 'FALSE' } }, { silent:true });
      showToast(newHidden ? `"${task.title}" 숨김 처리됐어요` : `"${task.title}" 숨김 해제됐어요`);
      closeModal();
      renderCurrentView();
    });
  }

  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeModal() {
  const modal = document.getElementById('taskModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => modal.remove(), 180);
}

// ──────────────────────────────────────────
//  캠페인 일괄 등록 모달
// ──────────────────────────────────────────
function buildBulkModalHTML() {
  const members = getActiveMembers();
  const brands  = DB.brands.filter(b => b.id && String(b.id) !== 'NaN' && b.label);

  const brandOpts = brands.map(b =>
    `<option value="${b.id}">${b.label}</option>`
  ).join('');

  const mediaChips = MEDIA_LIST.map(m =>
    `<label class="assignee-chip" data-media="${m}">
      <input type="checkbox" value="${m}" style="display:none;">
      <span style="font-size:11px;">${m}</span>
    </label>`
  ).join('');

  const memberChips = (assigneeStr = '') => members.map(m => {
    const info    = getMemberInfo(m.name);
    const checked = parseAssignees(assigneeStr).includes(m.name);
    return `<label class="assignee-chip ${checked?'checked':''}" data-name="${m.name}">
      <input type="checkbox" value="${m.name}" ${checked?'checked':''} style="display:none;">
      <div class="av-chip" style="background:${info.color}20;color:${info.color};border:1.5px solid ${info.color};width:20px;height:20px;font-size:8px;">${info.initials}</div>
      <span>${m.name}</span>
    </label>`;
  }).join('');

  const STEP_STYLE = {
    '소재기획': {bg:'#EEEDFE',c:'#3C3489'},
    '소재제작': {bg:'#FAEEDA',c:'#633806'},
    '소재등록': {bg:'#EAF3DE',c:'#27500A'},
    '소재검수': {bg:'#EAF3DE',c:'#27500A'},
  };

  const stepRows = FLOW_STEPS_BULK.map((step, i) => {
    const s = STEP_STYLE[step];
    const defaultStart = i === 0 ? todayStr() : '';
    const defaultEnd   = i === 0 ? todayStr() : '';
    return `<div class="bulk-step-row" data-step="${step}" data-idx="${i}">
      <span class="bulk-step-badge" style="background:${s.bg};color:${s.c};">${step}</span>
      <div class="bulk-date-range">
        <input type="date" class="field-input bulk-start" style="font-size:12px;padding:5px 8px;" data-idx="${i}" value="${defaultStart}" placeholder="시작일">
        <span style="font-size:11px;color:var(--color-text-tertiary);flex-shrink:0;">~</span>
        <input type="date" class="field-input bulk-end" style="font-size:12px;padding:5px 8px;" data-idx="${i}" value="${defaultEnd}" placeholder="기한">
      </div>
      <div class="assignee-picker bulk-assignee" data-idx="${i}">${memberChips()}</div>
    </div>`;
  }).join('');

  return `<div class="modal-box" style="max-width:560px;">
    <div class="modal-header">
      <span class="modal-title">캠페인 일정 등록</span>
      <button class="modal-close">✕</button>
    </div>
    <div class="modal-body" style="gap:14px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="field-group">
          <label class="field-label">브랜드<span class="field-required">*</span></label>
          <select class="field-input" id="bulkBrand">${brandOpts}</select>
        </div>
        <div class="field-group">
          <label class="field-label">업무명<span class="field-required">*</span></label>
          <input class="field-input" type="text" id="bulkTitle" placeholder="예: 5월 브랜드 캠페인">
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">우선순위</label>
        <select class="field-input" id="bulkPriority">
          <option value="일반">일반</option>
          <option value="긴급">🔴 긴급</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">매체 <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;">— 복수 선택 시 매체별 카드 각각 생성</span></label>
        <div class="assignee-picker" id="bulkMediaPicker" style="gap:5px;">${mediaChips}</div>
      </div>
      <div class="field-group">
        <label class="field-label">기본 담당자 <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;">— 단계별 변경 가능</span></label>
        <div class="assignee-picker" id="bulkDefaultAssignee">${memberChips()}</div>
      </div>
      <div style="height:.5px;background:var(--color-border-tertiary);"></div>
      <div class="field-group">
        <label class="field-label">내용 · 메모
          <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;margin-left:4px;">모든 단계 카드에 동일하게 적용</span>
        </label>
        <textarea class="field-input field-textarea" id="bulkNotes" rows="3" placeholder="내용 · 메모 입력"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">단계별 일정
          <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;">— 기한 변경 시 다음 단계 시작일 자동 업데이트</span>
        </label>
        <div style="display:flex;flex-direction:column;gap:7px;" id="bulkStepRows">${stepRows}</div>
        <div style="display:flex;align-items:center;gap:10px;padding:9px 12px;background:#E1F5EE;border-radius:8px;margin-top:7px;">
          <span style="font-size:11px;font-weight:600;color:#04342C;background:#9FE1CB;padding:3px 10px;border-radius:20px;white-space:nowrap;">Live</span>
          <span style="font-size:11px;color:#085041;">소재검수 완료 후 자동 생성 · 기한 없음</span>
        </div>
      </div>
    </div>
    <div class="modal-footer" style="justify-content:space-between;">
      <span id="bulkCountLabel" style="font-size:11px;color:var(--color-text-tertiary);">매체를 선택해주세요</span>
      <div style="display:flex;gap:8px;">
        <button type="button" class="modal-btn-cancel" onclick="closeModal()">취소</button>
        <button type="button" class="modal-btn-save" id="bulkSaveBtn" onclick="submitBulk()">일정 등록</button>
      </div>
    </div>
  </div>`;
}

function initBulkModal() {
  document.getElementById('bulkMediaPicker').addEventListener('click', e => {
    const chip = e.target.closest('.assignee-chip'); if (!chip) return;
    const cb = chip.querySelector('input');
    cb.checked = !cb.checked;
    chip.classList.toggle('checked', cb.checked);
    updateBulkCount();
  });

  document.getElementById('bulkDefaultAssignee').addEventListener('click', e => {
    const chip = e.target.closest('.assignee-chip'); if (!chip) return;
    const cb = chip.querySelector('input');
    cb.checked = !cb.checked;
    chip.classList.toggle('checked', cb.checked);
    const selected = [...document.querySelectorAll('#bulkDefaultAssignee .assignee-chip.checked')].map(c => c.dataset.name);
    document.querySelectorAll('.bulk-assignee').forEach(picker => {
      picker.querySelectorAll('.assignee-chip').forEach(ch => {
        const on = selected.includes(ch.dataset.name);
        ch.classList.toggle('checked', on);
        ch.querySelector('input').checked = on;
      });
    });
  });

  document.getElementById('bulkStepRows').addEventListener('click', e => {
    const chip = e.target.closest('.assignee-chip');
    if (!chip || !chip.closest('.bulk-assignee')) return;
    const cb = chip.querySelector('input');
    cb.checked = !cb.checked;
    chip.classList.toggle('checked', cb.checked);
  });

  document.getElementById('bulkStepRows').addEventListener('change', e => {
    if (e.target.classList.contains('bulk-end')) {
      const idx = Number(e.target.dataset.idx);
      const nextStart = document.querySelector(`.bulk-start[data-idx="${idx + 1}"]`);
      if (nextStart && !nextStart.value) nextStart.value = nextDay(e.target.value);
    }
    if (e.target.classList.contains('bulk-start')) {
      const idx = Number(e.target.dataset.idx);
      const endInput = document.querySelector(`.bulk-end[data-idx="${idx}"]`);
      if (endInput && endInput.value && endInput.value < e.target.value) endInput.value = e.target.value;
    }
  });
}

function updateBulkCount() {
  const selected = [...document.querySelectorAll('#bulkMediaPicker .assignee-chip.checked')].map(c => c.dataset.media);
  const label    = document.getElementById('bulkCountLabel');
  if (!selected.length) { label.innerHTML = '매체를 선택해주세요'; return; }

  let total = 0;
  selected.forEach((media, idx) => {
    const isSA     = SA_MEDIA.includes(media);
    const isSearch = SEARCH_MEDIA.includes(media);
    if (isSearch) total += 3; // 소재등록·소재검수·Live
    else if (selected.length > 1 && !isSA && idx > 0) total += 3; // 소재등록·소재검수·Live
    else total += 5; // 전체 단계
  });

  label.innerHTML = `저장 시 카드 <span style="color:var(--color-text-success);font-weight:500;">${total}개</span> 생성`;
}

// SA 매체 — 항상 소재기획부터 시작
const SA_MEDIA     = ['네이버 BSA', '네이버 PL', '네이버 보장', '네이버 신검'];
// 쇼검 — 소재등록부터 시작
const SEARCH_MEDIA = ['네이버 쇼검'];

async function submitBulk() {
  const brand        = document.getElementById('bulkBrand').value;
  const baseTitle    = document.getElementById('bulkTitle').value.trim();
  const priority     = document.getElementById('bulkPriority').value;
  const notes        = document.getElementById('bulkNotes').value.trim();
  const selectedMedia = [...document.querySelectorAll('#bulkMediaPicker .assignee-chip.checked')].map(c => c.dataset.media);
  const starts = [...document.querySelectorAll('.bulk-start')].map(i => i.value);
  const ends   = [...document.querySelectorAll('.bulk-end')].map(i => i.value);

  if (!baseTitle)            { showToast('업무명을 입력해주세요'); return; }
  if (!selectedMedia.length) { showToast('매체를 하나 이상 선택해주세요'); return; }
  if (ends.some(d => !d))    { showToast('모든 단계의 기한을 입력해주세요'); return; }

  const stepAssignees = [...document.querySelectorAll('.bulk-assignee')].map(picker =>
    [...picker.querySelectorAll('.assignee-chip.checked')].map(c => c.dataset.name).join(',')
  );

  const saveBtn = document.getElementById('bulkSaveBtn');
  saveBtn.textContent = '등록 중...'; saveBtn.disabled = true;

  try {
    const allRows = [];
    const multiMedia = selectedMedia.length > 1; // 매체 2개 이상 여부

    selectedMedia.forEach((media, mediaIdx) => {
      const titleWithMedia = `${baseTitle} · ${media}`;
      const isBid          = ['네이버 PL','네이버 쇼검'].includes(media);
      const isSA           = SA_MEDIA.includes(media);
      const isSearch       = SEARCH_MEDIA.includes(media);

      // 이 매체에서 생성할 단계 결정
      let steps;
      if (isSearch) {
        // 네이버 쇼검: 소재등록·소재검수·Live
        steps = ['소재등록','소재검수'];
      } else if (multiMedia && !isSA && mediaIdx > 0) {
        // 2번째 이상 일반 매체: 소재등록·소재검수·Live (기획·제작 건너뜀)
        steps = ['소재등록','소재검수'];
      } else {
        // 첫 번째 매체 or SA 매체: 전체 단계
        steps = FLOW_STEPS_BULK; // ['소재기획','소재제작','소재등록','소재검수']
      }

      // 단계별 날짜 인덱스 매핑 (FLOW_STEPS_BULK 기준)
      steps.forEach(step => {
        const stepIdx = FLOW_STEPS_BULK.indexOf(step);
        allRows.push({
          brand, title: titleWithMedia, priority,
          step, status: '진행중',
          media, hasBid: isBid ? 'TRUE' : 'FALSE',
          assignee: stepAssignees[stepIdx] || stepAssignees[0] || '',
          startDate: starts[stepIdx] || '',
          due: ends[stepIdx] || '',
          notes, driveUrl: '', driveLabel: '',
        });
      });

      // Live 단계 항상 추가
      allRows.push({
        brand, title: titleWithMedia, priority,
        step: 'Live', status: '진행중',
        media, hasBid: isBid ? 'TRUE' : 'FALSE',
        assignee: stepAssignees[stepAssignees.length - 1] || '',
        startDate: '', due: '',
        notes, driveUrl: '', driveLabel: '',
      });
    });

    // 로컬 DB에 먼저 추가 → 화면 즉시 갱신
    allRows.forEach(row => {
      row.id = 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2);
      addToLocalDB('campaign', row);
    });
    closeModal();
    renderCurrentView();
    showToast(`캠페인 일정 등록 완료 — 카드 ${allRows.length}개 생성됐어요`);

    // 백그라운드에서 Sheets에 순차 저장
    (async () => {
      for (const row of allRows) {
        try {
          const result = await callAppsScript({ action:'add', sheetName:'campaign', row });
          if (result?.id) {
            const t = DB.campaign.find(x => String(x.id) === String(row.id));
            if (t) t.id = result.id;
          }
        } catch(_) {}
      }
    })();
  } catch (err) {
    showToast('등록 실패: ' + err.message);
    saveBtn.textContent = '일정 등록'; saveBtn.disabled = false;
  }
}

// ──────────────────────────────────────────
//  일반 추가 · 수정 모달
// ──────────────────────────────────────────
function buildModalHTML(mode, sheetName, task) {
  const isEdit  = mode === 'edit';
  const members = getActiveMembers();
  const brands  = DB.brands.filter(b => b.id && String(b.id) !== 'NaN' && b.label);
  const v = (key, fallback = '') => task ? (task[key] ?? fallback) : fallback;

  const priorityField = `${fieldSelect('priority', '우선순위',
    [{value:'일반',label:'일반'},{value:'긴급',label:'🔴 긴급'}],
    v('priority','일반'))}`;

  let fields = '';

  if (sheetName === 'campaign') {
    const isLive = v('step') === 'Live';
    fields = `
      ${fieldText('title', '업무명', v('title'), true)}
      ${fieldSelect('brand', '브랜드', brands.map(b => ({value:b.id,label:b.label})), v('brand'), true)}
      ${fieldSelect('step', '단계', FLOW_STEPS_BULK.concat(['Live']).map(s => ({value:s,label:s})), v('step'), true)}
      ${fieldSelect('status', '상태', ['진행중','컨펌대기','완료'].map(s => ({value:s,label:s})), v('status','진행중'), true)}
      ${fieldSelect('media', '매체', [''].concat(MEDIA_LIST).map(s => ({value:s,label:s||'없음'})), v('media'))}
      ${fieldCheck('hasBid', '입찰가 관리 여부', v('hasBid', false))}
      ${fieldAssignee('assignee', '담당자', v('assignee'), members, true)}
      ${fieldDateRange('startDate', 'due', '기간', v('startDate'), v('due'), !isLive)}
      ${priorityField}
      ${fieldTextarea('notes', '내용 · 메모', v('notes'))}
      ${fieldText('driveUrl', 'Drive 링크', v('driveUrl'))}
      ${fieldText('driveLabel', '파일명', v('driveLabel'))}`;

  } else if (sheetName === 'common') {
    fields = `
      ${fieldSelect('type', '유형', ['미디어믹스','정산','광고비 확인','광고비 충전','입찰가 관리','기타'].map(s => ({value:s,label:s})), v('type','정산'), true)}
      ${fieldText('title', '업무명', v('title'), true)}
      ${fieldSelect('media', '매체', [''].concat(MEDIA_LIST).map(s => ({value:s,label:s||'없음'})), v('media'))}
      ${fieldAssignee('assignee', '담당자', v('assignee'), members, true)}
      ${fieldDateRange('startDate', 'due', '기간', v('startDate'), v('due'), true)}
      ${fieldRepeat(v('repeat'))}
      ${priorityField}
      ${fieldTextarea('notes', '내용 · 메모', v('notes'))}
      ${fieldText('driveUrl', 'Drive 링크', v('driveUrl'))}
      ${fieldText('driveLabel', '파일명', v('driveLabel'))}`;
    fields = `
      ${fieldSelect('brand', '브랜드', brands.map(b => ({value:b.id,label:b.label})), v('brand'), true)}
      ${fieldSelect('type', '유형', ['데일리','주간','분기','미팅'].map(s => ({value:s,label:s})), v('type','데일리'), true)}
      ${fieldText('title', '업무명', v('title'), true)}
      ${fieldAssignee('assignee', '담당자', v('assignee'), members, true)}
      ${fieldDateRange('startDate', 'due', '기간', v('startDate'), v('due'), true)}
      ${fieldRepeat(v('repeat'))}
      ${priorityField}
      ${fieldTextarea('notes', '내용 · 메모', v('notes'))}
      ${fieldText('driveUrl', 'Drive 링크', v('driveUrl'))}
      ${fieldText('driveLabel', '파일명', v('driveLabel'))}`;
  }

  return `<div class="modal-box">
    <div class="modal-header">
      <span class="modal-title">${isEdit ? '업무 수정' : '업무 추가'}</span>
      <button class="modal-close">✕</button>
    </div>
    <form id="modalForm" autocomplete="off" style="display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0;">
      <div class="modal-body">${fields}</div>
      <div class="modal-footer">
        ${isEdit ? `<button type="button" class="modal-btn-hide" id="modalHideBtn" title="이 업무를 숨깁니다 (삭제 아님)">
          ${v('hidden') === true || v('hidden') === 'TRUE' ? '숨김 해제' : '숨기기'}
        </button>` : ''}
        <button type="button" class="modal-btn-cancel" onclick="closeModal()">취소</button>
        <button type="submit" class="modal-btn-save" id="modalSaveBtn">저장</button>
      </div>
    </form>
  </div>`;
}

// ── 필드 헬퍼 ─────────────────────────────
function fieldTextarea(name, label, value = '') {
  return `<div class="field-group">
    <label class="field-label">${label}</label>
    <textarea class="field-input field-textarea" name="${name}" rows="3" placeholder="${label} 입력">${value}</textarea>
  </div>`;
}
function fieldText(name, label, value = '', required = false) {
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <input class="field-input" type="text" name="${name}" value="${value}" ${required?'required':''} placeholder="${label} 입력">
  </div>`;
}
function fieldSelect(name, label, options, selected = '', required = false) {
  const opts = options.map(o => `<option value="${o.value}" ${selected===o.value?'selected':''}>${o.label}</option>`).join('');
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <select class="field-input" name="${name}" ${required?'required':''}>${opts}</select>
  </div>`;
}
function fieldDateRange(startName, endName, label, startVal = '', endVal = '', required = false) {
  const today    = todayStr();
  const tomorrow = nextDay(today);
  const defaultEnd = endVal || today;
  const uid = Math.random().toString(36).slice(2, 7); // 고유 ID
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}
      <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;margin-left:4px;">시작일 생략 시 하루짜리 업무로 처리</span>
    </label>
    <div style="display:flex;gap:5px;margin-bottom:5px;">
      <button type="button" class="date-quick-btn" data-target="${uid}" data-date="${today}">오늘</button>
      <button type="button" class="date-quick-btn" data-target="${uid}" data-date="${tomorrow}">내일</button>
    </div>
    <div class="date-range-wrap">
      <input class="field-input date-range-start" type="date" name="${startName}" value="${startVal}" placeholder="시작일 (선택)">
      <span class="date-range-sep">~</span>
      <input class="field-input date-range-end" id="dateEnd_${uid}" type="date" name="${endName}" value="${defaultEnd}" ${required?'required':''} placeholder="기한">
    </div>
  </div>`;
}
function fieldDate(name, label, value = '', required = false) {
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <input class="field-input" type="date" name="${name}" value="${value}" ${required?'required':''}>
  </div>`;
}
function fieldCheck(name, label, checked = false) {
  return `<div class="field-group field-check-group">
    <label class="field-check-label">
      <input type="checkbox" name="${name}" ${checked?'checked':''}>
      <span>${label}</span>
    </label>
  </div>`;
}
function fieldAssignee(name, label, value = '', members = [], required = false) {
  const checkboxes = members.map(m => {
    const checked = parseAssignees(value).includes(m.name);
    const info    = getMemberInfo(m.name);
    return `<label class="assignee-chip ${checked?'checked':''}" data-name="${m.name}">
      <input type="checkbox" name="${name}_cb" value="${m.name}" ${checked?'checked':''} style="display:none;">
      <div class="av-chip" style="background:${info.color}20;color:${info.color};border:1.5px solid ${info.color};">${info.initials}</div>
      <span>${m.name}</span>
    </label>`;
  }).join('');
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <input type="hidden" name="${name}" value="${value}">
    <div class="assignee-picker" id="assigneePicker">${checkboxes}</div>
  </div>`;
}
function fieldRepeat(value = '') {
  return `<div class="field-group">
    <label class="field-label">반복 주기
      <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;margin-left:4px;">설정 시 대시보드 로드 시 자동 생성</span>
    </label>
    <select class="field-input" name="repeat">
      <option value="" ${!value?'selected':''}>반복 없음</option>
      <option value="daily"   ${value==='daily'  ?'selected':''}>매일</option>
      <option value="weekly"  ${value==='weekly' ?'selected':''}>매주 (같은 요일)</option>
      <option value="monthly" ${value==='monthly'?'selected':''}>매월 (같은 날짜)</option>
    </select>
  </div>`;
}

// ── 날짜 퀵 버튼 이벤트 ──────────────────
document.addEventListener('click', e => {
  const btn = e.target.closest('.date-quick-btn');
  if (!btn) return;
  const uid    = btn.dataset.target;
  const date   = btn.dataset.date;
  const endInput = document.getElementById(`dateEnd_${uid}`);
  if (endInput) {
    endInput.value = date;
    // 활성 버튼 표시
    btn.closest('.field-group').querySelectorAll('.date-quick-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
});

// ── 날짜 범위 유효성 ──────────────────────
document.addEventListener('change', e => {
  const wrap = e.target.closest('.date-range-wrap'); if (!wrap) return;
  const start = wrap.querySelector('.date-range-start');
  const end   = wrap.querySelector('.date-range-end');
  if (start.value && end.value && end.value < start.value) {
    if (e.target === start) end.value = start.value;
    else start.value = end.value;
  }
});

// ── 담당자 선택 이벤트 ────────────────────
document.addEventListener('click', e => {
  const chip = e.target.closest('.assignee-chip'); if (!chip) return;
  if (chip.closest('.bulk-assignee') || chip.closest('#bulkDefaultAssignee') || chip.closest('#bulkMediaPicker')) return;
  const cb = chip.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  chip.classList.toggle('checked', cb.checked);
  const picker = chip.closest('.assignee-picker');
  const hidden = picker?.parentElement.querySelector('input[type=hidden]');
  if (hidden) hidden.value = [...picker.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value).join(',');
});

// ── 일반 모달 제출 ────────────────────────
async function submitModal(mode, sheetName, task) {
  const form     = document.getElementById('modalForm');
  const saveBtn  = document.getElementById('modalSaveBtn');
  const formData = new FormData(form);
  const row = {};
  for (const [key, val] of formData.entries()) {
    if (key.endsWith('_cb')) continue;
    row[key] = val;
  }
  if (sheetName === 'campaign') {
    row.hasBid = form.querySelector('[name=hasBid]')?.checked ? 'TRUE' : 'FALSE';
  }

  if (mode === 'add') {
    // 임시 id 부여 → 화면 즉시 갱신 → 백그라운드 저장 → 실제 id로 교체
    row.id = 'temp_' + Date.now();
    addToLocalDB(sheetName, row);
    closeModal();
    renderCurrentView();
    showToast('업무가 추가됐어요');
    callAppsScript({ action:'add', sheetName, row }).then(result => {
      if (result?.id) {
        // 임시 id를 실제 id로 교체
        const key = {campaign:'campaign',common:'common',report:'report'}[sheetName];
        if (key) {
          const t = DB[key].find(x => String(x.id) === String(row.id));
          if (t) t.id = result.id;
        }
      }
    });
  } else {
    // 수정: 로컬 먼저 반영 → 화면 갱신 → 백그라운드 저장
    updateLocalDB(sheetName, task.id, row);
    closeModal();
    renderCurrentView();
    showToast('업무가 수정됐어요');
    callAppsScript({ action:'update', sheetName, id:task.id, row });
  }
}

// ── 로컬 DB 업데이트 ──────────────────────
function addToLocalDB(sheetName, row) {
  const key = {campaign:'campaign',common:'common',report:'report'}[sheetName];
  if (!key) return;
  // brand, assignee 등 텍스트 필드 문자열 보장
  if (row.brand)    row.brand    = String(row.brand);
  if (row.assignee) row.assignee = String(row.assignee);
  DB[key].push({...row, id:Number(row.id), hasBid:row.hasBid==='TRUE'||row.hasBid===true, done:row.done==='TRUE'||row.done===true});
}
function updateLocalDB(sheetName, id, row) {
  const key = {campaign:'campaign',common:'common',report:'report'}[sheetName];
  if (!key) return;
  const idx = DB[key].findIndex(t => String(t.id) === String(id));
  if (idx === -1) { console.warn('[updateLocalDB] id not found:', id); return; }
  const numId = Number(id);
  DB[key][idx] = {
    ...DB[key][idx], ...row,
    id: isNaN(numId) ? id : numId,
    hasBid: row.hasBid === 'TRUE' || row.hasBid === true,
    done:   row.done   === 'TRUE' || row.done   === true,
  };
}
