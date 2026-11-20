// =========================================================================
// effects.js (v3.0) : Canvas・縁外連動・3秒画像カットイン・答え合わせ枠・ぶっ飛び演出
// =========================================================================

(function injectRushExtraStyles() {
  if (document.getElementById('rush-extra-css')) return;
  const st = document.createElement('style');
  st.id = 'rush-extra-css';
  st.textContent = `
    .iwakan-mono { filter: grayscale(100%) contrast(125%) !important; }
    .iwakan-fade-remain { transition: opacity 0.85s ease; opacity: 0.06 !important; }
    @keyframes remPuru {
      0%, 100% { transform: translate(0, 0); }
      25% { transform: translate(-2px, 1.5px); }
      50% { transform: translate(2px, -1.5px); }
      75% { transform: translate(-1.5px, -1.5px); }
    }
    .iwakan-rempuru { animation: remPuru 0.09s linear infinite !important; }

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

    @keyframes pageMegaShake {
      0%, 100% { transform: translate(0, 0) rotate(0deg); }
      12% { transform: translate(-11px, -7px) rotate(-1.4deg); }
      25% { transform: translate(11px, 6px) rotate(1.4deg); }
      37% { transform: translate(-13px, 5px) rotate(-1.8deg); }
      50% { transform: translate(12px, -8px) rotate(1.6deg); }
      62% { transform: translate(-9px, -6px) rotate(-1.2deg); }
      75% { transform: translate(10px, 7px) rotate(1.3deg); }
      87% { transform: translate(-7px, 4px) rotate(-0.9deg); }
    }
    .page-mega-shake { animation: pageMegaShake 0.11s linear infinite !important; }

    @keyframes rgbGlitchAnim {
      0% { filter: drop-shadow(-5px 0 0 rgba(255,0,80,0.95)) drop-shadow(5px 0 0 rgba(0,240,255,0.95)) contrast(135%); transform: skewX(-4deg); }
      33% { filter: drop-shadow(6px -2px 0 rgba(255,0,80,0.95)) drop-shadow(-6px 2px 0 rgba(0,240,255,0.95)) saturate(200%); transform: skewX(5deg); }
      66% { filter: drop-shadow(-4px 3px 0 rgba(250,204,21,0.95)) drop-shadow(4px -3px 0 rgba(168,85,247,0.95)) contrast(150%); transform: skewX(-3deg); }
      100% { filter: drop-shadow(0 0 0 transparent); transform: skewX(0deg); }
    }
    .fx-rgb-glitch { animation: rgbGlitchAnim 0.10s steps(2) infinite !important; }

    @keyframes dropCrashAnim {
      0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
      16%  { transform: translateY(-6px) rotate(-3.5deg); opacity: 1; }
      28%  { transform: translateY(10px) rotate(4.2deg); opacity: 1; }
      100% { transform: translateY(135%) rotate(18deg) scale(0.92); opacity: 0; }
    }
    .drop-crash-panel {
      position: absolute; inset: 0; z-index: 56; pointer-events: none;
      background: linear-gradient(180deg, #1b0614 0%, #050208 55%, #2b0712 100%);
      border: 3px solid rgba(250, 204, 21, 0.9);
      box-shadow: inset 0 0 42px rgba(239, 68, 68, 0.85), 0 18px 40px rgba(0,0,0,0.95);
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      animation: dropCrashAnim 0.82s cubic-bezier(0.55, 0.055, 0.675, 0.19) forwards;
    }

    @keyframes shardFly {
      0%   { transform: translate3d(0, 0, 0) rotate(0deg) scale(1); opacity: 1; }
      18%  { transform: translate3d(calc(var(--tx) * 0.12), calc(var(--ty) * 0.12), 20px) rotate(calc(var(--rot) * 0.15)) scale(1.05); opacity: 1; }
      100% { transform: translate3d(var(--tx), var(--ty), 120px) rotate(var(--rot)) scale(1.45); opacity: 0; }
    }
    .shatter-shard {
      position: absolute; z-index: 56; pointer-events: none;
      background: linear-gradient(135deg, #120410 0%, #030105 60%, #4c0519 100%);
      border: 2px solid rgba(254, 240, 138, 0.92);
      box-shadow: inset 0 0 24px rgba(239, 68, 68, 0.78), 0 0 18px rgba(250, 204, 21, 0.65);
      animation: shardFly 0.84s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes cutinZoomIn {
      0%   { opacity: 0; transform: scale(1.42); filter: brightness(2.3); }
      18%  { opacity: 1; transform: scale(0.98); filter: brightness(1.18); }
      100% { opacity: 1; transform: scale(1.06); filter: brightness(1.02); }
    }
    .cutin-img-zoom { animation: cutinZoomIn 2.8s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

    @keyframes rainbowFrameSpin {
      0%   { box-shadow: 0 0 38px 10px rgba(250,204,21,0.9), 0 0 70px 18px rgba(236,72,153,0.65); border-color: #fde047; }
      33%  { box-shadow: 0 0 42px 12px rgba(56,189,248,0.95), 0 0 74px 20px rgba(192,132,252,0.7); border-color: #38bdf8; }
      66%  { box-shadow: 0 0 42px 12px rgba(244,63,94,0.95), 0 0 74px 20px rgba(250,204,21,0.7); border-color: #f472b6; }
      100% { box-shadow: 0 0 38px 10px rgba(250,204,21,0.9), 0 0 70px 18px rgba(236,72,153,0.65); border-color: #fde047; }
    }
    .cutin-rainbow-border { animation: rainbowFrameSpin 0.75s linear infinite; }

    @keyframes rainbowBgFlow {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .overlay-rainbow {
      background: linear-gradient(135deg, #7f1d1d 0%, #854d0e 18%, #065f46 36%, #075985 54%, #581c87 74%, #9d174d 90%, #7f1d1d 100%);
      background-size: 260% 260%;
      animation: rainbowBgFlow 2.0s ease infinite;
    }
    @keyframes globalRainbowBurstAnim {
      0%   { opacity: 0.92; }
      35%  { opacity: 0.55; }
      100% { opacity: 0; }
    }
    .global-rainbow-burst {
      background: conic-gradient(from 0deg at 50% 50%, rgba(253,224,71,0.9), rgba(244,63,94,0.9), rgba(168,85,247,0.9), rgba(56,189,248,0.9), rgba(52,211,153,0.9), rgba(253,224,71,0.9));
      animation: globalRainbowBurstAnim 0.72s ease-out forwards;
    }

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

    @keyframes slotBlink {
      0%, 100% { opacity: 1; transform: scale(1.06); }
      50% { opacity: 0.35; transform: scale(0.95); }
    }
    .res-blink { animation: slotBlink 0.45s ease-in-out infinite; }
    .res-blink-fast { animation: slotBlink 0.15s linear infinite; }

    .mode-zero-bg {
      background: radial-gradient(circle at 50% 45%, #18181b 0%, #09090b 65%, #020203 100%) !important;
    }

    @keyframes hiddenRemPulse {
      0% { opacity: 0; transform: scale(0.75); }
      50% { opacity: 0.42; transform: scale(1.02); }
      100% { opacity: 0.28; transform: scale(1); }
    }
    .hidden-rem-mark { animation: hiddenRemPulse 0.9s ease-out forwards; }
  `;
  document.head.appendChild(st);
})();

// カットイン画像（onigakari.jpg）プリロード＆自動フォールバック
let onigakariImageSrc = null;
(function preloadCutinImage() {
  const candidates = ['onigakari.jpg', 'onigakari.png', 'image_3da6a7.jpg'];
  let idx = 0;
  function tryNext() {
    if (idx >= candidates.length) return;
    const src = candidates[idx++];
    const img = new Image();
    img.onload = () => { onigakariImageSrc = src; };
    img.onerror = tryNext;
    img.src = src;
  }
  tryNext();
})();

const FxCanvas = (() => {
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');
  let w = 360, h = 360;
  let ambientMode = 'ember';

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

  function burstRainbow(count = 75) {
    const colors = ['#fde047', '#fb7185', '#c084fc', '#38bdf8', '#34d399', '#fb923c', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.6 + Math.random() * 7.2;
      particles.push({
        type: i % 3 === 0 ? 'spark' : 'confetti',
        x: w * 0.5, y: h * 0.48,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.2,
        size: 3.8 + Math.random() * 5.2, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.28,
        color: colors[i % colors.length],
        alpha: 1, decay: 0.010 + Math.random() * 0.008
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

    if (ambientMode === 'ember' && particles.length < 20 && Math.random() < 0.25) {
      particles.push({
        type: 'spark', x: Math.random() * w, y: h + 8,
        vx: (Math.random() - 0.5) * 0.5, vy: -(0.6 + Math.random() * 1.2),
        size: 1.5 + Math.random() * 2.2,
        color: Math.random() < 0.55 ? '#facc15' : '#fb923c', alpha: 0.60, decay: 0.006
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
    spawnRing, spawnLightning, spawnPurpleHands, spawnRedCracks, clearCracks,
    burstGold, burstRainbow, burstFlames, spawnFeathers
  };
})();

// =========================================================================
// 演出タイミング制御＆DOM参照
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

// 3秒フリーズ＆3秒画像表示用（高速モードでも余韻をしっかり確保）
function waitFreeze(ms, token = seqToken) {
  const dur = fastMode ? Math.round(ms * 0.65) : ms;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (token !== seqToken) reject('CANCELLED');
      else resolve();
    }, dur);
  });
}

// 仮表示中の「OK裏ボタン割り込み昇格」制御
let promoInterruptResolver = null;
function canInterruptPromotion() {
  return typeof promoInterruptResolver === 'function';
}
function interruptPromotionByOk() {
  if (typeof promoInterruptResolver === 'function') {
    const fn = promoInterruptResolver;
    promoInterruptResolver = null;
    fn('OK_INTERRUPT');
    return true;
  }
  return false;
}
function waitInterruptible(ms, token = seqToken) {
  const dur = Math.max(80, Math.round(ms * (fastMode ? 0.55 : 1.0)));
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      promoInterruptResolver = null;
      if (token !== seqToken) reject('CANCELLED');
      else resolve('TIMEOUT');
    }, dur);

    promoInterruptResolver = (reason) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      promoInterruptResolver = null;
      if (token !== seqToken) reject('CANCELLED');
      else resolve(reason);
    };
  });
}

const ambientBgLayer = document.getElementById('ambientBgLayer');
const sunburstLayer = document.getElementById('sunburstLayer');

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

const globalBlackoutCurtain = document.createElement('div');
globalBlackoutCurtain.id = 'globalBlackoutCurtain';
globalBlackoutCurtain.className = 'hidden fixed inset-0 z-[999] bg-black pointer-events-none';
document.body.appendChild(globalBlackoutCurtain);

const globalRainbowFlash = document.createElement('div');
globalRainbowFlash.id = 'globalRainbowFlash';
globalRainbowFlash.className = 'hidden fixed inset-0 z-[998] pointer-events-none';
document.body.appendChild(globalRainbowFlash);

const globalCutinOverlay = document.createElement('div');
globalCutinOverlay.id = 'globalCutinOverlay';
globalCutinOverlay.className = 'hidden fixed inset-0 z-[1000] bg-black/96 flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
document.body.appendChild(globalCutinOverlay);

const pageShakeTargets = [document.querySelector('header'), document.querySelector('main')].filter(Boolean);

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

// ★縁外ライティング＆虹色サンバースト制御★
function setAmbientBg(mode = '') {
  if (!ambientBgLayer) return;
  ambientBgLayer.className = 'fixed inset-0 pointer-events-none z-0' + (mode ? ` bg-mode-${mode}` : '');
}
function setSunburst(on) {
  if (sunburstLayer) sunburstLayer.classList.toggle('hidden', !on);
}

function setGlobalBlackout(on) {
  globalBlackoutCurtain.classList.toggle('hidden', !on);
}
function hideGlobalCutin() {
  globalCutinOverlay.classList.add('hidden');
  globalCutinOverlay.innerHTML = '';
}
function setPageMegaShake(on) {
  pageShakeTargets.forEach(el => el.classList.toggle('page-mega-shake', on));
}
function fireGlobalRainbowFlash() {
  globalRainbowFlash.className = 'fixed inset-0 z-[998] pointer-events-none global-rainbow-burst';
  void globalRainbowFlash.offsetWidth;
  setTimeout(() => {
    globalRainbowFlash.className = 'hidden fixed inset-0 z-[998] pointer-events-none';
  }, 750);
}
function clearGlobalChaosEffects() {
  promoInterruptResolver = null;
  setGlobalBlackout(false);
  hideGlobalCutin();
  setPageMegaShake(false);
  setSunburst(false);
  lcdFrame.classList.remove('fx-rgb-glitch');
  slashHost.innerHTML = '';
}

// ★本家仕様：右下「違和感の答え合わせ」兼 レア「これから脳が震える…」表示★
function showIwakanAnswer(text, isBrainWhisper = false) {
  if (!text) {
    hideIwakanAnswer();
    return;
  }
  subtleWhisperText.textContent = text;
  if (isBrainWhisper) {
    subtleWhisperSlot.className = 'absolute bottom-1 right-1 sm:right-2 px-2.5 py-1 rounded-md bg-black/85 border border-purple-400/60 shadow-lg max-w-[88%]';
    subtleWhisperText.className = 'font-mincho text-xs sm:text-sm font-semibold text-purple-200 tracking-widest';
    void subtleWhisperSlot.offsetWidth;
    subtleWhisperSlot.classList.add('fx-whisper-in');
  } else {
    subtleWhisperSlot.className = 'absolute bottom-1 right-1 sm:right-2 px-2.5 py-1 rounded-md bg-black/80 border border-amber-500/45 shadow-lg max-w-[88%]';
    subtleWhisperText.className = 'font-mincho text-[11px] sm:text-xs font-semibold text-amber-100/90 tracking-wider';
  }
  subtleWhisperSlot.classList.remove('hidden');
}

function hideIwakanAnswer() {
  subtleWhisperSlot.classList.add('hidden');
  subtleWhisperSlot.classList.remove('fx-whisper-in');
}

// ★全画面「鬼がかってますね」画像カットイン（約3.0秒じっくり表示・メタ説明なし）★
async function playOnigakariImageCutin({
  caption = '鬼がかってますね',
  dur = 3000,
  withPokyun = true,
  token
}) {
  if (withPokyun) StudioAudio.playPokyun(true);
  fireGlobalRainbowFlash();
  setAmbientBg('rainbow');
  setSunburst(true);
  setLed('rainbow');

  if (onigakariImageSrc) {
    globalCutinOverlay.innerHTML = `
      <div class="w-full max-w-lg flex flex-col items-center gap-3">
        <div class="relative w-full aspect-video rounded-2xl overflow-hidden border-4 cutin-rainbow-border bg-black">
          <img src="${onigakariImageSrc}" alt="鬼がかってますね" class="w-full h-full object-cover cutin-img-zoom">
          <div class="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent"></div>
        </div>
        <div class="font-mincho text-2xl sm:text-3xl font-black rainbow-grad-text tracking-widest drop-shadow pop-in">${caption}</div>
      </div>
    `;
  } else {
    globalCutinOverlay.innerHTML = `
      <div class="w-full max-w-lg rounded-3xl overlay-rainbow border-4 cutin-rainbow-border p-8 text-center shadow-2xl pop-in">
        <div class="font-mincho text-4xl sm:text-5xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] tracking-wider leading-tight">
          ${caption}
        </div>
      </div>
    `;
  }

  globalCutinOverlay.classList.remove('hidden');
  try {
    await waitFreeze(dur, token);
  } finally {
    hideGlobalCutin();
  }
}

// ★初当たり・大当たり用 虹色バースト（縁外サンバースト連動）★
function fireRainbowBurst(lampLabel = '🌈 大当り!!') {
  fireGlobalRainbowFlash();
  setAmbientBg('rainbow');
  setSunburst(true);
  triggerLamp('rainbow', lampLabel);
  lcdFrame.classList.add('fx-rainbow', 'shake-burst');
  setLed('rainbow');
  FxCanvas.spawnRing('#fde047', 320, 9);
  FxCanvas.spawnRing('#38bdf8', 250, 7);
  FxCanvas.burstRainbow(78);
  setTimeout(() => lcdFrame.classList.remove('shake-burst'), 720);
}

function setActiveScene(sceneName) {
  if (typeof state !== 'undefined') state.activeScene = sceneName;
  Object.entries(scenePanes).forEach(([key, el]) => {
    el.classList.toggle('hidden', key !== sceneName);
  });
  if (sceneName !== 'bonus') hideIwakanAnswer();
  if (sceneName !== 'reach') pushButtonArea.classList.add('hidden');
  if (sceneName !== 'rush-idle') {
    rushTopBadge.classList.add('hidden');
    hiddenRemBadge.classList.add('hidden');
  }
  btnSecretOk.classList.toggle('secret-ok-active', sceneName === 'reach' || sceneName === 'rush-idle' || sceneName === 'bonus');
}

function showFullscreenOverlay({ mode = 'blackout', sub = '', main = '', extra = '', scanlines = false }) {
  fullscreenOverlay.classList.remove('hidden', 'overlay-blackout', 'overlay-6000', 'overlay-wedding', 'overlay-rainbow');
  crtScanLayer.classList.toggle('hidden', !scanlines);

  if (mode === 'wedding') {
    fullscreenOverlay.classList.add('overlay-wedding');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-rose-600 mb-2';
    fsMain.className = 'relative z-10 font-mincho text-2xl sm:text-4xl font-black text-rose-700 tracking-wider leading-snug pop-in px-1';
    fsExtra.className = 'relative z-10 mt-3 text-xs sm:text-sm font-bold text-rose-900/90 max-w-md';
  } else if (mode === 'rainbow') {
    fullscreenOverlay.classList.add('overlay-rainbow');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-yellow-200 drop-shadow mb-2';
    fsMain.className = 'relative z-10 text-3xl sm:text-5xl font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] tracking-wider leading-tight pop-in px-1';
    fsExtra.className = 'relative z-10 mt-3 text-xs sm:text-sm font-black text-yellow-100 drop-shadow max-w-md';
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
  clearGlobalChaosEffects();
  FxCanvas.clearCracks();
}

// =========================================================================
// 演出UIヘルパー（LED・リール・保留・ランプ・物理破壊演出）
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
      el.className = 'w-8 h-8 rounded-full border-2 border-amber-900/80 bg-black/70 flex items-center justify-center text-[10px] font-black text-amber-200/60';
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
  lcdFrame.classList.remove('iwakan-mono', 'iwakan-rempuru', 'shake-weak', 'shake-mid', 'fx-rgb-glitch');
  oniLamp.classList.remove('iwakan-rempuru', 'lamp-rem-slow', 'lamp-rem-classic');
  const bigRem = document.getElementById('rushBigRemain');
  if (bigRem) bigRem.classList.remove('iwakan-fade-remain');
  hiddenRemBadge.classList.add('hidden');
  rushNoiseVeil.classList.add('hidden');
  rushTopBadge.classList.add('hidden');
}

function clearVisualEffects() {
  clearIwakanEffects();
  clearGlobalChaosEffects();
  setAmbientBg('');
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

// 物理真っ二つ引き裂き
function firePhysicalSplitSlash() {
  const beam = document.createElement('div'); beam.className = 'slash-beam';
  const pL = document.createElement('div'); pL.className = 'split-panel-left';
  const pR = document.createElement('div'); pR.className = 'split-panel-right';
  slashHost.appendChild(pL); slashHost.appendChild(pR); slashHost.appendChild(beam);

  fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fde047', 340, 10);
  FxCanvas.spawnRing('#ef4444', 270, 8);
  FxCanvas.spawnLightning('#fde047', 5);
  FxCanvas.burstRainbow(72);
  FxCanvas.burstFlames(40);
  setTimeout(() => { beam.remove(); pL.remove(); pR.remove(); }, 820);
}

// 液晶ごと物理落下（メタ説明テキストなし）
function fireDropCrash(fakeTitle = '') {
  const panel = document.createElement('div');
  panel.className = 'drop-crash-panel';
  panel.innerHTML = `<div class="text-2xl sm:text-3xl font-black text-slate-200">${fakeTitle}</div>`;
  slashHost.appendChild(panel);

  setPageMegaShake(true);
  fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fde047', 360, 11);
  FxCanvas.burstRainbow(78);
  setTimeout(() => {
    panel.remove();
    setPageMegaShake(false);
  }, 860);
}

// 画面6分割・3D粉砕吹き飛び
function fireShatterFly() {
  const configs = [
    { l: '0%',    t: '0%',  w: '34%', h: '51%', tx: '-140%', ty: '-120%', rot: '-52deg' },
    { l: '33%',   t: '0%',  w: '34%', h: '51%', tx: '10%',   ty: '-150%', rot: '28deg'  },
    { l: '66%',   t: '0%',  w: '35%', h: '51%', tx: '145%',  ty: '-115%', rot: '58deg'  },
    { l: '0%',    t: '50%', w: '34%', h: '51%', tx: '-145%', ty: '125%',  rot: '-44deg' },
    { l: '33%',   t: '50%', w: '34%', h: '51%', tx: '-12%',  ty: '155%',  rot: '-26deg' },
    { l: '66%',   t: '50%', w: '35%', h: '51%', tx: '140%',  ty: '130%',  rot: '48deg'  }
  ];
  const nodes = configs.map(c => {
    const d = document.createElement('div');
    d.className = 'shatter-shard';
    d.style.left = c.l; d.style.top = c.t; d.style.width = c.w; d.style.height = c.h;
    d.style.setProperty('--tx', c.tx);
    d.style.setProperty('--ty', c.ty);
    d.style.setProperty('--rot', c.rot);
    slashHost.appendChild(d);
    return d;
  });

  setPageMegaShake(true);
  lcdFrame.classList.add('fx-rgb-glitch');
  fireGlobalRainbowFlash();
  FxCanvas.spawnLightning('#fde047', 6);
  FxCanvas.spawnLightning('#38bdf8', 4);
  FxCanvas.burstRainbow(85);
  setTimeout(() => {
    nodes.forEach(n => n.remove());
    lcdFrame.classList.remove('fx-rgb-glitch');
    setPageMegaShake(false);
  }, 880);
}

// ページ全体・超激震＋RGB色ズレ
function fireMegaQuakeBrainBreak() {
  setPageMegaShake(true);
  lcdFrame.classList.add('fx-rgb-glitch');
  fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#ef4444', 360, 12);
  FxCanvas.spawnRing('#fde047', 290, 9);
  FxCanvas.spawnLightning('#fde047', 7);
  FxCanvas.burstRainbow(82);
  FxCanvas.burstFlames(55);
  setTimeout(() => {
    lcdFrame.classList.remove('fx-rgb-glitch');
    setPageMegaShake(false);
  }, 1050);
}

// =========================================================================
// ★RUSH専用：全10種の違和感演出（答え合わせ枠用の簡潔なラベルを返す）★
// =========================================================================
async function playIwakanEffect({ is6000, rushMode, token }) {
  const bigRem = document.getElementById('rushBigRemain');
  const commonPool = [
    'LED_ONE_OFF', 'LED_ALL_OFF', 'MONO_SCREEN', 'FADE_REMAIN',
    'REM_PURU', 'GLITCH_BLINK', 'HIDDEN_REM', 'SILENT_STILL'
  ];
  const pool = is6000 ? [...commonPool, 'COUNT_6000', 'RAINBOW_GLINT'] : commonPool;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  const baseLed = rushMode === 'brain' ? 'brain' : rushMode === 'rem' ? 'rem' : rushMode === 'zero' ? '' : 'red';
  let label = '';

  switch (pick) {
    case 'LED_ONE_OFF':
      label = '👁️ サイドLED片側消灯';
      if (Math.random() < 0.5) setLedSide('off', baseLed);
      else setLedSide(baseLed, 'off');
      await wait(950, token);
      break;

    case 'LED_ALL_OFF':
      label = '👁️ サイドLED全消灯';
      setLed('off');
      await wait(950, token);
      break;

    case 'MONO_SCREEN':
      label = '👁️ 液晶モノクロ化';
      lcdFrame.classList.add('iwakan-mono');
      await wait(900, token);
      lcdFrame.classList.remove('iwakan-mono');
      break;

    case 'FADE_REMAIN':
      label = '👁️ 残り回数消失';
      if (bigRem) bigRem.classList.add('iwakan-fade-remain');
      await wait(980, token);
      if (bigRem) bigRem.classList.remove('iwakan-fade-remain');
      break;

    case 'REM_PURU':
      label = '👁️ レムぷる';
      oniLamp.classList.add('iwakan-rempuru');
      lcdFrame.classList.add('iwakan-rempuru');
      try { if (navigator && navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 30]); } catch (e) {}
      await wait(920, token);
      oniLamp.classList.remove('iwakan-rempuru');
      lcdFrame.classList.remove('iwakan-rempuru');
      break;

    case 'GLITCH_BLINK':
      label = '👁️ 映像ノイズ停止';
      rushNoiseVeil.classList.remove('hidden');
      lcdFrame.classList.add('fx-glitch');
      await wait(240, token);
      lcdFrame.classList.remove('fx-glitch');
      rushNoiseVeil.classList.add('hidden');
      await wait(650, token);
      break;

    case 'HIDDEN_REM':
      label = '👁️ 隠レム💙出現';
      hiddenRemBadge.classList.remove('hidden');
      await wait(1000, token);
      hiddenRemBadge.classList.add('hidden');
      break;

    case 'SILENT_STILL':
      label = '👁️ 背景オーラ静止';
      FxCanvas.setAmbient('none');
      FxCanvas.clearAll();
      await wait(950, token);
      break;

    case 'COUNT_6000':
      label = '👁️ 残り回数「6000」変化';
      if (bigRem) {
        const orig = bigRem.textContent;
        bigRem.textContent = '6000';
        bigRem.className = 'text-6xl sm:text-7xl font-black rainbow-grad-text leading-none tracking-tight';
        await wait(1050, token);
        bigRem.textContent = orig;
      }
      break;

    case 'RAINBOW_GLINT':
      label = '👁️ 鬼ランプ一瞬虹点灯';
      oniLamp.classList.add('lamp-rainbow');
      await wait(190, token);
      oniLamp.classList.remove('lamp-rainbow');
      await wait(780, token);
      break;
  }

  return label;
}

// レム告知モード：4種ランプ点灯パターン
async function playRemNoticePattern({ is6000, token }) {
  let pat = 'NORMAL';
  if (is6000 && Math.random() < 0.72) {
    const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
    pat = p6[Math.floor(Math.random() * p6.length)];
  }

  let note = '';
  if (pat === 'SLOW_GLOW') {
    note = '💙 レム徐々に点灯';
    oniLamp.classList.remove('lamp-rem', 'lamp-rainbow', 'lamp-red');
    oniLamp.classList.add('lamp-rem-slow');
    lampStatusText.textContent = 'じわ〜っ…';
    setLed('rem');
    await wait(1150, token);
    StudioAudio.playKyuin();
    triggerLamp('rainbow', '6000濃厚!!');
    await wait(350, token);
  } else if (pat === 'DOUBLE_BLINK') {
    note = '💙 レム再点灯';
    oniLamp.classList.add('lamp-rem');
    lampStatusText.textContent = 'ピッ…';
    await wait(160, token);
    oniLamp.classList.remove('lamp-rem');
    lampStatusText.textContent = '……';
    setLed('off');
    await wait(550, token);
    StudioAudio.playKyuin();
    triggerLamp('rainbow', '再点灯!!');
    FxCanvas.spawnLightning('#38bdf8', 4);
    await wait(420, token);
  } else if (pat === 'CLASSIC_FLASH') {
    note = '💙 旧レム閃光';
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

// 脳が震えるRUSH：文字保留・脳が煽りLv1〜5・震える告知（弱/中/強）
async function playBrainModeSequence({ isHit, is6000, bonusType, isHands = false, custOchiburu = true, token }) {
  const idleSub = document.getElementById('rushIdleSub');
  const maxLv = isHit ? (is6000 ? 5 : 4) : (Math.random() < 0.5 ? 2 : 3);

  updateReserveSlots('BRAIN', isHands ? 'HANDS' : 'NOGA');
  if (isHands) FxCanvas.spawnPurpleHands(26);

  rushTopBadge.classList.remove('hidden');
  for (let lv = 1; lv <= maxLv; lv++) {
    const isButtonGa = (isHit && is6000 && lv === maxLv && Math.random() < 0.55);
    if (isButtonGa) {
      rushTopBadge.textContent = '💥「ボタンが」震える!!';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
    } else {
      rushTopBadge.textContent = isHands ? `🖐️ 見えざる手 Lv.${lv}` : `🧠 脳が… Lv.${lv}`;
      rushTopBadge.className = lv >= 4
        ? 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-950/95 border border-amber-300 text-amber-200 shadow-lg'
        : 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-400 text-fuchsia-200 shadow-lg';
    }

    if (idleSub) {
      idleSub.textContent = isHands ? '🖐️ 見えざる手が迫る…' : `🧠 脳が…脳が…`;
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
    return { triggeredOchiburu: false, note: '' };
  }

  updateReserveSlots('BRAIN', 'HIT');
  let triggeredOchiburu = false;
  let note = '';
  if (is6000 && Math.random() < (custOchiburu ? 0.55 : 0.25)) {
    triggeredOchiburu = true;
    note = '🧠 脳が震える・強';
    rushTopBadge.textContent = '💥 脳が震える!!';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in';
    StudioAudio.playOchiburu(true);
    lcdFrame.classList.add('shake-intense', 'fx-rainbow');
    setAmbientBg('rainbow');
    setSunburst(true);
    triggerLamp('rainbow', '6000濃厚!!');
    FxCanvas.spawnLightning('#fde047', 5);
    await wait(1400, token);
    lcdFrame.classList.remove('shake-intense');
  } else if (bonusType === 'BONUS_1500' || is6000) {
    note = '🧠 脳が震える・中';
    rushTopBadge.textContent = '🧠 脳が震える!!';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-fuchsia-950/95 border border-amber-300 text-amber-200 shadow-lg pop-in';
    lcdFrame.classList.add('shake-mid', 'fx-gold');
    try { if (navigator && navigator.vibrate) navigator.vibrate([70, 30, 70, 30, 120]); } catch (e) {}
    StudioAudio.playSoftHeartbeat();
    FxCanvas.spawnRing('#e879f9', 260, 7);
    await wait(520, token);
    lcdFrame.classList.remove('shake-mid');
  } else {
    note = '🧠 脳が震える・弱';
    rushTopBadge.textContent = '🧠 脳が震える…';
    rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-300 text-fuchsia-100 shadow-lg pop-in';
    lcdFrame.classList.add('shake-weak');
    try { if (navigator && navigator.vibrate) navigator.vibrate([45, 35, 65]); } catch (e) {}
    await wait(440, token);
    lcdFrame.classList.remove('shake-weak');
  }

  rushTopBadge.classList.add('hidden');
  return { triggeredOchiburu, note };
}

// 鬼がかりRUSH：カウントダウン＆法則崩れ
async function playOnigakariCountdown({ isHit, is6000, token }) {
  let seq = ['3', '2', '1', '0'];
  let note = '';
  let isPrem = false;

  if (isHit && is6000 && Math.random() < 0.55) {
    if (Math.random() < 0.5) {
      seq = ['3', '4', '5', '6'];
      note = '🔥 法則崩れ(3→4→5→6)';
    } else {
      seq = ['6', '0', '0', '0'];
      note = '🔥 特殊カウント(6→0→0→0)';
    }
    isPrem = true;
  } else if (isHit && Math.random() < 0.35) {
    seq = ['E', 'M', 'I', '!!'];
    note = '🌈 特殊カウント(E→M→I)';
    isPrem = true;
  } else if (Math.random() < 0.35) {
    seq = ['1', '2', '3', '0'];
  }

  rushTopBadge.classList.remove('hidden');
  for (let i = 0; i < seq.length; i++) {
    rushTopBadge.textContent = `⏱ [ ${seq[i]} ]`;
    rushTopBadge.className = (isPrem && i >= 1)
      ? 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in'
      : 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-rose-950/95 border border-amber-400 text-amber-200 shadow-lg';
    FxCanvas.spawnRing(isPrem ? '#fde047' : '#ef4444', 180 + i * 35, 5);
    await wait(240, token);
    if (!isHit && i === 2) break;
  }

  rushTopBadge.classList.add('hidden');
  return isHit ? note : '';
}

// =========================================================================
// ★白鯨3,000 ダイレクト直撃（1,500仮表示なし・爆虹色直行）★
// =========================================================================
async function runWhale3000Direct(token) {
  try {
    setAmbientBg('rainbow');
    setSunburst(true);
    fireGlobalRainbowFlash();
    StudioAudio.playSlash();
    fireShatterFly();

    showFullscreenOverlay({
      mode: 'rainbow',
      sub: '🐋 白鯨討伐 🐋',
      main: '鬼がかり 3,000 BONUS!!',
      extra: '払出 3,000個（純増 2,800発）＋ 鬼がかりRUSH直行!!',
      scanlines: false
    });
    StudioAudio.play3000Jackpot();
    triggerLamp('rainbow', '3,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst');
    setLed('rainbow');

    await wait(2300, token);
    lcdFrame.classList.remove('shake-burst');
  } finally {
    clearGlobalChaosEffects();
    hideFullscreenOverlay();
  }
}

// =========================================================================
// ★RUSH中6,000限定：突発「落ちブル警報ロングトーン」直撃（前兆ゼロ・即6,000）★
// =========================================================================
async function runSuddenOchiburu6000({ sub = '鬼がかりRUSH', extra = '払出 6,000個（実質純増 5,600発）獲得!!', skipAlarm = false, token }) {
  try {
    if (!skipAlarm) {
      StudioAudio.playOchiburu(true);
    }
    setAmbientBg('rainbow');
    setSunburst(true);
    setPageMegaShake(true);
    fireGlobalRainbowFlash();
    triggerLamp('rainbow', '6,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-intense');
    setLed('rainbow');
    FxCanvas.spawnLightning('#fde047', 6);
    FxCanvas.burstRainbow(85);

    showFullscreenOverlay({
      mode: 'rainbow',
      sub: sub,
      main: '超・鬼がかり 6,000 BONUS!!',
      extra: extra,
      scanlines: false
    });

    // 警報ロングトーンのオクターブ突き上げを聴かせてから6,000ファンファーレへ繋ぐ
    await wait(skipAlarm ? 300 : 1250, token);
    setPageMegaShake(false);
    lcdFrame.classList.remove('shake-intense');
    StudioAudio.play6000Fanfare(false);
    FxCanvas.burstRainbow(70);

    await wait(2150, token);
  } finally {
    clearGlobalChaosEffects();
    hideFullscreenOverlay();
  }
}

// =========================================================================
// ★RUSH中6,000限定：突発「3秒間ガチフリーズ」→「鬼がかってますね」3.0秒 → 6,000★
// =========================================================================
async function runSudden3sFreeze6000(token) {
  try {
    StudioAudio.playPuchun();
    FxCanvas.setAmbient('none');
    FxCanvas.clearAll();
    setLed('off');
    setAmbientBg('');
    setSunburst(false);

    setGlobalBlackout(true);
    await waitFreeze(3000, token);
    setGlobalBlackout(false);

    // 3秒フリーズ明け：全画面「鬼がかってますね」約3.0秒じっくり表示
    await playOnigakariImageCutin({
      caption: '鬼がかってますね',
      dur: 3000,
      withPokyun: true,
      token
    });

    StudioAudio.playSlash();
    StudioAudio.playOchiburu(false);
    fireShatterFly();
    setAmbientBg('rainbow');
    setSunburst(true);

    showFullscreenOverlay({
      mode: 'rainbow',
      sub: '鬼がかってますね',
      main: '超・鬼がかり 6,000 BONUS!!',
      extra: '払出 6,000個（実質純増 5,600発）獲得!!',
      scanlines: false
    });
    StudioAudio.play6000Fanfare(false);
    triggerLamp('rainbow', '6,000!!');
    lcdFrame.classList.add('fx-rainbow');
    setLed('rainbow');

    await wait(2300, token);
  } finally {
    clearGlobalChaosEffects();
    hideFullscreenOverlay();
  }
}

// =========================================================================
// ★★★ 6,000 / 復活昇格シーケンス（ネタバレ解消・本家答え合わせ枠・OK割り込み対応）★★★
// crashType: 'auto' | 'pokyun' | 'freeze3s' | 'whisper' | 'drop' | 'shatter' | 'quake' | 'slash'
// =========================================================================
async function runGoldenPromotionSequence({
  fakeSub, fakeTitle, fakeDesc, fakeStyle = 'despair', fakeRestart = false,
  fakeIsRush = false, fakeBurstGold = false,
  iwakanAnswer = '',
  finalSub, finalTitle, finalExtra, finalSound = '6000',
  crashType = 'auto', token
}) {
  let mode = crashType;
  let useRareWhisper = false;

  if (mode === 'whisper') {
    useRareWhisper = true;
    const pool = ['slash', 'drop', 'shatter', 'quake'];
    mode = pool[Math.floor(Math.random() * pool.length)];
  } else if (mode === 'auto') {
    if (finalSound === '6000') {
      const r = Math.random();
      if (r < 0.24) mode = 'pokyun';
      else if (r < 0.42) mode = 'freeze3s';
      else {
        const pool = ['slash', 'drop', 'shatter', 'quake'];
        mode = pool[Math.floor(Math.random() * pool.length)];
        // ★「これから脳が震える…」はレア枠（約22%のみ出現）★
        if (Math.random() < 0.22) useRareWhisper = true;
      }
    } else {
      const pool = ['slash', 'drop', 'shatter', 'quake'];
      mode = pool[Math.floor(Math.random() * pool.length)];
      if (Math.random() < 0.30) useRareWhisper = true;
    }
  }

  try {
    // --- Step 1：仮表示（本物と完全一致・事前落ちブルなし・OKボタン割り込み受付） ---
    setActiveScene('bonus');
    hideIwakanAnswer();

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

    // 違和感があった場合は通常通り右下に答え合わせを表示（レア枠でないとき）
    if (iwakanAnswer && !useRareWhisper) {
      showIwakanAnswer(iwakanAnswer, false);
    }

    const waitRes = await waitInterruptible(1300, token);
    lcdFrame.classList.remove('fx-restart');

    // ★OK裏ボタン割り込み昇格：押した瞬間に割り込み落ちブル警報＆切り裂き爆虹6,000!!★
    if (waitRes === 'OK_INTERRUPT') {
      StudioAudio.playSlash();
      StudioAudio.playOchiburu(true);
      firePhysicalSplitSlash();
      setAmbientBg('rainbow');
      setSunburst(true);
      showFullscreenOverlay({
        mode: 'rainbow',
        sub: finalSub,
        main: finalTitle,
        extra: finalExtra,
        scanlines: false
      });
      triggerLamp('rainbow', '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      setLed('rainbow');
      await wait(1100, token);
      StudioAudio.play6000Fanfare(false);
      await wait(2000, token);
      lcdFrame.classList.remove('shake-burst');
      return;
    }

    // ★分岐A：油断撃ち抜き「虹ポキュ↑ーン↓＆落ちブル警報」昇格ルート★
    if (mode === 'pokyun') {
      StudioAudio.playPokyun(true);
      StudioAudio.playOchiburu(true);
      fireGlobalRainbowFlash();
      setAmbientBg('rainbow');
      setSunburst(true);
      triggerLamp('rainbow', '🌈 ポキュ↑ーン↓!!');
      lcdFrame.classList.remove('mode-despair-bg');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      FxCanvas.burstRainbow(72);

      showFullscreenOverlay({
        mode: 'rainbow',
        sub: fakeRestart ? 'Re:Start' : finalSub,
        main: 'ポキュ↑ーン↓!!',
        extra: '',
        scanlines: false
      });
      await wait(1250, token);
      lcdFrame.classList.remove('shake-burst');

      StudioAudio.playSlash();
      firePhysicalSplitSlash();
      showFullscreenOverlay({
        mode: 'rainbow',
        sub: finalSub,
        main: finalTitle,
        extra: finalExtra,
        scanlines: false
      });
      StudioAudio.play6000Fanfare(false);
      triggerLamp('rainbow', '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      setLed('rainbow');
      await wait(2200, token);
      lcdFrame.classList.remove('shake-burst');
      return;
    }

    // ★レア枠（約22%のみ）：本来「違和感の答え合わせ」が出る右下枠に『これから脳が震える…』が出現！★
    if (useRareWhisper) {
      StudioAudio.playSoftHeartbeat();
      showIwakanAnswer('これから脳が震える…', true);
      await wait(1250, token);
    }

    // --- 一瞬の無音フリーズ（さりげない残響プチュン） ---
    StudioAudio.playPuchun();
    FxCanvas.setAmbient('none');
    FxCanvas.clearAll();
    setLed('off');
    setAmbientBg('');
    setSunburst(false);
    lcdFrame.classList.remove('fx-gold', 'fx-rainbow', 'mode-despair-bg', 'mode-brain-bg', 'mode-rem-bg', 'mode-zero-bg');

    if (mode === 'freeze3s') {
      setGlobalBlackout(true);
      await waitFreeze(3000, token);
      setGlobalBlackout(false);

      await playOnigakariImageCutin({
        caption: '鬼がかってますね',
        dur: 3000,
        withPokyun: true,
        token
      });
    } else {
      showFullscreenOverlay({ mode: 'blackout', sub: '', main: '', extra: '', scanlines: false });
      await wait(650, token);

      StudioAudio.playCrackNoise();
      crtScanLayer.classList.remove('hidden');
      lcdFrame.classList.add('fx-glitch');
      FxCanvas.spawnRedCracks();
      await wait(450, token);
      lcdFrame.classList.remove('fx-glitch');
    }

    // --- 解放：虹ポキュ↑ーン↓＆落ちブル＆爆虹色破壊演出 → 超・鬼がかり6,000（虹） ---
    FxCanvas.clearCracks();
    if (mode !== 'freeze3s') StudioAudio.playPokyun(true);
    StudioAudio.playSlash();
    StudioAudio.playOchiburu(mode !== 'freeze3s');

    if (mode === 'drop') fireDropCrash(fakeTitle);
    else if (mode === 'shatter') fireShatterFly();
    else if (mode === 'quake') fireMegaQuakeBrainBreak();
    else if (mode === 'freeze3s') fireShatterFly();
    else firePhysicalSplitSlash();

    setAmbientBg('rainbow');
    setSunburst(true);

    showFullscreenOverlay({
      mode: 'rainbow',
      sub: finalSub,
      main: finalTitle,
      extra: finalExtra,
      scanlines: false
    });

    triggerLamp('rainbow', finalSound === '3000' ? '3,000!!' : '6,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst');
    setLed('rainbow');

    await wait(mode === 'freeze3s' ? 150 : 950, token);
    if (finalSound === '3000') StudioAudio.play3000Jackpot();
    else StudioAudio.play6000Fanfare(false);

    await wait(2150, token);
    lcdFrame.classList.remove('shake-burst');
  } finally {
    clearGlobalChaosEffects();
    hideFullscreenOverlay();
  }
}
