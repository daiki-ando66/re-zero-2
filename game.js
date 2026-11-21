// =========================================================================
// game.js (v4.1) : 全3D図柄・公式ロゴ・DMM解析準拠（脳震え高占有率・突当たりの間）
// =========================================================================

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
  HORYUREN_NOTICE_RATE: 0.48,

  R_6000: 0.25,             // 25%: 鬼がかり6000
  R_1500: 0.55,             // 55%: 鬼がかり1500
  R_300: 0.06,              // 6%:  鬼がかり300
  R_RESTART: 0.14,          // 14%: Re:Start（0発・ST144リセット・非大当たり扱い）

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
      slots.push({ hit: true, hitIndex: i, bonusType: drawRushBonusType() });
      break;
    } else {
      slots.push({ hit: false, hitIndex: i, bonusType: null });
    }
  }
  return slots;
}

function drawReserve4() {
  for (let i = 1; i <= SPEC.ST_RESERVE; i++) {
    if (Math.random() < SPEC.ST_PROB) {
      return { hit: true, hitIndex: i, bonusType: drawRushBonusType() };
    }
  }
  return { hit: false, hitIndex: 0, bonusType: null };
}

// =========================================================================
// ゲーム状態＆固有DOM参照
// =========================================================================
let rotRate = 16.5;
let exchangeRate = 4.0;
let infiniteRushMode = false;

const state = {
  phase: 'NORMAL',          // 'NORMAL' | 'REACH' | 'RUSH' | 'ANIMATING'
  activeScene: 'normal',
  custSakibare: true,
  custOchiburu: true,
  custPremier: false,
  rushMode: 'onigakari',    // 'onigakari' | 'brain' | 'rem'

  rushCustTrust: false,     // 🎯 信頼度先バレ
  rushCustIwakan: true,     // 👁️ 違和感UP
  rushCustNoNotice: false,  // 🤫 予告無し

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
const currentSpinDisplay = document.getElementById('currentSpinDisplay');

const normalTitle = document.getElementById('normalTitle');
const normalSub = document.getElementById('normalSub');

const reachYokokuBadge = document.getElementById('reachYokokuBadge');
const reachStepBadge = document.getElementById('reachStepBadge');
const reachTitle = document.getElementById('reachTitle');
const reachSub = document.getElementById('reachSub');
const pushHintText = document.getElementById('pushHintText');

const rushStatusBar = document.getElementById('rushStatusBar');
const normalControls = document.getElementById('normalControls');
const rushControls = document.getElementById('rushControls');
const busyNotice = document.getElementById('busyNotice');
const normalCustomPanel = document.getElementById('normalCustomPanel');
const rushCustomPanel = document.getElementById('rushCustomPanel');
const rushExtraCustomRow = document.getElementById('rushExtraCustomRow');

['pointerdown', 'keydown'].forEach(ev => {
  window.addEventListener(ev, () => BgmEngine.unlock(), { once: true });
});

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
  rushExtraCustomRow.classList.toggle('hidden', !isRushGroup);
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
  hudRushChains.textContent = `×${state.rushChains}`;
  hudRushRemain.textContent = state.stRemaining;
  hudRushPts.textContent = `${state.rushDisp.toLocaleString()}pt`;
  if (remBottomPtBar) remBottomPtBar.textContent = `${state.rushDisp.toLocaleString()}pt`;

  document.getElementById('dashSpins').textContent = `${state.currentSpin} / ${state.totalNormalSpins}`;
  document.getElementById('dashInvest').textContent = `${state.totalInvestYen.toLocaleString()}円`;
  document.getElementById('dashBalls').textContent = `${Math.floor(state.balls).toLocaleString()}発`;

  const cash = Math.round(state.balls * exchangeRate);
  const bal = cash - state.totalInvestYen;
  const balEl = document.getElementById('dashBalance');
  balEl.textContent = `${bal >= 0 ? '+' : ''}${bal.toLocaleString()}円`;
  balEl.className = `text-xs sm:text-sm font-black ${bal > 0 ? 'text-emerald-400' : bal < 0 ? 'text-rose-400' : 'text-white'}`;

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
    <tr class="hover:bg-amber-950/30">
      <td class="py-1.5 px-1.5 font-bold text-slate-300 whitespace-nowrap">${h.spinTxt}</td>
      <td class="py-1.5 px-1.5 whitespace-nowrap"><span class="px-1.5 py-0.5 rounded text-[10px] font-black ${h.tagCls}">${h.tag}</span></td>
      <td class="py-1.5 px-1.5 text-amber-100/90">${h.detail}</td>
      <td class="py-1.5 px-1.5 text-right font-black whitespace-nowrap ${h.resCls}">${h.resTxt}</td>
    </tr>
  `).join('');
}

// =========================================================================
// 通常時抽選＆2段階チャンスアップ＋botan.jpg落下ジャッジ
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
    : hesoType === '1500_RUSH' ? [3, 5, 7, 1][Math.floor(Math.random() * 4)]
    : [2, 4, 6, 8][Math.floor(Math.random() * 4)];

  let titleColor = 'white', cutinColor = 'green';
  if (is3000 || isPremier) {
    titleColor = 'gold'; cutinColor = 'gold';
  } else if (isHit) {
    titleColor = Math.random() < 0.42 ? 'gold' : Math.random() < 0.85 ? 'red' : 'white';
    cutinColor = Math.random() < 0.48 ? 'gold' : Math.random() < 0.88 ? 'red' : 'green';
  } else {
    titleColor = Math.random() < 0.08 ? 'gold' : Math.random() < 0.45 ? 'red' : 'white';
    cutinColor = Math.random() < 0.07 ? 'gold' : Math.random() < 0.40 ? 'red' : 'green';
  }

  let isWhale = false, badge = '', title = '', sub = '';
  if (is3000) {
    isWhale = true; badge = '白鯨襲来'; title = '白鯨攻略戦'; sub = '霧の魔獣を討伐せよ!!';
  } else if (isPremier) {
    badge = '鬼がかってますね予告'; title = '鬼がかったやり方SP「vs ウルガルム」'; sub = 'レム覚醒!! 運命の一撃を叩き込め!!';
  } else if (isHit) {
    const r = Math.random();
    if (r < 0.35) { badge = '鬼がかってますね予告'; title = '鬼がかったやり方SP「vs ウルガルム」'; sub = '最終ジャッジへ!!'; }
    else if (r < 0.70) { badge = '鬼がかり予告'; title = '鬼がかったやり方SP「vs ペテルギウス」'; sub = '運命のPUSHを叩け!!'; }
    else { badge = '鬼がかり予告'; title = '鬼がかったやり方SP「vs エルザ」'; sub = '激熱バトル発展!!'; }
  } else {
    const r = Math.random();
    if (r < 0.35) { badge = '鬼がかり予告'; title = '鬼がかったやり方SP「vs ペテルギウス」'; sub = '大チャンス到来!!'; }
    else if (r < 0.70) { badge = '鬼がかり予告'; title = '鬼がかったやり方SP「vs エルザ」'; sub = '運命のジャッジ!!'; }
    else { badge = '抗えチャンス'; title = '抗えSPリーチ'; sub = '死の運命に抗え!!'; }
  }
  return { isHit, hesoType, bareType, is3000, isWhale, isPremier, ochiburu, tenpaiNum, titleColor, cutinColor, badge, title, sub, secretRevealed: false };
}

async function startNormalReach(res) {
  stopAuto();
  const tok = ++seqToken;
  state.phase = 'REACH';
  setControlMode('BUSY');
  clearVisualEffects();
  setActiveScene('reach');
  reachStepBadge.classList.add('hidden');
  BgmEngine.cut();

  const sc = buildNormalScenario(res);
  state.pendingReach = sc;

  if (sc.bareType === 'rainbow') {
    state.sakibareTotal++;
    StudioAudio.playPokyun(true);
    setAmbientBg('rainbow'); setSunburst(true);
    triggerLamp('rainbow', '虹バレ!!');
    updateReserveSlots('NORMAL', 'RAINBOW');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst');
    FxCanvas.burstRainbow(56);
    reachYokokuBadge.textContent = '虹先バレ';
    reachYokokuBadge.className = 'px-3 py-0.5 rounded-full text-[11px] font-black bg-black/85 border border-amber-300 rainbow-grad-text shadow-lg';
    reachTitle.textContent = 'ポキュ↑ーン↓!!';
    reachTitle.className = 'font-mincho text-3xl sm:text-4xl font-black rainbow-grad-text cutin-slam';
    reachSub.textContent = `${state.currentSpin}回転目`;
  } else if (sc.bareType === 'red') {
    state.sakibareTotal++;
    StudioAudio.playPokyun(false);
    setAmbientBg('redbare');
    triggerLamp('red', '先バレ40%');
    updateReserveSlots('NORMAL', 'RED');
    lcdFrame.classList.add('fx-redbare', 'shake-burst');
    FxCanvas.burstFlames(34);
    reachYokokuBadge.textContent = '先バレ';
    reachYokokuBadge.className = 'px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-950/90 border border-rose-400 text-rose-200 shadow-lg';
    reachTitle.textContent = 'ポキュ↑ーン↓!!';
    reachTitle.className = 'text-3xl sm:text-5xl font-black crimson-grad-text cutin-slam';
    reachSub.textContent = `${state.currentSpin}回転目・SPリーチ発展`;
  } else {
    reachYokokuBadge.textContent = 'SP発展';
    reachYokokuBadge.className = 'px-3 py-0.5 rounded-full text-[11px] font-black bg-black/85 border border-amber-400 text-amber-300';
    reachTitle.textContent = 'リーチ発展!!';
    reachTitle.className = 'text-3xl font-black gold-grad-text pop-in';
    reachSub.textContent = `${state.currentSpin}回転目`;
  }
  updateStatsUI();

  try {
    await wait(780, tok);
    lcdFrame.classList.remove('shake-burst');
    BgmEngine.resume('reach');

    if (sc.isWhale) {
      StudioAudio.playWhaleSiren();
      setAmbientBg('rainbow'); lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      triggerLamp('rainbow', '白鯨襲来!!'); FxCanvas.spawnLightning('#38bdf8', 5);
    } else if (sc.isPremier) {
      await playOnigakariImageCutin({ caption: '鬼がかってますね', dur: 3400, withPokyun: false, fromBlackout: false, token: tok });
      lcdFrame.classList.add('fx-rainbow'); triggerLamp('rainbow', 'プレミア!!'); FxCanvas.burstRainbow(48);
    } else {
      FxCanvas.burstFlames(24);
    }

    reachYokokuBadge.textContent = sc.badge;
    reachYokokuBadge.className = (sc.isWhale || sc.isPremier)
      ? 'px-3 py-0.5 rounded-full text-[11px] font-black bg-black/90 border border-amber-300 rainbow-grad-text shadow-lg'
      : 'px-3 py-0.5 rounded-full text-[11px] font-black bg-black/90 border border-amber-400/80 text-amber-300 shadow-lg';

    reachStepBadge.classList.remove('hidden');
    if (sc.titleColor === 'gold') {
      reachStepBadge.textContent = '金タイトル!!';
      reachStepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
      reachTitle.className = 'font-mincho text-xl sm:text-3xl font-black gold-grad-text cutin-slam px-2';
    } else if (sc.titleColor === 'red') {
      reachStepBadge.textContent = '赤タイトル!';
      reachStepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-950/95 border border-rose-400 text-rose-200 shadow-lg pop-in';
      reachTitle.className = 'font-mincho text-xl sm:text-3xl font-black crimson-grad-text cutin-slam px-2';
    } else {
      reachStepBadge.textContent = '白タイトル';
      reachStepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/90 border border-slate-500 text-slate-200';
      reachTitle.className = 'font-mincho text-xl sm:text-3xl font-black text-white cutin-slam px-2';
    }
    reachTitle.textContent = sc.title;
    reachSub.textContent = sc.sub;

    await wait(640, tok);
    if (sc.cutinColor === 'gold') {
      reachStepBadge.textContent = '金カットイン!!';
      reachStepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
      FxCanvas.spawnRing('#facc15', 240, 7);
    } else if (sc.cutinColor === 'red') {
      reachStepBadge.textContent = '赤カットイン!';
      reachStepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-950/95 border border-rose-400 text-rose-200 shadow-lg pop-in';
      FxCanvas.spawnRing('#ef4444', 210, 5);
    } else {
      reachStepBadge.textContent = '緑カットイン';
      reachStepBadge.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 border border-emerald-400 text-emerald-200';
    }

    pushButtonArea.classList.remove('hidden');
    btnOniPush.classList.remove('botan-rise-in');
    void btnOniPush.offsetWidth;
    btnOniPush.classList.add('botan-rise-in');
    reachBotanText.textContent = sc.isWhale ? '撃破' : 'PUSH';
    pushHintText.textContent = sc.isWhale
      ? 'ボタンタップで白鯨を撃破せよ!!'
      : 'ボタンタップで当落ジャッジ！（右下OKで裏告知）';

    const btnCol = (sc.isWhale || sc.isPremier) ? 'rainbow' : sc.cutinColor === 'gold' ? 'gold' : sc.cutinColor === 'red' ? 'red' : '';
    setReachBotanState({ vibe: btnCol === 'gold' || btnCol === 'rainbow' ? 'weak' : 'idle', color: btnCol });

    if (sc.ochiburu) {
      await wait(360, tok);
      BgmEngine.cut();
      StudioAudio.playOchiburu(true);
      setAmbientBg('rainbow'); setSunburst(true);
      lcdFrame.classList.add('shake-intense', 'fx-gold');
      setReachBotanState({ vibe: 'max', color: 'rainbow', drop: true });
      setLed('rainbow');
      FxCanvas.spawnRing('#facc15', 300, 9); FxCanvas.spawnLightning('#fde047', 5);
      reachYokokuBadge.textContent = '鬼がかり3,000濃厚!!';
      reachYokokuBadge.className = 'px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
    }
  } catch (e) {}
}

btnOniPush.addEventListener('click', () => {
  if (state.phase === 'REACH') resolveNormalReach();
});

btnSecretOk.addEventListener('click', () => {
  if (canInterruptPromotion()) {
    interruptPromotionByOk();
    return;
  }

  if (state.phase === 'REACH') {
    const sc = state.pendingReach;
    if (!sc || sc.secretRevealed || sc.ochiburu || !sc.isHit) return;
    sc.secretRevealed = true;
    BgmEngine.cut();
    if (sc.is3000) {
      sc.ochiburu = true;
      StudioAudio.playOchiburu(true);
      setAmbientBg('rainbow'); setSunburst(true);
      lcdFrame.classList.add('shake-intense', 'fx-gold');
      setReachBotanState({ vibe: 'max', color: 'rainbow', drop: true });
      triggerLamp('rainbow', '3,000!!'); setLed('rainbow');
      FxCanvas.spawnRing('#facc15', 300, 9); FxCanvas.spawnLightning('#fde047', 5); FxCanvas.burstRainbow(54);
      reachYokokuBadge.textContent = '鬼がかり3,000濃厚!!';
      reachYokokuBadge.className = 'px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
      pushHintText.textContent = 'ボタンタップで3,000BONUSへ!!';
    } else {
      StudioAudio.playKyuin();
      setAmbientBg('rainbow'); lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      setReachBotanState({ vibe: 'mid', color: 'rainbow' });
      triggerLamp('rainbow', '一発告知!!');
      FxCanvas.spawnLightning('#fde047', 4); FxCanvas.burstRainbow(48);
      reachYokokuBadge.textContent = '大当り濃厚!!';
      reachYokokuBadge.className = 'px-3 py-0.5 rounded-full text-[11px] font-black bg-black/95 border border-amber-300 rainbow-grad-text shadow-lg pop-in';
      pushHintText.textContent = 'ボタンタップで図柄揃いへ!!';
    }
    return;
  }

  if (state.pendingRushHit && state.pendingRushHit.type === 'BONUS_6000' && !state.pendingRushHit.okRevealed) {
    state.pendingRushHit.okRevealed = true;
    BgmEngine.cut();
    StudioAudio.playOchiburu(true);
    setAmbientBg('rainbow'); setSunburst(true);
    triggerLamp('rainbow', '6,000!!');
    FxCanvas.spawnLightning('#fde047', 5);
    rushTopBadge.classList.remove('hidden');
    rushTopBadge.textContent = '鬼がかり6,000濃厚!!';
    rushTopBadge.className = 'pointer-events-none absolute top-[54px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in whitespace-nowrap';
  }
});

async function resolveNormalReach() {
  const sc = state.pendingReach;
  if (!sc) return;
  state.pendingReach = null;
  const tok = ++seqToken;

  lcdFrame.classList.remove('shake-intense', 'shake-burst');
  setReachBotanState({ vibe: 'idle', color: '' });
  updateReserveSlots('NORMAL');

  if (!sc.isHit) {
    BgmEngine.cut();
    StudioAudio.playFail();
    clearVisualEffects();
    state.phase = 'NORMAL';
    setActiveScene('normal');
    randomMissReels();
    normalTitle.textContent = 'ハズレ…';
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-slate-400';
    normalSub.textContent = `${sc.title}で敗北。次の先バレに期待！`;
    setControlMode('NORMAL');
    setTimeout(() => { if (state.phase === 'NORMAL') BgmEngine.resume('normal'); }, 550);
    if (sc.bareType) {
      addLog(`${state.currentSpin}回`, '先バレ', 'bg-rose-950 text-rose-300 border border-rose-700', sc.title, 'ハズレ', 'text-slate-400');
    }
    updateStatsUI();
    return;
  }

  BgmEngine.cut();
  if (sc.bareType) state.sakibareWins++;
  state.firstHits++;
  state.phase = 'ANIMATING';
  updateStatsUI();
  fireRainbowBurst('大当り!!');

  try {
    if (sc.hesoType === '3000_RUSH') {
      await runWhale3000Direct(tok);
      enterOnigakariRush(state.currentSpin, true);
    } else if (sc.hesoType === '1500_RUSH') {
      const isRevival = Math.random() < 0.35;
      if (isRevival) {
        await runGoldenPromotionSequence({
          fakeSub: '鬼がかりジャッジ失敗…',
          fakeTitle: '通常 1,500 BONUS',
          fakeDesc: 'RUSH非突入（実質純増 +1,400発の持ち玉獲得）',
          fakeStyle: 'despair', fakeIsRush: false, fakeBurstGold: false, rushMode: 'onigakari',
          iwakanAnswer: '',
          finalSub: '死に戻り復活',
          finalTitle: '鬼がかりRUSH 突入!!',
          finalExtra: '払出 1,500個（純増 1,400発）＋ ST144回獲得!!',
          finalSound: '3000',
          token: tok
        });
        enterOnigakariRush(state.currentSpin, false);
      } else {
        StudioAudio.play1500Jackpot(false);
        setAmbientBg('rainbow'); setSunburst(true);
        showFullscreenOverlay({
          mode: 'rainbow', sub: '鬼がかりジャッジ成功', main: '鬼がかりRUSH 突入!!',
          logoKey: 'oniRush',
          extra: '払出 1,500個（純増 1,400発）＋ ST144回獲得!!'
        });
        FxCanvas.burstRainbow(78);
        await wait(1650, tok);
        hideFullscreenOverlay();
        enterOnigakariRush(state.currentSpin, false);
      }
    } else {
      StudioAudio.play1500Jackpot(false);
      setActiveScene('bonus');
      lcdFrame.classList.add('mode-despair-bg');
      setBonusLogo('rezeroPurple');
      bonusSubLabel.textContent = '鬼がかりジャッジ失敗…';
      bonusSubLabel.className = 'text-[11px] font-black text-slate-400 mb-1';
      bonusMainTitle.textContent = '通常 1,500 BONUS';
      bonusMainTitle.className = 'text-2xl font-black text-slate-200';
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
      normalSub.textContent = '純増1,400発を持って通常時へ！';
      setControlMode('NORMAL');
      BgmEngine.resume('normal');
      addLog(`${hitSpin}回`, '初当り(通常)', 'bg-slate-800 text-amber-200 border border-amber-700/60', sc.title, '1,500個 (1,400発)', 'text-amber-200');
      updateStatsUI();
    }
  } catch (e) {}
}

// =========================================================================
// 鬼がかりRUSH（3モード集約・V-STOCK・脳震えペテ高占有率・鬼がかり突当たりの間）
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
  state.hasVStock = false;
  state.pendingResultRevival = false;

  normalHudRow.classList.add('hidden');
  rushMetaHud.classList.remove('hidden');
  rushStatusBar.classList.remove('hidden');
  setVStockBadge(false);

  afterBonusReserveCheck(is3000 ? 'INIT_3000' : 'INIT_1500');
}

async function afterBonusReserveCheck(prevType) {
  const tok = ++seqToken;
  const slots = drawReserve4Slots();
  const hitSlot = slots.find(s => s.hit) || null;
  updateRes4Dots(SPEC.ST_RESERVE);
  state.hasVStock = false;
  setVStockBadge(false);

  try {
    if (hitSlot) {
      // ① WEDDING BONUS 12,000 → 100%即告知＋wedding.jpg公式ロゴ降臨!!
      if (prevType === 'BONUS_6000' && hitSlot.bonusType === 'BONUS_6000') {
        state.rushHoryurenCount++;
        state.phase = 'ANIMATING';
        setControlMode('BUSY');
        BgmEngine.cut();
        state.reserveQueue = [];
        state.stRemaining = SPEC.ST_TOTAL;
        setActiveScene('rush-idle');
        updateStatsUI();
        await wait(950, tok);

        FxCanvas.setAmbient('wedding'); FxCanvas.spawnFeathers(45);
        setAmbientBg('rainbow'); setSunburst(true);
        StudioAudio.play6000Fanfare(true);
        triggerLamp('rainbow', '12,000!!');
        showFullscreenOverlay({
          mode: 'wedding', sub: 'PREMIUM WEDDING', main: '「スバルくん…愛しています」',
          extra: '残保留6,000連荘降臨!!'
        });
        await wait(1550, tok);

        FxCanvas.spawnFeathers(45);
        showFullscreenOverlay({
          mode: 'wedding', sub: 'PREMIUM WEDDING', main: 'WEDDING BONUS 12,000!!',
          logoKey: 'wedding',
          extra: '鬼がかり6,000＋6,000＝計12,000個（実質純増 +11,200発）!!'
        });
        await wait(2450, tok);

        hideFullscreenOverlay();
        state.rushChains++; state.rush6000Count++; state.rushWeddingCount++;
        state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000;
        updateStatsUI();
        afterBonusReserveCheck('BONUS_6000');
        return;
      }

      // ② Re:Start以外の残保留当選：即告知 or V-STOCK点灯
      if (hitSlot.bonusType !== 'RESTART') {
        if (Math.random() < SPEC.HORYUREN_NOTICE_RATE) {
          state.rushHoryurenCount++;
          state.reserveQueue = [];
          state.phase = 'ANIMATING';
          setControlMode('BUSY');
          BgmEngine.cut();
          await wait(620, tok);
          StudioAudio.playPokyun(hitSlot.bonusType === 'BONUS_6000');
          setAmbientBg('rainbow'); setSunburst(true);
          triggerLamp('rainbow', `残保${hitSlot.hitIndex}連!!`);
          FxCanvas.burstRainbow(54);

          const isB6 = hitSlot.bonusType === 'BONUS_6000';
          const label = isB6 ? '超・鬼がかり 6,000 BONUS!!'
            : hitSlot.bonusType === 'BONUS_1500' ? '鬼がかり 1,500 BONUS!!'
            : '鬼がかり 300 BONUS!!';

          if (isB6) StudioAudio.play6000Fanfare(false);
          else StudioAudio.play1500Jackpot(true);

          showFullscreenOverlay({
            mode: 'rainbow', sub: `保留連!!（残保留${hitSlot.hitIndex}個目）`, main: label,
            logoKey: isB6 ? get6000LogoKey(state.rushMode) : (hitSlot.bonusType === 'BONUS_1500' ? 'rezeroChain' : 'rezeroPurple'),
            extra: '大当り直後の奇跡の連荘!!'
          });
          await wait(1900, tok);
          hideFullscreenOverlay();

          if (isB6) {
            state.rushChains++; state.rush6000Count++;
            state.rushDisp += SPEC.DISP_6000; state.rushNet += SPEC.NET_6000; state.balls += SPEC.NET_6000;
          } else if (hitSlot.bonusType === 'BONUS_1500') {
            state.rushChains++;
            state.rushDisp += SPEC.DISP_1500; state.rushNet += SPEC.NET_1500; state.balls += SPEC.NET_1500;
          } else {
            state.rushChains++;
            state.rushDisp += SPEC.DISP_300; state.rushNet += SPEC.NET_300; state.balls += SPEC.NET_300;
          }
          updateStatsUI();
          afterBonusReserveCheck(hitSlot.bonusType);
          return;
        } else if (Math.random() < 0.45) {
          state.hasVStock = true;
          setVStockBadge(true);
        }
      }
    }

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
  lcdFrame.classList.remove('fx-gold', 'bonus-theme-brain', 'bonus-theme-rem');
  if (state.phase !== 'RUSH') return;

  syncRushStages();
  BgmEngine.resume(state.rushMode);

  if (state.rushMode === 'onigakari') {
    FxCanvas.setAmbient('none');
    setAmbientBg('rush');
    lcdFrame.classList.add('fx-gold');
    setLed('red');
    updateReserveSlots('NORMAL');
    randomOniMissReels(false);
    // 黒い英語帯を常時非表示にして巨大3D図柄を主役に！
    setOniBannerQuiet(true);
  } else if (state.rushMode === 'brain') {
    FxCanvas.setAmbient('none');
    setAmbientBg('brain');
    setLed('brain');
    updateReserveSlots('BRAIN');
    setBrainPeteLevel(0, { withFlash: false });
    setBrainTextSwarm(0);
    setBrainButtonState('idle');
  } else {
    FxCanvas.setAmbient('none');
    setAmbientBg('rem');
    setLed('rem');
    updateReserveSlots('NORMAL');
    setRemLampVisual('idle');
    randomRemMissReels(false);
    if (remBottomPtBar) remBottomPtBar.textContent = `${state.rushDisp.toLocaleString()}pt`;
  }
}

function spinRushOnce() {
  if (state.phase !== 'RUSH' || state.stRemaining <= 0) return null;
  if (!infiniteRushMode) state.stRemaining--;
  else state.stRemaining = SPEC.ST_TOTAL;

  if (state.rushMode === 'onigakari') {
    randomOniMissReels(state.autoMode !== null);
  } else if (state.rushMode === 'rem') {
    randomRemMissReels(state.autoMode !== null);
  }

  let isHit = false;
  let bonusType = null;
  if (state.reserveQueue.length > 0) {
    const slot = state.reserveQueue.shift();
    updateRes4Dots(state.reserveQueue.length);
    if (slot.hit) {
      state.reserveQueue = [];
      isHit = true;
      bonusType = slot.bonusType;
      if (state.hasVStock) {
        state.hasVStock = false;
        setVStockBadge(false);
      }
    }
  } else if (Math.random() < SPEC.ST_PROB) {
    isHit = true;
    bonusType = drawRushBonusType();
  }

  if (isHit) return { type: bonusType };
  if (!infiniteRushMode && state.stRemaining <= 0) return { type: 'ST_END' };

  if (state.rushCustNoNotice || state.rushMode === 'rem') return { type: 'MISS', teaser: null };

  let teaser = null;
  if (state.rushMode === 'brain') {
    // ★脳が震えるRUSH：ペテLv1〜4煽り＆見えざる手の出現率を大幅強化★
    const r = Math.random();
    if (r < 0.015) teaser = 'BRAIN_HANDS_GAZE';
    else if (r < 0.055) teaser = 'BRAIN_NOGA_GAZE';
  } else if (state.rushMode === 'onigakari') {
    const r = Math.random();
    if (r < 0.015) teaser = 'ONI_CD_GAZE';
    else if (r < 0.028) teaser = 'ONI_BLINK_GAZE';
    else if (r < 0.040) teaser = 'ONI_CHANCE_GAZE';
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
  state.phase = 'ANIMATING';
  setControlMode('BUSY');

  try {
    if (state.rushCustTrust && teaser === 'TRUST_GAZE') {
      const tr = pickTrustPercent({ isHit: false });
      rushTopBadge.classList.remove('hidden');
      rushTopBadge.textContent = `信頼度 ${tr.txt}`;
      rushTopBadge.className = `pointer-events-none absolute top-[54px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-black/90 border shadow-lg whitespace-nowrap ${tr.cls}`;
      await wait(620, tok);
      rushTopBadge.classList.add('hidden');
    } else if (teaser === 'BRAIN_HANDS_GAZE' || teaser === 'BRAIN_NOGA_GAZE') {
      await playBrainModeSequence({
        isHit: false, is6000: false, bonusType: null,
        isHands: teaser === 'BRAIN_HANDS_GAZE', token: tok
      });
    } else if (teaser === 'ONI_CD_GAZE') {
      await playOnigakariCountdown({ isHit: false, is6000: false, token: tok });
    } else if (teaser === 'ONI_CHANCE_GAZE') {
      setOniReels(6, 7, 6, { hitLock: true });
      FxCanvas.spawnRing('#facc15', 220, 6);
      await wait(480, tok);
      randomOniMissReels(false);
    } else if (teaser === 'ONI_BLINK_GAZE') {
      updateReserveSlots('NORMAL', 'BLINK');
      await wait(480, tok);
      updateReserveSlots('NORMAL', null);
    }

    state.phase = 'RUSH';
    clearIwakanEffects();
    applyRushModeVisuals();
    setControlMode('RUSH');
    updateStatsUI();
    if (resumeAuto) startRushAutoLoop();
  } catch (e) {}
}

function award6000AndContinue() {
  state.rushChains++;
  state.rush6000Count++;
  state.rushDisp += SPEC.DISP_6000;
  state.rushNet += SPEC.NET_6000;
  state.balls += SPEC.NET_6000;
  updateStatsUI();
  afterBonusReserveCheck('BONUS_6000');
}

// =========================================================================
// RUSH当選シーケンス（脳震えペテ88%占有・レム告知75%占有・鬼がかり突当たりの間）
// =========================================================================
async function handleRushHitSequence(bonusType) {
  const tok = ++seqToken;
  const is6000 = bonusType === 'BONUS_6000';
  state.phase = 'ANIMATING';
  state.pendingRushHit = { type: bonusType, okRevealed: false };
  setControlMode('BUSY');
  updateStatsUI();

  let currentIwakan = '';
  let direct6000AlreadyAnnounced = false;
  let alarmAlreadyPlaying = false;

  try {
    // ① 本物のRe:Start（14%）
    if (bonusType === 'RESTART') {
      clearIwakanEffects();
      state.pendingRushHit = null;
      await runNormalRushBonusSequence('RESTART', '');
      return;
    }

    // ② 6,000当選時の共通サプライズ分岐
    // ★脳が震えるRUSHはペテ煽り占有率を極限まで高めるため、共通サプライズを12%に抑制！★
    // ★レム告知モードもレム点灯占有率を高めるため25%に抑制！★
    if (is6000) {
      const surpriseRoll = Math.random();
      const surpriseCap = state.rushMode === 'brain' ? 0.12
        : state.rushMode === 'rem' ? 0.24
        : 0.72;

      if (surpriseRoll < surpriseCap) {
        const sub = Math.random();
        if (state.rushMode === 'onigakari' && sub < 0.24) {
          state.rushIwakanNotes.push('鬼レム接近');
          state.pendingRushHit = null;
          await playOniRemApproach6000(tok);
          award6000AndContinue();
          return;
        }
        if (sub < 0.44) {
          state.rushIwakanNotes.push('突発落ちブル警報');
          state.pendingRushHit = null;
          await runSuddenOchiburu6000({ sub: state.rushMode === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH', rushMode: state.rushMode, token: tok });
          award6000AndContinue();
          return;
        }
        if (sub < 0.62) {
          clearIwakanEffects();
          state.pendingRushHit = null;
          await runRush6000Sequence({ forceFake: 'restart', iwakanAnswer: '' });
          return;
        }
        if (sub < 0.80) {
          state.rushIwakanNotes.push('3秒フリーズ');
          state.pendingRushHit = null;
          await runSudden3sFreeze6000(tok);
          award6000AndContinue();
          return;
        }
        state.rushIwakanNotes.push('出玉カウントアップ突破');
        state.pendingRushHit = null;
        await runCountUpBreak6000({ rushMode: state.rushMode, iwakanAnswer: '', token: tok });
        award6000AndContinue();
        return;
      }
    }

    // ③ 信頼度先バレカスタムON時
    if (state.rushCustTrust) {
      const tr = pickTrustPercent({ isHit: true, is6000 });
      rushTopBadge.classList.remove('hidden');
      rushTopBadge.textContent = `信頼度 ${tr.txt}`;
      rushTopBadge.className = `pointer-events-none absolute top-[54px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border shadow-lg pop-in whitespace-nowrap ${tr.cls}`;
      await wait(520, tok);
    }

    // ④ 違和感演出
    const iwakanChance = state.rushCustIwakan ? 0.68 : 0.22;
    if (Math.random() < iwakanChance) {
      currentIwakan = await playIwakanEffect({ is6000, rushMode: state.rushMode, token: tok });
      if (currentIwakan) state.rushIwakanNotes.push(currentIwakan);
    }

    // ⑤ 予告無しカスタムON時
    if (state.rushCustNoNotice && !is6000) {
      clearIwakanEffects();
      state.pendingRushHit = null;
      await runNormalRushBonusSequence(bonusType, currentIwakan);
      return;
    }

    // ⑥ 3モード別告知
    if (state.rushMode === 'rem') {
      if (Math.random() < 0.36) {
        updateReserveSlots('NORMAL', is6000 ? 'BLINK_RED' : 'BLINK');
        await wait(440, tok);
      }
      const remNote = await playRemNoticePattern({ is6000, token: tok });
      if (remNote) {
        if (!currentIwakan) currentIwakan = remNote;
        state.rushIwakanNotes.push(remNote);
      }
      if (is6000 && (state.pendingRushHit.okRevealed || Math.random() < (state.custOchiburu ? 0.45 : 0.16))) {
        direct6000AlreadyAnnounced = true;
        alarmAlreadyPlaying = state.pendingRushHit.okRevealed;
      }
    } else if (state.rushMode === 'brain') {
      const isHands = is6000 && Math.random() < 0.44;
      const bRes = await playBrainModeSequence({
        isHit: true, is6000, bonusType, isHands,
        custOchiburu: state.custOchiburu, token: tok
      });
      if (bRes.note) {
        if (!currentIwakan) currentIwakan = bRes.note;
        state.rushIwakanNotes.push(bRes.note);
      }
      if (bRes.triggeredOchiburu || state.pendingRushHit.okRevealed) {
        direct6000AlreadyAnnounced = true;
        alarmAlreadyPlaying = true;
      }
    } else {
      // 鬼がかりRUSH：カウントダウン or 突当たり（図柄ビタ揃い→0.55秒静止の絶妙な「間」!!）
      if (is6000 && Math.random() < 0.32) {
        updateReserveSlots('NORMAL', 'BLINK_RED');
        await wait(440, tok);
      }
      if (Math.random() < 0.46) {
        const cdNote = await playOnigakariCountdown({ isHit: true, is6000, token: tok });
        if (cdNote) {
          if (!currentIwakan) currentIwakan = cdNote;
          state.rushIwakanNotes.push(cdNote);
        }
      } else {
        await playOniTotsuAtariPause({ is6000, token: tok });
      }
      if (is6000 && (state.pendingRushHit.okRevealed || Math.random() < (state.custOchiburu ? 0.42 : 0.18))) {
        direct6000AlreadyAnnounced = true;
        alarmAlreadyPlaying = state.pendingRushHit.okRevealed;
      }
    }

    clearIwakanEffects();
    state.pendingRushHit = null;

    if (is6000) {
      if (direct6000AlreadyAnnounced) {
        await runSuddenOchiburu6000({
          sub: state.rushMode === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH',
          rushMode: state.rushMode,
          skipAlarm: alarmAlreadyPlaying,
          token: tok
        });
        award6000AndContinue();
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
    state.pendingRushHit = null;
    clearGlobalChaosEffects();
  }
}

function handleRushEvent(ev, { fromAuto = false } = {}) {
  if (!ev) return;
  if (ev.type === 'MISS') {
    hudRushRemain.className = state.stRemaining <= 15
      ? 'text-lg sm:text-xl font-black crimson-grad-text leading-none'
      : 'text-lg sm:text-xl font-black gold-grad-text leading-none';
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

async function runRush6000Sequence({ forceFake = null, iwakanAnswer = '' } = {}) {
  const tok = ++seqToken;
  state.phase = 'ANIMATING';
  setControlMode('BUSY');

  const rm = state.rushMode;
  const modePrefix = rm === 'brain' ? '脳が震える' : rm === 'rem' ? '鬼化レム' : '鬼がかり';
  const pick = forceFake || (Math.random() < 0.45 ? '300' : '1500');
  let opts;
  if (pick === '300') {
    opts = {
      fakeSub: '右打ち 6%', fakeTitle: `${modePrefix} 300 BONUS`,
      fakeDesc: '実質純増 +280発 ＆ ST144回リセット！',
      fakeStyle: 'despair', fakeRestart: false, fakeIsRush: true, fakeBurstGold: false, rushMode: rm,
      iwakanAnswer,
      finalSub: rm === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH',
      finalTitle: '超・鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'auto'
    };
  } else if (pick === 'restart') {
    opts = {
      fakeSub: '死に戻り', fakeTitle: 'Re:Start',
      fakeDesc: '出玉なし・ST144回へ巻き戻し',
      fakeStyle: 'despair', fakeRestart: true, fakeIsRush: true, fakeBurstGold: false, rushMode: rm,
      iwakanAnswer: '',
      finalSub: 'Re:Start 逆転昇格', finalTitle: '超・鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000',
      crashType: Math.random() < 0.55 ? 'pokyun' : 'auto'
    };
  } else {
    opts = {
      fakeSub: rm === 'brain' ? '脳が震えるRUSH' : rm === 'rem' ? 'レム告知モード' : '右打ち 55%',
      fakeTitle: '1,500 BONUS!!',
      fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
      fakeStyle: 'gold', fakeRestart: false, fakeIsRush: true, fakeBurstGold: true, rushMode: rm,
      iwakanAnswer,
      finalSub: rm === 'brain' ? '脳が震えるRUSH' : '鬼がかりRUSH',
      finalTitle: '超・鬼がかり 6,000 BONUS!!',
      finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'auto'
    };
  }

  try {
    await runGoldenPromotionSequence({ ...opts, token: tok });
    award6000AndContinue();
  } catch (e) {}
}

async function runNormalRushBonusSequence(type, iwakanAnswer = '') {
  const tok = ++seqToken;
  state.phase = 'ANIMATING';
  setControlMode('BUSY');
  BgmEngine.cut();
  setActiveScene('bonus');
  hideIwakanAnswer();

  const rm = state.rushMode;
  const modePrefix = rm === 'brain' ? '脳が震える' : rm === 'rem' ? '鬼化レム' : '鬼がかり';
  const modeSub = rm === 'brain' ? 'BRAIN TREMBLE BONUS' : rm === 'rem' ? 'REM AWAKENING BONUS' : 'ONIGAKARI BONUS';

  try {
    if (type === 'BONUS_1500') {
      StudioAudio.play1500Jackpot(true);
      setAmbientBg(rm === 'brain' ? 'brain' : rm === 'rem' ? 'rem' : 'rainbow');
      setSunburst(true);
      const th = applyBonusModeTheme(rm, { isDespair: false });
      const hasLogo = setBonusLogo(rm === 'brain' ? 'rezeroPurple' : 'rezeroChain');
      if (rm === 'brain') FxCanvas.spawnLightning('#e879f9', 5);
      else if (rm === 'rem') FxCanvas.spawnRing('#38bdf8', 300, 8);
      else FxCanvas.burstGold(40);

      bonusSubLabel.className = th.subCls;
      bonusSubLabel.textContent = modeSub;
      bonusMainTitle.className = th.titleCls;
      bonusMainTitle.textContent = hasLogo ? '1,500 BONUS!!' : `${modePrefix} 1,500 BONUS!!`;
      bonusDesc.textContent = '払出 1,500個（実質純増 +1,400発）獲得！';
      if (iwakanAnswer) showIwakanAnswer(iwakanAnswer, false);
      await wait(1380, tok);
      setSunburst(false);
      state.rushChains++; state.rushDisp += SPEC.DISP_1500; state.rushNet += SPEC.NET_1500; state.balls += SPEC.NET_1500;
      updateStatsUI();
      afterBonusReserveCheck('BONUS_1500');
    } else if (type === 'BONUS_300') {
      StudioAudio.play1500Jackpot(true);
      const th = applyBonusModeTheme(rm, { isDespair: true });
      const hasLogo = setBonusLogo('rezeroPurple');
      bonusSubLabel.className = th.subCls;
      bonusSubLabel.textContent = '右打ち 6%';
      bonusMainTitle.className = th.titleCls;
      bonusMainTitle.textContent = hasLogo ? '300 BONUS' : `${modePrefix} 300 BONUS`;
      bonusDesc.textContent = '実質純増 +280発 ＆ ST144回リセット！';
      if (iwakanAnswer) showIwakanAnswer(iwakanAnswer, false);
      await wait(1300, tok);
      state.rushChains++; state.rushDisp += SPEC.DISP_300; state.rushNet += SPEC.NET_300; state.balls += SPEC.NET_300;
      updateStatsUI();
      afterBonusReserveCheck('BONUS_300');
    } else {
      StudioAudio.playReStart();
      setBonusLogo(null);
      lcdFrame.classList.add('fx-restart', 'mode-despair-bg');
      bonusSubLabel.textContent = '死に戻り';
      bonusSubLabel.className = 'text-[11px] font-black tracking-[0.18em] text-slate-400 mb-1';
      bonusMainTitle.textContent = 'Re:Start';
      bonusMainTitle.className = 'text-4xl font-black text-slate-200 pop-in';
      bonusDesc.textContent = '出玉なし・ST144回へ巻き戻し';
      await wait(1250, tok);
      lcdFrame.classList.remove('fx-restart');
      state.rushRestartCount++;
      updateStatsUI();
      afterBonusReserveCheck('RESTART');
    }
  } catch (e) {}
}

function finishRush() {
  BgmEngine.cut();
  StudioAudio.playFail();
  state.phase = 'ANIMATING';
  setControlMode('BUSY');
  setAmbientBg(''); setSunburst(false);
  setVStockBadge(false);
  FxCanvas.setAmbient('ember');

  state.pendingResultRevival = Math.random() < 0.03;

  // リザルトモーダル上部に公式RUSHロゴがあれば挿入
  const modalBox = resultModal.querySelector('div');
  if (modalBox) {
    let logoHolder = document.getElementById('resModalLogoHolder');
    if (!logoHolder) {
      logoHolder = document.createElement('div');
      logoHolder.id = 'resModalLogoHolder';
      logoHolder.className = 'w-full flex items-center justify-center mb-2';
      modalBox.insertBefore(logoHolder, modalBox.firstChild);
    }
    const logoUrl = state.rushMode === 'brain'
      ? (Assets.getLogo('brainRush') || Assets.getLogo('oniRush'))
      : Assets.getLogo('oniRush');
    logoHolder.innerHTML = logoUrl
      ? `<img src="${logoUrl}" alt="RUSH RESULT" class="max-h-20 object-contain drop-shadow-[0_0_14px_rgba(250,204,21,0.65)]">`
      : '';
  }

  document.getElementById('resChains').textContent = `${state.rushChains} 連`;
  document.getElementById('res6000').textContent = `${state.rush6000Count} 回`;
  document.getElementById('resSpecial').textContent = `${state.rushRestartCount}回 / ${state.rushHoryurenCount}回`;
  document.getElementById('resNet').textContent = `${state.rushNet.toLocaleString()} 発`;
  const cashEst = Math.round(state.rushNet * exchangeRate);
  const lastIwakan = state.rushIwakanNotes.length > 0 ? `\n${state.rushIwakanNotes.slice(-2).join(' / ')}` : '';
  document.getElementById('resSummaryText').textContent =
    `総獲得払出 ${state.rushDisp.toLocaleString()}個（換金目安 ${cashEst.toLocaleString()}円）` +
    (state.rushWeddingCount > 0 ? `\nWEDDING 12,000 ×${state.rushWeddingCount}回!!` : '') +
    lastIwakan;
  resultModal.classList.remove('hidden');
  updateStatsUI();
}

// =========================================================================
// 「🎬 テスト ▾」＆開発用ボタン
// =========================================================================
const promoTestMenu = document.getElementById('promoTestMenu');
document.getElementById('btnTestPromo').addEventListener('click', () => { promoTestMenu.classList.toggle('hidden'); });
document.getElementById('btnClosePromoMenu').addEventListener('click', () => { promoTestMenu.classList.add('hidden'); });

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
  if (infiniteRushMode && state.phase === 'RUSH') {
    state.stRemaining = SPEC.ST_TOTAL;
    updateStatsUI();
  }
});

let randomCrashIdx = 0, remTestIdx = 0, brainTestLvIdx = 0;

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
      if (kind === 'freeze3s') {
        await runSudden3sFreeze6000(tok);
      } else if (kind === 'countup6000') {
        await runCountUpBreak6000({ rushMode: prevPhase === 'RUSH' ? prevRMode : 'onigakari', iwakanAnswer: '残り回数消失', token: tok });
      } else if (kind === 'brain4') {
        brainTestOverride = true; state.rushMode = 'brain';
        clearVisualEffects(); setActiveScene('rush-idle');
        setAmbientBg('brain'); setLed('brain');
        setBrainPeteLevel(0, { withFlash: false }); setBrainTextSwarm(0); setBrainButtonState('idle');
        await wait(850, tok);
        const lvs = [5, 4, 3];
        await playBrainModeSequence({
          isHit: true, is6000: true, bonusType: 'BONUS_6000',
          isHands: brainTestLvIdx % 3 === 0, custOchiburu: true,
          forceTargetLv: lvs[brainTestLvIdx++ % lvs.length], token: tok
        });
        await runSuddenOchiburu6000({ sub: '脳が震えるRUSH', rushMode: 'brain', skipAlarm: true, token: tok });
        brainTestOverride = false;
      } else if (kind === 'remLamp') {
        remTestOverride = true; state.rushMode = 'rem';
        clearVisualEffects(); setActiveScene('rush-idle');
        setAmbientBg('rem'); setLed('rem'); setRemLampVisual('idle'); randomRemMissReels(false);
        await wait(650, tok);
        const pats = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH', 'NORMAL'];
        const pat = pats[remTestIdx++ % pats.length];
        await playRemNoticePattern({ is6000: pat !== 'NORMAL', forcePat: pat, token: tok });
        await wait(800, tok);
        remTestOverride = false;
      } else if (kind === 'oniApproach') {
        oniTestOverride = true; state.rushMode = 'onigakari';
        clearVisualEffects(); setActiveScene('rush-idle');
        setAmbientBg('rush'); setLed('red'); setOniBannerQuiet(true);
        randomOniMissReels(true);
        await wait(550, tok);
        await playOniRemApproach6000(tok);
        oniTestOverride = false;
      } else if (kind === 'suddenOchi') {
        await runSuddenOchiburu6000({ sub: '鬼がかりRUSH', rushMode: prevRMode, token: tok });
      } else if (kind === 'whale3000') {
        await runWhale3000Direct(tok);
      } else if (kind === 'pokyun') {
        await runGoldenPromotionSequence({
          fakeSub: '死に戻り', fakeTitle: 'Re:Start', fakeDesc: '出玉なし・ST144回へ巻き戻し',
          fakeStyle: 'despair', fakeRestart: true, fakeIsRush: true, fakeBurstGold: false, rushMode: prevRMode,
          iwakanAnswer: '', finalSub: 'Re:Start 逆転昇格', finalTitle: '超・鬼がかり 6,000 BONUS!!',
          finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!', finalSound: '6000', crashType: 'pokyun', token: tok
        });
      } else if (kind === 'revivalResult') {
        await runResultRevivalSequence(tok);
      } else {
        const modes = ['botan', 'drop', 'shatter', 'quake', 'slash'];
        const pickMode = modes[randomCrashIdx++ % modes.length];
        await runGoldenPromotionSequence({
          fakeSub: '右打ち 55%', fakeTitle: '1,500 BONUS!!',
          fakeDesc: '払出 1,500個（実質純増 +1,400発）獲得！',
          fakeStyle: 'gold', fakeRestart: false, fakeIsRush: true, fakeBurstGold: true, rushMode: prevRMode,
          iwakanAnswer: 'サイドLED片側消灯', finalSub: '鬼がかりRUSH',
          finalTitle: '超・鬼がかり 6,000 BONUS!!', finalExtra: '払出 6,000個（実質純増 5,600発）獲得!!',
          finalSound: '6000', crashType: pickMode, token: tok
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
// 実戦操作イベントバインド
// =========================================================================
document.getElementById('btnCloseResult').addEventListener('click', async () => {
  resultModal.classList.add('hidden');

  if (state.pendingResultRevival) {
    state.pendingResultRevival = false;
    const tok = ++seqToken;
    state.phase = 'ANIMATING'; setControlMode('BUSY');
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

  state.phase = 'NORMAL'; state.reserveQueue = [];
  clearVisualEffects(); FxCanvas.setAmbient('ember'); updateReserveSlots('NORMAL');
  normalHudRow.classList.remove('hidden'); rushMetaHud.classList.add('hidden');
  rushStatusBar.classList.add('hidden'); setVStockBadge(false);
  stateBadge.textContent = '通常時 1/349.9';
  stateBadge.className = 'px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black bg-black/80 border border-amber-500/70 text-amber-200 shadow whitespace-nowrap';
  setActiveScene('normal');
  normalTitle.textContent = '通常時'; normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
  normalSub.textContent = '鬼がかりRUSH終了！次の先バレを狙おう！';
  setControlMode('NORMAL'); BgmEngine.resume('normal'); updateStatsUI();
});

document.getElementById('btnSpin1').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  stopAuto();
  const res = drawNormalSpin();
  if (res.bareType || res.isHit) startNormalReach(res);
  else {
    clearVisualEffects(); setActiveScene('normal'); randomMissReels();
    normalTitle.textContent = `${state.currentSpin} 回転`;
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
    normalSub.textContent = '通常変動中…（1/349.9）';
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
  clearVisualEffects(); setActiveScene('normal'); randomMissReels();
  normalTitle.textContent = `${state.currentSpin} 回転`;
  normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
  normalSub.textContent = '10回転消化（先バレなし）';
  updateStatsUI();
});

document.getElementById('btnAutoSakibare').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  if (state.autoMode === 'SAKIBARE') { stopAuto(); return; }
  stopAuto(); state.autoMode = 'SAKIBARE'; setActiveScene('normal');
  document.getElementById('btnAutoSakibare').textContent = '⏹ 停止';
  state.autoTimer = setInterval(() => {
    for (let i = 0; i < 5; i++) {
      const res = drawNormalSpin();
      if (res.bareType || res.isHit) { startNormalReach(res); return; }
    }
    setReels(Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, { spinning: [true, true, true] });
    normalTitle.textContent = `${state.currentSpin} 回転`;
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
    normalSub.textContent = '先バレ待機中… 高速回転中！';
    updateStatsUI();
  }, 32);
});

document.getElementById('btnAutoHit').addEventListener('click', () => {
  if (state.phase !== 'NORMAL') return;
  if (state.autoMode === 'HIT') { stopAuto(); return; }
  stopAuto(); state.autoMode = 'HIT'; setActiveScene('normal');
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
    setReels(Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, { spinning: [true, true, true] });
    normalTitle.textContent = `${state.currentSpin} 回転`;
    normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
    normalSub.textContent = '大当りまで高速オート消化中…';
    updateStatsUI();
  }, 30);
});

document.getElementById('btnStopAuto').addEventListener('click', () => {
  stopAuto();
  if (state.phase === 'NORMAL') randomMissReels();
  else if (state.phase === 'RUSH' && state.rushMode === 'onigakari') randomOniMissReels(false);
  else if (state.phase === 'RUSH' && state.rushMode === 'rem') randomRemMissReels(false);
});

document.getElementById('btnResetPlay').addEventListener('click', () => {
  seqToken++; stopAuto(); hideFullscreenOverlay(); resultModal.classList.add('hidden');
  rushStatusBar.classList.add('hidden'); normalHudRow.classList.remove('hidden'); rushMetaHud.classList.add('hidden');
  setVStockBadge(false);

  Object.assign(state, {
    phase: 'NORMAL', currentSpin: 0, totalNormalSpins: 0, firstHits: 0, rushHits: 0,
    sakibareTotal: 0, sakibareWins: 0, totalInvestYen: 0, balls: 0, unspentFrac: 0,
    pendingReach: null, pendingRushHit: null, pendingResultRevival: false, hasVStock: false,
    reserveQueue: [], stRemaining: 0, rushChains: 0, rushDisp: 0, rushNet: 0,
    rush6000Count: 0, rushWeddingCount: 0, rushHoryurenCount: 0, rushRestartCount: 0,
    rushIwakanNotes: [], history: []
  });

  clearVisualEffects(); FxCanvas.clearAll(); FxCanvas.setAmbient('ember');
  updateReserveSlots('NORMAL'); setActiveScene('normal'); setReels(7, 3, 7);
  stateBadge.textContent = '通常時 1/349.9';
  normalTitle.textContent = 'STANDBY'; normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
  normalSub.textContent = 'データをリセットしました。';
  document.getElementById('historyTableBody').innerHTML = '<tr><td colspan="4" class="py-5 text-center text-amber-200/50">まだ履歴はありません。</td></tr>';
  setControlMode('NORMAL'); BgmEngine.resume('normal'); updateStatsUI();
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

document.getElementById('btnRush1').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  stopAuto(); handleRushEvent(spinRushOnce(), { fromAuto: false });
});

document.getElementById('btnRush10').addEventListener('click', () => {
  if (state.phase !== 'RUSH') return;
  stopAuto();
  let rem = 10; state.autoMode = 'RUSH10';
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
  let guard = 0;
  while (state.phase === 'RUSH' && state.stRemaining > 0 && guard < 1500) {
    guard++;
    const ev = spinRushOnce();
    if (!ev || ev.type !== 'MISS') { handleRushEvent(ev, { fromAuto: false }); return; }
  }
});

// カスタム切替
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
    ? 'py-2 px-1 rounded-xl text-[11px] font-black border transition bg-amber-600/70 border-amber-300 text-amber-50 active:scale-95'
    : 'py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('togglePremier').addEventListener('click', e => {
  state.custPremier = !state.custPremier;
  e.target.textContent = `🌈 プレミアUP: ${state.custPremier ? 'ON' : 'OFF'}`;
  e.target.className = state.custPremier
    ? 'py-2 px-1 rounded-xl text-[11px] font-black border transition bg-fuchsia-700/75 border-fuchsia-300 text-white shadow active:scale-95'
    : 'py-2 px-1 rounded-xl text-[11px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});

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

document.getElementById('toggleRushTrust').addEventListener('click', e => {
  state.rushCustTrust = !state.rushCustTrust;
  e.target.textContent = `🎯 信頼度先バレ: ${state.rushCustTrust ? 'ON' : 'OFF'}`;
  e.target.className = state.rushCustTrust
    ? 'py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-cyan-700/80 border-cyan-300 text-white shadow active:scale-95'
    : 'py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('toggleRushIwakan').addEventListener('click', e => {
  state.rushCustIwakan = !state.rushCustIwakan;
  e.target.textContent = `👁️ 違和感UP: ${state.rushCustIwakan ? 'ON' : 'OFF'}`;
  e.target.className = state.rushCustIwakan
    ? 'py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-purple-700/80 border-fuchsia-300 text-white shadow active:scale-95'
    : 'py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
});
document.getElementById('toggleRushNoNotice').addEventListener('click', e => {
  state.rushCustNoNotice = !state.rushCustNoNotice;
  e.target.textContent = `🤫 予告無し: ${state.rushCustNoNotice ? 'ON' : 'OFF'}`;
  e.target.className = state.rushCustNoNotice
    ? 'py-1.5 px-1 rounded-xl text-[10px] font-black border transition bg-amber-700/80 border-amber-300 text-white shadow active:scale-95'
    : 'py-1.5 px-1 rounded-xl text-[10px] font-bold border transition bg-slate-900 border-slate-700 text-slate-400 active:scale-95';
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
          if (isWed) { weddingCount++; horyurenCount++; }
          else if (hitBonus !== 'RESTART' && Math.random() < SPEC.HORYUREN_NOTICE_RATE) horyurenCount++;
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
  canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
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
// ヘッダー・チューナー・BGM・タブ同期
// =========================================================================
document.getElementById('btnTestPokyun').addEventListener('click', () => {
  StudioAudio.playPokyun(false);
  setAmbientBg('redbare'); triggerLamp('red', 'ポキュ↑ーン↓');
  lcdFrame.classList.remove('fx-redbare', 'shake-burst'); void lcdFrame.offsetWidth;
  lcdFrame.classList.add('fx-redbare', 'shake-burst'); FxCanvas.burstFlames(30);
  setTimeout(() => { if (state.phase === 'NORMAL') setAmbientBg(''); }, 1100);
});

document.getElementById('btnTestOchiburu').addEventListener('click', () => StudioAudio.playOchiburu(true));
document.getElementById('btnTestPuchun').addEventListener('click', () => { BgmEngine.cut(); StudioAudio.playPuchun(); });
document.getElementById('btnToggleTuner').addEventListener('click', () => { document.getElementById('audioTunerDrawer').classList.toggle('hidden'); });

document.getElementById('btnToggleBgm').addEventListener('click', e => {
  const on = BgmEngine.toggle();
  e.target.textContent = on ? '🎵 BGM' : '🔇 BGM';
  e.target.className = on
    ? 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/60 active:scale-95 transition'
    : 'px-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700 active:scale-95 transition';
});

document.getElementById('btnSpeedToggle').addEventListener('click', e => {
  fastMode = !fastMode;
  e.target.textContent = fastMode ? '⚡ 高速' : '⏱ 極上';
  e.target.className = fastMode
    ? 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-amber-600/80 text-white border border-amber-300 active:scale-95 transition'
    : 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-indigo-950 hover:bg-indigo-900 text-cyan-300 border border-cyan-500/50 active:scale-95 transition';
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
  e.target.textContent = m ? '🔇 OFF' : '🔊 ON';
  e.target.className = m
    ? 'text-[10px] font-black text-rose-400 px-2 py-1 rounded bg-slate-800 border border-slate-600 active:scale-95 transition'
    : 'text-[10px] font-black text-emerald-300 px-2 py-1 rounded bg-slate-800 border border-slate-600 active:scale-95 transition';
});

document.getElementById('tabPlay').addEventListener('click', () => {
  document.getElementById('playModeContainer').classList.remove('hidden');
  document.getElementById('sim100Container').classList.add('hidden');
  document.getElementById('tabPlay').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-gradient-to-r from-rose-700 via-amber-600 to-yellow-600 text-white shadow border border-yellow-200/60';
  document.getElementById('tabSim100').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-[#1e0d08]/90 text-amber-200/70 hover:text-amber-100 border border-amber-900/60';
  setTimeout(() => { FxCanvas.resize(); StageBg.resize(); }, 30);
});

document.getElementById('tabSim100').addEventListener('click', () => {
  stopAuto();
  document.getElementById('playModeContainer').classList.add('hidden');
  document.getElementById('sim100Container').classList.remove('hidden');
  document.getElementById('tabSim100').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-gradient-to-r from-amber-600 via-rose-600 to-red-800 text-white shadow border border-yellow-200/60';
  document.getElementById('tabPlay').className = 'flex-1 py-1.5 rounded-lg text-[11px] sm:text-xs font-black transition-all bg-[#1e0d08]/90 text-amber-200/70 hover:text-amber-100 border border-amber-900/60';
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
