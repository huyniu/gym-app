// Food: targets and sample menu, food log, meal photo AI, manual entry, family meals, next-meal ideas, water and supplements.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

const PROT = ['Ức gà', 'Cá basa', 'Thịt bò nạc', 'Thịt heo nạc', 'Đậu phụ'], CARB = ['Cơm trắng', 'Khoai lang luộc', 'Bún'];
function foodItem(n, g) { const f = FOODS[n], k = g / 100; return { name: `${n} ${fmtNum(g)} g`, base: n, g, kcal: f[0] * k, p: f[1] * k, c: f[2] * k, f: f[3] * k }; }
function nextMealIdeas() {
  const p = S.profile; if (!p) return null;
  const t = targets(p), tot = dayTotals(foodDay), K = Math.round(t.kcal - tot.kcal), P = Math.round(t.protein - tot.p);
  const late = foodDay === dayKey() && new Date().getHours() >= 20, ideas = [];
  if (K < 120) return { K, P, ideas, full: true };
  const hr = foodDay === dayKey() ? new Date().getHours() : 12, meals = hr < 10 ? 3 : hr < 15 ? 2 : 1;
  const Km = K / meals, Pm = Math.max(0, P) / meals;
  const veg = foodItem('Rau xanh luộc', 200), oil = { ...foodItem('Dầu ăn', 5), name: 'Dầu nấu 1 thìa' }, fixed = veg.kcal + oil.kcal;
  // home-cooked: a protein sized to the protein gap, then rice/potato/noodles for what is left
  PROT.forEach((pn, k) => {
    const pf = FOODS[pn], need = Math.max(Pm, 20);
    let gp = Math.min(250, Math.max(80, Math.round(need / (pf[1] / 100) / 10) * 10));
    if (gp * pf[0] / 100 + fixed > Km) gp = Math.max(60, Math.floor((Km - fixed) * .9 / (pf[0] / 100) / 10) * 10);
    const cn = CARB[k % CARB.length], rest = Km - gp * pf[0] / 100 - fixed;
    const gc = Math.min(late ? 100 : 300, Math.max(0, Math.floor(rest / (FOODS[cn][0] / 100) / 10) * 10));
    const items = [foodItem(pn, gp), ...(gc >= 50 ? [foodItem(cn, gc)] : []), veg, oil];
    ideas.push({ kind: 'Tự nấu / cơm bình dân', items });
  });
  // eating out: a dish that fits, protein first
  DISHES.filter(d => d[3] <= Km * 1.1 && d[3] >= Km * .4 && d[4] >= 15).sort((a, b) => (b[4] - Math.abs(Km - b[3]) / 25) - (a[4] - Math.abs(Km - a[3]) / 25)).slice(0, 2)
    .forEach(d => ideas.push({ kind: 'Ăn ngoài', dish: d[0], items: [{ name: `${d[0]} (${d[1]})`, dish: d[0], g: d[2], kcal: d[3], p: d[4], c: d[5], f: d[6] }] }));
  const sum = it => it.reduce((a, x) => ({ kcal: a.kcal + x.kcal, p: a.p + x.p }), { kcal: 0, p: 0 });
  const homes = ideas.filter(x => !x.dish).sort((a, b) => sum(b.items).p - sum(a.items).p).slice(0, 2), outs = ideas.filter(x => x.dish);
  return { K, P, late, meals, Km, ideas: [...homes, ...outs].map(x => ({ ...x, tot: sum(x.items) })) };
}
let nextIdeas = null;
function openNextMeal() {
  const r = nextIdeas = nextMealIdeas(); if (!r) { toast('Nhập thông tin cơ thể ở Thực đơn trước'); return; }
  openSheet(`<div class="sheet-h"><h3>Bữa tiếp ăn gì?</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <div class="nm-left"><div><b>${fmtNum(Math.max(0, r.K))}</b><small>kcal còn lại</small></div><div><b class="sky">${fmtNum(Math.max(0, r.P))}</b><small>g đạm còn thiếu</small></div></div>
    ${!r.full && r.meals > 1 ? `<div class="muted small" style="margin:-4px 0 10px;text-align:center">Còn khoảng ${r.meals} bữa → bữa này nên ~${fmtNum(Math.round(r.Km / 10) * 10)} kcal</div>` : ''}
    ${r.full ? `<div class="empty">Đã gần đủ calo hôm nay.${r.P > 10 ? ' Còn thiếu đạm: 3 lòng trắng trứng hoặc 1 hũ sữa chua không đường.' : ' Đói thì ăn rau, dưa chuột, uống nước.'}</div>`
    : r.ideas.map((x, i) => `<div class="nm">
      <div class="nm-h">${x.dish ? foodThumb({ dish: x.dish }) : `<span class="fthumb ph">${ic('apple')}</span>`}<div class="grow"><small>${x.kind}</small><b>${esc(x.dish || x.items[0].base + (x.items[1]?.base && x.items[1].base !== 'Rau xanh luộc' ? ' + ' + x.items[1].base.toLowerCase() : ''))}</b></div>
        <div class="nm-k"><b>${fmtNum(Math.round(x.tot.kcal))}</b><small>${Math.round(x.tot.p)} g đạm</small></div></div>
      ${x.dish ? '' : `<div class="nm-items">${x.items.map(it => esc(it.name)).join(' · ')}</div>`}
      <button class="btn mt" data-act="nextMealAdd" data-i="${i}">${ic('plus')} Ghi bữa này</button></div>`).join('')}
    ${r.late ? '<div class="muted small mt">Đã sau 20h nên tinh bột được giảm bớt.</div>' : ''}`);
}
const waterGoal = () => Math.round((S.profile?.weight || 70) * 35 / 250) * 250; // ml
const waterOf = k => S.water?.[k] || 0;
const suppsOf = k => S.suppLog?.[k] || [];
function waterCard(k) {
  const ml = waterOf(k), goal = waterGoal(), cups = Math.round(goal / 250), have = Math.round(ml / 250), supps = S.settings.supps || [];
  return `<div class="card water"><div class="row gap"><span class="qt-ic" style="color:var(--sky)">${ic('drop')}</span>
      <div class="grow"><b>Nước ${fmtNum(ml / 1000)} / ${fmtNum(goal / 1000)} lít</b><div class="cups">${Array.from({ length: Math.max(cups, have) }, (_, i) => `<i class="${i < have ? 'on' : ''}"></i>`).join('')}</div></div>
      <button class="icon" data-act="water" data-v="-250" aria-label="Bớt 1 ly">${ic('minus')}</button><button class="icon add" data-act="water" data-v="250" aria-label="Thêm 1 ly">${ic('plus')}</button></div>
    ${supps.length ? `<div class="chips wrap mt">${supps.map(s => `<button class="chip${suppsOf(k).includes(s) ? ' on' : ''}" data-act="supp" data-s="${esc(s)}">${suppsOf(k).includes(s) ? ic('check') + ' ' : ''}${esc(s)}</button>`).join('')}</div>` : ''}</div>`;
}
const ACT = [[1.2, 'Ít vận động (văn phòng)'], [1.375, 'Tập 1–3 buổi/tuần'], [1.55, 'Tập 3–5 buổi/tuần'], [1.725, 'Tập 6–7 buổi/tuần'], [1.9, 'Lao động nặng + tập']];
const GOALS = { cut: ['Giảm mỡ', -450], keep: ['Giữ cân', 0], bulk: ['Tăng cơ', 300] };
function targets(p) {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161);
  const tdee = bmr * p.act, kcal = Math.round((tdee + GOALS[p.goal][1] + (p.adj || 0)) / 10) * 10;
  const protein = Math.round(p.weight * (p.goal === 'cut' ? 2.2 : 2));
  const fat = Math.round(kcal * .25 / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, fat, carbs, water: Math.round(p.weight * 35 / 100) / 10 };
}
const macro = (f, g) => { const d = FOODS[f]; return [d[0] * g / 100, d[1] * g / 100, d[2] * g / 100, d[3] * g / 100]; };
const LEAN_SWAP = { 'Cá hồi': 'Cá basa', 'Trứng gà': 'Lòng trắng trứng', 'Thịt heo nạc': 'Ức gà' };
function planMenu(menu, t, goal) {
  // When cutting, swap fatty proteins for lean ones (same protein amount).
  if (goal === 'cut') menu = { ...menu, meals: menu.meals.map(([n, it]) => [n, it.map(([f, g, r]) => {
    const s = r === 'P' && LEAN_SWAP[f]; return s ? [s, g * FOODS[f][1] / FOODS[s][1], r] : [f, g, r]; })]) };
  // Solve scale factors: sp (protein foods) & sc (carb foods) hit protein/carb targets, so (oil, nuts) fills the fat target.
  const items = menu.meals.flatMap(([, it]) => it);
  const sum = (role, k) => items.filter(i => i[2] === role).reduce((a, [f, g]) => a + macro(f, g)[k], 0);
  const P = r => sum(r, 1), C = r => sum(r, 2), F = r => sum(r, 3);
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, isFinite(v) ? v : 1));
  let sp = 1, sc = 1, so = 1;
  for (let k = 0; k < 4; k++) {
    const tp = t.protein - P('F') - so * P('O'), tc = t.carbs - C('F') - so * C('O'), det = P('P') * C('C') - P('C') * C('P');
    sp = clamp((tp * C('C') - P('C') * tc) / det, .4, 3); sc = clamp((P('P') * tc - tp * C('P')) / det, .4, 3);
    so = F('O') ? clamp((t.fat - F('F') - sp * F('P') - sc * F('C')) / F('O'), 0, 5) : 1;
  }
  const round = (f, g) => { const u = FOODS[f][4]; if (u && (f.startsWith('Trứng') || f.startsWith('Lòng'))) return Math.max(1, Math.round(g / u[1])) * u[1]; const step = g < 50 ? 5 : 10; return Math.max(5, Math.round(g / step) * step); };
  const scale = { P: sp, C: sc, O: so, F: 1 };
  return menu.meals.map(([meal, items]) => [meal, items.map(([f, g, role]) => [f, g * scale[role]]).filter(([, g]) => g >= 2.5)
    .map(([f, g]) => { const gg = round(f, g); return [f, gg, macro(f, gg)]; })]);
}
function portion(f, g) {
  const u = FOODS[f][4];
  if (u && (f.startsWith('Trứng') || f.startsWith('Lòng'))) return `${Math.round(g / u[1])} ${u[0]}`;
  if (u) { const k = Math.round(g / u[1] * 2) / 2; return `${g}g <span class="muted">(~${fmtNum(k)} ${u[0]})</span>`; }
  return `${g}g`;
}
function viewNutrition() {
  const p = S.profile;
  if (!p || nutEdit) {
    if (!pDraft) pDraft = { ...(p || { sex: 'm', age: '', height: '', weight: '', act: 1.55, goal: 'bulk' }) };
    const v = pDraft;
    return `<div class="card"><div class="title" style="margin-bottom:10px">Thông tin của bạn</div>
      <div class="seg" style="margin-bottom:10px">${[['m', 'Nam'], ['f', 'Nữ']].map(([k, l]) => `<button class="${v.sex === k ? 'on' : ''}" data-act="pSex" data-v="${k}">${l}</button>`).join('')}</div>
      <div class="form3">
        <label>Tuổi<input id="pAge" inputmode="numeric" value="${esc(v.age)}" placeholder="25"></label>
        <label>Cao (cm)<input id="pHeight" inputmode="numeric" value="${esc(v.height)}" placeholder="170"></label>
        <label>Nặng (kg)<input id="pWeight" inputmode="decimal" value="${esc(v.weight)}" placeholder="65"></label>
      </div>
      <label class="lbl">Mức vận động<select id="pAct">${ACT.map(([k, l]) => `<option value="${k}" ${+v.act === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="lbl">Mục tiêu</div>
      <div class="seg">${Object.entries(GOALS).map(([k, [l]]) => `<button class="${v.goal === k ? 'on' : ''}" data-act="pGoal" data-v="${k}">${l}</button>`).join('')}</div>
      <button class="btn primary big mt" data-act="saveProfile">Tính thực đơn</button>
      ${p ? '<button class="btn big mt" data-act="cancelProfile">Hủy</button>' : ''}</div>`;
  }
  const t = targets(p), menu = MENUS[S.menuIdx % MENUS.length], plan = planMenu(menu, t, p.goal);
  const tot = plan.flatMap(([, it]) => it).reduce((a, [, , m]) => a.map((v, i) => v + m[i]), [0, 0, 0, 0]);
  return `${foodLogCard(t)}${adviceCard(false)}
    <div class="card">
      <div class="row gap"><div class="grow"><div class="title" style="font-family:'Space Grotesk',sans-serif">Mục tiêu & thực đơn mẫu</div><div class="muted small">${GOALS[p.goal][0]} · ${fmtNum(p.weight)} kg</div></div><span class="chip-lime">${fmtNum(t.kcal)} kcal/ngày</span></div>
      <div class="mgrid">
        <div><span>Đạm ${ic('bolt')}</span><b style="color:#7cc4ff">${t.protein}g</b><small>${Math.round(t.protein * 400 / t.kcal)}% năng lượng</small></div>
        <div><span>Tinh bột ${ic('sun')}</span><b class="lime">${t.carbs}g</b><small>${Math.round(t.carbs * 400 / t.kcal)}% năng lượng</small></div>
        <div><span>Chất béo ${ic('drop')}</span><b style="color:#ff9b9b">${t.fat}g</b><small>${Math.round(t.fat * 900 / t.kcal)}% năng lượng</small></div>
        <div><span>Nước ${ic('drop')}</span><b>${fmtNum(t.water)}L</b><small>Khuyến nghị mỗi ngày</small></div>
      </div>
      ${p.adj ? `<div class="row small mt"><span class="grow">Đã chỉnh theo xu hướng cân: <b>${fmtSigned(p.adj)} kcal/ngày</b></span><button class="link" data-act="resetAdj">Đặt lại</button></div>` : ''}
      <div class="row mt"><span class="grow muted small">BMR ${fmtNum(t.bmr)} · Tiêu hao/ngày (TDEE) ${fmtNum(t.tdee)} kcal</span><button class="link" data-act="editProfile">Sửa</button></div>
    </div>
    <div class="section-h"><h2>${menu.name}</h2><button class="link" data-act="nextMenu">${ic('refresh')} Đổi thực đơn</button></div>
    ${plan.map(([meal, items]) => { const k = items.reduce((a, [, , m]) => a + m[0], 0); return `<div class="card">
      <div class="row"><div class="title grow">${meal}</div><span class="muted small">${fmtNum(Math.round(k))} kcal</span></div>
      ${items.map(([f, g, m]) => `<div class="food"><span class="grow">${esc(f)}</span><span>${portion(f, g)}</span></div>`).join('')}</div>`; }).join('')}
    <div class="card"><div class="muted small">Tổng thực đơn: <b style="color:var(--text)">${fmtNum(Math.round(tot[0]))} kcal</b> · Đạm ${Math.round(tot[1])}g · Tinh bột ${Math.round(tot[2])}g · Béo ${Math.round(tot[3])}g</div></div>
    <div style="text-align:center">${tip('menu')}</div>`;
}
let nutEdit = false, pDraft = null;

let foodDay = dayKey(), mealDraft = null, slot = null;
const dishImg = name => DISH_SRC[name] ? `img/food/${foodSlug(name)}.jpg` : null;
function thumbOf(dataUrl, size = 112) {
  return new Promise(ok => { const img = new Image(); img.onload = () => {
    const c = document.createElement('canvas'), s = Math.min(img.width, img.height); c.width = c.height = size;
    c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size); ok(c.toDataURL('image/jpeg', .62)); };
    img.onerror = () => ok(null); img.src = dataUrl; });
}
const foodThumb = f => { const src = f.ph && S.photos?.[f.ph]?.src || f.dish && dishImg(f.dish);
  return src ? `<img class="fthumb" src="${src}" alt="" loading="lazy">` : `<span class="fthumb ph">${ic('apple')}</span>`; };
const MEAL_H = { 'Sáng': 8, 'Trưa': 12, 'Chiều': 15, 'Tối': 19 };
const mealDefaultTime = m => String(MEAL_H[m]).padStart(2, '0') + ':00';
const newSlot = k => k === dayKey() ? { k, meal: mealOf(Date.now()), time: hhmm(Date.now()) } : { k, meal: 'Trưa', time: mealDefaultTime('Trưa') };
const slotTime = () => { const [hh, mm] = (slot.time || mealDefaultTime(slot.meal)).split(':').map(Number); return dayStart(slot.k) + hh * 36e5 + mm * 6e4; };
function slotPicker() {
  const days = Array.from({ length: 7 }, (_, i) => addDays(dayKey(), -i));
  if (!days.includes(slot.k)) days.push(slot.k);
  return `<div class="slot"><select id="slotDay" aria-label="Ngày">${days.map(k => `<option value="${k}" ${k === slot.k ? 'selected' : ''}>${esc(dayLabel(k).charAt(0).toUpperCase() + dayLabel(k).slice(1))}</option>`).join('')}</select>
    <label class="slot-time">${ic('clock')}<input type="time" id="slotTime" value="${esc(slot.time)}" aria-label="Giờ ăn"></label></div>
    <div class="seg slot-meal">${Object.keys(MEAL_H).map(m => `<button class="${slot.meal === m ? 'on' : ''}" data-act="setSlotMeal" data-v="${m}">${m}</button>`).join('')}</div>
    ${slot.guessed ? '<div class="slot-hint">Đã lấy ngày và giờ theo lúc chụp ảnh, sửa nếu sai.</div>' : ''}`;
}
const mealOf = t => { const h = new Date(t).getHours(); return h < 10 ? 'Sáng' : h < 14 ? 'Trưa' : h < 17 ? 'Chiều' : 'Tối'; };
function dayTotals(k) { return (S.food[k] || []).reduce((a, f) => ({ kcal: a.kcal + f.kcal, p: a.p + f.p, c: a.c + f.c, f: a.f + f.f }), { kcal: 0, p: 0, c: 0, f: 0 }); }
function foodRow(f, thumb) {
  return `<div class="fitem">${thumb ? foodThumb(f) : ''}<div class="grow fedit" data-act="foodEdit" data-id="${f.id}">${esc(f.name)}<small>${hhmm(f.t)} · ${f.g ? fmtNum(f.g) + ' g · ' : ''}${fmtNum(Math.round(f.kcal))} kcal${f.p ? ' · ' + Math.round(f.p) + ' g đạm' : ''}</small></div>
      <button class="del" data-act="delFood" data-id="${f.id}" aria-label="Xóa">${ic('x')}</button></div>`;
}
function foodGroups(items) {
  const out = [], seen = new Set();
  for (const f of items) {
    if (f.ph && S.photos?.[f.ph]) {
      if (seen.has(f.ph)) continue; seen.add(f.ph);
      const g = items.filter(x => x.ph === f.ph), k = g.reduce((a, x) => a + x.kcal, 0);
      out.push(`<div class="pgroup"><div class="pg-side"><img src="${S.photos[f.ph].src}" alt="Ảnh bữa ăn"><span>${hhmm(f.t)} · ${fmtNum(Math.round(k))} kcal</span></div><div class="grow">${g.map(x => foodRow(x, false)).join('')}</div></div>`);
    } else out.push(foodRow(f, true));
  }
  return out.join('');
}
let foodEditing = null;
function findFood(id) { for (const [k, l] of Object.entries(S.food)) { const f = l.find(x => x.id === id); if (f) return { k, f }; } return null; }
function openFoodEdit(id) {
  const x = findFood(id); if (!x) return; const f = x.f;
  foodEditing = { id, base: { g: f.g || 0, kcal: f.kcal, p: f.p || 0, c: f.c || 0, f: f.f || 0 } };
  const v = n => fmtNum(Math.round((n || 0) * 10) / 10);
  openSheet(`<div class="sheet-h"><h3>Sửa món</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    <input id="feName" list="dishNames2" value="${esc(f.name)}" placeholder="Tên món"><datalist id="dishNames2">${DISHES.map(d => `<option value="${esc(d[0])}">`).join('')}</datalist>
    <div class="mi-row mt"><label>Giờ ăn<input type="time" id="feTime" value="${hhmm(f.t)}"></label><label>Gram<input id="feG" inputmode="decimal" value="${v(f.g)}"></label><label>Kcal<input id="feK" inputmode="decimal" value="${v(f.kcal)}"></label></div>
    <div class="mi-row mt"><label>Đạm g<input id="feP" inputmode="decimal" value="${v(f.p)}"></label><label>Tinh bột g<input id="feC" inputmode="decimal" value="${v(f.c)}"></label><label>Béo g<input id="feF" inputmode="decimal" value="${v(f.f)}"></label></div>
    <div class="muted small mt">Đổi số gram thì calo và đạm tự tính lại theo tỉ lệ.</div>
    <button class="btn primary big mt" data-act="foodEditSave">Lưu</button>
    <button class="text-btn" data-act="foodEditDel" style="color:var(--danger)">Xóa món này</button>`, () => { foodEditing = null; });
}
function foodLogCard(t) {
  const list = S.food[foodDay] || [], tot = dayTotals(foodDay), isToday = foodDay === dayKey();
  const left = t.kcal - tot.kcal, deficit = t.tdee - tot.kcal, pct = Math.round(tot.kcal / t.kcal * 100), ppct = Math.round(tot.p / t.protein * 100);
  const d = new Date(foodDay + 'T12:00'), wd = d.toLocaleDateString('vi-VN', { weekday: 'long' });
  const MEAL_IC = { 'Sáng': 'sunrise', 'Trưa': 'sun', 'Chiều': 'sun', 'Tối': 'moon' };
  return `<div class="card">
    <div class="daynav"><button class="round" data-act="foodDay" data-d="-1" aria-label="Ngày trước">${ic('back')}</button>
      <div class="grow"><b>${isToday ? 'Hôm nay' : esc(wd.charAt(0).toUpperCase() + wd.slice(1))}</b><small>${d.getDate()} tháng ${d.getMonth() + 1}</small></div>
      <button class="round" data-act="foodDay" data-d="1" ${isToday ? 'disabled' : ''} aria-label="Ngày sau">${ic('chev')}</button></div>
    <div class="eat">
      <div><span>Đã ăn</span><b class="lime">${fmtNum(Math.round(tot.kcal))}</b><small>kcal</small></div>
      <div><span>${left >= 0 ? 'Còn lại' : 'Vượt'}</span><b style="color:${left >= 0 ? 'var(--sky)' : 'var(--danger)'}">${fmtNum(Math.abs(Math.round(left)))}</b><small>kcal</small></div>
      <div><span>Mục tiêu</span><b>${fmtNum(t.kcal)}</b><small>kcal</small></div></div>
    <div class="barlbl"><span>Năng lượng nạp vào</span><b class="lime">${fmtNum(Math.round(tot.kcal))} / ${fmtNum(t.kcal)} kcal (${pct}%)</b></div>
    <div class="bar"><i style="width:${Math.min(100, pct)}%;background:${left >= 0 ? 'var(--accent)' : 'var(--danger)'}"></i></div>
    <div class="barlbl"><span>Đạm (Protein)</span><b class="sky">${Math.round(tot.p)} / ${t.protein} g (${ppct}%)</b></div>
    <div class="bar"><i style="width:${Math.min(100, ppct)}%;background:var(--sky)"></i></div>
    <div class="deficit">${ic('flame')}<span>${deficit >= 0 ? `Thâm hụt <b>${fmtNum(Math.round(deficit))} kcal</b>` : `Dư <b>${fmtNum(Math.round(-deficit))} kcal</b>`} · tiêu hao ${fmtNum(t.tdee)}</span></div>
  </div>
  ${waterCard(foodDay)}
  <button class="next-meal" data-act="nextMeal">${ic('bulb')}<span class="grow"><b>Bữa tiếp ăn gì?</b><small>Còn ${fmtNum(Math.max(0, Math.round(left)))} kcal · ${fmtNum(Math.max(0, Math.round(t.protein - tot.p)))} g đạm</small></span>${ic('chev')}</button>
  <div class="row gap meal-btns"><button class="btn primary" data-act="snapMeal">${ic('camera')} Chụp bữa ăn</button><button class="btn" data-act="addFoodManual">${ic('edit')} Nhập tay</button></div>
  <button class="btn big fam-btn" data-act="famOpen">${ic('apple')} Mâm cơm gia đình <small>đếm phần mình ăn</small></button>
  ${['Sáng', 'Trưa', 'Chiều', 'Tối'].map(m => { const it = list.filter(f => mealOf(f.t) === m).sort((a, b) => a.t - b.t); return it.length ? `<div class="card meal-card">
    <div class="mh"><span>${ic(MEAL_IC[m])} Bữa ${m.toLowerCase()}</span><span class="chip-lime">${fmtNum(Math.round(it.reduce((a, f) => a + f.kcal, 0)))} kcal</span></div>
    ${foodGroups(it)}</div>` : ''; }).join('')}`;
}
// Downscale a photo to ≤768px JPEG so upload is fast and cheap.
function photoToJpeg(file) {
  return new Promise((ok, bad) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 768 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url); ok(c.toDataURL('image/jpeg', .78)); };
    img.onerror = () => { URL.revokeObjectURL(url); bad(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}
// While the AI is still answering: list the dishes it has finished so far.
function aiPartList(text, key, kcalOf) {
  const box = $('#aiPart'), p = partialJSON(text, true); if (!box || !p) return;
  const xs = (p[key] || []).filter(x => x.name && kcalOf(x) > 0);
  box.innerHTML = xs.map(x => `<div class="ai-part-i"><span class="grow">${esc(x.name)}</span><b>${fmtNum(Math.round(kcalOf(x)))} kcal</b></div>`).join('');
}
const mealPart = t => aiPartList(t, 'items', x => x.kcal);
const MEAL_SCHEMA = obj({ isFood: { type: 'boolean' }, note: { type: 'string' },
  items: { type: 'array', items: obj({ name: { type: 'string' }, grams: { type: 'number' }, kcal: { type: 'number' }, protein: { type: 'number' }, carbs: { type: 'number' }, fat: { type: 'number' } }) } });
async function aiMeal(dataUrl, hint, onPartial) {
  return askAI({
    system: 'Bạn là chuyên gia dinh dưỡng Việt Nam khó tính, nói thẳng. Người dùng đang theo dõi calo để giảm mỡ, nên ước THẤP là lỗi nghiêm trọng hơn ước cao. ' +
      'Nhìn ảnh bữa ăn, liệt kê từng món/thành phần riêng (cơm, thịt, rau, canh, nước chấm, dầu mỡ…) với khối lượng đã nấu chín ước tính theo gram, và calo, đạm, tinh bột, chất béo (gram) của đúng khối lượng đó. ' +
      'Ước khẩu phần theo kích thước khay, bát đĩa, đũa thìa trong ảnh. Khi không chắc về khẩu phần, dầu mỡ, nước sốt hay độ béo của thịt thì chọn mức CAO hơn, không chọn mức thấp. ' +
      'Món chiên, xào, kho, rim luôn có dầu mỡ: ghi thành một dòng riêng tên "Dầu mỡ (…)" với lượng hợp lý, không bỏ qua. Cơm suất/cơm quán thường nhiều cơm hơn cơm nhà. Tên món tiếng Việt, ngắn gọn. ' +
      'Theo ghi chú của người dùng nếu có (ví dụ ăn một nửa, bỏ da). Nếu ảnh không phải đồ ăn: isFood=false, items rỗng. ' +
      'note: 1 câu dưới 30 từ, giọng thẳng, không an ủi: so bữa này với mục tiêu ngày được cung cấp (nhiều calo, ít đạm, nhiều tinh bột hay dầu mỡ thì nói rõ) và nêu 1 việc cụ thể nên đổi lần sau. Nếu có phần khó nhìn thì nói đã ước theo mức cao.',
    content: dataUrl ? [{ image: dataUrl.split(',')[1] }, { text: mealContext() + (hint ? '\nGhi chú của tôi: ' + hint : '\nƯớc tính bữa ăn này.') }]
      : [{ text: mealContext() + '\nKhông có ảnh. Món tôi ăn: ' + hint + '. Nếu tôi không nói khẩu phần, dùng khẩu phần phổ biến ở Việt Nam (theo mức cao).' }],
    schema: MEAL_SCHEMA, maxTokens: 3000, onPartial, ...(dataUrl ? { media: 'MEDIA_RESOLUTION_MEDIUM' } : {}),
  });
}
function mealContext() {
  const p = S.profile; if (!p) return 'Chưa có mục tiêu calo.';
  const t = targets(p), tot = dayTotals(slot ? slot.k : foodDay);
  return `Mục tiêu: ${GOALS[p.goal][0]}, ${t.kcal} kcal và ${t.protein} g đạm mỗi ngày. Đã ăn trước bữa này: ${Math.round(tot.kcal)} kcal, ${Math.round(tot.p)} g đạm.`;
}
function renderMealSheet() {
  const m = mealDraft, tot = m.items.reduce((a, i) => a + i.kcal, 0);
  openSheet(`<div class="sheet-h"><h3>Bữa ăn</h3><button class="link" data-act="closeSheet">Hủy</button></div>
    ${m.img ? `<img class="meal-img" src="${m.img}" alt="Ảnh bữa ăn">` : ''}
    ${m.stage !== 'busy' ? slotPicker() : ''}
    ${m.stage === 'note' ? `<input id="mealHint" placeholder="Ghi chú (tùy chọn): VD ăn nửa bát cơm" value="${esc(m.hint)}">
      <button class="btn primary big mt" data-act="mealAnalyze">${ic('bolt')} AI tính calo</button>
      <div class="muted small" style="margin-top:6px;text-align:center">Ảnh được gửi tới ${aiProv() === 'gemini' ? 'Google (Gemini)' : 'Anthropic (Claude) · khoảng 500đ/ảnh'} để phân tích</div>`
    : m.stage === 'busy' ? `<div class="empty">${ic('refresh')} ${m.img ? 'AI đang xem ảnh…' : 'AI đang ước tính…'} <span class="ai-sec" data-t0="${Date.now()}"></span></div><div id="aiPart" class="ai-part"></div>`
    : `${m.note ? `<div class="muted small" style="margin:10px 0">${esc(m.note)}</div>` : ''}${aiStamp()}
      <datalist id="dishNames">${[...DISHES.map(d => d[0]), ...Object.keys(FOODS)].map(n => `<option value="${esc(n)}">`).join('')}</datalist>
      ${m.items.map((it, i) => `<div class="mi2"><div class="row gap"><input class="mi-name grow" list="dishNames" data-mi="${i}" data-k="name" value="${esc(it.name)}" placeholder="Tên món"><button class="del" data-act="mealDel" data-i="${i}" aria-label="Bỏ">${ic('x')}</button></div>
        <div class="mi-row"><label>Gram<input inputmode="decimal" data-mi="${i}" data-k="grams" id="mig${i}" value="${fmtNum(Math.round(it.grams))}"></label>
          <label>Kcal<input inputmode="decimal" data-mi="${i}" data-k="kcal" id="mik${i}" value="${fmtNum(Math.round(it.kcal))}"></label>
          <label>Đạm g<input inputmode="decimal" data-mi="${i}" data-k="protein" id="mip${i}" value="${fmtNum(Math.round(it.protein))}"></label></div></div>`).join('') || '<div class="empty">Không nhận ra món nào</div>'}
      <button class="text-btn" data-act="mealAddItem" style="margin-top:4px">${ic('plus')} Thêm món AI bỏ sót</button>
      <div class="fam-tot"><span class="grow">Tổng</span><b id="mealTot">${fmtNum(Math.round(tot))} kcal · ${Math.round(m.items.reduce((a, i) => a + (i.protein || 0), 0))} g đạm</b></div>
      ${m.img || m.hint ? `<div class="mi-fix"><input id="mealFix" placeholder="AI nhìn sai? VD: đây là bún chả, không phải bún bò"><button class="btn" data-act="mealFix">${ic('bolt')} Tính lại</button></div>` : ''}
      <button class="btn primary big mt" data-act="mealSave" ${m.items.length ? '' : 'disabled'}>Thêm vào nhật ký</button>`}`, () => { mealDraft = null; slot = null; });
}
function openManualFood() {
  slot = newSlot(foodDay);
  openSheet(`<div class="sheet-h"><h3>Nhập tay</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    ${slotPicker()}
    <input id="mfQ" class="search" placeholder="Tìm món (VD: ức gà, cơm)…" autocomplete="off">
    <div id="mfList" class="pick-list"></div>
    <div class="muted small" style="margin:12px 0 6px">Hoặc nhập món tự do:</div>
    <div class="form3"><label>Tên món<input id="mfName" placeholder="Bánh mì"></label><label>Calo<input id="mfKcal" inputmode="numeric" placeholder="350"></label><label>Đạm (g)<input id="mfP" inputmode="decimal" placeholder="12"></label></div>
    <button class="btn primary big mt" data-act="mfSave">Thêm</button>`);
  renderManualList('');
}
function renderManualList(q) {
  const f = fold(q.trim());
  const dishes = DISHES.map((d, i) => [d, i]).filter(([d]) => !f || fold(d[0] + ' ' + d[7]).includes(f)).slice(0, f ? 8 : 10);
  const foods = f ? Object.keys(FOODS).filter(n => fold(n).includes(f)).slice(0, 6) : [];
  $('#mfList').innerHTML = (!f ? '<div class="muted small" style="margin:2px 0 4px">Món hay ăn (1 phần phổ biến):</div>' : '') +
    dishes.map(([d, i]) => `<button class="pick dish" data-act="dishPick" data-i="${i}">${foodThumb({ dish: d[0] })}<span class="grow">${esc(d[0])}<br><span class="muted small">${esc(d[1])} · ${d[4]} g đạm</span></span><b class="small">${d[3]} kcal</b></button>`).join('') +
    foods.map(n => `<button class="pick dish" data-act="mfPick" data-name="${esc(n)}">${foodThumb({})}<span class="grow">${esc(n)}<br><span class="muted small">nguyên liệu, tính theo gram</span></span><b class="small">${FOODS[n][0]} kcal/100g</b></button>`).join('') +
    (f.length >= 2 ? `<button class="pick new" data-act="askDishAI">${ic('bolt')} Hỏi AI: "${esc(q.trim())}" bao nhiêu calo?</button>` : '');
}
// name, unit, grams per unit, kcal, protein, carbs, fat (per unit, home cooking, oil included)
const FAM = [
  ['Thịt kho', 'miếng', 35, 130, 6, 2, 11], ['Trứng kho', 'quả', 50, 90, 7, 1, 6], ['Cá kho', 'khúc', 80, 150, 15, 4, 8], ['Cá rán', 'khúc', 80, 170, 16, 2, 11],
  ['Thịt luộc', 'miếng', 25, 75, 5, 0, 6], ['Thịt rang cháy cạnh', 'gắp', 30, 110, 6, 3, 8], ['Sườn xào chua ngọt', 'miếng', 50, 150, 8, 8, 10],
  ['Gà luộc', 'miếng', 50, 105, 12, 0, 6], ['Gà rang gừng', 'miếng', 50, 130, 11, 3, 8], ['Bò xào', 'gắp', 30, 70, 6, 2, 4],
  ['Trứng rán', 'quả', 60, 115, 7, 1, 9], ['Trứng luộc', 'quả', 50, 75, 6, 1, 5], ['Đậu phụ rán', 'miếng', 40, 80, 5, 1, 6], ['Đậu sốt cà chua', 'miếng', 50, 65, 4, 3, 4],
  ['Tôm rang', 'con', 12, 25, 3, 0, 1.2], ['Chả lá lốt', 'cái', 35, 80, 5, 1, 6], ['Nem rán', 'cái', 40, 115, 4, 9, 7], ['Chả lợn / chả trứng', 'miếng', 40, 90, 6, 2, 6],
  ['Rau luộc', 'gắp', 40, 10, 1, 2, 0], ['Rau xào', 'gắp', 40, 35, 1, 2, 3], ['Canh rau', 'bát', 250, 30, 2, 4, 1], ['Canh xương / sườn', 'bát', 250, 90, 6, 4, 5],
  ['Canh chua cá', 'bát', 250, 80, 7, 6, 3], ['Canh cua / riêu', 'bát', 250, 90, 6, 6, 4], ['Dưa / cà muối', 'gắp', 25, 6, 0, 1, 0],
  ['Lạc rang', 'thìa', 15, 85, 4, 2, 7], ['Nước kho chan cơm', 'thìa', 15, 25, 1, 1, 2], ['Nước mắm / chấm', 'thìa', 15, 10, 1, 1, 0],
];
const RICE = { kcal: 1.3, p: .027, c: .286, f: .003 }; // per gram, cooked white rice
const bowlG = () => S.settings.bowlG || 150;
const famPreset = x => ({ name: x[0], unit: x[1], g: x[2], kcal: x[3], p: x[4], c: x[5], f: x[6], n: 0 });
let famDraft = null;
const famStepOf = it => it.rice || it.unit === 'bát' ? .5 : 1;
const famRowK = it => it.rice ? it.n * bowlG() * RICE.kcal : it.n * it.kcal;
function famTotals() {
  return famDraft.items.reduce((a, it) => it.rice ? { kcal: a.kcal + it.n * bowlG() * RICE.kcal, p: a.p + it.n * bowlG() * RICE.p }
    : { kcal: a.kcal + it.n * it.kcal, p: a.p + it.n * it.p }, { kcal: 0, p: 0 });
}
function openFamily() {
  slot = newSlot(foodDay); slot.meal = slot.k === dayKey() ? mealOf(Date.now()) : 'Tối'; if (slot.k !== dayKey()) slot.time = mealDefaultTime('Tối');
  famDraft = { img: null, stage: 'edit', note: '', items: [{ name: 'Cơm trắng', unit: 'bát', rice: true, n: 0 }] };
  renderFamily();
}
function renderFamily() {
  const m = famDraft, t = famTotals(), have = new Set(m.items.map(i => fold(i.name)));
  const extra = [...(S.famRecent || []), ...FAM.map(famPreset)].filter((x, i, a) => !have.has(fold(x.name)) && a.findIndex(y => fold(y.name) === fold(x.name)) === i);
  const row = (it, i) => `<div class="fam-row">
      ${it.rice ? `<span class="fthumb ph">${ic('apple')}</span>` : foodThumb({ dish: DISH_SRC[it.name] ? it.name : null })}
      <div class="grow"><b>${esc(it.name)}</b><small>${it.rice ? `bát của bạn ${bowlG()} g ≈ ${fmtNum(Math.round(bowlG() * RICE.kcal))} kcal · <button class="link" data-act="famBowl">đổi cỡ bát</button>`
        : `1 ${esc(it.unit)} ≈ ${fmtNum(Math.round(it.kcal))} kcal · ${fmtNum(Math.round(it.p * 10) / 10)} g đạm`}${it.ai ? ' · AI' : ''}</small></div>
      <div class="stepper"><button data-act="famStep" data-i="${i}" data-d="-1" aria-label="Bớt">${ic('minus')}</button><b id="famN${i}">${fmtNum(it.n)}</b><button data-act="famStep" data-i="${i}" data-d="1" aria-label="Thêm">${ic('plus')}</button></div>
      <span class="fam-k" id="famK${i}">${it.n ? fmtNum(Math.round(famRowK(it))) : ''}</span></div>`;
  openSheet(`<div class="sheet-h"><h3>Mâm cơm gia đình</h3><button class="link" data-act="closeSheet">Hủy</button></div>
    ${m.img ? `<img class="meal-img" src="${m.img}" alt="Ảnh mâm cơm">` : ''}
    ${slotPicker()}
    ${m.stage === 'busy' ? `<div class="empty">${ic('refresh')} AI đang nhận các món trên mâm… <span class="ai-sec" data-t0="${Date.now()}"></span></div><div id="aiPart" class="ai-part"></div>` : `
      ${m.img ? (m.note ? `<div class="muted small" style="margin:8px 0">${esc(m.note)}</div>` : '') : `<button class="btn big mt" data-act="famSnap">${ic('camera')} Chụp mâm để AI nhận món</button>
        <div class="muted small" style="margin-top:6px;text-align:center">Hoặc chọn món bên dưới, không cần ảnh.</div>`}
      <div class="muted small" style="margin:12px 0 2px">Đếm phần <b>bạn</b> đã ăn:</div>
      ${m.items.map(row).join('')}
      <div class="muted small" style="margin:14px 0 6px">Trên mâm còn món khác? Bấm để thêm:</div>
      <div class="chips wrap">${extra.slice(0, 40).map((x, i) => `<button class="chip" data-act="famAdd" data-i="${i}">${esc(x.name)}</button>`).join('')}</div>
      <div class="fam-tot"><span class="grow">Phần của bạn</span><b id="famTot">${fmtNum(Math.round(t.kcal))} kcal · ${Math.round(t.p)} g đạm</b></div>
      <button class="btn primary big mt" data-act="famSave">Thêm vào nhật ký</button>`}`, () => { famDraft = null; slot = null; });
  famDraft._extra = extra;
}
function famStep(i, d) {
  const it = famDraft.items[i], s = famStepOf(it); it.n = Math.max(0, Math.round((it.n + d * s) * 2) / 2);
  $('#famN' + i).textContent = fmtNum(it.n); $('#famK' + i).textContent = it.n ? fmtNum(Math.round(famRowK(it))) : '';
  const t = famTotals(); $('#famTot').textContent = `${fmtNum(Math.round(t.kcal))} kcal · ${Math.round(t.p)} g đạm`;
}
const FAM_SCHEMA = obj({ isFood: { type: 'boolean' }, note: { type: 'string' },
  dishes: { type: 'array', items: obj({ name: { type: 'string' }, unit: { type: 'string' }, unitGrams: { type: 'number' }, kcalPerUnit: { type: 'number' }, proteinPerUnit: { type: 'number' }, carbsPerUnit: { type: 'number' }, fatPerUnit: { type: 'number' } }) } });
async function famAI(dataUrl, onPartial) {
  return askAI({
    system: 'Bạn là chuyên gia dinh dưỡng Việt Nam. Ảnh là MÂM CƠM GIA ĐÌNH nhiều người ăn chung; người dùng sẽ tự đếm phần mình ăn, nên bạn KHÔNG ước tổng cả mâm. ' +
      'Nhiệm vụ: nhận ra từng món trên mâm (bỏ qua cơm trắng vì app tính riêng theo bát). Với mỗi món chọn một đơn vị đếm tự nhiên khi gắp ăn: miếng, khúc, quả, con, cái, gắp (rau, món thái nhỏ), bát (canh), thìa (nước chấm, nước kho, lạc). ' +
      'Ước khối lượng 1 đơn vị (gram) và calo, đạm, tinh bột, chất béo của 1 đơn vị đúng theo cách nấu thấy trong ảnh, đã tính dầu mỡ thấm vào món; khi không chắc thì chọn mức cao hơn. ' +
      'Nếu trên mâm có bát nước chấm hoặc món kho có nước thì thêm một dòng "Nước kho chan cơm" hoặc "Nước mắm / chấm" đơn vị thìa. Tên món tiếng Việt ngắn gọn, ưu tiên dùng đúng tên trong danh sách sau nếu khớp: ' + FAM.map(x => x[0]).join(', ') + '. ' +
      'Nếu ảnh không phải đồ ăn: isFood=false, dishes rỗng. note: 1 câu nhận xét thẳng về mâm (món nhiều dầu mỡ nên gắp ít, món nào nhiều đạm nên ưu tiên).',
    content: [{ image: dataUrl.split(',')[1] }, { text: mealContext() + '\nNhận các món trên mâm này.' }], schema: FAM_SCHEMA, maxTokens: 3000, onPartial, media: 'MEDIA_RESOLUTION_MEDIUM',
  });
}
async function famPhoto(f) {
  const img = await photoToJpeg(f), lm = f.lastModified, age = Date.now() - lm;
  if (age > 15 * 6e4 && age < 7 * 864e5) slot = { k: dayKey(lm), meal: mealOf(lm), time: hhmm(lm), guessed: true };
  const m = famDraft; m.img = img; m.stage = 'busy'; renderFamily();
  try {
    const r = await famAI(img, t => aiPartList(t, 'dishes', x => x.kcalPerUnit));
    const ai = (r.isFood ? r.dishes : []).filter(x => x.kcalPerUnit > 0 && x.unitGrams > 0)
      .map(x => ({ name: x.name.trim(), unit: x.unit.trim() || 'miếng', g: x.unitGrams, kcal: x.kcalPerUnit, p: x.proteinPerUnit || 0, c: x.carbsPerUnit || 0, f: x.fatPerUnit || 0, n: 0, ai: true }));
    m.items = [m.items[0], ...ai, ...m.items.slice(1).filter(it => !ai.some(a => fold(a.name) === fold(it.name)))];
    m.note = r.isFood ? r.note : 'Ảnh này không giống mâm cơm, hãy chọn món bằng tay.';
  } catch (e) { m.note = 'AI lỗi: ' + e.message + ' · Vẫn chọn món bằng tay được.'; }
  m.stage = 'edit'; if (famDraft === m) renderFamily();
}
async function famSave() {
  const m = famDraft, eaten = m.items.filter(it => it.n > 0);
  if (!eaten.length) { toast('Bấm + để đếm phần bạn đã ăn'); return; }
  let ph = null;
  if (m.img) { const src = await thumbOf(m.img); if (src) { ph = uid(); S.photos = { ...(S.photos || {}), [ph]: { t: Date.now(), src } }; } }
  addFood(eaten.map(it => {
    const g = it.rice ? it.n * bowlG() : it.n * it.g, k = it.rice ? g * RICE.kcal : it.n * it.kcal;
    return { name: `${it.name} (${fmtNum(it.n)} ${it.unit})`, g: Math.round(g), kcal: k, p: it.rice ? g * RICE.p : it.n * it.p, c: it.rice ? g * RICE.c : it.n * it.c, f: it.rice ? g * RICE.f : it.n * it.f,
      src: 'family', ...(DISH_SRC[it.name] ? { dish: it.name } : {}), ...(ph ? { ph } : {}) };
  }));
  // remember dishes the AI found (with their per-unit values) for next time
  const learned = m.items.filter(it => it.ai).map(({ name, unit, g, kcal, p, c, f }) => ({ name, unit, g, kcal, p, c, f, n: 0 }));
  if (learned.length) S.famRecent = [...learned, ...(S.famRecent || []).filter(x => !learned.some(y => fold(y.name) === fold(x.name)))].slice(0, 24);
  const t = famTotals(), lbl = `${slot.meal.toLowerCase()} ${dayLabel(slot.k).toLowerCase()}`;
  save(); famDraft = null; slot = null; sheetOnClose = null; closeSheet(); render(); toast(`Đã thêm ${fmtNum(Math.round(t.kcal))} kcal vào bữa ${lbl}`);
}
function addFood(items) {
  const s = slot || newSlot(foodDay), t = slot ? slotTime() : (foodDay === dayKey() ? Date.now() : dayStart(foodDay) + 12 * 36e5);
  (S.food[s.k] = S.food[s.k] || []).push(...items.map(i => ({ id: uid(), t, ...i })));
  foodDay = s.k; save();
}

