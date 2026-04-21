// ─────────────────────────────────────────
//  recurring.js  —  반복 업무 일괄 생성
// ─────────────────────────────────────────
//
//  구글 캘린더 방식:
//  반복 업무 등록 시 지정한 기간(최대 2달) 동안
//  평일(월~금)마다 카드를 Sheets에 미리 생성
//
//  repeat 컬럼 값:
//    daily   → 평일마다
//    weekly  → 매주 같은 요일
//    monthly → 매월 같은 날짜
// ─────────────────────────────────────────

// 한국 시간 기준 날짜 문자열
function krDateStr(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
}

// 평일 여부
function isWeekday(date) {
  const d = date.getDay();
  return d !== 0 && d !== 6;
}

// 날짜 문자열 → Date (로컬 기준)
function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// 반복 업무 날짜 목록 생성
function getRepeatDates(repeat, startStr, endStr, templateDue) {
  const start = parseDate(startStr);
  const end   = parseDate(endStr);
  const dates = [];

  if (repeat === 'daily') {
    const cur = new Date(start);
    while (cur <= end) {
      if (isWeekday(cur)) dates.push(krDateStr(cur));
      cur.setDate(cur.getDate() + 1);
    }
  } else if (repeat === 'weekly') {
    const targetDay = templateDue ? parseDate(templateDue).getDay() : start.getDay();
    const cur = new Date(start);
    // 첫 번째 해당 요일로 이동
    while (cur.getDay() !== targetDay) cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
      if (isWeekday(cur)) dates.push(krDateStr(cur));
      cur.setDate(cur.getDate() + 7);
    }
  } else if (repeat === 'monthly') {
    const targetDate = templateDue ? parseDate(templateDue).getDate() : start.getDate();
    const cur = new Date(start.getFullYear(), start.getMonth(), targetDate);
    if (cur < start) cur.setMonth(cur.getMonth() + 1);
    while (cur <= end) {
      if (isWeekday(cur)) dates.push(krDateStr(cur));
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  return dates;
}

// 반복 업무 일괄 생성 (모달 저장 시 호출)
async function createRecurringTasks(sheetName, baseRow, repeatDates) {
  const rows = [];
  for (const dateStr of repeatDates) {
    const row = {
      ...baseRow,
      due: dateStr,
      startDate: dateStr,
      done: 'FALSE',
      repeat: '', // 개별 카드는 반복 아님
      id: 'temp_' + Date.now() + '_' + Math.random().toString(36).slice(2),
    };
    const dbKey = sheetName === 'common' ? 'common' : 'report';
    DB[dbKey].push({ ...row, done: false });
    rows.push(row);
  }

  // 백그라운드에서 Sheets에 순차 저장
  showToast(`반복 업무 ${rows.length}개 생성 중...`);
  for (const row of rows) {
    try {
      const result = await callAppsScript({ action: 'add', sheetName, row });
      if (result?.id) {
        const dbKey = sheetName === 'common' ? 'common' : 'report';
        const t = DB[dbKey].find(x => String(x.id) === String(row.id));
        if (t) t.id = result.id;
      }
    } catch(_) {}
  }
  showToast(`반복 업무 ${rows.length}개 등록됐어요`);
}

// 구버전 호환 — 대시보드 로드 시는 아무것도 안 함 (미리 생성 방식이므로)
function generateRecurringTasks() {
  // 반복 업무는 등록 시 미리 생성되므로 로드 시 생성 불필요
}

// ── 반복 주기 + 기간 설정 필드 ──────────
function fieldRepeat(repeatValue = '', repeatEndValue = '') {
  const today   = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  const maxDate = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 2);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  })();

  return `<div class="field-group">
    <label class="field-label">반복 주기</label>
    <select class="field-input" name="repeat" id="repeatSelect">
      <option value="" ${!repeatValue?'selected':''}>반복 없음</option>
      <option value="daily"   ${repeatValue==='daily'  ?'selected':''}>매일 (평일 월~금)</option>
      <option value="weekly"  ${repeatValue==='weekly' ?'selected':''}>매주 (같은 요일)</option>
      <option value="monthly" ${repeatValue==='monthly'?'selected':''}>매월 (같은 날짜)</option>
    </select>
    <div id="repeatRangeGroup" style="margin-top:8px;overflow:hidden;max-height:${repeatValue?'80px':'0'};transition:max-height .2s ease;opacity:${repeatValue?'1':'0'};">
      <label class="field-label" style="margin-bottom:4px;">반복 종료일
        <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;margin-left:4px;">최대 2달 (${maxDate}까지)</span>
      </label>
      <input class="field-input" type="date" id="repeatEndInput"
        value="${repeatEndValue || ''}"
        min="${today}" max="${maxDate}">
    </div>
  </div>`;
}
