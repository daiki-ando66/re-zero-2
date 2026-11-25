// =========================================================================
// records.js — 記録（オンライン出玉ランキング［今日／今月／歴代］／ハマり／ウェディング／自己ベスト）
//  ・テスト／無限ST中は一切書き込まない（guard）
//  ・更新で消えない保存：固定キー + スキーマ版 + localStorage + IndexedDB ミラー + 直前の正常コピー + 書き出し/読み込み
//  ・ランキング対象：鬼がかりRUSH 1回の「総獲得払出(個)」（RUSH最終終了時に記録）
// =========================================================================
// ★オンラインランキング（任意）：Firebase Realtime Database の URL を入れると有効になる。空のままなら完全にオフライン動作。
//   例) 'https://xxxxx-default-rtdb.asia-southeast1.firebasedatabase.app'   （末尾の / は付けない）
const ONLINE_DB_URL = 'https://dayan66-default-rtdb.asia-southeast1.firebasedatabase.app';

const Records = (() => {
  const SCHEMA = 1;
  const KEY = 'rezero-oni2:records', KEY_BAK = 'rezero-oni2:records:bak';
  const IDB_NAME = 'rezero-oni2', IDB_STORE = 'kv';
  const TOP_N = 20, RECENT_MAX = 200, WED_MAX = 100, ALL_MIN_DISP = 10000, HAMA_MIN = 1000, NAME_LEN = 10, ONLINE_N = 100;

  let data = blank();
  let guard = () => false;
  let persisted = null;            // navigator.storage.persisted() の結果
  let ui = { root: null, period: 'all' };
  let dangerTimer = null;

  function blank() {
    return { app: 'rezero-oni2', v: SCHEMA, savedAt: 0, lastName: '', nameAsked: false, lastExportAt: 0,
      top: [], hama: [], recent: [], wedding: [], totals: { rushes: 0, disp: 0, maxChain: 0 },
      onlineOn: true, outbox: [] };
  }
  const num = (x, d = 0) => (Number.isFinite(+x) ? Math.round(+x) : d);
  const str = (x, n = 40) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f<>]/g, '').slice(0, n);
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  // ---- 取り込み時の検証＆移行（将来の版アップでも読めるように段階的に移行） ----
  function cleanRush(e) {
    if (!e || typeof e !== 'object') return null;
    const disp = num(e.disp); if (disp <= 0) return null;
    return { id: str(e.id, 24) || uid(), ts: num(e.ts), disp, net: num(e.net), chains: num(e.chains), n6000: num(e.n6000), wed: num(e.wed), spin: num(e.spin), name: str(e.name, NAME_LEN * 2) };
  }
  function cleanHama(e) {
    if (!e || typeof e !== 'object') return null;
    const spins = num(e.spins); if (spins <= 0) return null;
    return { id: str(e.id, 24) || uid(), ts: num(e.ts), spins };
  }
  function cleanWed(e) {
    if (!e || typeof e !== 'object') return null;
    return { id: str(e.id, 24) || uid(), ts: num(e.ts), disp: num(e.disp), chains: num(e.chains) };
  }
  function migrate(o) {
    if (!o || typeof o !== 'object') return blank();
    const out = blank();
    // v0（版なし）→ v1：同名フィールドをそのまま検証して取り込む。将来の v2 以降はここに段階を足す。
    out.v = Math.max(SCHEMA, num(o.v, SCHEMA));
    out.savedAt = num(o.savedAt); out.lastName = str(o.lastName, NAME_LEN * 2); out.nameAsked = !!o.nameAsked || !!out.lastName; out.lastExportAt = num(o.lastExportAt);
    out.top = (Array.isArray(o.top) ? o.top : []).map(cleanRush).filter(Boolean);
    out.recent = (Array.isArray(o.recent) ? o.recent : []).map(cleanRush).filter(Boolean);
    out.hama = (Array.isArray(o.hama) ? o.hama : []).map(cleanHama).filter(Boolean);
    out.wedding = (Array.isArray(o.wedding) ? o.wedding : []).map(cleanWed).filter(Boolean);
    const t = o.totals || {};
    out.totals = { rushes: num(t.rushes), disp: num(t.disp), maxChain: num(t.maxChain) };
    out.onlineOn = o.onlineOn !== false;
    out.outbox = (Array.isArray(o.outbox) ? o.outbox : []).filter(x => x && ['rush', 'hama', 'wed'].includes(x.kind) && x.p && typeof x.p === 'object')
      .map(x => ({ id: str(x.id, 24) || uid(), kind: x.kind, p: x.p, tries: num(x.tries) })).slice(0, 80);
    return normalize(out);
  }
  const byDisp = (a, b) => b.disp - a.disp || a.ts - b.ts;
  function normalize(d) {
    d.top.sort(byDisp); d.top = d.top.slice(0, TOP_N);
    d.hama.sort((a, b) => b.spins - a.spins || a.ts - b.ts); d.hama = d.hama.slice(0, TOP_N);
    d.recent.sort((a, b) => b.ts - a.ts); d.recent = d.recent.slice(0, RECENT_MAX);
    d.wedding.sort((a, b) => a.ts - b.ts); d.wedding = d.wedding.slice(-WED_MAX);
    return d;
  }
  // 2つの記録を「失わない」方向で合体（id が同じものは1つ）
  function merge(a, b) {
    const out = blank();
    const uni = (la, lb) => { const m = new Map(); la.concat(lb).forEach(e => { if (!m.has(e.id)) m.set(e.id, e); else if (e.name && !m.get(e.id).name) m.get(e.id).name = e.name; }); return [...m.values()]; };
    out.top = uni(a.top, b.top); out.recent = uni(a.recent, b.recent); out.hama = uni(a.hama, b.hama); out.wedding = uni(a.wedding, b.wedding);
    const newer = (a.savedAt >= b.savedAt) ? a : b;
    out.lastName = newer.lastName || a.lastName || b.lastName; out.nameAsked = a.nameAsked || b.nameAsked; out.lastExportAt = Math.max(a.lastExportAt, b.lastExportAt);
    out.savedAt = Math.max(a.savedAt, b.savedAt); out.v = Math.max(a.v, b.v);
    out.onlineOn = a.onlineOn && b.onlineOn !== false ? true : (newer.onlineOn);
    out.outbox = uni(a.outbox, b.outbox).slice(0, 80);
    out.totals = { rushes: Math.max(a.totals.rushes, b.totals.rushes), disp: Math.max(a.totals.disp, b.totals.disp), maxChain: Math.max(a.totals.maxChain, b.totals.maxChain) };
    return normalize(out);
  }
  const sig = (d) => d.top.length + ':' + d.hama.length + ':' + d.recent.length + ':' + d.wedding.length + ':' + d.top.map(e => e.id + (e.name || '')).join(',').length;

  // ---- 保存層 ----
  function readLS(key) { try { const s = localStorage.getItem(key); return s ? migrate(JSON.parse(s)) : null; } catch (e) { return null; } }
  function idbOpen() {
    return new Promise((res, rej) => {
      try { const r = indexedDB.open(IDB_NAME, 1); r.onupgradeneeded = () => { try { r.result.createObjectStore(IDB_STORE); } catch (e) {} }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
      catch (e) { rej(e); }
    });
  }
  function idbPut(s) {
    return idbOpen().then(db => new Promise((res) => {
      try { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(s, 'records'); tx.oncomplete = () => { db.close(); res(); }; tx.onerror = () => { db.close(); res(); }; }
      catch (e) { try { db.close(); } catch (e2) {} res(); }
    })).catch(() => {});
  }
  function idbGet() {
    return idbOpen().then(db => new Promise((res) => {
      try { const rq = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get('records'); rq.onsuccess = () => { db.close(); res(rq.result || null); }; rq.onerror = () => { db.close(); res(null); }; }
      catch (e) { try { db.close(); } catch (e2) {} res(null); }
    })).catch(() => null);
  }
  function requestPersist() {
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist().then(ok => { persisted = !!ok; render(); }).catch(() => {});
      else if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(ok => { persisted = !!ok; }).catch(() => {});
    } catch (e) {}
  }
  function save() {
    data.savedAt = Date.now(); data.v = Math.max(SCHEMA, data.v);
    const s = JSON.stringify(data);
    try {
      const prev = localStorage.getItem(KEY);
      if (prev) { try { JSON.parse(prev); localStorage.setItem(KEY_BAK, prev); } catch (e) {} }   // 直前の「正常な」中身を控えに
      localStorage.setItem(KEY, s);
    } catch (e) {}
    idbPut(s);
    requestPersist();
    render();
  }

  // 起動時：localStorage → 控え → （非同期）IndexedDB と合体
  data = readLS(KEY) || readLS(KEY_BAK) || blank();
  data.outbox.forEach(x => { x.hold = false; });   // 前回コメント待ちのまま閉じられた分は、次の起動で送る
  idbGet().then(raw => {
    if (!raw) { if (data.top.length || data.hama.length || data.recent.length || data.wedding.length) idbPut(JSON.stringify(data)); return; }
    let o = null; try { o = migrate(JSON.parse(raw)); } catch (e) {}
    if (!o) return;
    const before = sig(data), m = merge(data, o);
    if (sig(m) !== before) { data = m; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} render(); }
  });
  try { if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then(p => { persisted = !!p; }); } catch (e) {}


  // ---- オンライン送信（Firebase Realtime Database の REST API。SDK不要・失敗しても台の動作には影響しない） ----
  const onlineEnabled = () => /^https:\/\/[A-Za-z0-9.-]+\.(firebaseio\.com|firebasedatabase\.app)$/.test(ONLINE_DB_URL);
  let flushing = false;
  let boards = {};                   // path → { t, rows, err }
  function net(path, opt) {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 9000);
    return fetch(ONLINE_DB_URL + path, Object.assign({ signal: ac.signal, cache: 'no-store' }, opt)).finally(() => clearTimeout(tm));
  }
  const cleanName = (n) => Array.from(str(n, 40).trim()).slice(0, NAME_LEN).join('') || '名無し';
  // 日付の区切りは日本時間(JST)の0時。端末の時計のタイムゾーンに左右されない
  function jstKeys(t) { const d = new Date((t || Date.now()) + 9 * 3600e3), y = d.getUTCFullYear(), m = String(d.getUTCMonth() + 1).padStart(2, '0'), dd = String(d.getUTCDate()).padStart(2, '0'); return { d: `${y}${m}${dd}`, m: `${y}${m}`, label: `${y}/${m}/${dd}`, mlabel: `${y}/${m}` }; }
  function enqueue(kind, p, opt) {
    if (!onlineEnabled() || !data.onlineOn) return;
    data.outbox.push({ id: (opt && opt.id) || uid(), kind, p, tries: 0, hold: !!(opt && opt.hold) }); data.outbox = data.outbox.slice(-80);
    save(); flush();
  }
  function rushPatchBody(item) {
    const p = item.p, k = jstKeys(p.ts), v = { name: p.name, disp: p.disp, chains: p.chains, n6000: p.n6000 || 0, wed: p.wed || 0, ts: p.ts };
    const b = {}; b[`rush/day/${k.d}/${item.id}`] = v; b[`rush/month/${k.m}/${item.id}`] = v;
    if (p.disp >= ALL_MIN_DISP) b[`rush/all/${item.id}`] = v;
    return b;
  }
  async function flush() {
    if (flushing || !onlineEnabled() || !data.outbox.length) return;
    flushing = true;
    try {
      let stop = false;
      for (let round = 0; round < 6 && !stop && data.outbox.some(x => !x.hold); round++) {   // 送信中に増えた分も続けて送る
        for (const item of data.outbox.slice()) {
          if (item.hold) continue;                                       // コメント入力待ち
          let res;
          try {
            res = item.kind === 'rush'
              ? await net('/.json', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rushPatchBody(item)) })
              : await net(`/ranking/${item.kind}.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item.p) });
          } catch (e) { stop = true; break; }                            // 通信不可：次の機会に再送
          if (res.ok || (res.status >= 400 && res.status < 500)) {       // 成功、またはルールで拒否（再送しても無駄）→ 送信待ちから外す
            data.outbox = data.outbox.filter(x => x.id !== item.id); boards = {};
            save();
          } else { stop = true; break; }                                 // 5xx：後で再送
        }
      }
    } finally { flushing = false; }
  }
  // 盤の定義：kind = day | month | all | hama | wed
  function boardSpec(kind) {
    const k = jstKeys();
    if (kind === 'day') return { path: `/rush/day/${k.d}`, field: 'disp', title: `${k.label}（日本時間）` };
    if (kind === 'month') return { path: `/rush/month/${k.m}`, field: 'disp', title: `${k.mlabel}月` };
    if (kind === 'all') return { path: '/rush/all', field: 'disp', title: `歴代（${ALL_MIN_DISP.toLocaleString()}個以上）` };
    if (kind === 'hama') return { path: '/ranking/hama', field: 'spins', title: '' };
    return { path: '/ranking/wed', field: 'ts', title: '' };
  }
  async function loadBoard(kind, force) {
    const sp = boardSpec(kind), b = boards[sp.path];
    if (!force && b && Date.now() - b.t < 30000) return b;
    try {
      const res = await net(`${sp.path}.json?orderBy=%22${sp.field}%22&limitToLast=${ONLINE_N}`);
      if (!res.ok) throw new Error('http ' + res.status);
      const o = await res.json() || {};
      const rows = Object.entries(o).filter(([, x]) => x && typeof x === 'object').map(([k, x]) => Object.assign({ _k: k }, x))
        .sort((a, c) => (num(c[sp.field]) - num(a[sp.field])) || (num(a.ts) - num(c.ts))).slice(0, ONLINE_N);
      boards[sp.path] = { t: Date.now(), rows, err: '' };
    } catch (e) { boards[sp.path] = { t: Date.now() - 20000, rows: (b && b.rows) || [], err: '取得できませんでした（通信を確認してください）', fail: true }; }
    return boards[sp.path];
  }
  // 結果画面用：この出玉が「今日」「歴代」で何位か（上位100位まで）。0=圏外、-1=不明（通信不可）、null=対象外
  async function fetchRanks(disp, id) {
    const one = async (kind) => {
      const b = await loadBoard(kind, true);
      if (b.fail) return -1;
      const rows = b.rows.filter(r => r._k !== id);
      const cnt = rows.filter(r => num(r.disp) >= disp).length;
      return cnt >= ONLINE_N ? 0 : cnt + 1;
    };
    if (!onlineEnabled() || !data.onlineOn || blocked()) return null;
    const [day, all] = await Promise.all([one('day'), disp >= ALL_MIN_DISP ? one('all') : Promise.resolve(0)]);
    return { day, all };
  }
  window.addEventListener('online', () => flush());
  setTimeout(() => flush(), 3500);

  // ---- 記録 API ----
  const blocked = () => { try { return !!guard(); } catch (e) { return true; } };
  const startOfDay = (t = Date.now()) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const startOfWeek = (t = Date.now()) => { const d = new Date(startOfDay(t)); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return d.getTime(); };   // 月曜始まり
  const rankOf = (list, id) => { const i = list.findIndex(e => e.id === id); return i < 0 ? 0 : i + 1; };

  // RUSH最終終了時：{disp, net, chains, n6000, wed, spin} → {selfRank, id, needsComment}
  //   ・端末内には「自己ベスト」用に残す。オンラインへは出玉の大小を問わず全RUSHを送る（今日／今月、1万個以上は歴代にも）
    function commitRush(info) {
    if (blocked() || !info) return null;
    const e = cleanRush({ id: uid(), ts: Date.now(), disp: info.disp, net: info.net, chains: info.chains, n6000: info.n6000, wed: info.wed, spin: info.spin, name: data.lastName });
    if (!e) return null;
    data.recent.unshift(Object.assign({}, e)); data.recent = data.recent.slice(0, RECENT_MAX);
    data.top.push(e); data.top.sort(byDisp); data.top = data.top.slice(0, TOP_N);
    data.totals.rushes++; data.totals.disp += e.disp; data.totals.maxChain = Math.max(data.totals.maxChain, e.chains);
    const selfRank = rankOf(data.top, e.id);
    save();
    enqueue('rush', { name: cleanName(data.lastName), disp: e.disp, chains: Math.max(1, e.chains), n6000: e.n6000, wed: e.wed, ts: e.ts }, { id: e.id });
    return { selfRank, id: e.id };
  }
  // ハマり：初当たり到達時の通常回転数（1,000回転以上だけ記録）
  function noteHamari(spins) {
    if (blocked()) return 0;
    spins = num(spins); if (spins < HAMA_MIN) return 0;
    const e = { id: uid(), ts: Date.now(), spins };
    data.hama.push(e); normalize(data);
    const rank = rankOf(data.hama, e.id);
    save();
    if (rank > 0) enqueue('hama', { name: cleanName(data.lastName), spins: e.spins, ts: e.ts });
    return rank;
  }
  function noteWedding(info) {
    if (blocked()) return false;
    data.wedding.push({ id: uid(), ts: Date.now(), disp: num(info && info.disp), chains: num(info && info.chains) });
    normalize(data); save();
    enqueue('wed', { name: cleanName(data.lastName), ts: Date.now(), disp: Math.max(0, num(info && info.disp)), chains: Math.max(1, num(info && info.chains)) });
    return true;
  }
  function setName(name) {
    data.lastName = Array.from(str(name, 40).trim()).slice(0, NAME_LEN).join(''); data.nameAsked = true; save();
  }
  // ---- 入力モーダル（初回の名前／2万個超えの一言） ----
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function openModal(o, done) {
    const m = $('nameModal'); if (!m) { if (done) done(); return; }
    $('nameModalRank').textContent = o.title; $('nameModalDisp').textContent = o.sub; $('nameModalLabel').textContent = o.label;
    const inp = $('nameInput'); inp.value = o.value || ''; inp.maxLength = o.max; inp.placeholder = o.ph;
    $('nameSkip').textContent = o.skip; $('nameOk').textContent = o.ok;
    m.classList.remove('hidden');
    const finish = (val) => { m.classList.add('hidden'); $('nameOk').onclick = $('nameSkip').onclick = inp.onkeydown = null; o.onDone(val); if (done) done(); };
    $('nameOk').onclick = () => finish(inp.value);
    $('nameSkip').onclick = () => finish('');
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); finish(inp.value); } };
    setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 60);
  }
  // 初めてサイトに入ったとき：名前を一度だけ
  function askNameOnce() {
    if (data.nameAsked || !$('nameModal')) return;
    openModal({ title: 'ようこそ!!', sub: 'ランキング用のお名前', label: '10文字まで（あとで「記録」タブから変更できます）', value: data.lastName, max: NAME_LEN, ph: '名無し', skip: '名無しのまま', ok: '決定',
      onDone: (val) => setName(val) });
  }
  setTimeout(() => { if (document.readyState !== 'loading') askNameOnce(); else document.addEventListener('DOMContentLoaded', askNameOnce); }, 700);

  // ---- 書き出し／読み込み ----
  const exportText = () => JSON.stringify(Object.assign({}, data, { v: SCHEMA, exportedAt: Date.now(), outbox: [] }), null, 1);
  function markExported() { data.lastExportAt = Date.now(); save(); }
  function importText(text) {
    let o; try { o = JSON.parse(text); } catch (e) { return { ok: false, msg: 'ファイルの形式が正しくありません' }; }
    if (!o || typeof o !== 'object' || (o.app && o.app !== 'rezero-oni2')) return { ok: false, msg: 'この台の記録ファイルではありません' };
    const inc = migrate(o); inc.outbox = [];
    if (!inc.top.length && !inc.hama.length && !inc.recent.length && !inc.wedding.length) return { ok: false, msg: '読み込める記録がありませんでした' };
    const before = sig(data);
    data = merge(data, inc); data.savedAt = Date.now(); save();
    return { ok: true, msg: sig(data) === before ? '読み込みました（新しい記録はありませんでした）' : '読み込みました（今の記録と合体しました）' };
  }

  // ---- 表示 ----
  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (t) => { const d = new Date(t); return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtShort = (t) => { const d = new Date(t); return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  function injectCss() {
    if (document.getElementById('records-css')) return;
    const st = document.createElement('style'); st.id = 'records-css';
    st.textContent = `
      .rec-sec{border:1px solid rgba(180,83,9,.55);background:rgba(26,10,7,.92);border-radius:16px;padding:10px 10px 8px}
      .rec-h{font-weight:900;font-size:12px;color:#fcd34d;margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;gap:6px}
      .rec-row{display:flex;align-items:center;gap:8px;padding:5px 4px;border-bottom:1px solid rgba(120,53,15,.35);font-size:11px}
      .rec-row:last-child{border-bottom:0}
      .rec-rank{width:26px;height:22px;flex:none;border-radius:7px;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:11px;background:#1f0f0a;color:#d6b98a;border:1px solid rgba(180,83,9,.5)}
      .rec-rank.r1{background:linear-gradient(135deg,#fff7c2,#f5c431 55%,#a8620a);color:#2b1300;border-color:#fde68a}
      .rec-rank.r2{background:linear-gradient(135deg,#f5f5f4,#a8a29e 60%,#57534e);color:#1c1917;border-color:#e7e5e4}
      .rec-rank.r3{background:linear-gradient(135deg,#fed7aa,#c2773a 60%,#7c3a12);color:#220e02;border-color:#fdba74}
      .rec-main{flex:1;min-width:0}
      .rec-val{font-weight:900;color:#fff;font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}
      .rec-sub{font-size:10px;color:#a8a29e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rec-name{font-weight:900;color:#fde68a;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .rec-empty{padding:12px 4px;text-align:center;color:rgba(253,230,138,.45);font-size:11px}
      .rec-pt{flex:1;padding:6px 0;border-radius:10px;font-weight:900;font-size:11px;border:1px solid rgba(120,53,15,.7);background:#1e0d08;color:rgba(253,230,138,.7)}
      .rec-pt.on{background:linear-gradient(90deg,#9f1239,#b45309);color:#fff;border-color:rgba(254,240,138,.6)}
      .rec-btn{padding:9px 6px;border-radius:12px;font-weight:900;font-size:11px;border:1px solid rgba(251,191,36,.55);background:#2a1409;color:#fde68a;flex:1;min-width:0}
      .rec-btn:active{transform:scale(.97)}
      .rec-btn.danger{border-color:rgba(244,63,94,.6);color:#fda4af;background:#2a0a10}
      .rec-note{font-size:10px;line-height:1.55;color:#a8a29e}
      .rec-ta{width:100%;min-height:64px;border-radius:10px;background:#0d0506;border:1px solid rgba(120,53,15,.7);color:#e7e5e4;font-size:10px;padding:6px}
      /* ウェディング記録：コードで描いた金枠（画像は使わない） */
      .rec-wed{position:relative;padding:3px;border-radius:18px;background:linear-gradient(135deg,#fff7c2,#f5c431 22%,#a8620a 48%,#f5c431 72%,#fff7c2);box-shadow:0 0 20px rgba(250,204,21,.35)}
      .rec-wed::after{content:"";position:absolute;inset:0;border-radius:18px;pointer-events:none;background:linear-gradient(110deg,transparent 38%,rgba(255,255,255,.6) 50%,transparent 62%);background-size:260% 100%;animation:recSheen 3.4s linear infinite;mix-blend-mode:overlay}
      @keyframes recSheen{from{background-position:130% 0}to{background-position:-130% 0}}
      .rec-wed-in{position:relative;border-radius:15px;background:radial-gradient(ellipse at 50% 0%,#46230a 0%,#170805 65%,#0d0405 100%);padding:12px 12px 10px;text-align:center;border:1px solid rgba(255,247,194,.5)}
      .rec-wed-in .orn{position:absolute;top:4px;font-size:12px;color:#fde68a;opacity:.85}
      .rec-wed-title{font-family:'Shippori Mincho',serif;font-weight:800;font-size:15px;letter-spacing:.18em;background:linear-gradient(180deg,#fff7c2,#f5c431 55%,#c2810a);-webkit-background-clip:text;background-clip:text;color:transparent}
      .rec-wed.lock{filter:grayscale(.85) brightness(.6);box-shadow:none}
      .rec-wed.lock::after{display:none}
    `;
    document.head.appendChild(st);
  }

  function selfRows() {
    const list = data.top.slice(0, 5);
    if (!list.length) return '<div class="rec-empty">まだ記録がありません</div>';
    return list.map((e, i) => {
      const tags = [`${e.chains}連`]; if (e.n6000) tags.push(`6000×${e.n6000}`); if (e.wed) tags.push(`💍×${e.wed}`);
      return `<div class="rec-row"><div class="rec-rank${i < 3 ? ' r' + (i + 1) : ''}">${i + 1}</div>
        <div class="rec-main"><div class="rec-sub">${tags.join(' ・ ')} ・ ${fmtShort(e.ts)}</div></div>
        <div class="rec-val">${e.disp.toLocaleString()}<span style="font-size:10px;color:#fcd34d"> 個</span></div></div>`;
    }).join('');
  }
  function hamaRows() {
    if (!data.hama.length) return `<div class="rec-empty">${HAMA_MIN.toLocaleString()}回転以上のハマりが記録されます</div>`;
    return data.hama.map((e, i) => `<div class="rec-row"><div class="rec-rank${i < 3 ? ' r' + (i + 1) : ''}">${i + 1}</div>
      <div class="rec-main"><div class="rec-sub">${fmtDate(e.ts)} に初当たり</div></div>
      <div class="rec-val">${e.spins.toLocaleString()}<span style="font-size:10px;color:#fcd34d"> 回転</span></div></div>`).join('');
  }
  function weddingCard() {
    const w = data.wedding;
    if (!w.length) return `<div class="rec-wed lock"><div class="rec-wed-in"><div class="rec-wed-title">WEDDING 12,000</div>
      <div class="rec-sub" style="margin-top:6px;white-space:normal">まだ見ぬ祝福… 引き当てるとここに日付が刻まれます</div></div></div>`;
    const first = w[0], last = w[w.length - 1];
    const list = w.slice(-5).reverse().map(e => `<div class="rec-sub" style="color:#fde68a">${fmtDate(e.ts)}</div>`).join('');
    return `<div class="rec-wed"><div class="rec-wed-in"><span class="orn" style="left:8px">❖</span><span class="orn" style="right:8px">❖</span>
      <div class="rec-wed-title">WEDDING 12,000</div>
      <div style="color:#fff;font-weight:900;font-size:22px;margin:4px 0 2px;font-variant-numeric:tabular-nums">${w.length}<span style="font-size:11px;color:#fcd34d"> 回 達成</span></div>
      <div class="rec-sub" style="color:#fcd34d;white-space:normal">初めての祝福　${fmtDate(first.ts)}</div>
      ${w.length > 1 ? `<div style="margin-top:6px;border-top:1px solid rgba(253,224,71,.25);padding-top:5px">${list}</div>` : ''}
      ${w.length > 1 ? `<div class="rec-sub" style="margin-top:3px">最新 ${fmtDate(last.ts)}</div>` : ''}</div></div>`;
  }
  function onlineSection() {
    if (!onlineEnabled()) return '';
    const k = ui.board || 'day', sp = boardSpec(k), b = boards[sp.path];
    const pt = (id, l) => `<button class="rec-pt${k === id ? ' on' : ''}" data-rec-board="${id}" style="padding:6px 0">${l}</button>`;
    const isRush = k === 'day' || k === 'month' || k === 'all';
    let rows;
    if (!b) rows = '<div class="rec-empty">読み込み中…</div>';
    else if (!b.rows.length) rows = `<div class="rec-empty">${b.err || 'まだ記録がありません'}</div>`;
    else rows = b.rows.map((e, i) => {
      const nm = escapeHtml(str(e.name, NAME_LEN * 2) || '名無し');
      const val = isRush ? `${num(e.disp).toLocaleString()}<span style="font-size:10px;color:#fcd34d"> 個</span>` : k === 'hama' ? `${num(e.spins).toLocaleString()}<span style="font-size:10px;color:#fcd34d"> 回転</span>` : `<span style="font-size:11px;color:#fde68a">💍</span>`;
      const tags = isRush ? [`${num(e.chains)}連`].concat(num(e.n6000) ? [`6000×${num(e.n6000)}`] : [], num(e.wed) ? [`💍×${num(e.wed)}`] : []).join(' ・ ') + ' ・ ' + fmtShort(num(e.ts)) : k === 'wed' ? fmtDate(num(e.ts)) : fmtShort(num(e.ts));
      return `<div class="rec-row"><div class="rec-rank${i < 3 ? ' r' + (i + 1) : ''}">${i + 1}</div><div class="rec-main"><div class="rec-name">${nm}</div><div class="rec-sub">${tags}</div></div><div class="rec-val">${val}</div></div>`;
    }).join('');
    const head = isRush ? `<div class="rec-note" style="margin:0 0 4px;color:#fde68a">${sp.title} ・ RUSH1回の総獲得払出 上位${ONLINE_N}</div>` : `<div class="rec-note" style="margin:0 0 4px;color:#fde68a">${k === 'hama' ? 'ハマり（初当たりまでの通常回転）' : 'ウェディング達成者（新しい順）'} 上位${ONLINE_N}</div>`;
    return `<div class="rec-sec"><div class="rec-h"><span>🌐 オンラインランキング</span><button class="rec-pt" style="flex:none;padding:3px 10px" data-rec-act="reload">更新</button></div>
      <div style="display:flex;gap:5px;margin-bottom:6px">${pt('day', '今日')}${pt('month', '今月')}${pt('all', '歴代')}${pt('hama', 'ハマり')}${pt('wed', '💍')}</div>${head}${rows}
      <div class="rec-note" style="margin-top:6px">全てのRUSH結果が自動で送られます（歴代は${ALL_MIN_DISP.toLocaleString()}個以上のみ／今日・今月は日本時間0時で切替）。ハマりは${HAMA_MIN.toLocaleString()}回転以上、ウェディングも送信。テスト・無限STは送信されません。送信待ち ${data.outbox.length}件<br>
      <label style="display:flex;align-items:center;gap:6px;margin-top:4px"><input type="checkbox" id="recOnlineOn" ${data.onlineOn ? 'checked' : ''}> オンラインに送信する</label></div></div>`;
  }
  function render() {
    const root = ui.root; if (!root || !root.isConnected) return;
    if (root.contains(document.activeElement) && (document.activeElement.tagName === 'TEXTAREA' || document.activeElement.id === 'recName')) return;   // 貼り付け入力中は再描画しない
    injectCss();
    const prot = persisted === true ? '🔒 端末の自動削除から保護：ON' : persisted === false ? '⚠️ 端末の自動削除から保護：未確認（書き出しでバックアップ推奨）' : '保護状態：確認中';
    root.innerHTML = `
      <div class="rec-sec"><div class="rec-h"><span>👤 プレイヤー名</span></div>
        <div style="display:flex;gap:6px"><input id="recName" type="text" maxlength="${NAME_LEN}" autocomplete="off" value="${escapeHtml(data.lastName)}" placeholder="名無し" style="flex:1;min-width:0;border-radius:10px;background:#0d0506;border:1px solid rgba(120,53,15,.7);color:#fde68a;font-weight:900;font-size:13px;padding:7px 10px"><button class="rec-btn" style="flex:none;padding:7px 14px" data-rec-act="name">変更</button></div>
        <div class="rec-note" style="margin-top:4px">ランキングに載る名前です（${NAME_LEN}文字まで）。空欄は「名無し」。</div></div>
      ${onlineSection()}
      <div class="rec-sec"><div class="rec-h"><span>📒 自己ベスト（この端末・上位5）</span></div>${selfRows()}</div>
      <div class="rec-sec"><div class="rec-h"><span>🕳️ ハマりランキング（初当たりまでの通常回転）</span></div>${hamaRows()}</div>
      ${weddingCard()}
      <div class="rec-sec"><div class="rec-h"><span>💾 記録の保存・バックアップ</span></div>
        <div class="rec-note">累計RUSH ${data.totals.rushes.toLocaleString()}回 ・ 最大連チャン ${data.totals.maxChain}連 ・ 最終書き出し ${data.lastExportAt ? fmtDate(data.lastExportAt) : 'なし'}<br>${prot}<br>
        記録はこの端末のブラウザ内（localStorage＋IndexedDB）に保存され、ファイル更新では消えません。iPhoneのSafariは長期間開かないと自動削除されることがあるため、大きな記録の後は書き出しを。</div>
        <div style="display:flex;gap:6px;margin:8px 0 6px"><button class="rec-btn" data-rec-act="export">📤 ファイルに書き出し</button><button class="rec-btn" data-rec-act="copy">📋 コピー</button></div>
        <div style="display:flex;gap:6px;margin-bottom:6px"><button class="rec-btn" data-rec-act="import">📥 ファイルから読み込み</button></div>
        <textarea class="rec-ta" id="recPaste" placeholder="コピーした記録をここに貼り付けて「貼り付けを読み込み」"></textarea>
        <div style="display:flex;gap:6px;margin-top:6px"><button class="rec-btn" data-rec-act="paste">📥 貼り付けを読み込み</button><button class="rec-btn danger" data-rec-act="wipe" id="recWipe">🗑️ 全記録を削除</button></div>
        <div class="rec-note" id="recMsg" style="margin-top:6px;color:#fde68a"></div>
        <input type="file" id="recFile" accept="application/json,.json" style="display:none">
      </div>`;
    root.querySelectorAll('[data-rec-board]').forEach(b => b.addEventListener('click', () => { ui.board = b.dataset.recBoard; render(); loadBoard(ui.board).then(render); }));
    const ck = $('recOnlineOn'); if (ck) ck.addEventListener('change', () => { data.onlineOn = ck.checked; save(); });
    root.querySelectorAll('[data-rec-act]').forEach(b => b.addEventListener('click', () => act(b.dataset.recAct)));
    const f = $('recFile'); if (f) f.addEventListener('change', () => {
      const file = f.files && f.files[0]; if (!file) return;
      const r = new FileReader(); r.onload = () => msg(importText(String(r.result || '')).msg); r.onerror = () => msg('読み込みに失敗しました'); r.readAsText(file);
    });
  }
  function msg(t) { const m = $('recMsg'); if (m) m.textContent = t; }
  function act(a) {
    if (a === 'name') { const i = $('recName'); if (i) { setName(i.value); setTimeout(() => msg('名前を変更しました'), 30); } return; }
    if (a === 'reload') { boards = {}; render(); flush(); loadBoard(ui.board || 'day', true).then(render); return; }
    if (a === 'export') {
      try {
        const blob = new Blob([exportText()], { type: 'application/json' });
        const url = URL.createObjectURL(blob), el = document.createElement('a'), d = new Date();
        el.href = url; el.download = `rezero-oni2-records-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.json`;
        document.body.appendChild(el); el.click(); el.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
        markExported(); setTimeout(() => msg('書き出しました'), 30);
      } catch (e) { msg('書き出しに失敗しました。「コピー」を使ってください'); }
    } else if (a === 'copy') {
      const t = exportText();
      const ok = () => { markExported(); setTimeout(() => msg('コピーしました。メモ等に貼って保管してください'), 30); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, () => msg('コピーできませんでした'));
      else { const ta = $('recPaste'); if (ta) { ta.value = t; ta.select(); try { document.execCommand('copy'); ok(); } catch (e) { msg('下の欄の文字を手動でコピーしてください'); } } }
    } else if (a === 'import') { const f = $('recFile'); if (f) { f.value = ''; f.click(); } }
    else if (a === 'paste') { const ta = $('recPaste'); if (ta && ta.value.trim()) { const r = importText(ta.value); ta.value = ''; render(); setTimeout(() => msg(r.msg), 30); } else msg('貼り付ける内容がありません'); }
    else if (a === 'wipe') {
      const b = $('recWipe'); if (!b) return;
      if (b.dataset.armed === '1') {
        clearTimeout(dangerTimer); data = blank(); save(); setTimeout(() => msg('全記録を削除しました'), 30);
      } else { b.dataset.armed = '1'; b.textContent = '⚠️ もう一度押すと全削除'; dangerTimer = setTimeout(() => { b.dataset.armed = ''; b.textContent = '🗑️ 全記録を削除'; }, 4000); }
    }
  }
  function mount(root) { ui.root = root; render(); if (onlineEnabled()) { flush(); loadBoard(ui.board || 'day').then(render); } }

  return { setGuard: (fn) => { guard = fn; }, commitRush, fetchRanks, noteHamari, noteWedding, setName, askNameOnce, mount, render,
    _data: () => data, _import: importText, _export: exportText };
})();
