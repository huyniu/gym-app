// Encrypted body photo vault, AI body review, before/after collage.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

async function buildCollage(wa, wb) {
  const A = posesOf(wa), B = posesOf(wb), cols = POSES.map((p, i) => [A[i], B[i]]).filter(([x, y]) => x && y);
  if (!cols.length) throw new Error('Hai tuần cần có chung ít nhất 1 tư thế');
  const load = async it => { const src = await vaultFull(it.id); return new Promise((ok, bad) => { const img = new Image(); img.onload = () => ok(img); img.onerror = () => bad(new Error('Không đọc được ảnh')); img.src = src; }); };
  const W = 360, H = 480, head = 56, c = document.createElement('canvas'); c.width = cols.length * W + (cols.length + 1) * 8; c.height = head + 2 * (H + 34) + 16;
  const g = c.getContext('2d'); g.fillStyle = '#0e0e10'; g.fillRect(0, 0, c.width, c.height);
  const wAt = t => { const x = bodyLog().filter(b => b.w && Math.abs(b.t - t) < 4 * 864e5).sort((a, b) => Math.abs(a.t - t) - Math.abs(b.t - t))[0]; return x ? ` · ${fmtNum(x.w)} kg` : ''; };
  g.fillStyle = '#c6f432'; g.font = 'bold 26px sans-serif'; g.fillText('Trước → Sau', 12, 38);
  for (const [k, w] of [[0, wa], [1, wb]]) {
    const y0 = head + k * (H + 34);
    g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.fillText(new Date(+w).toLocaleDateString('vi-VN') + wAt(+w + 3 * 864e5), 12, y0 + 22);
    for (const [ci, pair] of cols.entries()) {
      const img = await load(pair[k]), x = 8 + ci * (W + 8), y = y0 + 30, s = Math.max(W / img.width, H / img.height);
      g.save(); g.beginPath(); g.rect(x, y, W, H); g.clip(); g.drawImage(img, x + (W - img.width * s) / 2, y + (H - img.height * s) / 2, img.width * s, img.height * s); g.restore();
    }
  }
  return c.toDataURL('image/jpeg', .86);
}
let collageUrl = null;
async function openCollage() {
  const weeks = [...new Set(vault.items.map(i => weekStart(i.t)))].sort((a, b) => a - b); if (weeks.length < 2) { toast('Cần ảnh của ít nhất 2 tuần'); return; }
  const [wa, wb] = vault.cmp || [weeks[0], weeks[weeks.length - 1]];
  openSheet(`<div class="sheet-h"><h3>Ảnh trước – sau</h3><button class="link" data-act="closeSheet">Đóng</button></div><div class="empty">${ic('refresh')} Đang ghép ảnh…</div>`);
  try {
    collageUrl = await buildCollage(Math.min(wa, wb), Math.max(wa, wb));
    openSheet(`<div class="sheet-h"><h3>Ảnh trước – sau</h3><button class="link" data-act="closeSheet">Đóng</button></div>
      <img src="${collageUrl}" alt="" style="width:100%;border-radius:12px">
      <div class="muted small mt" style="color:var(--warn)">Ảnh ghép này KHÔNG được mã hóa. Lưu ra máy là nằm trong Ảnh/Tệp như ảnh thường.</div>
      <button class="btn primary big mt" data-act="collageSave">${ic('download')} Lưu / chia sẻ</button>`, () => { collageUrl = null; });
  } catch (e) { openSheet(`<div class="sheet-h"><h3>Ảnh trước – sau</h3><button class="link" data-act="closeSheet">Đóng</button></div><div class="empty">${esc(e.message)}</div>`); }
}
async function saveCollage() {
  if (!collageUrl) return;
  const blob = await (await fetch(collageUrl)).blob(), file = new File([blob], `truoc-sau-${dayKey()}.jpg`, { type: 'image/jpeg' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file] }); } catch (e) {} return; }
  const a = document.createElement('a'); a.href = collageUrl; a.download = file.name; a.click();
}

/* ---------- body photo vault: IndexedDB, AES-GCM with a key derived from the user's password ----------
   The password is never stored; only a salt and an encrypted check value. Wrong password -> decrypt fails. */
const VAULT_DB = 'gymlog-vault', POSES = ['Trước', 'Nghiêng', 'Sau'];
let vault = { key: null, items: [], reviews: {}, salt: null, busy: false, fails: 0, lockUntil: 0, pose: 'Trước', cmp: null };
function vdb() {
  return new Promise((ok, bad) => { const r = indexedDB.open(VAULT_DB, 1);
    r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('meta'); db.createObjectStore('photos', { keyPath: 'id' }); };
    r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error); });
}
async function vtx(store, mode, fn) {
  const db = await vdb();
  return new Promise((ok, bad) => { const t = db.transaction(store, mode), s = t.objectStore(store), res = fn(s);
    t.oncomplete = () => ok(res && 'result' in res ? res.result : undefined); t.onerror = () => bad(t.error); });
}
const vGet = (store, k) => vtx(store, 'readonly', s => s.get(k));
const vAll = store => vtx(store, 'readonly', s => s.getAll());
const vPut = (store, v, k) => vtx(store, 'readwrite', s => k === undefined ? s.put(v) : s.put(v, k));
const vDel = (store, k) => vtx(store, 'readwrite', s => s.delete(k));
async function deriveKey(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
async function enc(key, buf) { const iv = crypto.getRandomValues(new Uint8Array(12)); return { iv, data: await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, buf) }; }
const dec = (key, x) => crypto.subtle.decrypt({ name: 'AES-GCM', iv: x.iv }, key, x.data);
const CHECK = 'gymlog-vault-ok';
async function vaultMeta() { try { return await vGet('meta', 'kdf'); } catch (e) { return null; } }
async function vaultSetPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), key = await deriveKey(pw, salt);
  await vPut('meta', { salt, check: await enc(key, new TextEncoder().encode(CHECK)) }, 'kdf');
  vault.key = key; vault.salt = salt; await vaultLoad();
}
async function vaultUnlock(pw) {
  const m = await vaultMeta(), key = await deriveKey(pw, m.salt);
  try { if (new TextDecoder().decode(await dec(key, m.check)) !== CHECK) throw 0; } catch (e) { return false; }
  vault.key = key; vault.salt = m.salt; await vaultLoad(); return true;
}
async function vaultLoad() {
  vaultUrls();
  const rows = (await vAll('photos')).sort((a, b) => b.t - a.t);
  vault.items = [];
  for (const r of rows) { try { vault.items.push({ id: r.id, t: r.t, pose: r.pose, thumb: URL.createObjectURL(new Blob([await dec(vault.key, r.thumb)], { type: 'image/jpeg' })) }); } catch (e) { /* unreadable item */ } }
  await loadReviews(); vaultIndex();
}
function vaultUrls() { vault.items.forEach(i => { URL.revokeObjectURL(i.thumb); if (i.full) URL.revokeObjectURL(i.full); }); }
function vaultLock() { vaultUrls(); vault = { ...vault, key: null, items: [], reviews: {}, cmp: null }; }
function resizeJpeg(src, max, q) {
  return new Promise((ok, bad) => { const img = new Image(); img.onload = () => {
    const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => b ? ok(b) : bad(new Error('Không xử lý được ảnh')), 'image/jpeg', q); };
    img.onerror = () => bad(new Error('Không đọc được ảnh')); img.src = src; });
}
async function vaultAdd(file) {
  const url = URL.createObjectURL(file);
  try {
    const [full, thumb] = await Promise.all([resizeJpeg(url, 1280, .82), resizeJpeg(url, 300, .7)]);
    const age = Date.now() - file.lastModified, t = age > 10 * 6e4 && age < 60 * 864e5 ? file.lastModified : Date.now();
    await vPut('photos', { id: uid(), t, pose: vault.pose, full: await enc(vault.key, await full.arrayBuffer()), thumb: await enc(vault.key, await thumb.arrayBuffer()) });
    S.photoAt = Math.max(S.photoAt || 0, t); save();
    await vaultLoad();
  } finally { URL.revokeObjectURL(url); }
}
async function vaultFull(id) {
  const it = vault.items.find(i => i.id === id); if (!it) return null;
  if (!it.full) { const r = await vGet('photos', id); it.full = URL.createObjectURL(new Blob([await dec(vault.key, r.full)], { type: 'image/jpeg' })); }
  return it.full;
}
// Export keeps everything encrypted (salt, check value, photos) so the file is safe to keep in iCloud.
const b64 = buf => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const packEnc = x => ({ iv: b64(x.iv), data: b64(x.data) }), unpackEnc = x => ({ iv: unb64(x.iv), data: unb64(x.data).buffer });
async function vaultExport() {
  const m = await vaultMeta(), rows = await vAll('photos'), rv = await vGet('meta', 'reviews');
  const json = JSON.stringify({ app: 'gymlog-vault', v: 1, salt: b64(m.salt), check: packEnc(m.check), ...(rv ? { reviews: packEnc(rv) } : {}), photos: rows.map(r => ({ id: r.id, t: r.t, pose: r.pose, full: packEnc(r.full), thumb: packEnc(r.thumb) })) });
  const name = `gym-anh-body-${dayKey()}.gymvault`, file = new File([json], name, { type: 'application/octet-stream' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: name }); } catch (e) {} return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function vaultImport(text) {
  const d = JSON.parse(text); if (d.app !== 'gymlog-vault') throw new Error('Không phải file kho ảnh');
  const m = await vaultMeta(), salt = unb64(d.salt);
  if (m && b64(m.salt) !== d.salt) throw new Error('File này dùng mật khẩu/khóa khác với kho hiện tại. Chỉ nhập được vào kho trống hoặc cùng khóa.');
  if (!m) await vPut('meta', { salt, check: unpackEnc(d.check) }, 'kdf');
  for (const p of d.photos) await vPut('photos', { id: p.id, t: p.t, pose: p.pose, full: unpackEnc(p.full), thumb: unpackEnc(p.thumb) });
  if (d.reviews && !(await vGet('meta', 'reviews'))) await vPut('meta', unpackEnc(d.reviews), 'reviews');
  return d.photos.length;
}
function viewVault() {
  if (vault.busy) return `<div class="empty">${ic('refresh')} Đang xử lý…</div>`;
  if (!vault.key) {
    const setup = vault.needsSetup;
    return `<div class="card vault-lock">${ic('info', 'vault-ic')}
      <div class="title" style="margin:8px 0 4px">${setup ? 'Đặt mật khẩu cho kho ảnh' : 'Kho ảnh body đang khóa'}</div>
      <div class="muted small" style="margin-bottom:12px">${setup ? 'Ảnh được mã hóa bằng mật khẩu này. <b style="color:var(--warn)">Quên mật khẩu là mất ảnh</b>, không khôi phục được. Mật khẩu không được lưu ở đâu cả.' : 'Nhập mật khẩu để mở.'}</div>
      <input id="vPw" type="password" inputmode="numeric" autocomplete="off" placeholder="Mật khẩu">
      ${setup ? '<input id="vPw2" type="password" inputmode="numeric" autocomplete="off" placeholder="Nhập lại mật khẩu" style="margin-top:8px">' : ''}
      <button class="btn primary big mt" data-act="${setup ? 'vaultSetup' : 'vaultOpen'}">${setup ? 'Tạo kho ảnh' : 'Mở khóa'}</button>
      ${setup ? '' : '<button class="text-btn" data-act="vaultImportBtn">Nhập kho ảnh từ file sao lưu</button>'}</div>`;
  }
  const weeks = {}; vault.items.forEach(i => { const w = weekStart(i.t); (weeks[w] = weeks[w] || []).push(i); });
  const wk = Object.keys(weeks).map(Number).sort((a, b) => b - a), lbl = w => `Tuần ${new Date(w).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}`;
  const due = !S.photoAt || daysAgo(S.photoAt) >= 7;
  return `${bodyRevCard()}<div class="card">
      <div class="row gap"><div class="grow"><div class="title">Thêm ảnh tuần này ${tip('photo')}</div><div class="muted small">${due ? '<b style="color:var(--warn)">Đến lúc chụp</b> · ' : ''}${S.photoAt ? 'Lần cuối ' + (daysAgo(S.photoAt) ? daysAgo(S.photoAt) + ' ngày trước' : 'hôm nay') : 'Chưa có ảnh'}</div></div>
        <button class="btn" data-act="vaultLock">${ic('x')} Khóa</button></div>
      <div class="seg mt">${POSES.map(p => `<button class="${vault.pose === p ? 'on' : ''}" data-act="vaultPose" data-v="${p}">${p}</button>`).join('')}</div>
      <button class="btn primary big mt" data-act="vaultShot">${ic('camera')} Chụp / chọn ảnh ${vault.pose.toLowerCase()}</button>
</div>
    ${wk.length >= 2 ? `<div class="card"><div class="title" style="margin-bottom:8px">So sánh</div>
      <div class="slot"><select id="vCmpA">${wk.map((w, i) => `<option value="${w}" ${(vault.cmp?.[0] ?? wk[wk.length - 1]) == w ? 'selected' : ''}>${lbl(w)}</option>`).join('')}</select>
      <select id="vCmpB">${wk.map(w => `<option value="${w}" ${(vault.cmp?.[1] ?? wk[0]) == w ? 'selected' : ''}>${lbl(w)}</option>`).join('')}</select></div>
      ${POSES.map(p => { const [a, b] = vault.cmp || [wk[wk.length - 1], wk[0]], A = (weeks[a] || []).find(i => i.pose === p), B = (weeks[b] || []).find(i => i.pose === p);
        return A || B ? `<div class="vcmp"><span>${p}</span><div>${A ? `<img src="${A.thumb}" data-act="vaultView" data-id="${A.id}" alt="">` : '<i></i>'}${B ? `<img src="${B.thumb}" data-act="vaultView" data-id="${B.id}" alt="">` : '<i></i>'}</div></div>` : ''; }).join('')}
      <button class="btn big mt" data-act="collage">${ic('camera')} Tạo ảnh ghép trước – sau</button></div>` : ''}
    ${wk.map(w => `<div class="section-h"><h2>${lbl(w)}</h2>${vault.reviews[w] ? `<button class="link" data-act="bodyRevView" data-w="${w}" style="color:${vault.reviews[w].photoQuality === 'Chụp lại' ? 'var(--danger)' : VC[vault.reviews[w].verdict]}">${vault.reviews[w].photoQuality === 'Chụp lại' ? 'Chụp lại' : `AI ${vault.reviews[w].score}/100`}</button>` : `<span class="muted small">${weeks[w].length} ảnh</span>`}</div>
      <div class="vgrid">${weeks[w].map(i => `<button class="vcell" data-act="vaultView" data-id="${i.id}"><img src="${i.thumb}" alt=""><span>${i.pose} · ${new Date(i.t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</span></button>`).join('')}</div>`).join('') || '<div class="empty">Chưa có ảnh nào</div>'}
    <div class="card mt"><div class="title" style="margin-bottom:4px">Sao lưu kho ảnh</div>
      <div class="muted small" style="margin-bottom:10px">Không nằm trong sao lưu thường, nhớ xuất riêng.</div>
      <div class="row gap"><button class="btn grow" data-act="vaultExport">${ic('download')} Xuất kho ảnh</button><button class="btn grow" data-act="vaultImportBtn">Nhập kho ảnh</button></div></div>`;
}
/* ---------- AI body review: mandatory once a week's 3 poses are in. Full results stay encrypted in the vault;
   S.bodyRev only keeps score/verdict per week so reminders and the day score work while the vault is locked. ---------- */
// 'review' = this week's 3 poses are in but not graded (or re-shot after a retake); 'retake' = AI rejected the photos
function bodyPending() {
  const w = weekStart(), v = S.vPoses?.[w], rev = S.bodyRev?.[w];
  const complete = v && POSES.every(p => v.p.includes(p));
  if (rev?.retake) return v && v.last > rev.t && complete ? 'review' : 'retake';
  return complete && !rev ? 'review' : null;
}
function vaultIndex() {
  const vp = {};
  vault.items.forEach(i => { const w = weekStart(i.t), x = vp[w] = vp[w] || { p: [], last: 0 }; if (!x.p.includes(i.pose)) x.p.push(i.pose); x.last = Math.max(x.last, i.t); });
  S.vPoses = vp; S.vDays = [...new Set(vault.items.map(i => dayKey(i.t)))]; save();
}
async function loadReviews() {
  try { const r = await vGet('meta', 'reviews'); vault.reviews = r ? JSON.parse(new TextDecoder().decode(await dec(vault.key, r))) : {}; } catch (e) { vault.reviews = {}; }
}
async function saveReviews(key) { await vPut('meta', await enc(key, new TextEncoder().encode(JSON.stringify(vault.reviews))), 'reviews'); }
const posesOf = w => POSES.map(p => vault.items.filter(i => weekStart(i.t) === w && i.pose === p).sort((a, b) => b.t - a.t)[0] || null);
async function photo64(id) { const blob = await resizeJpeg(await vaultFull(id), 768, .8); return b64(await blob.arrayBuffer()); }
const BODY_SCHEMA = obj({
  photoQuality: { type: 'string', enum: ['Đạt', 'Chụp lại'] }, photoIssue: { type: 'string' },
  score: { type: 'integer' }, verdict: { type: 'string', enum: ['Đạt', 'Tạm', 'Không đạt'] }, verdictReason: { type: 'string' },
  bodyFat: { type: 'string' }, summary: { type: 'string' },
  areas: { type: 'array', items: obj({ area: { type: 'string' }, note: { type: 'string' } }) },
  weakest: { type: 'string' }, posture: { type: 'string' }, vsLast: { type: 'string' },
  nextWeek: { type: 'array', items: { type: 'string' } },
});
async function runBodyReview(w) {
  const cur = posesOf(w); if (cur.some(x => !x)) throw new Error('Cần đủ 3 tư thế: ' + POSES.join(', '));
  const weeks = [...new Set(vault.items.map(i => weekStart(i.t)))].filter(x => x < w).sort((a, b) => b - a);
  const prevW = weeks.find(x => vault.reviews[x] && vault.reviews[x].photoQuality !== 'Chụp lại') ?? weeks[weeks.length - 1] ?? null;
  const prev = prevW != null ? posesOf(prevW) : [], content = [];
  for (const [i, x] of cur.entries()) { content.push({ text: `ẢNH TUẦN NÀY – ${POSES[i]} (${new Date(x.t).toLocaleDateString('vi-VN')})` }); content.push({ image: await photo64(x.id) }); }
  for (const [i, x] of prev.entries()) if (x) { content.push({ text: `ẢNH LẦN TRƯỚC – ${POSES[i]} (${new Date(x.t).toLocaleDateString('vi-VN')})` }); content.push({ image: await photo64(x.id) }); }
  const p = S.profile, tr = weightTrend(), wa = bodyLog().filter(b => b.waist), tet = Math.ceil((new Date(TET + 'T00:00') - new Date().setHours(0, 0, 0, 0)) / 864e5);
  const pr = prevW != null ? vault.reviews[prevW] : null, last7 = [1, 2, 3, 4, 5, 6, 7].map(i => addDays(dayKey(), -i));
  const nights = last7.filter(k => S.sleep?.[k]);
  const data = {
    athlete: p ? { sex: p.sex, age: p.age, heightCm: p.height, goal: GOALS[p.goal][0], kcalTarget: targets(p).kcal, proteinTarget: targets(p).protein } : null,
    weight7DayAvgKg: tr ? Math.round(tr.now * 10) / 10 : null, weightChangeVsPrevWeekKg: tr ? Math.round(tr.rate * 10) / 10 : null,
    waistCm: wa.length ? wa[wa.length - 1].waist : null, waistFirstCm: wa.length ? wa[0].waist : null,
    daysUntilTetGoal: tet, workoutsLast7Days: S.workouts.filter(x => x.startedAt >= Date.now() - 7 * 864e5).length, plannedPerWeek: schedSeq().length,
    avgDayScoreLast7: Math.round(last7.reduce((a, k) => a + dayScore(k).score, 0) / 7),
    avgSleepHoursLast7: nights.length ? Math.round(nights.reduce((a, k) => a + sleepMin(S.sleep[k]), 0) / nights.length / 6) / 10 : 'không ghi',
    previousReview: pr ? { date: new Date(+prevW).toLocaleDateString('vi-VN'), score: pr.score, bodyFat: pr.bodyFat, weakest: pr.weakest } : null,
    hasPreviousPhotos: prev.some(Boolean),
  };
  content.push({ text: 'Dữ liệu: ' + JSON.stringify(data) });
  return askAI({
    system: 'Bạn là HLV thể hình kiêm giám khảo cực kỳ khó tính, nói tiếng Việt, phũ và thẳng. Chấm ảnh body hằng tuần (3 tư thế: trước, nghiêng, sau) của người đang tập để đạt mục tiêu trước Tết. ' +
      'Bước 1, kiểm tra ảnh: nếu ảnh quá tối, mờ, bị che, không thấy rõ thân người, sai tư thế, hoặc góc/khoảng cách/ánh sáng khác hẳn ảnh lần trước đến mức không so sánh được thì photoQuality="Chụp lại", photoIssue nói rõ phải sửa gì, score=0, verdict="Không đạt", các mục khác ghi ngắn "Chưa chấm được". Ảnh dùng được thì photoQuality="Đạt", photoIssue="". ' +
      'Bước 2, chấm khắt khe. Thang điểm: 50 = không thấy thay đổi so với lần trước; dưới 50 = xấu đi (mỡ bụng nhiều hơn, mềm hơn); 60–70 = tiến bộ nhỏ nhưng thấy được; trên 80 chỉ khi tiến bộ rõ ràng nhìn bằng mắt VÀ khớp số liệu (cân/vòng bụng); trên 90 gần như không cho. Lần đầu (không có ảnh trước) thì chấm theo khoảng cách tới mục tiêu, tối đa 60. Nghi ngờ thì chấm thấp. ' +
      'verdict so với tốc độ cần để kịp mục tiêu Tết (daysUntilTetGoal): "Đạt" khi tiến bộ đúng tốc độ, "Tạm" khi chậm, "Không đạt" khi đứng yên hoặc xấu đi. verdictReason: 1 câu có căn cứ. ' +
      'bodyFat: ước lượng % mỡ bằng khoảng, ví dụ "18–21%". summary: 2 câu phũ, nói điều quan trọng nhất. areas: đúng 6 mục theo thứ tự Bụng, Ngực, Vai, Lưng, Tay, Chân; mỗi note 1 câu thẳng (vùng không thấy rõ thì ghi "không thấy rõ trong ảnh"). ' +
      'weakest: vùng yếu nhất và lý do. posture: lệch vai, gù, nghiêng hông, bụng đẩy trước nếu thấy; không có thì ghi "Không thấy lỗi rõ". vsLast: so với ảnh lần trước cụ thể chỗ nào thay đổi, không có ảnh trước thì ghi "Lần đầu, chưa so sánh". ' +
      'nextWeek: đúng 3 lệnh cụ thể cho tuần tới (tập, ăn, ngủ), dựa trên dữ liệu kèm theo. ' +
      'Luật: cấm khen xã giao và câu an ủi; chỉ khen khi thấy rõ trong ảnh. Phũ về kết quả, KHÔNG chế giễu hay xúc phạm cơ thể con người. Không khuyên ăn dưới kcalTarget, không khuyên nhịn ăn, không khuyên thuốc hay chất bổ trợ; không chẩn đoán y tế. Chỉ nói điều thấy trong ảnh hoặc có trong dữ liệu.',
    content, schema: BODY_SCHEMA, think: 'MEDIUM', maxTokens: 4000,
  });
}
const VC = { 'Đạt': 'var(--ok)', 'Tạm': 'var(--warn)', 'Không đạt': 'var(--danger)' };
function bodyRevHtml(r, w) {
  const retake = r.photoQuality === 'Chụp lại';
  return `<div class="sheet-h"><h3>AI chấm body · tuần ${new Date(+w).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })}</h3><button class="link" data-act="closeSheet">Đóng</button></div>
    ${retake ? `<div class="verdict" style="color:var(--danger);background:color-mix(in srgb, var(--danger) 15%, transparent)"><b>Chụp lại</b><span>${esc(r.photoIssue)}</span></div>
      <div class="muted small mt">Chụp lại đủ tư thế bị lỗi rồi app tự chấm lại. Tuần này chưa tính là xong.</div>
      <button class="btn primary big mt" data-act="closeSheet">${ic('camera')} Đi chụp lại</button>` : `
    <div class="score"><div class="ring" style="--p:${r.score}"><b>${r.score}</b></div><div class="grow"><div class="title" style="color:${VC[r.verdict]}">${esc(r.verdict)}</div>
      <div class="muted small">${esc(r.verdictReason)}</div><div class="small" style="margin-top:4px">Mỡ ước lượng: <b>${esc(r.bodyFat)}</b></div></div></div>
    <div class="ai-card"><p>${esc(r.summary)}</p>
      <h4>Từng vùng</h4>${(r.areas || []).map(a => `<div class="rev-i"><b style="min-width:42px">${esc(a.area)}</b><span>${esc(a.note)}</span></div>`).join('')}
      <h4>Yếu nhất</h4><p>${esc(r.weakest)}</p><h4>Tư thế</h4><p>${esc(r.posture)}</p><h4>So với lần trước</h4><p>${esc(r.vsLast)}</p>
      <h4>Tuần tới phải làm</h4><ol class="steps small" style="font-size:14px">${(r.nextWeek || []).map(t => `<li>${esc(t)}</li>`).join('')}</ol></div>`}
    <button class="text-btn" data-act="bodyReview" data-w="${w}">${ic('refresh')} Chấm lại</button>`;
}
function bodyRevCard() {
  const w = weekStart(), cur = posesOf(w), miss = POSES.filter((p, i) => !cur[i]), r = vault.reviews?.[w], bp = bodyPending();
  if (miss.length === 3 && !r) return '';
  return `<div class="card body-rev">
    <div class="row gap"><span class="qt-ic">${ic('bolt')}</span><div class="grow"><div class="title" style="font-size:15px">AI chấm body tuần này</div>
      <div class="muted small">${miss.length ? `Còn thiếu: ${miss.join(', ')}. Đủ 3 tư thế là AI chấm ngay (bắt buộc).`
        : bp === 'review' ? '<b style="color:var(--warn)">Chưa chấm, bắt buộc trước khi xong tuần</b>'
        : bp === 'retake' ? `<b style="color:var(--danger)">AI yêu cầu chụp lại:</b> ${esc(r?.photoIssue || '')}`
        : r ? `<b style="color:${VC[r.verdict]}">${r.score}/100 · ${esc(r.verdict)}</b> · mỡ ~${esc(r.bodyFat)}` : ''}</div></div></div>
    ${bp === 'review' ? `<button class="btn primary big mt" data-act="bodyReview" data-w="${w}">${ic('bolt')} Chấm ngay</button>`
      : r && !bp ? `<button class="btn mt" data-act="bodyRevView" data-w="${w}">Xem chi tiết</button>` : ''}
    ${(() => { const ws = Object.keys(vault.reviews || {}).map(Number).filter(x => vault.reviews[x].photoQuality !== 'Chụp lại').sort((a, b) => a - b);
      return ws.length >= 2 ? `<div class="mt">${chart(ws.map(x => vault.reviews[x].score), ws.map(x => new Date(x).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })))}</div>` : ''; })()}
  </div>`;
}
async function bodyReviewUI(w) {
  const key = vault.key; if (!key) return;
  openSheet(`<div class="sheet-h"><h3>AI đang chấm body… <span class="ai-sec" data-t0="${Date.now()}"></span></h3></div><div class="empty">${ic('refresh')} Đang gửi ảnh và chờ AI soi từng vùng (10–40 giây)</div>`);
  try {
    const r = await runBodyReview(w), t = Date.now();
    r.score = Math.max(0, Math.min(100, Math.round(r.score || 0))); r.t = t;
    vault.reviews = vault.reviews || {}; vault.reviews[w] = r; await saveReviews(key);
    S.bodyRev = S.bodyRev || {}; S.bodyRev[w] = { t, score: r.score, verdict: r.verdict, bodyFat: r.bodyFat, retake: r.photoQuality === 'Chụp lại' }; save();
    if (vault.key) { openSheet(bodyRevHtml(r, w)); render(); }
    else toast('Đã chấm xong. Mở kho ảnh để xem kết quả.', 3500);
  } catch (e) {
    openSheet(`<div class="sheet-h"><h3>Chưa chấm được</h3><button class="link" data-act="closeSheet">Đóng</button></div>
      <div class="muted small">${esc(e.message)}</div><button class="btn primary big mt" data-act="bodyReview" data-w="${w}">${ic('refresh')} Thử lại</button>`);
  }
}
async function openVault() {
  tab = 'vault'; vault.busy = true; render();
  vault.needsSetup = !(await vaultMeta()); vault.busy = false; render(); window.scrollTo(0, 0);
}

function vaultPreview() {
  const f = vault.pendingFile; if (!f) return;
  if (vault.pendingUrl) URL.revokeObjectURL(vault.pendingUrl);
  vault.pendingUrl = URL.createObjectURL(f);
  const left = POSES.filter((p, i) => !posesOf(weekStart())[i] && p !== vault.pose), last = left.length === 0 && !posesOf(weekStart())[POSES.indexOf(vault.pose)];
  openSheet(`<div class="sheet-h"><h3>Kiểm tra trước khi lưu</h3><button class="link" data-act="vaultCancel">Hủy</button></div>
    <div class="seg" style="margin-bottom:10px">${POSES.map(p => `<button class="${vault.pose === p ? 'on' : ''}" data-act="vaultPoseSheet" data-v="${p}">${p}</button>`).join('')}</div>
    <img src="${vault.pendingUrl}" alt="" style="width:100%;max-height:55vh;object-fit:contain;border-radius:14px;background:var(--card2)">
    ${last ? `<div class="small mt" style="color:var(--warn)">Đây là tư thế cuối của tuần: bấm Lưu là AI chấm ngay (ảnh được gửi đi).</div>` : ''}
    <button class="btn primary big mt" data-act="vaultSave">${ic('check')} Lưu ảnh ${vault.pose.toLowerCase()}</button>
    <button class="btn big mt" data-act="vaultRepick">${ic('camera')} Chọn ảnh khác</button>`, () => { if (vault.pendingUrl) URL.revokeObjectURL(vault.pendingUrl); vault.pendingUrl = null; vault.pendingFile = null; });
}
async function vaultSavePending() {
  const f = vault.pendingFile; if (!f || !vault.key) return;
  vault.pendingFile = null; closeSheet();
  vault.busy = true; render();
  try { await vaultAdd(f); toast(`Đã lưu ảnh ${vault.pose.toLowerCase()} (đã mã hóa)`); } catch (err) { toast(err.message); }
  vault.busy = false; render();
  if (vault.key && bodyPending() === 'review') bodyReviewUI(weekStart());
  else if (vault.key) { const m = POSES.filter((p, i) => !posesOf(weekStart())[i]); if (m.length && m.length < 3) { vault.pose = m[0]; render(); } }
}
