// State, storage, formatting helpers, icons, shared UI bits (sheets, charts, exercise tags), dates.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

'use strict';
const KEY = 'gymlog.v1';
const APP_VERSION = '2026.11.26';
const DEFAULT_EX = EX_DB.map(e => e[0]);

const $ = s => document.querySelector(s);
const main = $('#main');
const ICONS = {
  barbell: '<path d="M8.5 12h7M2 12h1.5M20.5 12H22"/><rect x="3.5" y="8.5" width="2.5" height="7" rx="1"/><rect x="18" y="8.5" width="2.5" height="7" rx="1"/><rect x="6" y="6" width="2.5" height="12" rx="1"/><rect x="15.5" y="6" width="2.5" height="12" rx="1"/>',
  pulse: '<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>',
  apple: '<path d="M12 7.5c-1.6-1.8-6.2-1.6-7 2.4-.9 4.6 2 10.1 4.8 10.1.9 0 1.4-.5 2.2-.5s1.3.5 2.2.5c2.8 0 5.7-5.5 4.8-10.1-.8-4-5.4-4.2-7-2.4z"/><path d="M12 7.5c0-2 1-3.8 3-4.5"/>',
  book: '<path d="M4 4.5h5.5A2.5 2.5 0 0 1 12 7v13a2 2 0 0 0-2-2H4z"/><path d="M20 4.5h-5.5A2.5 2.5 0 0 0 12 7v13a2 2 0 0 1 2-2h6z"/>',
  grid: '<rect x="4" y="4" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
  chev: '<path d="M9.5 6l6 6-6 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  x: '<path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  trophy: '<path d="M8 21h8M12 16.5V21M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5.5h3V7a3 3 0 0 1-3 3M7 5.5H4V7a3 3 0 0 0 3 3"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.8 2.8 0 0 0-4-4L4 16z"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V11M10 20V5M16 20v-6M3 20h18"/>',
  sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  flame: '<path d="M12 21c3.9 0 7-2.9 7-6.8 0-4.6-4.5-6.6-4.5-11.2-2.9 1.9-4.8 4.6-4.8 7.6-1-.8-1.9-1.9-2.1-3.6C5.8 9 5 10.9 5 14.2 5 18.1 8.1 21 12 21z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
  bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  sunrise: '<path d="M3 19h18M7 19a5 5 0 0 1 10 0M12 4v5M4.9 11.9l1.4 1.4M19.1 11.9l-1.4 1.4M9.5 6.5 12 4l2.5 2.5"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  camera: '<path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H8l1.5-2h5L16 6h1.5A2.5 2.5 0 0 1 20 8.5v8a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z"/><circle cx="12" cy="12.5" r="3.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  scale: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M8.5 10a5 5 0 0 1 7 0M12 10l1.5-2"/>',
  drop: '<path d="M12 3.5s6 6.4 6 10.5a6 6 0 0 1-12 0c0-4.1 6-10.5 6-10.5z"/>',
};
const ic = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]}</svg>`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = v => { const n = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(n) ? n : 0; };
const fmtNum = n => (Math.round(n * 100) / 100).toLocaleString('vi-VN');
const fmtDur = ms => { const t = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  return h ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`; };
const fmtDate = ts => new Date(ts).toLocaleDateString('vi-VN', {weekday:'short', day:'2-digit', month:'2-digit', year:'numeric'});
const e1rm = (w, r) => (w > 0 && r > 0) ? (r === 1 ? w : w * (1 + r / 30)) : 0;
const isCardio = name => getEx(name)?.g === 'cardio';
const volume = w => w.exercises.reduce((a, e) => a + (isCardio(e.name) ? 0 : e.sets.reduce((b, s) => b + s.w * s.r, 0)), 0);
const fmtRest = s => s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : s / 60) + ' phút' : s + ' giây';
// Search: case/diacritic-insensitive over English name, Vietnamese name, muscles and group; every word must match.
const fold = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const MUSCLE_ALIAS = { frontDelt: 'vai', sideDelt: 'vai', rearDelt: 'vai', biceps: 'bắp tay', triceps: 'bắp tay', forearms: 'cổ tay', lats: 'lưng', midBack: 'lưng', lowerBack: 'lưng', traps: 'vai', obliques: 'eo', abs: 'core', quads: 'chân', hamstrings: 'chân', glutes: 'chân', calves: 'chân', adductors: 'đùi trong' };
function exMatch(n, q) {
  if (!q) return true;
  const x = getEx(n), hay = fold([n, EX_VI[n] || '', ...(x?.p || []).map(m => MUSCLES[m] + ' ' + (MUSCLE_ALIAS[m] || '')), GROUPS[x?.g] || ''].join(' '));
  return q.split(/\s+/).every(w => hay.includes(w));
}
const sortedRoutines = () => [...S.routines].sort((a, b) => (a.day || 99) - (b.day || 99));

function defaults() { return { routines: [], workouts: [], active: null, customEx: [], exMeta: {}, food: {}, body: [], profile: null, menuIdx: 0, settings: { rest: 90, ai: 'gemini' } }; }
function load() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) { const s = Object.assign(defaults(), d); s.settings = Object.assign(defaults().settings, d.settings); return s; } } catch (e) {}
  return defaults();
}
let S = load();
for (const m of Object.values(S.exMeta || {})) for (const k of ['p', 's']) if ((m[k] || []).includes('shoulders')) m[k] = [...new Set(m[k].flatMap(x => x === 'shoulders' ? ['frontDelt', 'sideDelt'] : [x]))];
// Meal photo thumbnails are kept 60 days so localStorage (≈5 MB) never fills up; the food entries stay.
if (S.photos) { const cut = Date.now() - 60 * 864e5; for (const [id, p] of Object.entries(S.photos)) if (p.t < cut) delete S.photos[id]; }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('⚠️ Không lưu được dữ liệu'); } if (typeof queueBadges === 'function') queueBadges(); }
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

let tab = 'workout', openId = null, progEx = null, draft = null, sheetOnClose = null, pickCb = null;
let restEnd = S.active?.restEnd || 0, restTotal = S.active?.restTotal || S.settings.rest;

function lastSets(name) {
  for (const w of S.workouts) {
    // While editing a saved workout, "last time" means the session before it.
    if (tab === 'edit' && editW && (w.id === editW.id || w.startedAt >= editW.startedAt)) continue;
    const ex = w.exercises.find(e => e.name === name); if (ex && ex.sets.length) return ex.sets;
  }
  return null;
}
// PR = heavier than every earlier session of that exercise. Recomputed after edits/deletes/imports.
function recomputePRs() {
  const best = {};
  for (const w of [...S.workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    w.prs = [];
    for (const e of w.exercises) {
      if (isCardio(e.name)) continue;
      const m = Math.max(...e.sets.map(s => s.w));
      if (best[e.name] > 0 && m > best[e.name]) w.prs.push(e.name);
      best[e.name] = Math.max(best[e.name] || 0, m);
    }
  }
}
let editW = null, editOrig = '', pendingImport = null, routineOffer = null;
const target = () => tab === 'edit' ? editW : S.active; // workout the set editor is working on
function bestOf(name) {
  let maxW = 0, best = 0;
  for (const w of S.workouts) for (const e of w.exercises) if (e.name === name) for (const s of e.sets) { maxW = Math.max(maxW, s.w); best = Math.max(best, e1rm(s.w, s.r)); }
  return { maxW, best };
}
function allExercises() {
  const set = new Set([...DEFAULT_EX, ...S.customEx]);
  S.workouts.forEach(w => w.exercises.forEach(e => set.add(e.name)));
  S.routines.forEach(r => r.exercises.forEach(e => set.add(e.name)));
  return [...set].sort((a, b) => a.localeCompare(b));
}
const getEx = name => EX_MAP[name] || (S.exMeta[name] ? { name, steps: [], tips: [], s: [], ...S.exMeta[name] } : null);

function bodySvg(fill, opts = {}) { // fill(muscle) -> color or null; opts.side = 'front'|'back' for a single view; opts.tap makes muscles tappable
  const draw = (parts, label) => `<svg viewBox="${BODY_VIEWBOX}" class="body" role="img" aria-label="${label}">
    <g fill="#2a2f3a">${BODY_BASE}</g>
    <g stroke="#0f1115" stroke-width="1.4" stroke-linejoin="round">
    ${parts.map(([m, svg]) => { const c = fill(m); return c ? `<g fill="${c}" data-m="${m}"${opts.tap ? ' data-act="muscle"' : ''}>${svg}</g>` : ''; }).join('')}
    </g></svg>`;
  if (opts.side) return draw(opts.side === 'front' ? BODY_FRONT : BODY_BACK, opts.side === 'front' ? 'Mặt trước' : 'Mặt sau');
  return `<div class="bodies"><figure>${draw(BODY_FRONT, 'Mặt trước')}<figcaption>Trước</figcaption></figure><figure>${draw(BODY_BACK, 'Mặt sau')}<figcaption>Sau</figcaption></figure></div>`;
}
const exImg = (name, k) => EX_MAP[name] && !NO_IMG.includes(name) ? `img/ex/${exSlug(name)}-${k}.jpg` : null;
const BACK_ONLY = ['rearDelt', 'traps', 'lats', 'midBack', 'triceps', 'lowerBack', 'glutes', 'hamstrings'];
function muscleThumb(name) {
  const x = getEx(name); if (!x || !x.p.length) return '';
  const side = x.p.filter(m => BACK_ONLY.includes(m)).length > x.p.length / 2 ? 'back' : 'front';
  return bodySvg(m => x.p.includes(m) ? '#f87171' : (x.s || []).includes(m) ? 'rgba(248,113,113,.4)' : null, { side });
}
function exThumb(name) {
  const src = exImg(name, 0);
  return `<div class="thumb">${src ? `<img src="${src}" alt="" loading="lazy">` : `<span class="thumb-ph">${ic('barbell')}</span>`}
    ${getEx(name)?.p.length ? `<div class="mthumb">${muscleThumb(name)}</div>` : ''}</div>`;
}
function lastDoneH(name) { const w = S.workouts.find(w => w.exercises.some(e => e.name === name)); return w ? (Date.now() - w.endedAt) / 36e5 : null; }
const fmtSet = (s, name) => name && isCardio(name) ? `${s.r} phút${s.w ? ' · ' + fmtNum(s.w) + ' km' : ''}` : s.w ? `${fmtNum(s.w)}×${s.r}` : `${s.r} reps`;
const agoText = h => h == null ? 'Chưa tập' : h < 1 ? 'Vừa tập' : h < 24 ? `${Math.round(h)} giờ trước` : `${Math.floor(h / 24)} ngày trước`;

/* ---------- recovery model ----------
   Each set loads its primary muscles by 1 and secondary by 0.5.
   ~6 hard sets fully fatigue a muscle; fatigue decays linearly over RECOVERY_H. */
function recovery(now = Date.now()) {
  const fat = Object.fromEntries(Object.keys(MUSCLES).map(m => [m, 0]));
  const last = {};
  for (const w of S.workouts) {
    const h = (now - (w.endedAt || w.startedAt)) / 36e5;
    const load = {};
    for (const e of w.exercises) {
      const x = getEx(e.name); if (!x) continue;
      const n = e.sets.length;
      x.p.forEach(m => load[m] = (load[m] || 0) + n);
      (x.s || []).forEach(m => load[m] = (load[m] || 0) + n * .5);
    }
    for (const m in load) {
      // heavier session -> longer recovery: fatigue c recovers at 1/RECOVERY_H per hour
      const left = Math.min(1, load[m] / 6) - h / RECOVERY_H[m];
      if (left > 0) fat[m] += left;
      if (last[m] == null || h < last[m]) last[m] = h;
    }
  }
  const out = {};
  for (const m in fat) {
    const f = Math.min(1, fat[m]);
    out[m] = { pct: Math.round((1 - f) * 100), hoursLeft: f > 0 ? Math.ceil(f * RECOVERY_H[m]) : 0, lastH: last[m] };
  }
  return out;
}
const recColor = p => p >= 85 ? '#22c55e' : p >= 50 ? '#eab308' : '#ef4444';

let toastT;
function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }

const TIPS = {
  sets: ['Số set mỗi tuần', 'Mỗi set tính cho <b>cơ chính</b> 1 set, cho <b>cơ phụ</b> ½ set (VD đẩy ngực: ngực 1, vai trước và tay sau ½).<br><br>Khoảng khuyến nghị để tăng cơ: dưới mức thấp thì cơ lớn chậm, trên mức cao thì dễ quá tải.<br><br>Cột bên phải: tuần này là số set cả tuần trước; tuần cũ là tăng/giảm so với tuần trước nữa.'],
  rec: ['Bản đồ cơ', '% hồi phục là ước tính từ số set đã tập: cơ lớn hồi khoảng 72 giờ, cơ nhỏ khoảng 48 giờ. Không phải số đo thật, hãy nghe thêm cảm giác cơ thể.'],
  comp: ['Khối nạc và % mỡ', '% mỡ tính bằng thước dây theo công thức Hải quân Mỹ (chiều cao, vòng cổ, vòng bụng; nữ thêm vòng hông). AI cũng ước lượng % mỡ từ ảnh body hằng tuần để đối chiếu.<br><br>Khối nạc = cân nặng × (1 − % mỡ). Giảm cân mà khối nạc giữ nguyên là đang mất mỡ, không mất cơ.'],
  big3: ['Big 3', 'Mức sức mạnh = 1RM ước tính (từ các set đã tập) chia cho cân nặng, so với bảng chuẩn phổ biến: Mới tập → Cơ bản → Trung bình → Khá → Giỏi.'],
  ai: ['AI', 'Dùng để chụp bữa ăn tính calo, nhận món trên mâm, chấm buổi tập, chấm ngày và chấm ảnh body.<br><br><b>Gemini</b> (miễn phí): vào <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" style="color:var(--accent)">aistudio.google.com</a> → Get API key → Create API key. Key bắt đầu bằng AQ. hoặc AIza. Gói miễn phí giới hạn số lượt mỗi phút và mỗi ngày.<br><br><b>Claude</b>: tạo key tại <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" style="color:var(--accent)">console.anthropic.com</a> (cần nạp trước).<br><br>Key chỉ lưu trên máy này, không nằm trong file sao lưu.'],
  sleep: ['Giấc ngủ', 'Mỗi sáng trang chủ có nút ghi giờ ngủ, giờ dậy. Giấc ngủ chiếm 15/100 điểm ngày; ngủ dưới 6 tiếng thì màn hình tập cảnh báo giữ mức tạ.<br><br>Ngủ trưa: bấm Ngủ trưa ở mục Giấc ngủ (trang Cơ thể). Tối đa 90 phút mỗi ngày được cộng vào giờ ngủ; ngủ 20–30 phút trước 15 giờ là tốt nhất.<br><br>Muốn được nhắc đi ngủ: tạo một tự động hóa trong app Phím tắt (xem mục Nhắc ghi chép), đặt trước giờ ngủ 30 phút.'],
  backup: ['Sao lưu', 'Dữ liệu chỉ nằm trên iPhone này. <b style="color:var(--warn)">Xóa app khỏi màn hình chính là mất toàn bộ dữ liệu.</b> Sao lưu mỗi tuần: Xuất dữ liệu → Lưu vào Tệp → iCloud Drive.'],
  body: ['Cách đo', 'Cân buổi sáng sau khi đi vệ sinh, trước khi ăn.<br>Vòng bụng: ngang rốn, thở ra bình thường, 2 tuần một lần.<br>Vòng cổ: ngay dưới yết hầu. Có vòng cổ thì app tính được % mỡ (Thêm → Hồ sơ).'],
  photo: ['Ảnh body', 'Chụp 3 tư thế (trước, nghiêng, sau) mỗi tuần, cùng chỗ, cùng ánh sáng, cùng giờ (sáng, trước khi ăn).<br><br>Chọn ảnh xong được xem lại trước khi lưu. Đủ 3 tư thế là AI chấm ngay, khắt khe; ảnh xấu thì bắt chụp lại.<br><br>Ảnh được mã hóa bằng mật khẩu kho. Kho ảnh không nằm trong file sao lưu thường: dùng nút Xuất kho ảnh.'],
  menu: ['Thực đơn mẫu', 'Định lượng tính theo đồ đã nấu chín, chỉ để tham khảo. Đổi món tương đương được: ức gà ↔ cá ↔ thịt bò nạc, cơm ↔ bún ↔ khoai. Có bệnh lý thì hỏi chuyên gia dinh dưỡng.'],
};
const tip = k => `<button class="tip" data-act="tip" data-k="${k}" aria-label="Giải thích">${ic('info')}</button>`;
const exVi = name => EX_VI[name] || (getEx(name)?.p || []).map(m => MUSCLES[m]).join(', ');
const exPic = name => { const src = exImg(name, 0); return src ? `<img src="${src}" alt="" loading="lazy">` : `<span class="exm-ph">${esc((exVi(name).split(',')[0] || name).slice(0, 14))}</span>`; };
function exTag(name, extra = '') {
  return `<span class="exm">${exPic(name)}
    <span class="exm-t"><b>${esc(name)}</b>${exVi(name) ? `<small>${esc(exVi(name))}</small>` : ''}${extra}</span></span>`;
}
const isBodyEx = n => EX_LOAD[n] === 'body';
const exTitle = n => EX_VI[n] || n;
function exThumbSm(name) { const src = exImg(name, 0); return src ? `<img src="${src}" alt="" loading="lazy">` : `<span class="ph">${ic('barbell')}</span>`; }
const scoreCol = s => s >= 70 ? 'var(--ok)' : s >= 50 ? 'var(--warn)' : 'var(--danger)';
function chart(vals, labels) {
  const W = 320, H = 150, P = 24;
  if (!vals.length) return '';
  const mn = Math.min(...vals), mx = Math.max(...vals), rng = (mx - mn) || 1;
  const x = i => vals.length === 1 ? W / 2 : P + i * (W - 2 * P) / (vals.length - 1);
  const y = v => mx === mn ? H / 2 : H - P - (v - mn) / rng * (H - 2 * P);
  const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Biểu đồ tiến độ">
    <line x1="${P}" x2="${W - P}" y1="${y(mx)}" y2="${y(mx)}" stroke="#2c313c" stroke-dasharray="3 4"/>
    <line x1="${P}" x2="${W - P}" y1="${y(mn)}" y2="${y(mn)}" stroke="#2c313c" stroke-dasharray="3 4"/>
    <text x="${W - P}" y="${y(mx) - 6}" fill="#8b93a3" font-size="11" text-anchor="end">${fmtNum(Math.round(mx * 10) / 10)}</text>
    ${mx !== mn ? `<text x="${W - P}" y="${y(mn) + 14}" fill="#8b93a3" font-size="11" text-anchor="end">${fmtNum(Math.round(mn * 10) / 10)}</text>` : ''}
    <polyline points="${pts}" fill="none" stroke="#c6f432" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${vals.map((v, i) => `<circle cx="${x(i)}" cy="${y(v)}" r="3.5" fill="#c6f432"/>`).join('')}
    <text x="${P}" y="${H - 4}" fill="#8b93a3" font-size="11">${esc(labels[0])}</text>
    ${vals.length > 1 ? `<text x="${W - P}" y="${H - 4}" fill="#8b93a3" font-size="11" text-anchor="end">${esc(labels[labels.length - 1])}</text>` : ''}
  </svg>`;
}

const parseReps = s => { const m = String(s || '').match(/(\d+)\s*[–-]\s*(\d+)/) || String(s || '').match(/(\d+)/); return m ? [+m[1], +(m[2] || m[1])] : null; };
const LOWER = ['quads', 'hamstrings', 'glutes', 'adductors', 'lowerBack'];
const weightStep = name => (getEx(name)?.p || []).some(m => LOWER.includes(m)) ? 5 : 2.5;
function prevSession(name, before) {
  const w = S.workouts.find(w => w.startedAt < before && w.exercises.some(e => e.name === name));
  return w && w.exercises.find(e => e.name === name);
}
const obj = (props, req = Object.keys(props)) => ({ type: 'object', properties: props, required: req, additionalProperties: false });
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const hhmm = t => new Date(t).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
const TET = '2027-02-06'; // Tết Đinh Mùi — the user's goal date
const bodyLog = () => [...(S.body || [])].sort((a, b) => a.t - b.t);
const daysAgo = t => t ? Math.floor((Date.now() - t) / 864e5) : null;
const fmtSigned = v => (v > 0 ? '+' : v < 0 ? '−' : '±') + fmtNum(Math.abs(Math.round(v * 100) / 100));
const dowOf = t => (new Date(t).getDay() + 6) % 7 + 1; // 1 = Monday … 7 = Sunday
const weekStart = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
const DOW_VI = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const dayStart = k => new Date(k + 'T00:00').getTime();
const addDays = (k, n) => { const d = new Date(k + 'T12:00'); d.setDate(d.getDate() + n); return dayKey(d); };
const dayLabel = k => k === dayKey() ? 'Hôm nay' : k === addDays(dayKey(), -1) ? 'Hôm qua' : new Date(k + 'T12:00').toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' });
function openSheet(html, onClose) { $('#sheetPanel').innerHTML = html; $('#sheet').hidden = false; sheetOnClose = onClose || null; }
function closeSheet() { $('#sheet').hidden = true; const f = sheetOnClose; sheetOnClose = null; if (f) f(); }
