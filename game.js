// =========================================================================
// game.js : 公式スペック抽選・RUSH進行・100回シミュレーター・UI制御
// =========================================================================

// 1. 公式スペック定数（厳密数理仕様）
const SPEC = {
  NORMAL_PROB: 1 / 349.9,   // 通常時図柄揃い
  H_3000_RUSH: 0.10,        // 10% (実質1/3,499): 白鯨3,000個＋RUSH直行
  H_1500_RUSH: 0.45,        // 45%: 1,500個＋RUSH
  H_1500_NORM: 0.45,        // 45%: 1,500個通常（時短なし）
  RUSH_ENTRY: 0.55,

  ST_TOTAL: 144,            // ST144回 = 残保留4個 + 電サポ140回
  ST_RESERVE: 4,            // 残保留4個（各1/99.9 厳密独立抽選）
  ST_DENSA: 140,            // 電サポ140回（各1/99.9）
  ST_PROB: 1 / 99.9,

  R_6000: 0.25,             // 25%: 鬼がかり6000
  R_1500: 0.55,             // 55%: 鬼がかり1500
  R_300: 0.06,              // 6%:  鬼がかり300
  R_RESTART: 0.14,          // 14%: Re:Start（0発・ST144リセット）

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

// 厳密な残保留4個独立抽選（各1/99.9、4個以内当選率 ≒ 3.94%）
function drawReserve4() {
  for (let i = 1; i <= SPEC.ST_RESERVE; i++) {
    if (Math.random() < SPEC.ST_PROB) {
      return { hit: true, hitIndex: i, bonusType: drawRushBonusType() };
    }
  }
  return { hit: false, hitIndex: 0, bonusType: null };
}

// =========================================================================
// ゲーム状態＆UI系DOM参照
// =========================================================================
let rotRate = 16.5;
let exchangeRate = 4.0;

const state = {
  phase: 'NORMAL',          // 'NORMAL' | 'REACH' | 'RUSH' | 'ANIMATING'
  activeScene: 'normal',    // 'normal' | 'reach' | 'rush-idle' | 'bonus'
  custSakibare: true,
  custOchiburu: true,
  custPremier: false,
  rushMode: 'onigakari',

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
  stRemaining: 0,
  rushChains: 0,
  rushDisp: 0,
  rushNet: 0,
  rush6000Count: 0,
  rushWeddingCount: 0,
  rushHoryurenCount: 0,
  rushRestartCount: 0,
  rushStartSpin: 0,

  autoMode: null,
  autoTimer: null,
  history: []
};

const resultModal = document.getElementById('resultModal');
const stateBadge = document.getElementById('stateBadge');
const normalSpinWrap = document.getElementById('normalSpinWrap');
const currentSpinDisplay = document.getElementById('currentSpinDisplay');
const stRemainingWrap = document.getElementById('stRemainingWrap');
const stHudRemain = document.getElementById('stHudRemain');

const normalTitle = document.getElementById('normalTitle');
const normalSub = document.getElementById('normalSub');

const reachYokokuBadge = document.getElementById('reachYokokuBadge');
const reachTitle = document.getElementById('reachTitle');
const reachSub = document.getElementById('reachSub');
const btnPushMain = document.getElementById('btnPushMain');
const btnPushSub = document.getElementById('btnPushSub');
const pushHintText = document.getElementById('pushHintText');

const rushModeBanner = document.getElementById('rushModeBanner');
const rushBigRemain = document.getElementById('rushBigRemain');
const rushIdleSub = document.getElementById('rushIdleSub');

const rushStatusBar = document.getElementById('rushStatusBar');
const normalControls = document.getElementById('normalControls');
const rushControls = document.getElementById('rushControls');
const busyNotice = document.getElementById('busyNotice');
const normalCustomPanel = document.getElementById('normalCustomPanel');
const rushCustomPanel = document.getElementById('rushCustomPanel');

// =========================================================================
// 投資・ステータス・ログ管理
// =========================================================================
function consumeNormalBall() {
  const ballsPerSpin = 250 / rotRate;
  state.unspentFrac += ballsPerSpin;
  const whole = Math.floor(state.unspentFrac);
  state.unspentFrac -= whole;
  if (state.balls >= whole) {
    state.balls -= whole;
  } else {
    const deficit = whole - state.balls;
    state.balls = 0;
    const units = Math.ceil(deficit / 125);
    state.totalInvestYen += units * 500;
    state.balls += units * 125 - deficit;
  }
}

function setControlMode(mode) {
  normalControls.classList.toggle('hidden', mode !== 'NORMAL');
  rushControls.classList.toggle('hidden', mode !== 'RUSH');
  busyNotice.classList.toggle('hidden', mode === 'NORMAL' || mode === 'RUSH');
  const isRushGroup = (mode === 'RUSH' || (mode === 'BUSY' && state.stRemaining > 0));
  normalCustomPanel.classList.toggle('hidden', isRushGroup);
  rushCustomPanel.classList.toggle('hidden', !isRushGroup);
}

function stopAuto() {
  state.autoMode = null;
  if (state.autoTimer) { clearInterval(state.autoTimer); state.autoTimer = null; }
  document.getElementById('btnAutoSakibare').textContent = '🔥 先バレオート';
  document.getElementById('btnAutoHit').textContent = '⚡ 当りオート';
  document.getElementById('btnRushAuto').textContent = '⚡ RUSHオート';
}

function updateStatsUI() {
  currentSpinDisplay.textContent = state.currentSpin;
  stHudRemain.textContent = state.stRemaining;
  rushBigRemain.textContent = state.stRemaining;

  document.getElementById('dashSpins').textContent = `${state.currentSpin} / ${state.totalNormalSpins}`;
  document.getElementById('dashInvest').textContent = `${state.totalInvestYen.toLocaleString()}円`;
  document.getElementById('dashBalls').textContent = `${Math.floor(state.balls).toLocaleString()}発`;

  const cash = Math.round(state.balls * exchangeRate);
  const bal = cash - state.totalInvestYen;
  const balEl = document.getElementById('dashBalance');
  balEl.textContent = `${bal >= 0 ? '+' : ''}${bal.toLocaleString()}円`;
  balEl.className = `text-xs sm:text-sm font-black ${bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-white'}`;

  document.getElementById('statHits').textContent = `${state.firstHits} / ${state.rushHits}`;
  const sbPct = state.sakibareTotal > 0 ? Math.round((state.sakibareWins / state.sakibareTotal) * 100) : '-';
  document.getElementById('statSakibare').textContent = `${state.sakibareWins}/${state.sakibareTotal} (${sbPct}%)`;

  document.getElementById('rushChainDisplay').textContent = `${state.rushChains}連`;
  document.getElementById('rushDispDisplay').textContent = `${state.rushDisp.toLocaleString()}個`;
  document.getElementById('rushNetDisplay').textContent = `${state.rushNet.toLocaleString()}発`;
  document.getElementById('rush6000Display').textContent = `${state.rush6000Count}回`;
}

function addLog(spinTxt, tag, tagCls, detail, resTxt, resCls) {
  state.history.unshift({ spinTxt, tag, tagCls, detail, resTxt, resCls });
  if (state.history.length > 60) state.history.pop();
  document.getElementById('historyTableBody').innerHTML = state.history.map(h => `
    <tr class="hover:bg-rose-950/30">
      <td class="py-1.5 px-1.5 font-bold text-slate-300 whitespace-nowrap">${h.spinTxt}</td>
      <td class="py-1.5 px-1.5 whitespace-nowrap"><span class="px-1.5 py-0.5 rounded text-[10px] font-black ${h.tagCls}">${h.tag}</span></td>
      <td class="py-1.5 px-1.5 text-rose-100/90">${h.detail}</td>
      <td class="py-1.5 px-1.5 text-right font-black whitespace-nowrap ${h.resCls}">${h.resTxt}</td>
    </tr>
  `).join('');
}

// =========================================================================
// 通常時抽選＆演出フロー
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
    if (r < SPEC.H_3000_RUSH) hesoType = '3000_RUSH'; // 10% (実質1/3,499 白鯨直行)
    else if (r < SPEC.RUSH_ENTRY) hesoType = '1500_RUSH'; // 45%
    else hesoType = '1500_NORM'; // 45%
  }

  // 先バレ40%（占有率92%・厳密整合）
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

  // 通常時の落ちブル発生 ＝ 3,000BONUS（RUSH直行）濃厚のみ（1,500やハズレでは一切鳴らさない）
  const ochiburu = is3000 && Math.random() < (state.custOchiburu ? 0.88 : 0.22);

  const isPremier = isHit && state.custPremier && !is3000 && Math.random() < 0.45;
  const tenpaiNum = is3000 ? 7
    : hesoType === '1500_RUSH' ? [3, 5, 7, 2, 4][Math.floor(Math.random() * 5)]
    : [2, 4, 6, 1, 3][Math.floor(Math.random() * 5)];

  let isWhale = false, badge = '', title = '', sub = '';
  if (is3000) {
    isWhale = true;
    badge = '🐋 白鯨襲来（1/3,499 超激熱!!）';
    title = '白鯨攻略戦';
    sub = '霧の魔獣を討伐せよ!! 勝利で鬼がかり3000＋RUSH直行!!';
  } else if (isPremier) {
    badge = '🌈 プレミア・鬼がかってますね予告（濃厚!!）';
    title = '鬼がかったやり方SP「vs ウルガルム」';
    sub = 'レム虹カットイン出現!!
