// =========================================================================
// addons.js (v5) :
//  1. 脳が震えるRUSH全面刷新：本家4層構造（常駐ペテ→Lv1〜5一発進化／震えるbotan.jpg／「脳が」大量乱舞）
//  2. 暗転のまま「先行サラサラキラキラ → 鬼がかってますね緩やかフェードイン」
//  3. ゼロかRUSH本家強化（名言・図柄ホールド・専用保留・轟転タイマー・カドモン＋ガセ煽り）
//  4. 鬼化レムランプ役物（残留完全解消・同時ポキュ↑ーン↓）＆モード別ビート＆無限ST
// =========================================================================
(function initAddonsV5() {
  // -----------------------------------------------------------------------
  // 1. 追加CSS注入
  // -----------------------------------------------------------------------
  if (!document.getElementById('addons-v5-css')) {
    const st = document.createElement('style');
    st.id = 'addons-v5-css';
    st.textContent = `
      #stageBgCanvas {
        position: absolute; inset: 0; width: 100%; height: 100%;
        z-index: 1; pointer-events: none; opacity: 0.92; transition: opacity 0.25s ease;
      }
      #stageNamePill {
        position: absolute; top: 52px; left: 12px; z-index: 12; pointer-events: none;
        padding: 2px 9px; border-radius: 9999px; font-size: 10px; font-weight: 900;
        letter-spacing: 0.08em; background: rgba(12, 6, 8, 0.72);
        border: 1px solid rgba(250, 204, 21, 0.45); color: #fde68a; backdrop-filter: blur(4px);
      }

      /* 鬼化レムランプ役物レイヤー */
      #remLampStage {
        position: absolute; inset: 0; z-index: 6; pointer-events: none;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; padding: 18px 8px 26px 8px;
      }
      #remLampStage.hidden { display: none !important; }
      #remLampImg {
        max-height: 98%; max-width: 96%; object-fit: contain;
        transition: filter 0.18s ease, opacity 0.22s ease, transform 0.24s ease;
        will-change: filter, opacity, transform;
      }

      /* レム告知モード専用レイアウト */
      #scene-rush-idle.actor-layout-clear {
        justify-content: flex-end !important; align-items: flex-start !important;
        text-align: left !important; padding: 0 4px 2px 4px;
      }
      #scene-rush-idle.actor-layout-clear #rushModeBanner {
        font-size: 9px !important; margin-bottom: 0 !important; opacity: 0.88;
        background: rgba(8, 6, 18, 0.76); padding: 1px 7px; border-radius: 6px;
      }
      #scene-rush-idle.actor-layout-clear #rushBigRemain {
        font-size: 2.1rem !important; line-height: 1 !important;
      }
      #scene-rush-idle.actor-layout-clear #rushIdleSub {
        margin-top: 2px !important; font-size: 10px !important; padding: 1px 6px !important;
        background: rgba(8, 6, 18, 0.76); border-radius: 6px; max-width: 220px !important;
      }

      /* 脳が震えるRUSH中は元のシンプルな中央「144」テキスト群を隠す */
      #scene-rush-idle.brain-immersive #rushModeBanner,
      #scene-rush-idle.brain-immersive #rushBigRemain,
      #scene-rush-idle.brain-immersive #rushIdleSub,
      #scene-rush-idle.brain-immersive .flex.items-baseline {
        opacity: 0 !important;
        pointer-events: none !important;
      }

      /* =================================================================
         脳が震えるRUSH：本家4層サンドイッチ・フルスクリーンステージ
         ================================================================= */
      #brainImmersiveStage {
        position: absolute; inset: 0; z-index: 7; pointer-events: none;
        overflow: hidden;
      }
      #brainImmersiveStage.hidden { display: none !important; }

      /* 上部中央：本家風装飾のコンパクト残り回数バー */
      #brainTopHud {
        position: absolute;
        top: 46px; left: 50%; transform: translateX(-50%);
        z-index: 26;
        display: flex; align-items: center; gap: 6px;
        padding: 2px 14px;
        border-radius: 9999px;
        background: linear-gradient(180deg, rgba(42,8,56,0.92) 0%, rgba(16,4,24,0.95) 100%);
        border: 1.5px solid rgba(250, 204, 21, 0.78);
        box-shadow: 0 0 14px rgba(168, 85, 247, 0.75), inset 0 0 8px rgba(250, 204, 21, 0.22);
        white-space: nowrap;
      }

      /* 層2：フルサイズ・ペテルギウス（端を紫闇に溶かす＆呼吸微振動） */
      #brainPeteWrap {
        position: absolute; inset: 0; z-index: 10;
        display: flex; align-items: flex-start; justify-content: center;
        overflow: hidden;
      }
      @keyframes peteIdleBreath {
        0%, 100% { transform: scale(1.02) translateY(0px); }
        50%      { transform: scale(1.055) translateY(-3px); }
      }
      @keyframes petePunchIn {
        0%   { transform: scale(1.42); filter: brightness(2.0) contrast(1.45) hue-rotate(-14deg); }
        40%  { transform: scale(0.98); filter: brightness(1.18) contrast(1.22); }
        100% { transform: scale(1.06); filter: brightness(1.06) contrast(1.16); }
      }
      @keyframes peteMadQuiver {
        0%, 100% { transform: translate(0, 0) scale(1.08); }
        25%      { transform: translate(-3px, 2px) scale(1.10); }
        50%      { transform: translate(3px, -2px) scale(1.09); }
        75%      { transform: translate(-2px, -2px) scale(1.11); }
      }
      .brain-pete-img {
        position: absolute;
        top: 6%;
        left: 50%;
        transform: translateX(-50%);
        width: 96%;
        height: 82%;
        object-fit: contain;
        opacity: 0;
        transition: opacity 0.16s ease-out;
        filter: contrast(1.10) saturate(1.18) drop-shadow(0 0 24px rgba(168, 85, 247, 0.72));
        will-change: transform, opacity, filter;
      }
      .brain-pete-img.pete-cover {
        top: 0;
        width: 108%;
        height: 100%;
        object-fit: cover;
      }
      .brain-pete-img.pete-shown { opacity: 1; }
      .brain-pete-img.pete-breath {
        animation: peteIdleBreath 2.6s ease-in-out infinite;
      }
      .brain-pete-img.pete-punch {
        animation: petePunchIn 0.24s cubic-bezier(0.16, 1, 0.3, 1) forwards, peteMadQuiver 0.11s linear 0.24s infinite;
      }
      /* ペテと紫背景を一体化させる毒紫環境光ベール */
      #brainAtmosphereVeil {
        position: absolute; inset: 0; z-index: 12; pointer-events: none;
        background:
          radial-gradient(ellipse at 50% 44%, rgba(168, 85, 247, 0.08) 28%, rgba(46, 8, 72, 0.56) 72%, rgba(8, 2, 16, 0.88) 100%),
          linear-gradient(180deg, rgba(16, 4, 28, 0.62) 0%, transparent 22%, transparent 66%, rgba(12, 2, 22, 0.88) 100%);
      }

      /* 進化時の0.1秒紫稲妻ノイズフラッシュ（貼り替え感を消すカットイン衝撃） */
      @keyframes brainEvoFlashAnim {
        0%   { opacity: 0.95; background: radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(217,70,239,0.88) 45%, rgba(59,7,100,0.96) 100%); }
        100% { opacity: 0; }
      }
      #brainEvoFlash {
        position: absolute; inset: 0; z-index: 24; pointer-events: none; opacity: 0;
      }
      #brainEvoFlash.flash-fire {
        animation: brainEvoFlashAnim 0.22s ease-out forwards;
      }

      /* 層3：手前下部中央に常駐する巨大3Dボタン（botan.jpg） */
      #brainButtonWrap {
        position: absolute;
        bottom: 34px;
        left: 50%;
        transform: translateX(-50%);
        width: 196px;
        max-width: 56%;
        z-index: 18;
        display: flex; align-items: center; justify-content: center;
      }
      #brainButtonRing {
        position: absolute;
        width: 118%; height: 118%;
        border-radius: 9999px;
        pointer-events: none;
        opacity: 0;
      }
      #brainButtonImg {
        width: 100%; height: auto;
        display: block;
        filter: brightness(0.95) drop-shadow(0 8px 18px rgba(0,0,0,0.92)) drop-shadow(0 0 14px rgba(168,85,247,0.45));
        transition: filter 0.14s ease, transform 0.14s ease;
        will-change: transform, filter;
      }

      /* ボタン振動・発光 4段階 */
      @keyframes btnVibeWeak {
        0%, 100% { transform: translate(0, 0) scale(1.02); }
        25%      { transform: translate(-2.5px, 1.5px) scale(1.03); }
        50%      { transform: translate(2.5px, -1.5px) scale(1.02); }
        75%      { transform: translate(-2px, -1.5px) scale(1.03); }
      }
      @keyframes btnVibeMid {
        0%, 100% { transform: translate(0, 0) scale(1.07) rotate(0deg); }
        20%      { transform: translate(-6px, 3px) scale(1.09) rotate(-1.6deg); }
        40%      { transform: translate(6px, -4px) scale(1.06) rotate(1.6deg); }
        60%      { transform: translate(-5px, -3px) scale(1.10) rotate(-1.4deg); }
        80%      { transform: translate(5px, 3px) scale(1.07) rotate(1.4deg); }
      }
      @keyframes btnVibeMax {
        0%, 100% { transform: translate(0, 0) scale(1.14) rotate(0deg); filter: brightness(1.38) saturate(1.6) drop-shadow(0 0 26px rgba(250,204,21,1)) drop-shadow(0 0 54px rgba(236,72,153,0.95)); }
        16%      { transform: translate(-10px, -6px) scale(1.18) rotate(-3deg); filter: brightness(1.5) saturate(1.8) drop-shadow(0 0 32px rgba(56,189,248,1)) drop-shadow(0 0 60px rgba(250,204,21,1)); }
        33%      { transform: translate(10px, 5px) scale(1.12) rotate(3deg); filter: brightness(1.42) saturate(1.7) drop-shadow(0 0 30px rgba(244,63,94,1)) drop-shadow(0 0 56px rgba(192,132,252,1)); }
        50%      { transform: translate(-9px, 6px) scale(1.20) rotate(-2.5deg); }
        66%      { transform: translate(9px, -6px) scale(1.14) rotate(2.5deg); }
        83%      { transform: translate(-7px, -4px) scale(1.17) rotate(-2deg); }
      }
      @keyframes btnRingPulse {
        0%   { transform: scale(0.75); opacity: 0.95; }
        100% { transform: scale(1.55); opacity: 0; }
      }
      .btn-vibe-weak {
        animation: btnVibeWeak 0.08s linear infinite !important;
        filter: brightness(1.14) drop-shadow(0 0 18px rgba(217,70,239,0.92)) drop-shadow(0 0 34px rgba(168,85,247,0.75)) !important;
      }
      .btn-vibe-mid {
        animation: btnVibeMid 0.07s linear infinite !important;
        filter: brightness(1.28) saturate(1.45) drop-shadow(0 0 24px rgba(244,63,94,0.98)) drop-shadow(0 0 46px rgba(250,204,21,0.88)) !important;
      }
      .btn-vibe-max {
        animation: btnVibeMax 0.065s linear infinite !important;
      }
      .btn-ring-active {
        border: 3px solid #f0abfc;
        box-shadow: 0 0 24px #e879f9, inset 0 0 18px #f43f5e;
        animation: btnRingPulse 0.42s ease-out infinite !important;
      }
      .btn-ring-rainbow {
        border: 4px solid #fde047;
        box-shadow: 0 0 34px #fde047, 0 0 58px #ec4899, inset 0 0 24px #38bdf8;
        animation: btnRingPulse 0.28s ease-out infinite !important;
      }

      /* 層4：禍々しい「脳が」文字の大量乱舞（黒極太フチ×毒紫ネオン＋高速ぶるぶる） */
      #brainTextSwarm {
        position: absolute; inset: 0; z-index: 22; pointer-events: none; overflow: hidden;
      }
      @keyframes nogaTremble {
        0%, 100% { transform: translate(0, 0) rotate(var(--rot)) scale(var(--sc)); }
        25%      { transform: translate(-3.5px, 2px) rotate(calc(var(--rot) - 2deg)) scale(calc(var(--sc) * 1.04)); }
        50%      { transform: translate(3.5px, -2.5px) rotate(calc(var(--rot) + 2deg)) scale(calc(var(--sc) * 0.98)); }
        75%      { transform: translate(-2.5px, -2px) rotate(calc(var(--rot) - 1.5deg)) scale(calc(var(--sc) * 1.05)); }
      }
      @keyframes nogaSlamIn {
        0%   { opacity: 0; transform: translate(0, 0) rotate(var(--rot)) scale(calc(var(--sc) * 2.1)); }
        55%  { opacity: 1; transform: translate(0, 0) rotate(var(--rot)) scale(calc(var(--sc) * 0.92)); }
        100% { opacity: 1; transform: translate(0, 0) rotate(var(--rot)) scale(var(--sc)); }
      }
      .noga-word {
        position: absolute;
        font-family: 'Shippori Mincho', 'Noto Sans JP', serif;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.04em;
        white-space: nowrap;
        color: #f0abfc;
        -webkit-text-stroke: 2.5px #12021a;
        text-shadow:
          0 0 8px #a21caf,
          0 0 18px #d946ef,
          3px 3px 0 #09010d,
          -2px -2px 0 #2e0642;
        animation: nogaSlamIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards, nogaTremble 0.085s linear 0.18s infinite;
      }
      .noga-word.noga-hot {
        color: #fda4af;
        -webkit-text-stroke: 3px #1c020c;
        text-shadow:
          0 0 10px #e11d48,
          0 0 24px #f43f5e,
          0 0 38px #c026d3,
          3px 3px 0 #09010d;
      }
      .noga-word.noga-gold {
        color: #fef08a;
        -webkit-text-stroke: 3px #291202;
        text-shadow:
          0 0 12px #facc15,
          0 0 28px #f59e0b,
          0 0 44px #ef4444,
          3px 3px 0 #120601;
      }

      /* 鬼化レム：消灯待機・点灯4パターン */
      .rem-img-idle {
        opacity: 0.34; filter: brightness(0.28) saturate(0.35) contrast(1.22); transform: scale(0.97);
      }
      .rem-img-lit {
        opacity: 1 !important;
        filter: brightness(1.26) saturate(1.38) drop-shadow(0 0 18px rgba(56,189,248,0.98)) drop-shadow(0 0 46px rgba(14,165,233,0.92)) !important;
        transform: scale(1.04) !important;
      }
      @keyframes remImgSlowWake {
        0%   { opacity: 0.30; filter: brightness(0.26) saturate(0.3); transform: scale(0.97); }
        55%  { opacity: 0.88; filter: brightness(0.98) saturate(1.2) drop-shadow(0 0 18px rgba(56,189,248,0.88)); transform: scale(1.02); }
        100% { opacity: 1; filter: brightness(1.38) saturate(1.45) drop-shadow(0 0 24px rgba(250,204,21,0.98)) drop-shadow(0 0 54px rgba(56,189,248,0.95)); transform: scale(1.07); }
      }
      .rem-img-slow { animation: remImgSlowWake 1.2s ease-in forwards !important; }

      @keyframes remImgRainbowGlow {
        0%   { filter: brightness(1.30) saturate(1.4) drop-shadow(0 0 22px rgba(250,204,21,0.98)) drop-shadow(0 0 48px rgba(244,63,94,0.88)); }
        33%  { filter: brightness(1.35) saturate(1.4) drop-shadow(0 0 22px rgba(56,189,248,0.98)) drop-shadow(0 0 48px rgba(192,132,252,0.88)); }
        66%  { filter: brightness(1.30) saturate(1.4) drop-shadow(0 0 22px rgba(52,211,153,0.98)) drop-shadow(0 0 48px rgba(250,204,21,0.88)); }
        100% { filter: brightness(1.30) saturate(1.4) drop-shadow(0 0 22px rgba(250,204,21,0.98)) drop-shadow(0 0 48px rgba(244,63,94,0.88)); }
      }
      .rem-img-rainbow {
        opacity: 1 !important; transform: scale(1.07) !important;
        animation: remImgRainbowGlow 0.55s linear infinite !important;
      }

      @keyframes remImgStrobe {
        0%, 100% { opacity: 1; filter: brightness(1.85) saturate(1.3) drop-shadow(0 0 34px rgba(224,242,254,1)) drop-shadow(0 0 65px rgba(56,189,248,1)); transform: scale(1.08); }
        50%      { opacity: 0.28; filter: brightness(0.35) saturate(0.4); transform: scale(0.98); }
      }
      .rem-img-strobe { animation: remImgStrobe 0.13s steps(2) infinite !important; }

      /* 暗転のまま「鬼がかってますね」緩やかフェードイン（約2.35秒S字カーブ） */
      @keyframes slowGentleFadeIn {
        0%   { opacity: 0; transform: scale(0.975); filter: brightness(0.55); }
        45%  { opacity: 0.42; transform: scale(0.992); filter: brightness(0.86); }
        100% { opacity: 1; transform: scale(1.025); filter: brightness(1.04); }
      }
      .cutin-gentle-fade {
        animation: slowGentleFadeIn 2.35s cubic-bezier(0.37, 0, 0.63, 1) forwards;
      }

      /* サラサラキラキラ専用レイヤー */
      #softSparkleCanvas {
        position: fixed; inset: 0; width: 100%; height: 100%;
        z-index: 1002; pointer-events: none;
        opacity: 0; transition: opacity 0.9s ease-in-out;
      }
      #softSparkleCanvas.sparkle-on { opacity: 1; }
    `;
    document.head.appendChild(st);
  }

  // -----------------------------------------------------------------------
  // 2. 先行「サラサラキラキラ」専用Canvas
  // -----------------------------------------------------------------------
  const SoftSparkle = (() => {
    const cv = document.createElement('canvas');
    cv.id = 'softSparkleCanvas';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    let w = window.innerWidth, h = window.innerHeight, running = false, rafId = null;
    const motes = [];
    const PALETTE = ['#ffffff', '#fef9c3', '#e0f2fe', '#fef3c7', '#f8fafc'];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function initMotes() {
      motes.length = 0;
      for (let i = 0; i < 68; i++) {
        motes.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22, vy: -(0.14 + Math.random() * 0.34),
          r: 0.7 + Math.random() * 1.7, phase: Math.random() * Math.PI * 2,
          twinkleSpd: 0.025 + Math.random() * 0.045, isStar: Math.random() < 0.22,
          color: PALETTE[i % PALETTE.length]
        });
      }
    }

    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < motes.length; i++) {
        const m = motes[i];
        m.x += m.vx + Math.sin(m.phase * 0.5) * 0.14;
        m.y += m.vy; m.phase += m.twinkleSpd;
        if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
        if (m.x < -12) m.x = w + 12; if (m.x > w + 12) m.x = -12;

        const alpha = 0.18 + Math.max(0, Math.sin(m.phase)) * 0.68;
        ctx.save();
        ctx.globalAlpha = alpha; ctx.fillStyle = m.color;
        ctx.shadowBlur = m.r * 5.5; ctx.shadowColor = m.color;
        if (m.isStar) {
          const len = m.r * 3.4;
          ctx.translate(m.x, m.y); ctx.strokeStyle = m.color; ctx.lineWidth = 0.75;
          ctx.beginPath(); ctx.moveTo(-len, 0); ctx.lineTo(len, 0); ctx.moveTo(0, -len); ctx.lineTo(0, len); ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, m.r * 0.65, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
      }
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize); resize();
    return {
      start() { resize(); if (!running) { initMotes(); running = true; cv.classList.add('sparkle-on'); draw(); } else cv.classList.add('sparkle-on'); },
      stop() {
        cv.classList.remove('sparkle-on');
        setTimeout(() => { if (!cv.classList.contains('sparkle-on')) { running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } ctx.clearRect(0, 0, w, h); } }, 950);
      },
      forceClear() { cv.classList.remove('sparkle-on'); running = false; if (rafId) { cancelAnimationFrame(rafId); rafId = null; } ctx.clearRect(0, 0, w, h); }
    };
  })();

  // -----------------------------------------------------------------------
  // 3. モード別ビートエンジン（プチュン・無音違和感で完全切断）
  // -----------------------------------------------------------------------
  const BeatEngine = (() => {
    let ctx = null, bus = null, noiseBuf = null;
    let enabled = true, globalMuted = false, cutFlag = false;
    let timer = null, step = 0, currentStyle = 'normal', pulseLevel = 0;

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        bus = ctx.createGain(); bus.gain.value = 0.28; bus.connect(ctx.destination);
        const len = Math.floor(ctx.sampleRate * 0.25);
        noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function playKick(t, gain = 0.55, startHz = 128, endHz = 42, dur = 0.14) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(startHz, t); o.frequency.exponentialRampToValueAtTime(endHz, t + dur);
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.02);
      o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.03); pulseLevel = 1.0;
    }
    function playHat(t, gain = 0.12, open = false) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
      const g = ctx.createGain(); const d = open ? 0.085 : 0.032;
      g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
      src.connect(hp).connect(g).connect(bus); src.start(t); src.stop(t + d + 0.01);
    }
    function playSnare(t, gain = 0.20) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1850; bp.Q.value = 0.9;
      const g = ctx.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      src.connect(bp).connect(g).connect(bus); src.start(t); src.stop(t + 0.10);
    }
    function playBass(t, freq, dur = 0.11, gain = 0.22, type = 'sawtooth', cutoff = 420) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t); lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 2.5;
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain, t + 0.008); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(lp).connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
    }
    function playPluck(t, freq, dur = 0.12, gain = 0.11, type = 'triangle') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
    }

    function getStepMs(style) {
      const bpm = style === 'onigakari' ? 156 : style === 'brain' ? 144 : style === 'rem' ? 130 : style === 'zero' ? 150 : 122;
      return (60000 / bpm) / 4;
    }

    function tickStep() {
      if (!enabled || globalMuted || cutFlag || !ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime + 0.01, s = step % 16;

      if (currentStyle === 'onigakari') {
        if (s % 4 === 0) playKick(t, 0.70, 145, 42, 0.12);
        if (s === 4 || s === 12) playSnare(t, 0.22);
        if (s % 2 === 1) playHat(t, s % 4 === 2 ? 0.16 : 0.10, s % 4 === 2);
        const bassNotes = [73.42, 73.42, 87.31, 82.41];
        if (s % 2 === 1) playBass(t, bassNotes[Math.floor(s / 4)], 0.09, 0.28, 'sawtooth', 620);
        const arp = [293.66, 0, 349.23, 0, 440, 0, 392, 349.23, 293.66, 0, 523.25, 0, 440, 0, 392, 0];
        if (arp[s]) playPluck(t, arp[s], 0.09, 0.12, 'sawtooth');
      } else if (currentStyle === 'brain') {
        if (s === 0 || s === 3 || s === 8 || s === 11) playKick(t, 0.68, 118, 36, 0.15);
        if (s === 4 || s === 12) playSnare(t, 0.18);
        if (s % 2 === 0) playHat(t, 0.08, false);
        const b = [65.41, 69.30, 65.41, 61.74];
        if (s % 4 === 0 || s % 4 === 2) playBass(t, b[Math.floor(s / 4)], 0.14, 0.30, 'sawtooth', 360);
        if (s === 6 || s === 14) playPluck(t, s === 6 ? 622.25 : 587.33, 0.12, 0.10, 'square');
      } else if (currentStyle === 'rem') {
        if (s === 0 || s === 8) playKick(t, 0.42, 110, 44, 0.14);
        if (s % 4 === 2) playHat(t, 0.07, false);
        const bell = [523.25, 0, 0, 659.25, 0, 0, 783.99, 0, 659.25, 0, 0, 587.33, 0, 0, 493.88, 0];
        if (bell[s]) playPluck(t, bell[s], 0.22, 0.10, 'sine');
      } else if (currentStyle === 'zero') {
        if (s % 4 === 0) playKick(t, 0.60, 140, 44, 0.11);
        if (s === 4 || s === 12) playSnare(t, 0.18);
        if (s % 2 === 1) playHat(t, 0.10, false);
        const zb = [82.41, 82.41, 98.00, 92.50];
        if (s % 4 === 0 || s % 4 === 2) playBass(t, zb[Math.floor(s / 4)], 0.10, 0.24, 'sawtooth', 500);
        const zLead = [329.63, 0, 392.00, 0, 493.88, 0, 440.00, 0, 392.00, 0, 329.63, 0, 392.00, 440.00, 493.88, 0];
        if (zLead[s]) playPluck(t, zLead[s], 0.10, 0.09, 'triangle');
      } else {
        if (s % 4 === 0) playKick(t, 0.36, 115, 44, 0.13);
        if (s % 4 === 2) playHat(t, 0.07, false);
        const nBass = [65.41, 73.42, 82.41, 73.42];
        if (s % 4 === 0) playBass(t, nBass[Math.floor(s / 4)], 0.18, 0.14, 'triangle', 300);
        const nArp = [261.63, 0, 329.63, 0, 392.00, 0, 329.63, 0, 293.66, 0, 349.23, 0, 440.00, 0, 392.00, 0];
        if (nArp[s]) playPluck(t, nArp[s], 0.16, 0.06, 'sine');
      }
      step++;
    }

    function restartTimer() {
      if (timer) { clearInterval(timer); timer = null; }
      if (!enabled || globalMuted || cutFlag) return;
      timer = setInterval(tickStep, getStepMs(currentStyle));
    }
    function syncStyle() {
      if (typeof state === 'undefined') return;
      if (state.phase === 'RUSH') currentStyle = state.rushMode || 'onigakari';
      else if (state.phase === 'NORMAL') currentStyle = 'normal';
      if (bus && ctx) {
        const vol = (state.phase === 'RUSH') ? 0.32 : 0.22;
        bus.gain.setTargetAtTime(cutFlag || !enabled || globalMuted ? 0.0001 : vol, ctx.currentTime, 0.02);
      }
      restartTimer();
    }

    return {
      unlock() { ensureCtx(); syncStyle(); },
      cut() {
        cutFlag = true;
        if (timer) { clearInterval(timer); timer = null; }
        if (bus && ctx) { bus.gain.cancelScheduledValues(ctx.currentTime); bus.gain.setValueAtTime(0.0001, ctx.currentTime); }
      },
      resume() { cutFlag = false; if (!enabled || globalMuted) return; ensureCtx(); syncStyle(); },
      setStyle(style) { if (currentStyle !== style) { currentStyle = style; step = 0; } if (!cutFlag) syncStyle(); },
      toggle() { enabled = !enabled; if (enabled) { cutFlag = false; ensureCtx(); syncStyle(); } else this.cut(); return enabled; },
      setGlobalMute(m) {
        globalMuted = m;
        if (m) this.cut();
        else if (enabled && typeof state !== 'undefined' && (state.phase === 'NORMAL' || state.phase === 'RUSH')) this.resume();
      },
      isCut: () => cutFlag || !enabled || globalMuted,
      consumePulse() { const v = pulseLevel; pulseLevel *= 0.84; if (pulseLevel < 0.01) pulseLevel = 0; return v; }
    };
  })();

  ['pointerdown', 'keydown'].forEach(evName => window.addEventListener(evName, () => BeatEngine.unlock(), { once: true }));

  const speedBtn = document.getElementById('btnSpeedToggle');
  if (speedBtn && !document.getElementById('btnToggleBgm')) {
    const bgmBtn = document.createElement('button');
    bgmBtn.id = 'btnToggleBgm';
    bgmBtn.className = 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/60 active:scale-95 transition';
    bgmBtn.textContent = '🎵 ビート';
    speedBtn.parentElement.insertBefore(bgmBtn, speedBtn);
    bgmBtn.addEventListener('click', () => {
      const on = BeatEngine.toggle();
      bgmBtn.textContent = on ? '🎵 ビート' : '🔇 ビート';
      bgmBtn.className = on
        ? 'px-1.5 py-1.5 rounded-lg text-[10px] font-black bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/60 active:scale-95 transition'
        : 'px-1.5 py-1.5 rounded-lg text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-700 active:scale-95 transition';
    });
  }

  const muteBtn = document.getElementById('btnMute');
  if (muteBtn) muteBtn.addEventListener('click', () => setTimeout(() => BeatEngine.setGlobalMute(muteBtn.textContent.includes('OFF')), 10));

  // -----------------------------------------------------------------------
  // 4. 動的ステージ背景Canvas（脳が震えるRUSHは禍々しい紫オーラ＆うねる触手ライン強化）
  // -----------------------------------------------------------------------
  const stageBgCanvas = document.createElement('canvas');
  stageBgCanvas.id = 'stageBgCanvas';
  lcdFrame.insertBefore(stageBgCanvas, lcdFrame.firstChild);

  const stageNamePill = document.createElement('div');
  stageNamePill.id = 'stageNamePill';
  stageNamePill.textContent = '🏰 王都ルグニカ';
  lcdFrame.appendChild(stageNamePill);

  const NORMAL_STAGES = [
    { name: '🏰 王都ルグニカ', c1: '#451218', c2: '#1f080d', accent: '#facc15', glow: 'rgba(250,204,21,0.32)' },
    { name: '🌅 ロズワール邸・夕暮れ', c1: '#5c1d0c', c2: '#230b08', accent: '#fb923c', glow: 'rgba(251,146,60,0.35)' },
    { name: '🌙 蒼月の森', c1: '#0c2748', c2: '#071124', accent: '#38bdf8', glow: 'rgba(56,189,248,0.32)' },
    { name: '🌫️ 霧の街道', c1: '#12383a', c2: '#07171a', accent: '#2dd4bf', glow: 'rgba(45,212,191,0.32)' }
  ];

  (function startStageRenderer() {
    const ctx = stageBgCanvas.getContext('2d');
    let w = 360, h = 360, angle = 0;
    const rays = Array.from({ length: 34 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), spd: 0.015 + Math.random() * 0.025, len: 0.12 + Math.random() * 0.18 }));
    const flakes = Array.from({ length: 32 }, () => ({ x: Math.random(), y: Math.random(), vy: 0.0015 + Math.random() * 0.0025, vx: (Math.random() - 0.5) * 0.001, s: 1.5 + Math.random() * 3.0 }));

    function resize() {
      const rect = lcdFrame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(100, rect.width); h = Math.max(100, rect.height);
      stageBgCanvas.width = w * dpr; stageBgCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawMagicCircle(cx, cy, radius, color, rot, alpha) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot); ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2); ctx.stroke();
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 * i) / 3 + (k * Math.PI / 3);
          const x = Math.cos(a) * radius * 0.92, y = Math.sin(a) * radius * 0.92;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.restore();
    }

    // 脳が震えるRUSH用：左右からうねる「見えざる手」オーラ帯
    function drawUnseenTendrils(t, pulse) {
      ctx.save();
      for (let i = 0; i < 6; i++) {
        const left = i % 2 === 0;
        const startX = left ? -10 : w + 10;
        const baseY = h * (0.18 + (i % 3) * 0.25);
        ctx.beginPath();
        ctx.moveTo(startX, baseY);
        const dir = left ? 1 : -1;
        const reach = w * (0.28 + Math.sin(t * 2.1 + i) * 0.08 + pulse * 0.06);
        const cp1x = startX + dir * reach * 0.45;
        const cp1y = baseY + Math.sin(t * 3.0 + i * 1.4) * 38;
        const cp2x = startX + dir * reach * 0.85;
        const cp2y = baseY + Math.cos(t * 2.5 + i) * 44;
        const endX = startX + dir * reach;
        const endY = baseY + Math.sin(t * 1.9 + i * 2) * 28;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(232, 121, 249, 0.45)' : 'rgba(147, 51, 234, 0.55)';
        ctx.lineWidth = 10 + pulse * 6;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 22; ctx.shadowColor = '#c026d3';
        ctx.stroke();
      }
      ctx.restore();
    }

    function loop() {
      const frozen = BeatEngine.isCut() && typeof state !== 'undefined' && state.phase === 'ANIMATING';
      const pulse = BeatEngine.consumePulse();
      if (!frozen) angle += 0.006 + pulse * 0.012;

      const ph = typeof state !== 'undefined' ? state.phase : 'NORMAL';
      const rm = typeof state !== 'undefined' ? state.rushMode : 'onigakari';
      const sc = typeof state !== 'undefined' ? state.activeScene : 'normal';
      stageNamePill.classList.toggle('hidden', !(ph === 'NORMAL' && sc === 'normal'));

      const cx = w * 0.5, cy = h * 0.48;
      ctx.clearRect(0, 0, w, h);

      if (ph === 'RUSH' || (ph === 'ANIMATING' && sc === 'rush-idle')) {
        if (rm === 'onigakari') {
          const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.75);
          bg.addColorStop(0, `rgba(185, 28, 28, ${0.42 + pulse * 0.25})`);
          bg.addColorStop(0.55, 'rgba(69, 10, 10, 0.72)');
          bg.addColorStop(1, 'rgba(20, 5, 8, 0.95)');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
          rays.forEach((r, idx) => {
            if (!frozen) { r.r += r.spd * (1 + pulse * 0.9); if (r.r > 1.25) { r.r = 0.05; r.a = Math.random() * Math.PI * 2; } }
            const maxD = Math.max(w, h) * 0.75, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
            ctx.strokeStyle = idx % 3 === 0 ? '#fde047' : '#fb7185';
            ctx.globalAlpha = Math.min(0.85, r.r * 0.85); ctx.lineWidth = idx % 3 === 0 ? 2.2 : 1.3;
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
          });
          ctx.globalAlpha = 1;
          drawMagicCircle(cx, cy, 115 + pulse * 14, '#facc15', angle * 1.8, 0.24 + pulse * 0.16);
        } else if (rm === 'brain') {
          // 脳が震えるRUSH：毒紫×マゼンタ狂気オーラ＋高速放射歪み＋見えざる手
          const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.76);
          bg.addColorStop(0, `rgba(192, 38, 211, ${0.44 + pulse * 0.30})`);
          bg.addColorStop(0.48, `rgba(88, 28, 135, ${0.72 + pulse * 0.15})`);
          bg.addColorStop(1, 'rgba(14, 3, 24, 0.98)');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

          // 狂気の紫放射ライン
          rays.forEach((r, idx) => {
            if (!frozen) { r.r += r.spd * (1.2 + pulse); if (r.r > 1.2) { r.r = 0.08; r.a = Math.random() * Math.PI * 2; } }
            const maxD = Math.max(w, h) * 0.78, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
            ctx.strokeStyle = idx % 3 === 0 ? '#f0abfc' : idx % 3 === 1 ? '#e11d48' : '#a855f7';
            ctx.globalAlpha = Math.min(0.75, r.r * 0.75); ctx.lineWidth = idx % 2 === 0 ? 2.0 : 1.2;
            ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
          });
          ctx.globalAlpha = 1;
          drawUnseenTendrils(angle * 4, pulse);
        } else if (rm === 'rem') {
          const bg = ctx.createRadialGradient(cx, cy * 0.72, 12, cx, cy, Math.max(w, h) * 0.78);
          bg.addColorStop(0, `rgba(56, 189, 248, ${0.30 + pulse * 0.14})`);
          bg.addColorStop(0.55, 'rgba(12, 54, 92, 0.72)');
          bg.addColorStop(1, 'rgba(4, 14, 28, 0.96)');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
          flakes.forEach(f => {
            if (!frozen) { f.y += f.vy; f.x += f.vx; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); } }
            ctx.fillStyle = '#bae6fd'; ctx.globalAlpha = 0.55;
            ctx.beginPath(); ctx.arc(f.x * w, f.y * h, f.s, 0, Math.PI * 2); ctx.fill();
          });
          ctx.globalAlpha = 1;
        } else {
          const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.78);
          bg.addColorStop(0, `rgba(153, 27, 27, ${0.30 + pulse * 0.18})`);
          bg.addColorStop(0.65, 'rgba(28, 10, 16, 0.88)');
          bg.addColorStop(1, 'rgba(8, 4, 8, 0.97)');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
          drawMagicCircle(cx, cy, 112 + pulse * 12, '#fb7185', angle * 1.15, 0.18 + pulse * 0.14);
        }
      } else {
        const spins = typeof state !== 'undefined' ? state.currentSpin : 0;
        const stg = NORMAL_STAGES[Math.floor(spins / 30) % NORMAL_STAGES.length];
        if (stageNamePill.textContent !== stg.name) stageNamePill.textContent = stg.name;
        const bg = ctx.createRadialGradient(cx, cy * 0.85, 16, cx, cy, Math.max(w, h) * 0.8);
        bg.addColorStop(0, stg.c1); bg.addColorStop(0.65, stg.c2); bg.addColorStop(1, '#0d0407');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 145 + pulse * 35);
        aura.addColorStop(0, stg.glow); aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
        drawMagicCircle(cx, cy, 122 + pulse * 8, stg.accent, angle * 0.75, 0.22 + pulse * 0.12);
      }
      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 60);
    requestAnimationFrame(loop);
  })();

  // -----------------------------------------------------------------------
  // 5. 画像加工エンジン（レム・ボタン外側白透過 ＆ ペテ6コマ切り出し＋端溶かし）
  // -----------------------------------------------------------------------
  let remLampTransparentUrl = null;
  let botanTransparentUrl = null;
  let peteFrames = []; // 0:デフォルト, 1:Lv1, 2:Lv2, 3:Lv3, 4:Lv4, 5:Lv5
  let remTestOverride = false;
  let brainTestOverride = false;

  function applyOuterWhiteRemoval(c, w, h, thresh = 235) {
    const imgData = c.getImageData(0, 0, w, h);
    const d = imgData.data, visited = new Uint8Array(w * h);
    const isWhiteBg = (idx) => {
      const p = idx * 4, r = d[p], g = d[p + 1], b = d[p + 2];
      return r > thresh && g > thresh && b > thresh && Math.max(r, g, b) - Math.min(r, g, b) < 24;
    };
    const queue = [];
    for (let x = 0; x < w; x++) { queue.push(x); queue.push((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { queue.push(y * w); queue.push(y * w + (w - 1)); }
    let head = 0;
    while (head < queue.length) {
      const idx = queue[head++];
      if (visited[idx]) continue; visited[idx] = 1;
      if (!isWhiteBg(idx)) continue;
      d[idx * 4 + 3] = 0;
      const x = idx % w, y = (idx - x) / w;
      if (x > 0 && !visited[idx - 1]) queue.push(idx - 1);
      if (x < w - 1 && !visited[idx + 1]) queue.push(idx + 1);
      if (y > 0 && !visited[idx - w]) queue.push(idx - w);
      if (y < h - 1 && !visited[idx + w]) queue.push(idx + w);
    }
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x, p = idx * 4;
        if (d[p + 3] > 0) {
          const hasTrans = d[(idx - 1) * 4 + 3] === 0 || d[(idx + 1) * 4 + 3] === 0 || d[(idx - w) * 4 + 3] === 0 || d[(idx + w) * 4 + 3] === 0;
          if (hasTrans && d[p] > 210 && d[p + 1] > 210 && d[p + 2] > 210) d[p + 3] = 85;
        }
      }
    }
    c.putImageData(imgData, 0, 0);
  }

  function removeOuterWhiteBackground(img, maxDim = 900) {
    try {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, w, h);
      applyOuterWhiteRemoval(c, w, h, 234);
      return cv.toDataURL('image/png');
    } catch (e) { return img.src; }
  }

  // ペテルギウス6コマ画像を正確な縦横比で6分割切り出し
  // 0:デフォルト(左上), 1:Lv1(中上), 2:Lv2(右上), 3:Lv3(左下), 4:Lv4(中下), 5:Lv5(右下)
  function slicePeteInto6Frames(img) {
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cw = W / 3, ch = H / 2;
      const mx = Math.round(cw * 0.036);
      const my = Math.round(ch * 0.042);
      const sw = Math.max(10, Math.round(cw - mx * 2));
      const sh = Math.max(10, Math.round(ch - my * 2));
      const frames = [];

      for (let idx = 0; idx < 6; idx++) {
        const col = idx % 3, row = Math.floor(idx / 3);
        const sx = Math.round(col * cw + mx);
        const sy = Math.round(row * ch + my);
        const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
        const c = cv.getContext('2d');
        c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        // コマ0〜3（デフォルト・Lv1〜3）は外側の白背景を透過
        if (idx <= 3) applyOuterWhiteRemoval(c, sw, sh, 232);

        // 下端と四隅を柔らかく溶かすマスク（背景＆手前ボタンと完全に溶け合う）
        c.save();
        c.globalCompositeOperation = 'destination-in';
        const rad = Math.max(sw, sh) * 0.62;
        const g = c.createRadialGradient(sw * 0.5, sh * 0.44, rad * 0.52, sw * 0.5, sh * 0.46, rad);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.82, 'rgba(0,0,0,0.98)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, sw, sh);
        c.restore();

        frames.push(cv.toDataURL('image/png'));
      }
      return frames;
    } catch (e) { return []; }
  }

  // -----------------------------------------------------------------------
  // 6. DOM構築：レム役物 ＆ 脳が震えるRUSH 4層サンドイッチステージ
  // -----------------------------------------------------------------------
  let remLampStage = document.getElementById('remLampStage');
  if (!remLampStage) {
    remLampStage = document.createElement('div');
    remLampStage.id = 'remLampStage'; remLampStage.className = 'hidden'; remLampStage.style.display = 'none';
    const imgEl = document.createElement('img');
    imgEl.id = 'remLampImg'; imgEl.alt = 'レムランプ'; imgEl.className = 'rem-img-idle';
    remLampStage.appendChild(imgEl);
    lcdFrame.insertBefore(remLampStage, stageBgCanvas.nextSibling);
  }
  const remLampImg = document.getElementById('remLampImg');

  // 脳が震えるRUSH 4層ステージ
  const brainStage = document.createElement('div');
  brainStage.id = 'brainImmersiveStage';
  brainStage.className = 'hidden';
  brainStage.style.display = 'none';
  brainStage.innerHTML = `
    <div id="brainTopHud">
      <span class="text-[9px] font-black tracking-widest text-fuchsia-300">脳が震えるRUSH</span>
      <span class="text-[10px] font-bold text-amber-200">残 <strong id="brainTopRemainNum" class="text-sm font-black gold-grad-text">144</strong> 回</span>
    </div>
    <div id="brainPeteWrap">
      <img id="brainPeteImg0" class="brain-pete-img" alt="ペテルギウスA">
      <img id="brainPeteImg1" class="brain-pete-img" alt="ペテルギウスB">
      <div id="brainAtmosphereVeil"></div>
    </div>
    <div id="brainButtonWrap">
      <div id="brainButtonRing"></div>
      <img id="brainButtonImg" alt="ボタン">
    </div>
    <div id="brainTextSwarm"></div>
    <div id="brainEvoFlash"></div>
  `;
  lcdFrame.insertBefore(brainStage, remLampStage.nextSibling);

  const brainTopRemainNum = document.getElementById('brainTopRemainNum');
  const brainPeteImgs = [document.getElementById('brainPeteImg0'), document.getElementById('brainPeteImg1')];
  const brainButtonImg = document.getElementById('brainButtonImg');
  const brainButtonRing = document.getElementById('brainButtonRing');
  const brainTextSwarm = document.getElementById('brainTextSwarm');
  const brainEvoFlash = document.getElementById('brainEvoFlash');
  let brainPeteSlot = 0;

  // ボタンの振動・発光状態を制御（'idle' | 'weak' | 'mid' | 'max'）
  function setBrainButtonState(level = 'idle') {
    brainButtonImg.className = '';
    brainButtonRing.className = '';
    void brainButtonImg.offsetWidth;
    if (level === 'weak') {
      brainButtonImg.classList.add('btn-vibe-weak');
      brainButtonRing.classList.add('btn-ring-active');
    } else if (level === 'mid') {
      brainButtonImg.classList.add('btn-vibe-mid');
      brainButtonRing.classList.add('btn-ring-active');
    } else if (level === 'max') {
      brainButtonImg.classList.add('btn-vibe-max');
      brainButtonRing.classList.add('btn-ring-rainbow');
    }
  }

  // 進化フラッシュ（貼り替え感を消す0.2秒の紫稲妻衝撃）
  function fireBrainEvoFlash() {
    brainEvoFlash.classList.remove('flash-fire');
    void brainEvoFlash.offsetWidth;
    brainEvoFlash.classList.add('flash-fire');
  }

  // ペテルギウス表示（0:デフォルト待機, 1〜5:Lv1〜5）
  function setBrainPeteLevel(lv = 0, { withFlash = false } = {}) {
    if (!peteFrames || peteFrames.length < 6) return;
    const idx = Math.max(0, Math.min(5, lv));
    const prev = brainPeteImgs[brainPeteSlot];
    const nextSlot = 1 - brainPeteSlot;
    const next = brainPeteImgs[nextSlot];

    if (withFlash) fireBrainEvoFlash();

    next.src = peteFrames[idx];
    next.className = 'brain-pete-img';
    if (idx >= 4) next.classList.add('pete-cover'); // Lv4・Lv5は画面いっぱいに大迫力カバー！
    void next.offsetWidth;

    prev.classList.remove('pete-shown', 'pete-breath', 'pete-punch');
    next.classList.add('pete-shown');
    next.classList.add(idx === 0 ? 'pete-breath' : 'pete-punch');
    brainPeteSlot = nextSlot;
  }

  // 禍々しい「脳が」文字の大量乱舞（Lv1〜5で画面を埋め尽くす／プレミア時は金「ボタンが」）
  function setBrainTextSwarm(lv = 0, { isGoldButtonGa = false, customWord = null } = {}) {
    brainTextSwarm.innerHTML = '';
    if (lv <= 0 && !customWord) return;

    const word = customWord || (isGoldButtonGa ? 'ボタンが' : '脳が');
    const cls = isGoldButtonGa ? 'noga-word noga-gold' : (lv >= 4 ? 'noga-word noga-hot' : 'noga-word');

    // 本家スクショの配置をベースに、Lvが上がるほどサイズ・個数・狂気度が爆発するプリセット
    const layouts = {
      1: [
        { x: '4%',  y: '34%', sz: 28, rot: '-16deg', sc: 1.0 },
        { x: '70%', y: '44%', sz: 26, rot: '14deg',  sc: 0.95 }
      ],
      2: [
        { x: '3%',  y: '30%', sz: 34, rot: '-18deg', sc: 1.0 },
        { x: '68%', y: '52%', sz: 38, rot: '16deg',  sc: 1.05 },
        { x: '8%',  y: '62%', sz: 24, rot: '-10deg', sc: 0.95 }
      ],
      3: [
        { x: '4%',  y: '24%', sz: 54, rot: '-14deg', sc: 1.05 },
        { x: '66%', y: '28%', sz: 38, rot: '18deg',  sc: 1.0 },
        { x: '64%', y: '60%', sz: 42, rot: '-12deg', sc: 1.0 },
        { x: '4%',  y: '64%', sz: 32, rot: '12deg',  sc: 0.95 }
      ],
      4: [
        { x: '2%',  y: '20%', sz: 56, rot: '-18deg', sc: 1.08 },
        { x: '62%', y: '22%', sz: 48, rot: '16deg',  sc: 1.05 },
        { x: '2%',  y: '54%', sz: 46, rot: '12deg',  sc: 1.05 },
        { x: '64%', y: '56%', sz: 54, rot: '-16deg', sc: 1.08 },
        { x: '28%', y: '18%', sz: 32, rot: '8deg',   sc: 0.95 },
        { x: '74%', y: '40%', sz: 30, rot: '-22deg', sc: 0.95 }
      ],
      5: [
        { x: '1%',  y: '16%', sz: 62, rot: '-18deg', sc: 1.12 },
        { x: '58%', y: '16%', sz: 60, rot: '16deg',  sc: 1.12 },
        { x: '1%',  y: '46%', sz: 56, rot: '14deg',  sc: 1.08 },
        { x: '62%', y: '48%', sz: 58, rot: '-15deg', sc: 1.10 },
        { x: '4%',  y: '70%', sz: 44, rot: '-10deg', sc: 1.02 },
        { x: '68%', y: '70%', sz: 46, rot: '12deg',  sc: 1.04 },
        { x: '26%', y: '26%', sz: 34, rot: '10deg',  sc: 0.96 }
      ]
    };

    const items = layouts[Math.min(5, Math.max(1, lv))] || layouts[3];
    items.forEach((it, idx) => {
      const el = document.createElement('div');
      el.className = cls;
      el.textContent = word;
      el.style.left = it.x;
      el.style.top = it.y;
      el.style.fontSize = `${it.sz}px`;
      el.style.setProperty('--rot', it.rot);
      el.style.setProperty('--sc', it.sc);
      el.style.animationDelay = `${idx * 0.025}s, ${0.18 + idx * 0.025}s`;
      brainTextSwarm.appendChild(el);
    });
  }

  function showBrainImmersive(on) {
    const rushIdleEl = document.getElementById('scene-rush-idle');
    if (on) {
      brainStage.classList.remove('hidden');
      brainStage.style.display = 'block';
      if (rushIdleEl) rushIdleEl.classList.add('brain-immersive');
      if (brainTopRemainNum && typeof state !== 'undefined') {
        brainTopRemainNum.textContent = state.stRemaining;
      }
      // まだ何も出ていなければデフォルト待機ペテ（コマ0）を表示
      const anyShown = brainPeteImgs.some(im => im.classList.contains('pete-shown'));
      if (!anyShown && peteFrames.length >= 6) {
        setBrainPeteLevel(0, { withFlash: false });
      }
    } else {
      brainStage.classList.add('hidden');
      brainStage.style.display = 'none';
      if (rushIdleEl) rushIdleEl.classList.remove('brain-immersive');
      setBrainTextSwarm(0);
      setBrainButtonState('idle');
      brainPeteImgs.forEach(im => im.classList.remove('pete-shown', 'pete-breath', 'pete-punch'));
    }
  }

  function setRemLampVisual(mode) {
    const rushIdleEl = document.getElementById('scene-rush-idle');
    if (!remLampTransparentUrl || !mode || mode === 'hidden') {
      remLampStage.classList.add('hidden'); remLampStage.style.display = 'none';
      if (rushIdleEl) rushIdleEl.classList.remove('actor-layout-clear');
      return;
    }
    remLampStage.classList.remove('hidden'); remLampStage.style.display = 'flex';
    if (rushIdleEl) rushIdleEl.classList.add('actor-layout-clear');
    remLampImg.className = ''; void remLampImg.offsetWidth;
    if (mode === 'idle') remLampImg.className = 'rem-img-idle';
    else if (mode === 'lit') remLampImg.className = 'rem-img-lit';
    else if (mode === 'slow') remLampImg.className = 'rem-img-slow';
    else if (mode === 'rainbow') remLampImg.className = 'rem-img-rainbow';
    else if (mode === 'strobe') remLampImg.className = 'rem-img-strobe';
  }

  function syncActorsVisibility() {
    const isRushIdle = typeof state !== 'undefined' && state.activeScene === 'rush-idle';
    const showRem = remTestOverride || (isRushIdle && state.phase === 'RUSH' && state.rushMode === 'rem');
    const showBrain = brainTestOverride || (isRushIdle && state.rushMode === 'brain' && (state.phase === 'RUSH' || state.phase === 'ANIMATING'));

    if (showRem) {
      if (remLampStage.style.display === 'none' || remLampStage.classList.contains('hidden')) setRemLampVisual('idle');
    } else {
      setRemLampVisual('hidden');
    }

    showBrainImmersive(showBrain);
  }

  // 全3アセットのプリロード＆自動加工
  (function preloadAssets() {
    const remCandidates = ['rem_lamp.jpg', 'rem_lamp.png', '1795190676369.jpg'];
    let ri = 0;
    function tryRem() {
      if (ri >= remCandidates.length) return;
      const src = remCandidates[ri++];
      const img = new Image();
      img.onload = () => { remLampTransparentUrl = removeOuterWhiteBackground(img); remLampImg.src = remLampTransparentUrl; syncActorsVisibility(); };
      img.onerror = tryRem; img.src = src;
    }
    tryRem();

    const peteCandidates = ['pete.jpg', 'pete.png', 'image_69618d.jpg'];
    let pi = 0;
    function tryPete() {
      if (pi >= peteCandidates.length) return;
      const src = peteCandidates[pi++];
      const img = new Image();
      img.onload = () => { peteFrames = slicePeteInto6Frames(img); syncActorsVisibility(); };
      img.onerror = tryPete; img.src = src;
    }
    tryPete();

    const botanCandidates = ['botan.jpg', 'botan.png', 'image_d97bd3.jpg'];
    let bi = 0;
    function tryBotan() {
      if (bi >= botanCandidates.length) return;
      const src = botanCandidates[bi++];
      const img = new Image();
      img.onload = () => { botanTransparentUrl = removeOuterWhiteBackground(img, 600); brainButtonImg.src = botanTransparentUrl; };
      img.onerror = tryBotan; img.src = src;
    }
    tryBotan();
  })();

  // -----------------------------------------------------------------------
  // 7. 開発用「♾️ 無限ST」＆「ゼロかRUSH／脳が震えるRUSHガセ煽り」
  // -----------------------------------------------------------------------
  let infiniteRushMode = false;

  if (typeof window.spinRushOnce === 'function') {
    const _origSpinRushOnce = window.spinRushOnce;
    window.spinRushOnce = function () {
      const ev = _origSpinRushOnce();
      if (infiniteRushMode) {
        if (state.stRemaining < SPEC.ST_TOTAL) state.stRemaining = SPEC.ST_TOTAL;
        if (ev && ev.type === 'ST_END') return { type: 'MISS', teaser: null };
      }
      if (ev && ev.type === 'MISS' && !ev.teaser && !state.rushCustNoNotice) {
        if (state.rushMode === 'zero') {
          const r = Math.random();
          if (r < 0.015) ev.teaser = 'ZERO_QUOTE_GAZE';
          else if (r < 0.030) ev.teaser = 'ZERO_HOLD_GAZE';
          else if (r < 0.045) ev.teaser = 'ZERO_BLINK_GAZE';
        } else if (state.rushMode === 'brain') {
          // 脳が震えるRUSHの通常ペテ→いきなりLv1〜4ガセ頻度を増強
          if (Math.random() < 0.024) ev.teaser = 'BRAIN_NOGA_GAZE';
        }
      }
      return ev;
    };
  }

  const ZERO_QUOTES = [
    '「死に戻りなんて、もうごめんだ」',
    '「僕の言っていることがわかるか!?」',
    '「ゼロから――いいえ、ここから始めましょう！」',
    '「鬼がかってますね」'
  ];

  if (typeof window.playRushTeaserAndResume === 'function') {
    const _origPlayTeaser = window.playRushTeaserAndResume;
    window.playRushTeaserAndResume = async function (teaser, resumeAuto = false) {
      if (teaser && teaser.startsWith('ZERO_')) {
        const tok = ++seqToken;
        state.phase = 'ANIMATING'; setControlMode('BUSY');
        try {
          if (teaser === 'ZERO_QUOTE_GAZE') {
            const q = ZERO_QUOTES[Math.floor(Math.random() * ZERO_QUOTES.length)];
            rushTopBadge.classList.remove('hidden');
            rushTopBadge.textContent = `💬 ${q}`;
            rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/85 border border-slate-400 text-slate-100 shadow-lg';
            await wait(620, tok);
            rushTopBadge.classList.add('hidden');
          } else if (teaser === 'ZERO_HOLD_GAZE') {
            const maxStg = Math.random() < 0.5 ? 1 : 2;
            rushTopBadge.classList.remove('hidden');
            for (let stg = 1; stg <= maxStg; stg++) {
              rushTopBadge.textContent = `🔒 図柄HOLD [ ${stg}/3 ]`;
              rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-xs font-black bg-rose-950/90 border border-rose-400 text-rose-200 shadow-lg';
              FxCanvas.spawnRing('#fb7185', 140 + stg * 30, 4);
              await wait(260, tok);
            }
            rushTopBadge.classList.add('hidden');
          } else if (teaser === 'ZERO_BLINK_GAZE') {
            updateReserveSlots('NORMAL', 'BLINK');
            rushIdleSub.textContent = '✨ 点滅保留出現!!';
            await wait(520, tok);
            updateReserveSlots('NORMAL', null);
          }
          state.phase = 'RUSH'; clearIwakanEffects(); applyRushModeVisuals(); setControlMode('RUSH'); updateStatsUI();
          if (resumeAuto) startRushAutoLoop();
        } catch (e) {}
        return;
      }
      return await _origPlayTeaser(teaser, resumeAuto);
    };
  }

  // -----------------------------------------------------------------------
  // 8. ★脳が震えるRUSH：本家4層フル再現（通常ペテ常駐 → いきなりLv1〜5一発進化＋ボタン激震）★
  // -----------------------------------------------------------------------
  window.playBrainModeSequence = async function ({ isHit, is6000, bonusType, isHands = false, custOchiburu = true, forceTargetLv = null, token }) {
    showBrainImmersive(true);
    const isShakeReserve = isHit && Math.random() < 0.16;

    // 目標レベル決定（1〜5）
    let targetLv;
    if (forceTargetLv !== null) {
      targetLv = forceTargetLv;
    } else if (isHit) {
      if (is6000) targetLv = Math.random() < 0.68 ? 5 : 4;
      else targetLv = Math.random() < 0.40 ? 5 : Math.random() < 0.78 ? 4 : 3;
    } else {
      const r = Math.random();
      targetLv = r < 0.36 ? 1 : r < 0.68 ? 2 : r < 0.90 ? 3 : 4;
    }

    // 実機準拠：通常ペテからいきなり目標Lvへ直行、またはLv1から目標へ1回だけ跳ぶ（2段階進化なし）
    const doJumpFrom1 = (targetLv >= 3) && (Math.random() < 0.45);
    const isButtonGa = (isHit && is6000 && Math.random() < 0.45);

    updateReserveSlots('BRAIN', isHands ? 'HANDS' : isShakeReserve ? 'HIT' : 'NOGA');
    if (isHands) FxCanvas.spawnPurpleHands(30);

    if (doJumpFrom1) {
      setBrainPeteLevel(1, { withFlash: true });
      setBrainTextSwarm(1, { isGoldButtonGa: false });
      setBrainButtonState('weak');
      StudioAudio.playSoftHeartbeat();
      await wait(440, token);
    }

    // ★目標Lv（1〜5）へドォン！と一発進化＆「脳が」文字乱舞＆ボタン振動★
    setBrainPeteLevel(targetLv, { withFlash: true });
    setBrainTextSwarm(targetLv, { isGoldButtonGa: isButtonGa });
    setBrainButtonState(targetLv >= 4 ? 'mid' : 'weak');
    FxCanvas.spawnLightning(isButtonGa ? '#fde047' : '#e879f9', targetLv >= 4 ? 5 : 2);

    if (targetLv >= 3) {
      lcdFrame.classList.add('shake-weak');
      StudioAudio.playSoftHeartbeat();
    }
    await wait(targetLv >= 4 ? 660 : 520, token);
    lcdFrame.classList.remove('shake-weak');

    // ハズレなら通常ペテ（コマ0）へスッと戻る
    if (!isHit) {
      setBrainTextSwarm(0);
      setBrainButtonState('idle');
      setBrainPeteLevel(0, { withFlash: false });
      updateReserveSlots('BRAIN', null);
      return { triggeredOchiburu: false, note: '' };
    }

    // ★当選フィニッシュ：震える・弱／中／強（手前の巨大ボタンが激震爆発!!）★
    updateReserveSlots('BRAIN', 'HIT');
    let triggeredOchiburu = false;
    let note = isButtonGa ? '💥「ボタンが」震える' : (targetLv === 5 ? '🧠 脳が煽りLv5' : '');

    if (is6000 && Math.random() < (custOchiburu ? 0.60 : 0.30)) {
      triggeredOchiburu = true;
      note = note || '🧠 脳が震える・強';
      setBrainPeteLevel(5, { withFlash: true });
      setBrainTextSwarm(5, { isGoldButtonGa: true, customWord: '脳が震える!!' });
      setBrainButtonState('max');
      StudioAudio.playOchiburu(true);
      lcdFrame.classList.add('shake-intense', 'fx-rainbow');
      setAmbientBg('rainbow'); setSunburst(true);
      triggerLamp('rainbow', '6,000!!');
      FxCanvas.spawnLightning('#fde047', 6);
      FxCanvas.burstRainbow(55);
      await wait(1450, token);
      lcdFrame.classList.remove('shake-intense');
    } else if (bonusType === 'BONUS_1500' || is6000) {
      note = note || '🧠 脳が震える・中';
      if (targetLv < 4) setBrainPeteLevel(4, { withFlash: true });
      setBrainTextSwarm(4, { isGoldButtonGa: false, customWord: '脳が震える!' });
      setBrainButtonState('mid');
      lcdFrame.classList.add('shake-mid', 'fx-gold');
      try { if (navigator && navigator.vibrate) navigator.vibrate([70, 30, 70, 30, 120]); } catch (e) {}
      StudioAudio.playSoftHeartbeat();
      FxCanvas.spawnRing('#e879f9', 280, 8);
      await wait(620, token);
      lcdFrame.classList.remove('shake-mid');
    } else {
      note = note || '🧠 脳が震える・弱';
      setBrainTextSwarm(3, { isGoldButtonGa: false, customWord: '脳が震える…' });
      setBrainButtonState('weak');
      lcdFrame.classList.add('shake-weak');
      try { if (navigator && navigator.vibrate) navigator.vibrate([45, 35, 65]); } catch (e) {}
      await wait(520, token);
      lcdFrame.classList.remove('shake-weak');
    }

    setBrainTextSwarm(0);
    setBrainButtonState('idle');
    showBrainImmersive(false);
    return { triggeredOchiburu, note };
  };

  // -----------------------------------------------------------------------
  // 9. ゼロかRUSH当選演出
  // -----------------------------------------------------------------------
  async function playZeroModeHit({ is6000, token }) {
    const roll = Math.random();
    let note = '';

    if (roll < 0.20) {
      note = '🍎 カドモン予告';
      rushTopBadge.classList.remove('hidden');
      rushTopBadge.textContent = '🍎 カドモン予告!!';
      rushTopBadge.className = 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-rose-950 border border-amber-300 text-amber-200 shadow-lg pop-in';
      StudioAudio.playKyuin(); FxCanvas.burstGold(36);
      await wait(680, token);
      rushTopBadge.classList.add('hidden');
    } else if (roll < 0.40) {
      note = '⏱ 轟転タイマー';
      rushTopBadge.classList.remove('hidden');
      for (let sec = 3; sec >= 0; sec--) {
        rushTopBadge.textContent = `⏱ 轟転タイマー [ ${sec} ]`;
        rushTopBadge.className = sec === 0
          ? 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in'
          : 'mb-1 px-3.5 py-0.5 rounded-full text-xs font-black bg-amber-950/95 border border-rose-400 text-amber-200 shadow-lg';
        StudioAudio.playSoftHeartbeat();
        await wait(240, token);
      }
      StudioAudio.playKyuin();
      rushTopBadge.classList.add('hidden');
    } else if (roll < 0.65) {
      note = '🔒 図柄ホールド';
      rushTopBadge.classList.remove('hidden');
      for (let stg = 1; stg <= 3; stg++) {
        rushTopBadge.textContent = `🔒 図柄HOLD [ ${stg}/3 ]`;
        rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-xs font-black bg-rose-950/95 border border-amber-400 text-amber-200 shadow-lg';
        FxCanvas.spawnRing('#fb7185', 160 + stg * 35, 5);
        await wait(240, token);
      }
      StudioAudio.playKyuin();
      rushTopBadge.classList.add('hidden');
    } else {
      const iconPool = is6000 ? ['🍏', '⚔️', '📱', '鬼'] : ['鬼', '🍏', '⚔️'];
      const icon = iconPool[Math.floor(Math.random() * iconPool.length)];
      note = icon === '鬼' ? '🔥 赤保留' : `${icon} 特殊保留`;
      updateReserveSlots('NORMAL', is6000 ? 'BLINK_RED' : 'RED');
      resSlots[0].textContent = icon;
      const q = ZERO_QUOTES[Math.floor(Math.random() * ZERO_QUOTES.length)];
      rushTopBadge.classList.remove('hidden');
      rushTopBadge.textContent = `💬 ${q}`;
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/90 border border-amber-300 text-amber-200 shadow-lg pop-in';
      StudioAudio.playKyuin(); FxCanvas.burstFlames(28);
      await wait(640, token);
      rushTopBadge.classList.add('hidden');
    }
    return note;
  }

  // -----------------------------------------------------------------------
  // 10. 既存関数フック（残り回数同期・残留完全防止・暗転フェードイン進化）
  // -----------------------------------------------------------------------
  let lastBlackoutAt = 0;
  const _origSetGlobalBlackout = window.setGlobalBlackout;
  if (typeof _origSetGlobalBlackout === 'function') {
    window.setGlobalBlackout = function (on) {
      if (on) lastBlackoutAt = Date.now();
      return _origSetGlobalBlackout(on);
    };
  }

  const _origClearGlobalChaos = window.clearGlobalChaosEffects;
  if (typeof _origClearGlobalChaos === 'function') {
    window.clearGlobalChaosEffects = function () {
      SoftSparkle.forceClear();
      return _origClearGlobalChaos();
    };
  }

  const _origUpdateStatsUI = window.updateStatsUI;
  if (typeof _origUpdateStatsUI === 'function') {
    window.updateStatsUI = function () {
      _origUpdateStatsUI();
      if (brainTopRemainNum && typeof state !== 'undefined') {
        brainTopRemainNum.textContent = state.stRemaining;
      }
    };
  }

  const _origSetActiveScene = window.setActiveScene;
  window.setActiveScene = function (sceneName) {
    _origSetActiveScene(sceneName);
    if (sceneName !== 'rush-idle') { setRemLampVisual('hidden'); showBrainImmersive(false); }
    syncActorsVisibility();
    if (sceneName === 'normal') { BeatEngine.setStyle('normal'); BeatEngine.resume(); }
    else if (sceneName === 'rush-idle' && state.phase === 'RUSH') { BeatEngine.setStyle(state.rushMode || 'onigakari'); BeatEngine.resume(); }
    else if (sceneName === 'bonus') { BeatEngine.cut(); }
  };

  const _origApplyRushModeVisuals = window.applyRushModeVisuals;
  window.applyRushModeVisuals = function () {
    _origApplyRushModeVisuals();
    syncActorsVisibility();
    if (state.phase === 'RUSH') { BeatEngine.setStyle(state.rushMode || 'onigakari'); BeatEngine.resume(); }
  };

  const _origClearVisualEffects = window.clearVisualEffects;
  window.clearVisualEffects = function () {
    _origClearVisualEffects();
    syncActorsVisibility();
  };

  const _origShowFs = window.showFullscreenOverlay;
  window.showFullscreenOverlay = function (opts) {
    setRemLampVisual('hidden'); showBrainImmersive(false);
    return _origShowFs(opts);
  };

  const _origHideFs = window.hideFullscreenOverlay;
  window.hideFullscreenOverlay = function () {
    _origHideFs();
    syncActorsVisibility();
  };

  ['playPuchun', 'play1500Jackpot', 'play3000Jackpot', 'play6000Fanfare', 'playOchiburu', 'playReStart'].forEach(fnName => {
    if (typeof StudioAudio !== 'undefined' && typeof StudioAudio[fnName] === 'function') {
      const orig = StudioAudio[fnName];
      StudioAudio[fnName] = function (...args) { BeatEngine.cut(); return orig.apply(this, args); };
    }
  });

  if (typeof window.playIwakanEffect === 'function') {
    const _origIwakan = window.playIwakanEffect;
    window.playIwakanEffect = async function (opts) {
      if (Math.random() < 0.45) BeatEngine.cut();
      return await _origIwakan(opts);
    };
  }

  if (typeof window.handleRushHitSequence === 'function') {
    const _origHandleRushHit = window.handleRushHitSequence;
    window.handleRushHitSequence = async function (bonusType) {
      if (state.rushMode === 'zero' && bonusType !== 'RESTART' && Math.random() < 0.75) {
        const tok = ++seqToken;
        const is6000 = bonusType === 'BONUS_6000';
        state.phase = 'ANIMATING';
        state.pendingRushHit = { type: bonusType, okRevealed: false };
        setControlMode('BUSY'); updateStatsUI();
        try {
          const zNote = await playZeroModeHit({ is6000, token: tok });
          if (zNote) state.rushIwakanNotes.push(zNote);
          state.pendingRushHit = null;
          if (is6000) await runRush6000Sequence({ forceFake: null, iwakanAnswer: zNote });
          else await runNormalRushBonusSequence(bonusType, zNote);
          return;
        } catch (e) {
          state.pendingRushHit = null; clearGlobalChaosEffects();
          return;
        }
      }
      return await _origHandleRushHit(bonusType);
    };
  }

  window.playRemNoticePattern = async function ({ is6000, forcePat = null, token }) {
    let pat = forcePat || 'NORMAL';
    if (!forcePat && is6000 && Math.random() < 0.75) {
      const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
      pat = p6[Math.floor(Math.random() * p6.length)];
    }

    BeatEngine.cut();
    let note = '';
    if (pat === 'SLOW_GLOW') {
      note = '💙 レム徐々に点灯';
      oniLamp.classList.remove('lamp-rem', 'lamp-rainbow', 'lamp-red'); oniLamp.classList.add('lamp-rem-slow');
      lampStatusText.textContent = 'じわ〜っ…'; setLed('rem'); setRemLampVisual('slow');
      await wait(1150, token);
      StudioAudio.playPokyun(true); triggerLamp('rainbow', '6,000!!');
      setRemLampVisual('rainbow'); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(58);
      await wait(750, token);
    } else if (pat === 'DOUBLE_BLINK') {
      note = '💙 レム再点灯';
      oniLamp.classList.add('lamp-rem'); lampStatusText.textContent = 'ピッ…'; setRemLampVisual('lit');
      await wait(180, token);
      oniLamp.classList.remove('lamp-rem'); lampStatusText.textContent = '……'; setLed('off'); setRemLampVisual('idle');
      await wait(550, token);
      setRemLampVisual('rainbow'); triggerLamp('rainbow', '再点灯!!'); StudioAudio.playPokyun(true);
      setAmbientBg('rainbow'); setSunburst(true); FxCanvas.spawnLightning('#38bdf8', 5); FxCanvas.burstRainbow(58);
      await wait(780, token);
    } else if (pat === 'CLASSIC_FLASH') {
      note = '💙 旧レム閃光';
      setRemLampVisual('strobe'); oniLamp.classList.add('lamp-rem-classic'); lampStatusText.textContent = '閃光!!';
      setLed('rainbow'); StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true);
      FxCanvas.spawnRing('#38bdf8', 320, 9); FxCanvas.spawnLightning('#e0f2fe', 6);
      await wait(950, token);
      oniLamp.classList.remove('lamp-rem-classic'); setRemLampVisual('rainbow');
    } else {
      setRemLampVisual('lit'); triggerLamp('rem', '点灯!!'); StudioAudio.playPokyun(false);
      FxCanvas.spawnRing('#38bdf8', 260, 8);
      await wait(750, token);
    }
    return note;
  };

  window.playOnigakariImageCutin = async function ({
    caption = '鬼がかってますね', dur = 3600, withPokyun = true, fromBlackout = false, sparklePreStarted = false, token
  }) {
    const isFromDark = fromBlackout || (Date.now() - lastBlackoutAt < 4500);
    BeatEngine.cut(); setRemLampVisual('hidden'); showBrainImmersive(false);

    try {
      if (isFromDark && !sparklePreStarted) {
        globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
        globalCutinOverlay.innerHTML = ''; globalCutinOverlay.classList.remove('hidden');
        SoftSparkle.start();
        await waitFreeze(680, token);
      } else if (isFromDark) {
        SoftSparkle.start();
      }

      if (onigakariImageSrc) {
        globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
        globalCutinOverlay.innerHTML = `
          <div class="w-full max-w-lg flex flex-col items-center gap-3">
            <div id="cutinFrameBox" class="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-amber-200/20 bg-black transition-all duration-1000 ${isFromDark ? 'cutin-gentle-fade' : ''}">
              <img src="${onigakariImageSrc}" alt="鬼がかってますね" class="w-full h-full object-cover ${isFromDark ? '' : 'cutin-img-zoom'}">
            </div>
            <div id="cutinCapText" class="font-mincho text-2xl sm:text-3xl font-black rainbow-grad-text tracking-widest drop-shadow transition-opacity duration-1000 ${isFromDark ? 'opacity-0' : 'opacity-100 pop-in'}">${caption}</div>
          </div>
        `;
      } else {
        globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
        globalCutinOverlay.innerHTML = `
          <div class="w-full max-w-lg rounded-3xl overlay-rainbow border-4 cutin-rainbow-border p-8 text-center shadow-2xl cutin-gentle-fade">
            <div class="font-mincho text-4xl sm:text-5xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] tracking-wider leading-tight">${caption}</div>
          </div>
        `;
      }
      globalCutinOverlay.classList.remove('hidden');

      if (isFromDark) {
        await waitFreeze(1550, token);
        const box = document.getElementById('cutinFrameBox');
        const cap = document.getElementById('cutinCapText');
        if (box) box.classList.add('border-4', 'cutin-rainbow-border');
        if (cap) cap.classList.replace('opacity-0', 'opacity-100');
        if (withPokyun) StudioAudio.playPokyun(true);
        setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
        await waitFreeze(Math.max(1800, dur - 1550), token);
      } else {
        if (withPokyun) StudioAudio.playPokyun(true);
        fireGlobalRainbowFlash(); setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
        await waitFreeze(dur, token);
      }
    } finally {
      SoftSparkle.stop();
      hideGlobalCutin();
    }
  };

  window.runSudden3sFreeze6000 = async function (token) {
    try {
      BeatEngine.cut(); setRemLampVisual('hidden'); showBrainImmersive(false);
      StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
      setLed('off'); setAmbientBg(''); setSunburst(false);

      setGlobalBlackout(true);
      await waitFreeze(2300, token);
      SoftSparkle.start();
      await waitFreeze(700, token);

      await playOnigakariImageCutin({
        caption: '鬼がかってますね', dur: 3700, withPokyun: true,
        fromBlackout: true, sparklePreStarted: true, token
      });
      setGlobalBlackout(false);

      StudioAudio.playSlash(); StudioAudio.playOchiburu(false); fireShatterFly();
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({
        mode: 'rainbow', sub: '鬼がかってますね', main: '超・鬼がかり 6,000 BONUS!!',
        extra: '払出 6,000個（実質純増 5,600発）獲得!!', scanlines: false
      });
      StudioAudio.play6000Fanfare(false); triggerLamp('rainbow', '6,000!!');
      lcdFrame.classList.add('fx-rainbow'); setLed('rainbow');
      await wait(2300, token);
    } finally {
      SoftSparkle.forceClear(); clearGlobalChaosEffects(); hideFullscreenOverlay();
    }
  };

  // -----------------------------------------------------------------------
  // 11. テストメニュー拡張（開発用即RUSH・無限ST・レム点灯・脳が震える4層テスト）
  // -----------------------------------------------------------------------
  const testGrid = document.querySelector('#promoTestMenu .grid');
  if (testGrid && !document.getElementById('btnDevInstantRush')) {
    const instantRushBtn = document.createElement('button');
    instantRushBtn.id = 'btnDevInstantRush';
    instantRushBtn.className = 'py-2 px-2 rounded-xl font-black bg-gradient-to-r from-emerald-700 to-teal-700 border border-emerald-300/80 text-white active:scale-95 transition';
    instantRushBtn.textContent = '🚀 即RUSH突入（開発）';
    testGrid.insertBefore(instantRushBtn, testGrid.firstChild);

    instantRushBtn.addEventListener('click', () => {
      document.getElementById('promoTestMenu').classList.add('hidden');
      stopAuto(); seqToken++; hideFullscreenOverlay(); resultModal.classList.add('hidden');
      document.getElementById('tabPlay').click();
      enterOnigakariRush(state.currentSpin || 1, false);
    });

    const infBtn = document.createElement('button');
    infBtn.id = 'btnDevInfRush';
    infBtn.className = 'py-2 px-2 rounded-xl font-black bg-slate-900 border border-emerald-500/60 text-emerald-300 active:scale-95 transition';
    infBtn.textContent = '♾️ 無限ST: OFF';
    testGrid.insertBefore(infBtn, instantRushBtn.nextSibling);

    infBtn.addEventListener('click', () => {
      infiniteRushMode = !infiniteRushMode;
      infBtn.textContent = `♾️ 無限ST: ${infiniteRushMode ? 'ON' : 'OFF'}`;
      infBtn.className = infiniteRushMode
        ? 'py-2 px-2 rounded-xl font-black bg-emerald-600 border border-yellow-200 text-white shadow active:scale-95 transition'
        : 'py-2 px-2 rounded-xl font-black bg-slate-900 border border-emerald-500/60 text-emerald-300 active:scale-95 transition';
      if (infiniteRushMode && state.phase === 'RUSH') { state.stRemaining = SPEC.ST_TOTAL; updateStatsUI(); }
    });

    let remTestIdx = 0;
    const pats = ['NORMAL', 'SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
    const remBtn = document.createElement('button');
    remBtn.id = 'btnTestRemLamp';
    remBtn.className = 'py-2 px-2 rounded-xl font-black bg-gradient-to-r from-sky-800 via-blue-800 to-indigo-900 border border-sky-300/80 text-sky-100 active:scale-95 transition';
    remBtn.textContent = '💙 鬼化レム点灯（4種）';
    testGrid.appendChild(remBtn);

    remBtn.addEventListener('click', async () => {
      if (state.phase === 'ANIMATING' || state.phase === 'REACH') return;
      document.getElementById('promoTestMenu').classList.add('hidden');
      stopAuto(); document.getElementById('tabPlay').click();

      const prevPhase = state.phase, prevScene = state.activeScene, tok = ++seqToken;
      state.phase = 'ANIMATING'; setControlMode('BUSY'); remTestOverride = true;

      try {
        clearVisualEffects(); setActiveScene('rush-idle'); lcdFrame.classList.add('mode-rem-bg');
        setAmbientBg('rem'); setLed('rem'); setRemLampVisual('idle');
        await wait(650, tok);
        const pat = pats[remTestIdx++ % pats.length];
        await playRemNoticePattern({ is6000: pat !== 'NORMAL', forcePat: pat, token: tok });
        await wait(850, tok);
      } catch (e) {
      } finally {
        remTestOverride = false; setRemLampVisual('hidden');
        state.phase = prevPhase; clearVisualEffects(); setActiveScene(prevScene);
        if (prevPhase === 'RUSH') { applyRushModeVisuals(); setControlMode('RUSH'); }
        else { FxCanvas.setAmbient('ember'); setControlMode('NORMAL'); BeatEngine.setStyle('normal'); BeatEngine.resume(); }
      }
    });

    // 脳が震えるRUSH：本家4層フルテスト（通常ペテ → Lv3/4/5一発進化 → ボタン激震!!）
    let brainTestLvCycle = 0;
    const brainTestBtn = document.createElement('button');
    brainTestBtn.id = 'btnTestPete6';
    brainTestBtn.className = 'col-span-2 py-2 px-2 rounded-xl font-black bg-gradient-to-r from-purple-800 via-fuchsia-800 to-rose-900 border border-fuchsia-300/80 text-fuchsia-100 active:scale-95 transition';
    brainTestBtn.textContent = '🧠 脳が震える4層テスト（通常→Lv直撃＆ボタン激震）';
    testGrid.appendChild(brainTestBtn);

    brainTestBtn.addEventListener('click', async () => {
      if (state.phase === 'ANIMATING' || state.phase === 'REACH') return;
      document.getElementById('promoTestMenu').classList.add('hidden');
      stopAuto(); document.getElementById('tabPlay').click();

      const prevPhase = state.phase, prevScene = state.activeScene, prevRMode = state.rushMode;
      const tok = ++seqToken;
      state.phase = 'ANIMATING'; state.rushMode = 'brain'; setControlMode('BUSY');
      brainTestOverride = true;

      try {
        clearVisualEffects(); setActiveScene('rush-idle'); lcdFrame.classList.add('mode-brain-bg');
        setAmbientBg('brain'); setLed('brain');
        showBrainImmersive(true);
        setBrainPeteLevel(0, { withFlash: false });
        setBrainTextSwarm(0); setBrainButtonState('idle');
        await wait(850, tok); // 通常ペテ待機を見せる

        const targetLvs = [5, 4, 3];
        const pickLv = targetLvs[brainTestLvCycle++ % targetLvs.length];
        await playBrainModeSequence({
          isHit: true, is6000: true, bonusType: 'BONUS_6000',
          isHands: pickLv === 5, custOchiburu: true, forceTargetLv: pickLv, token: tok
        });
      } catch (e) {
      } finally {
        brainTestOverride = false;
        showBrainImmersive(false);
        state.rushMode = prevRMode; state.phase = prevPhase;
        clearVisualEffects(); setActiveScene(prevScene);
        if (prevPhase === 'RUSH') { applyRushModeVisuals(); setControlMode('RUSH'); }
        else { FxCanvas.setAmbient('ember'); setControlMode('NORMAL'); BeatEngine.setStyle('normal'); BeatEngine.resume(); }
      }
    });
  }

  syncActorsVisibility();
})();
