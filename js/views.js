// Remaining screens (progress, settings, recovery, library, more), headers and render().
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

let progMetric = 'best';
// Exercise picker for the progress page: picture, names, sessions and best weight; most recent first.
function openProgPicker() {
  openSheet(`<div class="sheet-h"><h3>Chọn bài</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <input id="progQ" class="search" placeholder="Tìm bài…" autocomplete="off"><div id="progList"></div>`);
  renderProgList('');
}
function renderProgList(q) {
  const f = fold(q.trim()), last = {};
  S.workouts.forEach(w => w.exercises.forEach(e => { if (!isCardio(e.name)) last[e.name] = Math.max(last[e.name] || 0, w.startedAt); }));
  const names = Object.keys(last).filter(n => exMatch(n, f)).sort((a, b) => last[b] - last[a]);
  $('#progList').innerHTML = names.map(n => { const b = bestOf(n), k = S.workouts.filter(w => w.exercises.some(e => e.name === n)).length;
    return `<button class="ex-row2${n === progEx ? ' on' : ''}" data-act="progSet" data-name="${esc(n)}">${exThumbSm(n)}<span class="grow"><b>${esc(n)}</b><small>${esc(EX_VI[n] || '')}${EX_VI[n] ? ' · ' : ''}${k} buổi · ${agoText((Date.now() - last[n]) / 36e5).toLowerCase()}</small></span><span class="prog">${b.maxW ? fmtNum(b.maxW) + ' kg' : ''}</span></button>`; }).join('') || '<div class="empty">Không tìm thấy</div>';
}
function viewProgress() {
  const names = [...new Set(S.workouts.flatMap(w => w.exercises.map(e => e.name)))].filter(n => !isCardio(n)).sort((a, b) => a.localeCompare(b));
  if (!names.length) return '<div class="empty">Chưa có dữ liệu.<br>Tiến độ từng bài tập sẽ hiện ở đây sau khi bạn tập.</div>';
  if (!names.includes(progEx)) progEx = names[0];
  const pts = S.workouts.filter(w => w.exercises.some(e => e.name === progEx)).map(w => {
    const e = w.exercises.find(e => e.name === progEx);
    return { t: w.startedAt, best: Math.max(...e.sets.map(s => e1rm(s.w, s.r))), maxW: Math.max(...e.sets.map(s => s.w)),
      vol: e.sets.reduce((a, s) => a + s.w * s.r, 0), sets: e.sets };
  }).reverse();
  const b = bestOf(progEx);
  const metricLabel = { best: 'Ước tính 1RM (kg)', maxW: 'Mức tạ cao nhất (kg)', vol: 'Khối lượng (kg × reps)' };
  const recent = pts.slice(-30);
  return `
    <button class="ex-row2 prog-cur" data-act="progPick">${exThumbSm(progEx)}<span class="grow"><b>${esc(progEx)}</b><small>${esc(EX_VI[progEx] || '')}</small></span><span class="prog">Đổi bài ${ic('chev')}</span></button>
    <div class="stats mt">
      <div class="stat"><b>${fmtNum(b.maxW)}</b><span>Tạ cao nhất (kg)</span></div>
      <div class="stat"><b>${fmtNum(Math.round(b.best * 10) / 10)}</b><span>1RM ước tính</span></div>
      <div class="stat"><b>${pts.length}</b><span>buổi đã tập</span></div>
    </div>
    <div class="card">
      <div class="seg" style="margin-bottom:10px">
        ${Object.keys(metricLabel).map(k => `<button class="${progMetric === k ? 'on' : ''}" data-act="metric" data-k="${k}">${{best:'1RM',maxW:'Tạ max',vol:'Khối lượng'}[k]}</button>`).join('')}
      </div>
      <div class="muted small">${metricLabel[progMetric]}</div>
      ${chart(recent.map(p => p[progMetric]), recent.map(p => new Date(p.t).toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit'})))}
    </div>
    <div class="section-h"><h2>Các buổi gần đây</h2></div>
    ${pts.slice().reverse().slice(0, 15).map(p => `<div class="card"><div class="muted small">${fmtDate(p.t)}</div><div>${p.sets.map(s => `${fmtNum(s.w)}×${s.r}`).join(' · ')}</div></div>`).join('')}`;
}

function viewSettings() {
  const opts = [60, 90, 120, 180];
  return `
    <div class="card">
      <div class="title" style="margin-bottom:10px">Thời gian nghỉ mặc định</div>
      <div class="seg">${opts.map(v => `<button class="${S.settings.rest === v ? 'on' : ''}" data-act="setRest" data-v="${v}">${fmtDur(v * 1000)}</button>`).join('')}</div>
      <div class="muted small mt">Đồng hồ nghỉ tự chạy khi bạn tick ✓ một set.</div>
    </div>
    <div class="card">
      <div class="title row" style="margin-bottom:10px"><span class="grow">${ic('bolt')} AI</span>${tip('ai')}</div>
      <div class="seg" style="margin-bottom:10px">${[['gemini', 'Gemini (miễn phí)'], ['claude', 'Claude']].map(([k, l]) => `<button class="${aiProv() === k ? 'on' : ''}" data-act="setAi" data-v="${k}">${l}</button>`).join('')}</div>
      ${hasKey() ? `<div class="small" style="margin-bottom:8px">Đã lưu key ${AI[aiProv()].name} <b>…${esc(getKey().slice(-4))}</b></div>` : ''}
      <input id="apiKey" type="password" placeholder="${hasKey() ? 'Dán key mới để thay' : AI[aiProv()].hint}" autocomplete="off" autocorrect="off" spellcheck="false">
      <div class="row gap mt"><button class="btn grow" data-act="saveKey">Lưu key</button><button class="btn grow" data-act="testKey" ${hasKey() ? '' : 'disabled'}>Thử kết nối</button></div>
      ${aiProv() === 'gemini' && hasKey() ? `<div class="small mt">Model: <b>${esc(gemModel())}</b>${lastAI ? ` · lần gần nhất ${(lastAI.ms / 1000).toFixed(1).replace('.', ',')} giây` : ''}</div>
        <button class="btn big mt" data-act="aiSpeed">${ic('bolt')} Đo tốc độ và chọn model nhanh nhất</button>` : ''}
      ${hasKey() ? '<button class="text-btn" data-act="clearKey">Xóa key</button>' : ''}
    </div>
    <div class="card">
      <div class="title row" style="margin-bottom:10px"><span class="grow">${ic('moon')} Mục tiêu giấc ngủ</span>${tip('sleep')}</div>
      <div class="row gap" style="margin-bottom:10px"><span class="grow small">Lên giường trước</span><label class="slot-time"><input type="time" id="setBed" value="${esc(sleepGoal().bed)}" aria-label="Giờ đi ngủ mục tiêu"></label></div>
      <div class="seg">${[7, 7.5, 8, 8.5, 9].map(v => `<button class="${sleepGoal().h === v ? 'on' : ''}" data-act="setSleepH" data-v="${v}">${fmtNum(v)}h</button>`).join('')}</div>
    </div>
    <div class="card"><div class="title" style="margin-bottom:8px">${ic('drop')} Nước và bổ sung</div>
      <div class="small" style="margin-bottom:8px">Mục tiêu nước: <b>${fmtNum(waterGoal() / 1000)} lít/ngày</b> (35 ml × cân nặng)</div>
      <input id="setSupps" placeholder="Thực phẩm bổ sung, cách nhau dấu phẩy (VD: Creatine, Whey)" value="${esc((S.settings.supps || []).join(', '))}"></div>
    <details class="card fold">
      <summary class="title">${ic('clock')} Nhắc ghi chép lúc 23:55</summary>
      <div class="muted small" style="margin:8px 0">Web app không tự hẹn giờ được, nên dùng app <b>Phím tắt</b> của iPhone:</div>
      <ol class="steps small" style="font-size:14px">
        <li>Mở app <b>Phím tắt</b> → tab <b>Tự động hóa</b> → nút <b>+</b>.</li>
        <li>Chọn <b>Thời gian trong ngày</b> → đặt <b>23:55</b>, <b>Hằng ngày</b> → chọn <b>Chạy ngay lập tức</b> → Tiếp.</li>
        <li>Thêm tác vụ <b>Hiển thị thông báo</b>, nội dung: <i>Đã ghi ăn và tập hôm nay chưa? Mở Gym Log.</i> → Xong.</li>
        <li>(Tùy chọn) Thêm tác vụ <b>Mở ứng dụng</b> và chọn <b>Gym Log</b> nếu có trong danh sách.</li>
      </ol>
      <div class="muted small mt">Mở app sau 21:00 mà còn thiếu, app tự hiện bảng để ghi bù.</div>
    </details>
    <div class="card">
      <div class="title row" style="margin-bottom:6px"><span class="grow">${ic('download')} Sao lưu dữ liệu</span>${tip('backup')}</div>
      <div class="small" style="margin-bottom:10px">Lần sao lưu cuối: <b>${S.lastBackup ? fmtDate(S.lastBackup) + ' (' + agoText((Date.now() - S.lastBackup) / 36e5) + ')' : 'chưa có'}</b></div>
      <div class="row gap"><button class="btn grow" data-act="exportData">Xuất dữ liệu</button><button class="btn grow" data-act="importData">Nhập dữ liệu</button></div>
    </div>
    <div class="card">
      <div class="title" style="margin-bottom:4px">Nguồn ảnh</div>
      <div class="muted small">Ảnh bài tập: <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noopener" style="color:var(--accent)">free-exercise-db</a> (Unlicense).</div>
      <details class="small" style="margin-top:6px"><summary class="muted">Ảnh món ăn từ Wikimedia Commons và Openverse, giấy phép CC hoặc public domain (${new Set(Object.values(DISH_SRC).map(x => x[0])).size} ảnh)</summary>
        ${[...new Map(Object.entries(DISH_SRC).map(([n, x]) => [x[0], [n, x]])).values()].map(([n, [file, who, lic, licUrl, page]]) =>
          `<div class="muted" style="margin-top:6px">${esc(n)}: <a href="${esc(page)}" target="_blank" rel="noopener" style="color:var(--accent)">${esc(file)}</a> · ${esc(who || 'không rõ tác giả')} · ${licUrl ? `<a href="${esc(licUrl)}" target="_blank" rel="noopener" style="color:var(--muted)">${esc(lic)}</a>` : esc(lic)}</div>`).join('')}
        <div class="muted" style="margin-top:6px">Ảnh đã được thu nhỏ và cắt vuông.</div></details>
    </div>
    <div class="card">
      <div class="title" style="margin-bottom:4px">Cài lên iPhone</div>
      <div class="muted small">Mở trang này bằng <b>Safari</b> → nút <b>Chia sẻ</b> (ô vuông có mũi tên) → <b>Thêm vào MH chính</b>. App sẽ chạy toàn màn hình và dùng được khi không có mạng.</div>
    </div>
    <div class="card">
      <div class="muted small" style="margin-bottom:10px">${S.workouts.length} buổi tập · ${S.routines.length} routine · Phiên bản ${APP_VERSION}</div>
      <button class="btn danger big" data-act="clearAll">Xóa toàn bộ dữ liệu</button>
    </div>`;
}

const MUS_EN = { chest: 'Pectorals', frontDelt: 'Front delts', sideDelt: 'Side delts', rearDelt: 'Rear delts', traps: 'Traps', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', abs: 'Abs', obliques: 'Obliques',
  lats: 'Lats', midBack: 'Mid back', lowerBack: 'Lower back', glutes: 'Glutes', quads: 'Quadriceps', adductors: 'Adductors', hamstrings: 'Hamstrings', calves: 'Calves' };
function recOverall(r = recovery()) {
  const xs = Object.values(r).filter(x => x.lastH != null), use = xs.length ? xs : Object.values(r);
  const pct = Math.round(use.reduce((a, x) => a + x.pct, 0) / use.length);
  return { pct, label: pct >= 85 ? 'Sẵn sàng cao' : pct >= 60 ? 'Sẵn sàng vừa' : 'Cần nghỉ', color: recColor(pct) };
}
function viewRecovery() {
  const r = recovery();
  const trained = Object.keys(MUSCLES).filter(m => r[m].lastH != null).sort((a, b) => r[a].pct - r[b].pct || r[a].lastH - r[b].lastH);
  const fresh = Object.keys(MUSCLES).filter(m => r[m].lastH == null);
  const split = [['thân trên (đẩy)', ['chest', 'frontDelt', 'triceps']], ['lưng và tay trước (kéo)', ['lats', 'midBack', 'biceps']],
    ['chân và mông', ['quads', 'hamstrings', 'glutes']], ['bụng', ['abs', 'obliques']]]
    .filter(([, g]) => g.every(m => r[m].pct >= 85)).map(([n]) => n);
  const tired = trained.filter(m => r[m].pct < 50).map(m => MUSCLES[m].toLowerCase());
  const advice = !S.workouts.length ? 'Chưa có dữ liệu. Tất cả nhóm cơ đều sẵn sàng, hãy bắt đầu buổi đầu tiên.'
    : split.length ? `Nên ưu tiên <b>${split[0]}</b>${split[1] ? ` hoặc <b>${split[1]}</b>` : ''}.${tired.length ? ` Tránh tập nặng ${tired.slice(0, 3).join(', ')}.` : ''}`
    : `Hầu hết nhóm cơ còn đang hồi phục. Hôm nay nên tập nhẹ, cardio hoặc nghỉ.${tired.length ? ` Tránh tập nặng ${tired.slice(0, 3).join(', ')}.` : ''}`;
  const label = m => { const x = r[m], c = x.lastH == null ? 'var(--muted)' : recColor(x.pct);
    return `<button class="mlabel" data-act="muscle" data-m="${m}"><span class="mname">${MUSCLES[m]}</span><b style="color:${c}">${x.lastH == null ? '—' : x.pct + '%'}</b><span class="mago">${agoText(x.lastH)}</span></button>`; };
  const [L, R] = BODY_LABELS[recSide];
  const card = m => {
    const x = r[m], has = x.lastH != null, c = has ? recColor(x.pct) : '#5f6470';
    const [tag, sub, icn] = !has ? ['Chưa tập', 'Chưa có dữ liệu', 'minus']
      : x.pct >= 100 ? ['Sẵn sàng', `Hồi phục hoàn toàn · ${agoText(x.lastH)}`, 'check']
      : x.pct >= 85 ? ['Sẵn sàng', `Gần hồi phục · còn ${x.hoursLeft} giờ`, 'check']
      : x.pct >= 50 ? [x.pct >= 75 ? 'Sắp xong' : 'Đang hồi', `Đang hồi phục · còn ${x.hoursLeft} giờ`, 'clock']
      : ['Tải cao', `Cần nghỉ ngơi · còn ${x.hoursLeft} giờ`, 'info'];
    return `<button class="mcard" data-act="muscle" data-m="${m}"><div class="mc-top">
      <span class="mc-ic" style="color:${c};background:${c}26">${ic(icn)}</span>
      <div class="grow"><div class="mc-name">${MUSCLES[m]} <span>(${MUS_EN[m]})</span></div><div class="mc-sub">${sub}</div></div>
      <div class="mc-right"><b class="mc-pct" style="color:${c}">${has ? x.pct + '%' : '—'}</b><span class="mc-tag" style="color:${c};background:${c}26">${tag}</span></div></div>
      <div class="mc-bar"><i style="width:${has ? x.pct : 0}%;background:${c}"></i></div></button>`;
  };
  return `
    <div class="card">
      <div class="map-h"><span>${ic('pulse')} Bản đồ cơ ${tip('rec')}</span>
        <div class="seg mini">${[['front', 'Trước'], ['back', 'Sau']].map(([k, l]) => `<button class="${recSide === k ? 'on' : ''}" data-act="recSide" data-v="${k}">${l}</button>`).join('')}</div></div>
      <div class="bodymap">
        <div class="mcol">${L.map(label).join('')}</div>
        <div class="mfig">${bodySvg(m => r[m].lastH == null ? '#2f6b45' : recColor(r[m].pct), { side: recSide, tap: true })}</div>
        <div class="mcol right">${R.map(label).join('')}</div>
      </div>
      <div class="legend"><span><i style="background:#22c55e"></i>Sẵn sàng (≥85%)</span><span><i style="background:#eab308"></i>Đang hồi (50–85%)</span><span><i style="background:#ef4444"></i>Cần nghỉ (&lt;50%)</span></div>
    </div>
    <div class="coach">${ic('bulb')}<div class="grow"><div class="coach-k">Khuyến nghị tập luyện<span>Hôm nay</span></div>${advice}</div></div>
    ${painCard()}
    ${weekSetsCard()}
    <div class="section-h"><h2>Chi tiết các nhóm cơ</h2>${trained.length ? `<span class="count">${trained.length} vùng đã tập</span>` : ''}</div>
    ${[...trained, ...fresh].map(card).join('')}
`;
}
let recSide = 'front';
function openMuscle(m) {
  const r = recovery()[m];
  const hits = e => { const x = getEx(e.name); return x && (x.p.includes(m) || (x.s || []).includes(m)); };
  const sessions = S.workouts.filter(w => w.exercises.some(hits)).slice(0, 8);
  const names = [...new Set(S.workouts.flatMap(w => w.exercises.filter(hits).map(e => e.name)))];
  const bests = names.map(n => ({ n, ...bestOf(n), main: getEx(n).p.includes(m) })).sort((a, b) => b.main - a.main || b.maxW - a.maxW);
  const suggest = DEFAULT_EX.filter(n => EX_MAP[n].p.includes(m) && !names.includes(n)).slice(0, 6);
  openSheet(`<div class="sheet-h"><h3>${MUSCLES[m]}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="mstat"><b style="color:${r.lastH == null ? 'var(--muted)' : recColor(r.pct)}">${r.lastH == null ? '—' : r.pct + '%'}</b>
      <div><div>${r.lastH == null ? 'Chưa tập nhóm cơ này' : r.hoursLeft ? `Còn ~${r.hoursLeft} giờ để hồi phục hoàn toàn` : 'Đã hồi phục, sẵn sàng tập'}</div>
      <div class="muted small">Lần cuối: ${agoText(r.lastH)}</div></div></div>
    ${bests.length ? `<h4>Mức tạ cao nhất</h4><div>${bests.map(b => `<button class="lib-item" data-act="showEx" data-name="${esc(b.n)}">
      <div class="grow">${esc(b.n)}${b.main ? '' : ' <span class="muted small">(cơ phụ)</span>'}${b.best ? `<div class="muted small">1RM ước tính ~${fmtNum(Math.round(b.best * 10) / 10)} kg</div>` : ''}</div>
      <b>${b.maxW ? fmtNum(b.maxW) + ' kg' : 'Tạ người'}</b></button>`).join('')}</div>` : ''}
    ${sessions.length ? `<h4>Lịch sử gần đây</h4>${sessions.map(w => `<div class="mhist">
      <div class="muted small">${fmtDate(w.startedAt)} · ${agoText((Date.now() - w.endedAt) / 36e5)}</div>
      ${w.exercises.filter(hits).map(e => `<div class="hist-ex">${exTag(e.name, `<em>${e.sets.map(fmtSet).join(' · ')}</em>`)}</div>`).join('')}
    </div>`).join('')}` : '<div class="empty">Chưa có buổi tập nào cho nhóm cơ này.</div>'}
    ${suggest.length ? `<h4>Bài tập gợi ý</h4><div class="chips wrap">${suggest.map(n => `<button class="chip" data-act="showEx" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}`);
}

let libGroup = 'all', libQ = '';
function viewLibrary() {
  return `<input class="search" id="libQ" placeholder="Tìm bài tập…" value="${esc(libQ)}" autocomplete="off" autocorrect="off">
    <div class="chips">${[['all', 'Tất cả'], ...Object.entries(GROUPS)].map(([k, l]) => `<button class="chip ${libGroup === k ? 'on' : ''}" data-act="libGroup" data-g="${k}">${l}</button>`).join('')}</div>
    <div id="libList">${libList()}</div>`;
}
function libList() {
  const q = fold(libQ.trim());
  const names = [...DEFAULT_EX, ...S.customEx.filter(n => !EX_MAP[n])]
    .filter(n => { const x = getEx(n); return (libGroup === 'all' || x?.g === libGroup) && exMatch(n, q); });
  if (!names.length) return '<div class="empty">Không tìm thấy bài tập</div>';
  return `<div class="pick-list">${names.map(n => exRow(n, null, 'showEx')).join('')}</div>`;
}
function openExercise(name) {
  const x = getEx(name);
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' hướng dẫn kỹ thuật');
  const b = bestOf(name), n = S.workouts.filter(w => w.exercises.some(e => e.name === name)).length;
  openSheet(`<div class="sheet-h"><h3>${esc(name)}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    ${EX_VI[name] ? `<div class="muted" style="margin:-4px 0 10px">${esc(EX_VI[name])}</div>` : ''}
    ${exImg(name, 0) ? `<div class="demo"><img src="${exImg(name, 0)}" alt="Tư thế bắt đầu"><img class="f2" src="${exImg(name, 1)}" alt="Tư thế kết thúc">
      <span class="demo-tag">Demo</span></div><div class="muted small" style="text-align:right;margin-top:4px">Ảnh: free-exercise-db</div>` : ''}
    ${x && !x.p.length ? '<div class="muted small" style="margin:10px 0">Bài cardio: tốt cho tim mạch và đốt calo, không tính vào phục hồi cơ. Ghi số phút (và km nếu có).</div>' : ''}
    ${x?.p.length ? `${bodySvg(m => x.p.includes(m) ? '#c6f432' : (x.s || []).includes(m) ? 'rgba(198,244,50,.38)' : null)}
      <div class="legend"><span><i style="background:#c6f432"></i>Cơ chính: ${x.p.map(m => MUSCLES[m]).join(', ')}</span>
      ${x.s?.length ? `<span><i style="background:rgba(198,244,50,.38)"></i>Cơ phụ: ${x.s.map(m => MUSCLES[m]).join(', ')}</span>` : ''}</div>` : ''}
    <a class="btn big yt" href="${yt}" target="_blank" rel="noopener">${ic('play')} Xem video mẫu trên YouTube</a>
    ${x?.steps?.length ? `<h4>Cách thực hiện</h4><ol class="steps">${x.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>` : ''}
    ${x?.tips?.length ? `<h4>Lưu ý</h4><ul class="tips">${x.tips.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    ${n ? `<h4>Thành tích của bạn</h4><div class="muted">Đã tập ${n} buổi · Tạ cao nhất ${fmtNum(b.maxW)} kg · 1RM ước tính ${fmtNum(Math.round(b.best * 10) / 10)} kg</div>` : ''}`);
}
function openMuscleChooser(name, cb, onCancel) {
  openSheet(`<div class="sheet-h"><h3>"${esc(name)}" tác động cơ nào?</h3><button class="link" data-act="closeSheet">Bỏ qua</button></div>
    <div class="muted small" style="margin-bottom:10px">Chọn cơ chính để app tính được độ phục hồi.</div>
    <div class="chips wrap">${Object.entries(MUSCLES).map(([k, l]) => `<button class="chip" data-act="chooseMuscle" data-m="${k}">${l}</button>`).join('')}</div>`,
    () => cb(name));
  muscleCb = m => {
    const g = { chest: 'chest', frontDelt: 'shoulders', sideDelt: 'shoulders', rearDelt: 'shoulders', traps: 'back', lats: 'back', midBack: 'back', lowerBack: 'back', biceps: 'arms', triceps: 'arms', forearms: 'arms', abs: 'core', obliques: 'core' }[m] || 'legs';
    S.exMeta[name] = { g, p: [m], s: [] }; save(); sheetOnClose = null; $('#sheet').hidden = true; cb(name);
  };
}
let muscleCb = null;

function homeHeader() {
  const st = streakDays(), d = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' });
  return `<div class="kicker">${ic('calendar')} ${esc(d)}</div><div class="row gap"><h1 class="grow">Hôm nay tập gì?</h1>${st >= 2 ? `<span class="streak">${ic('flame')} Chuỗi ${st} ngày</span>` : ''}</div>`;
}
function recHeader() {
  const o = recOverall();
  return `<div class="row gap"><div class="grow"><div class="kicker">Chỉ số thể trạng hôm nay</div><h1>Phục hồi cơ bắp</h1></div>
    <div class="rec-chip"><b><i style="background:${o.color}"></i><span style="color:${o.color}">${o.pct}%</span></b><small style="color:${o.color}">${o.label}</small></div></div>`;
}
function viewMore() {
  return `<div class="card" style="padding:4px 14px">${[['profile', 'trophy', 'Hồ sơ', `Khối nạc, % mỡ, Big 3, huy hiệu ${Object.keys(S.badges || {}).length}/${BADGES.length}`], ['history', 'calendar', 'Lịch sử', `Lịch từng ngày · ${S.workouts.length} buổi tập`], ['body', 'scale', 'Cơ thể', 'Cân nặng, vòng bụng, ảnh tiến độ'], ['progress', 'chart', 'Tiến độ', 'Biểu đồ từng bài'], ['settings', 'sliders', 'Cài đặt', 'Thời gian nghỉ, sao lưu']]
    .map(([k, i, l, d]) => `<button class="lib-item" data-act="tab" data-tab="${k}"><span class="ti-big">${ic(i)}</span><div class="grow"><div>${l}</div><div class="muted small">${d}</div></div><span class="chev">${ic('chev')}</span></button>`).join('')}</div>${weekSummary()}`;
}

const TABS = [['workout', 'barbell', 'Tập'], ['recovery', 'pulse', 'Phục hồi'], ['nutrition', 'apple', 'Thực đơn'], ['library', 'book', 'Thư viện'], ['more', 'grid', 'Thêm']];
const TITLES = { profile: 'Hồ sơ', vault: 'Kho ảnh body', workout: 'Tập luyện', recovery: 'Phục hồi cơ', nutrition: 'Thực đơn', library: 'Thư viện bài tập', more: 'Thêm', body: 'Cơ thể', history: 'Lịch sử', progress: 'Tiến độ', settings: 'Cài đặt', edit: 'Sửa buổi tập' };
const SUB = ['history', 'progress', 'settings', 'body', 'vault', 'profile'];
function render() {
  document.body.classList.toggle('on-active', tab === 'workout' && !!S.active);
  if (tab !== 'vault' && vault.key) vaultLock();
  $('#hdr').innerHTML = tab === 'workout' && S.active ? abar2()
    : tab === 'workout' ? homeHeader() : tab === 'recovery' ? recHeader()
    : `<h1>${SUB.includes(tab) ? `<button class="back" data-act="tab" data-tab="more" aria-label="Quay lại">${ic('back')}</button>` : ''}${TITLES[tab]}</h1>`;
  main.innerHTML = ({ workout: viewWorkout, recovery: viewRecovery, nutrition: viewNutrition, library: viewLibrary, more: viewMore, body: viewBody, vault: viewVault, profile: viewProfile, history: viewHistory, progress: viewProgress, settings: viewSettings, edit: viewEdit })[tab]();
  const cur = SUB.includes(tab) || tab === 'edit' ? 'more' : tab;
  $('#tabs').innerHTML = TABS.map(([k, i, l]) => `<button class="${cur === k ? 'on' : ''}" data-act="tab" data-tab="${k}">${ic(i)}${l}${k === 'workout' && S.active && tab !== 'workout' ? '<span class="dot"></span>' : ''}</button>`).join('');
}

