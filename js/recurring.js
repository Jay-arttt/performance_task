// ─────────────────────────────────────────
//  recurring.js  —  반복 업무 자동 생성
// ─────────────────────────────────────────
//
//  Sheets "공통업무" / "리포트미팅" 시트에
//  repeat 컬럼을 추가하세요:
//    daily    → 매일
//    weekly   → 매주 (같은 요일)
//    monthly  → 매월 (같은 날짜)
//
//  대시보드 로드 시 오늘 날짜 기준으로
//  반복 업무 카드를 자동으로 생성합니다.
// ─────────────────────────────────────────

function generateRecurringTasks() {
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayStr = today.toISOString().slice(0,10);

  // 공통업무 반복 처리
  const commonTemplates = DB.common.filter(t => t.repeat && t.repeat !== '');
  commonTemplates.forEach(template => {
    if (!shouldGenerateToday(template, today)) return;
    // 이미 오늘 날짜로 같은 제목 있으면 스킵
    const exists = DB.common.some(t =>
      t.title === template.title &&
      t.due === todayStr &&
      !t.repeat
    );
    if (exists) return;

    const newTask = {
      ...template,
      id: Date.now() + Math.random(),
      due: todayStr,
      startDate: todayStr,
      done: false,
      repeat: '', // 복사본은 반복 아님
      _isGenerated: true,
    };
    DB.common.push(newTask);
  });

  // 리포트 반복 처리
  const reportTemplates = DB.report.filter(t => t.repeat && t.repeat !== '');
  reportTemplates.forEach(template => {
    if (!shouldGenerateToday(template, today)) return;
    const exists = DB.report.some(t =>
      t.title === template.title &&
      t.due === todayStr &&
      !t.repeat
    );
    if (exists) return;

    const newTask = {
      ...template,
      id: Date.now() + Math.random(),
      due: todayStr,
      startDate: todayStr,
      done: false,
      repeat: '',
      _isGenerated: true,
    };
    DB.report.push(newTask);
  });
}

function shouldGenerateToday(task, today) {
  if (!task.repeat) return false;
  const repeat = task.repeat.toLowerCase().trim();

  if (repeat === 'daily') return true;

  if (repeat === 'weekly') {
    // 원본 due 날짜와 같은 요일인지
    if (!task.due) return false;
    const originalDay = new Date(task.due).getDay();
    return today.getDay() === originalDay;
  }

  if (repeat === 'monthly') {
    // 원본 due 날짜와 같은 날짜인지
    if (!task.due) return false;
    const originalDate = new Date(task.due).getDate();
    return today.getDate() === originalDate;
  }

  return false;
}

// ── 반복 업무 설정 UI (공통업무·리포트 모달에서 호출) ──
function fieldRepeat(value = '') {
  return `<div class="field-group">
    <label class="field-label">반복 주기
      <span style="font-size:10px;color:var(--color-text-tertiary);font-weight:400;margin-left:4px;">설정 시 매일 자동 생성</span>
    </label>
    <select class="field-input" name="repeat">
      <option value="" ${!value?'selected':''}>반복 없음</option>
      <option value="daily" ${value==='daily'?'selected':''}>매일</option>
      <option value="weekly" ${value==='weekly'?'selected':''}>매주 (같은 요일)</option>
      <option value="monthly" ${value==='monthly'?'selected':''}>매월 (같은 날짜)</option>
    </select>
  </div>`;
}
