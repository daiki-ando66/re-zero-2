// =========================================================================
// addons.js (v2) :
//  1. モード別ビートエンジン（プチュン・フリーズ・無音違和感で完全切断）
//  2. 液晶内の動的ステージ背景（通常4ステージ＋RUSH4モード＋ビート脈動）
//  3. 鬼化レムランプ修正（他画面への残留バグ解消＆文字被りゼロ配置）
//  4. 暗転のまま「鬼がかってますね」じわっとフェードイン
// =========================================================================
(function initAddonsV2() {
  // -----------------------------------------------------------------------
  // 1. 追加CSS注入
  // -----------------------------------------------------------------------
  if (!document.getElementById('addons-v2-css')) {
    const st = document.createElement('style');
    st.id = 'addons-v2-css';
    st.textContent = `
      /* 最背面：動的ステージ背景Canvas */
      #stageBgCanvas {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        pointer-events: none;
        opacity: 0.92;
        transition: opacity 0.25s ease;
      }

      /* 通常時ステージ名バッジ（右上回転数の横に表示） */
      #stageNamePill {
        position: absolute;
        top: 52px;
        left: 12px;
        z-index: 12;
        pointer-events: none;
        padding: 2px 9px;
        border-radius: 9999px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 0.08em;
        background: rgba(12, 6, 8, 0.72);
        border: 1px solid rgba(250, 204, 21, 0.45);
        color: #fde68a;
        backdrop-filter: blur(4px);
      }

      /* 鬼化レムランプ役物レイヤー */
      #remLampStage {
        position: absolute;
        inset: 0;
        z-index: 6;
        pointer-events: none;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        padding: 18px 8px 26px 8px;
      }
      #remLampImg {
        max-height: 98%;
        max-width: 96%;
        object-fit: contain;
        transition: filter 0.22s ease, opacity 0.25s ease, transform 0.28s ease;
        will-change: filter, opacity, transform;
      }

      /* レム告知モード専用：文字を左下へ退避して中央のレムを完全にクリアに見せる */
      #scene-rush-idle.rem-layout-clear {
        justify-content: flex-end !important;
        align-items: flex-start !important;
        text-align: left !important;
        padding: 0 4px 2px 4px;
      }
      #scene-rush-idle.rem-layout-clear #rushModeBanner {
        font-size: 9px !important;
        margin-bottom: 0 !important;
        opacity: 0.85;
        background: rgba(2, 12, 24, 0.72);
        padding: 1px 7px;
        border-radius: 6px;
      }
      #scene-rush-idle.rem-layout-clear #rushBigRemain {
        font-size: 2.15rem !important;
        line-height: 1 !important;
      }
      #scene-rush-idle.rem-layout-clear #rushIdleSub {
        margin-top: 2px !important;
        font-size: 10px !important;
        padding: 1px 6px !important;
        background: rgba(2, 12, 24, 0.72);
        border-radius: 6px;
        max-width: 210px !important;
      }

      /* 鬼化レム：消灯待機・点灯4パターン */
      .rem-img-idle {
        opacity: 0.34;
        filter: brightness(0.28) saturate(0.35) contrast(1.22);
        transform: scale(0.97);
      }
      .rem-img-lit {
        opacity: 1 !important;
        filter: brightness(1.24) saturate(1.35) drop-shadow(0 0 18px rgba(56,189,248,0.98)) drop-shadow(0 0 44px rgba(14,165,233,0.9)) !important;
        transform: scale(1.04) !important;
      }
      @keyframes remImgSlowWake {
        0%   { opacity: 0.30; filter: brightness(0.26) saturate(0.3); transform: scale(0.97); }
        55%  { opacity: 0.88; filter: brightness(0.98) saturate(1.2) drop-shadow(0 0 18px rgba(56,189,248,0.88)); transform: scale(1.02); }
        100% { opacity: 1; filter: brightness(1.36) saturate(1.45) drop-shadow(0 0 24px rgba(250,204,21,0.98)) drop-shadow(0 0 54px rgba(56,189,248,0.95)); transform: scale(1.07); }
      }
      .rem-img-slow { animation: remImgSlowWake 1.2s ease-in forwards !important; }

      @keyframes remImgRainbowGlow {
        0%   { filter: brightness(1.30) saturate(1.4) drop-shadow(0 0 22px rgba(250,204,21,0.98)) drop-shadow(0 0 48px rgba(244,63,94,0.88)); }
        33%  { filter: brightness(1.35) saturate(1.4) drop-shadow(0 0 22px rgba(56,189,248,0.98)) drop-shadow(0 0 48px rgba(192,132,252,0.88)); }
        66%  { filter: brightness(1.30) saturate(1.4) drop-shadow(0 0 22px rgba(52,211,153,0.98)) drop-shadow(0 0 48px rgba(250,204,21,0.88)); }
        100% { filter: brightness(1.30) saturate(1.4) drop-shadow(0 0 22px rgba(250,204,21,0.98)) drop-shadow(0 0 48px rgba(244,63,94,0.88)); }
      }
      .rem-img-rainbow {
        opacity: 1 !important;
        transform: scale(1.07) !important;
        animation: remImgRainbowGlow 0.55s linear infinite !important;
      }

      @keyframes remImgStrobe {
        0%, 100% { opacity: 1; filter: brightness(1.85) saturate(1.3) drop-shadow(0 0 34px rgba(224,242,254,1)) drop-shadow(0 0 65px rgba(56,189,248,1)); transform: scale(1.08); }
        50%      { opacity: 0.28; filter: brightness(0.35) saturate(0.4); transform: scale(0.98); }
      }
      .rem-img-strobe { animation: remImgStrobe 0.13s steps(2) infinite !important; }

      /* 暗転のまま「鬼がかってますね」じわっとフェードイン */
      @keyframes darkFadeInCutin {
        0%   { opacity: 0; transform: scale(0.96); filter: brightness(0.35); }
        42%  { opacity: 1; transform: scale(1.00); filter: brightness(1.06); }
        100% { opacity: 1; transform: scale(1.05); filter: brightness(1.08); }
      }
      .cutin-dark-fade { animation: darkFadeInCutin 2.9s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
    `;
    document.head.appendChild(st);
  }

  // -----------------------------------------------------------------------
  // 2. モード別ビートエンジン（プチュン・無音違和感でスパッと切れる！）
  // -----------------------------------------------------------------------
  const BeatEngine = (() => {
    let ctx = null, bus = null, noiseBuf = null;
    let enabled = true;
    let globalMuted = false;
    let cutFlag = false;
    let timer = null;
    let step = 0;
    let currentStyle = 'normal'; // 'normal' | 'onigakari' | 'brain' | 'rem' | 'zero'
    let pulseLevel = 0;

    function ensureCtx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        bus = ctx.createGain();
        bus.gain.value = 0.28;
        bus.connect(ctx.destination);

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
      o.type = 'sine';
      o.frequency.setValueAtTime(startHz, t);
      o.frequency.exponentialRampToValueAtTime(endHz, t + dur);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.02);
      o.connect(g).connect(bus);
      o.start(t); o.stop(t + dur + 0.03);
      pulseLevel = 1.0;
    }

    function playHat(t, gain = 0.12, open = false) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7200;
      const g = ctx.createGain();
      const d = open ? 0.085 : 0.032;
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + d);
      src.connect(hp).connect(g).connect(bus);
      src.start(t); src.stop(t + d + 0.01);
    }

    function playSnare(t, gain = 0.20) {
      const src = ctx.createBufferSource(); src.buffer = noiseBuf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1850; bp.Q.value = 0.9;
      const g = ctx.createGain();
      g.gain.setValueAtTime(gain, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      src.connect(bp).connect(g).connect(bus);
      src.start(t); src.stop(t + 0.10);
    }

    function playBass(t, freq, dur = 0.11, gain = 0.22, type = 'sawtooth', cutoff = 420) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      lp.type = 'lowpass'; lp.frequency.value = cutoff; lp.Q.value = 2.5;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(lp).connect(g).connect(bus);
      o.start(t); o.stop(t + dur + 0.02);
    }

    function playPluck(t, freq, dur = 0.12, gain = 0.11, type = 'triangle') {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(gain, t + 0.006);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(bus);
      o.start(t); o.stop(t + dur + 0.02);
    }

    function getStepMs(style) {
      const bpm = style === 'onigakari' ? 156
        : style === 'brain' ? 144
        : style === 'rem' ? 130
        : style === 'zero' ? 162
        : 122;
      return (60000 / bpm) / 4; // 16分音符1ステップ
    }

    function tickStep() {
      if (!enabled || globalMuted || cutFlag) return;
      if (!ctx || ctx.state !== 'running') return;
      const t = ctx.currentTime + 0.01;
      const s = step % 16;

      if (currentStyle === 'onigakari') {
        // 疾走ハードビート（4つ打ちキック＋裏打ちベース＋エッジィなリード）
        if (s % 4 === 0) playKick(t, 0.70, 145, 42, 0.12);
        if (s === 4 || s === 12) playSnare(t, 0.22);
        if (s % 2 === 1) playHat(t, s % 4 === 2 ? 0.16 : 0.10, s % 4 === 2);
        const bassNotes = [73.42, 73.42, 87.31, 82.41]; // D2 - D2 - F2 - E2
        if (s % 2 === 1) playBass(t, bassNotes[Math.floor(s / 4)], 0.09, 0.28, 'sawtooth', 620);
        const arp = [293.66, 0, 349.23, 0, 440, 0, 392, 349.23, 293.66, 0, 523.25, 0, 440, 0, 392, 0];
        if (arp[s]) playPluck(t, arp[s], 0.09, 0.12, 'sawtooth');
      } else if (currentStyle === 'brain') {
        // 不穏で重いグルーヴ（心拍風ダブルキック＋ダークベース）
        if (s === 0 || s === 3 || s === 8 || s === 11) playKick(t, 0.68, 118, 36, 0.15);
        if (s === 4 || s === 12) playSnare(t, 0.18);
        if (s % 2 === 0) playHat(t, 0.08, false);
        const b = [65.41, 69.30, 65.41, 61.74]; // C2 - C#2 - C2 - B1
        if (s % 4 === 0 || s % 4 === 2) playBass(t, b[Math.floor(s / 4)], 0.14, 0.30, 'sawtooth', 360);
        if (s === 6 || s === 14) playPluck(t, s === 6 ? 622.25 : 587.33, 0.12, 0.10, 'square');
      } else if (currentStyle === 'rem') {
        // 透き通る蒼いパルス（キュイン＆ランプ点灯が映える控えめ空間系）
        if (s === 0 || s === 8) playKick(t, 0.42, 110, 44, 0.14);
        if (s % 4 === 2) playHat(t, 0.07, false);
        const bell = [523.25, 0, 0, 659.25, 0, 0, 783.99, 0, 659.25, 0, 0, 587.33, 0, 0, 493.88, 0];
        if (bell[s]) playPluck(t, bell[s], 0.22, 0.10, 'sine');
      } else if (currentStyle === 'zero') {
        // 極限ミニマル高速パルス（緊張感MAX）
        if (s % 4 === 0) playKick(t, 0.56, 150, 48, 0.08);
        if (s % 2 === 1) playHat(t, 0.09, false);
        if (s === 0 || s === 6 || s === 10) playBass(t, 82.41, 0.07, 0.20, 'square', 320);
      } else {
        // 通常時：心地よく回せる控えめグルーヴ
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
      if (state.phase === 'RUSH') {
        currentStyle = state.rushMode || 'onigakari';
      } else if (state.phase === 'NORMAL') {
        currentStyle = 'normal';
      }
      if (bus && ctx) {
        const vol = (state.phase === 'RUSH') ? 0.32 : 0.22;
        bus.gain.setTargetAtTime(cutFlag || !enabled || globalMuted ? 0.0001 : vol, ctx.currentTime, 0.02);
      }
      restartTimer();
    }

    return {
      unlock() {
        ensureCtx();
        syncStyle();
      },
      // ★プチュン・無音違和感・大当たり突入時にスパッと無音切断！★
      cut() {
        cutFlag = true;
        if (timer) { clearInterval(timer); timer = null; }
        if (bus && ctx) {
          bus.gain.cancelScheduledValues(ctx.currentTime);
          bus.gain.setValueAtTime(0.0001, ctx.currentTime);
        }
      },
      resume() {
        cutFlag = false;
        if (!enabled || globalMuted) return;
        ensureCtx();
        syncStyle();
      },
      setStyle(style) {
        if (currentStyle !== style) {
          currentStyle = style;
          step = 0;
        }
        if (!cutFlag) syncStyle();
      },
      toggle() {
        enabled = !enabled;
        if (enabled) {
          cutFlag = false;
          ensureCtx();
          syncStyle();
        } else {
          this.cut();
        }
        return enabled;
      },
      setGlobalMute(m) {
        globalMuted = m;
        if (m) this.cut();
        else if (enabled && typeof state !== 'undefined' && (state.phase === 'NORMAL' || state.phase === 'RUSH')) {
          this.resume();
        }
      },
      isCut: () => cutFlag || !enabled || globalMuted,
      consumePulse() {
        const v = pulseLevel;
        pulseLevel *= 0.84;
        if (pulseLevel < 0.01) pulseLevel = 0;
        return v;
      }
    };
  })();

  // 初回ユーザー操作でビートを自動起動
  ['pointerdown', 'keydown'].forEach(evName => {
    window.addEventListener(evName, () => BeatEngine.unlock(), { once: true });
  });

  // ヘッダーに「🎵 BGM」ボタンを自動追加
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

  // 既存ミュートボタンとも同期
  const muteBtn = document.getElementById('btnMute');
  if (muteBtn) {
    muteBtn.addEventListener('click', () => {
      setTimeout(() => {
        BeatEngine.setGlobalMute(muteBtn.textContent.includes('OFF'));
      }, 10);
    });
  }

  // -----------------------------------------------------------------------
  // 3. 黒背景を脱却！動的ステージ背景Canvas（通常4ステージ＋RUSH4モード）
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

  const StageRenderer = (() => {
    const ctx = stageBgCanvas.getContext('2d');
    let w = 360, h = 360, angle = 0;

    // 放射スピードライン用
    const rays = Array.from({ length: 34 }, () => ({
      a: Math.random() * Math.PI * 2,
      r: Math.random(),
      spd: 0.015 + Math.random() * 0.025,
      len: 0.12 + Math.random() * 0.18
    }));
    // 雪・結晶用
    const flakes = Array.from({ length: 32 }, () => ({
      x: Math.random(), y: Math.random(),
      vy: 0.0015 + Math.random() * 0.0025,
      vx: (Math.random() - 0.5) * 0.001,
      s: 1.5 + Math.random() * 3.0
    }));

    function resize() {
      const rect = lcdFrame.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = Math.max(100, rect.width);
      h = Math.max(100, rect.height);
      stageBgCanvas.width = w * dpr;
      stageBgCanvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function drawMagicCircle(cx, cy, radius, color, rot, alpha) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2); ctx.stroke();
      // 六芒星
      for (let k = 0; k < 2; k++) {
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
          const a = (Math.PI * 2 * i) / 3 + (k * Math.PI / 3);
          const x = Math.cos(a) * radius * 0.92;
          const y = Math.sin(a) * radius * 0.92;
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

      // 通常時ステージ名バッジ表示制御
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

          // 爆速ワープスピードライン
          rays.forEach((r, idx) => {
            if (!frozen) {
              r.r += r.spd * (1 + pulse * 0.9);
              if (r.r > 1.25) { r.r = 0.05; r.a = Math.random() * Math.PI * 2; }
            }
            const maxD = Math.max(w, h) * 0.75;
            const r1 = r.r * maxD;
            const r2 = (r.r + r.len) * maxD;
            ctx.strokeStyle = idx % 3 === 0 ? '#fde047' : '#fb7185';
            ctx.globalAlpha = Math.min(0.85, r.r * 0.85);
            ctx.lineWidth = idx % 3 === 0 ? 2.2 : 1.3;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1);
            ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2);
            ctx.stroke();
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

          // 舞い落ちる蒼い氷結晶
          flakes.forEach(f => {
            if (!frozen) {
              f.y += f.vy; f.x += f.vx;
              if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); }
            }
            ctx.fillStyle = '#bae6fd';
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.arc(f.x * w, f.y * h, f.s, 0, Math.PI * 2);
            ctx.fill();
          });
          ctx.globalAlpha = 1;
        } else {
          // ゼロかRUSH：高コントラスト閃光ライン
          ctx.fillStyle = 'rgba(12, 12, 16, 0.94)';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = `rgba(255, 255, 255, ${0.08 + pulse * 0.22})`;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, cy); ctx.lineTo(w, cy);
          ctx.stroke();
        }
      } else {
        // 通常時：30回転ごとに4ステージ自動ローテーション
        const spins = typeof state !== 'undefined' ? state.currentSpin : 0;
        const stg = NORMAL_STAGES[Math.floor(spins / 30) % NORMAL_STAGES.length];
        if (stageNamePill.textContent !== stg.name) stageNamePill.textContent = stg.name;

        const bg = ctx.createRadialGradient(cx, cy * 0.85, 16, cx, cy, Math.max(w, h) * 0.8);
        bg.addColorStop(0, stg.c1);
        bg.addColorStop(0.65, stg.c2);
        bg.addColorStop(1, '#0d0407');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

        // ビート同期の光オーラ＋回転魔法陣
        const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 145 + pulse * 35);
        aura.addColorStop(0, stg.glow);
        aura.addColorStop(1, 'transparent');
        ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);

        drawMagicCircle(cx, cy, 122 + pulse * 8, stg.accent, angle * 0.75, 0.22 + pulse * 0.12);
      }

      requestAnimationFrame(loop);
    }

    window.addEventListener('resize', resize);
    setTimeout(resize, 60);
    requestAnimationFrame(loop);
    return { resize };
  })();

  // -----------------------------------------------------------------------
  // 4. 鬼化レム画像（rem_lamp.jpg）自動白透過 ＆ 残留バグ完全修正
  // -----------------------------------------------------------------------
  let remLampTransparentUrl = null;
  let remTestOverride = false;

  function removeOuterWhiteBackground(img) {
    try {
      const maxDim = 900;
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.drawImage(img, 0, 0, w, h);

      const imgData = c.getImageData(0, 0, w, h);
      const d = imgData.data;
      const visited = new Uint8Array(w * h);
      const isWhiteBg = (idx) => {
        const p = idx * 4;
        const r = d[p], g = d[p + 1], b = d[p + 2];
        return r > 236 && g > 236 && b > 236 && Math.max(r, g, b) - Math.min(r, g, b) < 22;
      };

      const queue = [];
      for (let x = 0; x < w; x++) { queue.push(x); queue.push((h - 1) * w + x); }
      for (let y = 1; y < h - 1; y++) { queue.push(y * w); queue.push(y * w + (w - 1)); }

      let head = 0;
      while (head < queue.length) {
        const idx = queue[head++];
        if (visited[idx]) continue;
        visited[idx] = 1;
        if (!isWhiteBg(idx)) continue;
        d[idx * 4 + 3] = 0;
        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0 && !visited[idx - 1]) queue.push(idx - 1);
        if (x < w - 1 && !visited[idx + 1]) queue.push(idx + 1);
        if (y > 0 && !visited[idx - w]) queue.push(idx - w);
        if (y < h - 1 && !visited[idx + w]) queue.push(idx + w);
      }

      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const p = idx * 4;
          if (d[p + 3] > 0) {
            const hasTrans =
              d[(idx - 1) * 4 + 3] === 0 || d[(idx + 1) * 4 + 3] === 0 ||
              d[(idx - w) * 4 + 3] === 0 || d[(idx + w) * 4 + 3] === 0;
            if (hasTrans && d[p] > 215 && d[p + 1] > 215 && d[p + 2] > 215) d[p + 3] = 95;
          }
        }
      }
      c.putImageData(imgData, 0, 0);
      return cv.toDataURL('image/png');
    } catch (e) {
      return img.src;
    }
  }

  let remLampStage = document.getElementById('remLampStage');
  if (!remLampStage) {
    remLampStage = document.createElement('div');
    remLampStage.id = 'remLampStage';
    remLampStage.className = 'hidden';
    const imgEl = document.createElement('img');
    imgEl.id = 'remLampImg';
    imgEl.alt = 'レムランプ';
    imgEl.className = 'rem-img-idle';
    remLampStage.appendChild(imgEl);
    lcdFrame.insertBefore(remLampStage, stageBgCanvas.nextSibling);
  }
  const remLampImg = document.getElementById('remLampImg');

  function setRemLampVisual(mode) {
    if (!remLampTransparentUrl || !mode || mode === 'hidden') {
      remLampStage.classList.add('hidden');
      return;
    }
    remLampStage.classList.remove('hidden');
    remLampImg.className = '';
    void remLampImg.offsetWidth;
    if (mode === 'idle') remLampImg.className = 'rem-img-idle';
    else if (mode === 'lit') remLampImg.className = 'rem-img-lit';
    else if (mode === 'slow') remLampImg.className = 'rem-img-slow';
    else if (mode === 'rainbow') remLampImg.className = 'rem-img-rainbow';
    else if (mode === 'strobe') remLampImg.className = 'rem-img-strobe';
  }

  // ★残留バグ防止の一元チェック関数★
  function syncRemLampVisibility() {
    const rushIdleEl = document.getElementById('scene-rush-idle');
    const shouldShow = remTestOverride || (
      typeof state !== 'undefined' &&
      state.phase === 'RUSH' &&
      state.rushMode === 'rem' &&
      state.activeScene === 'rush-idle'
    );
    if (rushIdleEl) {
      rushIdleEl.classList.toggle('rem-layout-clear', shouldShow);
    }
    if (shouldShow) {
      if (remLampStage.classList.contains('hidden')) setRemLampVisual('idle');
    } else {
      setRemLampVisual('hidden');
    }
  }

  (function preloadRemLamp() {
    const candidates = ['rem_lamp.jpg', 'rem_lamp.png', '1795190676369.jpg'];
    let i = 0;
    function next() {
      if (i >= candidates.length) return;
      const src = candidates[i++];
      const img = new Image();
      img.onload = () => {
        remLampTransparentUrl = removeOuterWhiteBackground(img);
        remLampImg.src = remLampTransparentUrl;
        syncRemLampVisibility();
      };
      img.onerror = next;
      img.src = src;
    }
    next();
  })();

  // -----------------------------------------------------------------------
  // 5. 既存関数フック（ビート自動切替・切断＆レム残留完全防止）
  // -----------------------------------------------------------------------
  const _origSetActiveScene = window.setActiveScene;
  window.setActiveScene = function (sceneName) {
    _origSetActiveScene(sceneName);
    syncRemLampVisibility();
    if (sceneName === 'normal') {
      BeatEngine.setStyle('normal');
      BeatEngine.resume();
    } else if (sceneName === 'rush-idle' && state.phase === 'RUSH') {
      BeatEngine.setStyle(state.rushMode || 'onigakari');
      BeatEngine.resume();
    } else if (sceneName === 'bonus') {
      BeatEngine.cut();
    }
  };

  const _origApplyRushModeVisuals = window.applyRushModeVisuals;
  window.applyRushModeVisuals = function () {
    _origApplyRushModeVisuals();
    syncRemLampVisibility();
    if (state.phase === 'RUSH') {
      BeatEngine.setStyle(state.rushMode || 'onigakari');
      BeatEngine.resume();
    }
  };

  const _origClearVisualEffects = window.clearVisualEffects;
  window.clearVisualEffects = function () {
    _origClearVisualEffects();
    syncRemLampVisibility();
  };

  const _origShowFs = window.showFullscreenOverlay;
  window.showFullscreenOverlay = function (opts) {
    setRemLampVisual('hidden');
    return _origShowFs(opts);
  };

  const _origHideFs = window.hideFullscreenOverlay;
  window.hideFullscreenOverlay = function () {
    _origHideFs();
    syncRemLampVisibility();
  };

  // ★プチュン・大当たり・落ちブル警報・RUSH終了の瞬間にビートをスパッと切る！★
  ['playPuchun', 'play1500Jackpot', 'play3000Jackpot', 'play6000Fanfare', 'playOchiburu', 'playReStart'].forEach(fnName => {
    if (typeof StudioAudio !== 'undefined' && typeof StudioAudio[fnName] === 'function') {
      const orig = StudioAudio[fnName];
      StudioAudio[fnName] = function (...args) {
        BeatEngine.cut();
        return orig.apply(this, args);
      };
    }
  });

  if (typeof window.playIwakanEffect === 'function') {
    const _origIwakan = window.playIwakanEffect;
    window.playIwakanEffect = async function (opts) {
      // 違和感発動時は一部でビートも切って無音違和感を強調
      if (Math.random() < 0.45) BeatEngine.cut();
      return await _origIwakan(opts);
    };
  }

  // レム告知パターン4種（鬼化レム画像ランプ発光）
  window.playRemNoticePattern = async function ({ is6000, forcePat = null, token }) {
    let pat = forcePat || 'NORMAL';
    if (!forcePat && is6000 && Math.random() < 0.75) {
      const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
      pat = p6[Math.floor(Math.random() * p6.length)];
    }

    BeatEngine.cut(); // 点灯の瞬間にビートを切って静寂→キュイン！
    let note = '';
    if (pat === 'SLOW_GLOW') {
      note = '💙 レム徐々に点灯';
      oniLamp.classList.remove('lamp-rem', 'lamp-rainbow', 'lamp-red');
      oniLamp.classList.add('lamp-rem-slow');
      lampStatusText.textContent = 'じわ〜っ…';
      setLed('rem');
      setRemLampVisual('slow');
      await wait(1220, token);
      StudioAudio.playKyuin();
      triggerLamp('rainbow', '6,000!!');
      setRemLampVisual('rainbow');
      setAmbientBg('rainbow');
      setSunburst(true);
      FxCanvas.burstRainbow(55);
      await wait(550, token);
    } else if (pat === 'DOUBLE_BLINK') {
      note = '💙 レム再点灯';
      oniLamp.classList.add('lamp-rem');
      lampStatusText.textContent = 'ピッ…';
      setRemLampVisual('lit');
      await wait(180, token);
      oniLamp.classList.remove('lamp-rem');
      lampStatusText.textContent = '……';
      setLed('off');
      setRemLampVisual('idle');
      await wait(580, token);
      StudioAudio.playKyuin();
      triggerLamp('rainbow', '再点灯!!');
      setRemLampVisual('rainbow');
      setAmbientBg('rainbow');
      setSunburst(true);
      FxCanvas.spawnLightning('#38bdf8', 5);
      FxCanvas.burstRainbow(55);
      await wait(620, token);
    } else if (pat === 'CLASSIC_FLASH') {
      note = '💙 旧レム閃光';
      StudioAudio.playKyuin();
      oniLamp.classList.add('lamp-rem-classic');
      lampStatusText.textContent = '閃光!!';
      setLed('rainbow');
      setRemLampVisual('strobe');
      setAmbientBg('rainbow');
      setSunburst(true);
      FxCanvas.spawnRing('#38bdf8', 320, 9);
      FxCanvas.spawnLightning('#e0f2fe', 6);
      await wait(950, token);
      oniLamp.classList.remove('lamp-rem-classic');
      setRemLampVisual('rainbow');
    } else {
      StudioAudio.playKyuin();
      triggerLamp('rem', 'キュイン!!');
      setRemLampVisual('lit');
      FxCanvas.spawnRing('#38bdf8', 260, 8);
      await wait(650, token);
    }
    return note;
  };

  // 暗転のまま「鬼がかってますね」じわっとフェードイン
  window.playOnigakariImageCutin = async function ({
    caption = '鬼がかってますね',
    dur = 3000,
    withPokyun = true,
    fromBlackout = false,
    token
  }) {
    BeatEngine.cut();
    setRemLampVisual('hidden');

    if (onigakariImageSrc) {
      globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
      globalCutinOverlay.innerHTML = `
        <div class="w-full max-w-lg flex flex-col items-center gap-3">
          <div id="cutinFrameBox" class="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-amber-300/30 bg-black ${fromBlackout ? 'cutin-dark-fade' : ''}">
            <img src="${onigakariImageSrc}" alt="鬼がかってますね" class="w-full h-full object-cover ${fromBlackout ? '' : 'cutin-img-zoom'}">
          </div>
          <div id="cutinCapText" class="font-mincho text-2xl sm:text-3xl font-black rainbow-grad-text tracking-widest drop-shadow transition-opacity duration-700 ${fromBlackout ? 'opacity-0' : 'opacity-100 pop-in'}">${caption}</div>
        </div>
      `;
    } else {
      globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
      globalCutinOverlay.innerHTML = `
        <div class="w-full max-w-lg rounded-3xl overlay-rainbow border-4 cutin-rainbow-border p-8 text-center shadow-2xl cutin-dark-fade">
          <div class="font-mincho text-4xl sm:text-5xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.95)] tracking-wider leading-tight">
            ${caption}
          </div>
        </div>
      `;
    }

    globalCutinOverlay.classList.remove('hidden');

    try {
      if (fromBlackout) {
        await waitFreeze(900, token);
        const box = document.getElementById('cutinFrameBox');
        const cap = document.getElementById('cutinCapText');
        if (box) box.classList.add('border-4', 'cutin-rainbow-border');
        if (cap) cap.classList.replace('opacity-0', 'opacity-100');
        if (withPokyun) StudioAudio.playPokyun(true);
        setAmbientBg('rainbow');
        setSunburst(true);
        setLed('rainbow');
        await waitFreeze(Math.max(1200, dur - 900), token);
      } else {
        if (withPokyun) StudioAudio.playPokyun(true);
        fireGlobalRainbowFlash();
        setAmbientBg('rainbow');
        setSunburst(true);
        setLed('rainbow');
        await waitFreeze(dur, token);
      }
    } finally {
      hideGlobalCutin();
    }
  };

  window.runSudden3sFreeze6000 = async function (token) {
    try {
      BeatEngine.cut();
      setRemLampVisual('hidden');
      StudioAudio.playPuchun();
      FxCanvas.setAmbient('none');
      FxCanvas.clearAll();
      setLed('off');
      setAmbientBg('');
      setSunburst(false);

      setGlobalBlackout(true);
      await waitFreeze(3000, token);

      await playOnigakariImageCutin({
        caption: '鬼がかってますね',
        dur: 3200,
        withPokyun: true,
        fromBlackout: true,
        token
      });
      setGlobalBlackout(false);

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
  };

  // テストメニューに「💙 鬼化レムランプ点灯」ボタンを追加（終了後に必ずレム消去！）
  const testGrid = document.querySelector('#promoTestMenu .grid');
  if (testGrid && !document.getElementById('btnTestRemLamp')) {
    let remTestIdx = 0;
    const pats = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH', 'NORMAL'];
    const remBtn = document.createElement('button');
    remBtn.id = 'btnTestRemLamp';
    remBtn.className = 'col-span-2 sm:col-span-3 py-2 px-2 rounded-xl font-black bg-gradient-to-r from-sky-800 via-blue-800 to-indigo-900 border border-sky-300/80 text-sky-100 active:scale-95 transition';
    remBtn.textContent = '💙 鬼化レムランプ点灯（押すたび4パターン切替）';
    testGrid.appendChild(remBtn);

    remBtn.addEventListener('click', async () => {
      if (state.phase === 'ANIMATING' || state.phase === 'REACH') return;
      document.getElementById('promoTestMenu').classList.add('hidden');
      stopAuto();
      document.getElementById('tabPlay').click();

      const prevPhase = state.phase;
      const prevScene = state.activeScene;
      const tok = ++seqToken;
      state.phase = 'ANIMATING';
      setControlMode('BUSY');
      remTestOverride = true;

      try {
        clearVisualEffects();
        setActiveScene('rush-idle');
        lcdFrame.classList.add('mode-rem-bg');
        setAmbientBg('rem');
        setLed('rem');
        setRemLampVisual('idle');
        await wait(650, tok);

        const pat = pats[remTestIdx++ % pats.length];
        await playRemNoticePattern({ is6000: pat !== 'NORMAL', forcePat: pat, token: tok });
        await wait(950, tok);
      } catch (e) {
      } finally {
        remTestOverride = false;
        setRemLampVisual('hidden');
        state.phase = prevPhase;
        clearVisualEffects();
        setActiveScene(prevScene);
        if (prevPhase === 'RUSH') {
          applyRushModeVisuals();
          setControlMode('RUSH');
        } else {
          FxCanvas.setAmbient('ember');
          setControlMode('NORMAL');
          BeatEngine.setStyle('normal');
          BeatEngine.resume();
        }
      }
    });
  }

  // 初期状態同期
  syncRemLampVisibility();
})();
