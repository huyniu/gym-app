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
let lastAI = null; // { model, ms } of the last successful Gemini call
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
          generationConfig: { responseMimeType: 'application/json', responseJsonSchema: MEAL_SCHEMA, thinkingConfig: thinkCfg(m, 'MINIMAL') } }) });
      const j = await x.json().catch(() => ({}));
      const ok = x.ok && j.candidates?.[0]?.content?.parts?.some(p => p.text && !p.thought);
      res.push({ m, ms: Date.now() - t0, ok, err: ok ? '' : (x.status === 429 ? 'hết lượt miễn phí' : x.status >= 500 ? 'quá tải' : (j.error?.message || 'lỗi ' + x.status).slice(0, 60)) });
    } catch (e) { res.push({ m, ms: Date.now() - t0, ok: false, err: e.message.slice(0, 60) }); }
    onStep(m, res[res.length - 1]);
  }
  return res;
}
async function askGemini({ system, content, schema, think = 'MINIMAL' }) {
  if (!hasKey()) throw new Error('Chưa có API key Gemini. Vào Thêm → Cài đặt để nhập.');
  if (!navigator.onLine) throw new Error('Không có mạng.');
  // generateContent: stable and callable straight from the browser (CORS allowed).
  const call = async (model, main) => {
    const res = await aiFetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': getKey() },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: content.map(c => c.image ? { inlineData: { mimeType: 'image/jpeg', data: c.image } } : { text: c.text }) }],
        // thinkingLevel is for the main model; fallbacks use their own default thinking.
        generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema, ...(main ? { thinkingConfig: thinkCfg(model, think) } : {}) },
      }),
    }, 'Gemini');
    const raw = await res.json().catch(() => ({})), d = Array.isArray(raw) ? raw[0] || {} : raw;
    return { res, d, busy: res.status >= 500 || d.error?.status === 'UNAVAILABLE' || /high demand|overload/i.test(d.error?.message || '') || (!main && res.status === 404) };
  };
  // Overloaded (503): wait and retry the main model. Out of quota (429) or overloaded: try other Flash models,
  // each has its own free quota. Keep the main model's error to report if nothing works.
  const quota = o => o.res.status === 429 || o.d.error?.status === 'RESOURCE_EXHAUSTED';
  const t0 = Date.now(), main = gemModel();
  let out = await call(main, true);
  if (out.res.status === 400 && /thinking/i.test(out.d.error?.message || '') && think !== 'LOW') { think = 'LOW'; out = await call(main, true); }
  if (out.busy || out.res.status === 404) { await new Promise(r => setTimeout(r, 1200)); out = await call(main, true); }
  const first = out;
  if (out.busy || quota(out) || out.res.status === 404) for (const m of await geminiAltModels()) { out = await call(m, false); if (!out.busy && !quota(out)) break; }
  if (!out.res.ok && first.res.status !== out.res.status && (quota(first) || first.busy)) out = first;
  const { res, d } = out;
  if (!res.ok) {
    const msg = d.error?.message || res.statusText, st = d.error?.status || '', g = msg.split('\n')[0].slice(0, 220);
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
  lastAI = { model: d.modelVersion || main, ms: Date.now() - t0 };
  return JSON.parse(text);
}
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
