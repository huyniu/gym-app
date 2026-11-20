// Body: weigh-ins and measurements, calorie advice, sleep, body composition, Big 3, badges, profile, goals, weekly report.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

// kg per week from a least-squares line through the last 28 days of weigh-ins
function weightSlope(until = Date.now()) {
  const xs = bodyLog().filter(b => b.w && b.t > until - 28 * 864e5 && b.t <= until);
  if (xs.length < 4 || xs[xs.length - 1].t - xs[0].t < 10 * 864e5) return null;
  const mx = xs.reduce((a, b) => a + b.t, 0) / xs.length, my = xs.reduce((a, b) => a + b.w, 0) / xs.length;
  const k = xs.reduce((a, b) => a + (b.t - mx) * (b.w - my), 0) / xs.reduce((a, b) => a + (b.t - mx) ** 2, 0);
  return { perWeek: k * 7 * 864e5, now: my + k * (until - mx) };
}
function tetProjection() {
  const s = weightSlope(); if (!s) return null;
  const weeks = (new Date(TET + 'T00:00') - Date.now()) / (7 * 864e5); if (weeks <= 0) return null;
  const c = bodyComp(), at = s.now + s.perWeek * weeks;
  return { now: s.now, perWeek: s.perWeek, weeks, at, leanNow: c.lean, bf: c.bf,
    bfAt: c.bf != null && c.lean ? Math.max(3, (1 - c.lean / at) * 100) : null }; // assumes lean mass is kept
}
function weekReport(ws) {
  const we = ws + 7 * 864e5, days = Array.from({ length: 7 }, (_, i) => dayKey(ws + i * 864e5 + 12 * 36e5)).filter(k => k <= dayKey());
  const wos = S.workouts.filter(w => w.startedAt >= ws && w.startedAt < we), plan = schedSeq().length;
  const sets = weekSets(ws), short = MAJOR.filter(m => sets[m].n < SET_TARGET[m][0]);
  const p = S.profile, t = p ? targets(p) : null, fed = days.filter(k => (S.food[k] || []).length);
  const kcal = fed.length ? fed.reduce((a, k) => a + dayTotals(k).kcal, 0) / fed.length : null, prot = fed.length ? fed.reduce((a, k) => a + dayTotals(k).p, 0) / fed.length : null;
  const nights = days.map(k => S.sleep?.[k]).filter(Boolean), sleep = nights.length ? nights.reduce((a, e) => a + sleepMin(e), 0) / nights.length : null;
  const scored = days.filter(k => { const h = dayHas(k); return h.t || h.f || h.s || h.w; }).map(k => dayScore(k).score);
  const wNow = avgWeight(ws, we), wPrev = avgWeight(ws - 7 * 864e5, ws), rev = S.bodyRev?.[ws];
  return { ws, days: days.length, wos: wos.length, plan, setsTotal: wos.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0), short,
    kcal, prot, t, fed: fed.length, sleep, nights: nights.length, score: scored.length ? Math.round(scored.reduce((a, b) => a + b, 0) / scored.length) : null,
    wNow, wPrev, rev, prs: wos.reduce((a, w) => a + (w.prs || []).length, 0) };
}
let reportWeek = null;
function openWeekReport(ws) {
  reportWeek = ws = ws ?? (new Date().getDay() === 1 ? weekStart() - 7 * 864e5 : weekStart());
  const r = weekReport(ws), pj = tetProjection(), lbl = x => new Date(x).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  const line = (ok, label, val) => `<div class="wr-l"><span class="wr-dot" style="background:${ok == null ? 'var(--muted)' : ok ? 'var(--ok)' : 'var(--danger)'}"></span><span class="grow">${label}</span><b>${val}</b></div>`;
  const t = r.t;
  openSheet(`<div class="sheet-h"><h3>Báo cáo tuần ${lbl(ws)} – ${lbl(ws + 6 * 864e5)}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="wr-top"><div><b style="color:${r.score == null ? 'var(--muted)' : scoreCol(r.score)}">${r.score ?? '—'}</b><small>điểm TB</small></div>
      <div><b>${r.wos}${r.plan ? `<small>/${r.plan}</small>` : ''}</b><small>buổi tập</small></div><div><b>${r.prs}</b><small>PR mới</small></div></div>
    <div class="wr-sec">
      ${line(r.plan ? r.wos >= r.plan : r.wos >= 3, 'Buổi tập', `${r.wos}${r.plan ? '/' + r.plan : ''} · ${r.setsTotal} hiệp`)}
      ${line(!r.short.length, 'Nhóm cơ chính đủ set', r.short.length ? 'thiếu ' + r.short.slice(0, 3).map(m => MUSCLES[m]).join(', ') + (r.short.length > 3 ? ` +${r.short.length - 3}` : '') : 'đủ hết')}
      ${line(t && r.kcal != null ? Math.abs(r.kcal - t.kcal) / t.kcal <= .1 : null, 'Calo TB / ngày', r.kcal != null ? `${fmtNum(Math.round(r.kcal))}${t ? ' / ' + fmtNum(t.kcal) : ''} (${r.fed}/${r.days} ngày ghi)` : 'không ghi')}
      ${line(t && r.prot != null ? r.prot >= t.protein * .9 : null, 'Đạm TB / ngày', r.prot != null ? `${Math.round(r.prot)}${t ? ' / ' + t.protein : ''} g` : '—')}
      ${line(r.sleep != null ? r.sleep >= 420 : null, 'Ngủ TB', r.sleep != null ? `${fmtHM(r.sleep)} (${r.nights} đêm)` : 'không ghi')}
      ${line(r.wNow != null && r.wPrev != null ? (S.profile?.goal === 'bulk' ? r.wNow > r.wPrev : r.wNow <= r.wPrev) : null, 'Cân nặng TB tuần', r.wNow != null ? `${fmtNum(Math.round(r.wNow * 10) / 10)} kg${r.wPrev != null ? ` (${fmtSigned(Math.round((r.wNow - r.wPrev) * 10) / 10)})` : ''}` : 'cân chưa đủ 3 lần')}
      ${r.rev && !r.rev.retake ? line(r.rev.score >= 60, 'AI chấm body', `${r.rev.score}/100 · ${esc(r.rev.verdict)}`) : ''}
      ${(S.goals || []).map(g => { const s = goalStatus(g); return line(s.done || s.ok ? true : s.cur == null ? null : false, `Mục tiêu ${g.kind === 'lift' ? esc(exTitle(g.ex)) : GOAL_KIND[g.kind][0].toLowerCase()} ${fmtNum(g.target)}`, esc(s.txt)); }).join('')}
    </div>
    <div class="wr-pj">${pj ? `<div class="muted small">Dự đoán tới Tết (${fmtNum(Math.round(pj.weeks))} tuần nữa) nếu giữ nhịp ${fmtSigned(Math.round(pj.perWeek * 100) / 100)} kg/tuần:</div>
      <div class="wr-pj-n"><b>${fmtNum(Math.round(pj.at * 10) / 10)} kg</b>${pj.bfAt != null ? `<span>~${fmtNum(Math.round(pj.bfAt))}% mỡ nếu giữ được cơ</span>` : ''}</div>
      <div class="muted small">${S.profile?.goal === 'cut' ? (pj.perWeek > -.2 ? 'Đang giảm quá chậm: siết calo hoặc tăng vận động.' : pj.perWeek < -1 ? 'Giảm quá nhanh, dễ mất cơ: ăn thêm một chút, giữ đạm cao.' : 'Tốc độ giảm hợp lý (0,2–1 kg/tuần), giữ nguyên.') : ''}</div>`
      : '<div class="muted small">Cần cân ít nhất 4 lần trong 10 ngày trở lên để dự đoán cân nặng tới Tết.</div>'}</div>
    <div class="row gap mt"><button class="btn" data-act="weekReportNav" data-v="-1">${ic('back')} Tuần trước</button>${ws < weekStart() ? `<button class="btn" data-act="weekReportNav" data-v="1">Tuần sau ${ic('chev')}</button>` : ''}</div>`);
}

const GOAL_KIND = { lift: ['Tạ', 'kg', 1], weight: ['Cân nặng', 'kg', -1], waist: ['Vòng bụng', 'cm', -1], bf: ['% mỡ', '%', -1] };
function goalNow(g) {
  if (g.kind === 'lift') { const m = bestOf(g.ex).maxW; return m || null; }
  if (g.kind === 'weight') { const s = weightSlope(); return s ? s.now : (bodyLog().filter(b => b.w).pop() || {}).w ?? null; }
  if (g.kind === 'waist') return (bodyLog().filter(b => b.waist).pop() || {}).waist ?? null;
  return bodyComp().bf;
}
// change per week from a straight line through recent points
function slopeOf(pts) {
  if (pts.length < 3 || pts[pts.length - 1][0] - pts[0][0] < 10 * 864e5) return null;
  const mx = pts.reduce((a, p) => a + p[0], 0) / pts.length, my = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.reduce((a, p) => a + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((a, p) => a + (p[0] - mx) ** 2, 0) * 7 * 864e5;
}
function goalRate(g) {
  const since = Date.now() - 56 * 864e5;
  if (g.kind === 'weight') return weightSlope()?.perWeek ?? null;
  if (g.kind === 'waist') return slopeOf(bodyLog().filter(b => b.waist && b.t > since).map(b => [b.t, b.waist]));
  if (g.kind === 'bf') return slopeOf(bfSeries().filter(x => x.t > since).map(x => [x.t, x.bf]));
  return slopeOf(S.workouts.filter(w => w.startedAt > since).map(w => { const e = w.exercises.find(e => e.name === g.ex); return e ? [w.startedAt, Math.max(...e.sets.map(s => s.w))] : null; }).filter(Boolean).reverse());
}
function goalStatus(g) {
  const cur = goalNow(g), dir = GOAL_KIND[g.kind][2], weeks = Math.max(0, (new Date(TET + 'T00:00') - Date.now()) / (7 * 864e5));
  if (cur == null) return { cur, pct: 0, txt: 'Chưa có số liệu' };
  const done = dir > 0 ? cur >= g.target : cur <= g.target, span = g.target - g.start;
  const pct = done ? 100 : span ? Math.max(0, Math.min(100, (cur - g.start) / span * 100)) : 0;
  if (done) return { cur, pct, done, txt: 'Đã đạt 🎉' };
  const r0 = goalRate(g), rate = g.kind === 'lift' && r0 != null ? Math.min(r0, weightStep(g.ex) / 2) : r0, need = weeks ? (g.target - cur) / weeks : null, at = rate != null ? cur + rate * weeks : null;
  const ok = at != null && (dir > 0 ? at >= g.target : at <= g.target), u = GOAL_KIND[g.kind][1];
  return { cur, pct, ok, txt: at == null ? `Cần ${fmtSigned(Math.round(need * 100) / 100)} ${u}/tuần` : ok ? `Kịp Tết (dự kiến ${fmtNum(Math.round(at * 10) / 10)} ${u})` : `Chưa kịp: dự kiến ${fmtNum(Math.round(at * 10) / 10)} ${u}, cần ${fmtSigned(Math.round(need * 100) / 100)} ${u}/tuần` };
}
function goalsCard() {
  const gs = S.goals || [];
  return `<div class="section-h"><h2>Mục tiêu tới Tết</h2><button class="link" data-act="goalAdd">${ic('plus')} Thêm</button></div>
    ${gs.length ? `<div class="card">${gs.map(g => { const s = goalStatus(g), [lbl, u] = GOAL_KIND[g.kind];
      return `<div class="goal"><div class="row"><b class="grow">${g.kind === 'lift' ? esc(exTitle(g.ex)) : lbl}: ${fmtNum(g.target)} ${u}</b><button class="del" data-act="goalDel" data-id="${g.id}" aria-label="Xóa">${ic('x')}</button></div>
        <div class="bar thin"><i style="width:${s.pct}%;background:${s.done || s.ok ? 'var(--ok)' : 'var(--warn)'}"></i></div>
        <div class="small muted">Hiện tại ${s.cur != null ? fmtNum(Math.round(s.cur * 10) / 10) + ' ' + u : '—'} · bắt đầu ${fmtNum(g.start)} ${u}</div><div class="small" style="color:${s.done || s.ok ? 'var(--ok)' : 'var(--warn)'};margin-top:2px">${s.txt}</div></div>`; }).join('')}</div>`
    : `<button class="next-meal" data-act="goalAdd">${ic('trophy')}<span class="grow"><b>Đặt mục tiêu</b><small>VD: Bench 80 kg, vòng bụng 78 cm, cân 66 kg</small></span>${ic('chev')}</button>`}`;
}
let goalDraft = null;
function openGoalAdd() {
  goalDraft = goalDraft || { kind: 'lift', ex: 'Bench Press' };
  const done = [...new Set(S.workouts.flatMap(w => w.exercises.map(e => e.name)))].filter(n => !isCardio(n) && EX_LOAD[n] !== 'body');
  const lifts = [...new Set(['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', ...done])];
  const g = goalDraft, cur = goalNow({ kind: g.kind, ex: g.ex }), u = GOAL_KIND[g.kind][1];
  openSheet(`<div class="sheet-h"><h3>Mục tiêu tới Tết</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="seg" style="margin-bottom:10px">${Object.entries(GOAL_KIND).map(([k, [l]]) => `<button class="${g.kind === k ? 'on' : ''}" data-act="goalKind" data-v="${k}">${l}</button>`).join('')}</div>
    ${g.kind === 'lift' ? `<select id="goalEx" style="margin-bottom:10px">${lifts.map(n => `<option value="${esc(n)}" ${n === g.ex ? 'selected' : ''}>${esc(exTitle(n))}</option>`).join('')}</select>` : ''}
    <div class="small" style="margin-bottom:8px">Hiện tại: <b>${cur != null ? fmtNum(Math.round(cur * 10) / 10) + ' ' + u : 'chưa có số liệu'}</b>${g.kind === 'lift' ? ' (tạ nặng nhất từng làm)' : ''}</div>
    <label class="small">Mục tiêu (${u})<input id="goalT" inputmode="decimal" placeholder="${cur != null ? esc(fmtNum(Math.round(cur * (GOAL_KIND[g.kind][2] > 0 ? 1.1 : .95)))) : ''}"></label>
    <button class="btn primary big mt" data-act="goalSave">Lưu mục tiêu</button>`);
}
function navyBF(waist, neck, hip) {
  const p = S.profile; if (!p || !waist || !neck || waist <= neck) return null;
  const v = p.sex === 'f' ? (hip ? 495 / (1.29579 - .35004 * Math.log10(waist + hip - neck) + .221 * Math.log10(p.height)) - 450 : null)
    : 495 / (1.0324 - .19077 * Math.log10(waist - neck) + .15456 * Math.log10(p.height)) - 450;
  return v && v > 2 && v < 60 ? Math.round(v * 10) / 10 : null;
}
function bfSeries() {
  const out = []; let neck = null, hip = null;
  for (const b of bodyLog()) { if (b.neck) neck = b.neck; if (b.hip) hip = b.hip; if (b.waist) { const v = navyBF(b.waist, neck, hip); if (v) out.push({ t: b.t, bf: v }); } }
  return out;
}
function aiBF() {
  const ks = Object.keys(S.bodyRev || {}).map(Number).sort((a, b) => b - a), k = ks.find(x => S.bodyRev[x].bodyFat && !S.bodyRev[x].retake);
  if (k == null) return null;
  const n = String(S.bodyRev[k].bodyFat).match(/\d+(?:[.,]\d+)?/g); if (!n) return null;
  const v = n.map(x => +x.replace(',', '.')); return { t: k, txt: S.bodyRev[k].bodyFat, bf: v.reduce((a, b) => a + b, 0) / v.length };
}
function bodyComp() {
  const log = bodyLog().filter(b => b.w), lastW = log.length ? log[log.length - 1].w : S.profile?.weight || null;
  const nav = bfSeries(), navNow = nav[nav.length - 1] || null, ai = aiBF();
  const bf = navNow ? navNow.bf : ai ? Math.round(ai.bf * 10) / 10 : null;
  const old = log.filter(b => b.t <= Date.now() - 21 * 864e5).pop(), oldNav = nav.filter(x => x.t <= Date.now() - 21 * 864e5).pop();
  return { w: lastW, bf, lean: lastW && bf != null ? Math.round(lastW * (1 - bf / 100) * 10) / 10 : null, nav: navNow, ai,
    dW: old ? lastW - old.w : null, dBF: oldNav && navNow ? navNow.bf - oldNav.bf : null,
    dLean: old && oldNav && navNow ? lastW * (1 - navNow.bf / 100) - old.w * (1 - oldNav.bf / 100) : null };
}

const BIG3 = [['Squat', ['Squat', 'Front Squat']], ['Bench Press', ['Bench Press']], ['Deadlift', ['Deadlift']]];
const LEVELS = ['Mới tập', 'Cơ bản', 'Trung bình', 'Khá', 'Giỏi'];
const STD = { m: { 'Squat': [.75, 1.25, 1.5, 2.25, 2.75], 'Bench Press': [.5, .75, 1, 1.5, 2], 'Deadlift': [1, 1.5, 2, 2.5, 3] },
  f: { 'Squat': [.5, .75, 1.25, 1.5, 2], 'Bench Press': [.25, .5, .75, 1, 1.5], 'Deadlift': [.5, 1, 1.25, 1.75, 2.5] } };
function big3() {
  const bw = bodyComp().w, std = STD[S.profile?.sex === 'f' ? 'f' : 'm'];
  const lifts = BIG3.map(([n, names]) => {
    const best = Math.max(0, ...names.map(x => bestOf(x).best)), r = bw ? best / bw : 0, s = std[n];
    let lv = 0; for (let i = 1; i < s.length; i++) if (r >= s[i]) lv = i;
    const next = lv < s.length - 1 && bw ? Math.max(0, Math.ceil((s[lv + 1] * bw - best) / 2.5) * 2.5) : null;
    return { n, best: Math.round(best * 10) / 10, r, lv, next };
  });
  return { bw, lifts, total: Math.round(lifts.reduce((a, l) => a + l.best, 0)) };
}
const PCT_REPS = [[100, 1], [95, 2], [90, 4], [85, 6], [80, 8], [75, 10], [70, 12], [65, 15], [60, 18]];
function calcOut() {
  const w = num($('#calcW')?.value), r = num($('#calcR')?.value), el = $('#calcOut'); if (!el) return;
  if (!(w > 0 && r > 0 && r <= 30)) { el.innerHTML = '<div class="muted small">Nhập mức tạ và số rep bạn làm được (1–30 rep).</div>'; return; }
  const one = e1rm(w, r);
  el.innerHTML = `<div class="calc-1rm">1RM ước tính <b>${fmtNum(Math.round(one * 10) / 10)} kg</b></div>
    <div class="calc-t">${PCT_REPS.map(([p, n]) => `<div><span>${p}%</span><b>${fmtNum(Math.round(one * p / 100 / 2.5) * 2.5)} kg</b><small>~${n} rep${p >= 85 ? ' · sức mạnh' : p >= 65 ? ' · to cơ' : ' · sức bền'}</small></div>`).join('')}</div>`;
}

function badgeStats() {
  const ws = S.workouts, today = dayKey(), p = S.profile, t = p ? targets(p) : null;
  const first = firstDataDay(), days = []; for (let k = first; k < today; k = addDays(k, 1)) days.push(k);
  const perfect = days.filter(k => dayScore(k).score >= 85).length;
  const streak = test => { let n = 0, k = test(today) ? today : addDays(today, -1); while (k >= first && test(k)) { n++; k = addDays(k, -1); } return n; };
  const protein = t ? streak(k => dayTotals(k).p >= t.protein * .9) : 0;
  const sleep = streak(k => S.sleep?.[k] && sleepMin(S.sleep[k]) / 60 >= sleepGoal().h);
  const perWeek = schedSeq().length || 3;
  let wkStreak = 0; for (let w = weekStart() - (ws.filter(x => x.startedAt >= weekStart()).length >= perWeek ? -7 * 864e5 : 0) - 7 * 864e5; ; w -= 7 * 864e5) {
    if (ws.filter(x => x.startedAt >= w && x.startedAt < w + 7 * 864e5).length >= perWeek) wkStreak++; else break; if (wkStreak > 520) break; }
  const fullWeek = ws.length ? (() => { for (let w = weekStart(); w >= weekStart(ws[ws.length - 1].startedAt); w -= 7 * 864e5) { const s = weekSets(w); if (MAJOR.every(m => s[m].n >= SET_TARGET[m][0])) return 1; } return 0; })() : 0;
  let photoStreak = 0; for (let w = weekStart(); ; w -= 7 * 864e5) { const v = S.vPoses?.[w]; if (v && POSES.every(x => v.p.includes(x))) photoStreak++; else if (w !== weekStart()) break; if (photoStreak > 520 || w < weekStart() - 3 * 365 * 864e5) break; }
  const b3 = big3(), lift = n => b3.lifts.find(l => l.n === n);
  return { nW: ws.length, prs: ws.reduce((a, w) => a + (w.prs || []).length, 0), perfect, protein, sleep, wkStreak, fullWeek, photoStreak,
    bodyBest: Math.max(0, ...Object.values(S.bodyRev || {}).map(r => r.retake ? 0 : r.score || 0)),
    weighDays: new Set((S.body || []).filter(b => b.w).map(b => dayKey(b.t))).size,
    benchR: lift('Bench Press').r, squatR: lift('Squat').r, deadR: lift('Deadlift').r, total: b3.total };
}
const BADGES = [
  ['w1', 'Buổi đầu tiên', 'Hoàn thành 1 buổi tập', 'nW', 1], ['w10', 'Vào guồng', '10 buổi tập', 'nW', 10], ['w25', 'Chăm chỉ', '25 buổi tập', 'nW', 25],
  ['w50', 'Kỷ luật', '50 buổi tập', 'nW', 50], ['w100', 'Trăm buổi', '100 buổi tập', 'nW', 100], ['w200', 'Gym là nhà', '200 buổi tập', 'nW', 200],
  ['pr1', 'Kỷ lục đầu', 'Lập 1 PR', 'prs', 1], ['pr10', 'Phá kỷ lục', '10 PR', 'prs', 10], ['pr50', 'Cỗ máy PR', '50 PR', 'prs', 50],
  ['wk2', 'Đúng lịch', '2 tuần liền đủ số buổi', 'wkStreak', 2], ['wk4', 'Một tháng không bỏ', '4 tuần liền đủ số buổi', 'wkStreak', 4],
  ['wk8', 'Thói quen thép', '8 tuần liền đủ số buổi', 'wkStreak', 8], ['wk12', 'Không thể cản', '12 tuần liền đủ số buổi', 'wkStreak', 12],
  ['d1', 'Ngày hoàn hảo', '1 ngày đạt 85+ điểm', 'perfect', 1], ['d7', 'Tuần vàng', '7 ngày đạt 85+ điểm', 'perfect', 7], ['d30', 'Tháng vàng', '30 ngày đạt 85+ điểm', 'perfect', 30],
  ['p3', 'Đủ đạm', '3 ngày liền đủ đạm', 'protein', 3], ['p7', 'Đạm cả tuần', '7 ngày liền đủ đạm', 'protein', 7], ['p30', 'Thánh đạm', '30 ngày liền đủ đạm', 'protein', 30],
  ['s3', 'Ngủ ngoan', '3 đêm liền ngủ đủ', 'sleep', 3], ['s7', 'Tuần ngủ đủ', '7 đêm liền ngủ đủ', 'sleep', 7], ['s30', 'Đồng hồ sinh học', '30 đêm liền ngủ đủ', 'sleep', 30],
  ['full', 'Cân đối', 'Một tuần đủ set mọi nhóm cơ chính', 'fullWeek', 1],
  ['ph4', 'Theo dõi body', '4 tuần liền chụp ảnh body', 'photoStreak', 4], ['ph12', 'Nhật ký body', '12 tuần liền chụp ảnh body', 'photoStreak', 12],
  ['ai70', 'Giám khảo gật đầu', 'Điểm body AI từ 70', 'bodyBest', 70], ['wd30', 'Cân đều', 'Cân 30 ngày', 'weighDays', 30],
  ['bench1', 'Đẩy bằng người', 'Bench 1RM = 1× cân nặng', 'benchR', 1], ['squat15', 'Chân trụ', 'Squat 1RM = 1,5× cân nặng', 'squatR', 1.5],
  ['dead2', 'Nhấc gấp đôi', 'Deadlift 1RM = 2× cân nặng', 'deadR', 2], ['t300', 'Câu lạc bộ 300', 'Tổng Big 3 đạt 300 kg', 'total', 300],
  ['t400', 'Câu lạc bộ 400', 'Tổng Big 3 đạt 400 kg', 'total', 400], ['t500', 'Câu lạc bộ 500', 'Tổng Big 3 đạt 500 kg', 'total', 500],
];
function checkBadges(quiet) {
  if (!S.profile && !S.workouts.length) return;
  const st = badgeStats(), had = S.badges || {}, first = !S.badges, fresh = [];
  S.badges = { ...had };
  for (const [id, name, , k, goal] of BADGES) if (st[k] >= goal && !had[id]) { S.badges[id] = Date.now(); fresh.push(name); }
  if (!fresh.length && !first) return;
  localStorage.setItem(KEY, JSON.stringify(S));
  if (quiet) return;
  if (first) { if (fresh.length) toast(`Đã mở ${fresh.length} huy hiệu từ dữ liệu cũ. Xem ở Thêm → Hồ sơ`, 4000); }
  else toast(`Huy hiệu mới: ${fresh.join(', ')}`, 4000);
}
let badgeTimer = null;
const queueBadges = () => { clearTimeout(badgeTimer); badgeTimer = setTimeout(() => { try { checkBadges(); } catch (e) {} }, 1500); };

function viewProfile() {
  const c = bodyComp(), b3 = big3(), st = badgeStats(), got = S.badges || {}, n = BADGES.filter(b => got[b[0]]).length;
  const delta = (v, unit, goodDown) => v == null || Math.abs(v) < .05 ? '' : `<em class="${(v < 0) === goodDown ? 'lime' : 'bad'}">${v > 0 ? '+' : ''}${fmtNum(Math.round(v * 10) / 10)}${unit} / 3 tuần</em>`;
  return `${goalsCard()}<div class="card stats-card"><div class="stats" style="grid-template-columns:repeat(3,1fr)">
      <div class="stat"><b>${c.w ? fmtNum(c.w) : '—'}<small>kg</small></b><span>Cân nặng</span>${delta(c.dW, ' kg', S.profile?.goal !== 'bulk')}</div>
      <div class="stat"><b>${c.lean ? fmtNum(c.lean) : '—'}<small>kg</small></b><span>Khối nạc</span>${delta(c.dLean, ' kg', false)}</div>
      <div class="stat"><b>${c.bf != null ? fmtNum(c.bf) : '—'}<small>%</small></b><span>Tỷ lệ mỡ</span>${delta(c.dBF, '%', true)}</div></div>
    <div class="muted small mt row"><span class="grow">${c.nav ? `Thước dây <b>${fmtNum(c.nav.bf)}%</b>` : 'Chưa có vòng cổ'}${c.ai ? ` · AI từ ảnh <b>${esc(c.ai.txt)}</b>` : ''}</span>${tip('comp')}</div>
</div>
    <div class="section-h"><h2>Big 3 ${tip('big3')}</h2><span class="muted small">Tổng ${fmtNum(b3.total)} kg</span></div>
    <div class="card">${b3.lifts.map(l => `<div class="b3"><div class="grow"><b>${l.n}</b><div class="muted small">${l.best ? `1RM ~${fmtNum(l.best)} kg · ${fmtNum(Math.round(l.r * 100) / 100)}× cân nặng` : 'Chưa tập bài này'}</div>
        ${l.best && l.next != null ? `<div class="small" style="margin-top:2px">Thêm ${fmtNum(l.next)} kg để lên <b>${LEVELS[l.lv + 1]}</b></div>` : ''}</div>
        <span class="lv lv${l.lv}">${l.best ? LEVELS[l.lv] : '—'}</span></div>`).join('')}
</div>
    <div class="section-h"><h2>Máy tính 1RM</h2></div>
    <div class="card"><div class="form3" style="grid-template-columns:1fr 1fr">
      <label>Mức tạ (kg)<input id="calcW" inputmode="decimal" placeholder="60"></label><label>Số rep<input id="calcR" inputmode="numeric" placeholder="8"></label></div>
      <div id="calcOut" class="mt"><div class="muted small">Nhập mức tạ và số rep bạn làm được (1–30 rep).</div></div></div>
    <div class="section-h"><h2>Huy hiệu</h2><span class="muted small">${n}/${BADGES.length}</span></div>
    <div class="badges">${BADGES.map(([id, name, desc, k, goal]) => { const on = !!got[id], v = Math.min(goal, st[k] || 0);
      return `<div class="badge-c${on ? ' on' : ''}"><span class="b-ic">${ic('trophy')}</span><b>${name}</b><small>${desc}</small>
        ${on ? `<em>${new Date(got[id]).toLocaleDateString('vi-VN')}</em>` : `<div class="bar thin"><i style="width:${v / goal * 100}%"></i></div><em>${fmtNum(Math.round(v * 100) / 100)}/${fmtNum(goal)}</em>`}</div>`; }).join('')}</div>`;
}

function avgWeight(from, to) {
  const xs = bodyLog().filter(b => b.w && b.t >= from && b.t < to);
  return xs.length >= 3 ? xs.reduce((a, b) => a + b.w, 0) / xs.length : null;
}
// Weekly change from 7-day averages (needs ≥3 weigh-ins in each of the last two weeks), so daily water swings don't mislead.
function weightTrend() {
  const now = Date.now(), a = avgWeight(now - 7 * 864e5, now + 1), b = avgWeight(now - 14 * 864e5, now - 7 * 864e5);
  return a && b ? { now: a, prev: b, rate: a - b } : null;
}
// Compare the real trend with the goal; suggest at most one ±150 kcal change per week.
function kcalAdvice() {
  const p = S.profile, tr = weightTrend(); if (!p || !tr) return null;
  const pct = tr.rate / tr.now * 100, rate = `${fmtSigned(tr.rate)} kg/tuần`;
  let d = 0, why = '';
  if (p.goal === 'cut') { if (pct > -0.2) { d = -150; why = `Cân gần như không giảm (${rate}).`; } else if (pct < -1) { d = 150; why = `Giảm hơi nhanh (${rate}), dễ mất cơ.`; } }
  else if (p.goal === 'bulk') { if (tr.rate < 0.05) { d = 150; why = `Cân chưa tăng (${rate}).`; } else if (tr.rate > 0.5) { d = -150; why = `Tăng hơi nhanh (${rate}), dễ tích mỡ.`; } }
  else if (Math.abs(tr.rate) > 0.3) { d = tr.rate > 0 ? -150 : 150; why = `Cân đang thay đổi (${rate}) dù mục tiêu là giữ cân.`; }
  if (!d) return { text: `Đúng hướng: ${rate}. Giữ nguyên mức calo hiện tại.` };
  if (S.adjAt && Date.now() - S.adjAt < 7 * 864e5) return { text: `${why} Đã chỉnh gần đây, đợi thêm vài ngày để xem kết quả.` };
  const t = targets(p), floor = Math.max(p.sex === 'm' ? 1500 : 1200, t.bmr);
  if (d < 0 && t.kcal + d < floor) return { text: `${why} Calo đã ở mức thấp an toàn, nên đi bộ thêm thay vì ăn ít hơn.` };
  return { d, text: `${why} Gợi ý ${d > 0 ? 'tăng' : 'giảm'} ${Math.abs(d)} kcal/ngày (${fmtNum(t.kcal)} → ${fmtNum(t.kcal + d)}).` };
}
function adviceCard(always) {
  const a = kcalAdvice();
  if (!a) return always ? `<div class="coach">${ic('bulb')}<div class="grow"><div class="coach-k">Điều chỉnh calo</div>Cân ít nhất 3 lần mỗi tuần trong 2 tuần liền, app sẽ so xu hướng cân với mục tiêu và gợi ý chỉnh calo.</div></div>` : '';
  if (!a.d && !always) return '';
  return `<div class="coach">${ic('bulb')}<div class="grow"><div class="coach-k">Điều chỉnh calo<span>Theo xu hướng cân</span></div>${esc(a.text)}
    ${a.d ? `<div class="row gap mt"><button class="btn primary grow" data-act="applyAdj" data-d="${a.d}">Áp dụng</button><button class="btn" data-act="skipAdj">Để tuần sau</button></div>` : ''}</div></div>`;
}
function viewBody() {
  const log = bodyLog(), ws = log.filter(b => b.w), wa = log.filter(b => b.waist), lastW = ws[ws.length - 1], lastWa = wa[wa.length - 1];
  const tet = new Date(TET + 'T00:00'), left = Math.ceil((tet - new Date().setHours(0, 0, 0, 0)) / 864e5);
  const change = (xs, k, unit) => xs.length >= 2 ? `<em class="${xs[xs.length - 1][k] <= xs[0][k] ? 'lime' : ''}">${fmtSigned(xs[xs.length - 1][k] - xs[0][k])} ${unit} từ ${new Date(xs[0].t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</em>` : '';
  const tr = weightTrend(), photoD = daysAgo(S.photoAt);
  return `
    <div class="hero" style="padding:16px 18px">${ic('flame', 'hero-wm')}
      <div class="hero-top"><span class="hero-tag"><i></i>Mục tiêu đến Tết</span><span class="hero-tag2">${tet.toLocaleDateString('vi-VN')}</span></div>
      <h3 style="margin:10px 0 4px">${left > 0 ? `Còn ${left} ngày` : 'Đã đến Tết!'}</h3>
      <p style="margin:0">${S.profile ? GOALS[S.profile.goal][0] : 'Tái cấu trúc cơ thể'} · ${Math.max(0, Math.ceil(left / 7))} tuần nữa</p></div>
    <div class="card stats-card"><div class="stats" style="grid-template-columns:1fr 1fr">
      <div class="stat"><b>${lastW ? fmtNum(lastW.w) : '—'}<small>kg</small></b><span>Cân nặng</span>${change(ws, 'w', 'kg')}</div>
      <div class="stat"><b>${lastWa ? fmtNum(lastWa.waist) : '—'}<small>cm</small></b><span>Vòng bụng</span>${change(wa, 'waist', 'cm')}</div>
    </div>${tr ? `<div class="muted small" style="text-align:center;margin-top:8px">Trung bình 7 ngày: ${fmtNum(Math.round(tr.now * 10) / 10)} kg (${fmtSigned(tr.rate)} kg so với tuần trước)</div>` : ''}</div>
    <div class="card">
      <div class="title row" style="margin-bottom:10px"><span class="grow">Ghi hôm nay</span>${tip('body')}</div>
      <div class="form3" style="grid-template-columns:1fr 1fr">
        <label>Cân nặng (kg)<input id="bW" inputmode="decimal" placeholder="${lastW ? esc(fmtNum(lastW.w)) : '72'}"></label>
        <label>Vòng bụng (cm)<input id="bWaist" inputmode="decimal" placeholder="${lastWa ? esc(fmtNum(lastWa.waist)) : 'không bắt buộc'}"></label>
        <label>Vòng cổ (cm)<input id="bNeck" inputmode="decimal" placeholder="${(log.filter(b => b.neck).pop() || {}).neck ? esc(fmtNum(log.filter(b => b.neck).pop().neck)) : 'để tính % mỡ'}"></label>
        ${S.profile?.sex === 'f' ? `<label>Vòng hông (cm)<input id="bHip" inputmode="decimal" placeholder="${(log.filter(b => b.hip).pop() || {}).hip ? esc(fmtNum(log.filter(b => b.hip).pop().hip)) : 'chỗ to nhất'}"></label>` : ''}
      </div>
      <button class="btn primary big mt" data-act="saveBody">Lưu</button>

    </div>
    ${adviceCard(true)}
    <button class="next-meal" data-act="weekReport">${ic('chart')}<span class="grow"><b>Báo cáo tuần</b><small>${(pj => pj ? `Dự đoán Tết: ${fmtNum(Math.round(pj.at * 10) / 10)} kg (${fmtSigned(Math.round(pj.perWeek * 100) / 100)} kg/tuần)` : 'Tổng kết tuần + dự đoán cân nặng tới Tết')(tetProjection())}</small></span>${ic('chev')}</button>
    <div class="card">
      <div class="row gap"><span class="qt-ic">${ic('camera')}</span><div class="grow"><div class="title row" style="font-size:15px"><span class="grow">Ảnh body mỗi tuần</span>${tip('photo')}</div>
        ${(() => { const ks = Object.keys(S.bodyRev || {}).map(Number).sort((a, b) => b - a), r = ks.length ? S.bodyRev[ks[0]] : null, bp = bodyPending();
          return bp ? `<div class="small" style="color:var(--danger)">${bp === 'retake' ? 'AI yêu cầu chụp lại' : 'Chưa được AI chấm (bắt buộc)'}</div>` : r && !r.retake ? `<div class="small">AI chấm tuần ${new Date(ks[0]).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}: <b style="color:${VC[r.verdict]}">${r.score}/100 · ${esc(r.verdict)}</b></div>` : ''; })()}
        <div class="muted small">${S.photoAt ? `Lần cuối ${photoD === 0 ? 'hôm nay' : photoD + ' ngày trước'}` : 'Chưa chụp lần nào'}${photoD == null || photoD >= 7 ? ' · <b style="color:var(--warn)">đến lúc chụp</b>' : ''}</div></div></div>
      <button class="btn primary big mt" data-act="openVault">${ic('camera')} Mở kho ảnh body (có mật khẩu)</button>

    </div>
    ${ws.length >= 2 ? `<div class="section-h"><h2>Cân nặng</h2><span class="muted small">${ws.length} lần cân</span></div><div class="card">${chart(ws.slice(-60).map(b => b.w), ws.slice(-60).map(b => new Date(b.t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })))}</div>` : ''}
    ${wa.length >= 2 ? `<div class="section-h"><h2>Vòng bụng</h2></div><div class="card">${chart(wa.map(b => b.waist), wa.map(b => new Date(b.t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })))}</div>` : ''}
    ${sleepSection()}
    ${scoreChart()}
    ${log.length ? `<div class="section-h"><h2>Lịch sử</h2></div><div class="card" style="padding:4px 14px">${[...log].reverse().slice(0, 30).map(b => `<div class="food" style="align-items:center">
      <span class="grow">${new Date(b.t).toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' })}</span>
      <span>${b.w ? fmtNum(b.w) + ' kg' : ''}${b.w && b.waist ? ' · ' : ''}${b.waist ? fmtNum(b.waist) + ' cm' : ''}</span>
      <button class="del" data-act="delBody" data-id="${b.id}" aria-label="Xóa">${ic('x')}</button></div>`).join('')}</div>` : ''}`;
}

const sleepGoal = () => ({ bed: S.settings.sleepBed || '23:30', h: S.settings.sleepH || 7.5 });
const hm2m = s => { const [a, b] = String(s).split(':').map(Number); return a * 60 + (b || 0); };
const m2hm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };
const sleepMin = e => e ? (hm2m(e.wake) - hm2m(e.bed) + 1440) % 1440 : 0;
const fmtHM = m => { m = Math.round(m); return Math.floor(m / 60) + 'h' + String(m % 60).padStart(2, '0'); };
const lastNight = () => S.sleep?.[dayKey()] || null;
const shortSleep = () => { const e = lastNight(); return e && sleepMin(e) < 360 ? e : null; };
// minutes later than the goal bedtime (negative = earlier), wrapped to −12h…+12h
const bedLate = e => (hm2m(e.bed) - hm2m(sleepGoal().bed) + 2160) % 1440 - 720;
// Naps: S.naps[day] = [{ s: 'HH:MM', e: 'HH:MM' }]. Up to NAP_CAP minutes a day count toward the sleep goal.
const NAP_CAP = 90;
const napsOf = k => S.naps?.[k] || [];
const napMin = k => napsOf(k).reduce((a, n) => a + sleepMin({ bed: n.s, wake: n.e }), 0);
// a nap is "bad" when it is long or late, because it makes falling asleep at night harder
const napBad = k => { const m = napMin(k), late = napsOf(k).some(n => hm2m(n.s) >= 16 * 60); return m > NAP_CAP ? 'long' : late ? 'late' : ''; };
function sleepPts(k) { // out of 15
  const e = S.sleep?.[k]; if (!e) return null;
  const nap = napMin(k), napUsed = Math.min(nap, NAP_CAP);
  const hrs = (sleepMin(e) + napUsed) / 60, g = sleepGoal(), late = bedLate(e);
  let p = hrs >= g.h ? 15 : hrs >= 7 ? 12 : hrs >= 6 ? 8 : 3;
  if (late > 60) p = Math.max(0, p - 3);
  return { p, hrs, late, e, nap, napUsed };
}
function sleepPrefill(k) {
  const e = S.sleep?.[k]; if (e) return e;
  const keys = Object.keys(S.sleep || {}).sort(), prev = keys.length ? S.sleep[keys[keys.length - 1]] : null, g = sleepGoal();
  return prev || { bed: g.bed, wake: m2hm(hm2m(g.bed) + g.h * 60) };
}
const sleepInputs = (k, p) => { const v = sleepPrefill(k); return `<div class="sleep-in">
    <label class="slot-time">Ngủ<input type="time" id="${p}Bed" value="${esc(v.bed)}" aria-label="Giờ đi ngủ"></label>
    <label class="slot-time">Dậy<input type="time" id="${p}Wake" value="${esc(v.wake)}" aria-label="Giờ thức dậy"></label>
    <button class="btn primary" data-act="saveSleep" data-k="${k}" data-p="${p}">Lưu</button></div>`; };
function openSleep(k) {
  const e = S.sleep?.[k];
  openSheet(`<div class="sheet-h"><h3>Giấc ngủ đêm trước</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="muted small" style="margin-bottom:4px">Giờ lên giường và giờ thức dậy sáng ${esc(new Date(k + 'T12:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }))}.</div>
    ${sleepInputs(k, 'sh')}
    ${e ? `<button class="text-btn" data-act="delSleep" data-k="${k}">Xóa lần ghi này</button>` : ''}`);
}
function openNap(k) {
  const today = k === dayKey(), list = napsOf(k), m = napMin(k), bad = napBad(k);
  openSheet(`<div class="sheet-h"><h3>Ngủ trưa</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="muted small" style="margin-bottom:8px">${esc(new Date(k + 'T12:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' }))} · tối đa ${NAP_CAP} phút được cộng vào giờ ngủ. Tốt nhất 20–30 phút, trước 15 giờ.</div>
    ${today ? `<div class="small" style="margin-bottom:6px">Vừa ngủ dậy:</div><div class="chips wrap">${[20, 30, 60, 90].map(v => `<button class="chip" data-act="napQuick" data-k="${k}" data-v="${v}">${v} phút</button>`).join('')}</div>
      <div class="small" style="margin:14px 0 0">Hoặc nhập giờ:</div>` : ''}
    <div class="sleep-in">
      <label class="slot-time">Từ<input type="time" id="napS" value="13:00" aria-label="Giờ bắt đầu ngủ trưa"></label>
      <label class="slot-time">Đến<input type="time" id="napE" value="13:30" aria-label="Giờ thức dậy"></label>
      <button class="btn primary" data-act="saveNap" data-k="${k}">Thêm</button></div>
    ${list.length ? `<div class="mt">${list.map((n, i) => `<div class="food" style="align-items:center"><span class="grow">${esc(n.s)}–${esc(n.e)}</span><span class="muted small">${sleepMin({ bed: n.s, wake: n.e })} phút</span>
      <button class="del" data-act="delNap" data-k="${k}" data-i="${i}" aria-label="Xóa">${ic('x')}</button></div>`).join('')}</div>
      <div class="small mt" style="color:${bad ? 'var(--warn)' : 'var(--muted)'}">Tổng ${m} phút${bad === 'long' ? `: quá ${NAP_CAP} phút, chỉ tính ${NAP_CAP}, và dễ khó ngủ tối nay` : bad === 'late' ? ': ngủ sau 16 giờ dễ làm tối khó ngủ' : ''}</div>` : ''}`);
}
function sleepWarn() {
  const e = shortSleep(); if (!e) return '';
  return `<div class="card remind sleep-warn"><span class="qt-ic">${ic('moon')}</span><span class="grow"><b>Đêm qua chỉ ngủ ${fmtHM(sleepMin(e))}</b>
    <small>Giữ mức tạ như buổi trước, đừng cố lên tạ hay ép PR. Thấy chóng mặt, tim đập bất thường thì dừng.${napMin(dayKey()) ? '' : ' Chiều nay chợp mắt 20–30 phút sẽ đỡ hơn.'}</small></span>
    ${napMin(dayKey()) ? '' : `<button class="btn" data-act="napLog" data-k="${dayKey()}">Ngủ trưa</button>`}</div>`;
}
function sleepSection() {
  if (!S.profile && !S.workouts.length) return '';
  const g = sleepGoal(), days = []; for (let i = 13; i >= 0; i--) days.push(addDays(dayKey(), -i));
  const have = days.filter(k => S.sleep?.[k]), last7 = days.slice(-7).filter(k => S.sleep?.[k]);
  const avg = last7.length ? last7.reduce((a, k) => a + sleepMin(S.sleep[k]) + Math.min(napMin(k), NAP_CAP), 0) / last7.length : 0;
  return `<div class="section-h"><h2>Giấc ngủ</h2><span class="muted small">${last7.length ? `TB 7 ngày ${fmtHM(avg)} · mục tiêu ${fmtNum(g.h)}h` : `Mục tiêu ${fmtNum(g.h)}h`}</span></div>
    <div class="card">${have.length >= 2 ? sleepBars(days) : '<div class="muted small">Ghi giấc ngủ 2 đêm trở lên để xem biểu đồ.</div>'}
      ${avg && avg < g.h * 60 - 30 ? `<div class="small mt" style="color:var(--warn)">Thiếu trung bình ${fmtHM(g.h * 60 - avg)} mỗi đêm. Ngủ thiếu làm phục hồi chậm và dễ đói hơn.</div>` : ''}
      <div class="row gap mt"><button class="btn grow" data-act="sleepLog" data-k="${dayKey()}">${ic('moon')} ${lastNight() ? 'Sửa đêm qua' : 'Ghi đêm qua'}</button>
      <button class="btn grow" data-act="napLog" data-k="${dayKey()}">${ic('clock')} ${napMin(dayKey()) ? `Trưa ${napMin(dayKey())}p` : 'Ngủ trưa'}</button></div></div>`;
}
// 14 days of sleep as stacked bars: night (lime) + counted nap (blue), dashed line at the goal.
function sleepBars(days) {
  const W = 320, H = 150, P = 20, g = sleepGoal().h, n = days.length, bw = (W - 2 * P) / n;
  const tot = days.map(k => (S.sleep?.[k] ? sleepMin(S.sleep[k]) : 0) / 60 + Math.min(napMin(k), NAP_CAP) / 60);
  const mx = Math.max(g + 1, ...tot), y = h => H - P - h / mx * (H - 2 * P), lbl = k => new Date(k + 'T12:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ giờ ngủ 14 ngày">
    <line x1="${P}" x2="${W - P}" y1="${y(g)}" y2="${y(g)}" stroke="#8b93a3" stroke-dasharray="3 4"/>
    <text x="${W - P}" y="${y(g) - 5}" fill="#8b93a3" font-size="11" text-anchor="end">${fmtNum(g)}h</text>
    ${days.map((k, i) => { const nt = (S.sleep?.[k] ? sleepMin(S.sleep[k]) : 0) / 60, np = Math.min(napMin(k), NAP_CAP) / 60, x = (P + i * bw + 2).toFixed(1), w = (bw - 4).toFixed(1);
      return (nt ? `<rect x="${x}" y="${y(nt)}" width="${w}" height="${(y(0) - y(nt)).toFixed(1)}" rx="2" fill="#c6f432"/>` : '') +
        (np ? `<rect x="${x}" y="${y(nt + np)}" width="${w}" height="${(y(nt) - y(nt + np)).toFixed(1)}" rx="2" fill="#5ab0ff"/>` : ''); }).join('')}
    <text x="${P}" y="${H - 4}" fill="#8b93a3" font-size="11">${esc(lbl(days[0]))}</text>
    <text x="${W - P}" y="${H - 4}" fill="#8b93a3" font-size="11" text-anchor="end">${esc(lbl(days[n - 1]))}</text>
  </svg>${days.some(k => napMin(k)) ? '<div class="muted small"><span style="color:#c6f432">■</span> đêm <span style="color:#5ab0ff">■</span> ngủ trưa</div>' : ''}`;
}

