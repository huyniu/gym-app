// Home screen, weekly schedule, active workout screen, routines, rest timer, starting a session.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

function weekSummary() {
  if (!S.workouts.length) return '';
  const now = Date.now(), within = (a, b) => S.workouts.filter(w => w.startedAt >= now - a * 864e5 && w.startedAt < now - b * 864e5);
  const ws = within(7, 0), prev = within(14, 7);
  const kg = ws.reduce((a, w) => a + volume(w), 0), pkg = prev.reduce((a, w) => a + volume(w), 0);
  const mins = Math.round(ws.reduce((a, w) => a + (w.endedAt - w.startedAt), 0) / 6e4), goal = S.routines.filter(r => r.day).length;
  const kgFmt = v => v >= 1000 ? [fmtNum(Math.round(v / 100) / 10), 'tấn'] : [fmtNum(Math.round(v)), 'kg'];
  const [kv, ku] = kgFmt(kg), diff = kg - pkg, [dv, du] = kgFmt(Math.abs(diff));
  return `<div class="section-h"><h2 class="hs">${ic('chart')} 7 ngày qua</h2>${goal ? `<span class="muted small">${ws.length}/${goal} mục tiêu tuần</span>` : ''}</div>
  <div class="card stats-card"><div class="stats">
    <div class="stat"><b class="lime">${ws.length}</b><span>Buổi tập</span>${goal ? `<em>Đạt ${Math.min(100, Math.round(ws.length / goal * 100))}%</em>` : ''}</div>
    <div class="stat"><b>${kv}<small>${ku}</small></b><span>Khối lượng</span>${prev.length ? `<em class="${diff >= 0 ? 'lime' : ''}">${diff >= 0 ? '+' : '−'}${dv} ${du} so tuần trước</em>` : ''}</div>
    <div class="stat"><b>${Math.floor(mins / 60)}h${String(mins % 60).padStart(2, '0')}</b><span>Thời gian</span>${ws.length ? `<em>~${Math.round(mins / ws.length)}p / buổi</em>` : ''}</div>
  </div></div>`;
}

function weekStrip() {
  const now = new Date(), mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 6) % 7), st = schedState();
  return `<div class="week">${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d, i) => {
    const day = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i), s = day.getTime(), e = s + 864e5;
    const ws = S.workouts.filter(w => w.startedAt >= s && w.startedAt < e), done = ws.length > 0, today = +now >= s && +now < e;
    const r = done ? routineOfW(ws[ws.length - 1]) : st && s >= new Date().setHours(0, 0, 0, 0) ? st.plan[i + 1] : null;
    const lbl = r ? `<em>${esc(shortName(r))}</em>` : done ? '<em>Tự do</em>' : '';
    return today ? `<div class="day today"><small>Hôm nay</small><b>${d}</b>${done ? ic('check') : '<i></i>'}${lbl}</div>`
      : `<div class="day${done ? ' done' : ''}"><span>${d}</span>${done ? `<i>${ic('check')}</i>` : `<b>${day.getDate()}</b>`}${lbl}</div>`;
  }).join('')}</div>`;
}

// Pick what to train today: today's scheduled routine, else the most recovered routine, else a ready split.
function homeSuggestion() {
  const r = recovery();
  const musclesOf = rt => [...new Set(rt.exercises.flatMap(e => getEx(e.name)?.p || []))];
  const score = rt => { const ms = musclesOf(rt); return ms.length ? ms.reduce((a, m) => a + r[m].pct, 0) / ms.length : 0; };
  const pack = (k, rt, extra = {}) => ({ k, title: rt.name, sub: `${rt.exercises.length} bài · ${rt.exercises.reduce((t, e) => t + e.sets, 0)} set`,
    act: `data-act="startRoutine" data-id="${rt.id}"`, min: estMinutes(rt.exercises), tag: dayTag(rt.exercises), ...extra });
  const st = schedState();
  if (st && st.due) {
    const d = st.due, extra = {};
    if (!st.trainedToday) {
      extra.skip = d.id;
      const tired = musclesOf(d).filter(m => r[m].lastH != null && r[m].pct < 60).sort((a, b) => r[a].pct - r[b].pct);
      if (tired.length) extra.warn = `${tired.slice(0, 2).map(m => `${MUSCLES[m]} mới hồi ${r[m].pct}%`).join(', ')}: cân nhắc tập nhẹ hoặc nghỉ thêm.`;
      if (st.lag && st.todayR && st.todayR !== d) extra.alt = st.todayR;
    }
    if (st.dropped.length && (st.lag || st.trainedToday))
      extra.note = `${st.dropped.map(x => (x.name.split('·')[1] || x.name).trim()).join(', ')} tuần này không kịp${st.restLeft.length ? ` · có thể tập bù vào ${st.restLeft.map(x => DOW_VI[x]).join(' hoặc ')}` : ', tuần sau lịch bắt đầu lại'}.`;
    const k = st.trainedToday ? 'Đã tập hôm nay · buổi tiếp theo'
      : st.lag ? `Bù buổi bị lỡ · lịch lùi ${st.lag} buổi`
      : st.todayR === d ? 'Lịch hôm nay'
      : !st.todayR ? 'Ngày nghỉ theo lịch · buổi tiếp theo' : 'Đi trước lịch · buổi tiếp theo';
    return pack(k, d, extra);
  }
  if (S.routines.length) {
    const best = [...S.routines].sort((a, b) => score(b) - score(a))[0];
    return pack(st ? 'Xong lịch tuần · tập thêm?' : S.workouts.length ? `Gợi ý theo phục hồi · ${Math.round(score(best))}% sẵn sàng` : 'Bắt đầu nhanh', best);
  }
  // No routine yet: a sample workout for the first fully recovered split (core if none).
  const key = ['push', 'pull', 'legs'].find(k => SPLITS[k].muscles.every(m => r[m].pct >= 90)) || 'core', sp = SPLITS[key], exs = sp.ex.map(name => ({ name, sets: 3 }));
  return { k: !S.workouts.length ? 'Buổi đầu tiên · bài mẫu' : key === 'core' ? 'Cơ lớn còn mỏi · tập nhẹ' : 'Gợi ý theo phục hồi · bài mẫu',
    title: sp.name, sub: `${sp.ex.length} bài · ${sp.desc}`, act: `data-act="startSplit" data-k="${key}"`, min: estMinutes(exs), tag: dayTag(exs) };
}
// Rough session length: each set ~40 s of work plus its rest; cardio uses the minutes in its target.
function estMinutes(exs) {
  const sec = exs.reduce((t, e) => t + (isCardio(e.name) ? (parseInt(e.reps) || 15) * 60 : e.sets * (40 + (e.rest || S.settings.rest))), 0);
  return Math.max(5, Math.round(sec / 300) * 5);
}
function dayTag(exs) {
  const n = {}; let tot = 0;
  exs.forEach(e => { const x = getEx(e.name); if (!x || x.g === 'cardio') return; x.p.forEach(m => { n[m] = (n[m] || 0) + e.sets; tot += e.sets; }); });
  if (!tot) return '';
  const share = ms => ms.reduce((a, m) => a + (n[m] || 0), 0) / tot;
  const legs = share(['quads', 'hamstrings', 'glutes', 'calves', 'adductors']), core = share(['abs', 'obliques']);
  const push = share(['chest', 'frontDelt', 'sideDelt', 'triceps']), pull = share(['lats', 'midBack', 'biceps', 'traps', 'forearms', 'lowerBack']);
  if (legs >= .5) return 'Leg Day';
  if (core >= .5) return 'Core Day';
  if (legs > .25) return 'Full Body';
  if (push >= .7 * (push + pull)) return 'Push Day';
  if (pull >= .7 * (push + pull)) return 'Pull Day';
  return 'Upper Body';
}
// Consecutive training days, skipping rest days of the weekly schedule.
function streakDays() {
  const days = new Set(S.workouts.map(w => dayKey(w.startedAt))), sched = S.routines.some(r => r.day);
  const restDay = d => sched && !S.routines.some(r => r.day === (d.getDay() + 6) % 7 + 1);
  const d = new Date(); if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  for (let i = 0; i < 400; i++, d.setDate(d.getDate() - 1)) { if (days.has(dayKey(d))) n++; else if (!restDay(d)) break; }
  return n;
}

// Home: everything still to do today, as one row of small buttons
function todayTasks() {
  if (!S.profile && !S.workouts.length) return '';
  const out = [], hr = new Date().getHours(), t0 = dayStart(dayKey());
  if (!lastNight() && hr >= 4) out.push(['sleepLog', 'moon', 'Giấc ngủ', `data-k="${dayKey()}"`]);
  if (!(S.body || []).some(b => b.w && b.t >= t0) && hr < 12) out.push(['tab', 'scale', 'Cân', 'data-tab="body"']);
  const bp = bodyPending(), photoDue = !S.photoAt || daysAgo(S.photoAt) >= 7;
  if (bp || photoDue) out.push(['openVault', 'camera', bp === 'review' ? 'Chấm body' : bp === 'retake' ? 'Chụp lại body' : 'Ảnh body', '']);
  const wa = bodyLog().filter(b => b.waist).pop(); if (S.profile && (!wa || daysAgo(wa.t) >= 14)) out.push(['tab', 'scale', 'Đo bụng', 'data-tab="body"']);
  const sp = (S.settings.supps || []).filter(s => !suppsOf(dayKey()).includes(s)); if (sp.length && hr >= 12) out.push(['tab', 'check', sp[0] + (sp.length > 1 ? ` +${sp.length - 1}` : ''), 'data-tab="nutrition"']);
  if (hr >= 15 && waterOf(dayKey()) < waterGoal() / 2) out.push(['water', 'drop', 'Uống nước', 'data-v="250"']);
  if (S.workouts.length >= 3) { const since = S.lastBackup || Math.min(...S.workouts.map(w => w.startedAt)); if (Date.now() - since >= 7 * 864e5) out.push(['exportData', 'download', 'Sao lưu', '']); }
  return out.length ? `<div class="tasks"><span>Cần làm</span><div class="tasks-row">${out.map(([a, i, l, x]) => `<button class="task" data-act="${a}" ${x}>${ic(i)}${l}</button>`).join('')}</div></div>` : '';
}
function viewWorkout() {
  const a = S.active;
  if (!a) {
    const g = homeSuggestion(), st = schedState(), todayPlan = st && !st.trainedToday ? st.plan[st.dow] : null;
    return `${todayTasks()}${deloadCard()}${[0, 1].includes(new Date().getDay()) && S.workouts.length ? `<button class="next-meal" data-act="weekReport">${ic('chart')}<span class="grow"><b>Báo cáo tuần</b><small>Tổng kết tuần + dự đoán cân nặng tới Tết</small></span>${ic('chev')}</button>` : ''}${dayCard()}${weekStrip()}${sleepWarn()}
    <div class="hero">${ic('barbell', 'hero-wm')}
      <div class="hero-top"><span class="hero-tag"><i></i>${esc(g.k)}</span>${g.tag ? `<span class="hero-tag2">${esc(g.tag)}</span>` : ''}</div>
      <h3>${esc(g.title)}</h3>
      <p><span>${esc(g.sub)}</span>${g.min ? `<span class="sep">•</span><span class="soft">${ic('clock')} ~${g.min} phút</span>` : ''}</p>
      ${g.warn ? `<div class="hero-note">${ic('info')}<span>${esc(g.warn)}</span></div>` : ''}
      ${g.note ? `<div class="hero-note">${ic('calendar')}<span>${esc(g.note)}</span></div>` : ''}
      <button class="go" ${g.act}>${ic('play')} Bắt đầu</button>
      ${g.alt || g.skip ? `<div class="hero-alt">${g.alt ? `<button data-act="startRoutine" data-id="${g.alt.id}">Hoặc theo lịch: <b>${esc(g.alt.name)}</b></button>` : '<span></span>'}${g.skip ? `<button data-act="skipDue" data-id="${g.skip}">Bỏ qua buổi này</button>` : ''}</div>` : ''}
    </div>
    <div class="quick">
      <button class="qtile" data-act="startEmpty"><span class="qt-top"><span class="qt-ic">${ic('plus')}</span>${ic('chev')}</span><b>Tự chọn bài</b><small>Thêm bài trong lúc tập</small></button>
      <button class="qtile" data-act="newRoutine"><span class="qt-top"><span class="qt-ic">${ic('edit')}</span>${ic('chev')}</span><b>Tạo routine</b><small>Soạn sẵn danh sách bài</small></button>
    </div>
    ${weekSummary()}
    <div class="section-h"><h2 class="hs">Routine của tôi ${S.routines.length ? `<span class="count">${S.routines.length}</span>` : ''}</h2></div>
    ${S.routines.length ? sortedRoutines().map(r => `
      <div class="rt${r === todayPlan ? ' on' : ''}">
        <button class="rt-main" data-act="startRoutine" data-id="${r.id}">
          <span class="rt-ic">${ic('barbell')}</span>
          <span class="grow"><div class="rt-name">${esc(r.name)}${r === todayPlan ? '<span class="tag-lime">Hôm nay</span>' : ''}</div>
          <div class="rt-sub">${r.exercises.length} bài · ${r.exercises.reduce((t, e) => t + e.sets, 0)} set</div></span>
        </button>
        <button class="icon" data-act="editRoutine" data-id="${r.id}" aria-label="Sửa routine">${ic('edit')}</button>
      </div>`).join('') : `<button class="btn ghost big" data-act="newRoutine">${ic('plus')} Tạo routine đầu tiên (VD: Push / Pull / Legs)</button>`}
    ${S.routines.some(r => r.tpl) ? '' : `<button class="btn ghost big mt" data-act="loadTemplate">${ic('calendar')} Nạp lịch 5 buổi: Đẩy · Kéo · Chân · Thân trên · Thân dưới</button>`}`;
  }
  return viewActive();
}
// The exercise shown expanded: the one the user tapped, else the first with an unfinished set.
let focusEx = null;
function focusIndex() {
  const ex = S.active.exercises;
  if (focusEx != null && ex[focusEx]) return focusEx;
  const i = ex.findIndex(e => e.sets.some(s => !s.done));
  return i < 0 ? ex.length - 1 : i;
}
let exAllOpen = false;
const activeMs = a => Date.now() - a.startedAt - (a.pausedMs || 0) - (a.pausedAt ? Date.now() - a.pausedAt : 0);
// current exercise and set: the tapped one, else the first unfinished set
function activePos() {
  const a = S.active, i = focusIndex(), ex = a.exercises[i];
  return { i, j: ex ? ex.sets.findIndex(s => !s.done) : -1 };
}
function openPos() {
  const a = S.active, p = activePos(); if (p.j >= 0) return p;
  for (let i = 0; i < a.exercises.length; i++) { const j = a.exercises[i].sets.findIndex(s => !s.done); if (j >= 0) return { i, j }; }
  return { i: p.i, j: -1 };
}
// value shown for a set field: typed value, else target hint, else last time
function setVal(ex, j, f) {
  const s = ex.sets[j]; if (s[f] !== '') return num(s[f]);
  const last = lastSets(ex.name), p = last && (last[j] || last[last.length - 1]);
  if (f === 'w') { const hn = ex.reps ? weightHint(ex.name, ex.reps) : null, base = hn ? hn.w : p ? p.w : 0; return S.active?.wF ? Math.round(base * S.active.wF / 2.5) * 2.5 : base; }
  const r = parseReps(ex.reps); return p ? p.r : r ? r[1] : isCardio(ex.name) ? 20 : 10;
}
function abar2() {
  const a = S.active, sets = a.exercises.flatMap(e => e.sets), done = sets.filter(s => s.done).length;
  return `<div class="abar2"><div class="grow"><b>${esc(a.name)}</b><small>${done}/${sets.length} hiệp</small></div>
    <span class="ab-time${a.pausedAt ? ' paused' : ''}"><i></i><span id="elapsed">${fmtDur(activeMs(a))}</span></span></div>`;
}
function heroCard() {
  const a = S.active, { i, j } = activePos(), ex = a.exercises[i]; if (!ex) return '';
  const img = exImg(ex.name, 0);
  return `<div class="hero2">
    <button class="h2-img" data-act="showEx" data-name="${esc(ex.name)}">${img ? `<img src="${img}" alt=""><img class="f2" src="${exImg(ex.name, 1)}" alt="">` : `<span class="h2-ph">${esc(exTitle(ex.name))}</span>`}</button>
    <span class="h2-tag"><i></i>${j < 0 ? 'Xong bài' : 'Đang tập'} · ${i + 1} / ${a.exercises.length}</span>
    <button class="h2-info" data-act="showEx" data-name="${esc(ex.name)}" aria-label="Cách tập">${ic('info')}</button>
    <div class="h2-name"><b>${esc(exTitle(ex.name))}</b><small>${j < 0 ? `${ex.sets.length}/${ex.sets.length} hiệp` : `Hiệp ${j + 1} / ${ex.sets.length}`}</small></div>
    <div class="h2-prog">${a.exercises.map((e, k) => `<i class="${k === i ? 'on' : ''}"><b style="width:${e.sets.filter(s => s.done).length / e.sets.length * 100}%"></b></i>`).join('')}</div>
  </div>`;
}
function stepper(i, j, f, val, unit) {
  return `<div class="stp"><button data-act="step" data-i="${i}" data-j="${j}" data-f="${f}" data-v="-1" aria-label="Giảm">${ic('minus')}</button>
    <label><input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="${f}" value="${esc(fmtNum(val))}" aria-label="${unit}"><small>${unit}</small></label>
    <button data-act="step" data-i="${i}" data-j="${j}" data-f="${f}" data-v="1" aria-label="Tăng">${ic('plus')}</button></div>`;
}
function exCard2(ex, i, curI) {
  const cardio = isCardio(ex.name), body = isBodyEx(ex.name), n = ex.sets.filter(s => s.done).length, all = n === ex.sets.length;
  const pain = painHit(ex.name), open = i === curI || exAllOpen, cur = ex.sets.findIndex(s => !s.done), last = lastSets(ex.name), hint = ex.reps ? weightHint(ex.name, ex.reps) : null;
  const st = all ? ['done', 'Xong'] : i === curI ? ['cur', 'Đang tập'] : n ? ['part', 'Dở'] : ['todo', 'Chưa'];
  const prevTxt = j => { const p = last && last[j]; return p ? fmtSet(p, ex.name) : '—'; };
  const unitW = cardio ? 'km' : 'kg', unitR = cardio ? 'phút' : 'reps';
  return `<div class="ec ${st[0]}${open ? ' open' : ''}" id="ex${i}">
    <div class="ec-h"><button class="ec-hb" data-act="focusEx" data-i="${i}">${exPic(ex.name)}
      <span class="grow"><b>${esc(exTitle(ex.name))}</b><small>${EX_VI[ex.name] ? esc(ex.name) : esc(exVi(ex.name))}</small>
        <span class="ec-meta"><em class="st ${st[0]}">${st[1]}</em>${pain ? `<em class="st pain">Đau ${esc(pain.area.toLowerCase())}</em>` : ''}${n}/${ex.sets.length} hiệp${ex.reps ? ` · ${esc(ex.reps)}` : ''}${!cardio ? ` <span class="rest-c">${ic('clock')}${fmtRest(ex.rest || S.settings.rest)}</span>` : ''}</span></span></button>
      <button class="icon" data-act="exMenu" data-i="${i}" aria-label="Tùy chọn">⋯</button></div>
    ${open ? `<div class="ec-b">
      ${pain && !all ? `<div class="pain-w">${ic('info')}<span class="grow">${pain.level === 'p' ? `Bài này dồn lực vào ${esc(pain.area.toLowerCase())} đang đau${swapCandidates(ex.name).length ? '.' : ', không có bài thay an toàn: nên bỏ hôm nay.'}` : `Bài này có dùng tới ${esc(pain.area.toLowerCase())}: tập nhẹ, đau thì dừng.`}</span>${pain.level === 'p' ? (swapCandidates(ex.name).length ? `<button class="btn" data-act="exSwap" data-i="${i}">Đổi bài</button>` : `<button class="btn" data-act="exRemove" data-i="${i}">Bỏ bài</button>`) : ''}</div>` : ''}
      ${hint || (EX_LOAD[ex.name] && !body) ? `<div class="ec-note">${hint ? `<span class="up-pill${hint.up ? '' : ' hold'}">${ic(hint.up ? 'up' : 'minus')} ${hint.up ? 'Lên' : hint.down ? 'Giảm' : 'Giữ'} ${fmtNum(hint.w)} kg</span>` : ''}${EX_LOAD[ex.name] && !body ? `<span>${LOAD_NOTE[EX_LOAD[ex.name]]}</span>` : ''}</div>` : ''}
      ${i === curI ? (wu => wu && wu.length ? `<div class="warm">${ic('flame')}<span>Khởi động: <b>${wu.map(([w, r]) => `${fmtNum(w)}×${r}`).join(' · ')}</b></span></div>` : '')(warmups(ex, i)) : ''}
      <div class="ec-cols"><span>Hiệp</span><span>Lần trước</span><span>${body ? '' : unitW}</span><span>${unitR}</span><span></span></div>
      ${ex.sets.map((s, j) => j === cur && i === curI ? `<div class="ec-cur">
          <div class="ec-cur-h"><b>Hiệp ${j + 1}</b><span>Lần trước: ${prevTxt(j)}</span><button class="ring-btn" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Hoàn thành hiệp"></button></div>
          <div class="stps${body ? ' one' : ''}">${body ? '' : stepper(i, j, 'w', setVal(ex, j, 'w'), unitW)}${stepper(i, j, 'r', setVal(ex, j, 'r'), unitR)}</div>
          ${!body && !cardio && platesText(setVal(ex, j, 'w'), EX_LOAD[ex.name]) ? `<div class="plates">${ic('barbell')}<span class="grow">${platesText(setVal(ex, j, 'w'), EX_LOAD[ex.name])}</span>${EX_LOAD[ex.name] === 'bb' ? `<button class="link" data-act="barKg">thanh ${barKg()} kg</button>` : ''}</div>` : ''}</div>`
        : `<div class="ec-row ${s.done ? 'done' : ''}"><span class="no">${j + 1}</span><span class="pv">${prevTxt(j)}</span>
          <span>${body ? '' : `<input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w)}" placeholder="${esc(fmtNum(setVal(ex, j, 'w')))}">`}</span>
          <span><input inputmode="decimal" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${esc(fmtNum(setVal(ex, j, 'r')))}"></span>
          ${(g => `<button class="ring-btn${s.done ? ' on' : ''}"${g ? ` style="background:${g.col};border-color:${g.col}"` : ''} data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Hoàn thành hiệp">${g ? `<b>${g.score}</b>` : s.done ? ic('check') : ''}</button>`)(setGrade(ex, j))}</div>`).join('')}
      <div class="ec-f"><button data-act="addSet" data-i="${i}">${ic('plus')} Thêm hiệp</button>${ex.sets.length > 1 ? `<button class="muted" data-act="delSet" data-i="${i}">${ic('minus')} Bớt</button>` : ''}</div>
    </div>` : ''}
  </div>`;
}
function abot() {
  const a = S.active; if (!a) return '';
  const { i, j } = openPos(), ex = a.exercises[i], resting = restEnd > Date.now() && !a.pausedAt;
  let main;
  if (a.pausedAt) main = `<button class="ab-main off" data-act="pauseWorkout"><b>Đang tạm dừng</b><small>Bấm để tiếp tục</small></button>`;
  else if (resting) main = `<button class="ab-main rest" data-act="restSkip"><b>Nghỉ <span id="abRest">${fmtDur(restEnd - Date.now() + 999)}</span></b><small>Bấm để bỏ qua</small></button>`;
  else if (ex && j >= 0) { const c = isCardio(ex.name), w = setVal(ex, j, 'w'), r = setVal(ex, j, 'r');
    main = `<button class="ab-main" data-act="completeSet"><b>${ic('check')} Hoàn thành hiệp</b><small>Hiệp ${j + 1} · ${c ? `${fmtNum(r)} phút` : isBodyEx(ex.name) ? `${fmtNum(r)} reps` : `${fmtNum(w)} kg × ${fmtNum(r)}`}</small></button>`; }
  else main = `<button class="ab-main" data-act="finishWorkout"><b>${ic('check')} Kết thúc buổi tập</b><small>Đã xong mọi hiệp</small></button>`;
  return `<div class="abot" data-state="${a.pausedAt ? 'pause' : resting ? 'rest' : 'set'}">${resting ? setFeedback() + rirChips() : ''}<div class="ab-row">
    <button class="ab-side" data-act="pauseWorkout">${ic(a.pausedAt ? 'play' : 'pause')}<span>${a.pausedAt ? 'Tiếp tục' : 'Tạm dừng'}</span></button>
    ${main}
    <button class="ab-side end" data-act="finishWorkout"><i class="sq"></i><span>Kết thúc</span></button></div></div>`;
}
function viewActive() {
  const a = S.active, curI = activePos().i, n = a.exercises.filter(e => e.sets.every(s => s.done)).length;
  return `${sleepWarn()}${a.deload ? `<div class="deload-line">${ic('drop')} Tuần giảm tải: ít hiệp hơn, tạ ~90%, đừng cố phá kỷ lục</div>` : a.wF ? `<div class="deload-line">${ic('drop')} Buổi nhẹ theo trạng thái hôm nay: ít hiệp hơn, tạ ~${Math.round(a.wF * 100)}%</div>` : ''}${a.quick ? `<div class="deload-line" style="color:var(--warn);background:color-mix(in srgb,var(--warn) 12%,transparent)">${ic('clock')} Buổi nhanh ~30 phút: chỉ giữ bài chính</div>` : ''}${heroCard()}
    <div class="ec-head"><span>Bài tập <b>${n}/${a.exercises.length}</b></span><span class="grow"></span>
      <button class="icon" data-act="exAll" aria-label="${exAllOpen ? 'Thu gọn' : 'Mở tất cả'}">${ic(exAllOpen ? 'minus' : 'grid')}</button>
      <button class="icon add" data-act="addExercise" aria-label="Thêm bài">${ic('plus')}</button></div>
    ${a.exercises.map((ex, i) => exCard2(ex, i, curI)).join('') || '<div class="empty">Thêm bài tập đầu tiên để bắt đầu</div>'}
    <button class="text-btn" data-act="cancelWorkout">Hủy buổi tập</button>
    ${abot()}`;
}
function openExMenu(i) {
  const a = S.active, ex = a.exercises[i];
  openSheet(`<div class="sheet-h"><h3>${esc(exTitle(ex.name))}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="menu-list">
      <button data-act="showEx" data-name="${esc(ex.name)}">${ic('info')} Cách tập</button>
      ${i > 0 ? `<button data-act="exMove" data-i="${i}" data-d="-1">${ic('up')} Chuyển lên</button>` : ''}
      ${i < a.exercises.length - 1 ? `<button data-act="exMove" data-i="${i}" data-d="1"><span style="transform:rotate(180deg);display:inline-flex">${ic('up')}</span> Chuyển xuống</button>` : ''}
      <button data-act="exSwap" data-i="${i}">${ic('refresh')} Đổi bài (máy đang bận)</button>
      <button data-act="exRest" data-i="${i}">${ic('clock')} Thời gian nghỉ: ${fmtRest(ex.rest || S.settings.rest)}</button>
      <button class="danger" data-act="exRemove" data-i="${i}">${ic('x')} Xóa bài khỏi buổi</button>
    </div>`);
}
function viewEdit() {
  const w = editW, d = new Date(w.startedAt);
  const local = new Date(d - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 16);
  return `
    <div class="card">
      <input class="name-input" data-bind="editName" value="${esc(w.name)}" aria-label="Tên buổi tập">
      <div class="edit-meta">
        <label>Bắt đầu<input type="datetime-local" id="editStart" value="${local}"></label>
        <label>Số phút tập<input id="editDur" inputmode="numeric" value="${esc(w._dur)}"></label>
      </div>
    </div>
    ${w.exercises.map(exCard).join('') || '<div class="empty">Chưa có bài tập</div>'}
    <button class="btn big" data-act="addExercise">${ic('plus')} Thêm bài tập</button>
    <div class="row gap mt"><button class="btn" data-act="cancelEdit">Hủy</button><button class="btn primary grow" data-act="saveEdit">Lưu thay đổi</button></div>`;
}

function exCard(ex, i) {
  const last = lastSets(ex.name), b = bestOf(ex.name), editing = tab === 'edit', cardio = isCardio(ex.name), hint = !editing && ex.reps ? weightHint(ex.name, ex.reps) : null;
  const cur = editing ? -1 : ex.sets.findIndex(s => !s.done), img = exImg(ex.name, 0);
  return `<div class="card${editing ? '' : ' ex-focus'}" id="ex${i}">
    <div class="row gap">${editing || !img ? `<span class="exm">${exPic(ex.name)}</span>` : ''}<button class="grow ex-name" data-act="showEx" data-name="${esc(ex.name)}" style="flex-direction:column;align-items:flex-start;gap:0">
        <span class="title">${esc(ex.name)}${getEx(ex.name)?.steps?.length ? ` <span class="info">${ic('info')}</span>` : ''}</span>${exVi(ex.name) ? `<span class="ex-sub">${esc(exVi(ex.name))}</span>` : ''}</button>
      ${i > 0 ? `<button class="icon" data-act="moveEx" data-i="${i}" aria-label="Chuyển lên">${ic('up')}</button>` : ''}
      <button class="icon" data-act="removeEx" data-i="${i}" aria-label="Xóa bài tập">${ic('x')}</button></div>
    ${img && !editing ? `<button class="demo ex-photo" data-act="showEx" data-name="${esc(ex.name)}"><img src="${img}" alt=""><img class="f2" src="${exImg(ex.name, 1)}" alt=""></button>` : ''}
    ${ex.reps ? `<div class="target"><span>Mục tiêu: ${cardio ? '' : ex.sets.length + ' × '}${esc(ex.reps)}</span>${ex.rest ? `<span class="muted">Nghỉ ${fmtRest(ex.rest)}</span>` : ''}${hint ? `<span class="up-pill${hint.up ? '' : ' hold'}">${ic(hint.up ? 'up' : 'minus')} ${hint.up ? 'Lên' : hint.down ? 'Giảm' : 'Giữ'} ${fmtNum(hint.w)} kg</span>` : ''}</div>` : ''}
    ${EX_LOAD[ex.name] ? `<div class="load-note">${ic('info')} ${LOAD_NOTE[EX_LOAD[ex.name]]}</div>` : ''}
    ${b.best && !cardio ? `<div class="pr-line">${ic('trophy')} Kỷ lục: ${fmtNum(b.maxW)} kg · 1RM ước tính ~${fmtNum(Math.round(b.best))} kg</div>` : ''}
    <div class="sets">
      <div class="set head"><span>Set</span><span style="text-align:left">Trước</span><span>${cardio ? 'km' : 'kg'}</span><span>${cardio ? 'Phút' : 'Reps'}</span><span>${editing ? '' : '✓'}</span></div>
      ${ex.sets.map((s, j) => { const p = last && (last[j] || last[last.length - 1]), pj = last && last[j];
        const st = editing ? '' : s.done ? 'done' : j === cur ? 'cur' : 'later'; return `
      <div class="set ${st}">
        <span class="setno">${j + 1}</span>
        <button class="prev" data-act="copyLast" data-i="${i}" data-j="${j}" ${pj ? '' : 'disabled'} aria-label="Dùng lại mức tạ lần trước">${pj ? fmtSet(pj, ex.name) : '—'}</button>
        <input type="text" inputmode="decimal" data-i="${i}" data-j="${j}" data-f="w" value="${esc(s.w)}" placeholder="${hint ? esc(fmtNum(hint.w)) : p ? esc(fmtNum(p.w)) : '0'}">
        <input type="text" inputmode="numeric" data-i="${i}" data-j="${j}" data-f="r" value="${esc(s.r)}" placeholder="${p ? esc(p.r) : '0'}">
        ${editing ? `<button class="del" data-act="delSetAt" data-i="${i}" data-j="${j}" aria-label="Xóa set này">${ic('x')}</button>`
          : `<button class="check" data-act="toggleSet" data-i="${i}" data-j="${j}" aria-label="Hoàn thành set">${ic('check')}</button>`}
      </div>`; }).join('')}
    </div>
    ${!editing && !cardio && cur >= 0 ? `<div class="qchips"><span>Chỉnh tạ nhanh:</span>${[-2.5, 1.25, 2.5, 5, 10].map(v => `<button data-act="bump" data-i="${i}" data-v="${v}">${v > 0 ? '+' : '−'}${fmtNum(Math.abs(v))} kg</button>`).join('')}</div>` : ''}
    <div class="set-actions"><button class="btn" data-act="delSet" data-i="${i}">${ic('minus')} Bớt set</button><button class="btn" data-act="addSet" data-i="${i}">${ic('plus')} Thêm set</button></div>
  </div>`;
}

const schedSeq = () => S.routines.filter(r => r.day).sort((a, b) => a.day - b.day);
const routineOfW = w => { const seq = schedSeq(); return seq.find(r => r.id === w.routineId) || seq.find(r => r.name === w.name) || null; };
const shortName = r => { const p = (r.name.split('·')[1] || r.name).trim().split(/\s+/), w = p[p.length - 1]; return p.length > 1 ? w.charAt(0).toUpperCase() + w.slice(1) : w; };
// Sessions run in order within the week; progress never goes backwards; each week restarts from the first session.
function schedState(now = Date.now()) {
  const seq = schedSeq(); if (!seq.length) return null;
  const ws = weekStart(now), dow = dowOf(now), sod = new Date(now).setHours(0, 0, 0, 0);
  const marks = [...S.workouts.filter(w => w.startedAt >= ws && w.startedAt < now).map(w => seq.indexOf(routineOfW(w))),
    ...(S.skips || []).filter(s => s.t >= ws && s.t < now).map(s => seq.findIndex(r => r.id === s.id))].filter(i => i >= 0);
  const pos = marks.length ? Math.max(...marks) + 1 : 0;
  const trainedToday = S.workouts.some(w => w.startedAt >= sod && w.startedAt < now);
  const lag = Math.max(0, seq.filter(r => r.day < dow).length - pos);
  const plan = {}, from = trainedToday ? dow + 1 : dow; let k = pos;
  for (let d = from; d <= 7 && k < seq.length; d++) if (seq.some(r => r.day === d)) plan[d] = seq[k++];
  const restLeft = []; for (let d = from; d <= 7; d++) if (!seq.some(r => r.day === d)) restLeft.push(d);
  return { seq, due: seq[pos] || null, lag, dow, todayR: seq.find(r => r.day === dow) || null, trainedToday, plan, dropped: seq.slice(k), restLeft };
}

function openPicker(cb, onCancel) {
  pickCb = cb;
  openSheet(`<div class="sheet-h"><h3>Chọn bài tập</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <input id="pickQ" class="search" placeholder="Tìm hoặc nhập tên bài mới…" autocomplete="off" autocorrect="off">
    <div class="chips" id="pickChips"></div>
    <div id="pickList" class="pick-list"></div>`, onCancel);
  pickGroup = 'all'; renderPick('');
}
let pickGroup = 'all';
function renderPick(q) {
  const t = q.trim(), ql = t.toLowerCase();
  $('#pickChips').innerHTML = [['all', 'Tất cả'], ...Object.entries(GROUPS)].map(([k, l]) => `<button class="chip ${pickGroup === k ? 'on' : ''}" data-act="pickGroup" data-g="${k}">${l}</button>`).join('');
  // Recently used first, then alphabetical.
  const items = allExercises().filter(n => exMatch(n, fold(t)) && (pickGroup === 'all' || getEx(n)?.g === pickGroup))
    .map(n => [n, lastDoneH(n)]).sort((a, b) => (a[1] ?? 1e9) - (b[1] ?? 1e9) || a[0].localeCompare(b[0]));
  const exact = items.some(([n]) => n.toLowerCase() === ql);
  $('#pickList').innerHTML = (t && !exact ? `<button class="pick new" data-act="pick" data-name="${esc(t)}">${ic('plus')} Tạo bài "${esc(t)}"</button>` : '') +
    items.map(([n, h]) => exRow(n, h, 'pick')).join('');
}
function exRow(n, h, act) {
  const x = getEx(n);
  return `<button class="ex-row" data-act="${act}" data-name="${esc(n)}">${exThumb(n)}
    <div class="grow"><div class="ex-row-name">${esc(n)}</div>${EX_VI[n] ? `<div class="ex-row-vi">${esc(EX_VI[n])}</div>` : ''}
    <div class="muted small">${h != null ? agoText(h) : x ? (x.p.length ? x.p.map(m => MUSCLES[m]).join(', ') : 'Cardio') : 'Bài tự tạo'}</div></div></button>`;
}
function renderRoutineSheet() {
  openSheet(`<div class="sheet-h"><h3>${draft.id ? 'Sửa' : 'Tạo'} routine</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <input class="search" data-bind="draftName" placeholder="Tên routine (VD: Push Day)" value="${esc(draft.name)}">
    ${draft.exercises.map((e, i) => `<div class="row r-ex"><span class="grow">${exTag(e.name, e.reps ? `<em>${esc(e.reps)} rep</em>` : '')}</span>
      <button class="icon" data-act="draftSets" data-i="${i}" data-d="-1" aria-label="Bớt set">${ic('minus')}</button><span class="pill">${e.sets} set</span>
      <button class="icon" data-act="draftSets" data-i="${i}" data-d="1" aria-label="Thêm set">${ic('plus')}</button>
      <button class="icon" data-act="draftRemove" data-i="${i}" aria-label="Xóa">${ic('x')}</button></div>`).join('') || '<div class="empty">Chưa có bài tập</div>'}
    <button class="btn big mt" data-act="draftAdd">${ic('plus')} Thêm bài tập</button>
    <div class="row gap mt">${draft.id ? '<button class="btn danger" data-act="deleteRoutine">Xóa</button>' : ''}<button class="btn primary grow" data-act="saveRoutine">Lưu routine</button></div>`,
    () => { draft = null; });
}

let actx;
function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch (e) {} }
function beep() {
  try { unlockAudio(); const t = actx.currentTime;
    [0, .25, .5].forEach(o => { const g = actx.createGain(), osc = actx.createOscillator(); osc.frequency.value = 880;
      g.gain.setValueAtTime(.0001, t + o); g.gain.exponentialRampToValueAtTime(.35, t + o + .02); g.gain.exponentialRampToValueAtTime(.0001, t + o + .2);
      osc.connect(g).connect(actx.destination); osc.start(t + o); osc.stop(t + o + .22); });
  } catch (e) {}
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
}
function flash() { const f = $('#flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
function persistRest() { if (S.active) { S.active.restEnd = restEnd; S.active.restTotal = restTotal; save(); } }
function startRest(sec) { restTotal = sec; restEnd = Date.now() + sec * 1000; persistRest(); tick(); }
function stopRest() { restEnd = 0; persistRest(); tick(); }
function tick() {
  document.querySelectorAll('.ai-sec').forEach(s => { s.textContent = Math.floor((Date.now() - +s.dataset.t0) / 1000) + ' giây'; });
  const el = $('#elapsed'); if (el && S.active) el.textContent = fmtDur(activeMs(S.active));
  const ab = $('.abot');
  if (ab && S.active) { const want = S.active.pausedAt ? 'pause' : restEnd > Date.now() ? 'rest' : 'set';
    if (ab.dataset.state !== want) ab.outerHTML = abot(); else if (want === 'rest') $('#abRest').textContent = fmtDur(restEnd - Date.now() + 999); }
  const bar = $('#rest');
  if (!restEnd || !S.active) { bar.hidden = true; document.body.classList.remove('has-rest'); return; }
  const left = restEnd - Date.now();
  if (left <= 0) {
    // iOS has no vibration for web apps and suspends JS in the background, so:
    // just ended -> beep + full-screen flash; came back later -> say how long ago it ended.
    const over = -left;
    if (over < 5000) { beep(); flash(); toast('Hết giờ nghỉ! 💪 Vào set tiếp'); }
    else if (over < 30 * 60e3) { flash(); toast(`⏰ Đã hết giờ nghỉ ${over < 60e3 ? Math.round(over / 1000) + ' giây' : Math.round(over / 60e3) + ' phút'} trước`, 4000); }
    restEnd = 0; persistRest(); bar.hidden = true; document.body.classList.remove('has-rest'); return;
  }
  const onScreen = tab === 'workout'; bar.hidden = onScreen; document.body.classList.toggle('has-rest', !onScreen);
  $('#restTime').textContent = fmtDur(left + 999);
  $('#restRing').style.setProperty('--p', Math.min(100, left / (restTotal * 1000) * 100));
}
let wake = null;
async function requestWake() {
  try { if (S.active && 'wakeLock' in navigator && !wake && document.visibilityState === 'visible') {
    wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) {}
}
function releaseWake() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
function newSets(n, name) { return Array.from({ length: Math.max(1, n) }, () => ({ w: '', r: '', done: false })); }
function startFrom(name, exercises, extra = {}) {
  focusEx = null;
  const { mode, ...rest } = extra; extra = rest;
  const dl = deloadOn(), sf = Math.min(dl ? .6 : 1, mode?.setsF || 1), wf = Math.min(dl ? .9 : 1, mode?.wF || 1), ns = n => Math.max(1, Math.round(n * sf));
  if (mode?.quick) exercises = quickExs(exercises);
  S.active = { name, startedAt: Date.now(), ...(dl ? { deload: true } : {}), ...(wf < 1 ? { wF: wf } : {}), ...(mode?.quick ? { quick: true } : {}), ...(mode?.ready ? { ready: mode.ready } : {}), exercises: exercises.map(e => ({ name: e.name, sets: newSets(ns(e.sets)), planSets: ns(e.sets), ...(e.reps ? { reps: e.reps } : {}), ...(e.rest ? { rest: e.rest } : {}) })), ...extra };
  restEnd = 0; save(); tab = 'workout'; requestWake(); render(); window.scrollTo(0, 0);
  const hurt = S.active.exercises.filter(e => painHit(e.name)?.level === 'p').length;
  if (hurt) toast(`${hurt} bài dồn lực vào chỗ đang đau, có nút đổi bài trong từng bài`, 4000);
  else if (dl) toast('Tuần giảm tải: đã bớt số hiệp', 3000);
  else if (sf < 1) toast('Buổi nhẹ: đã bớt số hiệp và mức tạ', 3000);
}
