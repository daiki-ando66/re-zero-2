// =========================================================================
// game.js (v7.1) : 筐体デザイン・ロゴ役物落下・固定枠ステータス完全統合版
// =========================================================================

const SPEC = {
  NORMAL_PROB: 1 / 349.9,
  H_3000_RUSH: 0.10,
  H_1500_RUSH: 0.45,
  H_1500_NORM: 0.45,
  RUSH_ENTRY: 0.55,

  ST_TOTAL: 144,
  ST_RESERVE: 4,
  ST_DENSA: 140,
  ST_PROB: 1 / 99.9,
  HORYUREN_NOTICE_RATE: 0.48,

  R_6000: 0.25,
  R_1500: 0.55,
  R_300: 0.06,
  R_RESTART: 0.14,

  DISP_6000: 6000, NET_6000: 5600,
  DISP_3000: 3000, NET_3000: 2800,
  DISP_1500: 1500, NET_1500: 1400,
  DISP_300: 300,   NET_300: 280
};

function drawRushBonusType() {
  const r = Math.random();
  if (r < SPEC.R_6000) return 'BONUS_6000';
  if (r < SPEC.R_6000 + SPEC.R_1500) return 'BONUS_1500';
  if (r < SPEC.R_6000 + SPEC.R_1500 + SPEC.R_300) return 'BONUS_300';
  return 'RESTART';
}

function drawReserve4Slots() {
  const slots = [];
  for (let i = 1; i <= SPEC.ST_RESERVE; i++) {
    if (Math.random() < SPEC.ST_PROB) {
      slots.push({ hit: true, hitIndex: i, bonusType: drawRushBonusType(), isReserve: true, remSakibare: false, remPat: 'NORMAL' });
      break;
    } else {
      slots.push({ hit: false, hitIndex: i, bonusType: null, isReserve: true, remSakibare: false, remPat: 'NORMAL' });
    }
  }
  return slots;
}

function drawReserve4() {
  for (let i = 1; i <= SPEC.ST_RESERVE; i++) {
    if (Math.random() < SPEC.ST_PROB) return { hit: true, hitIndex: i, bonusType: drawRushBonusType() };
  }
  return { hit: false, hitIndex: 0, bonusType: null };
}

// =========================================================================
// ゲーム状態＆DOM参照
// =========================================================================
let rotRate = 16.5;
let exchangeRate = 4.0;
let infiniteRushMode = false;

const state = {
  phase: 'NORMAL',
  activeScene: 'normal',
  custSakibare: true,
  custOchiburu: true,
  custPremier: false,
  rushMode: 'onigakari',

  rushCustTrust: false,
  rushCustIwakan: true,
  rushCustNoNotice: false,

  currentSpin: 0,
  totalNormalSpins: 0,
  firstHits: 0,
  rushHits: 0,
  sakibareTotal: 0,
  sakibareWins: 0,
  totalInvestYen: 0,
  balls: 0,
  unspentFrac: 0,

  pendingReach: null,
  pendingRushHit: null,
  pendingResultRevival: false,
  hasVStock: false,
  hasVStockRed: false,
  reserveQueue: [],
  stLookaheadQueue: [],
  remSakibareActive: false,
  stRemaining: 0,
  rushChains: 0,
  rushDisp: 0,
  rushNet: 0,
  rush6000Count: 0,
  rushWeddingCount: 0,
  rushHoryurenCount: 0,
  rushRestartCount: 0,
  rushIwakanNotes: [],
  rushStartSpin: 0,

  sessionGraphPoints: [0],
  sessionMaxChains: 0,
  sessionMaxOneShot: 0,
  _spinsSinceGraphSample: 0,

  autoMode: null,
  autoTimer: null,
  history: []
};

const resultModal = document.getElementById('resultModal');
const settingsModal = document.getElementById('settingsModal');
const normalTitle = document.getElementById('normalTitle');
const normalSub = document.getElementById('normalSub');
const reachYokokuBadge = document.getElementById('reachYokokuBadge');
const reachStepBadge = document.getElementById('reachStepBadge');
const reachSpCategory = document.getElementById('reachSpCategory');
const reachTitle = document.getElementById('reachTitle');
const reachSub = document.getElementById('reachSub');
const pushHintText = document.getElementById('pushHintText');
const rushModeBar = document.getElementById('rushModeBar');
const rushStatusBar = document.getElementById('rushStatusBar');
const normalControls = document.getElementById('normalControls');
const rushControls = document.getElementById('rushControls');
const busyNotice = document.getElementById('busyNotice');

['pointerdown', 'keydown'].forEach(ev => {
  window.addEventListener(ev, () => BgmEngine.unlock(), { once: true });
});

// バックグラウンド移行時の発熱防止：裏画面へ行ったらオート＆BGMを自動停止
document.addEventListener('visibilitychange', () => {
  document.documentElement.classList.toggle('is-hidden', document.hidden);
  if (document.hidden) {
    stopAuto();
    stopHandleHold(false);
    BgmEngine.cut();
  } else {
    if (state.phase === 'NORMAL') BgmEngine.resume('normal');
    else if (state.phase === 'RUSH') BgmEngine.resume(state.rushMode);
  }
});

// =========================================================================
// 直近セッション リアルタイム差玉スランプグラフ（0発スタート・自動間引き）
// =========================================================================
const LiveSlump = (() => {
  let canvas = null, diffEl = null, peakEl = null, bestEl = null;
  let drawQueued = false, lastDrawMs = 0;

  function mount() {
    if (document.getElementById('liveSlumpCard')) return;
    const histBody = document.getElementById('historyTableBody');
    const histSection = histBody ? (histBody.closest('section') || histBody.closest('div.rounded-2xl') || histBody.closest('div')) : null;
    const playWrap = document.getElementById('playModeContainer');
    const hostParent = (histSection && histSection.parentElement) || playWrap;
    if (!hostParent) return;

    const card = document.createElement('div');
    card.id = 'liveSlumpCard';
    card.className = 'rounded-2xl bg-[#160806]/90 border border-amber-500/35 p-2.5 shadow-lg';
    card.innerHTML = `
      <div class="flex items-center justify-between gap-2 mb-1.5">
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-black text-amber-300 tracking-wider">📈 リアルタイム差玉グラフ</span>
          <span id="liveSlumpDiff" class="text-[11px] font-black text-white num-fixed">0発</span>
        </div>
        <span id="liveSlumpBest" class="text-[10px] font-bold text-amber-200/80 num-fixed">最大 0連 / 0個</span>
      </div>
      <div class="relative w-full h-[112px] sm:h-[126px] rounded-xl bg-black/55 border border-amber-900/50 overflow-hidden">
        <canvas id="liveSlumpCanvas" class="w-full h-full block"></canvas>
      </div>
      <div class="flex items-center justify-between mt-1 text-[10px] text-slate-400">
        <span>0回転・0発スタート（直近セッション）</span>
        <span id="liveSlumpPeak" class="num-fixed">最高: 0 / 最低: 0</span>
      </div>
    `;
    if (histSection && histSection.parentElement === hostParent) hostParent.insertBefore(card, histSection);
    else hostParent.appendChild(card);

    canvas = document.getElementById('liveSlumpCanvas');
    diffEl = document.getElementById('liveSlumpDiff');
    peakEl = document.getElementById('liveSlumpPeak');
    bestEl = document.getElementById('liveSlumpBest');
  }

  function currentDiffBalls() {
    return Math.round(state.balls - (state.totalInvestYen / 500) * 125);
  }

  function record(force = false) {
    if (!force) {
      state._spinsSinceGraphSample++;
      if (state._spinsSinceGraphSample < 12) return;
      state._spinsSinceGraphSample = 0;
    } else {
      state._spinsSinceGraphSample = 0;
    }
    const v = currentDiffBalls();
    const pts = state.sessionGraphPoints;
    if (pts.length === 0 || pts[pts.length - 1] !== v || force) {
      pts.push(v);
      if (pts.length > 400) {
        const thinned = [pts[0]];
        for (let i = 1; i < pts.length - 1; i += 2) thinned.push(pts[i]);
        thinned.push(pts[pts.length - 1]);
        state.sessionGraphPoints = thinned;
      }
    }
    scheduleDraw();
  }

  function scheduleDraw() {
    const now = performance.now();
    if (now - lastDrawMs < 180) {
      if (!drawQueued) { drawQueued = true; setTimeout(() => { drawQueued = false; draw(); }, 190); }
      return;
    }
    draw();
  }

  function draw() {
    lastDrawMs = performance.now();
    if (!canvas) mount();
    if (!canvas || document.hidden) return;
    const pts = state.sessionGraphPoints;
    const cur = currentDiffBalls();

    if (diffEl) {
      diffEl.textContent = `${cur >= 0 ? '+' : ''}${cur.toLocaleString()}発`;
      diffEl.className = `text-[11px] font-black num-fixed ${cur > 0 ? 'text-emerald-400' : cur < 0 ? 'text-rose-400' : 'text-white'}`;
    }
    if (bestEl) bestEl.textContent = `最大 ${state.sessionMaxChains}連 / ${state.sessionMaxOneShot.toLocaleString()}個`;

    const peak = Math.max(0, ...pts, cur), bottom = Math.min(0, ...pts, cur);
    if (peakEl) peakEl.textContent = `最高: ${peak >= 0 ? '+' : ''}${peak.toLocaleString()} / 最低: ${bottom >= 0 ? '+' : ''}${bottom.toLocaleString()}`;

    const rect = canvas.parentElement.getBoundingClientRect();
    if (rect.width < 20 || rect.height < 20) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const w = rect.width, h = rect.height, padL = 42, padR = 8, padT = 10, padB = 10;
    const cw = w - padL - padR, ch = h - padT - padB;
    ctx.clearRect(0, 0, w, h);

    const drawPts = pts.length === 1 ? [0, cur] : pts;
    const span = Math.max(5000, peak - bottom);
    const yMin = bottom - span * 0.12, yMax = peak + span * 0.12;
    const toX = (i) => padL + (i / Math.max(1, drawPts.length - 1)) * cw;
    const toY = (v) => padT + ((yMax - v) / Math.max(1, yMax - yMin)) * ch;
    const zeroY = toY(0);

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.12)'; ctx.lineWidth = 1; ctx.font = '9px Inter, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'right';
    [yMax, 0, yMin].forEach(val => {
      const y = toY(val);
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      const k = Math.round(val / 100) / 10;
      ctx.fillText(val === 0 ? '0' : `${k > 0 ? '+' : ''}${k}k`, padL - 4, y + 3);
    });

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)'; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke(); ctx.setLineDash([]);

    ctx.lineWidth = 2;
    for (let i = 1; i < drawPts.length; i++) {
      const v0 = drawPts[i - 1], v1 = drawPts[i];
      ctx.beginPath(); ctx.moveTo(toX(i - 1), toY(v0)); ctx.lineTo(toX(i), toY(v1));
      ctx.strokeStyle = (v1 >= 0 && v0 >= 0) ? '#facc15' : (v1 < 0 && v0 < 0) ? '#f43f5e' : '#fb923c';
      ctx.stroke();
    }
    const lx = toX(drawPts.length - 1), ly = toY(drawPts[drawPts.length - 1]);
    ctx.fillStyle = cur >= 0 ? '#fef08a' : '#fda4af';
    ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fill();
  }

  return { mount, record, draw };
})();

// =========================================================================
// 投資・ステータス（固定枠・10万回転/100万収支対応）・ログ管理
// =========================================================================
function consumeNormalBall() {
  const ballsPerSpin = 250 / rotRate;
  state.unspentFrac += ballsPerSpin;
  const whole = Math.floor(state.unspentFrac);
  state.unspentFrac -= whole;
  if (state.balls >= whole) state.balls -= whole;
  else {
    const deficit = whole - state.balls;
    state.balls = 0;
    const units = Math.ceil(deficit / 125);
    state.totalInvestYen += units * 500;
    state.balls += units * 125 - deficit;
  }
  LiveSlump.record(false);
}

function updateSessionBest() {
  if (state.rushChains > state.sessionMaxChains) state.sessionMaxChains = state.rushChains;
  if (state.rushDisp > state.sessionMaxOneShot) state.sessionMaxOneShot = state.rushDisp;
}

function setControlMode(mode) {
  normalControls.classList.toggle('hidden', mode !== 'NORMAL');
  rushControls.classList.toggle('hidden', mode !== 'RUSH');
  busyNotice.classList.toggle('hidden', mode === 'NORMAL' || mode === 'RUSH');
}

function stopAuto() {
  state.autoMode = null;
  if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
  document.getElementById('btnAutoSakibare').textContent = '🔥 先バレ';
  document.getElementById('btnAutoHit').textContent = '⚡ 当りオート';
  document.getElementById('btnRushAuto').textContent = '⚡ RUSHオート';
}

// ---- v7.1 UiBatch：DOM更新をrAFで1回にまとめ、値が変わった時だけ書く ----
const UiBatch = (() => {
  const els = new Map();
  const get = id => { if (!els.has(id)) els.set(id, document.getElementById(id)); return els.get(id); };
  return {
    text(id, v) { const el = get(id); if (!el) return; v = String(v); if (el._v !== v) { el._v = v; el.textContent = v; } },
    tone(id, cls, all) { const el = get(id); if (!el || el._t === cls) return; el._t = cls; el.classList.remove(...all); el.classList.add(cls); }
  };
})();
const BAL_TONES = ['text-emerald-400', 'text-rose-400', 'text-white'];
let statsQueued = false;
function updateStatsUI() {
  if (statsQueued) return;
  statsQueued = true;
  requestAnimationFrame(flushStatsUI);
}
function flushStatsUI() {
  statsQueued = false;
  UiBatch.text('hudRushRemain', state.stRemaining);
  UiBatch.text('dashCurSpin', state.currentSpin.toLocaleString());
  UiBatch.text('dashTotalSpin', `総 ${state.totalNormalSpins.toLocaleString()}`);
  UiBatch.text('dashInvest', `${state.totalInvestYen.toLocaleString()}円`);
  UiBatch.text('dashBalls', `${Math.floor(state.balls).toLocaleString()}発`);

  const bal = Math.round(state.balls * exchangeRate) - state.totalInvestYen;
  const balTxt = `${bal >= 0 ? '+' : ''}${bal.toLocaleString()}円`;
  const tone = bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-white';
  UiBatch.text('dashBalance', balTxt); UiBatch.tone('dashBalance', tone, BAL_TONES);
  UiBatch.text('rushBalanceDisplay', balTxt); UiBatch.tone('rushBalanceDisplay', tone, BAL_TONES);

  UiBatch.text('statHits', `${state.rushHits} / ${state.firstHits}`);
  const sbPct = state.sakibareTotal > 0 ? Math.round((state.sakibareWins / state.sakibareTotal) * 100) : '-';
  UiBatch.text('statSakibare', `${state.sakibareWins}/${state.sakibareTotal} (${sbPct}%)`);

  UiBatch.text('rushChainDisplay', `${state.rushChains}連`);
  UiBatch.text('rushDispDisplay', `${state.rushDisp.toLocaleString()}個`);
  UiBatch.text('rushNetDisplay', `${state.rushNet.toLocaleString()}発`);
  UiBatch.text('rush6000Display', `${state.rush6000Count}回`);
}

let logRenderQueued = false;
function renderHistoryTable() {
  logRenderQueued = false;
  document.getElementById('historyTableBody').innerHTML = state.history.map(h => `
    <tr class="hover:bg-amber-950/30">
      <td class="py-1.5 px-1.5 font-bold text-slate-300 whitespace-nowrap num-fixed">${h.spinTxt}</td>
      <td class="py-1.5 px-1.5 whitespace-nowrap"><span class="px-1.5 py-0.5 rounded text-[10px] font-black ${h.tagCls}">${h.tag}</span></td>
      <td class="py-1.5 px-1.5 text-amber-100/90">${h.detail}</td>
      <td class="py-1.5 px-1.5 text-right font-black whitespace-nowrap num-fixed ${h.resCls}">${h.resTxt}</td>
    </tr>
  `).join('');
}
function addLog(spinTxt, tag, tagCls, detail, resTxt, resCls) {
  state.history.unshift({ spinTxt, tag, tagCls, detail, resTxt, resCls });
  if (state.history.length > 60) state.history.pop();
  if (!logRenderQueued) {
    logRenderQueued = true;
    requestAnimationFrame(renderHistoryTable);
  }
}

// =========================================================================
// 通常時抽選＆SPリーチ（ロゴ役物落下＋初当たり背面 niziiro.jpg）
// =========================================================================
function drawNormalSpin() {
  consumeNormalBall();
  state.currentSpin++;
  state.totalNormalSpins++;

  const p = SPEC.NORMAL_PROB;
  const isHit = Math.random() < p;

  let hesoType = null;
  if (isHit) {
    const r = Math.random();
    if (r < SPEC.H_3000_RUSH) hesoType = '3000_RUSH';
    else if (r < SPEC.RUSH_ENTRY) hesoType = '1500_RUSH';
    else hesoType = '1500_NORM';
  }

  let bareType = null;
  const occ = 0.92;
  if (state.custSakibare) {
    if (isHit) {
      if (Math.random() < occ) {
        const rainbowChance = state.custPremier ? 0.72 : 0.28;
        bareType = (hesoType === '3000_RUSH' && Math.random() < rainbowChance) ? 'rainbow' : 'red';
      }
    } else {
      const q = (p * occ * 0.60) / ((1 - p) * 0.40);
      if (Math.random() < q) bareType = 'red';
    }
  }
  return { isHit, hesoType, bareType };
}

function buildNormalScenario(res) {
  const { isHit, hesoType, bareType } = res;
  const is3000 = hesoType === '3000_RUSH';
  const ochiburu = is3000 && Math.random() < (state.custOchiburu ? 0.88 : 0.24);
  const isPremier = isHit && state.custPremier && !is3000 && Math.random() < 0.48;
  const tenpaiNum = is3000 ? 7
    : hesoType === '1500_RUSH' ? [1, 3, 5][Math.floor(Math.random() * 3)]
    : [2, 4, 6, 8][Math.floor(Math.random() * 4)];

  let titleColor = 'white', cutinColor = 'green';
  if (is3000 || isPremier) { titleColor = 'gold'; cutinColor = 'gold'; }
  else if (isHit) {
    titleColor = Math.random() < 0.42 ? 'gold' : Math.random() < 0.85 ? 'red' : 'white';
    cutinColor = Math.random() < 0.48 ? 'gold' : Math.random() < 0.88 ? 'red' : 'green';
  } else {
    titleColor = Math.random() < 0.08 ? 'gold' : Math.random() < 0.45 ? 'red' : 'white';
    cutinColor = Math.random() < 0.07 ? 'gold' : Math.random() < 0.40 ? 'red' : 'green';
  }

  let isWhale = false, badge = '', category = '', title = '', sub = '', actor = null;
  if (is3000) {
    isWhale = true; badge = '白鯨襲来'; category = '白鯨討伐SP'; title = '白鯨攻略戦'; sub = '霧の魔獣を討伐せよ!!'; actor = null;
  } else if (isPremier) {
    badge = '鬼がかってますね予告'; category = '鬼がかったやり方SP'; title = 'vs ウルガルム'; sub = 'レム覚醒!! 運命の一撃!!'; actor = 'rem';
  } else if (isHit) {
    const r = Math.random();
    if (r < 0.38) { badge = '鬼がかってますね予告'; category = '鬼がかったやり方SP'; title = 'vs ウルガルム'; sub = '最終ジャッジへ!!'; actor = 'rem'; }
    else if (r < 0.72) { badge = '鬼がかり予告'; category = '鬼がかったやり方SP'; title = 'vs ペテルギウス'; sub = '見えざる手を断ち切れ!!'; actor = 'pete'; }
    else { badge = '鬼がかり予告'; category = '鬼がかったやり方SP'; title = 'vs エルザ'; sub = '激熱バトル発展!!'; actor = 'rem'; }
  } else {
    const r = Math.random();
    if (r < 0.36) { badge = '鬼がかり予告'; category = '鬼がかったやり方SP'; title = 'vs ペテルギウス'; sub = '大チャンス到来!!'; actor = 'pete'; }
    else if (r < 0.72) { badge = '鬼がかり予告'; category = '鬼がかったやり方SP'; title = 'vs エルザ'; sub = '運命のジャッジ!!'; actor = 'rem'; }
    else { badge = '抗えチャンス'; category = '抗えSPリーチ'; title = '死の運命に抗え'; sub = 'ボタン一撃で突破せよ!!'; actor = null; }
  }
  const doGiji = isHit ? Math.random() < 0.65 : Math.random() < 0.35;
  return { isHit, hesoType, bareType, is3000, isWhale, isPremier, ochiburu, tenpaiNum, titleColor, cutinColor, badge, category, title, sub, actor, doGiji, secretRevealed: false };
}

// 演出用：役物落下で例外が出ても通常リーチを止めない（キャンセルは再送出）
async function dropSafe(opts) {
  try { await triggerYakumonoDrop(opts); }
  catch (e) { if (e === 'CANCELLED') throw e; console.error('yakumono drop failed', e); }
}

async function startNormalReach(res) {
  stopAuto(); stopHandleHold(true); LiveSlump.record(true);
  const tok = ++seqToken;
  state.phase = 'REACH'; setControlMode('BUSY'); clearVisualEffects(); setActiveScene('reach');
  reachStepBadge.classList.add('hidden'); reachSpCategory.textContent = ''; setReachActor(null); BgmEngine.cut();

  const sc = buildNormalScenario(res);
  state.pendingReach = sc;

  if (sc.bareType === 'rainbow') {
    state.sakibareTotal++; StudioAudio.playPokyun(true); setLcdNiziiroBack(true);
    setAmbientBg('rainbow'); setSunburst(true); setPremiaFrame(true); triggerLamp('rainbow', '虹バレ!!');
    updateReserveSlots('NORMAL', 'RAINBOW', 0); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); FxCanvas.burstRainbow(68);
    reachYokokuBadge.textContent = '虹先バレ'; reachYokokuBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-black/85 border border-amber-300 rainbow-grad-text shadow';
    reachTitle.textContent = 'ポキュ↑ーン↓!!'; reachTitle.className = 'font-mincho text-2xl sm:text-4xl font-black rainbow-grad-text cutin-slam';
    reachSub.textContent = `${state.currentSpin.toLocaleString()}回転目`;
  } else if (sc.bareType === 'red') {
    state.sakibareTotal++; StudioAudio.playPokyun(false);
    setAmbientBg('redbare'); triggerLamp('red', '先バレ!!');
    updateReserveSlots('NORMAL', 'RED', 0); lcdFrame.classList.add('fx-redbare', 'shake-burst'); FxCanvas.burstFlames(42);
    reachYokokuBadge.textContent = '先バレ'; reachYokokuBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950/90 border border-rose-400 text-rose-200 shadow';
    reachTitle.textContent = 'ポキュ↑ーン↓!!'; reachTitle.className = 'text-2xl sm:text-4xl font-black crimson-grad-text cutin-slam';
    reachSub.textContent = `${state.currentSpin.toLocaleString()}回転目・SP発展`;
  } else {
    reachYokokuBadge.textContent = 'SP発展'; reachYokokuBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-black/85 border border-amber-400 text-amber-300';
    reachTitle.textContent = 'リーチ発展!!'; reachTitle.className = 'text-2xl sm:text-3xl font-black gold-grad-text pop-in';
    reachSub.textContent = `${state.currentSpin.toLocaleString()}回転目`;
  }
  updateStatsUI();

  try {
    await wait(700, tok);
    lcdFrame.classList.remove('shake-burst');
    BgmEngine.resume('reach');

    if (sc.doGiji && !sc.isWhale) {
      reachSpCategory.textContent = '疑似連'; reachTitle.textContent = '継続 ×2'; reachTitle.className = 'text-2xl sm:text-3xl font-black gold-grad-text pop-in';
      FxCanvas.spawnRing('#facc15', 220, 6); await wait(380, tok);
      reachTitle.textContent = '鬼がかり継続 ×3!!'; reachTitle.className = 'text-xl sm:text-3xl font-black crimson-grad-text cutin-slam';
      FxCanvas.burstFlames(36); await wait(440, tok);
    }

    if (sc.isWhale) {
      StudioAudio.playWhaleSiren(); setAmbientBg('rainbow'); setPremiaFrame(true);
      await dropSafe({ color: 'rainbow', holdMs: 680, withNiziiroBack: false, token: tok });
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); triggerLamp('rainbow', '白鯨襲来!!'); FxCanvas.spawnLightning('#7dd3fc', 6);
    } else if (sc.isPremier) {
      await playOnigakariImageCutin({ caption: '鬼がかってますね', dur: 3200, withPokyun: false, fromBlackout: false, token: tok });
      setPremiaFrame(true); lcdFrame.classList.add('fx-rainbow'); triggerLamp('rainbow', 'プレミア!!'); FxCanvas.burstRainbow(56);
    } else if (sc.titleColor === 'gold') {
      await dropSafe({ color: 'gold', holdMs: 560, withNiziiroBack: false, token: tok });
    } else if (sc.titleColor === 'red') {
      await dropSafe({ color: 'red', holdMs: 500, withNiziiroBack: false, token: tok });
    } else {
      if (typeof Yakumono !== 'undefined') Yakumono.fire('chance');
      else console.warn('effects.js が古い版です（Yakumono 未定義）。effects.js を v7.3 に差し替えてください');
      FxCanvas.burstFlames(28);
    }

    setReachActor(sc.actor);
    reachYokokuBadge.textContent = sc.badge;
    reachYokokuBadge.className = (sc.isWhale || sc.isPremier)
      ? 'px-2 py-0.5 rounded-full text-[10px] font-black bg-black/90 border border-amber-300 rainbow-grad-text shadow'
      : 'px-2 py-0.5 rounded-full text-[10px] font-black bg-black/90 border border-amber-400/80 text-amber-300 shadow';

    reachStepBadge.classList.remove('hidden'); reachSpCategory.textContent = sc.category;
    if (sc.titleColor === 'gold') {
      reachStepBadge.textContent = '金タイトル!!'; reachStepBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow pop-in';
      reachTitle.className = 'font-mincho text-xl sm:text-3xl font-black gold-grad-text cutin-slam whitespace-nowrap';
    } else if (sc.titleColor === 'red') {
      reachStepBadge.textContent = '赤タイトル!'; reachStepBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950/95 border border-rose-400 text-rose-200 shadow pop-in';
      reachTitle.className = 'font-mincho text-xl sm:text-3xl font-black crimson-grad-text cutin-slam whitespace-nowrap';
    } else {
      reachStepBadge.textContent = '白タイトル'; reachStepBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 border border-slate-500 text-slate-200';
      reachTitle.className = 'font-mincho text-xl sm:text-3xl font-black text-white cutin-slam whitespace-nowrap';
    }
    reachTitle.textContent = sc.title; reachSub.textContent = sc.sub;

    await wait(560, tok);
    if (sc.cutinColor === 'gold') {
      reachStepBadge.textContent = '金カットイン!!'; reachStepBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow pop-in';
      FxCanvas.spawnRing('#fef08a', 240, 7);
    } else if (sc.cutinColor === 'red') {
      reachStepBadge.textContent = '赤カットイン!'; reachStepBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-950/95 border border-rose-400 text-rose-200 shadow pop-in';
      FxCanvas.spawnRing('#ef4444', 210, 5);
    } else {
      reachStepBadge.textContent = '緑カットイン'; reachStepBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-400 text-emerald-200';
    }

    pushButtonArea.classList.remove('hidden');
    btnOniPush.classList.remove('botan-rise-in'); void btnOniPush.offsetWidth; btnOniPush.classList.add('botan-rise-in');
    reachBotanText.textContent = sc.isWhale ? '撃破' : 'PUSH';
    pushHintText.textContent = sc.isWhale ? 'タップ / Spaceで白鯨撃破!!' : 'タップ / Spaceでジャッジ！（OKで裏告知）';

    const btnCol = (sc.isWhale || sc.isPremier) ? 'rainbow' : sc.cutinColor === 'gold' ? 'gold' : sc.cutinColor === 'red' ? 'red' : '';
    setReachBotanState({ vibe: btnCol === 'gold' || btnCol === 'rainbow' ? 'weak' : 'idle', color: btnCol });

    if (sc.ochiburu) {
      await wait(340, tok); BgmEngine.cut(); StudioAudio.playOchiburu(true);
      setAmbientBg('rainbow'); setSunburst(true); setPremiaFrame(true);
      lcdFrame.classList.add('shake-intense', 'fx-gold'); setReachBotanState({ vibe: 'max', color: 'rainbow', drop: true }); setLed('rainbow');
      FxCanvas.spawnRing('#fef08a', 300, 9); FxCanvas.spawnLightning('#fef08a', 5);
      reachYokokuBadge.textContent = '鬼がかり3,000濃厚!!';
      reachYokokuBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow pop-in';
    }
  } catch (e) {
    if (e === 'CANCELLED') return;                       // 別の演出に切り替わった場合のみ中断
    console.error('startNormalReach failed', e);
    try {                                                // それ以外の失敗でも、PUSHは必ず出して進行を止めない
      reachSub.textContent = '演出エラー: ' + ((e && e.message) || e);
      reachStepBadge.classList.add('hidden');
      pushButtonArea.classList.remove('hidden'); reachBotanText.textContent = 'PUSH';
      pushHintText.textContent = 'タップでジャッジ';
    } catch (_) {}
  }
}

btnOniPush.addEventListener('click', () => { if (state.phase === 'REACH') resolveNormalReach(); });

btnSecretOk.addEventListener('click', () => {
  if (canInterruptPromotion()) { interruptPromotionByOk(); return; }
  if (state.phase === 'REACH') {
    const sc = state.pendingReach;
    if (!sc || sc.secretRevealed || sc.ochiburu || !sc.isHit) return;
    sc.secretRevealed = true; BgmEngine.cut();
    if (sc.is3000) {
      sc.ochiburu = true; StudioAudio.playOchiburu(true); setLcdNiziiroBack(true);
      setAmbientBg('rainbow'); setSunburst(true); setPremiaFrame(true);
      lcdFrame.classList.add('shake-intense', 'fx-gold'); setReachBotanState({ vibe: 'max', color: 'rainbow', drop: true });
      triggerLamp('rainbow', '3,000!!'); setLed('rainbow');
      FxCanvas.spawnRing('#fef08a', 300, 9); FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(64);
      reachYokokuBadge.textContent = '鬼がかり3,000濃厚!!'; reachYokokuBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow pop-in';
      pushHintText.textContent = 'タップ / Spaceで3,000BONUSへ!!';
    } else {
      StudioAudio.playKyuin(); setLcdNiziiroBack(true); setAmbientBg('rainbow'); setPremiaFrame(true); lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      setReachBotanState({ vibe: 'mid', color: 'rainbow' }); triggerLamp('rainbow', '一発告知!!');
      FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(58);
      reachYokokuBadge.textContent = '大当り濃厚!!'; reachYokokuBadge.className = 'px-2 py-0.5 rounded-full text-[10px] font-black bg-black/95 border border-amber-300 rainbow-grad-text shadow pop-in';
      pushHintText.textContent = 'タップ / Spaceで図柄揃いへ!!';
    }
    return;
  }
  if (state.pendingRushHit && state.pendingRushHit.type === 'BONUS_6000' && !state.pendingRushHit.okRevealed) {
    state.pendingRushHit.okRevealed = true; BgmEngine.cut(); StudioAudio.playOchiburu(true);
    setAmbientBg('rainbow'); setSunburst(true); setPremiaFrame(true); triggerLamp('rainbow', '6,000!!'); FxCanvas.spawnLightning('#fef08a', 5);
    rushTopBadge.classList.remove('hidden'); rushTopBadge.textContent = '鬼がかり6,000濃厚!!';
    rushTopBadge.className = 'pointer-events-none absolute top-[44px] left-1/2 -translate-x-1/2 z-[28] px-3 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in whitespace-nowrap';
  }
});

async function resolveNormalReach() {
  const sc = state.pendingReach;
  if (!sc) return;
  state.pendingReach = null;
  const tok = ++seqToken;

  lcdFrame.classList.remove('shake-intense', 'shake-burst');
  setReachBotanState({ vibe: 'idle', color: '' });
  pushButtonArea.classList.add('hidden');
  updateReserveSlots('NORMAL');

  if (!sc.isHit) {
    state.phase = 'ANIMATING';
    try { await playGlassShatterFail(tok); } catch (e) {}
    setReachActor(null); clearVisualEffects(); state.phase = 'NORMAL'; setActiveScene('normal'); randomMissReels();
    normalTitle.textContent = 'ハズレ…'; normalTitle.className = 'text-lg sm:text-2xl font-black text-slate-400';
    normalSub.textContent = `${sc.title}で敗北。次こそ！`;
    setControlMode('NORMAL');
    setTimeout(() => { if (state.phase === 'NORMAL') BgmEngine.resume('normal'); }, 550);
    if (sc.bareType) addLog(`${state.currentSpin}回`, '先バレ', 'bg-rose-950 text-rose-300 border border-rose-700', sc.title, 'ハズレ', 'text-slate-400');
    updateStatsUI(); return;
  }

  setReachActor(null); BgmEngine.cut();
  if (sc.bareType) state.sakibareWins++;
  state.firstHits++; state.phase = 'ANIMATING'; updateStatsUI();

  try {
    if (sc.hesoType === '3000_RUSH') {
      fireRainbowBurst('大当り!!', { withBackNiziiro: true });
      await runWhale3000Direct(tok);
      enterOnigakariRush(state.currentSpin, true);
      return;
    }

    // ★初当たり：ロゴ役物『Re:ゼロ』がガシャーンと落下し、背面に niziiro.jpg が爆発展開!!★
    // 図柄は見せない：予告画面のまま一拍おいて、ロゴ役物が中央まで落下して当りを知らせる
    await wait(650, tok);
    fireRainbowBurst('大当り!!', { withBackNiziiro: true });
    await triggerYakumonoDrop({ color: 'rainbow', holdMs: 1150, withNiziiroBack: true, token: tok });

    StudioAudio.play1500Jackpot(false); setActiveScene('bonus');
    setBonusSceneBackdrop('niziiro');
    setBonusLogo('rezeroPurple');
    bonusSubLabel.className = 'text-[10px] sm:text-xs font-black tracking-[0.16em] text-amber-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] leading-none';
    bonusSubLabel.textContent = '図柄揃い大当り';
    bonusMainTitle.className = 'text-lg sm:text-2xl font-black gold-grad-text drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)] pop-in';
    bonusMainTitle.textContent = '1,500 BONUS';
    bonusDesc.className = 'text-[10px] sm:text-xs font-black text-amber-100 bg-black/55 px-2.5 py-0.5 rounded-full';
    bonusDesc.textContent = '鬼がかりチャレンジで55%を突破せよ!!';
    await wait(900, tok);

    const isRush = sc.hesoType === '1500_RUSH';
    const isRedButton = isRush && Math.random() < 0.38;
    if (isRedButton) {
      StudioAudio.playPokyun(false); setAmbientBg('redbare'); triggerLamp('red', '赤ボタン!!'); setLed('red');
      lcdFrame.classList.add('fx-redbare', 'shake-burst'); FxCanvas.spawnRing('#ef4444', 320, 10); FxCanvas.burstFlames(48);
      try { if (navigator && navigator.vibrate) navigator.vibrate([70, 35, 110]); } catch (e) {}
      setTimeout(() => lcdFrame.classList.remove('shake-burst'), 520);
    }

    await waitUniversalBotanTap({
      label: isRedButton ? '鬼がかりチャレンジ!!【赤ボタン濃厚!!】' : '鬼がかりチャレンジ!!（55% RUSH）',
      vibe: isRedButton ? 'mid' : 'weak', color: isRedButton ? 'red' : 'gold', redChassis: isRedButton, token: tok
    });
    hideUniversalBotan();

    if (isRush) {
      const isRevival = !isRedButton && Math.random() < 0.45;
      if (isRevival) {
        await playGlassShatterFail(tok);
        const useOnigakariRevive = Math.random() < 0.62;
        await runGoldenPromotionSequence({
          fakeSub: '鬼がかりチャレンジ失敗…', fakeTitle: '通常 1,500 BONUS', fakeDesc: 'RUSH非突入（純増 +1,400発獲得）',
          fakeStyle: 'despair', fakeSound: 'fail', fakeIsRush: false, fakeBurstGold: false, rushMode: 'onigakari', iwakanAnswer: '',
          finalSub: useOnigakariRevive ? '鬼がかってますね復活' : '死に戻り復活', finalTitle: '鬼がかりRUSH 突入!!',
          finalExtra: '払出 1,500個（純増 1,400発）＋ ST144回獲得!!', finalSound: '3000', crashType: useOnigakariRevive ? 'freeze3s' : 'slash', token: tok
        });
        enterOnigakariRush(state.currentSpin, false);
      } else {
        StudioAudio.playSlash(); firePhysicalSplitSlash(); StudioAudio.play1500Jackpot(true);
        setAmbientBg('rainbow'); setSunburst(true);
        showFullscreenOverlay({
          mode: 'rainbow', sub: isRedButton ? '赤ボタン一撃成功!!' : '鬼がかりチャレンジ成功!!',
          main: '鬼がかりRUSH 突入!!', logoKey: 'oniRush', premia: true, extra: '払出 1,500個（純増 1,400発）＋ ST144回獲得!!'
        });
        FxCanvas.burstRainbow(72); await wait(1700, tok); hideFullscreenOverlay();
        enterOnigakariRush(state.currentSpin, false);
      }
    } else {
      await playGlassShatterFail(tok);
      setActiveScene('bonus'); setBonusSceneBackdrop(null); setLcdNiziiroBack(false);
      lcdFrame.classList.add('mode-despair-bg'); setBonusLogo('rezeroPurple');
      bonusSubLabel.textContent = '鬼がかりチャレンジ失敗…'; bonusSubLabel.className = 'text-[10px] font-black text-slate-400 leading-none';
      bonusMainTitle.textContent = '通常 1,500 BONUS'; bonusMainTitle.className = 'text-lg sm:text-2xl font-black text-slate-200';
      bonusDesc.className = 'text-[10px] sm:text-xs font-bold text-slate-300';
      bonusDesc.textContent = 'RUSH非突入（実質純増 +1,400発獲得）';
      await wait(1280, tok);

      state.balls += SPEC.NET_1500; LiveSlump.record(true);
      const hitSpin = state.currentSpin; state.currentSpin = 0; state.phase = 'NORMAL';
      clearVisualEffects(); setActiveScene('normal'); setReels(sc.tenpaiNum, sc.tenpaiNum, sc.tenpaiNum);
      normalTitle.textContent = '通常 1,500 終了'; normalTitle.className = 'text-lg sm:text-xl font-black text-amber-200';
      normalSub.textContent = '純増1,400発を持って通常時へ！';
      setControlMode('NORMAL'); BgmEngine.resume('normal');
      addLog(`${hitSpin}回`, '初当り(通常)', 'bg-slate-800 text-amber-200 border border-amber-700/60', sc.title, '1,500個 (1,400発)', 'text-amber-200');
      updateStatsUI();
    }
  } catch (e) {}
}// =========================================================================
// 鬼がかりRUSH（青V=300 / 赤V=1500・一体表示＆油断暗転WEDDING 12,000）
// =========================================================================
function fillStLookaheadQueue() {
  while (state.stLookaheadQueue.length < 4) {
    if (state.stLookaheadQueue.some(s => s.hit)) break;
    const isHit = Math.random() < SPEC.ST_PROB;
    const bonusType = isHit ? drawRushBonusType() : null;
    const slot = { hit: isHit, bonusType, isReserve: false, remSakibare: false, remPat: 'NORMAL' };
    state.stLookaheadQueue.push(slot);

    if (isHit && bonusType !== 'RESTART' && state.rushMode === 'rem' && !state.remSakibareActive && !state.rushCustNoNotice) {
      const spinsAhead = state.stLookaheadQueue.length - 1;
      if (spinsAhead >= 1 && Math.random() < 0.85) {
        const is6 = bonusType === 'BONUS_6000';
        const pat = (is6 && Math.random() < 0.65) ? ['SLOW_GLOW', 'CLASSIC_FLASH', 'RAINBOW'][Math.floor(Math.random() * 3)] : 'NORMAL';
        slot.remSakibare = true; slot.remPat = pat; state.remSakibareActive = true;
        triggerRemSakibareBack({ is6000: is6, pat, countdownSpins: spinsAhead });
      }
    }
    if (isHit) break;
  }
}

function enterOnigakariRush(hitSpin, is3000) {
  state.rushHits++; state.rushChains = 1;
  state.rushDisp = is3000 ? SPEC.DISP_3000 : SPEC.DISP_1500;
  state.rushNet = is3000 ? SPEC.NET_3000 : SPEC.NET_1500;
  state.balls += state.rushNet; updateSessionBest(); LiveSlump.record(true);
  state.rush6000Count = 0; state.rushWeddingCount = 0; state.rushHoryurenCount = 0; state.rushRestartCount = 0;
  state.rushIwakanNotes = []; state.rushStartSpin = hitSpin; state.currentSpin = 0;
  state.hasVStock = false; state.hasVStockRed = false; state.remSakibareActive = false; state.stLookaheadQueue = []; state.pendingResultRevival = false;

  if (rushMetaHud) rushMetaHud.classList.remove('hidden');
  if (rushModeBar) rushModeBar.classList.remove('hidden');
  if (rushStatusBar) rushStatusBar.classList.remove('hidden');
  setVStockBadge(false);
  afterBonusReserveCheck(is3000 ? 'INIT_3000' : 'INIT_1500');
}

async function afterBonusReserveCheck(prevType) {
  const tok = ++seqToken;
  const slots = drawReserve4Slots();
  const hitSlot = slots.find(s => s.hit) || null;
  updateRes4Dots(SPEC.ST_RESERVE);
  state.hasVStock = false; state.hasVStockRed = false; state.remSakibareActive = false; state.stLookaheadQueue = [];
  setVStockBadge(false);

  try {
    if (hitSlot) {
      // ★残保留6,000連荘 → 0.85秒だけST＆BGMが始まって油断した瞬間に全画面暗転 WEDDING 12,000!!★
      if (prevType === 'BONUS_6000' && hitSlot.bonusType === 'BONUS_6000') {
        state.rushHoryurenCount++;
        state.reserveQueue = []; state.stRemaining = SPEC.ST_TOTAL;
        state.phase = 'RUSH'; setControlMode('BUSY');
        clearVisualEffects(); setActiveScene('rush-idle'); applyRushModeVisuals(); updateStatsUI();
        await wait(850, tok);

        state.phase = 'ANIMATING'; BgmEngine.cut();
        await playWedding12000Cinema(tok);

        hideFullscreenOverlay();
        state.rushChains++; state.rush6000Count++; state.rushWeddingCount++;
        state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000;
        updateSessionBest(); LiveSlump.record(true); updateStatsUI();
        afterBonusReserveCheck('BONUS_6000');
        return;
      }

      if (hitSlot.bonusType !== 'RESTART') {
        if (Math.random() < SPEC.HORYUREN_NOTICE_RATE) {
          state.rushHoryurenCount++; state.reserveQueue = [];
          state.phase = 'ANIMATING'; setControlMode('BUSY'); BgmEngine.cut();
          await wait(520, tok);
          const isB6 = hitSlot.bonusType === 'BONUS_6000', isB300 = hitSlot.bonusType === 'BONUS_300';

          StudioAudio.playPokyun(isB6); setAmbientBg('rainbow'); setSunburst(true);
          triggerLamp('rainbow', `残保${hitSlot.hitIndex}連!!`); FxCanvas.burstRainbow(68);
          const label = isB6 ? '超・鬼がかり 6,000 BONUS!!' : isB300 ? '鬼がかり 300 BONUS!!' : '鬼がかり 1,500 BONUS!!';
          if (isB6) StudioAudio.play6000Fanfare(false);
          else if (isB300) StudioAudio.play300Sound();
          else StudioAudio.play1500Jackpot(true);

          showFullscreenOverlay({
            mode: 'rainbow', sub: `保留連!!（残保留${hitSlot.hitIndex}個目）`, main: label,
            logoKey: isB6 ? get6000LogoKey(state.rushMode) : (isB300 ? 'rezeroPurple' : 'rezeroChain'), premia: isB6,
            extra: '大当り直後の奇跡の連荘!!'
          });
          await wait(1750, tok); hideFullscreenOverlay();

          if (isB6) { state.rushChains++; state.rush6000Count++; state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000; }
          else if (!isB300) { state.rushChains++; state.rushDisp += SPEC.DISP_1500; state.rushNet += SPEC.NET_1500; state.balls += SPEC.NET_1500; }
          else { state.rushChains++; state.rushDisp += SPEC.DISP_300; state.rushNet += SPEC.NET_300; state.balls += SPEC.NET_300; }
          updateSessionBest(); LiveSlump.record(true); updateStatsUI();
          afterBonusReserveCheck(hitSlot.bonusType);
          return;
        } else if (Math.random() < 0.55) {
          state.phase = 'ANIMATING'; setControlMode('BUSY'); BgmEngine.cut();
          const isRed = hitSlot.bonusType !== 'BONUS_300';
          await playVStockNotice({ isRed, token: tok });
          state.hasVStock = true; state.hasVStockRed = isRed;
          setVStockBadge(true, isRed);
        }
      }
    }

    state.reserveQueue = slots; updateRes4Dots(SPEC.ST_RESERVE);
    state.stRemaining = SPEC.ST_TOTAL; state.phase = 'RUSH';
    clearVisualEffects(); setActiveScene('rush-idle'); applyRushModeVisuals(); setControlMode('RUSH'); updateStatsUI();
  } catch (e) {}
}

function applyRushModeVisuals() {
  lcdFrame.classList.remove('fx-gold', 'bonus-theme-brain', 'bonus-theme-rem');
  if (state.phase !== 'RUSH') return;
  syncRushStages(); BgmEngine.resume(state.rushMode);

  if (state.rushMode === 'onigakari') {
    FxCanvas.setAmbient('none'); setAmbientBg('rush'); setCabinetGlow('gold'); setYakumonoColor('gold');
    lcdFrame.classList.add('fx-gold'); setLed('red');
    updateReserveSlots('NORMAL'); randomOniMissReels(false);
  } else if (state.rushMode === 'brain') {
    FxCanvas.setAmbient('none'); setAmbientBg('brain'); setCabinetGlow('idle'); setYakumonoColor('white');
    setLed('brain');
    updateReserveSlots('BRAIN'); setBrainPeteLevel(0, { withFlash: false }); setBrainTextSwarm(0); setBrainButtonState('idle');
  } else {
    FxCanvas.setAmbient('none'); setAmbientBg('rem'); setLed('rem');
    if (!state.remSakibareActive) {
      setCabinetGlow('idle'); setYakumonoColor('white');
      updateReserveSlots('NORMAL'); setRemLampVisual('idle', { bringFront: false });
    }
    randomRemMissReels(false);
  }
}

function spinRushOnce() {
  if (state.phase !== 'RUSH' || state.stRemaining <= 0) return null;
  if (!infiniteRushMode) state.stRemaining--;
  else state.stRemaining = SPEC.ST_TOTAL;

  if (state.rushMode === 'onigakari') randomOniMissReels(state.autoMode !== null || handleActive);
  else if (state.rushMode === 'rem') randomRemMissReels(state.autoMode !== null || handleActive);

  let slot = null;
  if (state.reserveQueue.length > 0) {
    slot = state.reserveQueue.shift();
    updateRes4Dots(state.reserveQueue.length);
    if (slot.hit) { state.reserveQueue = []; if (state.hasVStock) { state.hasVStock = false; state.hasVStockRed = false; setVStockBadge(false); } }
  } else {
    fillStLookaheadQueue();
    slot = state.stLookaheadQueue.shift();
    if (state.stRemaining > 0) fillStLookaheadQueue();
  }

  if (state.rushMode === 'rem' && state.remSakibareActive && !slot.hit) {
    const idx = state.stLookaheadQueue.findIndex(s => s.hit && s.remSakibare);
    if (idx >= 0) {
      const target = state.stLookaheadQueue[idx];
      const is6 = target.bonusType === 'BONUS_6000' && target.remPat !== 'NORMAL';
      updateReserveSlots('NORMAL', is6 ? 'RAINBOW' : 'REM_CYAN', idx);
    }
  }

  if (slot && slot.hit) {
    state.stLookaheadQueue = [];
    const fromSakibare = !!slot.remSakibare; state.remSakibareActive = false;
    return { type: slot.bonusType, fromRemSakibare: fromSakibare, remPat: slot.remPat };
  }

  if (!infiniteRushMode && state.stRemaining <= 0) return { type: 'ST_END' };
  if (state.rushCustNoNotice || state.rushMode === 'rem') return { type: 'MISS', teaser: null };

  let teaser = null;
  if (state.rushMode === 'brain') {
    const r = Math.random();
    if (r < 0.015) teaser = 'BRAIN_HANDS_GAZE'; else if (r < 0.055) teaser = 'BRAIN_NOGA_GAZE';
  } else if (state.rushMode === 'onigakari') {
    const r = Math.random();
    if (r < 0.015) teaser = 'ONI_CD_GAZE'; else if (r < 0.032) teaser = 'ONI_TENPAI_GAZE'; else if (r < 0.044) teaser = 'ONI_BLINK_GAZE';
  }
  if (!teaser && state.rushCustTrust && Math.random() < 0.022) teaser = 'TRUST_GAZE';
  return { type: 'MISS', teaser };
}

function pickTrustPercent({ isHit, is6000 }) {
  if (!isHit) {
    const r = Math.random();
    if (r < 0.55) return { txt: '1%', cls: 'border-slate-500 text-slate-300' };
    if (r < 0.85) return { txt: '25%', cls: 'border-sky-400 text-sky-300' };
    return { txt: '50%', cls: 'border-amber-400 text-amber-300' };
  }
  if (is6000 && Math.random() < 0.35) return { txt: '6000%!!', cls: 'border-yellow-200 rainbow-grad-text' };
  const r = Math.random();
  if (r < 0.45) return { txt: '99%!!', cls: 'border-amber-300 text-amber-200' };
  if (r < 0.78) return { txt: '80%!', cls: 'border-rose-400 text-rose-200' };
  return { txt: '50%', cls: 'border-amber-400 text-amber-300' };
}

async function playRushTeaserAndResume(teaser, resumeAuto = false) {
  const tok = ++seqToken;
  state.phase = 'ANIMATING'; setControlMode('BUSY');
  try {
    if (state.rushCustTrust && teaser === 'TRUST_GAZE') {
      const tr = pickTrustPercent({ isHit: false });
      rushTopBadge.classList.remove('hidden'); rushTopBadge.textContent = `信頼度 ${tr.txt}`;
      rushTopBadge.className = `pointer-events-none absolute top-[44px] left-1/2 -translate-x-1/2 z-[28] px-3 py-0.5 rounded-full text-xs font-black bg-black/90 border shadow-lg whitespace-nowrap ${tr.cls}`;
      await wait(620, tok); rushTopBadge.classList.add('hidden');
    } else if (teaser === 'BRAIN_HANDS_GAZE' || teaser === 'BRAIN_NOGA_GAZE') {
      await playBrainModeSequence({ isHit: false, is6000: false, bonusType: null, isHands: teaser === 'BRAIN_HANDS_GAZE', token: tok });
    } else if (teaser === 'ONI_CD_GAZE') {
      await playOnigakariCountdown({ isHit: false, is6000: false, token: tok });
    } else if (teaser === 'ONI_TENPAI_GAZE') {
      await playOniTenpaiAori({ isHit: false, is6000: false, token: tok });
    } else if (teaser === 'ONI_BLINK_GAZE') {
      updateReserveSlots('NORMAL', 'BLINK', 0); await wait(480, tok); updateReserveSlots('NORMAL', null);
    }
    state.phase = 'RUSH'; clearIwakanEffects(); applyRushModeVisuals(); setControlMode('RUSH'); updateStatsUI();
    if (resumeAuto) startRushAutoLoop();
  } catch (e) {}
}

function award6000AndContinue() {
  state.rushChains++; state.rush6000Count++;
  state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000;
  updateSessionBest(); LiveSlump.record(true); updateStatsUI();
  afterBonusReserveCheck('BONUS_6000');
}

async function handleRushHitSequence(bonusType, { fromRemSakibare = false, remPat = null } = {}) {
  const tok = ++seqToken;
  const is6000 = bonusType === 'BONUS_6000';
  state.phase = 'ANIMATING'; state.pendingRushHit = { type: bonusType, okRevealed: false };
  setControlMode('BUSY'); updateStatsUI();

  let currentIwakan = '', direct6000AlreadyAnnounced = false, alarmAlreadyPlaying = false, alignedDig = null;

  try {
    if (bonusType === 'RESTART') {
      clearIwakanEffects(); state.pendingRushHit = null;
      await runNormalRushBonusSequence('RESTART', '');
      return;
    }

    if (is6000 && !fromRemSakibare) {
      const surpriseRoll = Math.random();
      const surpriseCap = state.rushMode === 'brain' ? 0.12 : state.rushMode === 'rem' ? 0.20 : 0.62;
      if (surpriseRoll < surpriseCap) {
        const sub = Math.random();
        if (state.rushMode === 'onigakari' && sub < 0.24) {
          state.rushIwakanNotes.push('鬼レム接近'); state.pendingRushHit = null;
          await playOniRemApproach6000(tok); award6000AndContinue(); return;
        }
        if (sub < 0.44) {
          state.rushIwakanNotes.push('突発落ちブル警報'); state.pendingRushHit = null;
          await runSuddenOchiburu6000({ sub: state.rushMode === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH', rushMode: state.rushMode, token: tok });
          award6000AndContinue(); return;
        }
        if (sub < 0.62) {
          clearIwakanEffects(); state.pendingRushHit = null;
          await runRush6000Sequence({ forceFake: 'restart', iwakanAnswer: '' }); return;
        }
        if (sub < 0.80) {
          state.rushIwakanNotes.push('液晶暗転フリーズ'); state.pendingRushHit = null;
          await runSudden3sFreeze6000(tok); award6000AndContinue(); return;
        }
        state.rushIwakanNotes.push('出玉カウントアップ突破'); state.pendingRushHit = null;
        await runCountUpBreak6000({ rushMode: state.rushMode, iwakanAnswer: '', token: tok });
        award6000AndContinue(); return;
      }
    }

    if (state.rushCustTrust) {
      const tr = pickTrustPercent({ isHit: true, is6000 });
      rushTopBadge.classList.remove('hidden'); rushTopBadge.textContent = `信頼度 ${tr.txt}`;
      rushTopBadge.className = `pointer-events-none absolute top-[44px] left-1/2 -translate-x-1/2 z-[28] px-3 py-0.5 rounded-full text-xs font-black bg-black/95 border shadow-lg pop-in whitespace-nowrap ${tr.cls}`;
      await wait(500, tok);
    }

    const iwakanChance = state.rushCustIwakan ? 0.68 : 0.24;
    if (!fromRemSakibare && Math.random() < iwakanChance) {
      currentIwakan = await playIwakanEffect({ is6000, rushMode: state.rushMode, token: tok });
      if (currentIwakan) state.rushIwakanNotes.push(currentIwakan);
    }

    if (state.rushCustNoNotice && !is6000) {
      clearIwakanEffects(); state.pendingRushHit = null;
      await runNormalRushBonusSequence(bonusType, currentIwakan);
      return;
    }

    if (state.rushMode === 'rem') {
      const remNote = await playRemTougaiBurst({ is6000, bonusType, fromSakibare: fromRemSakibare, forcePat: remPat, token: tok });
      if (remNote) { if (!currentIwakan) currentIwakan = remNote; state.rushIwakanNotes.push(remNote); }
      if (is6000 && (state.pendingRushHit.okRevealed || Math.random() < (state.custOchiburu ? 0.45 : 0.16))) {
        direct6000AlreadyAnnounced = true; alarmAlreadyPlaying = state.pendingRushHit.okRevealed;
      }
    } else if (state.rushMode === 'brain') {
      const isHands = is6000 && Math.random() < 0.44;
      const bRes = await playBrainModeSequence({ isHit: true, is6000, bonusType, isHands, custOchiburu: state.custOchiburu, token: tok });
      if (bRes.note) { if (!currentIwakan) currentIwakan = bRes.note; state.rushIwakanNotes.push(bRes.note); }
      if (bRes.triggeredOchiburu || state.pendingRushHit.okRevealed) { direct6000AlreadyAnnounced = true; alarmAlreadyPlaying = true; }
    } else {
      if (is6000 && Math.random() < 0.28) { updateReserveSlots('NORMAL', 'BLINK_RED', 0); await wait(420, tok); }
      const r = Math.random();
      if (r < 0.38) {
        const tp = await playOniTenpaiAori({ isHit: true, is6000, bonusType, token: tok });
        alignedDig = tp.winDig;
        if (tp.note) { if (!currentIwakan) currentIwakan = tp.note; state.rushIwakanNotes.push(tp.note); }
      } else if (r < 0.72) {
        const cd = await playOnigakariCountdown({ isHit: true, is6000, bonusType, token: tok });
        alignedDig = cd.winDig;
        if (cd.note) { if (!currentIwakan) currentIwakan = cd.note; state.rushIwakanNotes.push(cd.note); }
      } else {
        alignedDig = await playOniTotsuAtariPause({ is6000, bonusType, hadNotice: !!currentIwakan, token: tok });
      }
      if (is6000 && (alignedDig === 7 || alignedDig === 3 || alignedDig === 0 || state.pendingRushHit.okRevealed)) {
        direct6000AlreadyAnnounced = true; alarmAlreadyPlaying = state.pendingRushHit.okRevealed;
      }
    }

    clearIwakanEffects(); state.pendingRushHit = null;

    if (is6000) {
      if (direct6000AlreadyAnnounced) {
        await triggerYakumonoDrop({ color: 'rainbow', holdMs: 650, withNiziiroBack: true, withSound: !alarmAlreadyPlaying, token: tok });
        await runSuddenOchiburu6000({ sub: state.rushMode === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH', rushMode: state.rushMode, skipAlarm: alarmAlreadyPlaying, token: tok });
        award6000AndContinue();
      } else if (alignedDig !== null && alignedDig % 2 === 0 && alignedDig !== 0) {
        await runRush6000Sequence({ forceFake: '300', iwakanAnswer: currentIwakan });
      } else if (alignedDig === 1 || alignedDig === 5) {
        if (Math.random() < 0.45) {
          await runCountUpBreak6000({ rushMode: state.rushMode, iwakanAnswer: currentIwakan, token: tok });
          award6000AndContinue();
        } else {
          await runRush6000Sequence({ forceFake: '1500', iwakanAnswer: currentIwakan });
        }
      } else if (Math.random() < 0.32) {
        await runCountUpBreak6000({ rushMode: state.rushMode, iwakanAnswer: currentIwakan, token: tok });
        award6000AndContinue();
      } else {
        await runRush6000Sequence({ forceFake: null, iwakanAnswer: currentIwakan });
      }
    } else {
      await runNormalRushBonusSequence(bonusType, currentIwakan);
    }
  } catch (e) {
    state.pendingRushHit = null; clearGlobalChaosEffects();
  }
}

function handleRushEvent(ev, { fromAuto = false } = {}) {
  if (!ev) return;
  if (ev.type === 'MISS') {
    if (!infiniteRushMode && state.stRemaining <= 10) {
      hudRushRemain.className = 'text-lg sm:text-xl font-black crimson-grad-text leading-none animate-pulse num-fixed';
      setAmbientBg('redbare');
      if (state.stRemaining === 10 || state.stRemaining <= 3) StudioAudio.playSoftHeartbeat();
    } else if (state.stRemaining <= 15) {
      hudRushRemain.className = 'text-lg sm:text-xl font-black crimson-grad-text leading-none num-fixed';
    } else {
      hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none num-fixed';
    }
    updateStatsUI();
    if (ev.teaser) { stopAuto(); stopHandleHold(true); playRushTeaserAndResume(ev.teaser, fromAuto); }
    return;
  }
  stopAuto(); stopHandleHold(true);
  if (ev.type === 'ST_END') { finishRush(); return; }
  handleRushHitSequence(ev.type, { fromRemSakibare: !!ev.fromRemSakibare, remPat: ev.remPat || null });
}

async function runRush6000Sequence({ forceFake = null, iwakanAnswer = '' } = {}) {
  const tok = ++seqToken;
  state.phase = 'ANIMATING'; setControlMode('BUSY');

  const rm = state.rushMode;
  const modePrefix = rm === 'brain' ? '脳が震える' : rm === 'rem' ? '鬼化レム' : '鬼がかり';
  const pick = forceFake || (Math.random() < 0.45 ? '300' : '1500');

  let opts;
  if (pick === '300') {
    opts = {
      fakeSub: '右打ち 6%', fakeTitle: `${modePrefix} 300 BONUS`, fakeDesc: '実質純増 +280発 ＆ ST144回リセット！',
      fakeStyle: 'despair', fakeSound: '300', fakeRestart: false, fakeIsRush: true, fakeBurstGold: false, rushMode: rm,
      iwakanAnswer, finalSub: rm === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH',
      finalTitle: '超・鬼がかり 6,000 BONUS!!', finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'auto'
    };
  } else if (pick === 'restart') {
    opts = {
      fakeSub: '死に戻り', fakeTitle: 'Re:Start', fakeDesc: '出玉なし・ST144回へ巻き戻し',
      fakeStyle: 'despair', fakeSound: 'restart', fakeRestart: true, fakeIsRush: true, fakeBurstGold: false, rushMode: rm,
      iwakanAnswer: '', finalSub: 'Re:Start 引き裂き昇格', finalTitle: '超・鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'slash'
    };
  } else {
    opts = {
      fakeSub: rm === 'brain' ? '脳が震えるRUSH' : rm === 'rem' ? 'レム告知モード' : '右打ち 55%',
      fakeTitle: '1,500 BONUS!!', fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
      fakeStyle: 'gold', fakeSound: '1500', fakeRestart: false, fakeIsRush: true, fakeBurstGold: true, rushMode: rm,
      iwakanAnswer, finalSub: rm === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH',
      finalTitle: '超・鬼がかり 6,000 BONUS!!', finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'auto'
    };
  }

  try {
    await runGoldenPromotionSequence({ ...opts, token: tok });
    award6000AndContinue();
  } catch (e) {}
}

async function runNormalRushBonusSequence(type, iwakanAnswer = '') {
  const tok = ++seqToken;
  state.phase = 'ANIMATING'; setControlMode('BUSY'); BgmEngine.cut();
  setActiveScene('bonus'); hideIwakanAnswer();

  const rm = state.rushMode;
  const modePrefix = rm === 'brain' ? '脳が震える' : rm === 'rem' ? '鬼化レム' : '鬼がかり';
  const modeSub = rm === 'brain' ? 'BRAIN TREMBLE BONUS' : rm === 'rem' ? 'REM AWAKENING BONUS' : 'ONIGAKARI BONUS';

  try {
    if (type === 'BONUS_1500') {
      StudioAudio.playVImpact(true); StudioAudio.play1500Jackpot(true);
      setAmbientBg(rm === 'brain' ? 'brain' : rm === 'rem' ? 'rem' : 'rainbow'); setSunburst(true);
      const th = applyBonusModeTheme(rm, { isDespair: false });
      setBonusSceneBackdrop('1500');
      setBonusLogo(Assets.getVStock('v1500') ? 'v1500' : (rm === 'brain' ? 'rezeroPurple' : 'rezeroChain'));
      if (rm === 'brain') FxCanvas.spawnLightning('#e879f9', 5);
      else if (rm === 'rem') FxCanvas.spawnRing('#38bdf8', 300, 8);
      else FxCanvas.burstFlames(44);

      bonusSubLabel.className = th.subCls + ' drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]';
      bonusSubLabel.textContent = modeSub;
      bonusMainTitle.className = 'text-lg sm:text-2xl font-black gold-grad-text drop-shadow-[0_3px_10px_rgba(0,0,0,0.98)] pop-in';
      bonusMainTitle.textContent = `${modePrefix} 1,500 BONUS!!`;
      bonusDesc.className = 'text-[10px] sm:text-xs font-black text-amber-100 bg-black/55 px-2.5 py-0.5 rounded-full';
      bonusDesc.textContent = '払出 1,500個（純増 +1,400発）獲得！';
      if (iwakanAnswer) showIwakanAnswer(iwakanAnswer, false);
      await wait(1280, tok); setSunburst(false); setBonusSceneBackdrop(null);
      state.rushChains++; state.rushDisp += SPEC.DISP_1500; state.rushNet += SPEC.NET_1500; state.balls += SPEC.NET_1500;
      updateSessionBest(); LiveSlump.record(true); updateStatsUI();
      afterBonusReserveCheck('BONUS_1500');
    } else if (type === 'BONUS_300') {
      StudioAudio.playVImpact(false); StudioAudio.play300Sound();
      const th = applyBonusModeTheme(rm, { isDespair: true });
      setBonusSceneBackdrop('300');
      setBonusLogo(Assets.getVStock('v300') ? 'v300' : 'rezeroPurple');
      FxCanvas.spawnRing('#38bdf8', 300, 9);

      bonusSubLabel.className = th.subCls + ' drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)]';
      bonusSubLabel.textContent = '右打ち 6%';
      bonusMainTitle.className = 'text-lg sm:text-2xl font-black cyan-grad-text drop-shadow-[0_3px_10px_rgba(0,0,0,0.98)] pop-in';
      bonusMainTitle.textContent = `${modePrefix} 300 BONUS`;
      bonusDesc.className = 'text-[10px] sm:text-xs font-black text-sky-100 bg-black/55 px-2.5 py-0.5 rounded-full';
      bonusDesc.textContent = '純増 +280発 ＆ ST144回リセット！';
      if (iwakanAnswer) showIwakanAnswer(iwakanAnswer, false);
      await wait(1200, tok); setBonusSceneBackdrop(null);
      state.rushChains++; state.rushDisp += SPEC.DISP_300; state.rushNet += SPEC.NET_300; state.balls += SPEC.NET_300;
      updateSessionBest(); LiveSlump.record(true); updateStatsUI();
      afterBonusReserveCheck('BONUS_300');
    } else {
      StudioAudio.playReStart(); setBonusLogo(null);
      setBonusSceneBackdrop('restart');
      if (Assets.getVStock('restart')) {
        bonusSubLabel.textContent = ''; bonusMainTitle.textContent = ''; bonusDesc.textContent = '';
        FxCanvas.burstFlames(38);
      } else {
        lcdFrame.classList.add('fx-restart', 'mode-despair-bg');
        bonusSubLabel.textContent = '死に戻り'; bonusSubLabel.className = 'text-[10px] font-black tracking-[0.18em] text-slate-400 leading-none';
        bonusMainTitle.textContent = 'Re:Start'; bonusMainTitle.className = 'text-4xl font-black text-slate-200 pop-in';
        bonusDesc.textContent = '出玉なし・ST144回へ巻き戻し';
      }
      await wait(1260, tok);
      setBonusSceneBackdrop(null); lcdFrame.classList.remove('fx-restart');
      state.rushRestartCount++; updateStatsUI();
      afterBonusReserveCheck('RESTART');
    }
  } catch (e) { setBonusSceneBackdrop(null); }
}

function finishRush() {
  BgmEngine.cut(); StudioAudio.playFail();
  state.phase = 'ANIMATING'; setControlMode('BUSY');
  setAmbientBg(''); setCabinetGlow('idle'); setSunburst(false); setVStockBadge(false); setPremiaFrame(false); FxCanvas.setAmbient('ember');
  state.pendingResultRevival = Math.random() < 0.03;

  const logoHolder = document.getElementById('resModalLogoHolder');
  if (logoHolder) {
    const logoUrl = state.rushMode === 'brain' ? (Assets.getLogo('brainRush') || Assets.getLogo('oniRush')) : Assets.getLogo('oniRush');
    logoHolder.innerHTML = logoUrl ? `<div class="logo-alive-wrap"><div class="logo-alive-halo"></div><img src="${logoUrl}" alt="RUSH RESULT" class="logo-alive-img max-h-24"></div>` : '';
  }
  document.getElementById('resChains').textContent = `${state.rushChains} 連`;
  document.getElementById('res6000').textContent = `${state.rush6000Count} 回`;
  document.getElementById('resSpecial').textContent = `${state.rushRestartCount}回 / ${state.rushHoryurenCount}回`;
  document.getElementById('resNet').textContent = `${state.rushNet.toLocaleString()} 発`;
  const cashEst = Math.round(state.rushNet * exchangeRate);
  const lastIwakan = state.rushIwakanNotes.length > 0 ? `\n${state.rushIwakanNotes.slice(-2).join(' / ')}` : '';
  document.getElementById('resSummaryText').textContent =
    `総獲得払出 ${state.rushDisp.toLocaleString()}個（換金目安 ${cashEst.toLocaleString()}円）` +
    (state.rushWeddingCount > 0 ? `\nWEDDING 12,000 ×${state.rushWeddingCount}回!!` : '') + lastIwakan;
  resultModal.classList.remove('hidden'); updateStatsUI();
}

// =========================================================================
// スマホ親指＆PCスペース共通「長押しハンドル」
// =========================================================================
let handleActive = false, handleDelay = null, handleLoop = null, handleLocked = false;

function setHandleVisual(on) {
  ['btnTouchHandle', 'btnRushTouchHandle'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('handle-btn-active', on); });
}
function stopHandleHold(lockUntilRelease = false) {
  if (handleDelay) { clearTimeout(handleDelay); handleDelay = null; }
  if (handleLoop) { clearInterval(handleLoop); handleLoop = null; }
  if (lockUntilRelease) handleLocked = true;
  setHandleVisual(false);
  if (state.phase === 'NORMAL' && !state.autoMode) randomMissReels();
  else if (state.phase === 'RUSH' && !state.autoMode) {
    if (state.rushMode === 'onigakari') randomOniMissReels(false);
    else if (state.rushMode === 'rem') randomRemMissReels(false);
  }
}
function stepHandleSpin(isContinuous) {
  if (!resultModal.classList.contains('hidden') || !settingsModal.classList.contains('hidden')) { stopHandleHold(true); return; }
  if (state.phase === 'NORMAL') {
    stopAuto();
    const res = drawNormalSpin();
    if (res.bareType || res.isHit) { stopHandleHold(true); startNormalReach(res); }
    else {
      clearVisualEffects(); setActiveScene('normal');
      if (isContinuous) {
        setReels(Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, { spinning: [true, true, true] });
        normalTitle.textContent = `${state.currentSpin.toLocaleString()} 回転`; normalTitle.className = 'text-lg sm:text-2xl font-black text-white num-fixed';
        normalSub.textContent = '連続回転中…（演出で自動停止）';
      } else {
        randomMissReels();
        normalTitle.textContent = `${state.currentSpin.toLocaleString()} 回転`; normalTitle.className = 'text-lg sm:text-2xl font-black text-white num-fixed';
        normalSub.textContent = '通常変動中…（長押しで連続回転）';
      }
      updateStatsUI();
    }
    return;
  }
  if (state.phase === 'RUSH') {
    stopAuto();
    const ev = spinRushOnce();
    if (!ev) { stopHandleHold(true); return; }
    if (ev.type !== 'MISS' || ev.teaser) stopHandleHold(true);
    handleRushEvent(ev, { fromAuto: false });
    return;
  }
  stopHandleHold(true);
}
function beginHandlePress() {
  if (handleActive || handleLocked) return;
  handleActive = true; setHandleVisual(true);
  if (canTapUniBotan()) { handleLocked = true; triggerUniBotanTap(); setHandleVisual(false); return; }
  if (state.phase === 'REACH') {
    if (!pushButtonArea.classList.contains('hidden')) { handleLocked = true; btnOniPush.click(); setHandleVisual(false); }
    return;
  }
  stepHandleSpin(false);
  if (!handleLocked) {
    handleDelay = setTimeout(() => {
      if (!handleActive || handleLocked) return;
      handleLoop = setInterval(() => { if (!handleActive || handleLocked) { stopHandleHold(false); return; } stepHandleSpin(true); }, 60);
    }, 210);
  }
}
function endHandlePress() { handleActive = false; handleLocked = false; stopHandleHold(false); }

['btnTouchHandle', 'btnRushTouchHandle'].forEach(id => {
  const el = document.getElementById(id); if (!el) return;
  el.addEventListener('pointerdown', (e) => { e.preventDefault(); beginHandlePress(); });
  el.addEventListener('pointerup', endHandlePress);
  el.addEventListener('pointercancel', endHandlePress);
  el.addEventListener('pointerleave', endHandlePress);
});

window.addEventListener('keydown', (e) => {
  const tag = (e.target && e.target.tagName) || '';
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.code === 'KeyO' && !e.repeat) { btnSecretOk.click(); return; }
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (!e.repeat) beginHandlePress();
});
window.addEventListener('keyup', (e) => { if (e.code === 'Space') endHandlePress(); });
window.addEventListener('blur', endHandlePress);

// =========================================================================
// 「🎬 テスト ▾」＆設定モーダル
// =========================================================================
const promoTestMenu = document.getElementById('promoTestMenu');
document.getElementById('btnTestPromo').addEventListener('click', () => promoTestMenu.classList.toggle('hidden'));
document.getElementById('btnClosePromoMenu').addEventListener('click', () => promoTestMenu.classList.add('hidden'));
document.getElementById('btnOpenSettings').addEventListener('click', () => settingsModal.classList.remove('hidden'));
document.getElementById('btnCloseSettings').addEventListener('click', () => settingsModal.classList.add('hidden'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.add('hidden'); });

document.getElementById('btnDevInstantRush').addEventListener('click', () => {
  promoTestMenu.classList.add('hidden');
  stopAuto(); seqToken++; hideFullscreenOverlay(); resultModal.classList.add('hidden');
  document.getElementById('tabPlay').click();
  enterOnigakariRush(state.currentSpin || 1, false);
});
document.getElementById('btnDevInfRush').addEventListener('click', (e) => {
  infiniteRushMode = !infiniteRushMode;
  e.target.textContent = `♾️ 無限ST: ${infiniteRushMode ? 'ON' : 'OFF'}`;
  e.target.className = infiniteRushMode
    ? 'py-2 px-2 rounded-xl font-black bg-emerald-600 border border-yellow-200 text-white shadow active:scale-95 transition'
    : 'py-2 px-2 rounded-xl font-black bg-slate-900 border border-emerald-500/60 text-emerald-300 active:scale-95 transition';
  if (infiniteRushMode && state.phase === 'RUSH') { state.stRemaining = SPEC.ST_TOTAL; updateStatsUI(); }
});

let randomCrashIdx = 0, brainTestLvIdx = 0, vTestCycleIdx = 0, yakumonoTestIdx = 0;

document.querySelectorAll('.promo-test-item').forEach(btn => {
  btn.addEventListener('click', async () => {
    if (state.phase === 'ANIMATING' || state.phase === 'REACH') return;
    promoTestMenu.classList.add('hidden');
    stopAuto(); document.getElementById('tabPlay').click();

    const kind = btn.dataset.test;
    const prevPhase = state.phase, prevScene = state.activeScene, prevRMode = state.rushMode;
    const tok = ++seqToken;
    state.phase = 'ANIMATING'; setControlMode('BUSY');

    try {
      if (kind === 'yakumonoDrop') {
        const cols = ['red', 'gold', 'rainbow'];
        const col = cols[yakumonoTestIdx++ % cols.length];
        await triggerYakumonoDrop({ color: col, holdMs: 1200, withNiziiroBack: col === 'rainbow', token: tok });
      } else if (kind === 'restartRip') {
        await runGoldenPromotionSequence({
          fakeSub: '死に戻り', fakeTitle: 'Re:Start', fakeDesc: '出玉なし・ST144回へ巻き戻し',
          fakeStyle: 'despair', fakeSound: 'restart', fakeRestart: true, fakeIsRush: true, fakeBurstGold: false, rushMode: prevRMode,
          iwakanAnswer: '', finalSub: 'Re:Start 引き裂き昇格', finalTitle: '超・鬼がかり 6,000 BONUS!!',
          finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'slash', token: tok
        });
      } else if (kind === 'vstockCycle') {
        const isRed = (vTestCycleIdx++ % 2) === 1;
        await playVStockNotice({ isRed, token: tok });
      } else if (kind === 'freeze3s') {
        await runSudden3sFreeze6000(tok);
      } else if (kind === 'countup6000') {
        await runCountUpBreak6000({ rushMode: prevPhase === 'RUSH' ? prevRMode : 'onigakari', iwakanAnswer: '残り回数巻き戻り(+1)', token: tok });
      } else if (kind === 'brain4') {
        brainTestOverride = true; state.rushMode = 'brain';
        clearVisualEffects(); setActiveScene('rush-idle'); setAmbientBg('brain'); setLed('brain');
        setBrainPeteLevel(0, { withFlash: false }); setBrainTextSwarm(0); setBrainButtonState('idle');
        await wait(800, tok);
        const lvs = [5, 4, 3];
        await playBrainModeSequence({ isHit: true, is6000: true, bonusType: 'BONUS_6000', isHands: brainTestLvIdx % 3 === 0, custOchiburu: true, forceTargetLv: lvs[brainTestLvIdx++ % lvs.length], token: tok });
        await runSuddenOchiburu6000({ sub: '脳が震えるRUSH', rushMode: 'brain', skipAlarm: true, token: tok });
        brainTestOverride = false;
      } else if (kind === 'remLamp') {
        remTestOverride = true; state.rushMode = 'rem';
        clearVisualEffects(); setActiveScene('rush-idle'); setAmbientBg('rem'); setLed('rem'); setRemLampVisual('idle', { bringFront: false }); randomRemMissReels(false);
        await wait(450, tok);
        triggerRemSakibareBack({ is6000: true, pat: 'RAINBOW', countdownSpins: 3 });
        for (let step = 3; step >= 1; step--) { randomRemMissReels(true); updateReserveSlots('NORMAL', 'RAINBOW', step); await wait(360, tok); }
        await playRemTougaiBurst({ is6000: true, bonusType: 'BONUS_6000', fromSakibare: true, token: tok });
        remTestOverride = false;
      } else if (kind === 'oniApproach') {
        oniTestOverride = true; state.rushMode = 'onigakari';
        clearVisualEffects(); setActiveScene('rush-idle'); setAmbientBg('rush'); setLed('red');
        await playOniTenpaiAori({ isHit: true, is6000: true, bonusType: 'BONUS_6000', fixedDig: 7, token: tok });
        await playOniRemApproach6000(tok);
        oniTestOverride = false;
      } else if (kind === 'zeroAlign') {
        oniTestOverride = true; state.rushMode = 'onigakari';
        clearVisualEffects(); setActiveScene('rush-idle'); setAmbientBg('rush'); setLed('red');
        await playOniTenpaiAori({ isHit: true, is6000: true, bonusType: 'BONUS_6000', fixedDig: 0, token: tok });
        await runSuddenOchiburu6000({ sub: '0揃い特別違和感!!', rushMode: 'onigakari', token: tok });
        oniTestOverride = false;
      } else if (kind === 'glassFail') {
        await playGlassShatterFail(tok);
      } else if (kind === 'revivalResult') {
        await runResultRevivalSequence(tok);
      } else {
        const modes = ['slash', 'botan', 'drop', 'shatter', 'quake'];
        await runGoldenPromotionSequence({
          fakeSub: '右打ち 6%', fakeTitle: '鬼がかり 300 BONUS', fakeDesc: '実質純増 +280発 ＆ ST144回リセット！',
          fakeStyle: 'despair', fakeSound: '300', fakeRestart: false, fakeIsRush: true, fakeBurstGold: false, rushMode: prevRMode,
          iwakanAnswer: 'ひょっこり隠れレム', finalSub: '鬼がかりRUSH',
          finalTitle: '超・鬼がかり 6,000 BONUS!!', finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!',
          finalSound: '6000', crashType: modes[randomCrashIdx++ % modes.length], token: tok
        });
      }
    } catch (e) {
    } finally {
      brainTestOverride = false; remTestOverride = false; oniTestOverride = false;
      state.rushMode = prevRMode; state.phase = prevPhase;
      clearVisualEffects(); setActiveScene(prevScene);
      if (prevPhase === 'RUSH') { applyRushModeVisuals(); setControlMode('RUSH'); }
      else { FxCanvas.setAmbient('ember'); setControlMode('NORMAL'); BgmEngine.resume('normal'); }
    }
  });
});

// =========================================================================
// 実戦操作ボタン
// =========================================================================
document.getElementById('btnCloseResult').addEventListener('click', async () => {
  resultModal.classList.add('hidden');
  if (state.pendingResultRevival) {
    state.pendingResultRevival = false;
    const tok = ++seqToken; state.phase = 'ANIMATING'; setControlMode('BUSY');
    try {
      await runResultRevivalSequence(tok);
      state.rushIwakanNotes.push('リザルト死に戻り復活');
      award6000AndContinue();
      return;
    } catch (e) {}
  }

  const tags = [];
  if (state.rush6000Count > 0) tags.push(`鬼6000×${state.rush6000Count}`);
  if (state.rushWeddingCount > 0) tags.push(`WEDDING12000×${state.rushWeddingCount}`);
  if (state.rushHoryurenCount > 0) tags.push(`保留連×${state.rushHoryurenCount}`);
  if (state.rushRestartCount > 0) tags.push(`Re:Start×${state.rushRestartCount}`);
  addLog(
    `${state.rushStartSpin}回`, '鬼がかりRUSH', 'bg-amber-900/80 text-amber-200 border border-amber-400/60',
    `${state.rushChains}連${tags.length ? ` (${tags.join('/')})` : ''}`,
    `${state.rushDisp.toLocaleString()}個 (${state.rushNet.toLocaleString()}発)`, 'text-amber-300'
  );

  state.phase = 'NORMAL'; state.reserveQueue = []; state.stLookaheadQueue = []; state.remSakibareActive = false;
  clearVisualEffects(); FxCanvas.setAmbient('ember'); updateReserveSlots('NORMAL');
  if (rushMetaHud) rushMetaHud.classList.add('hidden');
  if (rushModeBar) rushModeBar.classList.add('hidden');
  if (rushStatusBar) rushStatusBar.classList.add('hidden');
  setVStockBadge(false);
  setActiveScene('normal');
  normalTitle.textContent = '通常時'; normalTitle.className = 'text-lg sm:text-2xl font-black text-white';
  normalSub.textContent = '鬼がかりRUSH終了！次の先バレを狙おう！';
  setControlMode('NORMAL'); BgmEngine.resume('normal'); updateStatsUI(); LiveSlump.record(true);
});

document.getElementById('btnSpin1').addEventListener('click', () => { if (state.phase === 'NORMAL') { stopAuto(); stepHandleSpin(false); } });

document.getElementById('btnAutoSakibare').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  if (state.autoMode === 'SAKIBARE') { stopAuto(); randomMissReels(); return; }
  stopAuto(); state.autoMode = 'SAKIBARE'; setActiveScene('normal');
  document.getElementById('btnAutoSakibare').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    for (let i = 0; i < 5; i++) { const res = drawNormalSpin(); if (res.bareType || res.isHit) { startNormalReach(res); return; } }
    setReels(Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, { spinning: [true, true, true] });
    normalTitle.textContent = `${state.currentSpin.toLocaleString()} 回転`; normalTitle.className = 'text-lg sm:text-2xl font-black text-white num-fixed';
    normalSub.textContent = '先バレ待機中… 高速回転中！'; updateStatsUI();
  }, 36);
});

document.getElementById('btnAutoHit').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  if (state.autoMode === 'HIT') { stopAuto(); randomMissReels(); return; }
  stopAuto(); state.autoMode = 'HIT'; setActiveScene('normal');
  document.getElementById('btnAutoHit').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    for (let i = 0; i < 14; i++) {
      const res = drawNormalSpin();
      if (res.isHit) { startNormalReach(res); return; }
      else if (res.bareType) { state.sakibareTotal++; addLog(`${state.currentSpin}回`, '先バレ', 'bg-rose-950 text-rose-300 border border-rose-700', '当りオート中スキップ', 'ハズレ', 'text-slate-400'); }
    }
    setReels(Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, { spinning: [true, true, true] });
    normalTitle.textContent = `${state.currentSpin.toLocaleString()} 回転`; normalTitle.className = 'text-lg sm:text-2xl font-black text-white num-fixed';
    normalSub.textContent = '大当りまで高速オート消化中…'; updateStatsUI();
  }, 36);
});

document.getElementById('btnResetPlay').addEventListener('click', () => {
  seqToken++; stopAuto(); stopHandleHold(false); hideFullscreenOverlay(); resultModal.classList.add('hidden');
  if (rushModeBar) rushModeBar.classList.add('hidden');
  if (rushStatusBar) rushStatusBar.classList.add('hidden');
  if (rushMetaHud) rushMetaHud.classList.add('hidden');
  setVStockBadge(false);
  Object.assign(state, {
    phase: 'NORMAL', currentSpin: 0, totalNormalSpins: 0, firstHits: 0, rushHits: 0, sakibareTotal: 0, sakibareWins: 0,
    totalInvestYen: 0, balls: 0, unspentFrac: 0, pendingReach: null, pendingRushHit: null, pendingResultRevival: false,
    hasVStock: false, hasVStockRed: false, reserveQueue: [], stLookaheadQueue: [], remSakibareActive: false, stRemaining: 0,
    rushChains: 0, rushDisp: 0, rushNet: 0, rush6000Count: 0, rushWeddingCount: 0, rushHoryurenCount: 0, rushRestartCount: 0,
    rushIwakanNotes: [], sessionGraphPoints: [0], sessionMaxChains: 0, sessionMaxOneShot: 0, _spinsSinceGraphSample: 0, history: []
  });
  clearVisualEffects(); FxCanvas.clearAll(); FxCanvas.setAmbient('ember');
  updateReserveSlots('NORMAL'); setActiveScene('normal'); setReels(7, 3, 7);
  normalTitle.textContent = 'STANDBY'; normalTitle.className = 'text-lg sm:text-2xl font-black text-white';
  normalSub.textContent = 'データをリセットしました。';
  document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="4" class="py-4 text-center text-amber-200/50">まだ履歴はありません。</td></tr>';
  setControlMode('NORMAL'); BgmEngine.resume('normal'); updateStatsUI(); LiveSlump.draw();
});

function startRushAutoLoop() {
  if (state.phase !== 'RUSH') return;
  stopAuto(); state.autoMode = 'RUSH';
  document.getElementById('btnRushAuto').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    if (state.phase !== 'RUSH') { stopAuto(); return; }
    handleRushEvent(spinRushOnce(), { fromAuto: true });
  }, 55);
}

document.getElementById('btnRush1').addEventListener('click', () => { if (state.phase === 'RUSH') { stopAuto(); handleRushEvent(spinRushOnce(), { fromAuto: false }); } });
document.getElementById('btnRushAuto').addEventListener('click', () => { if (state.phase !== 'RUSH') return; if (state.autoMode === 'RUSH') { stopAuto(); return; } startRushAutoLoop(); });
document.getElementById('btnRushSkip').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  stopAuto(); let guard = 0;
  while (state.phase === 'RUSH' && state.stRemaining > 0 && guard < 1500) {
    guard++; const ev = spinRushOnce();
    if (!ev || ev.type !== 'MISS') { handleRushEvent(ev, { fromAuto: false }); return; }
  }
});

// カスタム切替
document.getElementById('toggleSakibare').addEventListener('click', e => {
  state.custSakibare = !state.custSakibare;
  e.target.textContent = `🔥 先バレ40%: ${state.custSakibare ? 'ON' : 'OFF'}`;
  e.target.className = state.custSakibare ? 'py-2.5 px-1 rounded-xl text-[10px] font-black border transition bg-rose-700/85 border-rose-400 text-white shadow active:scale-95' : 'py-2.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('toggleOchiburu').addEventListener('click', e => {
  state.custOchiburu = !state.custOchiburu;
  e.target.textContent = `💥 落ちブルUP: ${state.custOchiburu ? 'ON' : 'OFF'}`;
  e.target.className = state.custOchiburu ? 'py-2.5 px-1 rounded-xl text-[10px] font-black border transition bg-amber-600/70 border-amber-300 text-amber-50 active:scale-95' : 'py-2.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('togglePremier').addEventListener('click', e => {
  state.custPremier = !state.custPremier;
  e.target.textContent = `🌈 プレミアUP: ${state.custPremier ? 'ON' : 'OFF'}`;
  e.target.className = state.custPremier ? 'py-2.5 px-1 rounded-xl text-[10px] font-black border transition bg-fuchsia-700/75 border-fuchsia-300 text-white shadow active:scale-95' : 'py-2.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.querySelectorAll('.rmode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.rushMode = btn.dataset.rmode;
    document.querySelectorAll('.rmode-btn').forEach(b => { b.className = 'rmode-btn py-1.5 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95 whitespace-nowrap'; });
    btn.className = 'rmode-btn py-1.5 px-1 rounded-xl text-[11px] font-black border transition bg-rose-700/80 border-amber-300 text-white active:scale-95 whitespace-nowrap';
    applyRushModeVisuals();
  });
});
document.getElementById('toggleRushTrust').addEventListener('click', e => {
  state.rushCustTrust = !state.rushCustTrust;
  e.target.textContent = `🎯 信頼度先バレ: ${state.rushCustTrust ? 'ON' : 'OFF'}`;
  e.target.className = state.rushCustTrust ? 'py-2.5 px-1 rounded-xl text-[10px] font-black border transition bg-cyan-700/80 border-cyan-300 text-white shadow active:scale-95' : 'py-2.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('toggleRushIwakan').addEventListener('click', e => {
  state.rushCustIwakan = !state.rushCustIwakan;
  e.target.textContent = `👁️ 違和感UP: ${state.rushCustIwakan ? 'ON' : 'OFF'}`;
  e.target.className = state.rushCustIwakan ? 'py-2.5 px-1 rounded-xl text-[10px] font-black border transition bg-purple-700/80 border-fuchsia-300 text-white shadow active:scale-95' : 'py-2.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('toggleRushNoNotice').addEventListener('click', e => {
  state.rushCustNoNotice = !state.rushCustNoNotice;
  e.target.textContent = `🤫 予告無し: ${state.rushCustNoNotice ? 'ON' : 'OFF'}`;
  e.target.className = state.rushCustNoNotice ? 'py-2.5 px-1 rounded-xl text-[10px] font-black border transition bg-amber-700/80 border-amber-300 text-white shadow active:scale-95' : 'py-2.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
  applyRushModeVisuals();
});

// =========================================================================
// タブ2：初当たり100回高速シミュレーター
// =========================================================================
let lastSimPoints = [];
function runSim100() {
  const HITS = 100;
  let totalSpins = 0, maxHamari = 0, whaleCount = 0, rushCount = 0;
  let totalRushWins = 0, count6000 = 0, horyurenCount = 0, weddingCount = 0;
  let maxPayoutDisp = 0, maxPayoutNet = 0, cumDiff = 0;
  const points = [0], diffs = [];
  const densa140Prob = 1 - Math.pow(1 - SPEC.ST_PROB, SPEC.ST_DENSA);

  for (let i = 0; i < HITS; i++) {
    const spins = Math.floor(Math.log(1 - Math.random()) / Math.log(1 - SPEC.NORMAL_PROB)) + 1;
    totalSpins += spins; if (spins > maxHamari) maxHamari = spins;
    const investBalls = spins * (250 / rotRate);
    let payoutDisp = 0, payoutNet = 0, inRush = false, prevType = null;

    const rH = Math.random();
    if (rH < SPEC.H_3000_RUSH) { whaleCount++; payoutDisp = SPEC.DISP_3000; payoutNet = SPEC.NET_3000; inRush = true; prevType = 'INIT_3000'; }
    else if (rH < SPEC.RUSH_ENTRY) { payoutDisp = SPEC.DISP_1500; payoutNet = SPEC.NET_1500; inRush = true; prevType = 'INIT_1500'; }
    else { payoutDisp = SPEC.DISP_1500; payoutNet = SPEC.NET_1500; }

    if (inRush) {
      rushCount++; let active = true;
      while (active) {
        const r4 = drawReserve4(); let hitBonus = null;
        if (r4.hit) {
          hitBonus = r4.bonusType;
          const isWed = (prevType === 'BONUS_6000' && hitBonus === 'BONUS_6000');
          if (isWed) { weddingCount++; horyurenCount++; }
          else if (hitBonus !== 'RESTART' && Math.random() < SPEC.HORYUREN_NOTICE_RATE) horyurenCount++;
        } else if (Math.random() < densa140Prob) hitBonus = drawRushBonusType();
        else { active = false; break; }
        totalRushWins++;
        if (hitBonus === 'BONUS_6000') { count6000++; payoutDisp += SPEC.DISP_6000; payoutNet += SPEC.NET_6000; }
        else if (hitBonus === 'BONUS_1500') { payoutDisp += SPEC.DISP_1500; payoutNet += SPEC.NET_1500; }
        else if (hitBonus === 'BONUS_300') { payoutDisp += SPEC.DISP_300; payoutNet += SPEC.NET_300; }
        prevType = hitBonus;
      }
    }
    if (payoutDisp > maxPayoutDisp) { maxPayoutDisp = payoutDisp; maxPayoutNet = payoutNet; }
    const oneDiff = payoutNet - investBalls;
    diffs.push(oneDiff); cumDiff += oneDiff; points.push(Math.round(cumDiff));
  }

  lastSimPoints = points;
  const mean = diffs.reduce((a, b) => a + b, 0) / HITS;
  const stdDev = Math.round(Math.sqrt(diffs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / HITS));

  document.getElementById('simTotalSpins').textContent = `${totalSpins.toLocaleString()} (1/${(totalSpins / HITS).toFixed(1)})`;
  document.getElementById('simMaxHamari').textContent = `${maxHamari.toLocaleString()} 回`;
  document.getElementById('simWhaleCount').textContent = `${whaleCount} 回 (理論10)`;
  document.getElementById('simRushRate').textContent = `${rushCount}% (${rushCount}回)`;
  const pct6000 = totalRushWins > 0 ? ((count6000 / totalRushWins) * 100).toFixed(1) : '0.0';
  document.getElementById('sim6000Count').textContent = `${count6000}回 (${pct6000}%)`;
  document.getElementById('simHoryurenCount').textContent = `${horyurenCount} 回`;
  document.getElementById('simWeddingCount').textContent = `${weddingCount} 回`;
  document.getElementById('simMaxPayout').textContent = `${maxPayoutDisp.toLocaleString()} (${maxPayoutNet.toLocaleString()})`;
  document.getElementById('simStdDev').textContent = `±${stdDev.toLocaleString()}発`;

  const finalBalls = points[points.length - 1], finalYen = Math.round(finalBalls * exchangeRate);
  const balEl = document.getElementById('simFinalBalance');
  balEl.textContent = `${finalBalls >= 0 ? '+' : ''}${finalBalls.toLocaleString()}発 (${finalYen >= 0 ? '+' : ''}${finalYen.toLocaleString()}円)`;
  balEl.className = `text-xs sm:text-sm font-black mt-0.5 num-fixed ${finalBalls >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  const peak = Math.max(...points), bottom = Math.min(...points);
  document.getElementById('simPeakBottom').textContent = `最高: ${peak >= 0 ? '+' : ''}${peak.toLocaleString()} / 最低: ${bottom >= 0 ? '+' : ''}${bottom.toLocaleString()}`;
  const exp6000 = totalRushWins * SPEC.R_6000, diff6000 = count6000 - exp6000;
  document.getElementById('simDiagnosis').innerHTML = `
    <div class="font-black text-amber-300 mb-1">🎯 鬼がかり6000＆残保留WEDDING 12,000 診断</div>
    <p>右打ち総当選 <strong>${totalRushWins}回</strong> 中、鬼がかり6000は <strong>${count6000}回（${pct6000}%）</strong>（理論 ${exp6000.toFixed(1)}回 ／ 差 <strong class="${diff6000 >= 0 ? 'text-emerald-300' : 'text-rose-400'}">${diff6000 >= 0 ? '+' : ''}${diff6000.toFixed(1)}回</strong>）。保留連告知 <strong>${horyurenCount}回</strong>、WEDDING 12,000は <strong>${weddingCount}回</strong> でした。</p>
  `;
  drawSlumpChart(points);
}

function drawSlumpChart(points) {
  const canvas = document.getElementById('slumpChartCanvas');
  if (!canvas || !points || points.length === 0) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2), rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d'); ctx.scale(dpr, dpr);
  const w = rect.width, h = rect.height, padL = 48, padR = 12, padT = 16, padB = 22, chartW = w - padL - padR, chartH = h - padT - padB;
  ctx.clearRect(0, 0, w, h);

  const minVal = Math.min(0, ...points), maxVal = Math.max(0, ...points), range = Math.max(25000, maxVal - minVal);
  const yMin = minVal - range * 0.08, yMax = maxVal + range * 0.08;
  const toX = i => padL + (i / (points.length - 1)) * chartW, toY = v => padT + ((yMax - v) / (yMax - yMin)) * chartH, zeroY = toY(0);

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.12)'; ctx.lineWidth = 1; ctx.font = '10px Inter, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) { const val = yMin + ((yMax - yMin) / 4) * i, y = toY(val); ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke(); ctx.fillText(`${Math.round(val / 1000)}k`, padL - 5, y + 3); }
  ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center'; [0, 25, 50, 75, 100].forEach(idx => ctx.fillText(`${idx}回`, toX(idx), h - 5));

  function fillArea(pos) {
    ctx.save(); ctx.beginPath();
    if (pos) ctx.rect(padL, padT, chartW, Math.max(0, zeroY - padT)); else ctx.rect(padL, zeroY, chartW, Math.max(0, (h - padB) - zeroY));
    ctx.clip(); ctx.beginPath(); points.forEach((v, i) => { const x = toX(i), y = toY(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
    ctx.lineTo(toX(points.length - 1), zeroY); ctx.lineTo(toX(0), zeroY); ctx.closePath();
    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    if (pos) { grad.addColorStop(0, 'rgba(250, 204, 21, 0.50)'); grad.addColorStop(1, 'rgba(250, 204, 21, 0.05)'); }
    else { grad.addColorStop(0, 'rgba(225, 29, 72, 0.12)'); grad.addColorStop(1, 'rgba(225, 29, 72, 0.52)'); }
    ctx.fillStyle = grad; ctx.fill(); ctx.restore();
  }
  fillArea(true); fillArea(false);

  ctx.lineWidth = 2.2;
  for (let i = 1; i < points.length; i++) {
    ctx.beginPath(); ctx.moveTo(toX(i - 1), toY(points[i - 1])); ctx.lineTo(toX(i), toY(points[i]));
    ctx.strokeStyle = (points[i] >= 0 && points[i - 1] >= 0) ? '#facc15' : (points[i] < 0 && points[i - 1] < 0) ? '#f43f5e' : '#fb923c';
    ctx.stroke();
  }
}

// =========================================================================
// 設定・サウンド・タブ同期
// =========================================================================
document.getElementById('btnTestPokyun').addEventListener('click', () => {
  StudioAudio.playPokyun(false); setAmbientBg('redbare'); triggerLamp('red', 'ポキュ↑ーン↓');
  lcdFrame.classList.remove('fx-redbare', 'shake-burst'); void lcdFrame.offsetWidth;
  lcdFrame.classList.add('fx-redbare', 'shake-burst'); FxCanvas.burstFlames(34);
  setTimeout(() => { if (state.phase === 'NORMAL') { setAmbientBg(''); setCabinetGlow('idle'); setYakumonoColor('white'); } }, 1100);
});
document.getElementById('btnTest1500').addEventListener('click', () => StudioAudio.play1500Jackpot(true));
document.getElementById('btnTestOchiburu').addEventListener('click', () => StudioAudio.playOchiburu(true));
document.getElementById('btnTestPuchun').addEventListener('click', () => { BgmEngine.cut(); StudioAudio.playPuchun(); });

document.getElementById('btnToggleBgm').addEventListener('click', e => {
  const on = BgmEngine.toggle();
  e.target.textContent = on ? '🎵 BGM ON' : '🔇 BGM OFF';
  e.target.className = on ? 'py-1.5 rounded-lg text-[10px] font-black bg-emerald-950 text-emerald-300 border border-emerald-500/60 active:scale-95' : 'py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700 active:scale-95';
});
document.getElementById('sliderReverbWet').addEventListener('input', e => { const v = parseInt(e.target.value, 10); document.getElementById('valReverbWet').textContent = `${v}%`; StudioAudio.setReverbWet(v / 100); });
document.getElementById('sliderPeakBright').addEventListener('input', e => { const v = parseFloat(e.target.value); document.getElementById('valPeakBright').textContent = `${v.toFixed(2)}x`; StudioAudio.setPeakBright(v); });
document.getElementById('sliderDownBend').addEventListener('input', e => { const v = parseInt(e.target.value, 10); document.getElementById('valDownBend').textContent = `${v}%`; StudioAudio.setDownBend(v / 100); });
document.getElementById('sliderPoEmphasis').addEventListener('input', e => { const v = parseInt(e.target.value, 10); document.getElementById('valPoEmphasis').textContent = `${v}%`; StudioAudio.setPoEmphasis(v / 100); });
document.getElementById('sliderGrit').addEventListener('input', e => { const v = parseInt(e.target.value, 10); document.getElementById('valGrit').textContent = `${v}%`; StudioAudio.setGrit(v / 100); });
document.getElementById('sliderVolume').addEventListener('input', e => { const v = parseInt(e.target.value, 10); document.getElementById('valVolume').textContent = `${v}%`; StudioAudio.setVolume(v / 100); });
document.getElementById('sliderBgmVolume').addEventListener('input', e => { const v = parseInt(e.target.value, 10); document.getElementById('valBgmVolume').textContent = `${v}%`; BgmEngine.setVolume(v / 100); });

document.getElementById('btnResetTuner').addEventListener('click', () => {
  document.getElementById('sliderReverbWet').value = 44; document.getElementById('valReverbWet').textContent = '44%'; StudioAudio.setReverbWet(AUDIO_DEFAULTS.reverbWet);
  document.getElementById('sliderPeakBright').value = 0.73; document.getElementById('valPeakBright').textContent = '0.73x'; StudioAudio.setPeakBright(AUDIO_DEFAULTS.peakBright);
  document.getElementById('sliderDownBend').value = 115; document.getElementById('valDownBend').textContent = '115%'; StudioAudio.setDownBend(AUDIO_DEFAULTS.downBend);
  document.getElementById('sliderPoEmphasis').value = 160; document.getElementById('valPoEmphasis').textContent = '160%'; StudioAudio.setPoEmphasis(AUDIO_DEFAULTS.poEmphasis);
  document.getElementById('sliderGrit').value = 115; document.getElementById('valGrit').textContent = '115%'; StudioAudio.setGrit(AUDIO_DEFAULTS.grit);
  document.getElementById('sliderVolume').value = 80; document.getElementById('valVolume').textContent = '80%'; StudioAudio.setVolume(AUDIO_DEFAULTS.volume);
  document.getElementById('sliderBgmVolume').value = 65; document.getElementById('valBgmVolume').textContent = '65%'; BgmEngine.setVolume(0.65);
  StudioAudio.playPokyun(false);
});
document.getElementById('btnMute').addEventListener('click', e => {
  const m = StudioAudio.toggleMute(); BgmEngine.setGlobalMute(m);
  e.target.textContent = m ? '🔇 全音 OFF' : '🔊 全音 ON';
  e.target.className = m ? 'py-1.5 rounded-lg text-[10px] font-black bg-slate-900 text-rose-400 border border-slate-700 active:scale-95' : 'py-1.5 rounded-lg text-[10px] font-black bg-slate-800 text-emerald-300 border border-slate-600 active:scale-95';
});
document.getElementById('tabPlay').addEventListener('click', () => {
  document.getElementById('playModeContainer').classList.remove('hidden');
  document.getElementById('sim100Container').classList.add('hidden');
  document.getElementById('tabPlay').className = 'flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all bg-gradient-to-r from-rose-700 via-amber-600 to-yellow-600 text-white shadow border border-yellow-200/60';
  document.getElementById('tabSim100').className = 'flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all bg-[#1e0d08]/90 text-amber-200/70 hover:text-amber-100 border border-amber-900/60';
  setTimeout(() => { FxCanvas.resize(); StageBg.resize(); LiveSlump.draw(); }, 30);
});
document.getElementById('tabSim100').addEventListener('click', () => {
  stopAuto();
  document.getElementById('playModeContainer').classList.add('hidden');
  document.getElementById('sim100Container').classList.remove('hidden');
  document.getElementById('tabSim100').className = 'flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all bg-gradient-to-r from-amber-600 via-rose-600 to-red-800 text-white shadow border border-yellow-200/60';
  document.getElementById('tabPlay').className = 'flex-1 py-2 rounded-xl text-[11px] sm:text-xs font-black transition-all bg-[#1e0d08]/90 text-amber-200/70 hover:text-amber-100 border border-amber-900/60';
  if (lastSimPoints.length === 0) runSim100(); else setTimeout(() => drawSlumpChart(lastSimPoints), 30);
});
document.getElementById('btnRunSim100').addEventListener('click', runSim100);

function syncRotRate(v) {
  rotRate = parseFloat(v);
  document.getElementById('rotRateSlider').value = rotRate; document.getElementById('simRotSlider').value = rotRate;
  document.getElementById('rotRateDisplay').textContent = `${rotRate.toFixed(1)} 回/1k`;
  document.getElementById('simRotDisplay').textContent = `${rotRate.toFixed(1)} 回/1k`;
}
document.getElementById('rotRateSlider').addEventListener('input', e => syncRotRate(e.target.value));
document.getElementById('simRotSlider').addEventListener('input', e => syncRotRate(e.target.value));

function syncExchangeRate(rate) {
  exchangeRate = parseFloat(rate);
  document.querySelectorAll('.rate-btn, .sim-rate-btn').forEach(b => {
    const active = Math.abs(parseFloat(b.dataset.rate) - exchangeRate) < 0.01;
    b.className = `${b.classList.contains('sim-rate-btn') ? 'sim-rate-btn py-1.5' : 'rate-btn py-1.5'} rounded-lg text-[10px] border transition ${active ? 'font-black bg-rose-700/75 border-amber-400 text-white' : 'font-bold bg-slate-900 border-slate-700 text-slate-400'}`;
  });
  updateStatsUI();
}
document.querySelectorAll('.rate-btn, .sim-rate-btn').forEach(btn => btn.addEventListener('click', () => syncExchangeRate(btn.dataset.rate)));
window.addEventListener('resize', () => {
  LiveSlump.draw();
  if (lastSimPoints.length > 0 && !document.getElementById('sim100Container').classList.contains('hidden')) drawSlumpChart(lastSimPoints);
});

// =========================================================================
// ★ウェディング12,000 超プレミア完全版（全画面暗転ジャック維持）★
// =========================================================================
(function initWeddingCinemaV70() {
  const SCENE_FILES = [
    { name: 'wed space.jpg', portrait: true,  dur: 2400, pan: 'zoomIn',  bell: true  },
    { name: 'pur.jpg',       portrait: true,  dur: 1450, pan: 'panUp',   harp: 0     },
    { name: 'kur.jpg',       portrait: true,  dur: 1450, pan: 'zoomOut', harp: 1     },
    { name: 'mur.jpg',       portrait: true,  dur: 1450, pan: 'panUp',   harp: 2     },
    { name: 'bea.jpg',       portrait: true,  dur: 1450, pan: 'zoomIn',  harp: 3     },
    { name: 'ram.jpg',       portrait: true,  dur: 1550, pan: 'panUp',   harp: 4     },
    { name: 'rem.jpg',       portrait: true,  dur: 1850, pan: 'zoomIn',  harp: 5     },
    { name: 'emi.jpg',       portrait: true,  dur: 1950, pan: 'zoomIn',  harp: 6     }
  ];

  const loadedScenes = new Array(SCENE_FILES.length).fill(null);
  let directWedBtn = null;

  SCENE_FILES.forEach((item, idx) => {
    const url = encodeURI(item.name);
    const im = new Image(); im.onload = () => { loadedScenes[idx] = url; }; im.src = url;
  });
  (() => { const im = new Image(); im.onload = () => { directWedBtn = 'wed_botan.jpg'; }; im.src = 'wed_botan.jpg'; })();

  const WeddingAudio = (() => {
    let ctx = null, padNodes = [];
    function getVol() {
      const muteBtn = document.getElementById('btnMute');
      if (muteBtn && muteBtn.textContent.includes('OFF')) return 0;
      const sl = document.getElementById('sliderVolume');
      return Math.max(0, Math.min(1, sl ? parseInt(sl.value, 10) / 100 : 0.80));
    }
    function ensure() {
      if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function startHolyPad() {
      stopPad(); const v = getVol(); if (v <= 0.01) return; const c = ensure(); if (!c) return;
      const now = c.currentTime + 0.02;
      const master = c.createGain(); master.gain.setValueAtTime(0.001, now); master.gain.linearRampToValueAtTime(v * 0.22, now + 2.2);
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1150, now); lp.connect(master).connect(c.destination);
      const oscs = [174.61, 220.00, 261.63, 329.63, 392.00].map((hz, i) => {
        const o = c.createOscillator(); o.type = i % 2 === 0 ? 'triangle' : 'sine'; o.frequency.setValueAtTime(hz, now); o.detune.value = (i - 2) * 4;
        const g = c.createGain(); g.gain.value = i === 0 ? 0.30 : 0.16; o.connect(g).connect(lp); o.start(now); return o;
      });
      padNodes.push({ master, oscs, ctx: c });
    }
    function stopPad(fadeSec = 0.8) {
      padNodes.forEach(p => {
        try {
          const now = p.ctx.currentTime;
          p.master.gain.cancelScheduledValues(now); p.master.gain.setValueAtTime(Math.max(0.001, p.master.gain.value), now);
          p.master.gain.exponentialRampToValueAtTime(0.0001, now + fadeSec);
          p.oscs.forEach(o => { try { o.stop(now + fadeSec + 0.05); } catch (e) {} });
        } catch (e) {}
      });
      padNodes = [];
    }
    function playBell(pitchMul = 1.0) {
      const v = getVol(); if (v <= 0.01) return; const c = ensure(); if (!c) return;
      const now = c.currentTime + 0.01, base = 523.25 * pitchMul;
      [1, 2, 2.4, 3.0, 4.2].forEach((ratio, idx) => {
        const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(base * ratio, now);
        const amp = (v * 0.20) / (idx + 1), decay = 2.6 / (1 + idx * 0.55);
        g.gain.setValueAtTime(0.0001, now); g.gain.linearRampToValueAtTime(amp, now + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
        o.connect(g).connect(c.destination); o.start(now); o.stop(now + decay + 0.05);
      });
    }
    function playHarpStep(stepIdx = 0) {
      const v = getVol(); if (v <= 0.01) return; const c = ensure(); if (!c) return;
      const now = c.currentTime + 0.01;
      const roots = [349.23, 392.00, 440.00, 466.16, 523.25, 587.33, 698.46];
      const root = roots[Math.min(roots.length - 1, Math.max(0, stepIdx))];
      [root, root * 1.25, root * 1.5, root * 2.0].forEach((hz, i) => {
        const st = now + i * 0.065, o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(hz, st);
        g.gain.setValueAtTime(0.0001, st); g.gain.linearRampToValueAtTime(v * 0.16, st + 0.014); g.gain.exponentialRampToValueAtTime(0.0001, st + 1.25);
        o.connect(g).connect(c.destination); o.start(st); o.stop(st + 1.30);
      });
    }
    return { startHolyPad, stopPad, playBell, playHarpStep };
  })();

  if (!document.getElementById('wedding-v70-css')) {
    const st = document.createElement('style');
    st.id = 'wedding-v70-css';
    st.textContent = `
      @keyframes wedCamZoomIn  { 0% { transform: scale(1.00); } 100% { transform: scale(1.09); } }
      @keyframes wedCamZoomOut { 0% { transform: scale(1.10); } 100% { transform: scale(1.01); } }
      @keyframes wedCamPanUp   { 0% { transform: scale(1.08) translateY(2.2%); } 100% { transform: scale(1.08) translateY(-2.2%); } }
      @keyframes wedRainbowBorderFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
      @keyframes wedHolyFlashSlow { 0% { opacity: 0.92; } 35% { opacity: 0.45; } 100% { opacity: 0; } }
      @keyframes wedFeatherFall { 0% { transform: translate3d(0, -10vh, 0) rotate(0deg); opacity: 0; } 12% { opacity: 0.95; } 88% { opacity: 0.92; } 100% { transform: translate3d(var(--dx), 112vh, 0) rotate(var(--rot)); opacity: 0; } }
      @keyframes wedGensituIn { 0% { opacity: 0; transform: scale(0.94) translateY(10px); filter: brightness(1.6) blur(3px); } 55% { opacity: 0.85; transform: scale(1.00) translateY(0); filter: brightness(1.18) blur(0px); } 100% { opacity: 1; transform: scale(1.02) translateY(0); filter: brightness(1.04) blur(0px); } }
      @keyframes wedCrystalPulse { 0%, 100% { opacity: 0.45; transform: translate(-50%, -50%) scale(0.92); } 50% { opacity: 0.94; transform: translate(-50%, -50%) scale(1.08); } }
      @keyframes wedShockRing { 0% { opacity: 0.95; transform: translate(-50%, -50%) scale(0.55); border-width: 3px; } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.58); border-width: 1px; } }
      @keyframes wedPushFloat { 0%, 100% { transform: translate(-50%, -50%) scale(1.00); } 50% { transform: translate(-50%, -50%) scale(1.09); } }

      .wed-cam-zoomIn  { animation: wedCamZoomIn  4.2s ease-out forwards; }
      .wed-cam-zoomOut { animation: wedCamZoomOut 4.2s ease-out forwards; }
      .wed-cam-panUp   { animation: wedCamPanUp   4.2s ease-out forwards; }
      .wed-gensitu-in  { animation: wedGensituIn  2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      .wed-layer { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; opacity: 0; transition: opacity 0.65s cubic-bezier(0.37, 0, 0.63, 1); }
      .wed-layer.wed-active { opacity: 1; }
      .wed-rainbow-shell { position: relative; z-index: 10; padding: 4px; border-radius: 18px; background: linear-gradient(125deg, #fffbeb, #fef08a, #f472b6, #c084fc, #7dd3fc, #6ee7b7, #facc15, #fffbeb); background-size: 300% 300%; animation: wedRainbowBorderFlow 2.2s linear infinite; box-shadow: 0 0 28px rgba(254,240,138,0.85), 0 0 60px rgba(244,114,182,0.55), 0 0 90px rgba(125,211,252,0.45); display: flex; align-items: center; justify-content: center; }
      .wed-rainbow-inner { position: relative; width: 100%; height: 100%; border-radius: 14px; overflow: hidden; background: #140804; }
      .wed-rainbow-inner::after { content: ''; position: absolute; inset: 0; border-radius: 14px; pointer-events: none; z-index: 15; box-shadow: inset 0 0 22px 4px rgba(254, 249, 195, 0.52); }
      .wed-shell-portrait { width: calc(100vw - 12px); height: calc(100dvh - 12px); max-width: 100vw; max-height: 100dvh; }
      @media (min-width: 640px) { .wed-shell-portrait { width: auto; height: 94vh; aspect-ratio: 9 / 16; max-width: 92vw; } }
      .wed-shell-landscape { max-width: calc(100vw - 14px); max-height: 86dvh; }
      @media (min-width: 640px) { .wed-shell-landscape { max-width: 88vw; max-height: 90vh; } }
      .wed-btn-tap-zone { position: absolute; bottom: 0; left: 0; right: 0; height: 55%; border: none; background: transparent; padding: 0; z-index: 25; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
      .wed-btn-visual-anchor { position: absolute; top: 44%; left: 50%; transform: translate(-50%, -50%); width: 72%; aspect-ratio: 1.25 / 1; pointer-events: none; transition: transform 0.08s ease; }
      .wed-btn-tap-zone:active .wed-btn-visual-anchor { transform: translate(-50%, -50%) scale(0.94); }
      .wed-btn-crystal-glow { position: absolute; top: 50%; left: 50%; width: 72%; aspect-ratio: 1.45 / 1; border-radius: 50%; background: radial-gradient(ellipse at center, rgba(255,255,255,0.95) 0%, rgba(254,249,195,0.62) 45%, rgba(250,204,21,0.18) 72%, transparent 100%); mix-blend-mode: screen; pointer-events: none; animation: wedCrystalPulse 1.1s ease-in-out infinite; }
      .wed-btn-wave { position: absolute; top: 50%; left: 50%; width: 78%; aspect-ratio: 1.35 / 1; border-radius: 50%; border: 3px solid rgba(254, 249, 195, 0.95); box-shadow: 0 0 18px rgba(253, 224, 71, 0.85), inset 0 0 12px rgba(255, 255, 255, 0.6); pointer-events: none; animation: wedShockRing 1.35s cubic-bezier(0.16, 1, 0.3, 1) infinite; }
      .wed-btn-wave-2 { animation-delay: 0.67s; }
      .wed-btn-push-text { position: absolute; top: 50%; left: 50%; font-family: 'Inter', 'Noto Sans JP', sans-serif; font-size: clamp(22px, 6.8vw, 34px); font-weight: 900; letter-spacing: 0.14em; color: #fffbeb; text-shadow: 0 2px 0 #78350f, 0 -1px 0 #78350f, 2px 0 0 #78350f, -2px 0 0 #78350f, 0 0 16px rgba(245, 158, 11, 1), 0 4px 12px rgba(0, 0, 0, 0.78); pointer-events: none; animation: wedPushFloat 1.1s ease-in-out infinite; }
      .wed-feather { position: absolute; top: -6vh; pointer-events: none; z-index: 22; border-radius: 50%; background: radial-gradient(ellipse at center, #ffffff 30%, #fef9c3 85%, transparent 100%); box-shadow: 0 0 12px rgba(254, 240, 138, 0.9); animation: wedFeatherFall var(--dur) linear var(--delay) infinite; }
      .wed-flash-veil { position: absolute; inset: 0; z-index: 35; pointer-events: none; background: radial-gradient(circle at center, #ffffff 0%, #fef9c3 60%, rgba(254,240,138,0.85) 100%); animation: wedHolyFlashSlow 0.85s ease-out forwards; }
    `;
    document.head.appendChild(st);
  }

  function buildFeathersHtml(count = 28) {
    let html = '';
    for (let i = 0; i < count; i++) {
      const left = (Math.random() * 100).toFixed(1), w = (10 + Math.random() * 14).toFixed(0), h = (w * 0.34).toFixed(0);
      const dur = (3.8 + Math.random() * 3.4).toFixed(2), delay = (-Math.random() * 5.0).toFixed(2);
      const dx = ((Math.random() - 0.5) * 150).toFixed(0) + 'px', rot = (160 + Math.random() * 280).toFixed(0) + 'deg';
      html += `<div class="wed-feather" style="left:${left}%;width:${w}px;height:${h}px;--dur:${dur}s;--delay:${delay}s;--dx:${dx};--rot:${rot};"></div>`;
    }
    return html;
  }
  function buildPremiaLayerHtml() {
    const premiaUrl = Assets.getPremiaFrame();
    return premiaUrl ? `<img src="${premiaUrl}" class="pointer-events-none absolute inset-0 w-full h-full object-fill z-[16]" style="mix-blend-mode:screen;" alt="">` : '';
  }
  function buildSlideInnerHtml(src, { portrait = true, pan = 'zoomIn' } = {}) {
    const shellCls = portrait ? 'wed-rainbow-shell wed-shell-portrait' : 'wed-rainbow-shell wed-shell-landscape';
    const imgCls = portrait ? 'w-full h-full object-cover' : 'block max-w-full max-h-[84dvh] w-auto h-auto object-contain';
    return `
      <img src="${src}" class="absolute inset-0 w-full h-full object-cover blur-2xl opacity-55 scale-115 pointer-events-none" alt="">
      <div class="absolute inset-0 bg-gradient-to-b from-amber-200/15 via-transparent to-amber-200/20 pointer-events-none"></div>
      <div class="${shellCls}"><div class="wed-rainbow-inner"><img src="${src}" class="${imgCls} ${pan ? `wed-cam-${pan}` : ''}" alt="">${buildPremiaLayerHtml()}</div></div>
    `;
  }

  window.playWedding12000Cinema = async function (token) {
    const el = weddingCinemaOverlay;
    if (!el) return;
    el.className = 'fixed inset-0 z-[1002] bg-black flex items-center justify-center overflow-hidden';
    el.innerHTML = `
      <div id="wedAmbientRays" class="mystic-prism-rays"></div>
      <div id="wedSlot0" class="wed-layer" style="z-index: 10;"></div>
      <div id="wedSlot1" class="wed-layer" style="z-index: 10;"></div>
      <div id="wedFeatherHost" class="pointer-events-none absolute inset-0 overflow-hidden z-[22] opacity-0 transition-opacity duration-1000"></div>
      <div id="wedTopUiHost" class="pointer-events-none absolute inset-0 z-[28] flex items-center justify-center"></div>
      <div id="wedFlashHost" class="pointer-events-none absolute inset-0 z-[35]"></div>
    `;
    el.classList.remove('hidden');

    const slots = [document.getElementById('wedSlot0'), document.getElementById('wedSlot1')];
    const ambientRays = document.getElementById('wedAmbientRays'), featherHost = document.getElementById('wedFeatherHost');
    const topUiHost = document.getElementById('wedTopUiHost'), flashHost = document.getElementById('wedFlashHost');
    let curSlot = 0;

    function fireSoftFlash(strong = false) {
      const f = document.createElement('div'); f.className = 'wed-flash-veil';
      if (!strong) f.style.opacity = '0.55';
      flashHost.appendChild(f); setTimeout(() => f.remove(), 900);
    }
    function crossfadeTo(innerHtml, { flash = true, strongFlash = false } = {}) {
      const nextSlot = 1 - curSlot;
      slots[nextSlot].innerHTML = innerHtml; slots[nextSlot].style.zIndex = '12'; slots[curSlot].style.zIndex = '10';
      void slots[nextSlot].offsetWidth;
      slots[nextSlot].classList.add('wed-active'); slots[curSlot].classList.remove('wed-active');
      if (flash) fireSoftFlash(strongFlash); curSlot = nextSlot;
    }

    try {
      BgmEngine.cut(); StudioAudio.playPuchun(); setLed('off'); setAmbientBg(''); setSunburst(false);
      await waitFreeze(1450, token);
      SoftSparkle.start(); WeddingAudio.startHolyPad(); await waitFreeze(950, token);

      const bg1 = Assets.getWedding('bg1'), gensitu = Assets.getWedding('gensitu');
      WeddingAudio.playBell(1.0); ambientRays.classList.add('rays-on');
      crossfadeTo(bg1 ? buildSlideInnerHtml(bg1, { portrait: true, pan: 'zoomIn' }) : `<div class="w-full h-full overlay-wedding"></div>`, { flash: true, strongFlash: true });
      await waitFreeze(1350, token);

      fireSoftFlash(false);
      topUiHost.innerHTML = gensitu
        ? `<div class="logo-alive-wrap wed-gensitu-in px-3"><div class="logo-alive-halo"></div><img src="${gensitu}" class="logo-alive-img max-w-[90vw] sm:max-w-[540px] max-h-[38vh]" alt="言質、取りました"></div>`
        : `<div class="font-mincho text-3xl sm:text-5xl font-black gold-grad-text wed-gensitu-in text-center px-4">言質、取りました<br>もう引っ込められませんよ？</div>`;
      await waitFreeze(3800, token);

      topUiHost.innerHTML = ''; featherHost.innerHTML = buildFeathersHtml(24); featherHost.style.opacity = '0.85';
      const fallback9 = Assets.getWedding9();
      for (let i = 0; i < SCENE_FILES.length; i++) {
        const cfg = SCENE_FILES[i], src = loadedScenes[i] || encodeURI(cfg.name) || fallback9[i] || null;
        if (!src) continue;
        if (cfg.bell) WeddingAudio.playBell(1.25);
        if (typeof cfg.harp === 'number') WeddingAudio.playHarpStep(cfg.harp);
        crossfadeTo(buildSlideInnerHtml(src, { portrait: cfg.portrait, pan: cfg.pan }), { flash: true, strongFlash: i === 0 || i >= SCENE_FILES.length - 2 });
        await waitFreeze(cfg.dur, token);
      }

      const stairs = Assets.getWedding('stairs');
      if (stairs) { WeddingAudio.playBell(1.12); crossfadeTo(buildSlideInnerHtml(stairs, { portrait: false, pan: 'panUp' }), { flash: true, strongFlash: true }); await waitFreeze(2100, token); }
      const arch = Assets.getWedding('arch');
      if (arch) { WeddingAudio.playHarpStep(6); crossfadeTo(buildSlideInnerHtml(arch, { portrait: false, pan: 'zoomIn' }), { flash: true, strongFlash: true }); await waitFreeze(2300, token); }

      WeddingAudio.stopPad(1.2); StudioAudio.playSoftHeartbeat();
      const wedBtn = directWedBtn || Assets.getWedding('btn') || 'wed_botan.jpg';
      crossfadeTo(`
        <img src="${wedBtn}" class="absolute inset-0 w-full h-full object-cover blur-2xl opacity-55 scale-115 pointer-events-none" alt="">
        <div class="absolute inset-0 bg-gradient-to-b from-amber-300/15 via-transparent to-amber-300/20 pointer-events-none"></div>
        <div class="wed-rainbow-shell wed-shell-portrait"><div class="wed-rainbow-inner">
          <img src="${wedBtn}" class="w-full h-full object-cover" alt="ウェディングボタン">${buildPremiaLayerHtml()}
          <button id="weddingTapHotspot" class="wed-btn-tap-zone" aria-label="ウェディングボタンを押す">
            <div class="wed-btn-visual-anchor"><span class="wed-btn-wave"></span><span class="wed-btn-wave wed-btn-wave-2"></span><span class="wed-btn-crystal-glow"></span><span class="wed-btn-push-text">PUSH</span></div>
          </button>
        </div></div>
        <div class="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1 rounded-full bg-black/75 border border-yellow-200/90 text-[11px] sm:text-xs font-black text-amber-200 whitespace-nowrap shadow-xl">ボタンをタップ / Spaceで誓いを結べ!!</div>
      `, { flash: true, strongFlash: true });

      await new Promise((resolve, reject) => {
        const hs = document.getElementById('weddingTapHotspot');
        const done = () => { uniBotanTapResolver = null; if (token !== seqToken) reject('CANCELLED'); else resolve(); };
        if (hs) hs.addEventListener('click', done, { once: true });
        uniBotanTapResolver = done;
      });

      StudioAudio.playOchiburu(true); StudioAudio.playPokyun(true); WeddingAudio.playBell(1.5);
      setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow'); triggerLamp('rainbow', '12,000!!');
      featherHost.innerHTML = buildFeathersHtml(34); featherHost.style.opacity = '1';

      const wedOni = Assets.getWedding('onigakari');
      crossfadeTo(wedOni ? buildSlideInnerHtml(wedOni, { portrait: true, pan: 'zoomIn' }) : `<div class="font-mincho text-4xl font-black rainbow-grad-text">鬼がかってますね</div>`, { flash: true, strongFlash: true });
      await waitFreeze(4400, token);

      StudioAudio.play6000Fanfare(true); WeddingAudio.playBell(1.0);
      setTimeout(() => WeddingAudio.playBell(1.25), 420); setTimeout(() => WeddingAudio.playBell(1.50), 860);
      const wedLogo = Assets.getLogo('wedding');
      crossfadeTo(`
        <div class="relative w-full h-full overlay-wedding flex flex-col items-center justify-center text-center p-4 overflow-hidden">
          <div class="mystic-prism-rays rays-on"></div>${buildPremiaLayerHtml()}
          <div class="relative z-10 text-xs sm:text-base font-black tracking-[0.28em] text-rose-600 mb-2">PREMIUM WEDDING BONUS</div>
          ${wedLogo ? `<div class="relative z-10 logo-alive-wrap"><div class="logo-alive-halo"></div><img src="${wedLogo}" class="logo-alive-img max-w-[94vw] sm:max-w-[580px] max-h-[48vh]" alt="WEDDING 12000"></div>` : `<div class="relative z-10 font-mincho text-4xl sm:text-6xl font-black text-rose-700 pop-in">WEDDING 12,000 BONUS!!</div>`}
          <div class="relative z-10 mt-4 text-sm sm:text-base font-black text-rose-900 bg-white/80 px-5 py-2 rounded-full border-2 border-amber-300 shadow-lg">鬼がかり6,000＋6,000 ＝ 計12,000個（実質純増 +11,200発）!!</div>
        </div>
      `, { flash: true, strongFlash: true });
      await waitFreeze(5000, token);
    } finally {
      WeddingAudio.stopPad(0.6); SoftSparkle.stop();
      el.classList.add('hidden'); el.innerHTML = ''; uniBotanTapResolver = null;
    }
  };
})();

// ★開発者用隠しコマンド：左上の「鬼2」アイコンを5回連打でウェディング12,000テスト再生★
(function initSecretWeddingTest() {
  const icon = document.querySelector('header .w-7.h-7');
  if (!icon) return;
  let taps = 0, tapTimer = null, running = false;
  icon.style.cursor = 'pointer';
  icon.addEventListener('click', async () => {
    if (running || state.phase === 'ANIMATING' || state.phase === 'REACH') return;
    taps++; clearTimeout(tapTimer); tapTimer = setTimeout(() => { taps = 0; }, 1200);
    if (taps < 5) return;
    taps = 0; running = true;
    stopAuto(); stopHandleHold(true);
    const prevPhase = state.phase, prevScene = state.activeScene;
    const tok = ++seqToken; state.phase = 'ANIMATING'; setControlMode('BUSY');
    try { await playWedding12000Cinema(tok); } catch (e) {}
    finally {
      running = false; state.phase = prevPhase; clearVisualEffects(); setActiveScene(prevScene);
      if (prevPhase === 'RUSH') { applyRushModeVisuals(); setControlMode('RUSH'); }
      else { FxCanvas.setAmbient('ember'); setControlMode('NORMAL'); BgmEngine.resume('normal'); }
    }
  });
})();

// 初期表示
LiveSlump.mount();
LiveSlump.draw();
setActiveScene('normal');
setReels(7, 3, 7);
updateStatsUI();
