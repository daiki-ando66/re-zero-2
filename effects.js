// =========================================================================
// effects.js : 最前面HTML5 Canvasエフェクト・液晶演出・4ステップ昇格エンジン
// =========================================================================
const FxCanvas = (() => {
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');
  let w = 360, h = 360;
  let ambientMode = 'ember'; // 'ember' | 'rush' | 'rem' | 'wedding' | 'none'

  const particles = [], rings = [], bolts = [], cracks = [];

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(100, rect.width);
    h = Math.max(100, rect.height);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function clearAll() {
    particles.length = 0; rings.length = 0; bolts.length = 0; cracks.length = 0;
    ctx.clearRect(0, 0, w, h);
  }

  function spawnRing(color = '#ef4444', maxR = 260, lw = 7) {
    rings.push({ x: w / 2, y: h / 2, r: 12, maxR, color, lw, alpha: 1 });
  }

  function spawnLightning(color = '#fde047', count = 4) {
    for (let n = 0; n < count; n++) {
      const pts = [];
      let x = Math.random() * w, y = 0;
      pts.push({ x, y });
      for (let i = 1; i <= 8; i++) {
        x += (Math.random() - 0.5) * 84;
        y = (h / 8) * i;
        pts.push({ x, y });
      }
      bolts.push({ pts, color, alpha: 1 });
    }
  }

  // Step 3用：漆黒の画面に走る赤い亀裂
  function spawnRedCracks() {
    cracks.length = 0;
    const cx = w * 0.5, cy = h * 0.5;
    for (let b = 0; b < 7; b++) {
      const baseA = (Math.PI * 2 * b) / 7 + (Math.random() - 0.5) * 0.4;
      const pts = [{ x: cx, y: cy }];
      let px = cx, py = cy;
      for (let s = 1; s <= 6; s++) {
        const len = 24 + Math.random() * 28;
        const a = baseA + (Math.random() - 0.5) * 0.7;
        px += Math.cos(a) * len; py += Math.sin(a) * len;
        pts.push({ x: px, y: py });
      }
      cracks.push({ pts, progress: 0 });
    }
  }
  function clearCracks() { cracks.length = 0; }

  function burstGold(count = 60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.4 + Math.random() * 6.5;
      particles.push({
        type: 'confetti', x: w * 0.5, y: h * 0.48,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.0,
        size: 4 + Math.random() * 5, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.25,
        color: ['#fde047', '#facc15', '#ef4444', '#ffffff', '#fb7185'][i % 5],
        alpha: 1, decay: 0.011 + Math.random() * 0.008
      });
    }
  }

  function burstFlames(count = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.8 + Math.random() * 5.2;
      particles.push({
        type: 'spark', x: w * 0.5, y: h * 0.5,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 4.2,
        color: ['#ef4444', '#f97316', '#fde047'][i % 3],
        alpha: 1, decay: 0.02 + Math.random() * 0.015
      });
    }
  }

  function spawnFeathers(count = 36) {
    for (let i = 0; i < count; i++) {
      particles.push({
        type: 'feather', x: Math.random() * w, y: -15 - Math.random() * h * 0.45,
        vx: (Math.random() - 0.5) * 1.1, vy: 0.9 + Math.random() * 1.5,
        size: 7 + Math.random() * 6, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.04,
        sway: Math.random() * Math.PI * 2,
        color: i % 3 === 0 ? '#fef08a' : '#ffffff',
        alpha: 0.95, decay: 0.004
      });
    }
  }

  function tick() {
    ctx.clearRect(0, 0, w, h);

    if (ambientMode === 'ember' && particles.length < 18 && Math.random() < 0.22) {
      particles.push({
        type: 'spark', x: Math.random() * w, y: h + 8,
        vx: (Math.random() - 0.5) * 0.5, vy: -(0.6 + Math.random() * 1.2),
        size: 1.5 + Math.random() * 2.2,
        color: Math.random() < 0.7 ? '#e11d48' : '#fb923c', alpha: 0.55, decay: 0.006
      });
    } else if (ambientMode === 'rush' && particles.length < 32 && Math.random() < 0.35) {
      particles.push({
        type: 'spark', x: Math.random() * w, y: h + 8,
        vx: (Math.random() - 0.5) * 1.0, vy: -(1.2 + Math.random() * 2.0),
        size: 1.8 + Math.random() * 2.8,
        color: Math.random() < 0.55 ? '#facc15' : '#ef4444', alpha: 0.75, decay: 0.009
      });
    } else if (ambientMode === 'rem' && particles.length < 22 && Math.random() < 0.25) {
      particles.push({
        type: 'spark', x: Math.random() * w, y: h + 8,
        vx: (Math.random() - 0.5) * 0.4, vy: -(0.5 + Math.random() * 0.9),
        size: 2 + Math.random() * 2.2,
        color: Math.random() < 0.7 ? '#38bdf8' : '#e0f2fe', alpha: 0.7, decay: 0.006
      });
    } else if (ambientMode === 'wedding' && particles.length < 48 && Math.random() < 0.35) {
      spawnFeathers(1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
      if (p.alpha <= 0 || p.y < -60 || p.y > h + 60) { particles.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      if (p.type === 'spark') {
        ctx.fillStyle = p.color; ctx.shadowBlur = 10; ctx.shadowColor = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'confetti') {
        p.vy += 0.12; p.rot += p.vrot;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      } else if (p.type === 'feather') {
        p.sway += 0.05; p.x += Math.sin(p.sway) * 0.85; p.rot += p.vrot;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.color; ctx.shadowBlur = 8; ctx.shadowColor = '#fde047';
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.r += (r.maxR - r.r) * 0.16 + 4; r.alpha -= 0.036;
      if (r.alpha <= 0 || r.r >= r.maxR) { rings.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.strokeStyle = r.color; ctx.lineWidth = r.lw * r.alpha;
      ctx.shadowBlur = 16; ctx.shadowColor = r.color;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }

    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.alpha -= 0.08;
      if (b.alpha <= 0) { bolts.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = b.alpha;
      ctx.strokeStyle = b.color; ctx.lineWidth = 3;
      ctx.shadowBlur = 18; ctx.shadowColor = b.color;
      ctx.beginPath();
      b.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y));
      ctx.stroke(); ctx.restore();
    }

    if (cracks.length > 0) {
      cracks.forEach(cr => {
        cr.progress = Math.min(cr.pts.length - 1, cr.progress + 0.32);
        const maxIdx = Math.floor(cr.progress);
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.6;
        ctx.shadowBlur = 14; ctx.shadowColor = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(cr.pts[0].x, cr.pts[0].y);
        for (let i = 1; i <= maxIdx; i++) ctx.lineTo(cr.pts[i].x, cr.pts[i].y);
        ctx.stroke();
        ctx.restore();
      });
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  setTimeout(resize, 40);
  requestAnimationFrame(tick);

  return {
    resize, clearAll,
    setAmbient: m => { ambientMode = m; },
    spawnRing, spawnLightning, spawnRedCracks, clearCracks, burstGold, burstFlames, spawnFeathers
  };
})();

// =========================================================================
// 演出タイミング制御＆演出系DOM参照
// =========================================================================
let fastMode = false;
let seqToken = 0;

function wait(ms, token = seqToken) {
  const dur = Math.max(60, Math.round(ms * (fastMode ? 0.40 : 1.0)));
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (token !== seqToken) reject('CANCELLED');
      else resolve();
    }, dur);
  });
}

const lcdFrame = document.getElementById('lcdFrame');
const ledLeft = document.getElementById('ledLeft');
const ledRight = document.getElementById('ledRight');
const slashHost = document.getElementById('slashHost');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const crtScanLayer = document.getElementById('crtScanLayer');
const fsSub = document.getElementById('fsSub');
const fsMain = document.getElementById('fsMain');
const fsExtra = document.getElementById('fsExtra');
const res4Dots = document.querySelectorAll('.res4-dot');

// 排他シーン要素（同時に1つしか表示されない）
const scenePanes = {
  normal: document.getElementById('scene-normal'),
  reach: document.getElementById('scene-reach'),
  'rush-idle': document.getElementById('scene-rush-idle'),
  bonus: document.getElementById('scene-bonus')
};

const reelBoxes = [0,1,2].map(i => document.getElementById(`reelBox${i}`));
const reelNums = [0,1,2].map(i => document.getElementById(`reelNum${i}`));
const pushButtonArea = document.getElementById('pushButtonArea');
const btnOniPush = document.getElementById('btnOniPush');
const btnSecretOk = document.getElementById('btnSecretOk');

const bonusSubLabel = document.getElementById('bonusSubLabel');
const bonusMainTitle = document.getElementById('bonusMainTitle');
const bonusDesc = document.getElementById('bonusDesc');
const subtleWhisperSlot = document.getElementById('subtleWhisperSlot');
const subtleWhisperText = document.getElementById('subtleWhisperText');

const oniLamp = document.getElementById('oniLamp');
const lampRippleHost = document.getElementById('lampRippleHost');
const lampStatusText = document.getElementById('lampStatusText');
const lampEmoji = document.getElementById('lampEmoji');
const reserveLabel = document.getElementById('reserveLabel');
const resSlots = [0,1,2,3,4].map(i => document.getElementById(`resSlot${i}`));

// ★単一シーン排他切替関数（文字重なりを構造的にゼロ化）★
function setActiveScene(sceneName) {
  state.activeScene = sceneName;
  Object.entries(scenePanes).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== sceneName);
  });
  if (sceneName !== 'bonus') {
    subtleWhisperSlot.classList.add('hidden');
    subtleWhisperSlot.classList.remove('fx-whisper-in');
  }
  if (sceneName !== 'reach') {
    pushButtonArea.classList.add('hidden');
  }
  btnSecretOk.classList.toggle('secret-ok-active', sceneName === 'reach');
}

// 完全不透明 全画面オーバーレイ制御
function showFullscreenOverlay({ mode = 'blackout', sub = '', main = '', extra = '', scanlines = false }) {
  fullscreenOverlay.classList.remove('hidden', 'overlay-blackout', 'overlay-6000', 'overlay-wedding');
  crtScanLayer.classList.toggle('hidden', !scanlines);

  if (mode === 'wedding') {
    fullscreenOverlay.classList.add('overlay-wedding');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-rose-600 mb-2';
    fsMain.className = 'relative z-10 font-mincho text-2xl sm:text-4xl font-black text-rose-700 tracking-wider leading-snug pop-in px-1';
    fsExtra.className = 'relative z-10 mt-3 text-xs sm:text-sm font-bold text-rose-900/90 max-w-md';
  } else if (mode === '6000') {
    fullscreenOverlay.classList.add('overlay-6000');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-amber-300 mb-2';
    fsMain.className = 'relative z-10 text-3xl sm:text-5xl font-black rainbow-grad-text tracking-wider leading-tight pop-in px-1';
    fsExtra.className = 'relative z-10 mt-3 text-xs sm:text-sm font-bold text-amber-100/95 max-w-md';
  } else if (mode === 'gold') {
    fullscreenOverlay.classList.add('overlay-6000');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-rose-300 mb-2';
    fsMain.className = 'relative z-10 text-3xl sm:text-5xl font-black gold-grad-text tracking-wider leading-tight pop-in px-1';
    fsExtra.className = 'relative z-10 mt-3 text-xs sm:text-sm font-bold text-amber-100/95 max-w-md';
  } else {
    fullscreenOverlay.classList.add('overlay-blackout');
    fsSub.className = 'relative z-10 text-xs font-black tracking-[0.22em] text-rose-500/80 mb-2';
    fsMain.className = 'relative z-10 font-mincho text-2xl sm:text-3xl font-black text-rose-100 tracking-widest';
    fsExtra.className = 'relative z-10 mt-2 text-xs text-slate-400';
  }

  fsSub.textContent = sub;
  fsMain.textContent = main;
  fsExtra.textContent = extra;
}

function hideFullscreenOverlay() {
  fullscreenOverlay.classList.add('hidden');
  crtScanLayer.classList.add('hidden');
  FxCanvas.clearCracks();
}

// =========================================================================
// 演出UIヘルパー（LED・リール・保留・ランプ・物理スラッシュ）
// =========================================================================
function setLed(style) {
  [ledLeft, ledRight].forEach(el => {
    el.className = 'led-bar shrink-0' + (style ? ` led-${style}` : '');
  });
}

function setReels(a, b, c, { spinning = [false, false, false], tenpai = false } = {}) {
  [a, b, c].forEach((v, i) => {
    reelNums[i].textContent = v;
    reelNums[i].className = `text-4xl sm:text-5xl font-black ${v % 2 === 1 ? 'gold-grad-text' : 'crimson-grad-text'}${spinning[i] ? ' reel-spinning' : ''}`;
    reelBoxes[i].classList.toggle('reel-tenpai', tenpai && (i === 0 || i === 2));
  });
}

function randomMissReels() {
  const a = Math.floor(Math.random() * 7) + 1;
  const b = Math.floor(Math.random() * 7) + 1;
  let c = Math.floor(Math.random() * 7) + 1;
  if (a === c) c = (c % 7) + 1;
  setReels(a, b, c);
}

function updateReserveSlots(mode = 'NORMAL', special = null) {
  if (mode === 'BRAIN') {
    reserveLabel.textContent = '文字保留';
    ['脳', 'が', '震', 'え', 'る'].forEach((ch, i) => {
      const el = resSlots[i];
      el.classList.remove('hidden');
      el.textContent = ch;
      if (special === 'HIT') {
        el.className = 'w-8 h-8 rounded-full border-2 border-amber-300 bg-gradient-to-br from-rose-600 to-purple-800 flex items-center justify-center text-xs font-black text-amber-200 shadow-lg animate-pulse';
      } else if (special === 'GAZE' && i < 2) {
        el.className = 'w-8 h-8 rounded-full border-2 border-rose-400 bg-rose-950 flex items-center justify-center text-xs font-black text-rose-200';
      } else {
        el.className = 'w-8 h-8 rounded-full border-2 border-purple-700/80 bg-purple-950/80 flex items-center justify-center text-xs font-black text-purple-300';
      }
    });
    return;
  }

  reserveLabel.textContent = '保留';
  resSlots[4].classList.add('hidden');
  for (let i = 0; i < 4; i++) {
    const el = resSlots[i];
    if (i === 0 && special === 'RED') {
      el.textContent = '鬼';
      el.className = 'w-8 h-8 rounded-full border-2 border-rose-200 bg-gradient-to-br from-red-500 to-rose-900 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-red-600/80 animate-pulse';
    } else if (i === 0 && special === 'RAINBOW') {
      el.textContent = '鬼';
      el.className = 'w-8 h-8 rounded-full border-2 border-white lamp-rainbow flex items-center justify-center text-xs font-black text-slate-950 shadow-lg animate-bounce';
    } else {
      el.textContent = '○';
      el.className = 'w-8 h-8 rounded-full border-2 border-slate-700 bg-slate-900/90 flex items-center justify-center text-[10px] font-black text-slate-400';
    }
  }
}

function updateRes4Dots(activeCount) {
  res4Dots.forEach((dot, i) => {
    dot.className = i < activeCount
      ? 'res4-dot w-2 h-2 rounded-full bg-amber-400 border border-yellow-100 shadow'
      : 'res4-dot w-2 h-2 rounded-full bg-slate-800 border border-slate-600';
  });
}

function clearVisualEffects() {
  lcdFrame.classList.remove('fx-redbare', 'fx-rainbow', 'fx-gold', 'fx-restart', 'fx-glitch', 'shake-intense', 'shake-burst', 'mode-brain-bg', 'mode-rem-bg', 'mode-despair-bg');
  btnOniPush.classList.remove('ochiburu-dome', 'push-dome-gold');
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow');
  FxCanvas.clearCracks();
  setLed('');
  lampStatusText.textContent = state.phase === 'RUSH' ? 'RUSH中' : '待機中';
  lampStatusText.className = 'text-[10px] font-black text-amber-200 min-w-[54px] text-right whitespace-nowrap';
  lampEmoji.textContent = (state.phase === 'RUSH' && state.rushMode === 'rem') ? '💙' : '👹';
}

function triggerLamp(type, label) {
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow');
  void oniLamp.offsetWidth;
  if (type === 'red') { oniLamp.classList.add('lamp-red'); setLed('red'); }
  else if (type === 'rem') { oniLamp.classList.add('lamp-rem'); setLed('rem'); }
  else if (type === 'rainbow') { oniLamp.classList.add('lamp-rainbow'); setLed('rainbow'); }

  lampStatusText.textContent = label;
  lampStatusText.className = type === 'red'
    ? 'text-[10px] font-black text-rose-400 min-w-[54px] text-right whitespace-nowrap'
    : type === 'rem' ? 'text-[10px] font-black text-sky-300 min-w-[54px] text-right whitespace-nowrap' : 'text-[10px] font-black text-amber-300 min-w-[54px] text-right whitespace-nowrap';

  const color = type === 'red' ? '#ef4444' : type === 'rem' ? '#38bdf8' : '#fde047';
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      const r = document.createElement('div');
      r.className = 'lamp-ripple'; r.style.borderColor = color;
      lampRippleHost.appendChild(r);
      FxCanvas.spawnRing(color, 240 + i * 70, 7);
      setTimeout(() => r.remove(), 750);
    }, i * 130);
  }
}

// ★物理真っ二つ引き裂き（Step 4）★
function firePhysicalSplitSlash() {
  const beam = document.createElement('div'); beam.className = 'slash-beam';
  const pL = document.createElement('div'); pL.className = 'split-panel-left';
  const pR = document.createElement('div'); pR.className = 'split-panel-right';
  slashHost.appendChild(pL); slashHost.appendChild(pR); slashHost.appendChild(beam);

  FxCanvas.spawnRing('#fde047', 340, 10);
  FxCanvas.spawnRing('#ef4444', 270, 8);
  FxCanvas.spawnLightning('#fde047', 5);
  FxCanvas.burstGold(68);
  FxCanvas.burstFlames(45);
  setTimeout(() => { beam.remove(); pL.remove(); pR.remove(); }, 800);
}

// =========================================================================
// ★★★ 黄金4ステップ時差ドパ昇格シーケンス（共通エンジン）★★★
// =========================================================================
async function runGoldenPromotionSequence({
  fakeSub, fakeTitle, fakeDesc, fakeStyle = 'despair', fakeRestart = false,
  fakeIsRush = false, fakeBurstGold = false,
  finalSub, finalTitle, finalExtra, finalSound = '6000', token
}) {
  // --- Step 1：大当たり表示（1.3秒）※見た目・音ともに通常当たりと完全一致 ---
  setActiveScene('bonus');
  subtleWhisperSlot.classList.add('hidden');
  subtleWhisperSlot.classList.remove('fx-whisper-in');

  if (fakeRestart) {
    StudioAudio.playReStart();
    lcdFrame.classList.add('fx-restart', 'mode-despair-bg');
  } else {
    StudioAudio.play1500Jackpot(fakeIsRush);
    if (fakeStyle === 'despair') {
      lcdFrame.classList.add('mode-despair-bg');
    } else {
      lcdFrame.classList.add('fx-gold');
      if (fakeBurstGold) FxCanvas.burstGold(34);
    }
  }

  bonusSubLabel.textContent = fakeSub;
  bonusSubLabel.className = fakeStyle === 'despair'
    ? 'text-[11px] sm:text-xs font-black tracking-[0.18em] text-slate-400 mb-1.5'
    : 'text-[11px] sm:text-xs font-black tracking-[0.18em] text-amber-300 mb-1.5';
  bonusMainTitle.textContent = fakeTitle;
  bonusMainTitle.className = fakeStyle === 'despair'
    ? 'text-3xl sm:text-4xl font-black text-slate-200 tracking-tight leading-tight pop-in'
    : 'text-3xl sm:text-4xl font-black gold-grad-text tracking-tight leading-tight pop-in';
  bonusDesc.textContent = fakeDesc;

  await wait(1300, token);
  lcdFrame.classList.remove('fx-restart');

  // --- Step 2：こじんまりと「これから脳が震える…」（1.1秒・微かな鼓動SE） ---
  StudioAudio.playSoftHeartbeat();
  subtleWhisperText.textContent = 'これから脳が震える…';
  subtleWhisperSlot.classList.remove('hidden');
  void subtleWhisperSlot.offsetWidth;
  subtleWhisperSlot.classList.add('fx-whisper-in');

  await wait(1100, token);

  // --- Step 3：フリーズ演出（1.1秒：プチュン完全暗転0.6s無音 → ノイズ＆赤い亀裂0.5s） ---
  StudioAudio.playPuchun();
  FxCanvas.setAmbient('none');
  FxCanvas.clearAll();
  setLed('off');
  lcdFrame.classList.remove('fx-gold', 'fx-rainbow', 'mode-despair-bg', 'mode-brain-bg', 'mode-rem-bg');

  showFullscreenOverlay({ mode: 'blackout', sub: '', main: '', extra: '', scanlines: false });
  await wait(600, token);

  StudioAudio.playCrackNoise();
  crtScanLayer.classList.remove('hidden');
  lcdFrame.classList.add('fx-glitch');
  FxCanvas.spawnRedCracks();
  await wait(500, token);
  lcdFrame.classList.remove('fx-glitch');

  // --- Step 4：引き裂きズバァァン！！ → 6,000 / 3,000降臨！！ ---
  FxCanvas.clearCracks();
  StudioAudio.playSlash();
  StudioAudio.playOchiburu();
  firePhysicalSplitSlash();

  showFullscreenOverlay({
    mode: finalSound === '3000' ? 'gold' : '6000',
    sub: finalSub,
    main: finalTitle,
    extra: finalExtra,
    scanlines: false
  });

  if (finalSound === '3000') {
    StudioAudio.play3000Jackpot();
  } else {
    StudioAudio.play6000Fanfare(false);
  }

  triggerLamp('rainbow', '脳震え!!');
  lcdFrame.classList.add('fx-rainbow', 'shake-burst');
  setLed('rainbow');

  await wait(2200, token);
  lcdFrame.classList.remove('shake-burst');
  hideFullscreenOverlay();
}
