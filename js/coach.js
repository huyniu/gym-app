// Coaching: set and exercise grading, load suggestions, warm-ups, plates, swaps, effort, deload, pain, readiness, weekly sets, workout review.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

const barKg = () => S.settings.barKg || 20;
const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
function platesText(w, load) {
  if (load !== 'bb' && load !== 'smith') return '';
  const bar = load === 'bb' ? barKg() : 0;
  let side = (w - bar) / 2; if (side <= 0) return load === 'bb' ? 'Thanh không' : '';
  const out = []; for (const p of PLATES) while (side >= p - 1e-9) { out.push(p); side -= p; }
  return (out.length ? 'Mỗi bên: ' + out.map(fmtNum).join(' + ') : '') + (side > .01 ? ` (lẻ ${fmtNum(Math.round(side * 2 * 100) / 100)} kg)` : '');
}
// Warm-up only for the first exercise that works these muscles in the session, before its first set.
function warmups(ex, i) {
  const load = EX_LOAD[ex.name]; if (!load || load === 'body' || isCardio(ex.name) || ex.sets.some(s => s.done)) return null;
  const a = S.active, p = getEx(ex.name)?.p || [];
  if (a.exercises.slice(0, i).some(e => e.sets.some(s => s.done) && (getEx(e.name)?.p || []).some(m => p.includes(m)))) return null;
  const w = setVal(ex, 0, 'w'), step = load === 'db' ? 1 : 2.5, rnd = v => Math.round(v / step) * step;
  if (load === 'bb' || load === 'smith') {
    const bar = load === 'bb' ? barKg() : 0; if (w < bar + 20) return null;
    const out = load === 'bb' ? [[bar, 10]] : [];
    for (const [k, r] of [[.4, 8], [.6, 5], [.8, 3]]) { const v = rnd(w * k); if (v > (out[out.length - 1]?.[0] || 0) && v < w) out.push([v, r]); }
    return out;
  }
  if (w < (load === 'db' ? 10 : 20)) return null;
  return [[rnd(w * .5), 10], [rnd(w * .75), 5]].filter(([v]) => v > 0 && v < w);
}

function swapCandidates(name) {
  const x = getEx(name); if (!x) return [];
  const used = new Set(S.active.exercises.map(e => e.name));
  return EX_DB.map(e => getEx(e[0])).filter(y => y && y.name !== name && !used.has(y.name) && !isCardio(y.name) && y.p.some(m => x.p.includes(m)) && painHit(y.name)?.level !== 'p')
    .map(y => ({ n: y.name, s: 3 * y.p.filter(m => x.p.includes(m)).length + (y.s || []).filter(m => (x.s || []).includes(m)).length - y.p.filter(m => !x.p.includes(m)).length + (exImg(y.name, 0) ? .5 : 0) + (name.split(' ').slice(-1)[0] === y.name.split(' ').slice(-1)[0] ? 2 : 0) }))
    .sort((a, b) => b.s - a.s).slice(0, 8).map(o => o.n);
}
function openSwap(i) {
  const ex = S.active.exercises[i], c = swapCandidates(ex.name);
  openSheet(`<div class="sheet-h"><h3>Đổi bài</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="muted small" style="margin-bottom:8px">Thay cho <b>${esc(exTitle(ex.name))}</b>, cùng nhóm cơ chính:</div>
    ${c.length ? c.map(n => `<button class="swap-row" data-act="swapTo" data-i="${i}" data-name="${esc(n)}">${exTag(n)}${ic('chev')}</button>`).join('') : '<div class="empty">Không có bài tương tự</div>'}`);
}
function swapTo(i, name) {
  const a = S.active, ex = a.exercises[i], done = ex.sets.filter(s => s.done).length, left = ex.sets.length - done;
  const fresh = { name, sets: Array.from({ length: Math.max(1, left) }, () => ({ w: '', r: '', done: false })), planSets: Math.max(1, left), ...(ex.reps ? { reps: ex.reps } : {}), ...(ex.rest ? { rest: ex.rest } : {}) };
  if (done) { ex.sets = ex.sets.filter(s => s.done); ex.planSets = done; a.exercises.splice(i + 1, 0, fresh); focusEx = i + 1; }
  else { a.exercises[i] = fresh; focusEx = i; }
  save(); closeSheet(); render(); toast(`Đã đổi sang ${exTitle(name)}`);
}

const RIR = [[0, 'Hết sức'], [1, 'Còn 1'], [2, 'Còn 2'], [3, 'Còn 3+']];
function setGrade(ex, j) {
  const s = ex.sets[j]; if (!s?.done || isCardio(ex.name)) return null;
  const w = num(s.w), r = num(s.r), tr = parseReps(ex.reps), body = isBodyEx(ex.name), notes = [];
  const last = lastSets(ex.name), p = last && last[j], hint = ex.reps ? weightHint(ex.name, ex.reps) : null;
  const step = body ? 0 : EX_LOAD[ex.name] === 'db' ? 1 : 2.5;
  let score = 100, adj = 0;
  if (tr && r < tr[0]) { score -= Math.min(45, 15 * (tr[0] - r)); notes.push(`thiếu ${tr[0] - r} rep so với mục tiêu ${tr[0]}–${tr[1]}`); }
  else if (tr && r >= tr[1]) notes.push(`chạm ${tr[1]} rep`);
  else if (tr) notes.push(`trong khoảng ${tr[0]}–${tr[1]} rep`);
  if (p) {
    const now = body ? r : e1rm(w, r), was = body ? p.r : e1rm(p.w, p.r);
    if (now > was * 1.01) notes.push(body ? `hơn lần trước ${r - p.r} rep` : `mạnh hơn lần trước (${fmtSet(p, ex.name)})`);
    else if (now < was * .97) { score -= 10; notes.push(`yếu hơn lần trước (${fmtSet(p, ex.name)})`); }
    else notes.push(`ngang lần trước (${fmtSet(p, ex.name)})`);
  }
  if (!body && hint && !S.active?.wF && w < hint.w - .01) { score -= 10; notes.push(`nhẹ hơn mức gợi ý ${fmtNum(hint.w)} kg`); }
  if (s.rir === 0 && tr && r < tr[0]) { score -= 5; if (step) adj = -step; }
  else if (s.rir != null && s.rir >= 3 && tr && r >= tr[0]) { score -= 5; notes.push('còn dư sức nhiều, tạ hơi nhẹ'); if (step) adj = step; }
  else if (tr && r >= tr[1] && step && (s.rir == null || s.rir >= 2)) adj = step;
  else if (tr && r < tr[0] - 1 && step) adj = -step;
  score = Math.max(0, Math.min(100, Math.round(score)));
  const label = score >= 90 ? 'Tốt' : score >= 70 ? 'Đạt' : score >= 50 ? 'Tạm' : 'Chưa đạt';
  return { score, label, col: score >= 90 ? 'var(--ok)' : score >= 70 ? 'var(--accent)' : score >= 50 ? 'var(--warn)' : 'var(--danger)', notes, adj, next: !body && adj ? Math.max(0, w + adj) : null };
}
// feedback for the set just finished, shown during the rest with a one-tap fix for the next set
function setFeedback() {
  const a = S.active, ls = a?.lastSet; if (!ls) return '';
  const ex = a.exercises[ls.i], g = ex && setGrade(ex, ls.j); if (!g) return '';
  const nextJ = ex.sets.findIndex(s => !s.done), canAdj = g.next != null && nextJ >= 0;
  return `<div class="sfb"><span class="sfb-s" style="background:${g.col}">${g.score}</span><div class="grow"><b style="color:${g.col}">Hiệp ${ls.j + 1}: ${g.label}</b><small>${esc(g.notes.join(' · '))}</small></div>
    ${canAdj ? `<button class="sfb-adj" data-act="setAdj" data-w="${g.next}">Hiệp sau ${g.adj > 0 ? '↑' : '↓'} ${fmtNum(g.next)} kg</button>` : ''}</div>`;
}
function rirChips() {
  const a = S.active, ls = a?.lastSet; if (!ls) return '';
  const ex = a.exercises[ls.i], s = ex?.sets[ls.j]; if (!s || !s.done || isCardio(ex.name)) return '';
  return `<div class="rir"><span>Hiệp vừa rồi còn sức mấy rep?</span><div>${RIR.map(([v, l]) => `<button class="${s.rir === v ? 'on' : ''}" data-act="setRir" data-v="${v}">${l}</button>`).join('')}</div></div>`;
}

const deloadOn = () => S.deload && Date.now() < S.deload.until;
function deloadCheck() {
  if (deloadOn() || (S.deloadSnooze && Date.now() - S.deloadSnooze < 14 * 864e5) || S.workouts.length < 8) return null;
  const since = Math.max(S.deload?.until || 0, Math.min(...S.workouts.map(w => w.startedAt))), weeks = Math.floor((Date.now() - since) / (7 * 864e5));
  // stalled = best estimated 1RM of the last 3 sessions is not above the 3 before
  const by = {};
  for (const w of [...S.workouts].reverse()) for (const e of w.exercises) if (!isCardio(e.name) && e.sets.length) (by[e.name] = by[e.name] || []).push(Math.max(...e.sets.map(s => e1rm(s.w, s.r))));
  const stalled = Object.entries(by).filter(([, v]) => v.length >= 6 && Math.max(...v.slice(-3)) <= Math.max(...v.slice(-6, -3)) * 1.005).map(([n]) => n);
  const nights = [1, 2, 3, 4, 5, 6, 7].map(i => S.sleep?.[addDays(dayKey(), -i)]).filter(Boolean), shortSleep = nights.length >= 4 && nights.filter(e => sleepMin(e) < 360).length >= 4;
  const why = [];
  if (stalled.length >= 2) why.push(`${stalled.length} bài đứng yên hoặc tụt 3 buổi liền (${stalled.slice(0, 3).map(exTitle).join(', ')})`);
  if (weeks >= 6) why.push(`đã tập liên tục ${weeks} tuần chưa nghỉ giảm tải`);
  if (shortSleep && stalled.length) why.push('ngủ dưới 6 tiếng nhiều đêm trong tuần');
  return why.length && (stalled.length >= 2 || weeks >= 6) ? why : null;
}
function deloadCard() {
  if (deloadOn()) { const d = Math.ceil((S.deload.until - Date.now()) / 864e5);
    return `<div class="card deload on"><div class="row gap"><span class="qt-ic">${ic('drop')}</span><div class="grow"><b>Tuần giảm tải</b><small>Còn ${d} ngày · bớt ~40% số hiệp, tạ ~90%</small></div>
      <button class="link" data-act="deloadEnd">Kết thúc</button></div></div>`; }
  const why = deloadCheck(); if (!why) return '';
  return `<div class="card deload"><div class="row gap"><span class="qt-ic">${ic('drop')}</span><div class="grow"><b>Nên có 1 tuần giảm tải</b><small>${why.map(esc).join('; ')}</small></div></div>
    <div class="row gap mt"><button class="btn" data-act="deloadSnooze">Để sau</button><button class="btn primary grow" data-act="deloadStart">Bắt đầu tuần nhẹ</button></div></div>`;
}

const PAIN = { 'Vai': ['frontDelt', 'sideDelt', 'rearDelt'], 'Khuỷu tay': ['biceps', 'triceps'], 'Cổ tay': ['forearms'], 'Cổ / cầu vai': ['traps'],
  'Ngực': ['chest'], 'Lưng dưới': ['lowerBack'], 'Hông': ['glutes', 'adductors'], 'Gối': ['quads', 'hamstrings'], 'Cổ chân': ['calves'] };
// heavy compound lifts that load the lower back / knees even when those are not listed as primary
const PAIN_EX = { 'Lưng dưới': /Deadlift|Squat|Good Morning|Barbell Row|Rack Pull|Swing/i, 'Gối': /Squat|Lunge|Leg Press|Leg Extension|Step|Split/i, 'Vai': /Press|Dip|Push-up|Bench/i };
const painNow = () => (S.pain || []).map(p => p.area);
function painHit(name) {
  const x = getEx(name); if (!x) return null;
  for (const a of painNow()) {
    const ms = PAIN[a] || [];
    if (x.p.some(m => ms.includes(m)) || PAIN_EX[a]?.test(name)) return { area: a, level: 'p' };
    if ((x.s || []).some(m => ms.includes(m))) return { area: a, level: 's' };
  }
  return null;
}
function painCard() {
  const on = painNow();
  return `<div class="card pain"><div class="row gap"><b class="grow">${ic('info')} Đang đau ở đâu?</b>${on.length ? `<span class="muted small">${on.length} vùng</span>` : ''}</div>
    <div class="chips wrap mt">${Object.keys(PAIN).map(a => `<button class="chip${on.includes(a) ? ' on danger' : ''}" data-act="painToggle" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div>
    ${on.length ? `<div class="muted small mt">Bài dồn lực vào ${on.map(esc).join(', ').toLowerCase()} sẽ bị đánh dấu khi tập và được gợi ý đổi. Đau nhói, sưng hoặc kéo dài hơn 1 tuần thì đi khám.</div>` : ''}</div>`;
}
let readyDraft = null;
const READY_E = [['Mệt', -2], ['Bình thường', 0], ['Sung', 1]], READY_S = [['Không', 0], ['Hơi mỏi', -1], ['Đau nhiều', -2]];
function readyPlan(r) {
  const sl = lastNight(), h = sl ? sleepMin(sl) / 60 : r.sleepAns;
  const pts = (h == null ? 0 : h < 6 ? -2 : h < 7 ? -1 : 0) + READY_E[r.energy][1] + READY_S[r.sore][1];
  const level = pts <= -3 ? 2 : pts <= -1 ? 1 : 0;
  return { pts, level, setsF: [1, .75, .6][level], wF: [1, .95, .9][level], h };
}
function quickExs(exs) { return exs.slice(0, 3).map(e => ({ ...e, sets: Math.min(3, e.sets), rest: Math.min(e.rest || S.settings.rest, 75) })); }
function openReady(name, exercises, extra) {
  readyDraft = readyDraft && readyDraft.name === name ? { ...readyDraft, exercises, extra } : { name, exercises, extra, energy: 1, sore: 0, sleepAns: null, quick: false };
  renderReady();
}
function renderReady() {
  const r = readyDraft, p = readyPlan(r), sl = lastNight(), exs = r.quick ? quickExs(r.exercises) : r.exercises;
  const seg = (k, opts) => `<div class="seg">${opts.map(([l], i) => `<button class="${r[k] === i ? 'on' : ''}" data-act="readySet" data-k="${k}" data-v="${i}">${l}</button>`).join('')}</div>`;
  const msg = [['Bình thường', 'Tập đủ kế hoạch.' + (READY_E[r.energy][1] > 0 && p.pts >= 0 ? ' Hôm nay khỏe: thử lên tạ nếu được gợi ý.' : '')],
    ['Buổi nhẹ', 'Bớt ~25% số hiệp, tạ ~95%.'], ['Buổi rất nhẹ', 'Bớt ~40% số hiệp, tạ ~90%. Tập cho có, đừng cố.']][p.level];
  openSheet(`<div class="sheet-h"><h3>Trước khi tập</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="rd-q"><span>Đêm qua ngủ</span>${sl ? `<b>${fmtHM(sleepMin(sl))}</b>` : `<div class="seg">${[['Dưới 6 tiếng', 5], ['Khoảng 6–7', 6.5], ['Đủ 7+', 8]].map(([l, v]) => `<button class="${r.sleepAns === v ? 'on' : ''}" data-act="readySleep" data-v="${v}">${l}</button>`).join('')}</div>`}</div>
    <div class="rd-q"><span>Năng lượng</span>${seg('energy', READY_E)}</div>
    <div class="rd-q"><span>Đau mỏi cơ</span>${seg('sore', READY_S)}</div>
    <button class="rd-quick${r.quick ? ' on' : ''}" data-act="readyQuick">${ic('clock')}<span class="grow"><b>Chỉ có khoảng 30 phút</b><small>Giữ 3 bài đầu (bài chính), tối đa 3 hiệp, nghỉ 75 giây</small></span><i>${r.quick ? ic('check') : ''}</i></button>
    <div class="rd-res lv${p.level}"><b>${msg[0]}</b><span>${msg[1]}</span><small>${exs.length} bài · ~${estMinutes(exs.map(e => ({ ...e, sets: Math.max(1, Math.round(e.sets * p.setsF)) })))} phút</small></div>
    <button class="btn primary big mt" data-act="readyGo">${ic('play')} Bắt đầu</button>
    <button class="text-btn" data-act="readySkip">Bỏ qua, tập theo kế hoạch</button>`, () => { readyDraft = null; });
}
function readyGo(skip) {
  const r = readyDraft; if (!r) return;
  const p = readyPlan(r), mode = skip ? null : { setsF: p.setsF, wF: p.wF, quick: r.quick, ready: { energy: READY_E[r.energy][0], sore: READY_S[r.sore][0], level: p.level } };
  readyDraft = null; sheetOnClose = null; closeSheet();
  startFrom(r.name, r.exercises, { ...r.extra, ...(mode ? { mode } : {}) });
}

const SET_TARGET = { chest: [10, 20], lats: [10, 20], midBack: [8, 16], sideDelt: [8, 16], rearDelt: [6, 12], frontDelt: [4, 12], biceps: [8, 16], triceps: [8, 16], quads: [10, 20], hamstrings: [8, 16],
  glutes: [8, 16], calves: [6, 12], abs: [6, 12], obliques: [4, 10], traps: [4, 10], forearms: [4, 10], lowerBack: [4, 10], adductors: [4, 10] };
const MAJOR = ['chest', 'lats', 'sideDelt', 'rearDelt', 'biceps', 'triceps', 'quads', 'hamstrings'];
function weekSets(ws) {
  const out = Object.fromEntries(Object.keys(MUSCLES).map(m => [m, { n: 0, from: {} }]));
  for (const w of S.workouts) if (w.startedAt >= ws && w.startedAt < ws + 7 * 864e5)
    for (const e of w.exercises) {
      const x = getEx(e.name); if (!x || isCardio(e.name)) continue;
      const n = e.sets.length; if (!n) continue;
      const add = (m, k) => { if (!out[m]) return; out[m].n += n * k; out[m].from[e.name] = (out[m].from[e.name] || 0) + n * k; };
      x.p.forEach(m => add(m, 1)); (x.s || []).forEach(m => add(m, .5));
    }
  return out;
}
const setCol = (m, n) => { const [lo, hi] = SET_TARGET[m]; return n <= 0 ? null : n > hi ? '#ef4444' : n >= lo ? '#22c55e' : n >= lo / 2 ? '#eab308' : '#f97316'; };
let setsWeek = null;
function weekSetsCard() {
  const ws = setsWeek ?? weekStart(), cur = weekSets(ws), prev = weekSets(ws - 7 * 864e5), isNow = ws === weekStart();
  const first = S.workouts.length ? weekStart(Math.min(...S.workouts.map(w => w.startedAt))) : ws;
  const lbl = t => new Date(t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  const ms = Object.keys(SET_TARGET).sort((a, b) => MAJOR.includes(b) - MAJOR.includes(a));
  const row = m => { const n = cur[m].n, [lo, hi] = SET_TARGET[m], c = setCol(m, n) || '#5f6470', d = n - prev[m].n;
    return `<button class="sets-row" data-act="setsMuscle" data-m="${m}" data-w="${ws}"><span class="sr-n">${MUSCLES[m]}</span>
      <span class="bar thin grow"><i style="width:${Math.min(100, n / lo * 100)}%;background:${c}"></i></span>
      <b style="color:${c}">${fmtNum(n)}</b><span class="muted small sr-t">/ ${lo}–${hi}</span>${isNow ? `<span class="sr-d">${prev[m].n ? fmtNum(prev[m].n) : '–'}</span>` : `<span class="sr-d ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d ? (d > 0 ? '+' : '') + fmtNum(d) : ''}</span>`}</button>`; };
  const short = ms.filter(m => cur[m].n < SET_TARGET[m][0]);
  let gap = '';
  if (isNow && S.workouts.length) {
    const st = schedState(), left = st ? Object.values(st.plan) : [];
    const majorShort = short.filter(m => MAJOR.includes(m));
    if (majorShort.length) gap = majorShort.slice(0, 3).map(m => {
      const need = SET_TARGET[m][0] - cur[m].n, r = left.find(r => r.exercises.some(e => getEx(e.name)?.p.includes(m)));
      return `${MUSCLES[m]} thiếu ${fmtNum(need)} set${r ? ` → thêm vào buổi ${esc(r.name)}` : ''}`;
    }).join('<br>');
  }
  return `<div class="section-h"><h2>Số set mỗi tuần ${tip('sets')}</h2></div>
    <div class="card">
      <div class="cal-h"><button class="icon" data-act="setsNav" data-v="-1" ${ws > first ? '' : 'disabled'} aria-label="Tuần trước">${ic('back')}</button>
        <div style="text-align:center"><b>${isNow ? 'Tuần này' : 'Tuần ' + lbl(ws)}</b><div class="muted small">${lbl(ws)} – ${lbl(ws + 6 * 864e5)}</div></div>
        <button class="icon" data-act="setsNav" data-v="1" ${isNow ? 'disabled' : ''} aria-label="Tuần sau">${ic('chev')}</button></div>
      <div class="sets-fig">${bodySvg(m => setCol(m, cur[m].n), {})}</div>
      <div class="legend"><span><i style="background:#f97316"></i>&lt;50%</span><span><i style="background:#eab308"></i>Chưa đủ</span><span><i style="background:#22c55e"></i>Đủ</span><span><i style="background:#ef4444"></i>Quá nhiều</span></div>
      <div class="muted small" style="text-align:center;margin:6px 0 4px">Đủ ${ms.length - short.length}/${ms.length} nhóm cơ</div>
      ${ms.map(row).join('')}
      ${gap ? `<div class="coach" style="margin:12px 0 0">${ic('bulb')}<div class="grow"><div class="coach-k">Còn thiếu tuần này</div>${gap}</div></div>` : ''}
    </div>`;
}
function openSetsMuscle(m, ws) {
  const x = weekSets(+ws)[m], [lo, hi] = SET_TARGET[m], list = Object.entries(x.from).sort((a, b) => b[1] - a[1]);
  openSheet(`<div class="sheet-h"><h3>${MUSCLES[m]}: ${fmtNum(x.n)} set</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="muted small" style="margin-bottom:8px">Khuyến nghị ${lo}–${hi} set/tuần để tăng cơ. Dưới ${lo}: cơ phát triển chậm. Trên ${hi}: dễ quá tải, hồi phục không kịp.</div>
    ${list.length ? list.map(([n, k]) => `<div class="food" style="align-items:center"><span class="grow">${exTag(n)}</span><b>${fmtNum(k)} set</b></div>`).join('') : '<div class="empty">Tuần này chưa có bài nào cho nhóm cơ này.</div>'}`);
}

// Next-weight hint: every set of the last session reached the top of the rep range -> add one step.
function weightHint(name, reps) {
  const r = parseReps(reps), last = lastSets(name);
  if (!r || !last || isCardio(name)) return null;
  const top = Math.max(...last.map(s => s.w));
  if (!top) return null;
  const rated = last.filter(s => s.rir != null), step = weightStep(name);
  if (last.every(s => s.r >= r[1]) || (rated.length === last.length && rated.every(s => s.rir >= 3) && last.every(s => s.r >= r[0]))) return { w: top + step, up: true };
  if (rated.filter(s => s.rir === 0).length >= 2 && last.some(s => s.r < r[0])) return { w: Math.max(0, Math.round(top * .95 / 2.5) * 2.5), up: false, down: true };
  return { w: top, up: false };
}
function weeklySets(until) {
  const sets = {};
  for (const w of S.workouts) if (w.startedAt > until - 7 * 864e5 && w.startedAt <= until)
    for (const e of w.exercises) (getEx(e.name)?.p || []).forEach(m => sets[m] = (sets[m] || 0) + e.sets.length);
  return sets;
}
function reviewWorkout(w) {
  const items = [], plan = w.plan || [];
  let planned = 0, done = 0, hit = 0, withTarget = 0, cmp = 0, better = 0;
  for (const p of plan) {
    planned += p.sets;
    const e = w.exercises.find(x => x.name === p.name);
    if (!e) { items.push(['warn', `Bỏ bài ${p.name}`]); continue; }
    done += Math.min(p.sets, e.sets.length);
    if (e.sets.length < p.sets && !isCardio(p.name)) items.push(['warn', `${p.name}: ${e.sets.length}/${p.sets} set`]);
  }
  for (const e of w.exercises) {
    if (isCardio(e.name)) { items.push(['ok', `${e.name}: ${e.sets.reduce((a, s) => a + s.r, 0)} phút cardio`]); continue; }
    const pl = plan.find(p => p.name === e.name), r = parseReps(pl?.reps), top = Math.max(...e.sets.map(s => s.w));
    if (r) {
      withTarget++;
      const allTop = e.sets.length >= (pl?.sets || 0) && e.sets.every(s => s.r >= r[1]), under = e.sets.filter(s => s.r < r[0]).length;
      if (allTop && top > 0) { hit++; items.push(['up', `${e.name}: đạt ${r[1]} rep mọi set → buổi sau lên ${fmtNum(top + weightStep(e.name))} kg`]); }
      else if (under) items.push(['warn', `${e.name}: ${under} set dưới ${r[0]} rep → giữ ${fmtNum(top)} kg hoặc giảm nhẹ`]);
      else { hit += .6; items.push(['ok', `${e.name}: trong khoảng ${r[0]}–${r[1]} rep, giữ ${fmtNum(top)} kg và cố thêm rep`]); }
    }
    const prev = prevSession(e.name, w.startedAt);
    if (prev) {
      cmp++;
      const b = Math.max(...e.sets.map(s => e1rm(s.w, s.r))), pb = Math.max(...prev.sets.map(s => e1rm(s.w, s.r)));
      if (b > pb * 1.01) { better++; if (!r) items.push(['up', `${e.name}: mạnh hơn lần trước (1RM ~${fmtNum(Math.round(pb))} → ${fmtNum(Math.round(b))} kg)`]); }
      else if (b >= pb * .97) better += .7;
      else items.push(['warn', `${e.name}: yếu hơn lần trước (1RM ~${fmtNum(Math.round(pb))} → ${fmtNum(Math.round(b))} kg). Ngủ đủ, ăn đủ chưa?`]);
    }
  }
  w.exercises.filter(e => e.skipped).forEach(e => items.push(['warn', `${e.name}: bỏ qua set bù được yêu cầu`]));
  (w.prs || []).forEach(n => items.unshift(['pr', `PR mới: ${n}`]));
  // Weekly volume per muscle — only once there is more than a week of history.
  if (S.workouts.some(x => x.startedAt < w.startedAt - 6 * 864e5)) {
    const ws = weeklySets(w.startedAt), mine = [...new Set(w.exercises.flatMap(e => getEx(e.name)?.p || []))];
    for (const m of mine) {
      if (ws[m] < 10) items.push(['info', `${MUSCLES[m]}: ${ws[m]} set/7 ngày — nên 10–20 set để tăng cơ`]);
      else if (ws[m] > 22) items.push(['info', `${MUSCLES[m]}: ${ws[m]} set/7 ngày — hơi nhiều, chú ý phục hồi`]);
    }
  }
  const completion = planned ? done / planned : 1, hitR = withTarget ? hit / withTarget : 1, prog = cmp ? better / cmp : 1;
  const score = Math.round(100 * (.45 * completion + .3 * hitR + .25 * prog));
  const grade = score >= 85 ? 'Xuất sắc' : score >= 70 ? 'Tốt' : score >= 50 ? 'Ổn' : 'Cần cố gắng';
  return { score, grade, items, completion };
}
const REV_IC = { pr: ['trophy', 'var(--warn)'], up: ['up', 'var(--accent)'], ok: ['check', 'var(--ok)'], warn: ['info', 'var(--danger)'], info: ['pulse', 'var(--muted)'] };
function openReview(id, offerRoutine) {
  const w = S.workouts.find(x => x.id === id); if (!w) return;
  const r = reviewWorkout(w), a = w.ai;
  openSheet(`<div class="sheet-h"><h3>Đánh giá buổi tập</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="score"><div class="ring" style="--p:${r.score}"><b>${r.score}</b></div>
      <div><div class="title">${r.grade}</div><div class="muted small">${esc(w.name)} · ${fmtDur(w.endedAt - w.startedAt)}${w.plan?.length ? ` · xong ${Math.round(r.completion * 100)}% kế hoạch` : ''}</div></div></div>
    <div class="rev">${r.items.map(([k, t]) => `<div class="rev-i"><span style="color:${REV_IC[k][1]}">${ic(REV_IC[k][0])}</span><span>${esc(t)}</span></div>`).join('') || '<div class="muted small">Chưa đủ dữ liệu để so sánh. Tập thêm vài buổi nhé.</div>'}</div>
    <div id="aiBox">${a ? aiReviewHtml(a) + `<button class="text-btn" data-act="aiReview" data-id="${w.id}">${ic('refresh')} Nhận xét lại</button>` : `<button class="btn big mt" data-act="aiReview" data-id="${w.id}">${ic('bolt')} AI nhận xét chi tiết</button>
      <div class="muted small" style="margin-top:6px;text-align:center">${!hasKey() ? 'Cần nhập API key trong Cài đặt' : aiProv() === 'gemini' ? 'Cần mạng · dùng Gemini' : 'Cần mạng · khoảng 750đ/lần'}</div>`}</div>
    <div class="row gap mt backup-row"><div class="grow muted small">${S.lastBackup ? 'Sao lưu lần cuối: ' + (daysAgo(S.lastBackup) ? daysAgo(S.lastBackup) + ' ngày trước' : 'hôm nay') : 'Chưa sao lưu lần nào'}</div>
      <button class="btn" data-act="exportData">${ic('download')} Sao lưu</button></div>
    ${offerRoutine ? `<button class="btn big mt" data-act="saveOffer">${ic('edit')} Lưu buổi này thành routine</button>` : ''}`,
    () => { routineOffer = null; });
}
function aiReviewHtml(a) {
  const list = (h, xs) => xs?.length ? `<h4>${h}</h4><ul class="tips">${xs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
  const vc = { 'Đạt': 'var(--ok)', 'Tạm': 'var(--warn)', 'Không đạt': 'var(--danger)' }[a.verdict];
  return `<div class="ai-card"><div class="ai-h">${ic('bolt')} Nhận xét của AI</div>
    ${a.verdict ? `<div class="verdict" style="color:${vc};background:color-mix(in srgb, ${vc} 15%, transparent)"><b>${esc(a.verdict)}</b><span>${esc(a.verdictReason || '')}</span></div>` : ''}<p>${esc(a.summary)}</p>
    ${list('Làm tốt', a.good)}${list('Cần cải thiện', a.improve)}
    ${a.nextSession?.length ? `<h4>Buổi sau</h4><ul class="tips">${a.nextSession.map(n => `<li><b>${esc(n.exercise)}:</b> ${esc(n.advice)}</li>`).join('')}</ul>` : ''}</div>`;
}

const REVIEW_SCHEMA = obj({ verdict: { type: 'string', enum: ['Đạt', 'Tạm', 'Không đạt'] }, verdictReason: { type: 'string' }, summary: { type: 'string' }, good: { type: 'array', items: { type: 'string' } }, improve: { type: 'array', items: { type: 'string' } },
  nextSession: { type: 'array', items: obj({ exercise: { type: 'string' }, advice: { type: 'string' } }) } });
async function aiReviewWorkout(id, onPartial) {
  const w = S.workouts.find(x => x.id === id);
  const sess = x => ({ date: new Date(x.startedAt).toISOString().slice(0, 10), name: x.name, minutes: Math.round((x.endedAt - x.startedAt) / 6e4),
    exercises: x.exercises.map(e => ({ name: e.name, sets: e.sets.map(s => isCardio(e.name) ? `${s.r} phút${s.w ? ' ' + s.w + ' km' : ''}` : `${s.w}kg×${s.r}`), ...(e.skipped ? { skippedRequiredExtraSet: true } : {}) })) });
  const history = S.workouts.filter(x => x.startedAt < w.startedAt && x.startedAt > w.startedAt - 28 * 864e5).slice(0, 20).map(sess);
  const p = S.profile, data = {
    today: sess(w), plan: w.plan || null, ruleReview: reviewWorkout(w).items.map(i => i[1]),
    setsLast7DaysByMuscle: Object.fromEntries(Object.entries(weeklySets(w.startedAt)).map(([m, n]) => [MUSCLES[m], n])),
    athlete: p ? { sex: p.sex, age: p.age, heightCm: p.height, weightKg: p.weight, goal: GOALS[p.goal][0] } : null,
    weekday: new Date(w.startedAt).toLocaleDateString('vi-VN', { weekday: 'long' }),
    scheduleOrder: schedSeq().map(r => r.name),
    thisSession: routineOfW(w)?.name || 'buổi tự chọn ngoài lịch',
    previousScheduledSession: S.workouts.find(x => x.startedAt < w.startedAt && routineOfW(x))?.name || null,
    plannedMinutes: w.plan?.length ? estMinutes(w.plan) : null,
    weeklySchedule: S.routines.filter(r => r.day).map(r => r.name), history4Weeks: history,
    painAreas: painNow(),
    readiness: w.ready || null, quickSession: !!w.quick,
    sleepBeforeSession: (e => e ? { hours: Math.round(sleepMin(e) / 6) / 10, bed: e.bed, wake: e.wake } : 'không ghi')(S.sleep?.[dayKey(w.startedAt)]),
  };
  return askAI({
    system: 'Bạn là huấn luyện viên thể hình cực kỳ khó tính, nói tiếng Việt, phũ và thẳng như một HLV quân đội. Nhiệm vụ: soi lỗi buổi tập để người tập tiến bộ, KHÔNG phải để họ vui. ' +
      'Dữ liệu JSON gồm: buổi hôm nay, kế hoạch (số set, rep mục tiêu), số phút dự kiến (plannedMinutes), thứ tự lịch tuần (scheduleOrder), buổi theo lịch trước đó (previousScheduledSession), lịch sử 4 tuần, số set mỗi nhóm cơ trong 7 ngày, nhận xét tự động (ruleReview), giấc ngủ đêm trước buổi tập (sleepBeforeSession) và hồ sơ người tập. ' +
      'Nếu ngủ dưới 6 tiếng: tụt sức có thể do ngủ thiếu, nói thẳng việc ngủ ít là lỗi, buổi sau giữ tạ chứ không ép tăng. ' +
      'Luật bắt buộc: ' +
      '1) Cấm khen xã giao và cấm câu đệm an ủi ("không sao", "bạn đã cố gắng", "cứ từ từ", "tốt lắm", "tuyệt vời"). Không mở đầu bằng lời khen. ' +
      '2) Chỉ khen khi có số liệu chứng minh tiến bộ thật (ví dụ tăng tạ mà vẫn đủ rep), tối đa 2 ý. Không có thì good = []. ' +
      '3) Soi và gọi thẳng tên mọi lỗi có trong dữ liệu: bỏ bài, thiếu set, rep dưới mục tiêu, tạ đứng yên 3 buổi trở lên, tạ hoặc 1RM giảm, buổi tập ngắn/dài lệch nhiều so với plannedMinutes, nhảy cóc thứ tự lịch tuần (bỏ qua cả buổi). Lưu ý: người tập được phép lùi lịch khi bận, tập bù đúng thứ tự vào ngày khác hoặc ngày nghỉ là HỢP LỆ, không bắt lỗi điểm này; nhóm cơ dưới 10 set/tuần. Mỗi lỗi kèm con số và cách sửa cụ thể. ' +
      '4) verdict: "Đạt" chỉ khi làm đủ kế hoạch và đạt rep mục tiêu; "Không đạt" khi bỏ bài, thiếu nhiều set, hoặc tụt sức rõ; còn lại "Tạm". Chấm khắt khe, nghi ngờ thì hạ bậc. verdictReason: 1 câu, có số liệu. ' +
      '5) Viết NGẮN. summary: 2 câu, tổng dưới 40 từ, giọng phũ, nói điều quan trọng nhất cần sửa. improve: tối đa 3 ý, mỗi ý dưới 20 từ, ra lệnh rõ ràng. nextSession: chỉ tối đa 4 bài chính, advice dưới 12 từ, ghi mức tạ × rep cụ thể. ' +
      '6) Chỉ nói điều có căn cứ trong dữ liệu, không bịa. Phũ về hiệu suất, không xúc phạm con người. ' +
      '7) An toàn trên hết: không bảo tập quá sức, không ép bỏ ngày nghỉ, không khuyên ăn ít đi. Nếu dữ liệu cho thấy tụt sức nhiều buổi liền, ra lệnh nghỉ/giảm tải và kiểm tra ngủ, ăn. Không chẩn đoán y tế; đau hoặc chấn thương thì bảo dừng và đi khám.',
    content: [{ text: JSON.stringify(data) }], schema: REVIEW_SCHEMA, think: 'LOW', onPartial,
  });
}

function exGrade(ex) {
  const sets = ex.sets.filter(s => s.done).map(s => ({ w: num(s.w), r: num(s.r) })), r = parseReps(ex.reps);
  const plan = ex.planSets || sets.length, top = Math.max(...sets.map(s => s.w)), issues = [], good = [];
  const prev = prevSession(ex.name, S.active.startedAt);
  const e1 = Math.max(...sets.map(s => e1rm(s.w, s.r))), pe1 = prev ? Math.max(...prev.sets.map(s => e1rm(s.w, s.r))) : 0;
  // Fail = not enough work for growth: fewer sets than planned, or total reps below plan × minimum reps
  // (an extra set can make that up), or clearly weaker than last time (one back-off set settles it).
  const under = r ? sets.filter(s => s.r < r[0]) : [], allTop = r ? sets.every(s => s.r >= r[1]) : false;
  const short = r ? plan * r[0] - sets.reduce((a, s) => a + s.r, 0) : 0, drop = !S.active.wF && pe1 > 0 && e1 > 0 && e1 < pe1 * .97;
  let score = 100 - 15 * under.length - 15 * Math.max(0, plan - sets.length) - (drop ? 15 : 0), fail = false;
  if (sets.length < plan) { fail = true; issues.push(`Thiếu ${plan - sets.length} set so với kế hoạch`); }
  if (short > 0) { fail = true; issues.push(`${under.length} set dưới ${r[0]} rep, thiếu ${short} rep so với mức tối thiểu (${plan} × ${r[0]})`); }
  else if (under.length) issues.push(`${under.length} set dưới ${r[0]} rep, nhưng tổng rep đã bù đủ`);
  if (drop) { if (!ex.extraAsked) fail = true; issues.push(`Yếu hơn buổi trước: 1RM ~${fmtNum(Math.round(pe1))} → ${fmtNum(Math.round(e1))} kg`); }
  if (allTop && top > 0) good.push(`Đạt ${r[1]} rep mọi set → buổi sau lên ${fmtNum(top + weightStep(ex.name))} kg`);
  else if (r && !under.length) good.push(`Trong khoảng ${r[0]}–${r[1]} rep, buổi sau giữ ${fmtNum(top)} kg và cố thêm rep`);
  if (pe1 > 0 && e1 > pe1 * 1.01) good.push(`Mạnh hơn buổi trước: 1RM ~${fmtNum(Math.round(pe1))} → ${fmtNum(Math.round(e1))} kg`);
  score = Math.max(0, score);
  const step = top >= 20 ? 2.5 : 1;
  const extraW = top > 0 ? Math.max(step, Math.round(top * .9 / step) * step) : 0;
  return { score, sets, fail, issues, good, verdict: !fail && allTop ? 'Xuất sắc' : !fail ? 'Đạt' : 'Chưa đạt',
    extra: fail && (ex.extraAsked || 0) < 2 ? { w: extraW, reps: r ? `${r[0]}–${r[1]}` : String(Math.max(...sets.map(s => s.r))) } : null };
}
function openExGrade(i) {
  const ex = S.active?.exercises[i]; if (!ex || !ex.sets.every(s => s.done)) return;
  const g = exGrade(ex), vc = g.verdict === 'Chưa đạt' ? 'var(--danger)' : g.verdict === 'Đạt' ? 'var(--warn)' : 'var(--ok)';
  openSheet(`<div class="sheet-h"><h3>Chấm bài</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div style="margin-bottom:10px">${exTag(ex.name)}</div>
    <div class="score"><div class="ring" style="--p:${g.score}"><b>${g.score}</b></div><div><div class="title" style="color:${vc}">${g.verdict}</div>
      <div class="muted small">${ex.sets.filter(s => s.done).map((s, k) => `${fmtNum(num(s.w))}×${num(s.r)}${s.g != null ? ` (${s.g})` : ''}`).join(' · ')}${ex.reps ? ` · mục tiêu ${esc(ex.reps)}` : ''}</div></div></div>
    <div class="rev">${g.issues.map(t => `<div class="rev-i"><span style="color:var(--danger)">${ic('info')}</span><span>${esc(t)}</span></div>`).join('')}
      ${g.good.map(t => `<div class="rev-i"><span style="color:var(--accent)">${ic('up')}</span><span>${esc(t)}</span></div>`).join('')}</div>
    ${g.extra ? `<div class="muted small mt">Tập bù ngay khi còn nóng người.</div>
      <button class="btn primary big mt" data-act="extraSet" data-i="${i}" data-w="${g.extra.w}">${ic('plus')} Tập thêm 1 set: ${g.extra.w ? fmtNum(g.extra.w) + ' kg × ' : ''}${esc(g.extra.reps)} rep</button>
      <button class="text-btn" data-act="skipExtra" data-i="${i}">Bỏ qua (ghi vào đánh giá buổi tập)</button>`
      : `<button class="btn primary big mt" data-act="closeSheet">${g.fail ? 'Đã bù 2 set, sang bài tiếp' : 'Sang bài tiếp'}</button>`}`);
}
