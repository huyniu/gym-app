// Daily score, day sheet, AI day review, calendar and history.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

let histMode = 'cal', calM = null;
function firstDataDay() {
  const ts = [...S.workouts.map(w => w.startedAt), ...(S.body || []).map(b => b.t), ...Object.keys(S.food).filter(k => S.food[k].length).map(dayStart), ...Object.keys(S.sleep || {}).map(dayStart)].filter(isFinite);
  return ts.length ? dayKey(Math.min(...ts)) : dayKey();
}
function dayHas(k) {
  const t0 = dayStart(k), t1 = t0 + 864e5;
  return { t: S.workouts.some(w => w.startedAt >= t0 && w.startedAt < t1), f: (S.food[k] || []).length > 0, s: !!S.sleep?.[k],
    w: (S.body || []).some(b => b.t >= t0 && b.t < t1), p: (S.vDays || []).includes(k) };
}
let calMode = 'month', calW = null;
// Consecutive weeks with at least the planned number of sessions (this week counts once it is reached).
function weekStreak() {
  const per = schedSeq().length || 3, cnt = w => S.workouts.filter(x => x.startedAt >= w && x.startedAt < w + 7 * 864e5).length;
  let w = weekStart(), n = cnt(w) >= per ? 1 : 0;
  for (w -= 7 * 864e5; n < 520 && cnt(w) >= per; w -= 7 * 864e5) n++;
  return n;
}
const trainedOn = k => { const t0 = dayStart(k); return S.workouts.filter(w => w.startedAt >= t0 && w.startedAt < t0 + 864e5); };
function viewCalendar() {
  const now = new Date(), today = dayKey(), first = firstDataDay(), fm = new Date(first + 'T12:00');
  const seg = `<div class="seg mini cal-mode">${[['month', 'Tháng'], ['week', 'Tuần']].map(([k, l]) => `<button class="${calMode === k ? 'on' : ''}" data-act="calMode" data-v="${k}">${l}</button>`).join('')}</div>`;
  const statCards = (days, label) => {
    const past = days.filter(k => k <= today && k >= first), tr = past.filter(k => trainedOn(k).length).length;
    const sc = past.filter(k => { const h = dayHas(k); return h.t || h.f || h.s || h.w; }).map(k => dayScore(k).score);
    const avg = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null, good = sc.filter(s => s >= 70).length;
    return `<div class="cal-stats">
      <div><span class="cs-ic" style="color:#fb7185">${ic('flame')}</span><b>${weekStreak()}<small> tuần</small></b><em>liên tục đủ buổi</em></div>
      <div><span class="cs-ic" style="color:var(--accent)">${ic('barbell')}</span><b>${tr}<small> / ${days.length} (${Math.round(tr / days.length * 100)}%)</small></b><em>ngày tập ${label}</em></div>
      <div><span class="cs-ic" style="color:${avg == null ? 'var(--muted)' : scoreCol(avg)}">${ic('chart')}</span><b>${avg ?? '—'}<small>/100</small></b><em>điểm trung bình</em></div>
      <div><span class="cs-ic" style="color:var(--ok)">${ic('check')}</span><b>${good}<small> ngày</small></b><em>đạt từ 70 điểm</em></div></div>`;
  };
  const cell = (k, label) => {
    if (k > today || k < first) return `<span class="c2 off"><span>${label}</span></span>`;
    const has = dayHas(k), any = has.t || has.f || has.s || has.w, sc = any ? dayScore(k).score : null;
    return `<button class="c2${has.t ? ' tr' : ''}${k === today ? ' now' : ''}" data-act="calDay" data-k="${k}"><span>${label}</span><i${sc != null ? ` style="background:${scoreCol(sc)}"` : ''}></i></button>`;
  };
  if (calMode === 'week') {
    const ws = calW ?? weekStart(), days = Array.from({ length: 7 }, (_, i) => dayKey(ws + i * 864e5 + 12 * 36e5)), isNow = ws === weekStart();
    const st = isNow ? schedState() : null, lbl = t => new Date(t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
    const row = (k, i) => {
      const d = new Date(k + 'T12:00'), head = `<span class="wr-d"><small>${DOW_VI[i + 1]}</small><b>${d.getDate()}</b></span>`;
      if (k > today || k < first) {
        const plan = st?.plan[i + 1];
        return `<div class="cal-wrow off">${head}<span class="grow muted small">${k > today ? (plan ? `Dự kiến: ${esc(plan.name)}` : 'Nghỉ') : 'Chưa dùng app'}</span></div>`;
      }
      const ws2 = trainedOn(k), tot = dayTotals(k), sl = S.sleep?.[k], has = dayHas(k), any = has.t || has.f || has.s || has.w, sc = any ? dayScore(k) : null;
      const what = ws2.length ? ws2.map(w => `${esc(w.name)} · ${hhmm(w.startedAt)}`).join(', ') : sc?.planned ? `<span style="color:var(--danger)">Bỏ ${esc(sc.planned.name)}</span>` : 'Nghỉ';
      const sub = [tot.kcal ? `${fmtNum(Math.round(tot.kcal))} kcal · ${Math.round(tot.p)} g đạm` : 'chưa ghi ăn', sl ? `ngủ ${fmtHM(sleepMin(sl))}` : '', napMin(k) ? `trưa ${napMin(k)}p` : ''].filter(Boolean).join(' · ');
      return `<button class="cal-wrow${k === today ? ' now' : ''}" data-act="calDay" data-k="${k}">${head}
        <span class="grow"><b class="${ws2.length ? 'lime' : ''}">${what}</b><small>${sub}</small></span>
        ${sc ? `<span class="wr-s" style="color:${scoreCol(sc.score)};background:color-mix(in srgb, ${scoreCol(sc.score)} 16%, transparent)">${sc.score}</span>` : ''}</button>`;
    };
    return `<div class="card cal2">
      <div class="cal2-h">${seg}<span class="grow"></span><button class="icon" data-act="calWeek" data-v="-1" ${ws > weekStart(dayStart(first)) ? '' : 'disabled'} aria-label="Tuần trước">${ic('back')}</button>
        <button class="icon" data-act="calWeek" data-v="1" ${isNow ? 'disabled' : ''} aria-label="Tuần sau">${ic('chev')}</button></div>
      <h3 class="cal2-t">${isNow ? 'Tuần này' : 'Tuần ' + lbl(ws)}<small>${lbl(ws)} – ${lbl(ws + 6 * 864e5)}</small><button class="link" style="margin-left:auto;font-size:13px" data-act="weekReport" data-w="${ws}">Báo cáo</button></h3>
      ${days.map(row).join('')}</div>${statCards(days, 'trong tuần')}`;
  }
  const cur = calM || new Date(now.getFullYear(), now.getMonth(), 1), y = cur.getFullYear(), m = cur.getMonth();
  const canPrev = y * 12 + m > fm.getFullYear() * 12 + fm.getMonth(), canNext = y * 12 + m < now.getFullYear() * 12 + now.getMonth();
  const n = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() + 6) % 7, days = Array.from({ length: n }, (_, i) => dayKey(new Date(y, m, i + 1, 12)));
  return `<div class="card cal2">
    <div class="cal2-h">${seg}<span class="grow"></span><button class="icon" data-act="calNav" data-v="-1" ${canPrev ? '' : 'disabled'} aria-label="Tháng trước">${ic('back')}</button>
      <button class="icon" data-act="calNav" data-v="1" ${canNext ? '' : 'disabled'} aria-label="Tháng sau">${ic('chev')}</button></div>
    <h3 class="cal2-t">Tháng ${m + 1} ${y}</h3>
    <div class="c2-w">${DOW_VI.slice(1).map(x => `<span>${x}</span>`).join('')}</div>
    <div class="c2-g">${'<span></span>'.repeat(lead)}${days.map((k, i) => cell(k, i + 1)).join('')}</div>
    <div class="c2-leg"><span><b class="c2-tr"></b>Có tập</span><span><i style="background:var(--ok)"></i><i style="background:var(--warn)"></i><i style="background:var(--danger)"></i>Điểm ngày</span><span><b class="c2-now"></b>Hôm nay</span></div>
  </div>${statCards(days, 'trong tháng')}`;
}
// Everything logged on day k, read-only (edit buttons lead to the normal screens).
function dayDetail(k) {
  const t0 = dayStart(k), t1 = t0 + 864e5, ws = S.workouts.filter(w => w.startedAt >= t0 && w.startedAt < t1).sort((a, b) => a.startedAt - b.startedAt);
  const food = [...(S.food[k] || [])].sort((a, b) => a.t - b.t), tot = dayTotals(k), sl = S.sleep?.[k], body = (S.body || []).filter(b => b.t >= t0 && b.t < t1);
  const sec = (title, inner) => `<div class="dd-sec"><h4>${title}</h4>${inner}</div>`;
  let out = '';
  out += sec(`${ic('barbell')} Tập luyện`, ws.length ? ws.map(w => `<div class="dd-w"><div class="row"><b class="grow">${esc(w.name)}</b><span class="muted small">${hhmm(w.startedAt)}–${hhmm(w.endedAt)} · ${fmtDur(w.endedAt - w.startedAt)}</span></div>
      ${w.exercises.map(e => `<div class="hist-ex">${exTag(e.name, `${(w.prs || []).includes(e.name) ? '<span class="badge">PR</span>' : ''}<em>${e.sets.map(s => isCardio(e.name) ? fmtSet(s, e.name) : `${fmtNum(s.w)}×${s.r}`).join(' · ')}</em>`)}</div>`).join('')}
      <div class="row gap mt"><button class="btn" data-act="reviewOpen" data-id="${w.id}">${ic('bolt')} Đánh giá</button><button class="btn" data-act="dayEditW" data-id="${w.id}">${ic('edit')} Sửa</button></div></div>`).join('')
    : '<div class="muted small">Không tập</div>');
  out += sec(`${ic('apple')} Ăn uống${food.length ? ` · ${fmtNum(Math.round(tot.kcal))} kcal · ${Math.round(tot.p)} g đạm` : ''}`,
    (food.length ? foodGroups(food).replace(/<button class="del" data-act="delFood"[^>]*>[\s\S]*?<\/button>/g, '') : '<div class="muted small">Không ghi bữa nào</div>') +
    `<button class="text-btn" data-act="gotoFood" data-k="${k}">${food.length ? 'Sửa / thêm bữa ăn' : 'Ghi bù bữa ăn'}</button>`);
  const bodyBits = [
    sl ? `Ngủ <b>${fmtHM(sleepMin(sl))}</b> (${sl.bed}–${sl.wake})` : 'Không ghi giấc ngủ',
    ...(napMin(k) ? [`Ngủ trưa <b>${napMin(k)} phút</b> (${napsOf(k).map(n => `${esc(n.s)}–${esc(n.e)}`).join(', ')})`] : []),
    ...(waterOf(k) ? [`Nước <b>${fmtNum(waterOf(k) / 1000)} lít</b>`] : []), ...(suppsOf(k).length ? [`Bổ sung: <b>${suppsOf(k).map(esc).join(', ')}</b>`] : []),
    ...body.map(b => [b.w ? `Cân <b>${fmtNum(b.w)} kg</b>` : '', b.waist ? `Vòng bụng <b>${fmtNum(b.waist)} cm</b>` : ''].filter(Boolean).join(' · ')),
    ...((S.vDays || []).includes(k) ? ['Có chụp ảnh body (xem trong kho ảnh có mật khẩu)'] : []),
  ];
  out += sec(`${ic('moon')} Ngủ và cơ thể`, bodyBits.map(t => `<div class="small" style="margin:4px 0">${t}</div>`).join('') +
    `<div class="row gap"><button class="text-btn" data-act="sleepLog" data-k="${k}">${sl ? 'Sửa giấc ngủ' : 'Ghi bù giấc ngủ'}</button><button class="text-btn" data-act="napLog" data-k="${k}">${napMin(k) ? 'Sửa ngủ trưa' : 'Ghi ngủ trưa'}</button></div>`);
  return out;
}
function viewHistory() {
  const seg = `<div class="seg" style="margin-bottom:12px">${[['cal', 'Lịch'], ['list', 'Buổi tập']].map(([k, l]) => `<button class="${histMode === k ? 'on' : ''}" data-act="histMode" data-v="${k}">${l}</button>`).join('')}</div>`;
  return seg + (histMode === 'cal' ? viewCalendar() : viewHistoryList());
}
function viewHistoryList() {
  if (!S.workouts.length) return '<div class="empty">Chưa có buổi tập nào.<br>Hoàn thành buổi tập đầu tiên để xem lịch sử.</div>';
  let lastMonth = '';
  return S.workouts.map(w => {
    const m = new Date(w.startedAt).toLocaleDateString('vi-VN', {month:'long', year:'numeric'});
    const head = m !== lastMonth ? `<div class="section-h"><h2>${esc(m.charAt(0).toUpperCase() + m.slice(1))}</h2></div>` : '';
    lastMonth = m;
    const open = openId === w.id;
    return head + `<div class="card">
      <button class="hist-h" data-act="toggleHist" data-id="${w.id}">
        <div class="grow"><div class="title">${esc(w.name)}</div>
        <div class="muted small">${fmtDate(w.startedAt)} · ${hhmm(w.startedAt)}–${hhmm(w.endedAt)} · ${fmtDur(w.endedAt - w.startedAt)} · ${fmtNum(Math.round(volume(w)))} kg</div></div>
        <span class="chev" style="transform:rotate(${open ? 90 : 0}deg)">${ic('chev')}</span>
      </button>
      ${open ? `<div class="hist-body">
        ${w.exercises.map(e => `<div class="hist-ex">${exTag(e.name, `${(w.prs || []).includes(e.name) ? '<span class="badge">PR</span>' : ''}<em>${e.sets.map(s => isCardio(e.name) ? fmtSet(s, e.name) : `${fmtNum(s.w)}×${s.r}`).join(' · ')}</em>`)}</div>`).join('')}
        <div class="row gap mt" style="flex-wrap:wrap">
          <button class="btn" data-act="reviewOpen" data-id="${w.id}">${ic('bolt')} Đánh giá</button>
          <button class="btn" data-act="editWorkout" data-id="${w.id}">${ic('edit')} Sửa</button>
          <button class="btn" data-act="repeatWorkout" data-id="${w.id}">Tập lại</button>
          <button class="btn" data-act="histToRoutine" data-id="${w.id}">Lưu làm routine</button>
          <button class="btn danger" data-act="deleteWorkout" data-id="${w.id}">Xóa</button>
        </div></div>` : ''}
    </div>`;
  }).join('');
}

function dayScore(k) {
  const t0 = dayStart(k), t1 = t0 + 864e5, isToday = k === dayKey(), items = [], todo = [];
  const ws = S.workouts.filter(w => w.startedAt >= t0 && w.startedAt < t1);
  const st = schedState(t0 + 1), planned = st ? st.plan[dowOf(t0)] : null;
  // training (40)
  let train;
  if (ws.length) {
    const best = Math.max(...ws.map(w => reviewWorkout(w).score));
    train = Math.round(35 * best / 100);
    items.push([best >= 70 ? 'ok' : 'warn', `Tập ${ws.map(w => `${w.name} lúc ${hhmm(w.startedAt)}–${hhmm(w.endedAt)}`).join(', ')}: ${best}/100 điểm buổi tập`]);
  } else if (planned) {
    train = 0; items.push(['warn', `${isToday ? 'Chưa tập' : 'Bỏ buổi'} ${planned.name}`]);
    todo.push(isToday ? { act: 'startRoutine', id: planned.id, label: `Tập ${planned.name}` } : { act: 'backfillDay', k, id: planned.id, label: 'Ghi bù buổi tập' });
  } else if (st) {
    train = st.lag ? 22 : 35;
    items.push([st.lag ? 'info' : 'ok', st.lag ? `Ngày nghỉ nhưng lịch đang lùi ${st.lag} buổi, có thể tập bù` : 'Ngày nghỉ theo lịch']);
  } else { train = 18; items.push(['info', 'Chưa có lịch tập, không tập']); }
  // food (35) — nothing logged means nothing known: 0
  const list = S.food[k] || [], tot = dayTotals(k), p = S.profile;
  let food = 0;
  if (!list.length) { items.push(['warn', isToday ? 'Chưa ghi bữa nào' : 'Không ghi bữa nào']); todo.push({ act: 'gotoFood', k, label: 'Ghi bữa ăn' }); }
  else if (p) {
    const t = targets(p), dev = Math.abs(tot.kcal - t.kcal) / t.kcal, pr = tot.p / t.protein;
    const kp = dev <= .1 ? 22 : dev >= .4 ? 0 : 22 * (1 - (dev - .1) / .3), pp = pr >= .9 ? 13 : 13 * Math.max(0, pr) / .9;
    food = Math.round(kp + pp);
    const diff = Math.round(tot.kcal - t.kcal);
    items.push([dev <= .1 ? 'ok' : 'warn', `Calo ${fmtNum(Math.round(tot.kcal))}/${fmtNum(t.kcal)} (${diff > 0 ? '+' : ''}${fmtNum(diff)})${isToday && tot.kcal < t.kcal * .9 ? ' · ngày chưa hết' : ''}`]);
    items.push([pr >= .9 ? 'ok' : 'warn', `Đạm ${Math.round(tot.p)}/${t.protein} g (${Math.round(pr * 100)}%)`]);
  } else { food = 18; items.push(['info', 'Chưa có mục tiêu calo (Thực đơn → nhập thông tin)']); }
  // sleep (15) — the night before this day
  const useSleep = !!S.sleepSince && k >= S.sleepSince, sp = sleepPts(k);
  let sleep = 0;
  if (useSleep) {
    if (!sp) { items.push(['warn', 'Chưa ghi giấc ngủ đêm trước']); todo.push({ act: 'sleepLog', k, label: 'Ghi giấc ngủ' }); }
    else {
      sleep = sp.p;
      items.push([sp.hrs >= 7 && sp.late <= 60 ? 'ok' : 'warn', `Ngủ ${fmtHM(sleepMin(sp.e))} (${sp.e.bed}–${sp.e.wake})${sp.nap ? ` + trưa ${sp.nap}p${sp.nap > sp.napUsed ? ` (tính ${sp.napUsed}p)` : ''}` : ''}${sp.hrs < 6 ? ', thiếu ngủ nặng' : sp.hrs < 7 ? ', thiếu ngủ' : ''}${sp.late > 60 ? `, lên giường muộn ${fmtHM(sp.late)} so với mục tiêu` : ''}`]);
      const nb = napBad(k); if (nb) items.push(['warn', nb === 'long' ? `Ngủ trưa ${sp.nap} phút, quá dài` : 'Ngủ trưa sau 16 giờ, dễ khó ngủ tối']);
    }
  }
  // tracking (15)
  const weighed = (S.body || []).some(b => b.w && b.t >= t0 && b.t < t1), meals = new Set(list.map(f => mealOf(f.t))).size;
  let track = (weighed ? 8 : 0) + (meals >= 3 ? 7 : meals === 2 ? 4 : meals === 1 ? 2 : 0);
  items.push([weighed ? 'ok' : 'warn', weighed ? 'Đã cân' : 'Chưa cân']);
  const bp = isToday ? bodyPending() : null;
  if (bp) { track = Math.max(0, track - 3); items.push(['warn', bp === 'retake' ? 'AI yêu cầu chụp lại ảnh body tuần này' : 'Ảnh body tuần này chưa được AI chấm']); todo.push({ act: 'openVault', label: bp === 'retake' ? 'Chụp lại ảnh body' : 'Chấm ảnh body' }); }
  if (!weighed && isToday) todo.push({ act: 'tab', tab: 'body', label: 'Cân ngay' });
  if (list.length && meals < 3) items.push(['info', `Mới ghi ${meals} bữa`]);
  const score = useSleep ? train + food + sleep + track : Math.round((train + food + track) / 85 * 100);
  const parts = [['Tập luyện', train, 35], ['Ăn uống', food, 35], ...(useSleep ? [['Giấc ngủ', sleep, 15]] : []), ['Theo dõi', track, 15]];
  return { k, score, grade: score >= 85 ? 'Xuất sắc' : score >= 70 ? 'Tốt' : score >= 50 ? 'Ổn' : 'Kém', parts,
    items, todo, ws, planned, sleep: sp, hasData: ws.length > 0 || list.length > 0 || weighed || !!sp };
}
function dayCard() {
  if (!S.profile && !S.workouts.length) return '';
  const y = dayScore(addDays(dayKey(), -1)), t = dayScore(dayKey());
  const tile = (d, lbl) => `<button class="dtile" data-act="openDay" data-k="${d.k}"><small>${lbl}</small><b style="color:${recColor(d.score * 1.0)}">${d.score}<span>/100</span></b><em>${d.grade}${S.dayAI?.[d.k] ? ' · AI: ' + esc(S.dayAI[d.k].verdict) : ''}</em></button>`;
  return `<div class="dtiles">${tile(y, 'Tổng kết hôm qua')}${tile(t, 'Hôm nay đến giờ')}</div>`;
}
function openDay(k) {
  const d = dayScore(k), a = S.dayAI?.[k];
  openSheet(`<div class="sheet-h"><h3>${esc(dayLabel(k).charAt(0).toUpperCase() + dayLabel(k).slice(1))}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="score"><div class="ring" style="--p:${d.score}"><b>${d.score}</b></div><div class="grow"><div class="title">${d.grade}</div>
      ${d.parts.map(([n, v, m]) => `<div class="dpart"><span>${n}</span><div class="bar thin"><i style="width:${v / m * 100}%;background:${recColor(v / m * 100)}"></i></div><b>${v}/${m}</b></div>`).join('')}</div></div>
    <div class="rev">${d.items.map(([kd, t]) => `<div class="rev-i"><span style="color:${REV_IC[kd][1]}">${ic(REV_IC[kd][0])}</span><span>${esc(t)}</span></div>`).join('')}</div>
    ${dayDetail(k)}
    ${d.todo.length ? `<div class="todo">${d.todo.map(x => `<button class="btn" data-act="${x.act}" ${x.id ? `data-id="${x.id}"` : ''} ${x.k ? `data-k="${x.k}"` : ''} ${x.tab ? `data-tab="${x.tab}"` : ''}>${esc(x.label)}</button>`).join('')}</div>` : ''}
    <div id="aiBox">${a ? aiDayHtml(a) + `<button class="text-btn" data-act="aiDay" data-k="${k}">${ic('refresh')} Chấm lại</button>`
      : `<button class="btn big mt" data-act="aiDay" data-k="${k}">${ic('bolt')} AI chấm ngày ${k === dayKey() ? 'hôm nay' : 'này'}</button>
      <div class="muted small" style="margin-top:6px;text-align:center">${hasKey() ? 'Cần mạng' : 'Cần nhập API key trong Cài đặt'}</div>`}</div>`);
}
function aiDayHtml(a) {
  const vc = { 'Đạt': 'var(--ok)', 'Tạm': 'var(--warn)', 'Không đạt': 'var(--danger)' }[a.verdict];
  return `<div class="ai-card"><div class="ai-h">${ic('bolt')} AI chấm ngày</div>
    <div class="verdict" style="color:${vc};background:color-mix(in srgb, ${vc} 15%, transparent)"><b>${esc(a.verdict)}</b><span>${esc(a.verdictReason)}</span></div>
    <p>${esc(a.summary)}</p><h4>Lỗi lớn nhất</h4><p>${esc(a.biggestMistake)}</p><h4>Ngày mai phải làm</h4><p>${esc(a.tomorrow)}</p></div>`;
}
const DAY_SCHEMA = obj({ verdict: { type: 'string', enum: ['Đạt', 'Tạm', 'Không đạt'] }, verdictReason: { type: 'string' }, summary: { type: 'string' }, biggestMistake: { type: 'string' }, tomorrow: { type: 'string' } });
async function aiReviewDay(k) {
  const d = dayScore(k), p = S.profile, t = p ? targets(p) : null, tot = dayTotals(k);
  const data = {
    date: k, isToday: k === dayKey(), nowHour: new Date().getHours(), autoScore: d.score, breakdown: d.parts.map(([n, v, m]) => `${n} ${v}/${m}`), findings: d.items.map(i => i[1]),
    plannedSession: d.planned?.name || 'ngày nghỉ hoặc không có lịch',
    workouts: d.ws.map(w => ({ name: w.name, start: hhmm(w.startedAt), end: hhmm(w.endedAt), minutes: Math.round((w.endedAt - w.startedAt) / 6e4), score: reviewWorkout(w).score, exercises: w.exercises.map(e => ({ name: e.name, sets: e.sets.map(s => `${s.w}kg×${s.r}`) })) })),
    food: (S.food[k] || []).map(f => ({ time: hhmm(f.t), meal: mealOf(f.t), name: f.name, grams: f.g, kcal: Math.round(f.kcal), protein: Math.round(f.p) })),
    totals: { kcal: Math.round(tot.kcal), protein: Math.round(tot.p), carbs: Math.round(tot.c), fat: Math.round(tot.f) },
    targets: t ? { kcal: t.kcal, protein: t.protein, goal: GOALS[p.goal][0] } : null,
    weight: (S.body || []).find(b => b.w && dayKey(b.t) === k)?.w || null,
    sleepNightBefore: d.sleep ? { hours: Math.round(d.sleep.hrs * 10) / 10, bed: d.sleep.e.bed, wake: d.sleep.e.wake, minutesLaterThanGoalBedtime: d.sleep.late } : 'không ghi',
    naps: napsOf(k).length ? { totalMinutes: napMin(k), countedMinutes: Math.min(napMin(k), NAP_CAP), times: napsOf(k).map(n => `${n.s}–${n.e}`) } : 'không ngủ trưa',
    sleepGoal: { hours: sleepGoal().h, bedBefore: sleepGoal().bed },
  };
  return askAI({
    system: 'Bạn là huấn luyện viên kiêm chuyên gia dinh dưỡng cực kỳ khó tính, nói tiếng Việt, phũ và thẳng. Chấm một NGÀY của người tập dựa trên JSON: buổi tập, bữa ăn đã ghi, giấc ngủ đêm trước (sleepNightBefore, so với sleepGoal; hours đã cộng tối đa 90 phút ngủ trưa trong naps), tổng calo/đạm so với mục tiêu, cân nặng, điểm tự động. ' +
      'Luật: cấm khen xã giao và câu an ủi; không ghi bữa ăn = coi như không kiểm soát được ăn uống, phải chê; bỏ buổi tập theo lịch là lỗi nặng; ngủ dưới 6 tiếng hoặc lên giường muộn hơn mục tiêu quá 1 tiếng là lỗi phải chê (không ghi giấc ngủ thì nhắc phải ghi); nếu isToday=true và còn sớm (nowHour < 20) thì đánh giá phần đã qua và nói còn phải làm gì trong ngày. ' +
      'verdict: "Đạt" chỉ khi tập đúng lịch (hoặc nghỉ đúng lịch), calo trong ±10% mục tiêu, đạm ≥ 90%, ngủ ≥ 7 tiếng (nếu có ghi); thiếu dữ liệu hoặc lệch nhiều thì "Không đạt"; còn lại "Tạm". verdictReason: 1 câu có số liệu. ' +
      'summary: 2 câu phũ. biggestMistake: 1 lỗi quan trọng nhất kèm số liệu. tomorrow: 1–2 việc cụ thể phải làm ngày mai (hoặc tối nay nếu isToday). ' +
      'An toàn: không khuyên ăn dưới mục tiêu calo, không khuyên tập bù quá sức; không chẩn đoán y tế. Chỉ nói điều có trong dữ liệu.',
    content: [{ text: JSON.stringify(data) }], schema: DAY_SCHEMA, think: 'LOW',
  });
}
// Evening check: after 21:00 (or when opened with ?check), show today's sheet once per day if something is missing.
function eveningCheck(force) {
  const k = dayKey();
  if (!force && (new Date().getHours() < 21 || S.checkShown === k || S.active)) return;
  if (!S.profile && !S.workouts.length) return;
  const d = dayScore(k);
  if (!force && !d.todo.length) return;
  S.checkShown = k; save(); openDay(k);
}
function scoreChart() {
  const first = Math.min(...[...S.workouts.map(w => w.startedAt), ...(S.body || []).map(b => b.t), ...Object.keys(S.food).map(dayStart)].filter(isFinite));
  if (!isFinite(first)) return '';
  const days = []; for (let i = 29; i >= 1; i--) { const k = addDays(dayKey(), -i); if (dayStart(k) + 864e5 > first) days.push(k); }
  if (days.length < 2) return '';
  const sc = days.map(k => dayScore(k).score), avg = Math.round(sc.reduce((a, b) => a + b, 0) / sc.length);
  return `<div class="section-h"><h2>Điểm kỷ luật mỗi ngày</h2><span class="muted small">TB ${avg}/100 · ${days.length} ngày</span></div>
    <div class="card">${chart(sc, days.map(k => new Date(k + 'T12:00').toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })))}</div>`;
}

