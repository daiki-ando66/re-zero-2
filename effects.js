// =========================================================================
// effects.js : 最前面HTML5 Canvasエフェクト・液晶演出・RUSH違和感＆4ステップ昇格
// =========================================================================

// RUSH追加演出＆違和感専用CSSを自動注入（index.html無改修で動作）
(function injectRushExtraStyles() {
  if (document.getElementById('rush-extra-css')) return;
  const st = document.createElement('style');
  st.id = 'rush-extra-css';
  st.textContent = `
    /* 違和感系エフェクト */
    .iwakan-mono { filter: grayscale(100%) contrast(125%) !important; }
    .iwakan-fade-remain { transition: opacity 0.85s ease; opacity: 0.06 !important; }
    @keyframes remPuru {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-2px, 1.5px); }
      50% { transform: translate(2px, -1.5px); }
      75% { transform: translate(-1.5px, -1.5px); }
    }
    .iwakan-rempuru { animation: remPuru 0.09s linear infinite !important; }

    /* 脳が震えるRUSH：弱／中シェイク（強は既存のshake-intense＋落ちブル） */
    @keyframes brainShakeWeak {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-2.5px, 1px); }
      75% { transform: translate(2.5px, -1px); }
    }
    @keyframes brainShakeMid {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      25% { transform: translate(-5px, 2.5px) rotate(-0.5deg); }
      75% { transform: translate(5px, -2.5px) rotate(0.5deg); }
    }
    .shake-weak { animation: brainShakeWeak 0.11s linear infinite; }
    .shake-mid { animation: brainShakeMid 0.10s linear infinite; }

    /* レム告知：4種ランプ点灯パターン */
    @keyframes remSlowGlow {
      0% { opacity: 0.25; box-shadow: 0 0 0 rgba(56,189,248,0); }
      65% { opacity: 0.9; box-shadow: 0 0 24px 8px rgba(56,189,248,0.9); }
      100% { opacity: 1; box-shadow: 0 0 38px 14px rgba(250,204,21,0.98); }
    }
    .lamp-rem-slow {
      background: radial-gradient(circle at 35% 30%, #e0f2fe 0%, #38bdf8 45%, #c084fc 85%, #fde047 100%) !important;
      border-color: #fef08a !important;
      animation: remSlowGlow 1.15s ease-in forwards !important;
    }
    @keyframes remClassicFlash {
      0%, 100% { background: radial-gradient(circle, #ffffff 0%, #38bdf8 48%, #0284c7 100%); box-shadow: 0 0 36px 12px rgba(224,242,254,0.98); }
      50% { background: radial-gradient(circle, #fef9c3 0%, #0ea5e9 55%, #082f49 100%); box-shadow: 0 0 10px 2px rgba(56,189,248,0.4); }
    }
    .lamp-rem-classic {
      border-color: #ffffff !important;
      animation: remClassicFlash 0.12s steps(2) infinite !important;
    }

    /* 保留点滅（通常点滅・特殊高速赤点滅） */
    @keyframes slotBlink {
      0%, 100% { opacity: 1; transform: scale(1.06); }
      50% { opacity: 0.35; transform: scale(0.95); }
    }
    .res-blink { animation: slotBlink 0.45s ease-in-out infinite; }
    .res-blink-fast { animation: slotBlink 0.15s linear infinite; }

    /* ゼロかRUSH背景 */
    .mode-zero-bg {
      background: radial-gradient(circle at 50% 45%, #18181b 0%, #09090b 65%, #020203 100%) !important;
    }

    /* 隠レム・告知バナー */
    @keyframes hiddenRemPulse {
      0% { opacity: 0; transform: scale(0.75); }
      50% { opacity: 0.42; transform: scale(1.02); }
      100% { opacity: 0.28; transform: scale(1); }
    }
    .hidden-rem-mark {
      animation: hiddenRemPulse 0.9s ease-out forwards;
    }
  `;
  document.head.appendChild(st);
})();

const FxCanvas = (() => {
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');
  let w = 360, h = 360;
  let ambientMode = 'ember'; // 'ember' | 'rush' | 'rem' | 'zero' | 'wedding' | 'none'

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

  // 見えざる手オーラ（脳が震えるRUSH特殊演出用）
  function spawnPurpleHands(count = 28) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 0 : w;
      particles.push({
        type: 'spark',
        x: side + (side === 0 ? -5 : 5),
        y: Math.random() * h,
        vx: (side === 0 ? 1 : -1) * (2.4 + Math.random() * 3.8),
        vy: (Math.random() - 0.5) * 1.4,
        size: 3.0 + Math.random() * 4.5,
        color: i % 3 === 0 ? '#e879f9' : '#7e22ce',
        alpha: 0.92,
        decay: 0.018
      });
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
    } else if (ambientMode === 'rem' && particles.length < 18 && Math.random() < 0.18) {
      particles.push({
        type: 'spark', x: Math.random() * w, y: h + 8,
        vx: (Math.random() - 0.5) * 0.3, vy: -(0.4 + Math.random() * 0.7),
        size: 1.8 + Math.random() * 2.0,
        color: Math.random() < 0.7 ? '#38bdf8' : '#e0f2fe', alpha: 0.6, decay: 0.006
      });
    } else if (ambientMode === 'zero' && particles.length < 10 && Math.random() < 0.10) {
      particles.push({
        type: 'spark', x: Math.random() * w, y: h + 8,
        vx: 0, vy: -(0.8 + Math.random() * 1.4),
        size: 1.4 + Math.random() * 1.6,
        color: '#e4e4e7', alpha: 0.45, decay: 0.008
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
    spawnRing, spawnLightning, spawnPurpleHands, spawnRedCracks, clearCracks, burstGold, burstFlames, spawnFeathers
  };
})();

// =========================================================================
// 演出タイミング制御＆演出系DOM参照
// =========================================================================
let fastMode = false;
let seqToken = 0;

function wait(ms, token = seqToken) {
  const dur = Math.max(55, Math.round(ms * (fastMode ? 0.42 : 1.0)));
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

// ★scene-rush-idle内にRUSH演出用サブ要素（信頼度バッジ・煽り／カウントダウン・隠レム）を排他配置★
const rushIdlePane = scenePanes['rush-idle'];
rushIdlePane.classList.add('relative', 'h-full');

const rushTopBadge = document.createElement('div');
rushTopBadge.id = 'rushTopBadge';
rushTopBadge.className = 'hidden mb-1 px-3 py-0.5 rounded-full text-[11px] font-black tracking-wide bg-black/85 border border-amber-400 text-amber-300 shadow-lg';
rushIdlePane.insertBefore(rushTopBadge, rushIdlePane.firstChild);

const hiddenRemBadge = document.createElement('div');
hiddenRemBadge.id = 'hiddenRemBadge';
hiddenRemBadge.className = 'hidden pointer-events-none absolute bottom-1 left-2 text-lg select-none hidden-rem-mark';
hiddenRemBadge.textContent = '💙';
rushIdlePane.appendChild(hiddenRemBadge);

const rushNoiseVeil = document.createElement('div');
rushNoiseVeil.id = 'rushNoiseVeil';
rushNoiseVeil.className = 'hidden pointer-events-none absolute inset-0 z-20 crt-scanlines bg-black/20';
lcdFrame.appendChild(rushNoiseVeil);

// ★単一シーン排他切替関数（文字重なりを構造的にゼロ化）★
function setActiveScene(sceneName) {
  if (typeof state !== 'undefined') state.activeScene = sceneName;
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
  if (sceneName !== 'rush-idle') {
    rushTopBadge.classList.add('hidden');
    hiddenRemBadge.classList.add('hidden');
  }
  btnSecretOk.classList.toggle('secret-ok-active', sceneName === 'reach' || sceneName === 'rush-idle');
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
// 演出UIヘルパー（LED・リール・保留・ランプ・物理スラッシュ・違和感）
// =========================================================================
function setLed(style) {
  [ledLeft, ledRight].forEach(el => {
    el.className = 'led-bar shrink-0' + (style ? ` led-${style}` : '');
  });
}

function setLedSide(leftStyle, rightStyle) {
  ledLeft.className = 'led-bar shrink-0' + (leftStyle ? ` led-${leftStyle}` : '');
  ledRight.className = 'led-bar shrink-0' + (rightStyle ? ` led-${rightStyle}` : '');
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
      if (special === 'HANDS' && i === 0) {
        el.textContent = '🖐️';
        el.className = 'w-8 h-8 rounded-full border-2 border-fuchsia-300 bg-gradient-to-br from-purple-700 to-fuchsia-950 flex items-center justify-center text-sm shadow-lg shadow-fuchsia-500/80 animate-pulse';
      } else if (special === 'HIT') {
        el.textContent = ch;
        el.className = 'w-8 h-8 rounded-full border-2 border-amber-300 bg-gradient-to-br from-rose-600 to-purple-800 flex items-center justify-center text-xs font-black text-amber-200 shadow-lg animate-pulse';
      } else if ((special === 'GAZE' || special === 'NOGA') && i < 2) {
        el.textContent = ch;
        el.className = 'w-8 h-8 rounded-full border-2 border-rose-400 bg-rose-950 flex items-center justify-center text-xs font-black text-rose-200 shadow shadow-rose-500/70 animate-pulse';
      } else {
        el.textContent = ch;
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
    } else if (i === 0 && special === 'BLINK') {
      el.textContent = '●';
      el.className = 'w-8 h-8 rounded-full border-2 border-sky-200 bg-sky-500/80 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-sky-400/80 res-blink';
    } else if (i === 0 && special === 'BLINK_RED') {
      el.textContent = '鬼';
      el.className = 'w-8 h-8 rounded-full border-2 border-amber-200 bg-gradient-to-br from-rose-500 to-red-900 flex items-center justify-center text-xs font-black text-amber-100 shadow-lg shadow-rose-500/90 res-blink-fast';
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

function clearIwakanEffects() {
  lcdFrame.classList.remove('iwakan-mono', 'iwakan-rempuru', 'shake-weak', 'shake-mid');
  oniLamp.classList.remove('iwakan-rempuru', 'lamp-rem-slow', 'lamp-rem-classic');
  const bigRem = document.getElementById('rushBigRemain');
  if (bigRem) bigRem.classList.remove('iwakan-fade-remain');
  hiddenRemBadge.classList.add('hidden');
  rushNoiseVeil.classList.add('hidden');
  rushTopBadge.classList.add('hidden');
}

function clearVisualEffects() {
  clearIwakanEffects();
  lcdFrame.classList.remove('fx-redbare', 'fx-rainbow', 'fx-gold', 'fx-restart', 'fx-glitch', 'shake-intense', 'shake-burst', 'mode-brain-bg', 'mode-rem-bg', 'mode-despair-bg', 'mode-zero-bg');
  btnOniPush.classList.remove('ochiburu-dome', 'push-dome-gold');
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow');
  FxCanvas.clearCracks();
  setLed('');
  const ph = (typeof state !== 'undefined') ? state.phase : 'NORMAL';
  const rm = (typeof state !== 'undefined') ? state.rushMode : 'onigakari';
  lampStatusText.textContent = ph === 'RUSH' ? 'RUSH中' : '待機中';
  lampStatusText.className = 'text-[10px] font-black text-amber-200 min-w-[54px] text-right whitespace-nowrap';
  lampEmoji.textContent = (ph === 'RUSH' && rm === 'rem') ? '💙' : (ph === 'RUSH' && rm === 'brain') ? '🧠' : (ph === 'RUSH' && rm === 'zero') ? '⚡' : '👹';
}

function triggerLamp(type, label) {
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow', 'lamp-rem-slow', 'lamp-rem-classic');
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
// ★RUSH専用：全10種の違和感演出エンジン（大当り直前に発動）★
// =========================================================================
async function playIwakanEffect({ is6000, rushMode, token }) {
  const bigRem = document.getElementById('rushBigRemain');
  const commonPool = [
    'LED_ONE_OFF', 'LED_ALL_OFF', 'MONO_SCREEN', 'FADE_REMAIN',
    'REM_PURU', 'GLITCH_BLINK', 'HIDDEN_REM', 'SILENT_STILL'
  ];
  // 6,000当選時は6,000濃厚プレミア違和感も候補に加える
  const pool = is6000 ? [...commonPool, 'COUNT_6000', 'RAINBOW_GLINT'] : commonPool;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  const baseLed = rushMode === 'brain' ? 'brain' : rushMode === 'rem' ? 'rem' : rushMode === 'zero' ? '' : 'red';
  let label = '';

  switch (pick) {
    case 'LED_ONE_OFF':
      label = '違和感：サイドLED片側消灯';
      if (Math.random() < 0.5) setLedSide('off', baseLed);
      else setLedSide(baseLed, 'off');
      await wait(950, token);
      break;

    case 'LED_ALL_OFF':
      label = '違和感：サイドLED全消灯';
      setLed('off');
      await wait(950, token);
      break;

    case 'MONO_SCREEN':
      label = '違和感：液晶モノクロ化';
      lcdFrame.classList.add('iwakan-mono');
      await wait(900, token);
      lcdFrame.classList.remove('iwakan-mono');
      break;

    case 'FADE_REMAIN':
      label = '違和感：残り回数じわじわ消失';
      if (bigRem) bigRem.classList.add('iwakan-fade-remain');
      await wait(980, token);
      if (bigRem) bigRem.classList.remove('iwakan-fade-remain');
      break;

    case 'REM_PURU':
      label = '違和感：レムぷる（筐体微振動）';
      oniLamp.classList.add('iwakan-rempuru');
      lcdFrame.classList.add('iwakan-rempuru');
      try { if (navigator && navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 30]); } catch (e) {}
      await wait(920, token);
      oniLamp.classList.remove('iwakan-rempuru');
      lcdFrame.classList.remove('iwakan-rempuru');
      break;

    case 'GLITCH_BLINK':
      label = '違和感：一瞬の映像ノイズ停止';
      rushNoiseVeil.classList.remove('hidden');
      lcdFrame.classList.add('fx-glitch');
      await wait(240, token);
      lcdFrame.classList.remove('fx-glitch');
      rushNoiseVeil.classList.add('hidden');
      await wait(650, token);
      break;

    case 'HIDDEN_REM':
      label = '違和感：画面隅に隠レム💙出現';
      hiddenRemBadge.classList.remove('hidden');
      await wait(1000, token);
      hiddenRemBadge.classList.add('hidden');
      break;

    case 'SILENT_STILL':
      label = '違和感：背景オーラ完全静止＆無音の間';
      FxCanvas.setAmbient('none');
      FxCanvas.clearAll();
      await wait(950, token);
      break;

    case 'COUNT_6000':
      label = '超違和感：残り回数「6000」化け（6000濃厚）';
      if (bigRem) {
        const orig = bigRem.textContent;
        bigRem.textContent = '6000';
        bigRem.className = 'text-6xl sm:text-7xl font-black rainbow-grad-text leading-none tracking-tight';
        await wait(1050, token);
        bigRem.textContent = orig;
      }
      break;

    case 'RAINBOW_GLINT':
      label = '超違和感：鬼ランプ一瞬虹チラ光り（6000濃厚）';
      oniLamp.classList.add('lamp-rainbow');
      await wait(190, token);
      oniLamp.classList.remove('lamp-rainbow');
      await wait(780, token);
      break;
  }

  return label;
}

// =========================================================================
// ★レム告知モード：4種ランプ点灯パターン演出★
// =========================================================================
async function playRemNoticePattern({ is6000, token }) {
  // 6,000当選時はプレミア点灯3種（徐々に点灯／一瞬消えて再点灯／旧レム風フラッシュ）を高確率で選択
  let pat = 'NORMAL';
  if (is6000 && Math.random() < 0.72) {
    const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
    pat = p6[Math.floor(Math.random() * p6.length)];
  }

  let note = 'レム通常点灯';
  if (pat === 'SLOW_GLOW') {
    note = '💙 レム徐々に点灯（6000濃厚!!）';
    oniLamp.classList.remove('lamp-rem', 'lamp-rainbow', 'lamp-red');
    oniLamp.classList.add('lamp-rem-slow');
    lampStatusText.textContent = 'じわ〜っ…';
    setLed('rem');
    await wait(1150, token);
    StudioAudio.playKyuin();
    triggerLamp('rainbow', '6000濃厚!!');
    await wait(350, token);
  } else if (pat === 'DOUBLE_BLINK') {
    note = '💙 一瞬光って消えて再点灯（6000濃厚!!）';
    oniLamp.classList.add('lamp-rem');
    lampStatusText.textContent = 'ピッ…';
    await wait(160, token);
    oniLamp.classList.remove('lamp-rem');
    lampStatusText.textContent = '……';
    setLed('off');
    await wait(550, token);
    StudioAudio.playKyuin();
    triggerLamp('rainbow', '再点灯6000!!');
    FxCanvas.spawnLightning('#38bdf8', 4);
    await wait(420, token);
  } else if (pat === 'CLASSIC_FLASH') {
    note = '💙 旧レム風ストロボフラッシュ（6000濃厚!!）';
    StudioAudio.playKyuin();
    oniLamp.classList.add('lamp-rem-classic');
    lampStatusText.textContent = '旧レム閃光!!';
    setLed('rainbow');
    FxCanvas.spawnRing('#38bdf8', 300, 9);
    FxCanvas.spawnLightning('#e0f2fe', 5);
    await wait(850, token);
    oniLamp.classList.remove('lamp-rem-classic');
  } else {
    StudioAudio.playKyuin();
    triggerLamp('rem', 'キュイン!!');
    FxCanvas.spawnRing('#38bdf8', 250, 7);
    await wait(420, token);
  }
  return note;
}

// =========================================================================
// ★脳が震えるRUSH：文字保留・脳が煽りLv1〜5・震える告知（弱/中/強）★
// =========================================================================
async function playBrainModeSequence({ isHit, is6000, bonusType, isHands = false, custOchiburu = true, token }) {
  const idleSub = document.getElementById('rushIdleSub');
  const maxLv = isHit ? (is6000 ? 5 : 4) : (Math.random() < 0.5 ? 2 : 3);

  updateReserveSlots('BRAIN', isHands ? 'HANDS' : 'NOGA');
  if (isHands) FxCanvas.spawnPurpleHands(26);

  rushTopBadge.classList.remove('hidden');
  for (let lv = 1; lv <= maxLv; lv++) {
    const isButtonGa = (isHit && is6000 && lv === maxLv && Math.random() < 0.55);
    if (isButtonGa) {
      rushTopBadge.textContent = '💥 脳が…いや「ボタンが」震える!!（6000濃厚）';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
    } else {
      rushTopBadge.textContent = isHands
        ? `🖐️ 見えざる手煽り Lv.${lv}`
        : `🧠 脳が煽り Lv.${lv}`;
      rushTopBadge.className = lv >= 4
        ? 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-950/95 border border-amber-300 text-amber-200 shadow-lg'
        : 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-400 text-fuchsia-200 shadow-lg';
    }

    if (idleSub) {
      idleSub.textContent = isHands
        ? '🖐️ 見えざる手が迫る… 当たれば鬼がかり6000濃厚!!'
        : `🧠 脳が…脳が…（Lv.${lv}）`;
    }
    if (lv >= 2) {
      lcdFrame.classList.add('shake-weak');
      StudioAudio.playSoftHeartbeat();
    }
    await wait(lv === maxLv ? 360 : 240, token);
  }

  lcdFrame.classList.remove('shake-weak');

  if (!isHit) {
    rushTopBadge.classList.add('hidden');
    updateReserveSlots('BRAIN', null);
    return null;
  }

  // 当選時：震える告知（弱／中／強＝落ちブル）※落ちブルは6,000濃厚時のみ！
  updateReserveSlots('BRAIN', 'HIT');
  let vibNote = '';
  if (is6000 && Math.random() < (custOchiburu ? 0.85 : 0.35)) {
    // 強震え（落ちブル発動＝6,000濃厚）
    vibNote = '🧠 強震え＋落ちブル（6000濃厚!!）';
    rushTopBadge.textContent = '💥【脳が震える・強＋落ちブル!!】6000濃厚!!';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in';
    StudioAudio.playOchiburu();
    lcdFrame.classList.add('shake-intense', 'fx-rainbow');
    triggerLamp('rainbow', '6000濃厚!!');
    FxCanvas.spawnLightning('#fde047', 5);
    await wait(780, token);
    lcdFrame.classList.remove('shake-intense');
  } else if (bonusType === 'BONUS_1500' || is6000) {
    // 中震え（1,500以上濃厚・落ちブル音は鳴らさない）
    vibNote = '🧠 震える告知・中（1500以上濃厚）';
    rushTopBadge.textContent = '🧠【脳が震える・中!!】大当り濃厚!!';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-fuchsia-950/95 border border-amber-300 text-amber-200 shadow-lg pop-in';
    lcdFrame.classList.add('shake-mid', 'fx-gold');
    try { if (navigator && navigator.vibrate) navigator.vibrate([70, 30, 70, 30, 120]); } catch (e) {}
    StudioAudio.playSoftHeartbeat();
    FxCanvas.spawnRing('#e879f9', 260, 7);
    await wait(520, token);
    lcdFrame.classList.remove('shake-mid');
  } else {
    // 弱震え（大当り濃厚・300/Re:Start含む）
    vibNote = '🧠 震える告知・弱（大当り濃厚）';
    rushTopBadge.textContent = '🧠【脳が震える・弱!!】大当り!!';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-300 text-fuchsia-100 shadow-lg pop-in';
    lcdFrame.classList.add('shake-weak');
    try { if (navigator && navigator.vibrate) navigator.vibrate([45, 35, 65]); } catch (e) {}
    await wait(440, token);
    lcdFrame.classList.remove('shake-weak');
  }

  rushTopBadge.classList.add('hidden');
  return vibNote;
}

// =========================================================================
// ★鬼がかりRUSH：カウントダウン＆法則崩れ演出★
// =========================================================================
async function playOnigakariCountdown({ isHit, is6000, token }) {
  let seq = ['3', '2', '1', '0'];
  let note = 'カウントダウン';
  let isPrem = false;

  if (isHit && is6000 && Math.random() < 0.55) {
    if (Math.random() < 0.5) {
      seq = ['3', '4', '5', '6'];
      note = '🔥 カウントダウン法則崩れ(3→4→5→6：6000濃厚!!)';
    } else {
      seq = ['6', '0', '0', '0'];
      note = '🔥 カウントダウン(6→0→0→0：6000濃厚!!)';
    }
    isPrem = true;
  } else if (isHit && Math.random() < 0.35) {
    seq = ['E', 'M', 'I', '!!'];
    note = '🌈 特殊カウント(E→M→I：大当り濃厚!!)';
    isPrem = true;
  } else if (Math.random() < 0.35) {
    seq = ['1', '2', '3', '0'];
    note = '🔥 昇順カウントダウン';
  }

  rushTopBadge.classList.remove('hidden');
  for (let i = 0; i < seq.length; i++) {
    rushTopBadge.textContent = `⏱ COUNTDOWN [ ${seq[i]} ]`;
    rushTopBadge.className = (isPrem && i >= 1)
      ? 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in'
      : 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-rose-950/95 border border-amber-400 text-amber-200 shadow-lg';
    FxCanvas.spawnRing(isPrem ? '#fde047' : '#ef4444', 180 + i * 35, 5);
    await wait(240, token);
    if (!isHit && i === 2) break; // ガセは途中で途切れる
  }

  rushTopBadge.classList.add('hidden');
  return isHit ? note : null;
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
  lcdFrame.classList.remove('fx-gold', 'fx-rainbow', 'mode-despair-bg', 'mode-brain-bg', 'mode-rem-bg', 'mode-zero-bg');

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
