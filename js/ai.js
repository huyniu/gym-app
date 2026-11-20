// AI clients: Gemini (with model fallback and speed test) and Claude.
// Classic script: shares the global scope with the other js/*.js files (see the load order in index.html).

// Keys live in their own localStorage entries, outside S, so backups never contain them.
const AI = {
  gemini: { name: 'Gemini', store: 'gymlog.geminikey', prefix: ['AQ.', 'AIza'], hint: 'AQ.… hoặc AIza…' },
  claude: { name: 'Claude', store: 'gymlog.apikey', prefix: ['sk-ant-'], hint: 'sk-ant-…' },
};
const aiProv = () => AI[S.settings.ai] ? S.settings.ai : 'gemini';
const keyOf = p => { try { return localStorage.getItem(AI[p].store) || ''; } catch (e) { return ''; } };
const getKey = () => keyOf(aiProv());
const hasKey = () => !!getKey();
// content: [{ text } | { image: <base64 jpeg> }]; the reply must be JSON matching schema.
async function aiFetch(url, opt, who) {
  const once = async () => {
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 60000);
    try { return await fetch(url, { ...opt, signal: ctl.signal }); } finally { clearTimeout(timer); }
  };
  try { return await once(); }
  catch (e) {
    if (e.name === 'AbortError') throw new Error(`${who} trả lời quá lâu (hơn 60 giây). Thử lại.`);
    await new Promise(r => setTimeout(r, 1200));
    try { return await once(); }
    catch (e2) { throw new Error(`Không kết nối được tới ${who} (${e2.message}). Thử bật Wi-Fi hoặc tắt VPN/chặn quảng cáo rồi thử lại. Nếu vẫn lỗi: Thêm → Cài đặt → Thử kết nối.`); }
  }
}
const askAI = o => aiProv() === 'gemini' ? askGemini(o) : askClaude(o);
const GEMINI_MAIN = 'gemini-3.8-flash';
const gemModel = () => S.settings.gemModel || GEMINI_MAIN;
let lastAI = null; // { model, ms, backup } of the last successful Gemini call
// Gemini 3+ takes a thinking level; 2.x Flash takes a token budget (0 = no thinking).
const thinkCfg = (model, think) => /gemini-[3-9]/.test(model) ? { thinkingLevel: think } : /flash/.test(model) ? { thinkingBudget: think === 'MEDIUM' ? 1024 : 0 } : {};
let geminiAlts = null; // other Flash models this key can use, looked up only when the main one is overloaded
async function geminiAltModels() {
  if (geminiAlts) return geminiAlts;
  try {
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': getKey() } });
    const d = await r.json();
    geminiAlts = (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => m.name.replace(/^models\//, ''))
      .filter(n => /flash/i.test(n) && !/image|tts|audio|live|embed|preview|exp/i.test(n) && n !== gemModel())
      .sort((a, b) => b.localeCompare(a, 'en', { numeric: true })).slice(0, 3);
  } catch (e) { geminiAlts = []; }
  return geminiAlts;
}
async function geminiSpeedTest(onStep) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': getKey() } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Google trả lỗi ' + r.status + ': ' + (d.error?.message || r.statusText));
  const names = (d.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name.replace(/^models\//, ''))
    .filter(n => /flash/i.test(n) && !/image|tts|audio|live|embed|exp|thinking/i.test(n)).sort((a, b) => b.localeCompare(a, 'en', { numeric: true })).slice(0, 6);
  const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d');
  g.fillStyle = '#f5f0e6'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#fff'; g.beginPath(); g.arc(160, 120, 90, 0, 7); g.fill(); g.fillStyle = '#b5651d'; g.fillRect(110, 90, 100, 60);
  const img = c.toDataURL('image/jpeg', .8).split(',')[1], res = [];
  for (const m of names) {
    onStep(m, null);
    const t0 = Date.now();
    try {
      const x = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': getKey() },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'image/jpeg', data: img } }, { text: 'Ước tính calo món trong ảnh.' }] }],
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: MEAL_SCHEMA, mediaResolution: 'MEDIA_RESOLUTION_MEDIUM', thinkingConfig: thinkCfg(m, 'MINIMAL') } }) });
      const j = await x.json().catch(() => ({}));
      const ok = x.ok && j.candidates?.[0]?.content?.parts?.some(p => p.text && !p.thought);
      res.push({ m, ms: Date.now() - t0, ok, err: ok ? '' : (x.status === 429 ? 'hết lượt miễn phí' : x.status >= 500 ? 'quá tải' : (j.error?.message || 'lỗi ' + x.status).slice(0, 60)) });
    } catch (e) { res.push({ m, ms: Date.now() - t0, ok: false, err: e.message.slice(0, 60) }); }
    onStep(m, res[res.length - 1]);
  }
  return res;
}
const GEM_URL = 'https://generativelanguage.googleapis.com/v1beta/models/';
// Open the connection to Google and look up backup models ahead of time (call when a screen that uses AI opens).
let warmAt = 0;
function aiWarm() {
  if (aiProv() !== 'gemini' || !hasKey() || !navigator.onLine || Date.now() - warmAt < 60000) return;
  warmAt = Date.now();
  const l = document.createElement('link'); l.rel = 'preconnect'; l.href = 'https://generativelanguage.googleapis.com'; l.crossOrigin = 'anonymous'; document.head.append(l);
  geminiAltModels();
}
// Parse JSON that is still arriving. strict = only up to the last complete item (no half-written numbers).
function partialJSON(s, strict) {
  const st = []; let inStr = false, bs = false, cut = -1, cutSt = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) { if (bs) bs = false; else if (ch === '\\') bs = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true;
    else if (ch === '{' || ch === '[') st.push(ch === '{' ? '}' : ']');
    else if (ch === '}' || ch === ']') { st.pop(); cut = i + 1; cutSt = st.slice(); }
    else if (ch === ',') { cut = i; cutSt = st.slice(); }
  }
  const close = x => x.slice().reverse().join(''), tries = [];
  if (!strict) { if (inStr) tries.push(s + '"' + close(st)); tries.push(s + close(st)); }
  if (cut > 0) tries.push(s.slice(0, cut) + close(cutSt));
  for (const t of tries) { try { return JSON.parse(t); } catch (e) { /* try the next cut */ } }
  return null;
}
// One streamed Gemini call. onText gets the answer text so far. Errors come back as { res, d } like a normal call.
async function gemStream(model, body, signal, onText) {
  const go = () => fetch(GEM_URL + model + ':streamGenerateContent?alt=sse', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': getKey() }, body, signal });
  let res;
  try { res = await go(); }
  catch (e) { if (e.name === 'AbortError') throw e; await new Promise(r => setTimeout(r, 1200)); res = await go(); }
  if (!res.ok || !res.body) { const raw = await res.json().catch(() => ({})); return { res, d: Array.isArray(raw) ? raw[0] || {} : raw }; }
  const rd = res.body.getReader(), dec = new TextDecoder();
  let buf = '', text = '', fin, ver, fb;
  for (;;) {
    const { value, done } = await rd.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      let j; try { j = JSON.parse(line.slice(5)); } catch (e) { continue; }
      if (j.error) return { res: { ok: false, status: j.error.code || 500, statusText: j.error.status || '' }, d: j };
      ver = j.modelVersion || ver; fb = j.promptFeedback || fb;
      const c = j.candidates?.[0]; if (c?.finishReason) fin = c.finishReason;
      const t = (c?.content?.parts || []).filter(p => !p.thought && p.text).map(p => p.text).join('');
      if (t) { text += t; onText(text); }
    }
  }
  return { res, d: { candidates: [{ content: { parts: [{ text }] }, finishReason: fin }], modelVersion: ver, promptFeedback: fb } };
}
// Start a backup model when the main one has written nothing after this long (none for deep thinking, which is slow by design).
const HEDGE_MS = { MINIMAL: 8000, LOW: 12000 };
async function askGemini({ system, content, schema, think = 'MINIMAL', onPartial, media }) {
  if (!hasKey()) throw new Error('Chưa có API key Gemini. Vào Thêm → Cài đặt để nhập.');
  if (!navigator.onLine) throw new Error('Không có mạng.');
  const parts = content.map(c => c.image ? { inlineData: { mimeType: 'image/jpeg', data: c.image } } : { text: c.text });
  // thinkingLevel is for the main model; fallbacks use their own default thinking.
  // mediaResolution MEDIUM: about half the image tokens of the default, still sharp enough for food and body photos.
  const body = (model, isMain) => JSON.stringify({
    systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, ...(isMain ? { thinkingConfig: thinkCfg(model, think) } : {}), ...(media ? { mediaResolution: media } : {}) },
  });
  const busyOf = (o, isMain) => o.res.status >= 500 || o.d.error?.status === 'UNAVAILABLE' || /high demand|overload/i.test(o.d.error?.message || '') || (!isMain && o.res.status === 404);
  // One attempt. With hedge, a backup model starts when the main one is slow; whichever writes first wins and the other is cancelled.
  const attempt = (model, isMain, hedge) => new Promise(resolve => {
    const runs = []; let winner = null, settled = false, ht = 0;
    const finish = () => {
      if (settled) return; settled = true; clearTimeout(ht);
      runs.forEach(r => { if (!r.done) r.ctl.abort(); });
      resolve(runs.map(r => r.out).find(o => o && !o.err && o.res.ok) || (winner || runs[0]).out);
    };
    const start = (m, isM) => {
      const run = { ctl: new AbortController(), done: false }; runs.push(run);
      const cap = setTimeout(() => run.ctl.abort(), 90000);
      gemStream(m, body(m, isM), run.ctl.signal, text => {
        if (!winner) { winner = run; clearTimeout(ht); runs.forEach(r => { if (r !== run) r.ctl.abort(); }); }
        if (winner === run && onPartial) try { onPartial(text); } catch (e) { /* display only */ }
      }).then(o => ({ ...o, model: m, busy: busyOf(o, isM) }), err => ({ err, model: m }))
        .then(o => {
          clearTimeout(cap); run.done = true; run.out = o;
          if (winner && winner !== run) return; // lost the race
          if (winner === run || runs.every(r => r.done)) finish();
        });
    };
    start(model, isMain);
    if (hedge && HEDGE_MS[think]) ht = setTimeout(async () => {
      if (winner || settled) return;
      const alt = (await geminiAltModels())[0];
      if (alt && !winner && !settled) start(alt, false);
    }, HEDGE_MS[think]);
  });
  const run = async (model, isMain, hedge) => {
    const o = await attempt(model, isMain, hedge);
    if (o.err) throw new Error(o.err.name === 'AbortError' ? 'Gemini trả lời quá lâu (hơn 90 giây). Thử lại.'
      : 'Không kết nối được tới Gemini (' + o.err.message + '). Thử bật Wi-Fi hoặc tắt VPN/chặn quảng cáo rồi thử lại. Nếu vẫn lỗi: Thêm → Cài đặt → Thử kết nối.');
    return o;
  };
  // Overloaded (503): wait and retry the main model. Out of quota (429) or overloaded: try other Flash models,
  // each has its own free quota. Keep the main model's error to report if nothing works.
  const quota = o => o.res.status === 429 || o.d.error?.status === 'RESOURCE_EXHAUSTED';
  const t0 = Date.now(), main = gemModel();
  aiWarm();
  let out = await run(main, true, true);
  if (out.res.status === 400 && /media/i.test(out.d.error?.message || '') && media) { media = null; out = await run(main, true, false); }
  if (out.res.status === 400 && /thinking/i.test(out.d.error?.message || '') && think !== 'LOW') { think = 'LOW'; out = await run(main, true, false); }
  if (out.busy || out.res.status === 404) { await new Promise(r => setTimeout(r, 1200)); out = await run(main, true, false); }
  const first = out;
  if (out.busy || quota(out) || out.res.status === 404) for (const m of await geminiAltModels()) { out = await run(m, false, false); if (!out.busy && !quota(out)) break; }
  if (!out.res.ok && first.res.status !== out.res.status && (quota(first) || first.busy)) out = first;
  const { res, d } = out;
  if (!res.ok) {
    const msg = d.error?.message || res.statusText, g = msg.split('\n')[0].slice(0, 220);
    throw new Error(quota(out) ? (/limit:\s*0\b/.test(msg) ? 'Model Gemini này không có lượt miễn phí với key của bạn (Google báo limit 0). Bật thanh toán / dùng $20 credit trong AI Studio, hoặc chuyển sang Claude.'
        : 'Hết lượt miễn phí của Gemini (theo phút hoặc theo ngày). Đợi rồi thử lại. Google báo: ' + g)
      : out.busy || res.status === 404 ? 'Gemini đang quá tải (Google báo quá nhiều người dùng). Đợi vài phút rồi bấm lại.'
      : /api key/i.test(msg) || res.status === 401 || res.status === 403 ? 'API key Gemini không đúng.' : 'Lỗi Gemini: ' + g);
  }
  if (d.promptFeedback?.blockReason) throw new Error('Gemini từ chối yêu cầu này.');
  const c = d.candidates?.[0];
  if (c?.finishReason === 'MAX_TOKENS') throw new Error('Câu trả lời bị cắt ngắn, thử lại.');
  const text = (c?.content?.parts || []).filter(p => !p.thought && p.text).map(p => p.text).join('');
  if (!text) throw new Error(c?.finishReason && c.finishReason !== 'STOP' ? 'Gemini từ chối yêu cầu này.' : 'Gemini không trả về kết quả, thử lại.');
  lastAI = { model: d.modelVersion || out.model, ms: Date.now() - t0, backup: out.model !== main };
  return JSON.parse(text);
}
// "gemini-x · 4,2 giây" under a fresh AI answer.
const aiStamp = () => lastAI && aiProv() === 'gemini' ? '<div class="ai-stamp">' + esc(lastAI.model) + (lastAI.backup ? ' (dự phòng)' : '') + ' · ' + (lastAI.ms / 1000).toFixed(1).replace('.', ',') + ' giây</div>' : '';
async function askClaude({ system, content, schema, maxTokens = 4000 }) {
  if (!hasKey()) throw new Error('Chưa có API key Claude. Vào Thêm → Cài đặt để nhập.');
  if (!navigator.onLine) throw new Error('Không có mạng.');
  const res = await aiFetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json', 'x-api-key': getKey(), 'anthropic-version': '2026-10-21',
      'anthropic-dangerous-direct-browser-access': 'true', 'anthropic-beta': 'server-side-fallback-2026-07-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-5-5', max_tokens: maxTokens, fallbacks: 'default', system,
      output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content: content.map(c => c.image ? { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: c.image } } : { type: 'text', text: c.text }) }],
    }),
  }, 'Claude');
  const d = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = d.error?.message || res.statusText;
    throw new Error(res.status === 401 ? 'API key không đúng.' : res.status === 429 ? 'Gọi quá nhanh, thử lại sau ít phút.' : /credit|billing/i.test(msg) ? 'Tài khoản Anthropic hết tiền, hãy nạp thêm.' : 'Lỗi AI: ' + msg);
  }
  if (d.stop_reason === 'refusal') throw new Error('AI từ chối yêu cầu này.');
  if (d.stop_reason === 'max_tokens') throw new Error('Câu trả lời bị cắt ngắn, thử lại.');
  const text = (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  return JSON.parse(text);
}
