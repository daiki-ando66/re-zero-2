// =========================================================================
// game.js : 公式スペック抽選・RUSH4モード＋違和感＋ぶっ飛び演出・100回シミュ
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
  HORYUREN_NOTICE_RATE: 0.50, // WEDDING以外の残保留当選を即「保留連」告知する確率（独立乱数）

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
function drawReserve4Slots() {
  const slots = [];
  for (let i = 1; i <= SPEC.ST_RESERVE; i++) {
    if (Math.random() < SPEC.ST_PROB) {
      slots.push({ hit: true, hitIndex: i, bonusType: drawRushBonusType() });
      break;
    } else {
      slots.push({ hit: false, hitIndex: i, bonusType: null });
    }
  }
  return slots;
}

// 100回シミュレーター用の残保留4個独立抽選
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
  rushMode: 'onigakari',    // 'onigakari' | 'brain' | 'rem' | 'zero'

  // RUSH専用カスタム
  rushCustTrust: false,     // 🎯 信頼度先バレ
  rushCustIwakan: true,     // 👁️ 違和感UP
  rushCustNoNotice: false,  // 🤫 予告無し（出たら6000濃厚）

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
  reserveQueue: [],
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

// ★当選回数ラベルを「RUSH突入 / 初当り（分子 / 分母）」へ変更★
(function patchStatHitsLabel() {
  const el = document.getElementById('statHits');
  if (el && el.previousElementSibling) {
    el.previousElementSibling.textContent = 'RUSH突入 / 初当り';
  }
})();

// ★RUSHカスタムパネルを4モード（＋ゼロかRUSH）＆3カスタムバーへ自動拡張★
(function enhanceRushCustomPanelUI() {
  if (!rushCustomPanel || document.getElementById('rushExtraCustomRow')) return;

  rushCustomPanel.classList.remove('grid-cols-3');
  rushCustomPanel.classList.add('grid-cols-4');
  const zeroBtn = document.createElement('button');
  zeroBtn.dataset.rmode = 'zero';
  zeroBtn.className = 'rmode-btn py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
  zeroBtn.textContent = '⚡ ゼロか';
  rushCustomPanel.appendChild(zeroBtn);

  const extraRow = document.createElement('div');
  extraRow.id = 'rushExtraCustomRow';
  extraRow.className = 'hidden grid grid-cols-3 gap-1.5 mt-1.5 pt-1.5 border-t border-rose-950/80';
  extraRow.innerHTML = `
    <button id="toggleRushTrust" class="py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95">
      🎯 信頼度先バレ: OFF
    </button>
    <button id="toggleRushIwakan" class="py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-purple-700/80 border-fuchsia-300 text-white shadow active:scale-95">
      👁️ 違和感UP: ON
    </button>
    <button id="toggleRushNoNotice" class="py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95">
      🤫 予告無し: OFF
    </button>
  `;
  rushCustomPanel.parentElement.appendChild(extraRow);
})();

const rushExtraCustomRow = document.getElementById('rushExtraCustomRow');

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
  if (rushExtraCustomRow) rushExtraCustomRow.classList.toggle('hidden', !isRushGroup);
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

  // 分子／分母：RUSH突入 / 初当り
  document.getElementById('statHits').textContent = `${state.rushHits} / ${state.firstHits}`;
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
    sub = 'レム虹カットイン出現!! 脳が震える一撃を叩き込め!!';
  } else if (isHit) {
    const r = Math.random();
    if (r < 0.35) {
      badge = '💙 鬼がかってますね予告（信頼度98%）';
      title = '鬼がかったやり方SP「vs ウルガルム」';
      sub = '激熱群パーティクル通過!! 最終PUSHへ!!';
    } else if (r < 0.70) {
      badge = '🔥 鬼がかり予告（信頼度75%）';
      title = '鬼がかったやり方SP「vs ペテルギウス」';
      sub = '巨大カットイン炸裂!! 運命のPUSHを叩け!!';
    } else {
      badge = '🔥 鬼がかり予告（信頼度70%）';
      title = '鬼がかったやり方SP「vs エルザ」';
      sub = '赤タイトル＆激熱チャンスアップ!!';
    }
  } else {
    const r = Math.random();
    if (r < 0.35) {
      badge = '🔥 鬼がかり予告（信頼度75%）';
      title = '鬼がかったやり方SP「vs ペテルギウス」';
      sub = '大チャンス到来!! 押し切れ!!';
    } else if (r < 0.70) {
      badge = '🔥 鬼がかり予告（信頼度65%）';
      title = '鬼がかったやり方SP「vs エルザ」';
      sub = '期待度急上昇!! 運命のジャッジ!!';
    } else {
      badge = '⚔ 抗えチャンス（信頼度32%）';
      title = '抗えSPリーチ';
      sub = '死の運命に抗え!!';
    }
  }
  return { isHit, hesoType, bareType, is3000, isWhale, isPremier, ochiburu, tenpaiNum, badge, title, sub, secretRevealed: false };
}

async function startNormalReach(res) {
  stopAuto();
  const tok = ++seqToken;
  state.phase = 'REACH';
  setControlMode('BUSY');
  clearVisualEffects();
  setActiveScene('reach');

  const sc = buildNormalScenario(res);
  state.pendingReach = sc;

  if (sc.bareType === 'rainbow') {
    state.sakibareTotal++;
    StudioAudio.playPokyun(true);
    triggerLamp('rainbow', '🌈 虹バレ!!');
    updateReserveSlots('NORMAL', 'RAINBOW');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst');
    FxCanvas.burstRainbow(56);
    reachYokokuBadge.textContent = '🌈 虹ポキュ↑ーン↓!!（3000濃厚!!）';
    reachYokokuBadge.className = 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/85 border border-amber-300 rainbow-grad-text shadow-lg';
    reachTitle.textContent = '虹ポキュ↑ーン↓!!';
    reachTitle.className = 'font-mincho text-3xl sm:text-4xl font-black rainbow-grad-text cutin-slam';
    reachSub.textContent = `${state.currentSpin}回転目で至福の虹先バレ炸裂!!`;
  } else if (sc.bareType === 'red') {
    state.sakibareTotal++;
    StudioAudio.playPokyun(false);
    triggerLamp('red', '先バレ40%');
    updateReserveSlots('NORMAL', 'RED');
    lcdFrame.classList.add('fx-redbare', 'shake-burst');
    FxCanvas.burstFlames(34);
    reachYokokuBadge.textContent = '🔥 先バレ発生（期待度40%）';
    reachYokokuBadge.className = 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-950/90 border border-rose-400 text-rose-200 shadow-lg';
    reachTitle.textContent = 'ポキュ↑ーン↓!!';
    reachTitle.className = 'text-3xl sm:text-5xl font-black crimson-grad-text cutin-slam';
    reachSub.textContent = `${state.currentSpin}回転目・赤鬼保留出現！SPリーチへ発展…`;
  } else {
    reachYokokuBadge.textContent = '⚡ サプライズSP発展!!';
    reachYokokuBadge.className = 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/85 border border-amber-400 text-amber-300';
    reachTitle.textContent = 'リーチ発展!!';
    reachTitle.className = 'text-3xl font-black gold-grad-text pop-in';
    reachSub.textContent = `${state.currentSpin}回転目から激熱展開!!`;
  }
  updateStatsUI();

  try {
    await wait(800, tok);
    lcdFrame.classList.remove('shake-burst');

    if (sc.isWhale) {
      StudioAudio.playWhaleSiren();
      lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      triggerLamp('rainbow', '白鯨襲来!!');
      FxCanvas.spawnLightning('#38bdf8', 4);
    } else if (sc.isPremier) {
      lcdFrame.classList.add('fx-rainbow');
      triggerLamp('rainbow', 'プレミア!!');
      FxCanvas.burstRainbow(42);
    } else {
      FxCanvas.burstFlames(24);
    }

    reachYokokuBadge.textContent = sc.badge;
    reachYokokuBadge.className = (sc.isWhale || sc.isPremier)
      ? 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/90 border border-amber-300 rainbow-grad-text shadow-lg'
      : 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/90 border border-amber-400/80 text-amber-300 shadow-lg';
    reachTitle.textContent = sc.title;
    reachTitle.className = sc.isWhale
      ? 'font-mincho text-2xl sm:text-4xl font-black gold-grad-text cutin-slam px-2'
      : 'font-mincho text-xl sm:text-3xl font-black text-white cutin-slam px-2';
    reachSub.textContent = sc.sub;

    pushButtonArea.classList.remove('hidden');
    btnPushMain.textContent = 'PUSH';
    btnPushSub.textContent = sc.isWhale ? '白鯨討伐' : '当落ジャッジ';
    pushHintText.textContent = sc.isWhale
      ? 'タップで白鯨を撃破せよ!!'
      : 'PUSHタップで当落ジャッジ！（右下のOKボタンで裏告知可）';

    if (sc.ochiburu) {
      await wait(380, tok);
      StudioAudio.playOchiburu();
      lcdFrame.classList.add('shake-intense', 'fx-gold');
      btnOniPush.classList.add('ochiburu-dome', 'push-dome-gold');
      setLed('rainbow');
      FxCanvas.spawnRing('#facc15', 300, 9);
      FxCanvas.spawnLightning('#fde047', 4);
      reachYokokuBadge.textContent = '💥【落ちブル発動!!】3000BONUS＋RUSH濃厚!!';
      reachYokokuBadge.className = 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
    }
  } catch (e) {}
}

btnOniPush.addEventListener('click', () => {
  if (state.phase === 'REACH') resolveNormalReach();
});

// 独立配置された「OK（裏ボタン）」：通常時リーチ中＋RUSH中の切り裂き先行告知に対応
btnSecretOk.addEventListener('click', () => {
  // ① 通常時リーチ中の先行告知
  if (state.phase === 'REACH') {
    const sc = state.pendingReach;
    if (!sc || sc.secretRevealed || sc.ochiburu) return;
    if (!sc.isHit) return;

    sc.secretRevealed = true;
    if (sc.is3000) {
      sc.ochiburu = true;
      StudioAudio.playOchiburu();
      lcdFrame.classList.add('shake-intense', 'fx-gold');
      btnOniPush.classList.add('ochiburu-dome', 'push-dome-gold');
      triggerLamp('rainbow', '3000濃厚!!');
      setLed('rainbow');
      FxCanvas.spawnRing('#facc15', 300, 9);
      FxCanvas.spawnLightning('#fde047', 5);
      FxCanvas.burstRainbow(54);
      reachYokokuBadge.textContent = '💥【OK裏ボタン→落ちブル!!】3000＋RUSH濃厚!!';
      reachYokokuBadge.className = 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
      pushHintText.textContent = '3000BONUS濃厚!! 表のPUSHで図柄揃いへ!!';
    } else {
      StudioAudio.playKyuin();
      lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      triggerLamp('rainbow', '一発告知!!');
      FxCanvas.spawnLightning('#fde047', 4);
      FxCanvas.burstRainbow(48);
      reachYokokuBadge.textContent = '🌈【OK裏ボタン一発告知!!】キュイン!!';
      reachYokokuBadge.className = 'mb-1.5 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/95 border border-amber-300 rainbow-grad-text shadow-lg pop-in';
      pushHintText.textContent = '大当り濃厚!! 表のPUSHで図柄揃いへ!!';
    }
    return;
  }

  // ② RUSH中の煽り・違和感発生中に押すと、6,000当選時のみ落ちブル先行告知（1,500以下・ハズレは無反応）
  if (state.pendingRushHit && state.pendingRushHit.type === 'BONUS_6000' && !state.pendingRushHit.okRevealed) {
    state.pendingRushHit.okRevealed = true;
    StudioAudio.playOchiburu();
    triggerLamp('rainbow', 'OK 6000!!');
    FxCanvas.spawnLightning('#fde047', 5);
    rushTopBadge.classList.remove('hidden');
    rushTopBadge.textContent = '💥【OK裏ボタン切り裂き確定!!】鬼がかり6000濃厚!!';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in';
  }
});

async function resolveNormalReach() {
  const sc = state.pendingReach;
  if (!sc) return;
  state.pendingReach = null;
  const tok = ++seqToken;

  lcdFrame.classList.remove('shake-intense', 'shake-burst');
  btnOniPush.classList.remove('ochiburu-dome', 'push-dome-gold');
  updateReserveSlots('NORMAL');

  if (!sc.isHit) {
    StudioAudio.playFail();
    clearVisualEffects();
    state.phase = 'NORMAL';
    setActiveScene('normal');
    randomMissReels();
    normalTitle.textContent = 'ハズレ…';
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-slate-400';
    normalSub.textContent = `${sc.title}で敗北。次のポキュ↑ーン↓に期待！`;
    setControlMode('NORMAL');
    if (sc.bareType) {
      addLog(`${state.currentSpin}回`, '先バレ', 'bg-rose-950 text-rose-300 border border-rose-700', sc.title, 'ハズレ', 'text-slate-400');
    }
    updateStatsUI();
    return;
  }

  if (sc.bareType) state.sakibareWins++;
  state.firstHits++;
  state.phase = 'ANIMATING';
  updateStatsUI();

  // ★初当たり確定の瞬間：虹色バースト＆虹色祝福★
  fireRainbowBurst('🌈 初当り!!');

  try {
    if (sc.hesoType === '3000_RUSH') {
      await runGoldenPromotionSequence({
        fakeSub: '🌈 図柄揃い大当り!! 🌈',
        fakeTitle: '鬼がかり 1,500 BONUS!!',
        fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
        fakeStyle: 'gold',
        fakeIsRush: false,
        fakeBurstGold: true,
        finalSub: '🐋 白鯨討伐・1/3,499降臨!! 🐋',
        finalTitle: '鬼がかり 3,000 BONUS!!',
        finalExtra: '払出 3,000個（純増 2,800発）＋ 鬼がかりRUSH直行!!',
        finalSound: '3000',
        token: tok
      });
      enterOnigakariRush(state.currentSpin, true);
    } else if (sc.hesoType === '1500_RUSH') {
      const isRevival = Math.random() < 0.35;
      if (isRevival) {
        await runGoldenPromotionSequence({
          fakeSub: '鬼がかりジャッジ失敗…',
          fakeTitle: '通常 1,500 BONUS',
          fakeDesc: 'RUSH非突入（実質純増 +1,400発の持ち玉獲得）',
          fakeStyle: 'despair',
          fakeIsRush: false,
          fakeBurstGold: false,
          finalSub: '🔥 逆転死に戻り復活!! 🔥',
          finalTitle: '鬼がかりRUSH 突入!!',
          finalExtra: '払出 1,500個（純増 1,400発）＋ ST144回獲得!!',
          finalSound: '6000',
          token: tok
        });
        enterOnigakariRush(state.currentSpin, false);
      } else {
        // 初当たりRUSH突入：虹色オーバーレイ＆虹パーティクルでド派手に祝福
        StudioAudio.play1500Jackpot(false);
        showFullscreenOverlay({
          mode: 'rainbow',
          sub: '🌈 鬼がかりジャッジ成功!! 🌈',
          main: '鬼がかりRUSH 突入!!',
          extra: '払出 1,500個（純増 1,400発）＋ ST144回獲得!!'
        });
        FxCanvas.burstRainbow(75);
        await wait(1650, tok);
        hideFullscreenOverlay();
        enterOnigakariRush(state.currentSpin, false);
      }
    } else {
      // 通常1,500（非突入）でも初当たり確定の虹フラッシュ後に表示
      StudioAudio.play1500Jackpot(false);
      setActiveScene('bonus');
      lcdFrame.classList.add('mode-despair-bg');
      bonusSubLabel.textContent = '鬼がかりジャッジ失敗…';
      bonusSubLabel.className = 'text-[11px] font-black text-slate-400 mb-1.5';
      bonusMainTitle.textContent = '通常 1,500 BONUS';
      bonusMainTitle.className = 'text-3xl font-black text-slate-200';
      bonusDesc.textContent = 'RUSH非突入（実質純増 +1,400発の持ち玉獲得）';
      await wait(1400, tok);

      state.balls += SPEC.NET_1500;
      const hitSpin = state.currentSpin;
      state.currentSpin = 0;
      state.phase = 'NORMAL';
      clearVisualEffects();
      setActiveScene('normal');
      setReels(sc.tenpaiNum, sc.tenpaiNum, sc.tenpaiNum);
      normalTitle.textContent = '通常 1,500 終了';
      normalTitle.className = 'text-2xl font-black text-amber-200';
      normalSub.textContent = '純増1,400発を持って通常時へ！次の初当たりを狙おう！';
      setControlMode('NORMAL');
      addLog(`${hitSpin}回`, '初当り(通常)', 'bg-slate-800 text-amber-200 border border-amber-700/60', sc.title, '1,500個 (1,400発)', 'text-amber-200');
      updateStatsUI();
    }
  } catch (e) {}
}

// =========================================================================
// 鬼がかりRUSH（ST144回：4モード・全10種違和感・信頼度先バレ・残保留自力消化）
// =========================================================================
function enterOnigakariRush(hitSpin, is3000) {
  state.rushHits++;
  state.rushChains = 1;
  state.rushDisp = is3000 ? SPEC.DISP_3000 : SPEC.DISP_1500;
  state.rushNet = is3000 ? SPEC.NET_3000 : SPEC.NET_1500;
  state.balls += state.rushNet;
  state.rush6000Count = 0;
  state.rushWeddingCount = 0;
  state.rushHoryurenCount = 0;
  state.rushRestartCount = 0;
  state.rushIwakanNotes = [];
  state.rushStartSpin = hitSpin;
  state.currentSpin = 0;

  normalSpinWrap.classList.add('hidden');
  stRemainingWrap.classList.remove('hidden');
  rushStatusBar.classList.remove('hidden');

  afterBonusReserveCheck(is3000 ? 'INIT_3000' : 'INIT_1500');
}

async function afterBonusReserveCheck(prevType) {
  const tok = ++seqToken;
  const slots = drawReserve4Slots();
  const hitSlot = slots.find(s => s.hit) || null;
  updateRes4Dots(SPEC.ST_RESERVE);

  try {
    if (hitSlot) {
      // ① WEDDING BONUS 12,000（6000＋残保留6000）→ 100%即告知
      if (prevType === 'BONUS_6000' && hitSlot.bonusType === 'BONUS_6000') {
        state.rushHoryurenCount++;
        state.phase = 'ANIMATING';
        setControlMode('BUSY');

        state.reserveQueue = [];
        state.stRemaining = SPEC.ST_TOTAL;
        setActiveScene('rush-idle');
        rushIdleSub.textContent = '残保留消化中……';
        updateStatsUI();
        await wait(1100, tok);

        FxCanvas.setAmbient('wedding');
        FxCanvas.spawnFeathers(45);
        StudioAudio.play6000Fanfare(true);
        triggerLamp('rainbow', '💒 12,000!!');
        showFullscreenOverlay({
          mode: 'wedding',
          sub: `💒 奇跡の残保留${hitSlot.hitIndex}個目当選（約1/101） 💒`,
          main: '「スバルくん…愛しています」',
          extra: '純白の奇跡・残保留6000連荘降臨!!'
        });
        await wait(1550, tok);

        FxCanvas.spawnFeathers(40);
        showFullscreenOverlay({
          mode: 'wedding',
          sub: '💒 PREMIUM WEDDING 💒',
          main: 'WEDDING BONUS 12,000!!',
          extra: '鬼がかり6000＋6000＝計12,000個（実質純増 +11,200発）!!'
        });
        await wait(2400, tok);

        hideFullscreenOverlay();
        state.rushChains++; state.rush6000Count++; state.rushWeddingCount++;
        state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000;
        updateStatsUI();
        afterBonusReserveCheck('BONUS_6000');
        return;
      }

      // ② WEDDING以外の残保留当選：独立乱数で即保留連告知／自力1〜4回転消化を振分
      if (Math.random() < SPEC.HORYUREN_NOTICE_RATE) {
        state.rushHoryurenCount++;
        state.reserveQueue = [];
        state.phase = 'ANIMATING';
        setControlMode('BUSY');
        await wait(650, tok);
        StudioAudio.playPokyun(hitSlot.bonusType === 'BONUS_6000');
        triggerLamp('rainbow', `残保${hitSlot.hitIndex}連!!`);
        FxCanvas.burstRainbow(54);

        const label = hitSlot.bonusType === 'BONUS_6000' ? '鬼がかり 6,000 BONUS!!'
          : hitSlot.bonusType === 'BONUS_1500' ? '鬼がかり 1,500 BONUS!!'
          : hitSlot.bonusType === 'BONUS_300' ? '鬼がかり 300 BONUS!!'
          : 'Re:Start（STリセット）!!';

        if (hitSlot.bonusType === 'BONUS_6000') StudioAudio.play6000Fanfare(false);
        else if (hitSlot.bonusType === 'RESTART') StudioAudio.playReStart();
        else StudioAudio.play1500Jackpot(true);

        showFullscreenOverlay({
          mode: hitSlot.bonusType === 'BONUS_6000' ? '6000' : 'rainbow',
          sub: `⚡ 残保留${hitSlot.hitIndex}個目で即引き戻し!! ⚡`,
          main: `保留連!! ${label}`,
          extra: '大当り終了直後の残保留で奇跡の連荘!!'
        });
        await wait(1900, tok);
        hideFullscreenOverlay();

        if (hitSlot.bonusType === 'BONUS_6000') {
          state.rushChains++; state.rush6000Count++;
          state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000;
        } else if (hitSlot.bonusType === 'BONUS_1500') {
          state.rushChains++;
          state.rushDisp += SPEC.DISP_1500; state.rushNet += SPEC.NET_1500; state.balls += SPEC.NET_1500;
        } else if (hitSlot.bonusType === 'BONUS_300') {
          state.rushChains++;
          state.rushDisp += SPEC.DISP_300; state.rushNet += SPEC.NET_300; state.balls += SPEC.NET_300;
        } else {
          state.rushRestartCount++;
        }
        updateStatsUI();
        afterBonusReserveCheck(hitSlot.bonusType);
        return;
      }
    }

    // ③ 残り144回転スタート（最初の4回転で残保留キューを1回転ずつ消化）
    state.reserveQueue = slots;
    updateRes4Dots(SPEC.ST_RESERVE);
    state.stRemaining = SPEC.ST_TOTAL;
    state.phase = 'RUSH';
    clearVisualEffects();
    setActiveScene('rush-idle');
    applyRushModeVisuals();
    setControlMode('RUSH');
    updateStatsUI();
  } catch (e) {}
}

function applyRushModeVisuals() {
  lcdFrame.classList.remove('mode-brain-bg', 'mode-rem-bg', 'mode-zero-bg', 'fx-gold');
  if (state.phase !== 'RUSH') return;

  if (state.rushMode === 'onigakari') {
    FxCanvas.setAmbient('rush');
    lcdFrame.classList.add('fx-gold');
    setLed('red');
    updateReserveSlots('NORMAL');
    lampEmoji.textContent = '👹';
    stateBadge.textContent = '🔥 鬼がかりRUSH';
    stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-rose-950 border border-amber-400 text-amber-300 shadow whitespace-nowrap';
    rushModeBanner.textContent = 'ONIGAKARI RUSH (1/99.9)';
    rushIdleSub.textContent = state.rushCustNoNotice
      ? '🤫【予告無し中】何か予告が出た瞬間に6,000濃厚!!'
      : '🔥 点滅保留・カウントダウン法則崩れ・違和感に注目!!';
  } else if (state.rushMode === 'brain') {
    FxCanvas.setAmbient('rush');
    lcdFrame.classList.add('mode-brain-bg');
    setLed('brain');
    updateReserveSlots('BRAIN');
    lampEmoji.textContent = '🧠';
    stateBadge.textContent = '🧠 脳が震えるRUSH';
    stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-purple-950 border border-fuchsia-400 text-fuchsia-200 shadow whitespace-nowrap';
    rushModeBanner.textContent = 'BRAIN TREMBLE RUSH';
    rushIdleSub.textContent = '🧠「脳が」約50%／🖐️見えざる手は当たれば6000濃厚!!';
  } else if (state.rushMode === 'rem') {
    FxCanvas.setAmbient('rem');
    lcdFrame.classList.add('mode-rem-bg');
    setLed('rem');
    updateReserveSlots('NORMAL');
    lampEmoji.textContent = '💙';
    stateBadge.textContent = '💙 レム告知モード';
    stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-sky-950 border border-sky-400 text-sky-200 shadow whitespace-nowrap';
    rushModeBanner.textContent = 'REM NOTICE MODE';
    rushIdleSub.textContent = '💙 静寂から点灯で濃厚！徐々に点灯・再点灯は6000濃厚!!';
  } else {
    FxCanvas.setAmbient('zero');
    lcdFrame.classList.add('mode-zero-bg');
    setLed('');
    updateReserveSlots('NORMAL');
    lampEmoji.textContent = '⚡';
    stateBadge.textContent = '⚡ ゼロかRUSH';
    stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-zinc-900 border border-zinc-400 text-zinc-100 shadow whitespace-nowrap';
    rushModeBanner.textContent = 'ZERO OR 6000 RUSH';
    rushIdleSub.textContent = '⚡ 先読み一切なし！静寂を裂く一撃即決モード!!';
  }
}

// 1回転のRUSH抽選（ガセ煽り・点滅保留・信頼度先バレ・違和感を含む）
function spinRushOnce() {
  if (state.phase !== 'RUSH' || state.stRemaining <= 0) return null;
  state.stRemaining--;

  let isHit = false;
  let bonusType = null;
  if (state.reserveQueue.length > 0) {
    const slot = state.reserveQueue.shift();
    updateRes4Dots(state.reserveQueue.length);
    if (slot.hit) {
      state.reserveQueue = [];
      isHit = true;
      bonusType = slot.bonusType;
    }
  } else if (Math.random() < SPEC.ST_PROB) {
    isHit = true;
    bonusType = drawRushBonusType();
  }

  if (isHit) return { type: bonusType };
  if (state.stRemaining <= 0) return { type: 'ST_END' };

  if (state.rushCustNoNotice || state.rushMode === 'rem' || state.rushMode === 'zero') {
    return { type: 'MISS', teaser: null };
  }

  let teaser = null;
  if (state.rushMode === 'brain') {
    const r = Math.random();
    if (r < 0.008) teaser = 'BRAIN_HANDS_GAZE';
    else if (r < 0.022) teaser = 'BRAIN_NOGA_GAZE';
  } else if (state.rushMode === 'onigakari') {
    const r = Math.random();
    if (r < 0.012) teaser = 'ONI_CD_GAZE';
    else if (r < 0.026) teaser = 'ONI_BLINK_GAZE';
  }

  if (!teaser && state.rushCustTrust && Math.random() < 0.022) {
    teaser = 'TRUST_GAZE';
  }
  return { type: 'MISS', teaser };
}

function pickTrustPercent({ isHit, is6000, bonusType }) {
  if (!isHit) {
    const r = Math.random();
    if (r < 0.55) return { txt: '1%', cls: 'border-slate-500 text-slate-300' };
    if (r < 0.85) return { txt: '25%', cls: 'border-sky-400 text-sky-300' };
    return { txt: '50%', cls: 'border-amber-400 text-amber-300' };
  }
  if (is6000 && Math.random() < 0.35) {
    return { txt: '6000%!!', cls: 'border-yellow-200 rainbow-grad-text' };
  }
  if (bonusType === 'RESTART') {
    return { txt: '1%', cls: 'border-slate-400 text-slate-200' };
  }
  const r = Math.random();
  if (r < 0.45) return { txt: '99%!!', cls: 'border-amber-300 text-amber-200' };
  if (r < 0.78) return { txt: '80%!', cls: 'border-rose-400 text-rose-200' };
  return { txt: '50%', cls: 'border-amber-400 text-amber-300' };
}

async function playRushTeaserAndResume(teaser, resumeAuto = false) {
  const tok = ++seqToken;
  const wasAuto = resumeAuto;
  state.phase = 'ANIMATING';
  setControlMode('BUSY');

  try {
    if (state.rushCustTrust && teaser === 'TRUST_GAZE') {
      const tr = pickTrustPercent({ isHit: false });
      rushTopBadge.classList.remove('hidden');
      rushTopBadge.textContent = `🎯 期待度 ${tr.txt}`;
      rushTopBadge.className = `mb-1 px-3 py-0.5 rounded-full text-xs font-black bg-black/90 border shadow-lg ${tr.cls}`;
      await wait(620, tok);
      rushTopBadge.classList.add('hidden');
    } else if (teaser === 'BRAIN_HANDS_GAZE' || teaser === 'BRAIN_NOGA_GAZE') {
      await playBrainModeSequence({
        isHit: false, is6000: false, bonusType: null,
        isHands: teaser === 'BRAIN_HANDS_GAZE', token: tok
      });
    } else if (teaser === 'ONI_CD_GAZE') {
      await playOnigakariCountdown({ isHit: false, is6000: false, token: tok });
    } else if (teaser === 'ONI_BLINK_GAZE') {
      updateReserveSlots('NORMAL', 'BLINK');
      rushIdleSub.textContent = '✨ 点滅保留出現!! チャンス…!?';
      await wait(520, tok);
      updateReserveSlots('NORMAL', null);
    }

    state.phase = 'RUSH';
    clearIwakanEffects();
    applyRushModeVisuals();
    setControlMode('RUSH');
    updateStatsUI();

    if (wasAuto) startRushAutoLoop();
  } catch (e) {}
}

// RUSH大当り時のモード別告知＆違和感＆突発3秒フリーズシーケンス
async function handleRushHitSequence(bonusType) {
  const tok = ++seqToken;
  const is6000 = bonusType === 'BONUS_6000';
  state.phase = 'ANIMATING';
  state.pendingRushHit = { type: bonusType, okRevealed: false };
  setControlMode('BUSY');
  updateStatsUI();

  let forceRestartPromo = false;

  try {
    // ★6,000当選時の一部（約18%）：前兆なし突発「3秒間ブラックアウトフリーズ」直撃!!★
    if (is6000 && Math.random() < 0.18) {
      state.rushIwakanNotes.push('💀 突発3秒ブラックアウトフリーズ!!');
      state.pendingRushHit = null;
      await runSudden3sFreeze6000(tok);
      state.rushChains++;
      state.rush6000Count++;
      state.rushDisp += SPEC.DISP_6000;
      state.rushNet += SPEC.NET_6000;
      state.balls += SPEC.NET_6000;
      updateStatsUI();
      afterBonusReserveCheck('BONUS_6000');
      return;
    }

    // ① 信頼度先バレカスタムON時：まず期待度数値を表示
    if (state.rushCustTrust) {
      const tr = pickTrustPercent({ isHit: true, is6000, bonusType });
      if (is6000 && tr.txt !== '1%') forceRestartPromo = (Math.random() < 0.35);
      rushTopBadge.classList.remove('hidden');
      rushTopBadge.textContent = `🎯 期待度 ${tr.txt}`;
      rushTopBadge.className = `mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border shadow-lg pop-in ${tr.cls}`;
      await wait(520, tok);
    }

    // ② 違和感演出（違和感UP時は約72%、OFF時は約25%で発動）
    const iwakanChance = state.rushCustIwakan ? 0.72 : 0.25;
    if (Math.random() < iwakanChance) {
      const iwLabel = await playIwakanEffect({ is6000, rushMode: state.rushMode, token: tok });
      if (iwLabel) state.rushIwakanNotes.push(iwLabel);
    }

    // ③ 予告無しカスタムON時の法則：予告が出たら6,000濃厚！
    if (state.rushCustNoNotice && !is6000) {
      clearIwakanEffects();
      state.pendingRushHit = null;
      await runNormalRushBonusSequence(bonusType);
      return;
    }

    // ④ モード別の告知演出
    if (state.rushMode === 'rem') {
      if (Math.random() < 0.38) {
        updateReserveSlots('NORMAL', is6000 ? 'BLINK_RED' : 'BLINK');
        rushIdleSub.textContent = '💙 点滅保留発生!!（大当り濃厚!!）';
        await wait(480, tok);
      }
      const remNote = await playRemNoticePattern({ is6000, token: tok });
      if (is6000 && remNote.includes('6000')) state.rushIwakanNotes.push(remNote);

      // ★バグ修正済み：await wait(500, tok) に統一★
      if (is6000 && !state.pendingRushHit.okRevealed && Math.random() < (state.custOchiburu ? 0.75 : 0.20)) {
        StudioAudio.playOchiburu();
        lcdFrame.classList.add('shake-burst');
        await wait(500, tok);
      }
    } else if (state.rushMode === 'brain') {
      const isHands = is6000 && Math.random() < 0.42;
      const bNote = await playBrainModeSequence({
        isHit: true, is6000, bonusType, isHands,
        custOchiburu: state.custOchiburu, token: tok
      });
      if (bNote) state.rushIwakanNotes.push(bNote);
    } else if (state.rushMode === 'zero') {
      if (is6000) {
        if (Math.random() < (state.custOchiburu ? 0.85 : 0.35)) {
          StudioAudio.playOchiburu();
          lcdFrame.classList.add('shake-burst');
          triggerLamp('rainbow', 'ZERO→6000!!');
          await wait(550, tok);
        } else {
          StudioAudio.playPuchun();
          await wait(380, tok);
        }
      } else {
        StudioAudio.playKyuin();
        triggerLamp('red', '即当り!!');
        await wait(320, tok);
      }
    } else {
      if (is6000 && Math.random() < 0.35) {
        updateReserveSlots('NORMAL', 'BLINK_RED');
        rushIdleSub.textContent = '🔥 特殊高速赤点滅保留!!（当たれば6000濃厚!!）';
        await wait(520, tok);
      }
      if (Math.random() < 0.52) {
        const cdNote = await playOnigakariCountdown({ isHit: true, is6000, token: tok });
        if (cdNote && cdNote.includes('6000')) state.rushIwakanNotes.push(cdNote);
      }
      if (is6000 && !state.pendingRushHit.okRevealed && Math.random() < (state.custOchiburu ? 0.85 : 0.25)) {
        StudioAudio.playOchiburu();
        lcdFrame.classList.add('shake-burst');
        triggerLamp('rainbow', '6000濃厚!!');
        await wait(550, tok);
      }
    }

    clearIwakanEffects();
    state.pendingRushHit = null;

    if (is6000) {
      await runRush6000Sequence(forceRestartPromo);
    } else {
      await runNormalRushBonusSequence(bonusType);
    }
  } catch (e) {
    state.pendingRushHit = null;
    clearGlobalChaosEffects();
  }
}

function handleRushEvent(ev, { fromAuto = false } = {}) {
  if (!ev) return;
  if (ev.type === 'MISS') {
    if (state.rushMode === 'onigakari' && state.stRemaining <= 15) {
      rushIdleSub.textContent = '🔥 最終カウントダウン!! ここで引き戻せ!!';
    }
    rushBigRemain.className = state.stRemaining <= 15
      ? 'text-6xl sm:text-7xl font-black crimson-grad-text leading-none tracking-tight'
      : 'text-6xl sm:text-7xl font-black gold-grad-text leading-none tracking-tight';
    updateStatsUI();

    if (ev.teaser) {
      stopAuto();
      playRushTeaserAndResume(ev.teaser, fromAuto);
    }
    return;
  }

  stopAuto();
  if (ev.type === 'ST_END') { finishRush(); return; }
  handleRushHitSequence(ev.type);
}

// 右打ち鬼がかり6000当選（25%）→ 見た目は本物の300/Re:Start/1500と完全一致させたうえでぶっ飛び昇格
async function runRush6000Sequence(forceRestart = false) {
  const tok = ++seqToken;
  state.phase = 'ANIMATING';
  setControlMode('BUSY');

  const r = forceRestart ? 0.50 : Math.random();
  let opts;
  if (r < 0.36) {
    opts = {
      fakeSub: '右打ち 6%',
      fakeTitle: '鬼がかり 300 BONUS',
      fakeDesc: '実質純増 +280発 ＆ ST144回リセット！',
      fakeStyle: 'despair',
      fakeRestart: false,
      fakeIsRush: true,
      fakeBurstGold: false,
      finalSub: '💥【鬼300 切り裂き昇格!!】💥',
      finalTitle: '鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!! 残保留4個抽選へ…',
      finalSound: '6000'
    };
  } else if (r < 0.68) {
    opts = {
      fakeSub: '⏪ 右打ち 14%・死に戻り ⏪',
      fakeTitle: 'Re:Start',
      fakeDesc: '出玉0個・ST144回へ完全巻き戻し！',
      fakeStyle: 'despair',
      fakeRestart: true,
      fakeIsRush: true,
      fakeBurstGold: false,
      finalSub: '💥【Re:Start 逆転切り裂き!!】💥',
      finalTitle: '超・鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!! 残保留4個抽選へ…',
      finalSound: '6000'
    };
  } else {
    opts = {
      fakeSub: '🔥 右打ち 55% 🔥',
      fakeTitle: '鬼がかり 1,500 BONUS!!',
      fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
      fakeStyle: 'gold',
      fakeRestart: false,
      fakeIsRush: true,
      fakeBurstGold: true,
      finalSub: '🔥【1500 切り裂き昇格!!】🔥',
      finalTitle: '鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!! 残保留4個抽選へ…',
      finalSound: '6000'
    };
  }

  try {
    await runGoldenPromotionSequence({ ...opts, token: tok });
    state.rushChains++;
    state.rush6000Count++;
    state.rushDisp += SPEC.DISP_6000;
    state.rushNet += SPEC.NET_6000;
    state.balls += SPEC.NET_6000;
    updateStatsUI();
    afterBonusReserveCheck('BONUS_6000');
  } catch (e) {}
}

async function runNormalRushBonusSequence(type) {
  const tok = ++seqToken;
  state.phase = 'ANIMATING';
  setControlMode('BUSY');
  setActiveScene('bonus');

  try {
    if (type === 'BONUS_1500') {
      StudioAudio.play1500Jackpot(true);
      lcdFrame.classList.add('fx-gold');
      FxCanvas.burstGold(34);
      bonusSubLabel.textContent = '🔥 右打ち 55% 🔥';
      bonusSubLabel.className = 'text-[11px] font-black tracking-[0.18em] text-amber-300 mb-1.5';
      bonusMainTitle.textContent = '鬼がかり 1,500 BONUS!!';
      bonusMainTitle.className = 'text-3xl sm:text-4xl font-black gold-grad-text pop-in';
      bonusDesc.textContent = '払出 1,500個（実質純増 +1,400発）獲得！';
      await wait(1250, tok);
      state.rushChains++; state.rushDisp += SPEC.DISP_1500; state.rushNet += SPEC.NET_1500; state.balls += SPEC.NET_1500;
      updateStatsUI();
      afterBonusReserveCheck('BONUS_1500');
    } else if (type === 'BONUS_300') {
      StudioAudio.play1500Jackpot(true);
      lcdFrame.classList.add('mode-despair-bg');
      bonusSubLabel.textContent = '右打ち 6%';
      bonusSubLabel.className = 'text-[11px] font-black tracking-[0.18em] text-slate-400 mb-1.5';
      bonusMainTitle.textContent = '鬼がかり 300 BONUS';
      bonusMainTitle.className = 'text-3xl sm:text-4xl font-black text-slate-200 pop-in';
      bonusDesc.textContent = '実質純増 +280発 ＆ ST144回リセット！';
      await wait(1200, tok);
      state.rushChains++; state.rushDisp += SPEC.DISP_300; state.rushNet += SPEC.NET_300; state.balls += SPEC.NET_300;
      updateStatsUI();
      afterBonusReserveCheck('BONUS_300');
    } else {
      StudioAudio.playReStart();
      lcdFrame.classList.add('fx-restart', 'mode-despair-bg');
      bonusSubLabel.textContent = '⏪ 右打ち 14%・死に戻り ⏪';
      bonusSubLabel.className = 'text-[11px] font-black tracking-[0.18em] text-slate-300 mb-1.5';
      bonusMainTitle.textContent = 'Re:Start';
      bonusMainTitle.className = 'text-4xl font-black text-white pop-in';
      bonusDesc.textContent = '出玉0個・ST144回へ完全巻き戻し！';
      await wait(1250, tok);
      lcdFrame.classList.remove('fx-restart');
      state.rushRestartCount++;
      updateStatsUI();
      afterBonusReserveCheck('RESTART');
    }
  } catch (e) {}
}

function finishRush() {
  StudioAudio.playFail();
  state.phase = 'ANIMATING';
  setControlMode('BUSY');
  FxCanvas.setAmbient('ember');

  document.getElementById('resChains').textContent = `${state.rushChains} 連`;
  document.getElementById('res6000').textContent = `${state.rush6000Count} 回`;
  document.getElementById('resSpecial').textContent = `${state.rushRestartCount}回 / ${state.rushHoryurenCount}回`;
  document.getElementById('resNet').textContent = `${state.rushNet.toLocaleString()} 発`;
  const cashEst = Math.round(state.rushNet * exchangeRate);
  const lastIwakan = state.rushIwakanNotes.length > 0
    ? `\n👁️ 発生演出：${state.rushIwakanNotes.slice(-2).join(' / ')}`
    : '';
  document.getElementById('resSummaryText').textContent =
    `総獲得払出 ${state.rushDisp.toLocaleString()}個（換金目安 ${cashEst.toLocaleString()}円）` +
    (state.rushWeddingCount > 0 ? `\n💒 奇跡のWEDDING 12,000 ×${state.rushWeddingCount}回!!` : '') +
    lastIwakan;
  resultModal.classList.remove('hidden');

  const tags = [];
  if (state.rush6000Count > 0) tags.push(`鬼6000×${state.rush6000Count}`);
  if (state.rushWeddingCount > 0) tags.push(`💒12000×${state.rushWeddingCount}`);
  if (state.rushHoryurenCount > 0) tags.push(`保留連×${state.rushHoryurenCount}`);
  if (state.rushRestartCount > 0) tags.push(`Re:Start×${state.rushRestartCount}`);
  if (state.rushIwakanNotes.length > 0) tags.push(`演出${state.rushIwakanNotes.length}回`);
  addLog(
    `${state.rushStartSpin}回`,
    '鬼がかりRUSH',
    'bg-amber-900/80 text-amber-200 border border-amber-400/60',
    `${state.rushChains}連${tags.length ? ` (${tags.join('/')})` : ''}`,
    `${state.rushDisp.toLocaleString()}個 (${state.rushNet.toLocaleString()}発)`,
    'text-amber-300'
  );
  updateStatsUI();
}

// =========================================================================
// 「🎬 昇格テスト」ボタン（全5種のぶっ飛び演出＆3秒フリーズを順番に確認可能）
// =========================================================================
let promoTestCycle = 0;
document.getElementById('btnTestPromo').addEventListener('click', async () => {
  if (state.phase === 'ANIMATING' || state.phase === 'REACH') return;
  stopAuto();
  document.getElementById('tabPlay').click();

  const prevPhase = state.phase;
  const prevScene = state.activeScene;
  const tok = ++seqToken;
  state.phase = 'ANIMATING';
  setControlMode('BUSY');

  const variants = [
    {
      fakeSub: '右打ち 6%',
      fakeTitle: '鬼がかり 300 BONUS',
      fakeDesc: '実質純増 +280発 ＆ ST144回リセット！',
      fakeStyle: 'despair', fakeRestart: false, fakeIsRush: true, fakeBurstGold: false,
      finalSub: '⬇️【画面物理落下クラッシュ!!】⬇️',
      finalTitle: '鬼がかり 6,000 BONUS!!',
      finalExtra: 'テスト①：画面落下クラッシュ → 払出 6,000個降臨!!',
      finalSound: '6000', crashType: 'drop'
    },
    {
      fakeSub: '⏪ 右打ち 14%・死に戻り ⏪',
      fakeTitle: 'Re:Start',
      fakeDesc: '出玉0個・ST144回へ完全巻き戻し！',
      fakeStyle: 'despair', fakeRestart: true, fakeIsRush: true, fakeBurstGold: false,
      finalSub: '💥【画面3D粉砕吹き飛び!!】💥',
      finalTitle: '超・鬼がかり 6,000 BONUS!!',
      finalExtra: 'テスト②：画面6分割3D粉砕 → 払出 6,000個降臨!!',
      finalSound: '6000', crashType: 'shatter'
    },
    {
      fakeSub: '🔥 右打ち 55% 🔥',
      fakeTitle: '鬼がかり 1,500 BONUS!!',
      fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
      fakeStyle: 'gold', fakeRestart: false, fakeIsRush: true, fakeBurstGold: true,
      finalSub: '⚡【画面全体・超激震＆RGB破壊!!】⚡',
      finalTitle: '鬼がかり 6,000 BONUS!!',
      finalExtra: 'テスト③：ページ全体超激震＋RGB色ズレ → 6,000個降臨!!',
      finalSound: '6000', crashType: 'quake'
    },
    {
      fakeSub: '右打ち 6%',
      fakeTitle: '鬼がかり 300 BONUS',
      fakeDesc: '実質純増 +280発 ＆ ST144回リセット！',
      fakeStyle: 'despair', fakeRestart: false, fakeIsRush: true, fakeBurstGold: false,
      finalSub: '💀【3秒間ガチフリーズ解放!!】💀',
      finalTitle: '鬼がかり 6,000 BONUS!!',
      finalExtra: 'テスト④：3秒完全無音ブラックアウトフリーズ → 6,000個降臨!!',
      finalSound: '6000', crashType: 'freeze3s'
    },
    {
      fakeSub: '🔥 右打ち 55% 🔥',
      fakeTitle: '鬼がかり 1,500 BONUS!!',
      fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
      fakeStyle: 'gold', fakeRestart: false, fakeIsRush: true, fakeBurstGold: true,
      finalSub: '💥【斜め真っ二つ切り裂き昇格!!】💥',
      finalTitle: '鬼がかり 6,000 BONUS!!',
      finalExtra: 'テスト⑤：王道の斜め真っ二つ切り裂き → 6,000個降臨!!',
      finalSound: '6000', crashType: 'slash'
    }
  ];
  const v = variants[promoTestCycle % variants.length];
  promoTestCycle++;

  try {
    await runGoldenPromotionSequence({ ...v, token: tok });
    state.phase = prevPhase;
    clearVisualEffects();
    setActiveScene(prevScene);
    if (prevPhase === 'RUSH') {
      applyRushModeVisuals();
      setControlMode('RUSH');
    } else {
      FxCanvas.setAmbient('ember');
      setControlMode('NORMAL');
    }
  } catch (e) {}
});

// =========================================================================
// 実戦操作イベントバインド
// =========================================================================
document.getElementById('btnCloseResult').addEventListener('click', () => {
  resultModal.classList.add('hidden');
  state.phase = 'NORMAL';
  state.reserveQueue = [];
  clearVisualEffects();
  FxCanvas.setAmbient('ember');
  updateReserveSlots('NORMAL');
  normalSpinWrap.classList.remove('hidden');
  stRemainingWrap.classList.add('hidden');
  rushStatusBar.classList.add('hidden');
  stateBadge.textContent = '通常時 1/349.9';
  stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-black/80 border border-rose-500/70 text-rose-300 shadow whitespace-nowrap';
  setActiveScene('normal');
  normalTitle.textContent = '通常時';
  normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
  normalSub.textContent = '鬼がかりRUSH終了！次の極上ポキュ↑ーン↓を狙おう！';
  setControlMode('NORMAL');
  updateStatsUI();
});

document.getElementById('btnSpin1').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  stopAuto();
  const res = drawNormalSpin();
  if (res.bareType || res.isHit) startNormalReach(res);
  else {
    clearVisualEffects();
    setActiveScene('normal');
    randomMissReels();
    normalTitle.textContent = `${state.currentSpin} 回転`;
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
    normalSub.textContent = '通常変動中…（図柄揃い 1/349.9）';
    updateStatsUI();
  }
});

document.getElementById('btnSpin10').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  stopAuto();
  for (let i = 0; i < 10; i++) {
    const res = drawNormalSpin();
    if (res.bareType || res.isHit) { startNormalReach(res); return; }
  }
  clearVisualEffects();
  setActiveScene('normal');
  randomMissReels();
  normalTitle.textContent = `${state.currentSpin} 回転`;
  normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
  normalSub.textContent = '10回転消化（先バレなし）';
  updateStatsUI();
});

document.getElementById('btnAutoSakibare').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  if (state.autoMode === 'SAKIBARE') { stopAuto(); return; }
  stopAuto();
  state.autoMode = 'SAKIBARE';
  setActiveScene('normal');
  document.getElementById('btnAutoSakibare').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    for (let i = 0; i < 5; i++) {
      const res = drawNormalSpin();
      if (res.bareType || res.isHit) { startNormalReach(res); return; }
    }
    setReels(Math.floor(Math.random()*7)+1, Math.floor(Math.random()*7)+1, Math.floor(Math.random()*7)+1, { spinning: [true, true, true] });
    normalTitle.textContent = `${state.currentSpin} 回転`;
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
    normalSub.textContent = '爆音ポキュ↑ーン↓待機中… 高速回転中！';
    updateStatsUI();
  }, 32);
});

document.getElementById('btnAutoHit').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  if (state.autoMode === 'HIT') { stopAuto(); return; }
  stopAuto();
  state.autoMode = 'HIT';
  setActiveScene('normal');
  document.getElementById('btnAutoHit').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    for (let i = 0; i < 14; i++) {
      const res = drawNormalSpin();
      if (res.isHit) { startNormalReach(res); return; }
      else if (res.bareType) {
        state.sakibareTotal++;
        addLog(`${state.currentSpin}回`, '先バレ', 'bg-rose-950 text-rose-300 border border-rose-700', '当りオート中スキップ', 'ハズレ', 'text-slate-400');
      }
    }
    setReels(Math.floor(Math.random()*7)+1, Math.floor(Math.random()*7)+1, Math.floor(Math.random()*7)+1, { spinning: [true, true, true] });
    normalTitle.textContent = `${state.currentSpin} 回転`;
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
    normalSub.textContent = '大当りまで超高速オート消化中…';
    updateStatsUI();
  }, 30);
});

document.getElementById('btnStopAuto').addEventListener('click', () => {
  stopAuto();
  if (state.phase === 'NORMAL') randomMissReels();
});

document.getElementById('btnResetPlay').addEventListener('click', () => {
  seqToken++;
  stopAuto(); hideFullscreenOverlay(); resultModal.classList.add('hidden');
  rushStatusBar.classList.add('hidden');
  normalSpinWrap.classList.remove('hidden'); stRemainingWrap.classList.add('hidden');

  Object.assign(state, {
    phase: 'NORMAL', currentSpin: 0, totalNormalSpins: 0, firstHits: 0, rushHits: 0,
    sakibareTotal: 0, sakibareWins: 0, totalInvestYen: 0, balls: 0, unspentFrac: 0,
    pendingReach: null, pendingRushHit: null, reserveQueue: [], stRemaining: 0,
    rushChains: 0, rushDisp: 0, rushNet: 0, rush6000Count: 0, rushWeddingCount: 0,
    rushHoryurenCount: 0, rushRestartCount: 0, rushIwakanNotes: [], history: []
  });

  clearVisualEffects();
  FxCanvas.clearAll();
  FxCanvas.setAmbient('ember');
  updateReserveSlots('NORMAL');
  setActiveScene('normal');
  setReels(7, 3, 7);
  stateBadge.textContent = '通常時 1/349.9';
  stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-black/80 border border-rose-500/70 text-rose-300 shadow whitespace-nowrap';
  normalTitle.textContent = 'STANDBY';
  normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
  normalSub.textContent = 'データをリセットしました。';
  document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="4" class="py-5 text-center text-slate-500">まだ履歴はありません。</td></tr>';
  setControlMode('NORMAL');
  updateStatsUI();
});

// RUSHボタン（1回転ずつパラパラ消化）
function startRushAutoLoop() {
  if (state.phase !== 'RUSH') return;
  stopAuto();
  state.autoMode = 'RUSH';
  document.getElementById('btnRushAuto').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    if (state.phase !== 'RUSH') { stopAuto(); return; }
    const ev = spinRushOnce();
    handleRushEvent(ev, { fromAuto: true });
  }, 55);
}

document.getElementById('btnRush1').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  stopAuto();
  handleRushEvent(spinRushOnce(), { fromAuto: false });
});

document.getElementById('btnRush10').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  stopAuto();
  let rem = 10;
  state.autoMode = 'RUSH10';
  state.autoTimer = setInterval(() => {
    if (state.phase !== 'RUSH' || rem <= 0) { stopAuto(); return; }
    rem--;
    const ev = spinRushOnce();
    handleRushEvent(ev, { fromAuto: false });
    if (!ev || ev.type !== 'MISS' || ev.teaser || rem <= 0) stopAuto();
  }, 48);
});

document.getElementById('btnRushAuto').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  if (state.autoMode === 'RUSH') { stopAuto(); return; }
  startRushAutoLoop();
});

document.getElementById('btnRushSkip').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  stopAuto();
  while (state.phase === 'RUSH' && state.stRemaining > 0) {
    const ev = spinRushOnce();
    if (!ev || ev.type !== 'MISS') {
      handleRushEvent(ev, { fromAuto: false });
      return;
    }
  }
});

// 通常時カスタム切替（実機準拠3種のみ）
document.getElementById('toggleSakibare').addEventListener('click', e => {
  state.custSakibare = !state.custSakibare;
  e.target.textContent = `🔥 先バレ40%: ${state.custSakibare ? 'ON' : 'OFF'}`;
  e.target.className = state.custSakibare
    ? 'py-2 px-1 rounded-xl text-[11px] font-black border transition bg-rose-700/85 border-rose-400 text-white shadow active:scale-95'
    : 'py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('toggleOchiburu').addEventListener('click', e => {
  state.custOchiburu = !state.custOchiburu;
  e.target.textContent = `💥 落ちブルUP: ${state.custOchiburu ? 'ON' : 'OFF'}`;
  e.target.className = state.custOchiburu
    ? 'py-2 px-1 rounded-xl text-[11px] font-black border transition bg-amber-600/65 border-amber-300 text-amber-100 active:scale-95'
    : 'py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('togglePremier').addEventListener('click', e => {
  state.custPremier = !state.custPremier;
  e.target.textContent = `🌈 プレミアUP: ${state.custPremier ? 'ON' : 'OFF'}`;
  e.target.className = state.custPremier
    ? 'py-2 px-1 rounded-xl text-[11px] font-black border transition bg-fuchsia-700/75 border-fuchsia-300 text-white shadow active:scale-95'
    : 'py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});

// RUSHモード切替（4モード対応）
document.querySelectorAll('.rmode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.rushMode = btn.dataset.rmode;
    document.querySelectorAll('.rmode-btn').forEach(b => {
      b.className = 'rmode-btn py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
    });
    btn.className = 'rmode-btn py-2 px-1 rounded-xl text-[11px] font-black border transition bg-rose-700/80 border-amber-300 text-white active:scale-95';
    applyRushModeVisuals();
  });
});

// RUSH専用カスタム3種
const btnTrust = document.getElementById('toggleRushTrust');
if (btnTrust) {
  btnTrust.addEventListener('click', e => {
    state.rushCustTrust = !state.rushCustTrust;
    e.target.textContent = `🎯 信頼度先バレ: ${state.rushCustTrust ? 'ON' : 'OFF'}`;
    e.target.className = state.rushCustTrust
      ? 'py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-cyan-700/80 border-cyan-300 text-white shadow active:scale-95'
      : 'py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
  });
}
const btnIwakan = document.getElementById('toggleRushIwakan');
if (btnIwakan) {
  btnIwakan.addEventListener('click', e => {
    state.rushCustIwakan = !state.rushCustIwakan;
    e.target.textContent = `👁️ 違和感UP: ${state.rushCustIwakan ? 'ON' : 'OFF'}`;
    e.target.className = state.rushCustIwakan
      ? 'py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-purple-700/80 border-fuchsia-300 text-white shadow active:scale-95'
      : 'py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
  });
}
const btnNoNotice = document.getElementById('toggleRushNoNotice');
if (btnNoNotice) {
  btnNoNotice.addEventListener('click', e => {
    state.rushCustNoNotice = !state.rushCustNoNotice;
    e.target.textContent = `🤫 予告無し: ${state.rushCustNoNotice ? 'ON' : 'OFF'}`;
    e.target.className = state.rushCustNoNotice
      ? 'py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-amber-700/80 border-amber-300 text-white shadow active:scale-95'
      : 'py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
    applyRushModeVisuals();
  });
}

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
    totalSpins += spins;
    if (spins > maxHamari) maxHamari = spins;

    const investBalls = spins * (250 / rotRate);
    let payoutDisp = 0, payoutNet = 0, inRush = false, prevType = null;

    const rH = Math.random();
    if (rH < SPEC.H_3000_RUSH) {
      whaleCount++; payoutDisp = SPEC.DISP_3000; payoutNet = SPEC.NET_3000; inRush = true; prevType = 'INIT_3000';
    } else if (rH < SPEC.RUSH_ENTRY) {
      payoutDisp = SPEC.DISP_1500; payoutNet = SPEC.NET_1500; inRush = true; prevType = 'INIT_1500';
    } else {
      payoutDisp = SPEC.DISP_1500; payoutNet = SPEC.NET_1500;
    }

    if (inRush) {
      rushCount++;
      let active = true;
      while (active) {
        const r4 = drawReserve4();
        let hitBonus = null;
        if (r4.hit) {
          hitBonus = r4.bonusType;
          const isWed = (prevType === 'BONUS_6000' && hitBonus === 'BONUS_6000');
          if (isWed) {
            weddingCount++;
            horyurenCount++;
          } else if (Math.random() < SPEC.HORYUREN_NOTICE_RATE) {
            horyurenCount++;
          }
        } else if (Math.random() < densa140Prob) {
          hitBonus = drawRushBonusType();
        } else {
          active = false; break;
        }
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

  const finalBalls = points[points.length - 1];
  const finalYen = Math.round(finalBalls * exchangeRate);
  const balEl = document.getElementById('simFinalBalance');
  balEl.textContent = `${finalBalls >= 0 ? '+' : ''}${finalBalls.toLocaleString()}発 (${finalYen >= 0 ? '+' : ''}${finalYen.toLocaleString()}円)`;
  balEl.className = `text-xs sm:text-sm font-black mt-0.5 ${finalBalls >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;

  const peak = Math.max(...points), bottom = Math.min(...points);
  document.getElementById('simPeakBottom').textContent = `最高: ${peak >= 0 ? '+' : ''}${peak.toLocaleString()} / 最低: ${bottom >= 0 ? '+' : ''}${bottom.toLocaleString()}`;

  const exp6000 = totalRushWins * SPEC.R_6000;
  const diff6000 = count6000 - exp6000;
  document.getElementById('simDiagnosis').innerHTML = `
    <div class="font-black text-amber-300 mb-1">🎯 鬼がかり6000＆残保留WEDDING 12,000 診断</div>
    <p>
      右打ち総当選 <strong>${totalRushWins}回</strong> 中、鬼がかり6000は <strong>${count6000}回（${pct6000}%）</strong>
      （理論 ${exp6000.toFixed(1)}回 ／ 差 <strong class="${diff6000 >= 0 ? 'text-emerald-300' : 'text-rose-400'}">${diff6000 >= 0 ? '+' : ''}${diff6000.toFixed(1)}回</strong>）。
      保留連告知は <strong>${horyurenCount}回</strong>、真のプレミアム「WEDDING 12,000」は <strong>${weddingCount}回</strong>（理論期待：約${(count6000 * 0.00985).toFixed(2)}回）でした。
    </p>
  `;
  drawSlumpChart(points);
}

function drawSlumpChart(points) {
  const canvas = document.getElementById('slumpChartCanvas');
  if (!canvas || !points || points.length === 0) return;

  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const w = rect.width, h = rect.height;
  const padL = 48, padR = 12, padT = 16, padB = 22;
  const chartW = w - padL - padR, chartH = h - padT - padB;
  ctx.clearRect(0, 0, w, h);

  const minVal = Math.min(0, ...points), maxVal = Math.max(0, ...points);
  const range = Math.max(25000, maxVal - minVal);
  const yMin = minVal - range * 0.08, yMax = maxVal + range * 0.08;
  const toX = i => padL + (i / (points.length - 1)) * chartW;
  const toY = v => padT + ((yMax - v) / (yMax - yMin)) * chartH;
  const zeroY = toY(0);

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.12)'; ctx.lineWidth = 1;
  ctx.font = '10px Inter, sans-serif'; ctx.fillStyle = '#94a3b8'; ctx.textAlign = 'right';
  for (let i = 0; i <= 4; i++) {
    const val = yMin + ((yMax - yMin) / 4) * i, y = toY(val);
    ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
    ctx.fillText(`${Math.round(val / 1000)}k`, padL - 5, y + 3);
  }

  ctx.strokeStyle = 'rgba(250, 204, 21, 0.55)'; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(padL, zeroY); ctx.lineTo(w - padR, zeroY); ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'center';
  [0, 25, 50, 75, 100].forEach(idx => ctx.fillText(`${idx}回`, toX(idx), h - 5));

  function fillArea(pos) {
    ctx.save(); ctx.beginPath();
    if (pos) ctx.rect(padL, padT, chartW, Math.max(0, zeroY - padT));
    else ctx.rect(padL, zeroY, chartW, Math.max(0, (h - padB) - zeroY));
    ctx.clip(); ctx.beginPath();
    points.forEach((v, i) => { const x = toX(i), y = toY(v); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
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
// ヘッダー・チューナー・タブ同期
// =========================================================================
document.getElementById('btnTestPokyun').addEventListener('click', () => {
  StudioAudio.playPokyun(false);
  triggerLamp('red', 'ポキュ↑ーン↓');
  lcdFrame.classList.remove('fx-redbare', 'shake-burst');
  void lcdFrame.offsetWidth;
  lcdFrame.classList.add('fx-redbare', 'shake-burst');
  FxCanvas.burstFlames(30);
});

document.getElementById('btnToggleTuner').addEventListener('click', () => {
  document.getElementById('audioTunerDrawer').classList.toggle('hidden');
});

document.getElementById('btnSpeedToggle').addEventListener('click', e => {
  fastMode = !fastMode;
  e.target.textContent = fastMode ? '⚡ 高速' : '⏱ 極上';
  e.target.className = fastMode
    ? 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-amber-600/80 text-white border border-amber-300 active:scale-95 transition'
    : 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-indigo-950 hover:bg-indigo-900 text-cyan-300 border border-cyan-500/50 active:scale-95 transition';
});

document.getElementById('sliderReverbWet').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  document.getElementById('valReverbWet').textContent = `${v}%`;
  StudioAudio.setReverbWet(v / 100);
});
document.getElementById('sliderPeakBright').addEventListener('input', e => {
  const v = parseFloat(e.target.value);
  document.getElementById('valPeakBright').textContent = `${v.toFixed(2)}x`;
  StudioAudio.setPeakBright(v);
});
document.getElementById('sliderDownBend').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  document.getElementById('valDownBend').textContent = `${v}%`;
  StudioAudio.setDownBend(v / 100);
});
document.getElementById('sliderPoEmphasis').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  document.getElementById('valPoEmphasis').textContent = `${v}%`;
  StudioAudio.setPoEmphasis(v / 100);
});
document.getElementById('sliderGrit').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  document.getElementById('valGrit').textContent = `${v}%`;
  StudioAudio.setGrit(v / 100);
});
document.getElementById('sliderVolume').addEventListener('input', e => {
  const v = parseInt(e.target.value, 10);
  document.getElementById('valVolume').textContent = `${v}%`;
  StudioAudio.setVolume(v / 100);
});

document.getElementById('btnResetTuner').addEventListener('click', () => {
  document.getElementById('sliderReverbWet').value = 44;
  document.getElementById('valReverbWet').textContent = '44%';
  StudioAudio.setReverbWet(AUDIO_DEFAULTS.reverbWet);

  document.getElementById('sliderPeakBright').value = 0.73;
  document.getElementById('valPeakBright').textContent = '0.73x';
  StudioAudio.setPeakBright(AUDIO_DEFAULTS.peakBright);

  document.getElementById('sliderDownBend').value = 115;
  document.getElementById('valDownBend').textContent = '115%';
  StudioAudio.setDownBend(AUDIO_DEFAULTS.downBend);

  document.getElementById('sliderPoEmphasis').value = 160;
  document.getElementById('valPoEmphasis').textContent = '160%';
  StudioAudio.setPoEmphasis(AUDIO_DEFAULTS.poEmphasis);

  document.getElementById('sliderGrit').value = 115;
  document.getElementById('valGrit').textContent = '115%';
  StudioAudio.setGrit(AUDIO_DEFAULTS.grit);

  document.getElementById('sliderVolume').value = 80;
  document.getElementById('valVolume').textContent = '80%';
  StudioAudio.setVolume(AUDIO_DEFAULTS.volume);

  StudioAudio.playPokyun(false);
});

document.getElementById('btnMute').addEventListener('click', e => {
  const m = StudioAudio.toggleMute();
  e.target.textContent = m ? '🔇 OFF' : '🔊 ON';
  e.target.className = m
    ? 'text-[10px] font-black text-rose-400 px-2 py-1 rounded bg-slate-800 border border-slate-600 active:scale-95 transition'
    : 'text-[10px] font-black text-emerald-300 px-2 py-1 rounded bg-slate-800 border border-slate-600 active:scale-95 transition';
});

document.getElementById('tabPlay').addEventListener('click', () => {
  document.getElementById('playModeContainer').classList.remove('hidden');
  document.getElementById('sim100Container').classList.add('hidden');
  document.getElementById('tabPlay').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-gradient-to-r from-rose-700 via-red-700 to-amber-700 text-white shadow border border-amber-400/50';
  document.getElementById('tabSim100').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800';
  setTimeout(FxCanvas.resize, 30);
});

document.getElementById('tabSim100').addEventListener('click', () => {
  stopAuto();
  document.getElementById('playModeContainer').classList.add('hidden');
  document.getElementById('sim100Container').classList.remove('hidden');
  document.getElementById('tabSim100').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-gradient-to-r from-amber-600 via-rose-600 to-red-800 text-white shadow border border-amber-400/50';
  document.getElementById('tabPlay').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800';
  if (lastSimPoints.length === 0) runSim100();
  else setTimeout(() => drawSlumpChart(lastSimPoints), 30);
});

document.getElementById('btnRunSim100').addEventListener('click', runSim100);

function syncRotRate(v) {
  rotRate = parseFloat(v);
  document.getElementById('rotRateSlider').value = rotRate;
  document.getElementById('simRotSlider').value = rotRate;
  document.getElementById('rotRateDisplay').textContent = `${rotRate.toFixed(1)} 回/1k`;
  document.getElementById('simRotDisplay').textContent = `${rotRate.toFixed(1)} 回/1k`;
}
document.getElementById('rotRateSlider').addEventListener('input', e => syncRotRate(e.target.value));
document.getElementById('simRotSlider').addEventListener('input', e => syncRotRate(e.target.value));

function syncExchangeRate(rate) {
  exchangeRate = parseFloat(rate);
  document.querySelectorAll('.rate-btn, .sim-rate-btn').forEach(b => {
    const active = Math.abs(parseFloat(b.dataset.rate) - exchangeRate) < 0.01;
    b.className = `${b.classList.contains('sim-rate-btn') ? 'sim-rate-btn py-1.5' : 'rate-btn py-2'} rounded-lg text-[11px] border transition ${active ? 'font-black bg-rose-700/75 border-amber-400 text-white' : 'font-bold bg-slate-900 border-slate-700 text-slate-400'}`;
  });
  updateStatsUI();
}
document.querySelectorAll('.rate-btn, .sim-rate-btn').forEach(btn => {
  btn.addEventListener('click', () => syncExchangeRate(btn.dataset.rate));
});

window.addEventListener('resize', () => {
  if (lastSimPoints.length > 0 && !document.getElementById('sim100Container').classList.contains('hidden')) {
    drawSlumpChart(lastSimPoints);
  }
});

// 初期表示
setActiveScene('normal');
updateStatsUI();
