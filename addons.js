// =========================================================================
// addons.js (v4完成版) :
//  1. 暗転のまま「先行サラサラキラキラ → 鬼がかってますね緩やかフェードイン」
//  2. ペテルギウス6コマ正確Canvas切り出し＋フチ溶かし＋2レイヤー滑らかクロスフェード
//  3. 脳が震えるRUSH：実機準拠（直行 or Lv1→目標の1発ジャンプ・連続進化なし／仕草／震える保留／隠し先バイブ）
//  4. ゼロかRUSH：本家演出（名言・図柄ホールド・専用保留・轟転タイマー・カドモン）＋ガセ煽り
//  5. 鬼化レムランプ役物（残留バグ解消・同時ポキュ↑ーン↓）＆モード別ビート＆動的ステージ背景＆無限ST
// =========================================================================
(function initAddonsV4Final() {
  // -----------------------------------------------------------------------
  // 1. 追加CSS注入
  // -----------------------------------------------------------------------
  if (!document.getElementById('addons-v4-css')) {
    const st = document.createElement('style');
    st.id = 'addons-v4-css';
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

      /* ペテルギウス6コマ 2レイヤー滑らかクロスフェードステージ */
      #peteStage {
        position: absolute; inset: 0; z-index: 6; pointer-events: none;
        display: flex; align-items: center; justify-content: center;
        overflow: hidden; padding: 26px 12px 30px 12px;
      }
      #peteStage.hidden { display: none !important; }
      #peteCrossHost {
        position: relative;
        width: 240px; height: 210px;
        max-width: 92%; max-height: 92%;
        display: flex; align-items: center; justify-content: center;
        transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), filter 0.26s ease;
      }
      #peteCrossHost.pete-hot {
        transform: scale(1.12);
        filter: drop-shadow(0 0 22px rgba(250, 204, 21, 0.88)) drop-shadow(0 0 42px rgba(239, 68, 68, 0.78));
      }
      .pete-layer-img {
        position: absolute;
        inset: 0;
        width: 100%; height: 100%;
        object-fit: contain;
        opacity: 0;
        transform: scale(0.92);
        transition: opacity 0.28s cubic-bezier(0.37, 0, 0.63, 1), transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), filter 0.28s ease;
        will-change: opacity, transform;
      }
      .pete-layer-img.pete-active {
        opacity: 1;
        transform: scale(1.0);
      }
      .pete-layer-img.pete-exit {
        opacity: 0;
        transform: scale(1.08);
      }

      /* レム・ペテルギウス出現時：文字を左下へ退避して顔と一切被らせない */
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

      /* 暗転のまま「鬼がかってますね」緩やかフェードイン（約2.3秒S字カーブ） */
      @keyframes slowGentleFadeIn {
        0%   { opacity: 0; transform: scale(0.975); filter: brightness(0.55); }
        45%  { opacity: 0.42; transform: scale(0.992); filter: brightness(0.86); }
        100% { opacity: 1; transform: scale(1.025); filter: brightness(1.04); }
      }
      .cutin-gentle-fade {
        animation: slowGentleFadeIn 2.35s cubic-bezier(0.37, 0, 0.63, 1) forwards;
      }

      /* サラサラキラキラ専用レイヤー（ブラックアウトの上にうっすら浮く） */
      #softSparkleCanvas {
        position: fixed; inset: 0; width: 100%; height: 100%;
        z-index: 1002; pointer-events: none;
        opacity: 0;
        transition: opacity 0.9s ease-in-out;
      }
      #softSparkleCanvas.sparkle-on { opacity: 1; }
    `;
    document.head.appendChild(st);
  }

  // -----------------------------------------------------------------------
  // 2. 先行「サラサラキラキラ」専用Canvas（ギラギラせず上品に漂う光粒）
  // -----------------------------------------------------------------------
  const SoftSparkle = (() => {
    const cv = document.createElement('canvas');
    cv.id = 'softSparkleCanvas';
    document.body.appendChild(cv);
    const ctx = cv.getContext('2d');
    let w = window.innerWidth, h = window.innerHeight;
    let running = false, rafId = null;
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
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.22,
          vy: -(0.14 + Math.random() * 0.34),
          r: 0.7 + Math.random() * 1.7,
          phase: Math.random() * Math.PI * 2,
          twinkleSpd: 0.025 + Math.random() * 0.045,
          isStar: Math.random() < 0.22,
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
        m.y += m.vy;
        m.phase += m.twinkleSpd;
        if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
        if (m.x < -12) m.x = w + 12;
        if (m.x > w + 12) m.x = -12;

        const alpha = 0.18 + Math.max(0, Math.sin(m.phase)) * 0.68;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = m.color;
        ctx.shadowBlur = m.r * 5.5;
        ctx.shadowColor = m.color;

        if (m.isStar) {
          // 繊細な極細4点クロス光
          const len = m.r * 3.4;
          ctx.translate(m.x, m.y);
          ctx.strokeStyle = m.color;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.moveTo(-len, 0); ctx.lineTo(len, 0);
          ctx.moveTo(0, -len); ctx.lineTo(0, len);
          ctx.stroke();
          ctx.beginPath(); ctx.arc(0, 0, m.r * 0.65, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      rafId = requestAnimationFrame(draw);
    }

    window.addEventListener('resize', resize);
    resize();

    return {
      start() {
        resize();
        if (!running) {
          initMotes();
          running = true;
          cv.classList.add('sparkle-on');
          draw();
        } else {
          cv.classList.add('sparkle-on');
        }
      },
      stop() {
        cv.classList.remove('sparkle-on');
        setTimeout(() => {
          if (!cv.classList.contains('sparkle-on')) {
            running = false;
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
            ctx.clearRect(0, 0, w, h);
          }
        }, 950);
      },
      forceClear() {
        cv.classList.remove('sparkle-on');
        running = false;
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        ctx.clearRect(0, 0, w, h);
      }
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
      o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.03);
      pulseLevel = 1.0;
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
      o.type = type; o.frequency.setValueAtTime(freq, t);
      lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 2.5;
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
      resume() {
        cutFlag = false;
        if (!enabled || globalMuted) return;
        ensureCtx(); syncStyle();
      },
      setStyle(style) {
        if (currentStyle !== style) { currentStyle = style; step = 0; }
        if (!cutFlag) syncStyle();
      },
      toggle() {
        enabled = !enabled;
        if (enabled) { cutFlag = false; ensureCtx(); syncStyle(); } else this.cut();
        return enabled;
      },
      setGlobalMute(m) {
        globalMuted = m;
        if (m) this.cut();
        else if (enabled && typeof state !== 'undefined' && (state.phase === 'NORMAL' || state.phase === 'RUSH')) this.resume();
      },
      isCut: () => cutFlag || !enabled || globalMuted,
      consumePulse() {
        const v = pulseLevel; pulseLevel *= 0.84;
        if (pulseLevel < 0.01) pulseLevel = 0;
        return v;
      }
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
  // 4. 動的ステージ背景Canvas（通常4ステージ＋RUSH4モード＋ビート脈動）
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
          const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.75);
          bg.addColorStop(0, `rgba(126, 34, 206, ${0.48 + pulse * 0.26})`);
          bg.addColorStop(0.6, 'rgba(46, 16, 101, 0.78)');
          bg.addColorStop(1, 'rgba(10, 4, 20, 0.96)');
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
          drawMagicCircle(cx, cy, 128 + pulse * 18, '#e879f9', -angle * 1.5, 0.30 + pulse * 0.20);
          drawMagicCircle(cx, cy, 86 + pulse * 10, '#f43f5e', angle * 2.2, 0.24);
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
          // ゼロかRUSH：多彩なキャラ・名言演出が映える紅蓮×黄金ステージ
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
  // 5. 画像加工エンジン（外側の白背景透過＆ペテルギウス6コマ正確Canvas切り出し＋フチ溶かし）
  // -----------------------------------------------------------------------
  let remLampTransparentUrl = null;
  let remTestOverride = false;
  let peteFrames = []; // 6枚の個別PNG DataURL
  let peteVisible = false;
  let peteActiveSlot = 0;

  function applyOuterWhiteRemoval(c, w, h) {
    const imgData = c.getImageData(0, 0, w, h);
    const d = imgData.data, visited = new Uint8Array(w * h);
    const isWhiteBg = (idx) => {
      const p = idx * 4, r = d[p], g = d[p + 1], b = d[p + 2];
      return r > 234 && g > 234 && b > 234 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
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
          if (hasTrans && d[p] > 212 && d[p + 1] > 212 && d[p + 2] > 212) d[p + 3] = 90;
        }
      }
    }
    c.putImageData(imgData, 0, 0);
  }

  function removeOuterWhiteBackground(img) {
    try {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d'); c.drawImage(img, 0, 0, w, h);
      applyOuterWhiteRemoval(c, w, h);
      return cv.toDataURL('image/png');
    } catch (e) { return img.src; }
  }

  // ペテルギウス6コマ画像を正確な縦横比で6分割切り出し（仕切り線除去＋フチ溶かしビネット）
  function slicePeteInto6Frames(img) {
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cw = W / 3, ch = H / 2;
      const mx = Math.round(cw * 0.038); // 白い仕切り線を確実にカット
      const my = Math.round(ch * 0.045);
      const sw = Math.max(10, Math.round(cw - mx * 2));
      const sh = Math.max(10, Math.round(ch - my * 2));
      const frames = [];

      for (let idx = 0; idx < 6; idx++) {
        const col = idx % 3, row = Math.floor(idx / 3);
        const sx = Math.round(col * cw + mx);
        const sy = Math.round(row * ch + my);
        const cv = document.createElement('canvas');
        cv.width = sw; cv.height = sh;
        const c = cv.getContext('2d');
        c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        // 上段3コマ(0,1,2)と左下コマ(3)は白背景を自動透過（中下4・右下5は歯/白目を守るためそのまま）
        if (idx <= 3) {
          applyOuterWhiteRemoval(c, sw, sh);
        }

        // 四隅を柔らかく溶かす放射ビネットマスク（紫背景に自然に溶け込む）
        c.save();
        c.globalCompositeOperation = 'destination-in';
        const rad = Math.max(sw, sh) * 0.56;
        const g = c.createRadialGradient(sw * 0.5, sh * 0.48, rad * 0.56, sw * 0.5, sh * 0.48, rad);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.80, 'rgba(0,0,0,0.96)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, sw, sh);
        c.restore();

        frames.push(cv.toDataURL('image/png'));
      }
      return frames;
    } catch (e) {
      return [];
    }
  }

  // DOM構築：レム役物＆ペテルギウス2レイヤークロスフェード役物
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

  const peteStage = document.createElement('div');
  peteStage.id = 'peteStage'; peteStage.className = 'hidden'; peteStage.style.display = 'none';
  peteStage.innerHTML = `
    <div id="peteCrossHost">
      <img id="peteLayer0" class="pete-layer-img" alt="ペテルギウスA">
      <img id="peteLayer1" class="pete-layer-img" alt="ペテルギウスB">
    </div>
  `;
  lcdFrame.insertBefore(peteStage, remLampStage.nextSibling);
  const peteCrossHost = document.getElementById('peteCrossHost');
  const peteLayers = [document.getElementById('peteLayer0'), document.getElementById('peteLayer1')];

  function updateActorLayoutClear() {
    const rushIdleEl = document.getElementById('scene-rush-idle');
    if (!rushIdleEl) return;
    const remShown = remLampStage.style.display !== 'none' && !remLampStage.classList.contains('hidden');
    rushIdleEl.classList.toggle('actor-layout-clear', remShown || peteVisible);
  }

  // ★2レイヤー滑らかクロスフェード表示★
  function showPeteFrame(frameIdx = 0, { hot = false } = {}) {
    if (!peteFrames || peteFrames.length < 6) {
      hidePeteFrame();
      return;
    }
    const idx = Math.max(0, Math.min(5, frameIdx));
    peteVisible = true;
    peteStage.classList.remove('hidden');
    peteStage.style.display = 'flex';
    peteCrossHost.classList.toggle('pete-hot', hot);
    updateActorLayoutClear();

    const prevSlot = peteActiveSlot;
    const nextSlot = 1 - peteActiveSlot;
    const prevImg = peteLayers[prevSlot];
    const nextImg = peteLayers[nextSlot];

    nextImg.src = peteFrames[idx];
    nextImg.classList.remove('pete-active', 'pete-exit');
    void nextImg.offsetWidth;

    prevImg.classList.remove('pete-active');
    prevImg.classList.add('pete-exit');
    nextImg.classList.add('pete-active');
    peteActiveSlot = nextSlot;
  }

  function hidePeteFrame() {
    peteVisible = false;
    peteStage.classList.add('hidden');
    peteStage.style.display = 'none';
    peteCrossHost.classList.remove('pete-hot');
    peteLayers.forEach(im => im.classList.remove('pete-active', 'pete-exit'));
    updateActorLayoutClear();
  }

  function setRemLampVisual(mode) {
    if (!remLampTransparentUrl || !mode || mode === 'hidden') {
      remLampStage.classList.add('hidden'); remLampStage.style.display = 'none';
      updateActorLayoutClear();
      return;
    }
    remLampStage.classList.remove('hidden'); remLampStage.style.display = 'flex';
    remLampImg.className = ''; void remLampImg.offsetWidth;
    if (mode === 'idle') remLampImg.className = 'rem-img-idle';
    else if (mode === 'lit') remLampImg.className = 'rem-img-lit';
    else if (mode === 'slow') remLampImg.className = 'rem-img-slow';
    else if (mode === 'rainbow') remLampImg.className = 'rem-img-rainbow';
    else if (mode === 'strobe') remLampImg.className = 'rem-img-strobe';
    updateActorLayoutClear();
  }

  function syncRemLampVisibility() {
    const shouldShow = remTestOverride || (
      typeof state !== 'undefined' && state.phase === 'RUSH' && state.rushMode === 'rem' && state.activeScene === 'rush-idle'
    );
    if (shouldShow) {
      if (remLampStage.style.display === 'none' || remLampStage.classList.contains('hidden')) setRemLampVisual('idle');
    } else {
      setRemLampVisual('hidden');
    }
    if (!(typeof state !== 'undefined' && state.phase === 'ANIMATING' && state.rushMode === 'brain')) {
      hidePeteFrame();
    }
    updateActorLayoutClear();
  }

  (function preloadAssets() {
    const remCandidates = ['rem_lamp.jpg', 'rem_lamp.png', '1795190676369.jpg'];
    let ri = 0;
    function tryRem() {
      if (ri >= remCandidates.length) return;
      const src = remCandidates[ri++];
      const img = new Image();
      img.onload = () => { remLampTransparentUrl = removeOuterWhiteBackground(img); remLampImg.src = remLampTransparentUrl; syncRemLampVisibility(); };
      img.onerror = tryRem; img.src = src;
    }
    tryRem();

    const peteCandidates = ['pete.jpg', 'pete.png', 'image_69618d.jpg'];
    let pi = 0;
    function tryPete() {
      if (pi >= peteCandidates.length) return;
      const src = peteCandidates[pi++];
      const img = new Image();
      img.onload = () => { peteFrames = slicePeteInto6Frames(img); };
      img.onerror = tryPete; img.src = src;
    }
    tryPete();
  })();

  // -----------------------------------------------------------------------
  // 6. 開発用「♾️ 無限ST」＆「ゼロかRUSHガセ煽り」＆「隠し先バイブ」
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
      // ゼロかRUSHのハズレ時にもガセ煽りを混ぜて当たりバレを防ぐ
      if (ev && ev.type === 'MISS' && !ev.teaser && state.rushMode === 'zero' && !state.rushCustNoNotice) {
        const r = Math.random();
        if (r < 0.015) ev.teaser = 'ZERO_QUOTE_GAZE';
        else if (r < 0.030) ev.teaser = 'ZERO_HOLD_GAZE';
        else if (r < 0.045) ev.teaser = 'ZERO_BLINK_GAZE';
      }
      return ev;
    };
  }

  // ゼロかRUSHのガセ煽り再生フック
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
        state.phase = 'ANIMATING';
        setControlMode('BUSY');
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

          state.phase = 'RUSH';
          clearIwakanEffects();
          applyRushModeVisuals();
          setControlMode('RUSH');
          updateStatsUI();
          if (resumeAuto) startRushAutoLoop();
        } catch (e) {}
        return;
      }
      return await _origPlayTeaser(teaser, resumeAuto);
    };
  }

  // 脳が震えるRUSH煽り中の「OK（裏）」押下で隠し先バイブ発動
  btnSecretOk.addEventListener('click', () => {
    if (state.pendingRushHit && state.pendingRushHit.type !== 'RESTART' && !state.pendingRushHit.hiddenVibeRevealed) {
      if (Math.random() < 0.55) {
        state.pendingRushHit.hiddenVibeRevealed = true;
        try { if (navigator && navigator.vibrate) navigator.vibrate([120, 40, 120, 40, 220]); } catch (e) {}
        StudioAudio.playSoftHeartbeat();
        lcdFrame.classList.add('shake-mid');
        setTimeout(() => lcdFrame.classList.remove('shake-mid'), 450);
        rushTopBadge.classList.remove('hidden');
        rushTopBadge.textContent = '💓 隠し先バイブ発生!!';
        rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-300 text-fuchsia-200 shadow-lg pop-in';
      }
    }
  });

  // -----------------------------------------------------------------------
  // 7. ★脳が震えるRUSH：実機準拠（直行 or Lv1→目標の1発ジャンプ・連続進化なし）★
  // -----------------------------------------------------------------------
  function levelToPeteFrame(lv) {
    if (lv <= 2) return 0; // 左上：ニヤリ
    if (lv === 3) return 1; // 中上：絶叫
    if (lv === 4) return 2; // 右上：髪を引っ張る
    return 3;               // 左下：狂気笑い（Lv5）
  }

  window.playBrainModeSequence = async function ({ isHit, is6000, bonusType, isHands = false, custOchiburu = true, token }) {
    const idleSub = document.getElementById('rushIdleSub');
    const isShakeReserve = isHit && Math.random() < 0.16;

    // 目標レベル決定（1〜5）
    let targetLv;
    if (isHit) {
      if (is6000) targetLv = Math.random() < 0.65 ? 5 : 4;
      else targetLv = Math.random() < 0.42 ? 5 : Math.random() < 0.78 ? 4 : 3;
    } else {
      const r = Math.random();
      targetLv = r < 0.45 ? 1 : r < 0.72 ? 2 : r < 0.90 ? 3 : 4; // ハズレでも稀にLv4ガセあり
    }

    const useGesture = Math.random() < (isHit ? 0.45 : 0.30);
    const gesture = isHit
      ? (is6000 ? (Math.random() < 0.55 ? '叩く!!' : '愛でる!!') : (Math.random() < 0.55 ? '愛でる!!' : '驚く!'))
      : (Math.random() < 0.5 ? '疑問' : Math.random() < 0.8 ? '質問' : '驚く!');

    // ★実機準拠：連続進化はなし！「いきなり目標レベル」or「Lv1 → 目標レベル」の1回ジャンプのみ★
    const doJumpFrom1 = (targetLv >= 3) && (Math.random() < 0.48);

    updateReserveSlots('BRAIN', isHands ? 'HANDS' : isShakeReserve ? 'HIT' : 'NOGA');
    if (isHands) FxCanvas.spawnPurpleHands(26);
    rushTopBadge.classList.remove('hidden');

    if (doJumpFrom1) {
      // まずLv1（コマ0）を表示
      showPeteFrame(0, { hot: false });
      rushTopBadge.textContent = isHands ? '🖐️ 見えざる手 Lv.1' : '🧠 脳が… Lv.1';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-400 text-fuchsia-200 shadow-lg';
      if (idleSub) idleSub.textContent = isHands ? '🖐️ 見えざる手が迫る…' : '🧠 脳が…';
      StudioAudio.playSoftHeartbeat();
      await wait(360, token);
    }

    // 目標レベル（または仕草／「ボタンが」震える）へ直行・1発ジャンプ！
    const isButtonGa = (isHit && is6000 && Math.random() < 0.42);
    const targetFrame = useGesture
      ? (gesture.includes('叩く') ? 4 : gesture.includes('愛でる') ? 3 : gesture.includes('驚く') ? 2 : gesture.includes('質問') ? 1 : 0)
      : levelToPeteFrame(targetLv);
    const isHot = isButtonGa || targetLv >= 4 || (useGesture && (gesture.includes('叩く') || gesture.includes('愛でる')));

    showPeteFrame(targetFrame, { hot: isHot });

    if (isButtonGa) {
      rushTopBadge.textContent = '💥「ボタンが」震える!!';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-amber-950/95 border border-yellow-200 text-yellow-200 shadow-lg pop-in';
    } else if (useGesture) {
      rushTopBadge.textContent = `🎭 仕草「${gesture}」`;
      rushTopBadge.className = isHot
        ? 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-950/95 border border-amber-300 text-amber-200 shadow-lg pop-in'
        : 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-400 text-fuchsia-200 shadow-lg';
    } else {
      rushTopBadge.textContent = isHands ? `🖐️ 見えざる手 Lv.${targetLv}` : `🧠 脳が… Lv.${targetLv}`;
      rushTopBadge.className = isHot
        ? 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-rose-950/95 border border-amber-300 text-amber-200 shadow-lg pop-in'
        : 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-400 text-fuchsia-200 shadow-lg';
    }

    if (idleSub) {
      idleSub.textContent = isShakeReserve ? '💥「震える」保留!!' : isHands ? '🖐️ 見えざる手が迫る…' : '🧠 脳が…脳が…';
    }
    if (targetLv >= 3 || isHot) {
      lcdFrame.classList.add('shake-weak');
      StudioAudio.playSoftHeartbeat();
    }
    await wait(520, token);
    lcdFrame.classList.remove('shake-weak');

    if (!isHit) {
      rushTopBadge.classList.add('hidden');
      hidePeteFrame();
      updateReserveSlots('BRAIN', null);
      return { triggeredOchiburu: false, note: '' };
    }

    // 当選フィニッシュ（中下コマ4 or 右下超ドアップコマ5へ滑らかクロスフェード）
    updateReserveSlots('BRAIN', 'HIT');
    let triggeredOchiburu = false;
    let note = useGesture ? `🎭 仕草(${gesture})` : (isButtonGa ? '💥「ボタンが」震える' : '');

    if (is6000 && Math.random() < (custOchiburu ? 0.58 : 0.28)) {
      triggeredOchiburu = true;
      note = note || '🧠 脳が震える・強';
      showPeteFrame(5, { hot: true }); // 右下：画面いっぱい狂気ドアップ！
      rushTopBadge.textContent = '💥 脳が震える!!';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in';
      StudioAudio.playOchiburu(true);
      lcdFrame.classList.add('shake-intense', 'fx-rainbow');
      setAmbientBg('rainbow'); setSunburst(true);
      triggerLamp('rainbow', '6,000!!');
      FxCanvas.spawnLightning('#fde047', 5);
      await wait(1400, token);
      lcdFrame.classList.remove('shake-intense');
    } else if (bonusType === 'BONUS_1500' || is6000) {
      note = note || '🧠 脳が震える・中';
      showPeteFrame(4, { hot: true }); // 中下：のけぞり歯剥き出し！
      rushTopBadge.textContent = '🧠 脳が震える!!';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-fuchsia-950/95 border border-amber-300 text-amber-200 shadow-lg pop-in';
      lcdFrame.classList.add('shake-mid', 'fx-gold');
      try { if (navigator && navigator.vibrate) navigator.vibrate([70, 30, 70, 30, 120]); } catch (e) {}
      StudioAudio.playSoftHeartbeat();
      FxCanvas.spawnRing('#e879f9', 260, 7);
      await wait(560, token);
      lcdFrame.classList.remove('shake-mid');
    } else {
      note = note || '🧠 脳が震える…';
      showPeteFrame(3, { hot: false });
      rushTopBadge.textContent = '🧠 脳が震える…';
      rushTopBadge.className = 'mb-1 px-3 py-0.5 rounded-full text-[11px] font-black bg-purple-950/95 border border-fuchsia-300 text-fuchsia-100 shadow-lg pop-in';
      lcdFrame.classList.add('shake-weak');
      try { if (navigator && navigator.vibrate) navigator.vibrate([45, 35, 65]); } catch (e) {}
      await wait(460, token);
      lcdFrame.classList.remove('shake-weak');
    }

    rushTopBadge.classList.add('hidden');
    hidePeteFrame();
    return { triggeredOchiburu, note };
  };

  // -----------------------------------------------------------------------
  // 8. ゼロかRUSH当選演出（カドモン・轟転タイマー・図柄ホールド・名言＆専用保留）
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
  // 9. 既存関数フック（ビート・レム/ペテ残留防止・暗転フェードイン進化）
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

  const _origSetActiveScene = window.setActiveScene;
  window.setActiveScene = function (sceneName) {
    _origSetActiveScene(sceneName);
    if (sceneName !== 'rush-idle') { setRemLampVisual('hidden'); hidePeteFrame(); }
    syncRemLampVisibility();
    if (sceneName === 'normal') { BeatEngine.setStyle('normal'); BeatEngine.resume(); }
    else if (sceneName === 'rush-idle' && state.phase === 'RUSH') { BeatEngine.setStyle(state.rushMode || 'onigakari'); BeatEngine.resume(); }
    else if (sceneName === 'bonus') { BeatEngine.cut(); }
  };

  const _origApplyRushModeVisuals = window.applyRushModeVisuals;
  window.applyRushModeVisuals = function () {
    _origApplyRushModeVisuals();
    syncRemLampVisibility();
    if (state.phase === 'RUSH') { BeatEngine.setStyle(state.rushMode || 'onigakari'); BeatEngine.resume(); }
  };

  const _origClearVisualEffects = window.clearVisualEffects;
  window.clearVisualEffects = function () {
    _origClearVisualEffects();
    hidePeteFrame();
    syncRemLampVisibility();
  };

  const _origShowFs = window.showFullscreenOverlay;
  window.showFullscreenOverlay = function (opts) {
    setRemLampVisual('hidden'); hidePeteFrame();
    return _origShowFs(opts);
  };

  const _origHideFs = window.hideFullscreenOverlay;
  window.hideFullscreenOverlay = function () {
    _origHideFs();
    syncRemLampVisibility();
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
        setControlMode('BUSY');
        updateStatsUI();
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

  // ★暗転のまま：先行サラサラキラキラ → 緩やかフェードイン（約2.35秒）→ 虹枠＆虹ポキュ↑ーン↓★
  window.playOnigakariImageCutin = async function ({
    caption = '鬼がかってますね', dur = 3600, withPokyun = true, fromBlackout = false, sparklePreStarted = false, token
  }) {
    const isFromDark = fromBlackout || (Date.now() - lastBlackoutAt < 4500);
    BeatEngine.cut(); setRemLampVisual('hidden'); hidePeteFrame();

    try {
      if (isFromDark && !sparklePreStarted) {
        // 先行してサラサラキラキラだけ漆黒の中にフェードイン
        globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
        globalCutinOverlay.innerHTML = '';
        globalCutinOverlay.classList.remove('hidden');
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
        // 画像が緩やかに浮かび上がってきたタイミングで虹オーラ＆ポキュ↑ーン↓を解放
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
      BeatEngine.cut(); setRemLampVisual('hidden'); hidePeteFrame();
      StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
      setLed('off'); setAmbientBg(''); setSunburst(false);

      // 3秒暗転：2.3秒完全無音ブラックアウト → 残り0.7秒からサラサラキラキラ先行フェードイン！
      setGlobalBlackout(true);
      await waitFreeze(2300, token);
      SoftSparkle.start();
      await waitFreeze(700, token);

      // 暗転のまま緩やかに「鬼がかってますね」フェードイン
      await playOnigakariImageCutin({
        caption: '鬼がかってますね',
        dur: 3700,
        withPokyun: true,
        fromBlackout: true,
        sparklePreStarted: true,
        token
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
      SoftSparkle.forceClear();
      clearGlobalChaosEffects(); hideFullscreenOverlay();
    }
  };

  // -----------------------------------------------------------------------
  // 10. テストメニュー拡張（開発用：即RUSH・無限ST・レム点灯・ペテ滑らか切替テスト）
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

    // ペテルギウス滑らか切替テスト（1→5ジャンプ → 脳が震える・強）
    const peteTestBtn = document.createElement('button');
    peteTestBtn.id = 'btnTestPete6';
    peteTestBtn.className = 'col-span-2 py-2 px-2 rounded-xl font-black bg-gradient-to-r from-purple-800 via-fuchsia-800 to-rose-900 border border-fuchsia-300/80 text-fuchsia-100 active:scale-95 transition';
    peteTestBtn.textContent = '🧠 ペテルギウス 1→5ジャンプ＆強テスト';
    testGrid.appendChild(peteTestBtn);

    peteTestBtn.addEventListener('click', async () => {
      if (state.phase === 'ANIMATING' || state.phase === 'REACH') return;
      document.getElementById('promoTestMenu').classList.add('hidden');
      stopAuto(); document.getElementById('tabPlay').click();

      const prevPhase = state.phase, prevScene = state.activeScene, tok = ++seqToken;
      state.phase = 'ANIMATING'; setControlMode('BUSY');

      try {
        clearVisualEffects(); setActiveScene('rush-idle'); lcdFrame.classList.add('mode-brain-bg');
        setAmbientBg('brain'); setLed('brain');
        rushTopBadge.classList.remove('hidden');

        // Lv1 → Lv5 1発ジャンプ → 脳が震える・強（超ドアップ）
        showPeteFrame(0, { hot: false });
        rushTopBadge.textContent = '🧠 脳が… Lv.1';
        StudioAudio.playSoftHeartbeat();
        await wait(520, tok);

        showPeteFrame(3, { hot: true });
        rushTopBadge.textContent = '🧠 脳が… Lv.5!!';
        StudioAudio.playSoftHeartbeat();
        await wait(620, tok);

        showPeteFrame(5, { hot: true });
        rushTopBadge.textContent = '💥 脳が震える!!';
        StudioAudio.playOchiburu(true);
        lcdFrame.classList.add('shake-intense', 'fx-rainbow');
        setAmbientBg('rainbow'); setSunburst(true);
        await wait(1400, tok);
        lcdFrame.classList.remove('shake-intense');
        rushTopBadge.classList.add('hidden');
      } catch (e) {
      } finally {
        hidePeteFrame();
        state.phase = prevPhase; clearVisualEffects(); setActiveScene(prevScene);
        if (prevPhase === 'RUSH') { applyRushModeVisuals(); setControlMode('RUSH'); }
        else { FxCanvas.setAmbient('ember'); setControlMode('NORMAL'); BeatEngine.setStyle('normal'); BeatEngine.resume(); }
      }
    });
  }

  syncRemLampVisibility();
})();
