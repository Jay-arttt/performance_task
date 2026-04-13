// ─────────────────────────────────────────
//  modal.js  —  업무 추가 · 수정 모달
// ─────────────────────────────────────────

// ── API 호출 ──────────────────────────────
async function callAppsScript(payload) {
  const res = await fetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || '저장 실패');
  return json;
}

// ── 모달 열기 ─────────────────────────────
function openModal(mode, sheetName, task = null) {
  const existing = document.getElementById('taskModal');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'taskModal';
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

  overlay.innerHTML = buildModalHTML(mode, sheetName, task);
  document.body.appendChild(overlay);

  // 닫기
  overlay.querySelector('.modal-close').addEventListener('click', closeModal);

  // 제출
  overlay.querySelector('#modalForm').addEventListener('submit', async e => {
    e.preventDefault();
    await submitModal(mode, sheetName, task);
  });

  // 애니메이션
  requestAnimationFrame(() => overlay.classList.add('show'));
}

function closeModal() {
  const modal = document.getElementById('taskModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => modal.remove(), 180);
}

// ── 모달 HTML 생성 ────────────────────────
function buildModalHTML(mode, sheetName, task) {
  const isEdit = mode === 'edit';
  const title = isEdit ? '업무 수정' : '업무 추가';
  const members = getActiveMembers();
  const brands = DB.brands;

  const v = (key, fallback = '') => task ? (task[key] ?? fallback) : fallback;

  let fields = '';

  if (sheetName === 'campaign') {
    fields = `
      ${fieldText('title', '업무명', v('title'), true)}
      ${fieldSelect('brand', '브랜드', brands.map(b => ({ value: b.id, label: b.label })), v('brand'), true)}
      ${fieldSelect('step', '단계', ['소재기획','소재제작','소재등록','소재검수','Live'].map(s => ({ value: s, label: s })), v('step'), true)}
      ${fieldSelect('status', '상태', ['진행중','컨펌대기','완료'].map(s => ({ value: s, label: s })), v('status', '진행중'), true)}
      ${fieldSelect('media', '매체', ['','Meta','GFA','네이버 BSA','네이버 PL','네이버 쇼검','구글','카카오'].map(s => ({ value: s, label: s || '없음' })), v('media'))}
      ${fieldCheck('hasBid', '입찰가 관리 여부', v('hasBid', false))}
      ${fieldAssignee('assignee', '담당자', v('assignee'), members, true)}
      ${fieldDate('due', '기한', v('due'), true)}
      ${fieldDate('startDate', '시작일 (간트용)', v('startDate'))}
      ${fieldText('driveUrl', 'Drive 링크', v('driveUrl'))}
      ${fieldText('driveLabel', '파일명', v('driveLabel'))}`;
  } else if (sheetName === 'common') {
    fields = `
      ${fieldSelect('type', '유형', ['미디어믹스','정산','광고비 확인','광고비 충전','입찰가 관리','기타'].map(s => ({ value: s, label: s })), v('type', '정산'), true)}
      ${fieldText('title', '업무명', v('title'), true)}
      ${fieldSelect('media', '매체', ['','Meta','GFA','네이버 BSA','네이버 PL','네이버 쇼검','구글','카카오'].map(s => ({ value: s, label: s || '없음' })), v('media'))}
      ${fieldAssignee('assignee', '담당자', v('assignee'), members, true)}
      ${fieldDate('due', '기한', v('due'), true)}
      ${fieldText('driveUrl', 'Drive 링크', v('driveUrl'))}
      ${fieldText('driveLabel', '파일명', v('driveLabel'))}`;
  } else if (sheetName === 'report') {
    fields = `
      ${fieldSelect('brand', '브랜드', brands.map(b => ({ value: b.id, label: b.label })), v('brand'), true)}
      ${fieldSelect('type', '유형', ['데일리','주간','분기','미팅'].map(s => ({ value: s, label: s })), v('type', '데일리'), true)}
      ${fieldText('title', '업무명', v('title'), true)}
      ${fieldAssignee('assignee', '담당자', v('assignee'), members, true)}
      ${fieldDate('due', '기한', v('due'), true)}
      ${fieldText('driveUrl', 'Drive 링크', v('driveUrl'))}
      ${fieldText('driveLabel', '파일명', v('driveLabel'))}`;
  }

  return `
    <div class="modal-box">
      <div class="modal-header">
        <span class="modal-title">${title}</span>
        <button class="modal-close">✕</button>
      </div>
      <form id="modalForm" autocomplete="off">
        <div class="modal-body">${fields}</div>
        <div class="modal-footer">
          <button type="button" class="modal-btn-cancel" onclick="closeModal()">취소</button>
          <button type="submit" class="modal-btn-save" id="modalSaveBtn">저장</button>
        </div>
      </form>
    </div>`;
}

// ── 필드 헬퍼 ─────────────────────────────
function fieldText(name, label, value = '', required = false) {
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <input class="field-input" type="text" name="${name}" value="${value}" ${required ? 'required' : ''} placeholder="${label} 입력">
  </div>`;
}

function fieldSelect(name, label, options, selected = '', required = false) {
  const opts = options.map(o => `<option value="${o.value}" ${selected === o.value ? 'selected' : ''}>${o.label}</option>`).join('');
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <select class="field-input" name="${name}" ${required ? 'required' : ''}>${opts}</select>
  </div>`;
}

function fieldDate(name, label, value = '', required = false) {
  return `<div class="field-group">
    <label class="field-label">${label}${required ? '<span class="field-required">*</span>' : ''}</label>
    <input class="field-input" type="date" name="${name}" value="${value}" ${required ? 'required' : ''}>
  </div>`;
}

function fieldCheck(name, label, checked = false) {
  return `<div class="field-group field-check-group">
    <label class="field-check-label">
      <input type="checkbox" name="${name}" ${checked ? 'checked' : ''}>
      <span>${label}</span>
    </label>
  </div>`;
}

function fieldAssignee(name, label, value = '', members = [], required = false) {
  const checkboxes = members.map(m => {
    const assignees = parseAssignees(value);
    const checked = assignees.includes(m.name);
    const info = getMemberInfo(m.name);
    return `<label class="assignee-chip ${checked ? 'checked' : ''}" data-name="${m.name}">
      <input type="checkbox" name="${name}_cb" value="${m.name}" ${checked ? 'checked' : ''} style="display:none;">
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

// ── 담당자 선택 이벤트 ────────────────────
document.addEventListener('click', e => {
  const chip = e.target.closest('.assignee-chip');
  if (!chip) return;
  const cb = chip.querySelector('input[type=checkbox]');
  cb.checked = !cb.checked;
  chip.classList.toggle('checked', cb.checked);

  const picker = chip.closest('.assignee-picker');
  const hidden = picker.parentElement.querySelector('input[type=hidden]');
  const selected = [...picker.querySelectorAll('input[type=checkbox]:checked')].map(c => c.value);
  hidden.value = selected.join(',');
});

// ── 제출 처리 ─────────────────────────────
async function submitModal(mode, sheetName, task) {
  const form = document.getElementById('modalForm');
  const saveBtn = document.getElementById('modalSaveBtn');
  const formData = new FormData(form);
  const row = {};

  for (const [key, val] of formData.entries()) {
    if (key.endsWith('_cb')) continue;
    row[key] = val;
  }

  // hasBid boolean 처리
  if (sheetName === 'campaign') {
    row.hasBid = form.querySelector('[name=hasBid]')?.checked ? 'TRUE' : 'FALSE';
  }

  saveBtn.textContent = '저장 중...';
  saveBtn.disabled = true;

  try {
    if (mode === 'add') {
      const result = await callAppsScript({ action: 'add', sheetName, row });
      row.id = result.id;
      addToLocalDB(sheetName, row);
      showToast('업무가 추가됐어요');
    } else {
      await callAppsScript({ action: 'update', sheetName, id: task.id, row });
      updateLocalDB(sheetName, task.id, row);
      showToast('업무가 수정됐어요');
    }
    closeModal();
    renderCurrentView();
  } catch (err) {
    showToast('저장 실패: ' + err.message);
    saveBtn.textContent = '저장';
    saveBtn.disabled = false;
  }
}

// ── 로컬 DB 업데이트 ──────────────────────
function addToLocalDB(sheetName, row) {
  const map = { campaign: 'campaign', common: 'common', report: 'report' };
  const key = map[sheetName];
  if (!key) return;
  const parsed = { ...row, id: Number(row.id), hasBid: row.hasBid === 'TRUE' || row.hasBid === true, done: row.done === 'TRUE' || row.done === true };
  DB[key].push(parsed);
}

function updateLocalDB(sheetName, id, row) {
  const map = { campaign: 'campaign', common: 'common', report: 'report' };
  const key = map[sheetName];
  if (!key) return;
  const idx = DB[key].findIndex(t => String(t.id) === String(id));
  if (idx === -1) return;
  DB[key][idx] = { ...DB[key][idx], ...row, id: Number(id), hasBid: row.hasBid === 'TRUE' || row.hasBid === true, done: row.done === 'TRUE' || row.done === true };
}
