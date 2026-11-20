// Actions (A), event listeners and startup.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

$('#restRing').innerHTML = ic('clock');
setInterval(tick, 250);

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && vault.key) { vaultLock(); if (tab === 'vault') render(); } if (document.visibilityState === 'visible') { requestWake(); tick(); if ($('#sheet').hidden) eveningCheck(false); } });

const A = {
  tab: d => {
    if (tab === 'edit' && d.tab !== 'edit') { if (JSON.stringify(editW) !== editOrig && !confirm('Bỏ các thay đổi chưa lưu?')) return; editW = null; }
    tab = d.tab; render(); window.scrollTo(0, 0);
  },
  editWorkout: d => {
    const w = S.workouts.find(x => x.id === d.id); if (!w) return;
    editW = JSON.parse(JSON.stringify(w));
    editW._dur = String(Math.max(1, Math.round((w.endedAt - w.startedAt) / 6e4)));
    editW.exercises.forEach(e => e.sets.forEach(s => { s.w = String(s.w); s.r = String(s.r); s.done = true; }));
    editOrig = JSON.stringify(editW); tab = 'edit'; render(); window.scrollTo(0, 0);
  },
  cancelEdit: () => { if (JSON.stringify(editW) !== editOrig && !confirm('Bỏ các thay đổi chưa lưu?')) return; const id = editW.id; editW = null; tab = 'history'; openId = id; render(); },
  saveEdit: () => {
    const exs = editW.exercises.map(e => ({ name: e.name, sets: e.sets.map(s => ({ w: num(s.w), r: num(s.r) })).filter(s => s.r > 0) })).filter(e => e.sets.length);
    if (!exs.length) { toast('Cần ít nhất 1 set có số reps'); return; }
    if (!isFinite(editW.startedAt) || editW.startedAt > Date.now()) { toast('Ngày giờ bắt đầu không hợp lệ'); return; }
    const dur = num(editW._dur); if (dur < 1 || dur > 600) { toast('Thời lượng phải từ 1 đến 600 phút'); return; }
    const w = { id: editW.id, name: editW.name.trim() || 'Buổi tập', startedAt: editW.startedAt, endedAt: editW.startedAt + dur * 6e4, exercises: exs,
      ...(editW.plan ? { plan: editW.plan } : {}), ...(editW.routineId ? { routineId: editW.routineId } : {}) };
    S.workouts = (S.workouts.some(x => x.id === w.id) ? S.workouts.map(x => x.id === w.id ? w : x) : [...S.workouts, w]).sort((a, b) => b.startedAt - a.startedAt);
    recomputePRs(); save(); editW = null; tab = 'history'; openId = w.id; render(); window.scrollTo(0, 0); toast('Đã lưu thay đổi');
  },
  delSetAt: d => { const ex = target().exercises[+d.i]; if (ex.sets.length > 1) { ex.sets.splice(+d.j, 1); render(); } else toast('Mỗi bài cần ít nhất 1 set (hoặc xóa cả bài)'); },
  startEmpty: () => startFrom('Buổi tập ' + new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }), []),
  startRoutine: d => { const r = S.routines.find(x => x.id === d.id); if (r) openReady(r.name, r.exercises, { routineId: r.id }); },
  startSplit: d => { const sp = SPLITS[d.k]; if (sp) openReady(sp.name, sp.ex.map(name => ({ name, sets: 3 })), {}); },
  addExercise: () => openPicker(name => { target().exercises.push({ name, sets: newSets(lastSets(name)?.length || 3) }); save(); render(); window.scrollTo(0, document.body.scrollHeight); }),
  removeEx: d => { const ex = target().exercises[+d.i]; if (confirm(`Xóa "${ex.name}" khỏi buổi tập?`)) { target().exercises.splice(+d.i, 1); focusEx = null; save(); render(); } },
  moveEx: d => { const i = +d.i, a = target().exercises; [a[i - 1], a[i]] = [a[i], a[i - 1]]; focusEx = null; save(); render(); },
  addSet: d => { const ex = target().exercises[+d.i], p = ex.sets[ex.sets.length - 1]; ex.sets.push({ w: p ? p.w : '', r: p ? p.r : '', done: tab === 'edit' }); save(); render(); },
  delSet: d => { const ex = target().exercises[+d.i]; if (ex.sets.length > 1) { ex.sets.pop(); save(); render(); } },
  toggleSet: d => {
    const ex = S.active.exercises[+d.i], s = ex.sets[+d.j];
    if (!s.done) {
      const last = lastSets(ex.name), p = last && (last[+d.j] || last[last.length - 1]);
      const hn = weightHint(ex.name, ex.reps); if (s.w === '' && (hn || p)) s.w = String(hn ? hn.w : p.w);
      if (s.r === '' && p) s.r = String(p.r);
      if (s.r === '' || num(s.r) <= 0) { toast(isCardio(ex.name) ? 'Nhập số phút trước nhé' : 'Nhập số reps trước nhé'); return; }
      const w = num(s.w), maxW = bestOf(ex.name).maxW;
      if (!isCardio(ex.name) && (w > 300 || (maxW > 0 && w > maxW * 3)) && !confirm(`${fmtNum(w)} kg cho ${ex.name}${maxW ? ` (cao nhất trước đây ${fmtNum(maxW)} kg)` : ''}. Có đúng không?`)) return;
      s.done = true; S.active.lastSet = { i: +d.i, j: +d.j }; s.g = setGrade(ex, +d.j)?.score; if (!isCardio(ex.name)) startRest(ex.rest || S.settings.rest);
      if (ex.sets.every(x => x.done) && focusEx === +d.i) focusEx = null;
      if (ex.sets.every(x => x.done) && !isCardio(ex.name)) setTimeout(() => openExGrade(+d.i), 250);
    } else s.done = false;
    save(); render();
  },
  restAdj: d => { restEnd += +d.d * 1000; restTotal = Math.max(1, restTotal + +d.d); persistRest(); tick(); },
  restSkip: () => stopRest(),
  cancelWorkout: () => { if (confirm('Hủy buổi tập này? Dữ liệu buổi này sẽ không được lưu.')) { S.active = null; restEnd = 0; save(); releaseWake(); render(); } },
  finishWorkout: () => {
    const a = S.active;
    const exs = a.exercises.map(e => ({ name: e.name, sets: e.sets.filter(s => s.done).map(s => ({ w: num(s.w), r: num(s.r), ...(s.rir != null ? { rir: s.rir } : {}) })), ...(e.skipped ? { skipped: true } : {}) })).filter(e => e.sets.length);
    if (!exs.length) { if (confirm('Chưa có set nào được tick ✓. Hủy buổi tập?')) { S.active = null; restEnd = 0; save(); releaseWake(); render(); } return; }
    if (!confirm('Kết thúc và lưu buổi tập?')) return;
    const prs = exs.filter(e => { const b = bestOf(e.name); return !isCardio(e.name) && b.maxW > 0 && Math.max(...e.sets.map(s => s.w)) > b.maxW; }).map(e => e.name);
    const w = { id: uid(), name: a.name.trim() || 'Buổi tập', startedAt: a.startedAt, endedAt: a.startedAt + activeMs(a), exercises: exs, prs,
      plan: a.exercises.map(e => ({ name: e.name, sets: e.sets.length, ...(e.reps ? { reps: e.reps } : {}) })), ...(a.routineId ? { routineId: a.routineId } : {}), ...(a.ready ? { ready: a.ready } : {}), ...(a.quick ? { quick: true } : {}) };
    S.workouts.unshift(w); S.active = null; restEnd = 0; save(); releaseWake();
    tab = 'history'; openId = w.id; render(); window.scrollTo(0, 0);
    toast(prs.length ? `🏆 PR mới: ${prs.join(', ')}` : 'Đã lưu buổi tập 🎉');
    // Show the review; when not started from a routine, it also offers to save it as one.
    const plan = a.exercises.map(e => ({ name: e.name, sets: e.sets.length }));
    const offer = !a.routineId && !S.routines.some(r => r.name.toLowerCase() === w.name.toLowerCase());
    routineOffer = offer ? { name: w.name, exercises: plan } : null;
    setTimeout(() => openReview(w.id, offer), 500);
  },
  saveOffer: () => { if (!routineOffer) return; draft = { id: null, ...routineOffer }; routineOffer = null; renderRoutineSheet(); },
  histMode: d => { histMode = d.v; render(); },
  calNav: d => { const n = new Date(), c = calM || new Date(n.getFullYear(), n.getMonth(), 1); calM = new Date(c.getFullYear(), c.getMonth() + +d.v, 1); render(); },
  calDay: d => openDay(d.k),
  calMode: d => { calMode = d.v; render(); },
  calWeek: d => { calW = (calW ?? weekStart()) + +d.v * 7 * 864e5; if (calW >= weekStart()) calW = null; render(); },
  dayEditW: d => { closeSheet(); A.editWorkout(d); },
  setsNav: d => { setsWeek = (setsWeek ?? weekStart()) + +d.v * 7 * 864e5; if (setsWeek >= weekStart()) setsWeek = null; render(); },
  setsMuscle: d => openSetsMuscle(d.m, d.w),
  toggleHist: d => { openId = openId === d.id ? null : d.id; render(); },
  deleteWorkout: d => { if (confirm('Xóa buổi tập này vĩnh viễn?')) { S.workouts = S.workouts.filter(w => w.id !== d.id); recomputePRs(); save(); render(); } },
  repeatWorkout: d => {
    if (S.active) { toast('Đang có buổi tập dở — kết thúc trước đã'); return; }
    const w = S.workouts.find(x => x.id === d.id); startFrom(w.name, w.exercises.map(e => ({ name: e.name, sets: e.sets.length })));
  },
  histToRoutine: d => { const w = S.workouts.find(x => x.id === d.id); draft = { id: null, name: w.name, exercises: w.exercises.map(e => ({ name: e.name, sets: e.sets.length })) }; renderRoutineSheet(); },
  loadTemplate: () => {
    if (!confirm('Thêm 5 routine theo lịch tập: T2 Đẩy, T3 Kéo, T4 Chân, T6 Thân trên, T7 Thân dưới?')) return;
    ROUTINE_TPL.forEach(t => S.routines.push({ id: uid(), name: t.name, day: t.day, tpl: true,
      exercises: t.ex.map(([name, sets, reps, rest]) => ({ name, sets, reps, ...(rest ? { rest } : {}) })) }));
    save(); render(); toast('Đã thêm 5 routine theo lịch');
  },
  reviewOpen: d => { aiWarm(); openReview(d.id); },
  aiReview: async d => {
    const spin = `<div class="empty">${ic('refresh')} AI đang xem buổi tập… <span class="ai-sec" data-t0="${Date.now()}"></span></div>`; $('#aiBox').innerHTML = spin;
    const part = t => { const p = partialJSON(t), box = $('#aiBox'); if (box && p?.summary) box.innerHTML = aiReviewHtml({ ...p, nextSession: (p.nextSession || []).filter(n => n.advice) }) + spin; };
    try { const a = await aiReviewWorkout(d.id, part), w = S.workouts.find(x => x.id === d.id); if (w) { w.ai = a; save(); } if ($('#aiBox')) $('#aiBox').innerHTML = aiReviewHtml(a) + aiStamp(); }
    catch (e) { if ($('#aiBox')) $('#aiBox').innerHTML = `<div class="muted small" style="color:var(--danger);margin:10px 0">${esc(e.message)}</div><button class="btn big" data-act="aiReview" data-id="${d.id}">Thử lại</button>`; }
  },
  foodDay: d => { const t = new Date(foodDay + 'T12:00'); t.setDate(t.getDate() + +d.d); const k = dayKey(t); if (k <= dayKey()) { foodDay = k; render(); } },
  foodEdit: d => openFoodEdit(d.id),
  foodEditSave: () => {
    const x = findFood(foodEditing?.id); if (!x) return; const f = x.f, k = num($('#feK').value);
    if (!(k >= 0)) { toast('Kcal không hợp lệ'); return; }
    const [hh, mm] = ($('#feTime').value || hhmm(f.t)).split(':').map(Number);
    Object.assign(f, { name: $('#feName').value.trim() || f.name, g: Math.round(num($('#feG').value)) || 0, kcal: k, p: num($('#feP').value), c: num($('#feC').value), f: num($('#feF').value), t: dayStart(x.k) + hh * 36e5 + mm * 6e4, edited: true });
    const dish = DISHES.find(z => z[0] === f.name); if (dish) f.dish = dish[0];
    save(); sheetOnClose = null; closeSheet(); foodEditing = null; render(); toast('Đã sửa');
  },
  foodEditDel: () => { const x = findFood(foodEditing?.id); if (!x || !confirm('Xóa món này?')) return; S.food[x.k] = S.food[x.k].filter(f => f.id !== x.f.id); if (!S.food[x.k].length) delete S.food[x.k]; save(); sheetOnClose = null; closeSheet(); foodEditing = null; render(); },
  delFood: d => { S.food[foodDay] = (S.food[foodDay] || []).filter(f => f.id !== d.id); if (!S.food[foodDay].length) delete S.food[foodDay]; save(); render(); },
  snapMeal: () => { if (!hasKey()) { toast('Nhập API key trong Thêm → Cài đặt trước', 3500); return; } aiWarm(); $('#mealFile').click(); },
  mealAddItem: () => { mealDraft.items.push({ name: '', grams: 100, kcal: 0, protein: 0, carbs: 0, fat: 0, per: { kcal: 0, protein: 0, carbs: 0, fat: 0 } }); renderMealSheet(); setTimeout(() => { const ins = document.querySelectorAll('.mi-name'); ins[ins.length - 1]?.focus(); }, 50); },
  mealFix: async () => {
    const m = mealDraft, fix = $('#mealFix').value.trim(); if (!fix) { toast('Ghi chỗ AI nhìn sai trước'); return; }
    const prev = m.items.map(i => `${i.name} ${Math.round(i.grams)} g`).join(', ');
    const hint = [m.hint, `Lần trước bạn liệt kê: ${prev}. Người dùng sửa lại: ${fix}. Tính lại toàn bộ bữa theo lời sửa này.`].filter(Boolean).join('\n');
    m.stage = 'busy'; renderMealSheet();
    try { const r = await aiMeal(m.img, hint, mealPart); m.items = (r.isFood ? r.items : []).filter(i => i.grams > 0).map(i => ({ ...i, per: { kcal: i.kcal / i.grams, protein: i.protein / i.grams, carbs: i.carbs / i.grams, fat: i.fat / i.grams } })); m.note = r.note; m.hint = [m.hint, fix].filter(Boolean).join('. '); }
    catch (e) { toast(e.message, 6000); }
    m.stage = 'edit'; if (mealDraft === m) renderMealSheet();
  },
  mealAnalyze: async () => {
    const m = mealDraft; m.hint = $('#mealHint').value.trim(); m.stage = 'busy'; renderMealSheet();
    try {
      const r = await aiMeal(m.img, m.hint, mealPart);
      m.items = (r.isFood ? r.items : []).filter(i => i.grams > 0).map(i => ({ ...i, per: { kcal: i.kcal / i.grams, protein: i.protein / i.grams, carbs: i.carbs / i.grams, fat: i.fat / i.grams } }));
      m.note = r.isFood ? r.note : 'Ảnh này không giống đồ ăn.'; m.stage = 'edit';
    } catch (e) { m.stage = 'note'; toast(e.message, 9000); }
    if (mealDraft === m) renderMealSheet();
  },
  mealDel: d => { mealDraft.items.splice(+d.i, 1); renderMealSheet(); },
  mealSave: async () => {
    let ph = null;
    if (mealDraft.img) { const src = await thumbOf(mealDraft.img); if (src) { ph = uid(); S.photos = { ...(S.photos || {}), [ph]: { t: Date.now(), src } }; } }
    addFood(mealDraft.items.filter(i => i.grams > 0 || i.kcal > 0).map(i => ({ name: i.name.trim() || 'Món ăn', g: Math.round(i.grams), kcal: i.kcal, p: i.protein, c: i.carbs, f: i.fat, src: 'ai', ...(ph ? { ph } : {}) })));
    const lbl = `${slot.meal.toLowerCase()} ${dayLabel(slot.k).toLowerCase()} lúc ${slot.time}`; mealDraft = null; slot = null; sheetOnClose = null; closeSheet(); render(); toast(`Đã thêm vào bữa ${lbl}`);
  },
  addFoodManual: () => openManualFood(),
  famOpen: () => openFamily(),
  famSnap: () => { if (!hasKey()) { toast('Nhập API key trong Thêm → Cài đặt trước, hoặc chọn món bằng tay', 3500); return; } aiWarm(); $('#famFile').click(); },
  famStep: d => famStep(+d.i, +d.d),
  famAdd: d => { const x = famDraft._extra[+d.i]; if (x) { famDraft.items.push({ ...x, n: 1 }); renderFamily(); const p = $('#sheetPanel'); if (p) p.scrollTop = p.scrollHeight; } },
  famBowl: () => { const z = [120, 150, 180, 220, 250], i = z.indexOf(bowlG()); S.settings.bowlG = z[(i + 1) % z.length]; save(); renderFamily(); },
  famSave: () => famSave(),
  dishPick: d => {
    const x = DISHES[+d.i], n = num(prompt(`${x[0]} (${x[1]} ≈ ${x[3]} kcal). Ăn bao nhiêu phần? 1 = cả phần, 0,5 = nửa phần`, '1')); if (n <= 0) return;
    addFood([{ name: n === 1 ? x[0] : `${x[0]} (${fmtNum(n)} phần)`, g: Math.round(x[2] * n), kcal: x[3] * n, p: x[4] * n, c: x[5] * n, f: x[6] * n, src: 'manual', dish: x[0] }]);
    slot = null; closeSheet(); render(); toast(`Đã thêm ${Math.round(x[3] * n)} kcal`);
  },
  askDishAI: async () => {
    const q = $('#mfQ').value.trim(); if (!q) return;
    if (!hasKey()) { toast('Nhập API key trong Thêm → Cài đặt trước', 3500); return; }
    const m = mealDraft = { img: null, stage: 'busy', hint: q, items: [] }; renderMealSheet();
    try {
      const r = await aiMeal(null, q, mealPart);
      m.items = (r.isFood ? r.items : []).filter(i => i.grams > 0).map(i => ({ ...i, per: { kcal: i.kcal / i.grams, protein: i.protein / i.grams, carbs: i.carbs / i.grams, fat: i.fat / i.grams } }));
      m.note = r.isFood ? r.note : 'Không nhận ra món ăn này.'; m.stage = 'edit';
    } catch (e) { m.stage = 'edit'; m.note = e.message; }
    if (mealDraft === m) renderMealSheet();
  },
  setSlotMeal: d => {
    slot.meal = d.v; slot.guessed = false;
    if (mealOf(slotTime()) !== d.v) { slot.time = mealDefaultTime(d.v); if ($('#slotTime')) $('#slotTime').value = slot.time; }
    document.querySelectorAll('[data-act="setSlotMeal"]').forEach(b => b.classList.toggle('on', b.dataset.v === d.v)); $('.slot-hint')?.remove();
  },
  mfPick: d => {
    const g = num(prompt(`${d.name}: bao nhiêu gram (đã nấu chín)?`, '100')); if (g <= 0) return;
    const [k, p, c, f] = macro(d.name, g); addFood([{ name: d.name, g, kcal: k, p, c, f, src: 'manual' }]); slot = null; closeSheet(); render(); toast(`Đã thêm ${Math.round(k)} kcal`);
  },
  mfSave: () => {
    const name = $('#mfName').value.trim(), k = num($('#mfKcal').value), p = num($('#mfP').value);
    if (!name || k <= 0) { toast('Nhập tên món và số calo'); return; }
    addFood([{ name, g: 0, kcal: k, p, c: 0, f: 0, src: 'manual' }]); slot = null; closeSheet(); render(); toast(`Đã thêm ${Math.round(k)} kcal`);
  },
  saveKey: () => {
    const v = $('#apiKey').value.trim();
    if (!v) { toast('Dán API key vào ô trước'); return; }
    const p = AI[aiProv()];
    if (!p.prefix.some(x => v.startsWith(x))) { toast(`Key ${p.name} phải bắt đầu bằng ${p.prefix.join(" hoặc ")}`, 3000); return; }
    try { localStorage.setItem(p.store, v); } catch (e) {} render(); toast('Đã lưu key ' + p.name);
  },
  clearKey: () => { if (confirm('Xóa API key khỏi máy này?')) { try { localStorage.removeItem(AI[aiProv()].store); } catch (e) {} render(); } },
  aiSpeed: async () => {
    if (!hasKey()) { toast('Nhập key Gemini trước'); return; }
    const rows = {}, show = done => openSheet(`<div class="sheet-h"><h3>Đo tốc độ Gemini</h3><button class="link" data-act="closeSheet">Đóng</button></div>
      <div class="muted small" style="margin-bottom:8px">Gửi cùng một ảnh món ăn nhỏ tới từng model Flash mà key của bạn dùng được, rồi chọn model nhanh nhất trả lời được.</div>
      <div class="rev">${Object.entries(rows).map(([m, x]) => `<div class="rev-i"><span style="color:${!x ? 'var(--muted)' : x.ok ? 'var(--ok)' : 'var(--danger)'}">${ic(!x ? 'clock' : x.ok ? 'check' : 'x')}</span>
        <span class="grow">${esc(m)}${m === gemModel() ? ' <b class="lime">· đang dùng</b>' : ''}<br><span class="muted small">${!x ? 'đang thử…' : x.ok ? (x.ms / 1000).toFixed(1).replace('.', ',') + ' giây' : esc(x.err)}</span></span></div>`).join('')}</div>
      ${done || ''}`);
    show(); let res;
    try { res = await geminiSpeedTest((m, x) => { rows[m] = x; show(); }); }
    catch (e) { show(`<div class="small mt" style="color:var(--danger)">${esc(e.message)}</div>`); return; }
    const okR = res.filter(x => x.ok).sort((a, b) => a.ms - b.ms);
    if (!okR.length) { show('<div class="small mt" style="color:var(--danger)">Không model nào trả lời được lúc này (thường do hết lượt miễn phí hoặc Google quá tải). Thử lại sau.</div>'); return; }
    const best = okR[0], before = gemModel(); S.settings.gemModel = best.m; save(); geminiAlts = null;
    show(`<div class="small mt">Đã chọn <b class="lime">${esc(best.m)}</b> (${(best.ms / 1000).toFixed(1).replace('.', ',')} giây)${before !== best.m ? `, thay cho ${esc(before)}` : ''}. Các lần chụp bữa ăn, chấm buổi tập, chấm ngày và chấm body đều dùng model này; model khác chỉ dùng khi model này quá tải.</div>
      <button class="text-btn" data-act="aiModelReset">Quay về model mặc định (${GEMINI_MAIN})</button>`);
    render();
  },
  aiModelReset: () => { delete S.settings.gemModel; save(); geminiAlts = null; closeSheet(); render(); toast('Đã quay về ' + GEMINI_MAIN); },
  testKey: async () => {
    const p = aiProv(), name = AI[p].name, lines = [];
    const show = done => openSheet(`<div class="sheet-h"><h3>Kiểm tra kết nối ${name}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
      <div class="rev">${lines.map(([ok, t]) => `<div class="rev-i"><span style="color:${ok == null ? 'var(--muted)' : ok ? 'var(--ok)' : 'var(--danger)'}">${ic(ok == null ? 'clock' : ok ? 'check' : 'x')}</span><span>${esc(t)}</span></div>`).join('')}</div>
      ${done ? `<div class="muted small mt">Mạng: ${navigator.onLine ? 'có' : 'không'} · Key ${esc(getKey().slice(0, 3))}… (${getKey().length} ký tự) · App ${esc(navigator.userAgent.match(/(iPhone OS [\d_]+|Android [\d.]+|Windows NT [\d.]+|Mac OS X [\d_]+)/)?.[0] || '')}<br>Nếu có dòng đỏ, chụp màn hình này gửi người hỗ trợ (ảnh không chứa key).</div>` : '<div class="empty">Đang kiểm tra…</div>'}`);
    const step = async (label, fn) => { lines.push([null, label]); show(false); try { const t = await fn(); lines[lines.length - 1] = [true, t || label]; return true; } catch (e) { lines[lines.length - 1] = [false, label + ': ' + e.message]; return false; } };
    if (p === 'gemini') {
      await step('Kết nối tới Google và kiểm tra key', async () => {
        let r; try { r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash', { headers: { 'x-goog-api-key': getKey() } }); }
        catch (e) { throw new Error(`không gửi được yêu cầu (${e.name}: ${e.message})`); }
        const d = await r.json().catch(() => ({})), x = Array.isArray(d) ? d[0] || {} : d;
        if (!r.ok) throw new Error(`Google trả lỗi ${r.status} ${x.error?.status || ''}: ${x.error?.message || r.statusText}`);
        return 'Kết nối Google được, key hợp lệ, có model gemini-3.8-flash';
      });
    }
    const textOk = await step('Gọi AI bằng chữ', async () => { const r = await askAI({ system: 'Trả lời ngắn.', content: [{ text: 'Trả về ok=true.' }], schema: obj({ ok: { type: 'boolean' } }), maxTokens: 1000 }); if (!r.ok) throw new Error('AI trả lời lạ'); return 'Gọi AI bằng chữ: thành công'; });
    if (textOk) await step('Gọi AI bằng ảnh', async () => {
      const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = '#e33'; g.fillRect(0, 0, 64, 64);
      const r = await askAI({ system: 'Trả lời ngắn.', content: [{ image: c.toDataURL('image/jpeg', .8).split(',')[1] }, { text: 'Ảnh này màu gì? Trả về color.' }], schema: obj({ color: { type: 'string' } }), maxTokens: 1000 });
      return `Gọi AI bằng ảnh: thành công (AI thấy màu "${r.color}")`;
    });
    show(true);
  },
  tip: d => openSheet(`<div class="sheet-h"><h3>${TIPS[d.k][0]}</h3><button class="link" data-act="closeSheet">Đóng</button></div><div class="tip-body">${TIPS[d.k][1]}</div>`),
  saveBody: () => {
    const w = num($('#bW').value), waist = num($('#bWaist').value), neck = num($('#bNeck')?.value), hip = num($('#bHip')?.value);
    const okNeck = neck >= 20 && neck <= 70, okHip = hip >= 50 && hip <= 200;
    if (!(w >= 30 && w <= 250) && !(waist >= 40 && waist <= 200) && !okNeck && !okHip) { toast('Nhập cân nặng (kg) hoặc số đo (cm)'); return; }
    S.body = S.body || [];
    let b = S.body.find(x => dayKey(x.t) === dayKey());
    if (!b) { b = { id: uid(), t: Date.now() }; S.body.push(b); }
    if (w >= 30 && w <= 250) { b.w = w; if (S.profile) S.profile.weight = w; }
    if (waist >= 40 && waist <= 200) b.waist = waist;
    if (okNeck) b.neck = neck;
    if (okHip) b.hip = hip;
    save(); render(); toast('Đã lưu');
  },
  delBody: d => { if (confirm('Xóa lần ghi này?')) { S.body = S.body.filter(b => b.id !== d.id); save(); render(); } },
  applyAdj: d => { S.profile.adj = (S.profile.adj || 0) + +d.d; S.adjAt = Date.now(); save(); render(); toast(`Mục tiêu mới: ${fmtNum(targets(S.profile).kcal)} kcal/ngày`); },
  skipAdj: () => { S.adjAt = Date.now(); save(); render(); },
  resetAdj: () => { if (confirm('Bỏ phần điều chỉnh calo, quay về mức tính theo công thức?')) { delete S.profile.adj; S.adjAt = Date.now(); save(); render(); } },
  setAi: d => { S.settings.ai = d.v; save(); render(); },
  progPick: () => openProgPicker(),
  progSet: d => { progEx = d.name; closeSheet(); render(); window.scrollTo(0, 0); },
  extraSet: d => {
    const ex = S.active.exercises[+d.i]; ex.extraAsked = (ex.extraAsked || 0) + 1; ex.skipped = false;
    ex.sets.push({ w: +d.w ? String(d.w) : '', r: '', done: false });
    focusEx = +d.i; save(); closeSheet(); render(); requestAnimationFrame(() => $('#ex' + d.i)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
    toast('Set bù đã thêm. Nghỉ xong thì tập và nhập số rep.');
  },
  skipExtra: d => { S.active.exercises[+d.i].skipped = true; save(); closeSheet(); toast('Đã ghi: bỏ qua set bù'); },
  openVault: () => { closeSheet(); openVault(); },
  bodyReview: d => bodyReviewUI(+d.w),
  bodyRevView: d => { const r = vault.reviews?.[d.w]; if (r) openSheet(bodyRevHtml(r, +d.w)); },
  vaultSetup: async () => {
    const a = $('#vPw').value, b = $('#vPw2').value;
    if (a.length < 4) { toast('Mật khẩu ít nhất 4 ký tự'); return; }
    if (a !== b) { toast('Hai lần nhập không khớp'); return; }
    vault.busy = true; render(); try { await vaultSetPassword(a); vault.needsSetup = false; toast('Đã tạo kho ảnh. Nhớ kỹ mật khẩu!', 3500); } finally { vault.busy = false; render(); }
  },
  vaultOpen: async () => {
    if (Date.now() < vault.lockUntil) { toast(`Sai nhiều lần, đợi ${Math.ceil((vault.lockUntil - Date.now()) / 1000)} giây`); return; }
    const pw = $('#vPw').value; if (!pw) return;
    vault.busy = true; render(); let ok = false;
    try { ok = await vaultUnlock(pw); } finally { vault.busy = false; }
    if (ok) vault.fails = 0; else { vault.fails++; if (vault.fails >= 5) { vault.lockUntil = Date.now() + 30000; vault.fails = 0; } toast('Sai mật khẩu'); }
    render();
  },
  vaultLock: () => { vaultLock(); render(); },
  vaultPose: d => { vault.pose = d.v; render(); },
  vaultShot: () => $('#vaultFile').click(),
  vaultView: async d => {
    const src = await vaultFull(d.id), it = vault.items.find(i => i.id === d.id); if (!src) return;
    openSheet(`<div class="sheet-h"><h3>${esc(it.pose)} · ${new Date(it.t).toLocaleDateString('vi-VN')}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
      <img src="${src}" alt="" style="width:100%;border-radius:14px"><button class="btn danger big mt" data-act="vaultDel" data-id="${it.id}">Xóa ảnh này</button>`);
  },
  vaultDel: async d => {
    const it = vault.items.find(i => i.id === d.id), w = it ? weekStart(it.t) : null, graded = w != null && (vault.reviews?.[w] || S.bodyRev?.[w]);
    if (!confirm(graded ? 'Xóa vĩnh viễn ảnh này? Kết quả AI chấm tuần này cũng bị xóa; chụp lại đủ 3 tư thế thì AI chấm lại.' : 'Xóa vĩnh viễn ảnh này?')) return;
    const key = vault.key; await vDel('photos', d.id);
    if (graded) { delete vault.reviews[w]; if (S.bodyRev) delete S.bodyRev[w]; save(); await saveReviews(key); }
    closeSheet(); await vaultLoad(); render(); toast(graded ? 'Đã xóa ảnh và kết quả chấm tuần này' : 'Đã xóa ảnh');
  },
  vaultSave: () => vaultSavePending(),
  vaultCancel: () => closeSheet(),
  vaultRepick: () => { closeSheet(); $('#vaultFile').click(); },
  vaultPoseSheet: d => { vault.pose = d.v; const f = vault.pendingFile; vault.pendingFile = null; closeSheet(); vault.pendingFile = f; render(); vaultPreview(); },
  vaultExport: () => vaultExport(),
  vaultImportBtn: () => $('#vaultImportFile').click(),
  saveSleep: d => {
    const bed = $('#' + d.p + 'Bed').value, wake = $('#' + d.p + 'Wake').value;
    if (!bed || !wake) { toast('Nhập giờ ngủ và giờ dậy'); return; }
    const m = sleepMin({ bed, wake });
    if (m < 60 || m > 16 * 60) { toast(`${fmtHM(m)} nghe không hợp lý, kiểm tra lại giờ`); return; }
    S.sleep = S.sleep || {}; S.sleep[d.k] = { bed, wake };
    if (!S.sleepSince || d.k < S.sleepSince) S.sleepSince = d.k;
    save(); if (d.p === 'sh') closeSheet(); render();
    toast(`Đã ghi: ngủ ${fmtHM(m)}${m < 360 ? '. Ngủ thiếu, hôm nay đừng ép tạ' : ''}`, 3000);
  },
  sleepLog: d => openSleep(d.k),
  napLog: d => openNap(d.k),
  napQuick: d => { const now = new Date(), nm = now.getHours() * 60 + now.getMinutes(), e = m2hm(nm), s = m2hm(nm - +d.v); A.addNap(d.k, s, e); },
  saveNap: d => { const s = $('#napS').value, e = $('#napE').value; if (!s || !e) { toast('Nhập giờ bắt đầu và kết thúc'); return; } A.addNap(d.k, s, e); },
  addNap: (k, s, e) => {
    const m = sleepMin({ bed: s, wake: e });
    if (m < 5 || m > 4 * 60) { toast(`${m} phút nghe không hợp lý, kiểm tra lại giờ`); return; }
    S.naps = S.naps || {}; S.naps[k] = [...napsOf(k), { s, e }].sort((a, b) => hm2m(a.s) - hm2m(b.s));
    save(); openNap(k); render();
    const bad = napBad(k);
    toast(bad === 'long' ? `Đã ghi. Tổng ${napMin(k)} phút, chỉ tính ${NAP_CAP}; ngủ trưa dài dễ khó ngủ tối` : bad === 'late' ? 'Đã ghi. Ngủ sau 16 giờ dễ làm tối khó ngủ' : `Đã ghi ngủ trưa ${m} phút`, 3000);
  },
  delNap: d => { const l = napsOf(d.k).filter((_, i) => i !== +d.i); if (l.length) S.naps[d.k] = l; else delete S.naps[d.k]; save(); openNap(d.k); render(); },
  delSleep: d => { if (!confirm('Xóa lần ghi giấc ngủ này?')) return; delete S.sleep[d.k]; save(); closeSheet(); render(); },
  setSleepH: d => { S.settings.sleepH = +d.v; save(); render(); },
  step: d => {
    const ex = S.active.exercises[+d.i], j = +d.j, f = d.f, cardio = isCardio(ex.name);
    const sz = f === 'r' ? 1 : cardio ? .5 : EX_LOAD[ex.name] === 'db' ? 1 : 2.5;
    const v = Math.max(0, Math.round((setVal(ex, j, f) + +d.v * sz) * 100) / 100);
    ex.sets[j][f] = String(v);
    if (f === 'w') for (let k = j + 1; k < ex.sets.length; k++) if (!ex.sets[k].done) ex.sets[k].w = String(v);
    save(); render();
  },
  completeSet: () => {
    const { i, j } = openPos(); if (j < 0) return;
    const ex = S.active.exercises[i], s = ex.sets[j];
    if (s.r === '') s.r = String(setVal(ex, j, 'r'));
    if (s.w === '') s.w = isBodyEx(ex.name) ? '0' : String(setVal(ex, j, 'w'));
    A.toggleSet({ i: String(i), j: String(j) });
  },
  pauseWorkout: () => {
    const a = S.active, now = Date.now();
    if (!a.pausedAt) { a.pausedAt = now; if (restEnd > now) { a.restLeft = restEnd - now; restEnd = 0; persistRest(); } toast('Đã tạm dừng'); }
    else { a.pausedMs = (a.pausedMs || 0) + now - a.pausedAt; a.pausedAt = null; if (a.restLeft) { restEnd = now + a.restLeft; a.restLeft = 0; persistRest(); } }
    save(); render();
  },
  exAll: () => { exAllOpen = !exAllOpen; render(); },
  exMenu: d => openExMenu(+d.i),
  exMove: d => { const a = S.active.exercises, i = +d.i, k = i + +d.d; [a[i], a[k]] = [a[k], a[i]]; focusEx = null; closeSheet(); save(); render(); },
  exRest: d => { const ex = S.active.exercises[+d.i], z = [60, 90, 120, 150, 180], c = ex.rest || S.settings.rest; ex.rest = z[(z.indexOf(c) + 1) % z.length] || 90; save(); render(); openExMenu(+d.i); },
  exRemove: d => { closeSheet(); A.removeEx(d); },
  exSwap: d => openSwap(+d.i),
  swapTo: d => swapTo(+d.i, d.name),
  barKg: () => { S.settings.barKg = barKg() === 20 ? 15 : 20; save(); render(); toast(`Thanh đòn ${barKg()} kg`); },
  nextMeal: () => openNextMeal(),
  nextMealAdd: d => {
    const x = nextIdeas?.ideas[+d.i]; if (!x) return;
    addFood(x.items.map(it => ({ name: it.name, g: Math.round(it.g), kcal: it.kcal, p: it.p, c: it.c, f: it.f, src: 'suggest', ...(it.dish ? { dish: it.dish } : {}) })));
    closeSheet(); render(); toast(`Đã ghi ${fmtNum(Math.round(x.tot.kcal))} kcal`);
  },
  setRir: d => { const ls = S.active?.lastSet; if (!ls) return; const ex = S.active.exercises[ls.i]; ex.sets[ls.j].rir = +d.v; ex.sets[ls.j].g = setGrade(ex, ls.j)?.score; save(); render(); },
  deloadStart: () => { S.deload = { from: Date.now(), until: Date.now() + 7 * 864e5 }; save(); render(); toast('Bắt đầu tuần giảm tải 7 ngày', 3000); },
  deloadEnd: () => { if (confirm('Kết thúc tuần giảm tải?')) { S.deload.until = Date.now(); save(); render(); } },
  deloadSnooze: () => { S.deloadSnooze = Date.now(); save(); render(); },
  painToggle: d => { S.pain = S.pain || []; const i = S.pain.findIndex(p => p.area === d.a); if (i >= 0) S.pain.splice(i, 1); else S.pain.push({ area: d.a, t: Date.now() }); save(); render(); },
  weekReport: d => openWeekReport(d.w ? +d.w : undefined),
  weekReportNav: d => { const first = weekStart(Math.min(...S.workouts.map(w => w.startedAt), Date.now())); openWeekReport(Math.max(first, Math.min(weekStart(), reportWeek + +d.v * 7 * 864e5))); },
  collage: () => openCollage(),
  collageSave: () => saveCollage(),
  water: d => { const k = tab === 'nutrition' ? foodDay : dayKey(); S.water = S.water || {}; S.water[k] = Math.max(0, waterOf(k) + +d.v); save(); render(); if (+d.v > 0 && waterOf(k) >= waterGoal() && waterOf(k) - +d.v < waterGoal()) toast('Đủ nước hôm nay 💧'); },
  supp: d => { const k = foodDay; S.suppLog = S.suppLog || {}; const l = S.suppLog[k] = suppsOf(k).slice(); const i = l.indexOf(d.s); if (i >= 0) l.splice(i, 1); else l.push(d.s); save(); render(); },
  readySet: d => { readyDraft[d.k] = +d.v; renderReady(); },
  readySleep: d => { readyDraft.sleepAns = +d.v; renderReady(); },
  readyQuick: () => { readyDraft.quick = !readyDraft.quick; renderReady(); },
  readyGo: () => readyGo(false),
  readySkip: () => readyGo(true),
  goalAdd: () => { goalDraft = null; openGoalAdd(); },
  goalKind: d => { goalDraft.kind = d.v; openGoalAdd(); },
  goalSave: () => {
    const g = goalDraft, t = num($('#goalT').value), cur = goalNow({ kind: g.kind, ex: g.ex });
    if (!(t > 0)) { toast('Nhập con số mục tiêu'); return; }
    S.goals = [...(S.goals || []), { id: uid(), kind: g.kind, ...(g.kind === 'lift' ? { ex: g.ex } : {}), target: t, start: cur != null ? Math.round(cur * 10) / 10 : t, t: Date.now() }];
    goalDraft = null; save(); closeSheet(); render(); toast('Đã thêm mục tiêu');
  },
  goalDel: d => { if (confirm('Xóa mục tiêu này?')) { S.goals = S.goals.filter(g => g.id !== d.id); save(); render(); } },
  setAdj: d => {
    const ls = S.active?.lastSet; if (!ls) return; const ex = S.active.exercises[ls.i];
    for (let k = 0; k < ex.sets.length; k++) if (!ex.sets[k].done) ex.sets[k].w = String(d.w);
    save(); render(); toast(`Các hiệp sau: ${fmtNum(+d.w)} kg`);
  },
  focusEx: d => { focusEx = +d.i; render(); requestAnimationFrame(() => $('#ex' + d.i)?.scrollIntoView({ block: 'start', behavior: 'smooth' })); },
  bump: d => {
    const ex = target().exercises[+d.i], cur = ex.sets.findIndex(s => !s.done); if (cur < 0) return;
    const hint = ex.reps ? weightHint(ex.name, ex.reps) : null, last = lastSets(ex.name), p = last && (last[cur] || last[last.length - 1]);
    const base = ex.sets[cur].w !== '' ? num(ex.sets[cur].w) : hint ? hint.w : p ? p.w : 0, v = Math.max(0, Math.round((base + +d.v) * 100) / 100);
    for (let j = cur; j < ex.sets.length; j++) if (!ex.sets[j].done) ex.sets[j].w = String(v);
    save(); render();
  },
  skipDue: d => {
    const r = S.routines.find(x => x.id === d.id); if (!r || !confirm(`Bỏ qua "${r.name}" tuần này và chuyển sang buổi kế tiếp?`)) return;
    S.skips = [...(S.skips || []).filter(s => s.t >= weekStart()), { id: r.id, t: Date.now() }]; save(); render(); toast('Đã bỏ qua, chuyển sang buổi kế tiếp');
  },
  openDay: d => { aiWarm(); openDay(d.k); },
  aiDay: async d => {
    const spin = `<div class="empty">${ic('refresh')} AI đang chấm ngày… <span class="ai-sec" data-t0="${Date.now()}"></span></div>`; $('#aiBox').innerHTML = spin;
    const part = t => { const p = partialJSON(t), box = $('#aiBox'); if (box && p?.verdict && p.summary) box.innerHTML = aiDayHtml(p) + spin; };
    try { const a = await aiReviewDay(d.k, part); S.dayAI = { ...(S.dayAI || {}), [d.k]: a }; save(); render(); if ($('#aiBox')) $('#aiBox').innerHTML = aiDayHtml(a) + aiStamp(); }
    catch (e) { if ($('#aiBox')) $('#aiBox').innerHTML = `<div class="muted small" style="color:var(--danger);margin:10px 0">${esc(e.message)}</div><button class="btn big" data-act="aiDay" data-k="${d.k}">Thử lại</button>`; }
  },
  gotoFood: d => { foodDay = d.k; sheetOnClose = null; closeSheet(); tab = 'nutrition'; render(); window.scrollTo(0, 0); },
  backfillDay: d => {
    const r = S.routines.find(x => x.id === d.id), t = new Date(d.k + 'T18:00').getTime();
    editW = { id: uid(), name: r ? r.name : 'Buổi tập', startedAt: t, endedAt: t + 3600e3, _dur: '60', prs: [], ...(r ? { routineId: r.id, plan: r.exercises.map(e => ({ name: e.name, sets: e.sets, ...(e.reps ? { reps: e.reps } : {}) })) } : {}),
      exercises: (r ? r.exercises : []).map(e => ({ name: e.name, sets: Array.from({ length: e.sets }, () => ({ w: '', r: '', done: true })) })) };
    editOrig = JSON.stringify(editW); sheetOnClose = null; closeSheet(); tab = 'edit'; render(); window.scrollTo(0, 0);
    toast('Nhập kg và reps đã tập rồi bấm Lưu. Set để trống sẽ bị bỏ.', 4000);
  },
  newRoutine: () => { draft = { id: null, name: '', exercises: [] }; renderRoutineSheet(); },
  editRoutine: d => { draft = JSON.parse(JSON.stringify(S.routines.find(r => r.id === d.id))); renderRoutineSheet(); },
  draftAdd: () => openPicker(name => { draft.exercises.push({ name, sets: 3 }); renderRoutineSheet(); }, renderRoutineSheet),
  draftSets: d => { const e = draft.exercises[+d.i]; e.sets = Math.min(10, Math.max(1, e.sets + +d.d)); renderRoutineSheet(); },
  draftRemove: d => { draft.exercises.splice(+d.i, 1); renderRoutineSheet(); },
  saveRoutine: () => {
    if (!draft.name.trim()) { toast('Đặt tên cho routine nhé'); return; }
    if (!draft.exercises.length) { toast('Thêm ít nhất 1 bài tập'); return; }
    draft.name = draft.name.trim();
    if (draft.id) S.routines = S.routines.map(r => r.id === draft.id ? draft : r); else S.routines.push({ ...draft, id: uid() });
    save(); sheetOnClose = null; closeSheet(); draft = null; tab = 'workout'; render(); toast('Đã lưu routine');
  },
  deleteRoutine: () => { if (confirm(`Xóa routine "${draft.name}"?`)) { S.routines = S.routines.filter(r => r.id !== draft.id); save(); closeSheet(); render(); } },
  pick: d => {
    const name = d.name, cb = pickCb || (() => {}); pickCb = null;
    const isNew = !DEFAULT_EX.includes(name) && !S.customEx.includes(name) && !getEx(name);
    if (!DEFAULT_EX.includes(name) && !S.customEx.includes(name)) { S.customEx.push(name); save(); }
    sheetOnClose = null; $('#sheet').hidden = true;
    if (isNew) openMuscleChooser(name, cb); else cb(name);
  },
  recSide: d => { recSide = d.v; render(); },
  muscle: d => openMuscle(d.m),
  copyLast: d => {
    const ex = target().exercises[+d.i], s = ex.sets[+d.j], p = lastSets(ex.name)?.[+d.j];
    if (p) { s.w = String(p.w); s.r = String(p.r); save(); render(); }
  },
  chooseMuscle: d => { const f = muscleCb; muscleCb = null; if (f) f(d.m); },
  showEx: d => openExercise(d.name),
  libGroup: d => { libGroup = d.g; render(); },
  pickGroup: d => { pickGroup = d.g; renderPick($('#pickQ').value); },
  pSex: d => { pDraft.sex = d.v; render(); },
  pGoal: d => { pDraft.goal = d.v; render(); },
  saveProfile: () => {
    const p = { ...pDraft, age: num(pDraft.age), height: num(pDraft.height), weight: num(pDraft.weight), act: +pDraft.act };
    if (p.age < 12 || p.age > 90 || p.height < 120 || p.height > 230 || p.weight < 30 || p.weight > 250) { toast('Kiểm tra lại tuổi, chiều cao, cân nặng'); return; }
    S.profile = p; save(); nutEdit = false; pDraft = null; render(); window.scrollTo(0, 0);
  },
  editProfile: () => { nutEdit = true; pDraft = null; render(); },
  cancelProfile: () => { nutEdit = false; pDraft = null; render(); },
  nextMenu: () => { S.menuIdx = (S.menuIdx + 1) % MENUS.length; save(); render(); },
  closeSheet: () => closeSheet(),
  metric: d => { progMetric = d.k; render(); },
  setRest: d => { S.settings.rest = +d.v; save(); render(); },
  exportData: async () => {
    const name = `gym-backup-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([JSON.stringify(S)], name, { type: 'application/json' });
    const done = () => { S.lastBackup = Date.now(); save(); render(); toast('Đã sao lưu ✅'); };
    if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); done(); } catch (e) { /* user cancelled */ } return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); done();
  },
  importMerge: () => {
    const d = pendingImport; pendingImport = null; if (!d) return;
    const ids = new Set(S.workouts.map(w => w.id)), add = d.workouts.filter(w => !ids.has(w.id));
    S.workouts = [...S.workouts, ...add].sort((a, b) => b.startedAt - a.startedAt);
    const rids = new Set(S.routines.map(r => r.id)); S.routines.push(...d.routines.filter(r => !rids.has(r.id)));
    S.customEx = [...new Set([...S.customEx, ...(d.customEx || [])])];
    S.exMeta = { ...(d.exMeta || {}), ...S.exMeta };
    if (!S.profile && d.profile) S.profile = d.profile;
    const bids = new Set((S.body || []).map(b => b.id)); S.body = [...(S.body || []), ...(d.body || []).filter(b => !bids.has(b.id))];
    if (d.photoAt && !(S.photoAt > d.photoAt)) S.photoAt = d.photoAt;
    S.photos = { ...(d.photos || {}), ...(S.photos || {}) };
    S.sleep = { ...(d.sleep || {}), ...(S.sleep || {}) }; S.naps = { ...(d.naps || {}), ...(S.naps || {}) };
    if (d.sleepSince && !(S.sleepSince <= d.sleepSince)) S.sleepSince = d.sleepSince;
    for (const [k, v] of Object.entries(d.food || {})) { const have = new Set((S.food[k] || []).map(f => f.id)); S.food[k] = [...(S.food[k] || []), ...v.filter(f => !have.has(f.id))]; }
    recomputePRs(); save(); sheetOnClose = null; closeSheet(); render(); toast(`Đã thêm ${add.length} buổi tập mới`);
  },
  importReplace: () => {
    const d = pendingImport; if (!d || !confirm('Thay thế TOÀN BỘ dữ liệu hiện tại bằng file này?')) return; pendingImport = null;
    S = Object.assign(defaults(), d); S.settings = Object.assign(defaults().settings, d.settings); restEnd = 0;
    recomputePRs(); save(); sheetOnClose = null; closeSheet(); render(); toast('Đã nhập dữ liệu');
  },
  importData: () => $('#importFile').click(),
  clearAll: () => { if (confirm('Xóa TOÀN BỘ dữ liệu? Không thể hoàn tác.') && confirm('Chắc chắn chứ?')) { S = defaults(); restEnd = 0; save(); render(); toast('Đã xóa'); } },
};

document.addEventListener('click', e => {
  unlockAudio();
  const b = e.target.closest('[data-act]'); if (!b) return;
  const fn = A[b.dataset.act]; if (fn) fn(b.dataset, b, e);
});
document.addEventListener('input', e => {
  const t = e.target, d = t.dataset;
  if (d.f && target()) { const s = target().exercises[+d.i].sets[+d.j]; s[d.f] = t.value; save(); }
  else if (d.bind === 'activeName' && S.active) { S.active.name = t.value; save(); }
  else if (d.bind === 'editName' && editW) editW.name = t.value;
  else if (t.id === 'editStart' && editW) { const ts = new Date(t.value).getTime(); editW.startedAt = isFinite(ts) ? ts : NaN; }
  else if (t.id === 'editDur' && editW) editW._dur = t.value;
  else if (d.bind === 'draftName' && draft) draft.name = t.value;
  else if (t.id === 'pickQ') renderPick(t.value);
  else if (t.id === 'mfQ') renderManualList(t.value);
  else if (t.id === 'progQ') renderProgList(t.value);
  else if (t.id === 'calcW' || t.id === 'calcR') calcOut();
  else if (t.id === 'goalEx' && goalDraft) { goalDraft.ex = t.value; openGoalAdd(); }
  else if (t.id === 'setBed' && t.value) { S.settings.sleepBed = t.value; save(); }
  else if (t.id === 'setSupps') { S.settings.supps = t.value.split(',').map(x => x.trim()).filter(Boolean).slice(0, 8); save(); }
  else if ((t.id === 'vCmpA' || t.id === 'vCmpB') && vault.key) { vault.cmp = [+$('#vCmpA').value, +$('#vCmpB').value]; render(); }
  else if (t.id === 'slotDay' && slot) { slot.k = t.value; slot.guessed = false; $('.slot-hint')?.remove(); }
  else if (t.id === 'slotTime' && slot && t.value) { slot.time = t.value; slot.meal = mealOf(slotTime()); slot.guessed = false; $('.slot-hint')?.remove();
    document.querySelectorAll('[data-act="setSlotMeal"]').forEach(b => b.classList.toggle('on', b.dataset.v === slot.meal)); }
  else if (t.id === 'mealHint' && mealDraft) mealDraft.hint = t.value;
  else if (t.id === 'feG' && foodEditing) { const b = foodEditing.base, g = num(t.value); if (b.g > 0 && g > 0) { const k = g / b.g; $('#feK').value = fmtNum(Math.round(b.kcal * k)); $('#feP').value = fmtNum(Math.round(b.p * k * 10) / 10); $('#feC').value = fmtNum(Math.round(b.c * k * 10) / 10); $('#feF').value = fmtNum(Math.round(b.f * k * 10) / 10); } }
  else if (t.id === 'feName' && foodEditing) { const dish = DISHES.find(x => x[0] === t.value); if (dish) { $('#feG').value = dish[2]; $('#feK').value = dish[3]; $('#feP').value = dish[4]; $('#feC').value = dish[5]; $('#feF').value = dish[6]; foodEditing.base = { g: dish[2], kcal: dish[3], p: dish[4], c: dish[5], f: dish[6] }; } }
  else if (d.mi != null && mealDraft) {
    const it = mealDraft.items[+d.mi]; if (!it) return;
    if (d.k === 'name') {
      it.name = t.value;
      const dish = DISHES.find(x => x[0] === t.value), fd = FOODS[t.value];
      if (dish || fd) {
        if (dish) Object.assign(it, { grams: dish[2], kcal: dish[3], protein: dish[4], carbs: dish[5], fat: dish[6] });
        else { const g = it.grams || 100; Object.assign(it, { grams: g, kcal: fd[0] * g / 100, protein: fd[1] * g / 100, carbs: fd[2] * g / 100, fat: fd[3] * g / 100 }); }
        it.per = { kcal: it.kcal / it.grams, protein: it.protein / it.grams, carbs: it.carbs / it.grams, fat: it.fat / it.grams };
        $('#mig' + d.mi).value = fmtNum(Math.round(it.grams)); $('#mik' + d.mi).value = fmtNum(Math.round(it.kcal)); $('#mip' + d.mi).value = fmtNum(Math.round(it.protein));
      }
    } else if (d.k === 'grams') {
      it.grams = num(t.value); for (const k of ['kcal', 'protein', 'carbs', 'fat']) it[k] = (it.per[k] || 0) * it.grams;
      $('#mik' + d.mi).value = fmtNum(Math.round(it.kcal)); $('#mip' + d.mi).value = fmtNum(Math.round(it.protein));
    } else { const k = d.k, v = num(t.value); if (k === 'kcal' && it.kcal > 0) { const f = v / it.kcal; it.carbs *= f; it.fat *= f; } it[k] = v; if (it.grams > 0) it.per[k] = v / it.grams; }
    $('#mealTot').textContent = `${fmtNum(Math.round(mealDraft.items.reduce((a, i) => a + (i.kcal || 0), 0)))} kcal · ${Math.round(mealDraft.items.reduce((a, i) => a + (i.protein || 0), 0))} g đạm`;
  }
  else if (t.id === 'libQ') { libQ = t.value; $('#libList').innerHTML = libList(); }
  else if (pDraft && { pAge: 'age', pHeight: 'height', pWeight: 'weight', pAct: 'act' }[t.id]) pDraft[{ pAge: 'age', pHeight: 'height', pWeight: 'weight', pAct: 'act' }[t.id]] = t.value;
});
document.addEventListener('change', e => { if (e.target.dataset.bind === 'progEx') { progEx = e.target.value; render(); } });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pickQ') { const f = document.querySelector('#pickList .pick, #pickList .ex-row'); if (f) f.click(); } });
$('#famFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !famDraft) return;
  try { await famPhoto(f); } catch (err) { toast(err.message); }
});
$('#mealFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const img = await photoToJpeg(f);
    // A library photo taken earlier (15 min – 7 days ago): guess its day and meal from the file time.
    const lm = f.lastModified, age = Date.now() - lm;
    slot = age > 15 * 6e4 && age < 7 * 864e5 ? { k: dayKey(lm), meal: mealOf(lm), time: hhmm(lm), guessed: true } : newSlot(foodDay);
    mealDraft = { img, stage: 'note', hint: '', items: [] };
    renderMealSheet();
  } catch (err) { toast(err.message); }
});
$('#vaultFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !vault.key) return;
  vault.pendingFile = f; vaultPreview();
});
$('#vaultImportFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const n = await vaultImport(await f.text()); vault.needsSetup = false; if (vault.key) await vaultLoad(); render(); toast(`Đã nhập ${n} ảnh. Mở khóa bằng mật khẩu của file đó.`, 4000); }
  catch (err) { toast(err.message, 4500); }
});
$('#importFile').addEventListener('change', async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try {
    const d = JSON.parse(await f.text());
    if (!Array.isArray(d.workouts) || !Array.isArray(d.routines)) throw 0;
    d.workouts = d.workouts.filter(w => w && w.id && isFinite(w.startedAt) && Array.isArray(w.exercises));
    d.routines = d.routines.filter(r => r && r.id && Array.isArray(r.exercises));
    pendingImport = d;
    const ids = new Set(S.workouts.map(w => w.id)), fresh = d.workouts.filter(w => !ids.has(w.id)).length;
    openSheet(`<div class="sheet-h"><h3>Nhập dữ liệu</h3><button class="link" data-act="closeSheet">Hủy</button></div>
      <div class="muted" style="margin-bottom:14px">File có <b style="color:var(--text)">${d.workouts.length} buổi tập</b> và ${d.routines.length} routine${d.lastBackup ? `, sao lưu ngày ${fmtDate(d.lastBackup)}` : ''}.</div>
      <button class="btn primary big" data-act="importMerge">Gộp: thêm ${fresh} buổi chưa có</button>
      <div class="muted small" style="margin:6px 0 14px">Giữ nguyên dữ liệu hiện tại, chỉ thêm những gì chưa có.</div>
      <button class="btn danger big" data-act="importReplace">Thay thế toàn bộ</button>
      <div class="muted small" style="margin-top:6px">Xóa dữ liệu hiện tại (${S.workouts.length} buổi) và dùng dữ liệu trong file.</div>`, () => { pendingImport = null; });
  } catch (err) { toast('File không hợp lệ'); }
});

render(); tick(); requestWake();
setTimeout(() => { try { checkBadges(); } catch (e) {} }, 2500);
if (/[?&]check/.test(location.search)) { history.replaceState(null, '', location.pathname); eveningCheck(true); } else eveningCheck(false);
if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
