// =========================================================================
// effects.js (v7.0) : 筐体盤面ズーム・ロゴ役物落下＆色変化・液晶内鬼がかってますね
// =========================================================================

// -------------------------------------------------------------------------
// 1. 強化サウンドエンジン（役物落下金属SE・重低音V・バックグラウンド自動停止）
// -------------------------------------------------------------------------
const ExtraAudioV70 = (() => {
  let ctx = null;
  let noiseBuf = null;
  let muted = false;
  let vol = 0.80;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.6);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended' && !document.hidden) ctx.resume();
    return ctx;
  }

  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) {
      if (ctx.state === 'running') ctx.suspend().catch(() => {});
    } else {
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    }
  });

  // ★ロゴ役物「ガシャーン!!」落下SE：落下ヒュッ → 着地(290ms)の重低音＋金属音 → バウンド2回 → 残響★
  function playYakumonoDrop(color = 'rainbow') {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.005, T = now + 0.29;           // T = 着地の瞬間
    const master = c.createGain(); master.gain.value = Math.min(1.7, vol * 1.55);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 14; comp.knee.value = 6;
    comp.connect(master).connect(c.destination);
    // 残響（フィードバックディレイ）
    const dl = c.createDelay(0.5); dl.delayTime.value = 0.11;
    const fb = c.createGain(); fb.gain.value = 0.34;
    const wet = c.createGain(); wet.gain.value = 0.30;
    comp.connect(dl); dl.connect(fb).connect(dl); dl.connect(wet).connect(master);

    const noise = (t, dur, type, hz, q, gain) => {
      const n = c.createBufferSource(); n.buffer = noiseBuf;
      const f = c.createBiquadFilter(); f.type = type; f.frequency.value = hz; f.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      n.connect(f).connect(g).connect(comp); n.start(t); n.stop(t + dur + 0.02);
    };
    const thud = (t, hz0, hz1, dur, gain, type = 'sine') => {
      const o = c.createOscillator(), g = c.createGain(); o.type = type;
      o.frequency.setValueAtTime(hz0, t); o.frequency.exponentialRampToValueAtTime(hz1, t + dur * 0.8);
      g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g).connect(comp); o.start(t); o.stop(t + dur + 0.02);
    };

    // 0. 落下中の風切り（ヒュッ→加速）
    { const n = c.createBufferSource(); n.buffer = noiseBuf;
      const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.setValueAtTime(500, now); f.frequency.exponentialRampToValueAtTime(5200, T);
      const g = c.createGain(); g.gain.setValueAtTime(0.001, now); g.gain.exponentialRampToValueAtTime(0.55, T - 0.01); g.gain.exponentialRampToValueAtTime(0.001, T + 0.03);
      n.connect(f).connect(g).connect(comp); n.start(now); n.stop(T + 0.05); }

    // 1. 着地の重低音（ドスン！）
    thud(T, 210, 24, 0.85, 2.8);
    thud(T, 120, 44, 0.36, 1.5, 'triangle');
    thud(T, 70, 30, 0.6, 1.8);

    // 2. 金属ロック音「ガシャーン!!」＋きらめく金属の余韻
    noise(T, 0.34, 'bandpass', 2850, 1.6, 1.4);
    noise(T, 0.60, 'bandpass', 5200, 3.0, 0.8);
    noise(T, 0.22, 'lowpass', 900, 0.8, 1.1);
    // 3. 鎖の跳ね返りジャラジャラ
    [0.04, 0.075, 0.11, 0.15].forEach((d, i) => noise(T + d, 0.07, 'highpass', 3500, 1.0, 0.32 - i * 0.05));

    // 4. バウンド2回（小さくなる着地音）
    thud(T + 0.20, 150, 38, 0.22, 1.0); noise(T + 0.20, 0.10, 'bandpass', 2400, 1.4, 0.35);
    thud(T + 0.34, 160, 42, 0.18, 0.55); noise(T + 0.34, 0.07, 'bandpass', 2600, 1.4, 0.2);

    // 5. 色別ハーモニー閃光音
    const notes = color === 'rainbow'
      ? [587.33, 880.00, 1174.66, 1760.00, 2349.32]
      : color === 'gold'
        ? [523.25, 783.99, 1046.50, 1567.98]
        : [440.00, 659.25, 880.00];
    notes.forEach((hz, idx) => {
      const st = T + 0.02 + idx * 0.028;
      const o = c.createOscillator(), g = c.createGain();
      o.type = idx % 2 === 0 ? 'triangle' : 'sawtooth';
      o.frequency.setValueAtTime(hz * 0.94, st);
      o.frequency.exponentialRampToValueAtTime(hz, st + 0.04);
      g.gain.setValueAtTime(0.001, st);
      g.gain.linearRampToValueAtTime(0.26 - idx * 0.03, st + 0.012);
      g.gain.exponentialRampToValueAtTime(0.001, st + (color === 'rainbow' ? 0.9 : 0.5));
      o.connect(g).connect(comp); o.start(st); o.stop(st + 0.95);
    });
    // 6. 虹だけシンバル風クラッシュ
    if (color === 'rainbow') noise(T + 0.01, 1.3, 'highpass', 5500, 0.7, 0.75);
  }

  function play1500(isRush = false) {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.01;
    const master = c.createGain(); master.gain.value = vol * 0.62;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 6;
    comp.connect(master).connect(c.destination);

    const sub = c.createOscillator(), subG = c.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(175, now); sub.frequency.exponentialRampToValueAtTime(34, now + 0.42);
    subG.gain.setValueAtTime(0.001, now); subG.gain.linearRampToValueAtTime(1.25, now + 0.006); subG.gain.exponentialRampToValueAtTime(0.001, now + 0.50);
    sub.connect(subG).connect(comp); sub.start(now); sub.stop(now + 0.52);

    const nSrc = c.createBufferSource(); nSrc.buffer = noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3200; hp.Q.value = 2.2;
    const nG = c.createGain(); nG.gain.setValueAtTime(0.62, now); nG.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    nSrc.connect(hp).connect(nG).connect(comp); nSrc.start(now); nSrc.stop(now + 0.30);

    [1760, 2637, 3520].forEach((hz, idx) => {
      const m = c.createOscillator(), mg = c.createGain();
      m.type = 'triangle'; m.frequency.setValueAtTime(hz * 0.92, now); m.frequency.exponentialRampToValueAtTime(hz, now + 0.04);
      mg.gain.setValueAtTime(0.001, now); mg.gain.linearRampToValueAtTime(0.26 - idx * 0.05, now + 0.008); mg.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      m.connect(mg).connect(comp); m.start(now); m.stop(now + 0.40);
    });

    const seq = isRush
      ? [
          { t: 0.05, notes: [293.66, 440.00, 587.33], dur: 0.14 },
          { t: 0.18, notes: [369.99, 554.37, 739.99], dur: 0.14 },
          { t: 0.31, notes: [440.00, 659.25, 880.00], dur: 0.16 },
          { t: 0.45, notes: [587.33, 739.99, 880.00, 1174.66], dur: 0.80 }
        ]
      : [
          { t: 0.06, notes: [261.63, 392.00, 523.25], dur: 0.15 },
          { t: 0.20, notes: [329.63, 493.88, 659.25], dur: 0.15 },
          { t: 0.34, notes: [392.00, 587.33, 783.99], dur: 0.16 },
          { t: 0.49, notes: [523.25, 659.25, 783.99, 1046.50], dur: 0.82 }
        ];

    seq.forEach((step, sIdx) => {
      const st = now + step.t;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.6;
      lp.frequency.setValueAtTime(1400, st);
      lp.frequency.exponentialRampToValueAtTime(sIdx === 3 ? 6600 : 4400, st + 0.09);
      lp.frequency.exponentialRampToValueAtTime(2200, st + step.dur);
      const env = c.createGain();
      env.gain.setValueAtTime(0.001, st);
      env.gain.linearRampToValueAtTime(sIdx === 3 ? 0.34 : 0.25, st + 0.018);
      env.gain.setValueAtTime(sIdx === 3 ? 0.28 : 0.19, st + step.dur * 0.65);
      env.gain.exponentialRampToValueAtTime(0.001, st + step.dur + 0.08);
      lp.connect(env).connect(comp);
      step.notes.forEach(hz => {
        [-10, 0, 10].forEach(dt => {
          const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz, st); o.detune.value = dt;
          o.connect(lp); o.start(st); o.stop(st + step.dur + 0.10);
        });
      });
    });

    const sparkNotes = isRush ? [1174.66, 1479.98, 1760.00, 2349.32] : [1046.50, 1318.51, 1567.98, 2093.00];
    sparkNotes.forEach((hz, i) => {
      const st = now + 0.46 + i * 0.055;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(hz, st);
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(0.17, st + 0.01); g.gain.exponentialRampToValueAtTime(0.001, st + 0.56);
      o.connect(g).connect(comp); o.start(st); o.stop(st + 0.60);
    });
  }

  function play300() {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.01;
    const master = c.createGain(); master.gain.value = vol * 0.48;
    master.connect(c.destination);

    const th = c.createOscillator(), thG = c.createGain();
    th.type = 'sine'; th.frequency.setValueAtTime(125, now); th.frequency.exponentialRampToValueAtTime(44, now + 0.22);
    thG.gain.setValueAtTime(0.75, now); thG.gain.exponentialRampToValueAtTime(0.001, now + 0.26);
    th.connect(thG).connect(master); th.start(now); th.stop(now + 0.28);

    [392.00, 523.25].forEach((hz, i) => {
      const st = now + 0.05 + i * 0.14;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(hz, st);
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(0.30, st + 0.015); g.gain.exponentialRampToValueAtTime(0.001, st + 0.36);
      o.connect(g).connect(master); o.start(st); o.stop(st + 0.38);
    });
  }

  function playGlassBreak() {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.005;
    const master = c.createGain(); master.gain.value = vol * 0.64;
    master.connect(c.destination);

    const sub = c.createOscillator(), subG = c.createGain();
    sub.type = 'triangle'; sub.frequency.setValueAtTime(140, now); sub.frequency.exponentialRampToValueAtTime(34, now + 0.22);
    subG.gain.setValueAtTime(0.95, now); subG.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    sub.connect(subG).connect(master); sub.start(now); sub.stop(now + 0.26);

    const n1 = c.createBufferSource(); n1.buffer = noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2600;
    const g1 = c.createGain(); g1.gain.setValueAtTime(0.85, now); g1.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    n1.connect(hp).connect(g1).connect(master); n1.start(now); n1.stop(now + 0.34);

    [2950, 3820, 4650, 5400, 3310, 4120].forEach((hz, i) => {
      const st = now + i * 0.024 + Math.random() * 0.015;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(hz, st); o.frequency.exponentialRampToValueAtTime(hz * 0.88, st + 0.12);
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(0.22, st + 0.005); g.gain.exponentialRampToValueAtTime(0.001, st + 0.14);
      o.connect(g).connect(master); o.start(st); o.stop(st + 0.16);
    });
  }

  function playVImpact(isRed = false) {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.005;
    const master = c.createGain(); master.gain.value = vol * 0.72;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 8;
    comp.connect(master).connect(c.destination);

    const sub = c.createOscillator(), subG = c.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(isRed ? 160 : 130, now); sub.frequency.exponentialRampToValueAtTime(30, now + 0.45);
    subG.gain.setValueAtTime(0.001, now); subG.gain.linearRampToValueAtTime(1.4, now + 0.008); subG.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    sub.connect(subG).connect(comp); sub.start(now); sub.stop(now + 0.58);

    const ns = c.createBufferSource(); ns.buffer = noiseBuf;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = isRed ? 2400 : 1800; bp.Q.value = 1.4;
    const ng = c.createGain(); ng.gain.setValueAtTime(0.75, now); ng.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
    ns.connect(bp).connect(ng).connect(comp); ns.start(now); ns.stop(now + 0.32);

    const chord = isRed ? [220, 329.63, 440, 659.25] : [196, 293.66, 392, 587.33];
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(5200, now); lp.frequency.exponentialRampToValueAtTime(1400, now + 0.65);
    const cg = c.createGain(); cg.gain.setValueAtTime(0.001, now); cg.gain.linearRampToValueAtTime(0.32, now + 0.015); cg.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
    lp.connect(cg).connect(comp);
    chord.forEach(hz => {
      [-9, 9].forEach(dt => {
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(hz, now); o.detune.value = dt;
        o.connect(lp); o.start(now); o.stop(now + 0.75);
      });
    });
  }

  function playMiniPokyun() {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.01;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(920, now); o.frequency.exponentialRampToValueAtTime(1950, now + 0.06); o.frequency.exponentialRampToValueAtTime(1280, now + 0.24);
    g.gain.setValueAtTime(0.001, now); g.gain.linearRampToValueAtTime(vol * 0.14, now + 0.015); g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    o.connect(g).connect(c.destination); o.start(now); o.stop(now + 0.30);
  }

  return {
    playYakumonoDrop, play1500, play300, playGlassBreak, playVImpact, playMiniPokyun,
    setMuted: (m) => { muted = !!m; },
    setVolume: (v) => { vol = Math.max(0, Math.min(1, v)); }
  };
})();

if (typeof StudioAudio !== 'undefined') {
  StudioAudio.playYakumonoDrop = (col = 'rainbow') => ExtraAudioV70.playYakumonoDrop(col);
  StudioAudio.play1500Jackpot = (isRush = false) => ExtraAudioV70.play1500(isRush);
  StudioAudio.play300Sound = () => ExtraAudioV70.play300();
  StudioAudio.playGlassBreak = () => ExtraAudioV70.playGlassBreak();
  StudioAudio.playVImpact = (isRed = false) => ExtraAudioV70.playVImpact(isRed);
  StudioAudio.playMiniPokyun = () => ExtraAudioV70.playMiniPokyun();
  const _origToggleMute = StudioAudio.toggleMute;
  StudioAudio.toggleMute = function () { const m = _origToggleMute(); ExtraAudioV70.setMuted(m); return m; };
  const _origSetVol = StudioAudio.setVolume;
  StudioAudio.setVolume = function (v) { ExtraAudioV70.setVolume(v); return _origSetVol(v); };
}

// -------------------------------------------------------------------------
// 2. 画像素材エンジン（kyoutai.jpg盤面ズーム透過 ＋ rezeroロゴ全色生成）
// -------------------------------------------------------------------------
const Assets = (() => {
  let onigakariSrc = null;
  let remLampUrl = null;
  let botanUrl = null;
  let premiaFrameUrl = null;
  const yakumono = { white: null, red: null, gold: null, rainbow: null };
  const peteFrames = new Array(6).fill(null);
  const wedding9Frames = new Array(9).fill(null);
  const digits = {};
  const wedding = { bg1: null, gensitu: null, stairs: null, arch: null, btn: null, onigakari: null };
  const logos = {
    brainRush: null, wedding: null, brain6000: null, oniRush: null, oni6000: null,
    rezeroChain: null, rezeroPurple: null, furueru: null
  };
  const vstock = { oniHaikei: null, v1500: null, v300: null, bg1500: null, bg300: null, restart: null, niziiro: null };

  function applyCleanWhiteCutout(c, w, h, thresh = 230, softFlame = false) {
    const imgData = c.getImageData(0, 0, w, h);
    const d = imgData.data;
    const total = w * h;
    const visited = new Uint8Array(total);
    const isBg = (idx) => {
      const p = idx * 4;
      const r = d[p], g = d[p + 1], b = d[p + 2];
      return r > thresh && g > thresh && b > thresh && (Math.max(r, g, b) - Math.min(r, g, b)) < (softFlame ? 34 : 26);
    };

    const queue = new Int32Array(total);
    let head = 0, tail = 0;
    const push = (idx) => { if (!visited[idx]) { visited[idx] = 1; queue[tail++] = idx; } };
    for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
    for (let y = 1; y < h - 1; y++) { push(y * w); push(y * w + (w - 1)); }

    while (head < tail) {
      const idx = queue[head++];
      if (!isBg(idx)) continue;
      d[idx * 4 + 3] = 0;
      const x = idx % w, y = (idx - x) / w;
      if (x > 0) push(idx - 1);
      if (x < w - 1) push(idx + 1);
      if (y > 0) push(idx - w);
      if (y < h - 1) push(idx + w);
    }

    if (softFlame) {
      for (let pass = 0; pass < 4; pass++) {
        const snap = new Uint8Array(total);
        for (let i = 0; i < total; i++) snap[i] = d[i * 4 + 3];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (snap[idx] === 0) continue;
            if (snap[idx - 1] < 200 || snap[idx + 1] < 200 || snap[idx - w] < 200 || snap[idx + w] < 200) {
              const p = idx * 4;
              const r = d[p], g = d[p + 1], b = d[p + 2];
              const minC = Math.min(r, g, b);
              if (minC > 165) {
                const newA = Math.max(0, Math.round(((255 - minC) / 90) * 255));
                d[p + 3] = Math.min(d[p + 3], newA);
                if (newA > 12) {
                  const f = 255 / Math.max(60, newA);
                  d[p] = Math.min(255, Math.round(Math.max(0, r - (255 - newA)) * f));
                  d[p + 1] = Math.min(255, Math.round(Math.max(0, g - (255 - newA)) * f));
                  d[p + 2] = Math.min(255, Math.round(Math.max(0, b - (255 - newA)) * f));
                }
              }
            }
          }
        }
      }
      c.putImageData(imgData, 0, 0);
      return;
    }

    const origA = new Uint8Array(total);
    for (let i = 0; i < total; i++) origA[i] = d[i * 4 + 3];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (origA[idx] === 0) continue;
        const nTrans = (origA[idx - 1] === 0 ? 1 : 0) + (origA[idx + 1] === 0 ? 1 : 0) + (origA[idx - w] === 0 ? 1 : 0) + (origA[idx + w] === 0 ? 1 : 0);
        if (nTrans > 0) {
          const p = idx * 4;
          const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          if (lum > 195) d[p + 3] = 0;
          else d[p + 3] = Math.round(d[p + 3] * (nTrans >= 2 ? 0.45 : 0.72));
        }
      }
    }
    c.putImageData(imgData, 0, 0);
  }


  // ★rezero_logo.jpg / rezero.jpg：金フチを残して白文字内部だけ 赤/金/虹 へ着色生成★
  function processYakumonoLogo(img0) {
    try {
      const img = img0;
      const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
      const scale = Math.min(1, 1200 / Math.max(iw, ih));
      const w = Math.max(10, Math.round(iw * scale));
      const h = Math.max(10, Math.round(ih * scale));
      const baseCv = document.createElement('canvas'); baseCv.width = w; baseCv.height = h;
      const bc = baseCv.getContext('2d');
      bc.imageSmoothingEnabled = true; bc.imageSmoothingQuality = 'high';
      bc.drawImage(img, 0, 0, w, h);
      applyCleanWhiteCutout(bc, w, h, 228, false);
      const trimmed = trimTransparentCanvas(baseCv, 4);
      yakumono.white = trimmed.toDataURL('image/png');

      const tw = trimmed.width, th = trimmed.height;
      const baseData = trimmed.getContext('2d').getImageData(0, 0, tw, th);

      function makeVariant(mode) {
        const cv = document.createElement('canvas'); cv.width = tw; cv.height = th;
        const c = cv.getContext('2d');
        const out = c.createImageData(tw, th);
        const s = baseData.data, d = out.data;
        const stops = [
          [244, 114, 182], [250, 204, 21], [74, 222, 128], [56, 189, 248], [192, 132, 252], [251, 113, 133]
        ];
        for (let y = 0; y < th; y++) {
          const vy = y / Math.max(1, th - 1);
          for (let x = 0; x < tw; x++) {
            const p = (y * tw + x) * 4;
            const r = s[p], g = s[p + 1], b = s[p + 2], a = s[p + 3];
            d[p] = r; d[p + 1] = g; d[p + 2] = b; d[p + 3] = a;
            if (a < 180) continue;
            const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            // 金フチ(彩度高)と黒縁(暗部)は保護し、白文字内部だけ着色
            if (mn > 195 && (mx - mn) < 34) {
              const lum = (r + g + b) / 765;
              if (mode === 'red') {
                d[p]     = Math.min(255, Math.round((255 - vy * 35) * lum));
                d[p + 1] = Math.round((155 - vy * 125) * lum);
                d[p + 2] = Math.round((145 - vy * 120) * lum);
              } else if (mode === 'gold') {
                d[p]     = Math.min(255, Math.round(255 * lum));
                d[p + 1] = Math.round((245 - vy * 70) * lum);
                d[p + 2] = Math.round((185 - vy * 155) * lum);
              } else if (mode === 'rainbow') {
                const t = ((x / Math.max(1, tw)) * 1.15 + vy * 0.25) % 1;
                const pos = t * (stops.length - 1);
                const i0 = Math.floor(pos), i1 = Math.min(stops.length - 1, i0 + 1), f = pos - i0;
                const cr = stops[i0][0] + (stops[i1][0] - stops[i0][0]) * f;
                const cg = stops[i0][1] + (stops[i1][1] - stops[i0][1]) * f;
                const cb = stops[i0][2] + (stops[i1][2] - stops[i0][2]) * f;
                d[p]     = Math.min(255, Math.round((cr * 0.86 + 38) * lum));
                d[p + 1] = Math.min(255, Math.round((cg * 0.86 + 38) * lum));
                d[p + 2] = Math.min(255, Math.round((cb * 0.86 + 38) * lum));
              }
            }
          }
        }
        c.putImageData(out, 0, 0);
        return cv.toDataURL('image/png');
      }

      yakumono.red = makeVariant('red');
      yakumono.gold = makeVariant('gold');
      yakumono.rainbow = makeVariant('rainbow');

      const el = document.getElementById('yakumonoLogoImg');
      if (el && !el.src) el.src = yakumono.white;
    } catch (e) {}
  }

  function processPremiaFrame(img) {
    try {
      const scale = Math.min(1, 960 / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, w, h);
      const imgData = c.getImageData(0, 0, w, h);
      const d = imgData.data;
      for (let i = 0; i < w * h; i++) {
        const p = i * 4;
        const r = d[p], g = d[p + 1], b = d[p + 2];
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
        const sat = mx - mn;
        if (mx < 58 && sat < 24) d[p + 3] = 0;
        else if (mx < 90 && sat < 28) d[p + 3] = Math.round(((mx - 58) / 32) * 200);
      }
      c.putImageData(imgData, 0, 0);
      return cv.toDataURL('image/png');
    } catch (e) { return img.src; }
  }

  function trimTransparentCanvas(srcCv, pad = 3) {
    const w = srcCv.width, h = srcCv.height;
    const d = srcCv.getContext('2d').getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 20) {
          if (x < minX) minX = x; if (x > maxX) maxX = x;
          if (y < minY) minY = y; if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return srcCv;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
    const out = document.createElement('canvas');
    out.width = maxX - minX + 1; out.height = maxY - minY + 1;
    out.getContext('2d').drawImage(srcCv, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  }

  function processSingleImage(img, maxDim = 960, { softFlame = false, trim = false } = {}) {
    try {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, w, h);
      applyCleanWhiteCutout(c, w, h, softFlame ? 226 : 230, softFlame);
      return (trim ? trimTransparentCanvas(cv, 4) : cv).toDataURL('image/png');
    } catch (e) { return img.src; }
  }

  function processDigitsGrid(img) {
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      const fullCv = document.createElement('canvas'); fullCv.width = W; fullCv.height = H;
      const fc = fullCv.getContext('2d'); fc.drawImage(img, 0, 0);
      const fd = fc.getImageData(0, 0, W, H).data;

      let midY = Math.round(H * 0.5), bestRowScore = -1;
      for (let y = Math.round(H * 0.44); y <= Math.round(H * 0.56); y++) {
        let whiteCnt = 0;
        for (let x = 0; x < W; x += 2) { const p = (y * W + x) * 4; if (fd[p] > 235 && fd[p + 1] > 235 && fd[p + 2] > 235) whiteCnt++; }
        if (whiteCnt > bestRowScore) { bestRowScore = whiteCnt; midY = y; }
      }

      const rows = [{ y0: 0, y1: midY }, { y0: midY, y1: H }];
      let num = 1;
      rows.forEach(row => {
        const xs = [0];
        [0.25, 0.50, 0.75].forEach(ratio => {
          let bestX = Math.round(W * ratio), bestColScore = -1;
          for (let x = Math.round(W * (ratio - 0.045)); x <= Math.round(W * (ratio + 0.045)); x++) {
            let whiteCnt = 0;
            for (let y = row.y0; y < row.y1; y += 2) { const p = (y * W + x) * 4; if (fd[p] > 235 && fd[p + 1] > 235 && fd[p + 2] > 235) whiteCnt++; }
            if (whiteCnt > bestColScore) { bestColScore = whiteCnt; bestX = x; }
          }
          xs.push(bestX);
        });
        xs.push(W);

        for (let col = 0; col < 4; col++) {
          const sx = xs[col], sw = Math.max(10, xs[col + 1] - sx);
          const sy = row.y0, sh = Math.max(10, row.y1 - sy);
          const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
          const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
          c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
          applyCleanWhiteCutout(c, sw, sh, 228, false);
          digits[num++] = trimTransparentCanvas(cv, 3).toDataURL('image/png');
        }
      });
      if (typeof refreshAllDigitDisplays === 'function') refreshAllDigitDisplays();
    } catch (e) {}
  }

  function processWedding9Grid(img) {
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cw = W / 3, ch = H / 3;
      const mx = Math.max(3, Math.round(cw * 0.018)), my = Math.max(3, Math.round(ch * 0.020));
      const sw = Math.max(10, Math.round(cw - mx * 2)), sh = Math.max(10, Math.round(ch - my * 2));
      for (let idx = 0; idx < 9; idx++) {
        const col = idx % 3, row = Math.floor(idx / 3);
        const sx = Math.round(col * cw + mx), sy = Math.round(row * ch + my);
        const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
        const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
        wedding9Frames[idx] = cv.toDataURL('image/jpeg', 0.92);
      }
    } catch (e) {}
  }

  function processPeteGrid(img) {
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cw = W / 3, ch = H / 2;
      const mx = Math.round(cw * 0.042), my = Math.round(ch * 0.048);
      const sw = Math.max(10, Math.round(cw - mx * 2)), sh = Math.max(10, Math.round(ch - my * 2));
      for (let idx = 0; idx < 6; idx++) {
        if (peteFrames[idx]) continue;
        const col = idx % 3, row = Math.floor(idx / 3);
        const sx = Math.round(col * cw + mx), sy = Math.round(row * ch + my);
        const outW = Math.min(640, Math.round(sw * 1.4)), outH = Math.min(640, Math.round(sh * 1.4));
        const cv = document.createElement('canvas'); cv.width = outW; cv.height = outH;
        const c = cv.getContext('2d'); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
        if (idx <= 3) applyCleanWhiteCutout(c, outW, outH, 226, false);
        c.save(); c.globalCompositeOperation = 'destination-in';
        const rad = Math.max(outW, outH) * 0.62;
        const g = c.createRadialGradient(outW * 0.5, outH * 0.44, rad * 0.50, outW * 0.5, outH * 0.46, rad);
        g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.80, 'rgba(0,0,0,0.96)'); g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g; c.fillRect(0, 0, outW, outH); c.restore();
        peteFrames[idx] = cv.toDataURL('image/png');
      }
    } catch (e) {}
  }

  function tryLoadList(list, onSuccess) {
    let i = 0;
    function next() {
      if (i >= list.length) return;
      const src = list[i++];
      const img = new Image();
      img.onload = () => onSuccess(img, src);
      img.onerror = next;
      img.src = src;
    }
    next();
  }

  function preloadAll() {
    // ★v7.1 ロゴ役物（ファイル名ゆれ両対応）★
    tryLoadList(['rezero_logo.jpg', 'rezero_logo.png', 'rezero.jpg', 'rezero.png'], processYakumonoLogo);

    tryLoadList(['onigakari.jpg', 'onigakari.png'], (_img, src) => { onigakariSrc = src; });
    tryLoadList(['rem_lamp.jpg', 'rem_lamp.png'], (img) => {
      remLampUrl = processSingleImage(img, 920);
      const r1 = document.getElementById('remLampImg'), r2 = document.getElementById('oniRemApproachImg');
      if (r1) r1.src = remLampUrl; if (r2) r2.src = remLampUrl;
      const r3 = document.getElementById('railRemImg'); if (r3) r3.src = remLampUrl;
      if (typeof syncRushStages === 'function') syncRushStages();
    });
    tryLoadList(['botan.jpg', 'botan.png'], (img) => {
      botanUrl = processSingleImage(img, 680);
      ['brainBotanImg', 'reachBotanImg', 'uniBotanImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = botanUrl; });
    });
    tryLoadList(['pete.jpg', 'pete.png'], (img) => { processPeteGrid(img); if (typeof syncRushStages === 'function') syncRushStages(); });

    tryLoadList(['zugara.jpg', 'zugara.png', 'digits.jpg', 'digits.png'], processDigitsGrid);
    tryLoadList(['0.jpg', '0.png'], (img) => { digits[0] = processSingleImage(img, 540, { softFlame: true, trim: true }); });

    tryLoadList(['premia.jpg', 'premia.png'], (img) => {
      premiaFrameUrl = processPremiaFrame(img);
      const pf = document.getElementById('premiaFrameImg');
      if (pf) pf.src = premiaFrameUrl;
    });

    tryLoadList(['oni_rush.jpg', 'oni_rush.png', 'onigakarirush.webp'], (img) => { logos.oniRush = processSingleImage(img, 920, { trim: true }); });
    tryLoadList(['oni_6000.jpg', 'oni_6000.png', 'onigakari6000.webp'], (img) => { logos.oni6000 = processSingleImage(img, 920, { softFlame: true, trim: true }); });
    tryLoadList(['nougahurueru.jpg', 'logo_brain_rush.jpg'], (img) => { logos.brainRush = processSingleImage(img, 880, { trim: true }); });
    tryLoadList(['wedding.jpg', 'logo_wedding.jpg'], (img) => { logos.wedding = processSingleImage(img, 920, { trim: true }); });
    tryLoadList(['hurueru6000.jpg', 'logo_brain_6000.jpg'], (img) => { logos.brain6000 = processSingleImage(img, 880, { softFlame: true, trim: true }); });
    tryLoadList(['rezero bonus.jpg', 'rezero_bonus.jpg'], (img) => { logos.rezeroChain = processSingleImage(img, 880, { trim: true }); });
    tryLoadList(['pete rezero bonus.jpg', 'pete_rezero_bonus.jpg'], (img) => { logos.rezeroPurple = processSingleImage(img, 880, { trim: true }); });
    tryLoadList(['hurueru.jpg', 'logo_furueru.jpg'], (img) => {
      logos.furueru = processSingleImage(img, 840, { softFlame: true, trim: true });
      const fImg = document.getElementById('brainFurueruImg'); if (fImg) fImg.src = logos.furueru;
    });

    tryLoadList(['wedding1.jpg', 'wedding1.png'], (_img, src) => { wedding.bg1 = src; });
    tryLoadList(['gensitu.jpg', 'gensitu.png'], (img) => { wedding.gensitu = processSingleImage(img, 920, { trim: true }); });
    tryLoadList(['wedding9.jpg', 'wedding9.png'], processWedding9Grid);
    tryLoadList(['wedding_stairs.jpg', 'kaidan.jpg'], (_img, src) => { wedding.stairs = src; });
    tryLoadList(['wedding_arch.jpg', 'hana.jpg'], (_img, src) => { wedding.arch = src; });
    tryLoadList(['wed_botan.jpg', 'wedding_btn.jpg'], (_img, src) => { wedding.btn = src; });
    tryLoadList(['wedding_onigakari.jpg', 'wed_onigakari.jpg'], (_img, src) => { wedding.onigakari = src; });

    tryLoadList(['v1500.jpg', 'v1500.png'], (img) => { vstock.v1500 = processSingleImage(img, 820, { trim: true }); });
    tryLoadList(['v300.jpg', 'v300.png'], (img) => { vstock.v300 = processSingleImage(img, 820, { trim: true }); });
    tryLoadList(['1500.jpg', '1500.png'], (_img, src) => { vstock.bg1500 = src; });
    tryLoadList(['300.jpg', '300.png'], (_img, src) => { vstock.bg300 = src; });
    tryLoadList(['restart.jpg', 'restart.png'], (_img, src) => { vstock.restart = src; });
    tryLoadList(['niziiro.jpg', 'niziiro.png'], (_img, src) => { vstock.niziiro = src; });
    tryLoadList(['oni_haikei.jpg', 'oni_haikei.png'], (_img, src) => { vstock.oniHaikei = src; const el = document.getElementById('oniHaikeiImg'); if (el) el.src = src; });
  }

  setTimeout(preloadAll, 10);

  return {
    getYakumono: (col = 'white') => yakumono[col] || yakumono.white,
    getOnigakari: () => onigakariSrc,
    getRemLamp: () => remLampUrl,
    getBotan: () => botanUrl,
    getPremiaFrame: () => premiaFrameUrl,
    getPeteFrame: (i) => peteFrames[Math.max(0, Math.min(5, i))] || null,
    hasPete: () => peteFrames.some(Boolean),
    getDigit: (n) => digits[n] || null,
    hasDigits: () => !!digits[1],
    getLogo: (key) => logos[key] || null,
    getWedding: (key) => wedding[key] || null,
    getWedding9: () => wedding9Frames.filter(Boolean),
    getVStock: (key) => vstock[key] || null
  };
})();

// -------------------------------------------------------------------------
// 3. v7.0 追加CSS（画像斜め引き裂き / niziiro背景ズーム / V一体表示）
// -------------------------------------------------------------------------
if (!document.getElementById('v70-fx-css')) {
  const st = document.createElement('style');
  st.id = 'v70-fx-css';
  st.textContent = `
    @keyframes niziiroZoomPulse {
      0%   { transform: scale(1.02) rotate(0deg); filter: brightness(1.22) saturate(1.15); }
      50%  { transform: scale(1.12) rotate(1.2deg); filter: brightness(1.06) saturate(1.22); }
      100% { transform: scale(1.02) rotate(0deg); filter: brightness(1.22) saturate(1.15); }
    }
    @keyframes ripHalfTop {
      0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
      18%  { transform: translate(-2%, -2%) rotate(-1.2deg); opacity: 1; }
      100% { transform: translate(-22%, -92%) rotate(-14deg); opacity: 0; }
    }
    @keyframes ripHalfBot {
      0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
      18%  { transform: translate(2%, 2%) rotate(1.2deg); opacity: 1; }
      100% { transform: translate(22%, 92%) rotate(14deg); opacity: 0; }
    }
    @keyframes ripSlashLine {
      0%   { opacity: 0; transform: rotate(-11deg) scaleX(0); }
      20%  { opacity: 1; transform: rotate(-11deg) scaleX(1.25); }
      70%  { opacity: 0.95; transform: rotate(-11deg) scaleX(1.25); }
      100% { opacity: 0; transform: rotate(-11deg) scaleX(1.35); }
    }
    @keyframes bonusVSlam {
      0%   { opacity: 0; transform: scale(2.1) rotate(-8deg); filter: brightness(2.4); }
      45%  { opacity: 1; transform: scale(0.94) rotate(2deg); filter: brightness(1.3); }
      75%  { opacity: 1; transform: scale(1.03) rotate(0deg); filter: brightness(1.1); }
      100% { opacity: 1; transform: scale(1.00) rotate(0deg); filter: brightness(1.0); }
    }
    .fx-niziiro-bg { animation: niziiroZoomPulse 5.5s ease-in-out infinite; }
    .rip-half-top {
      position: absolute; inset: 0;
      clip-path: polygon(0 0, 100% 0, 100% 41%, 0 59%);
      animation: ripHalfTop 0.82s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .rip-half-bot {
      position: absolute; inset: 0;
      clip-path: polygon(0 59%, 100% 41%, 100% 100%, 0 100%);
      animation: ripHalfBot 0.82s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    }
    .rip-slash-beam {
      position: absolute; left: -15%; right: -15%; top: 49%; height: 10px; z-index: 40;
      background: linear-gradient(90deg, transparent, #ffffff 18%, #fef08a 50%, #ffffff 82%, transparent);
      box-shadow: 0 0 24px 8px rgba(254, 240, 138, 0.95), 0 0 48px 14px rgba(244, 114, 182, 0.8);
      animation: ripSlashLine 0.56s ease-out forwards;
    }
    .bonus-v-slam { animation: bonusVSlam 0.48s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  `;
  document.head.appendChild(st);
}

// -------------------------------------------------------------------------
// 4. サラサラキラキラ専用Canvas（高画質＋裏画面完全停止）
// -------------------------------------------------------------------------
const SoftSparkle = (() => {
  const cv = document.getElementById('softSparkleCanvas');
  const ctx = cv.getContext('2d');
  let w = window.innerWidth, h = window.innerHeight, running = false, rafId = null;
  const motes = [];
  const PALETTE = ['#ffffff', '#fef9c3', '#e0f2fe', '#fef3c7', '#fae8ff'];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function initMotes() {
    motes.length = 0;
    for (let i = 0; i < 88; i++) {
      motes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.24, vy: -(0.14 + Math.random() * 0.36),
        r: 0.9 + Math.random() * 2.1, phase: Math.random() * Math.PI * 2,
        twinkleSpd: 0.026 + Math.random() * 0.048, isStar: Math.random() < 0.34,
        color: PALETTE[i % PALETTE.length]
      });
    }
  }
  function draw() {
    if (!running || document.hidden) { rafId = null; return; }
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.x += m.vx + Math.sin(m.phase * 0.5) * 0.14; m.y += m.vy; m.phase += m.twinkleSpd;
      if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
      if (m.x < -12) m.x = w + 12; if (m.x > w + 12) m.x = -12;
      const alpha = 0.22 + Math.max(0, Math.sin(m.phase)) * 0.74;
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.fillStyle = m.color; ctx.shadowColor = m.color; ctx.shadowBlur = m.isStar ? 10 : 6;
      if (m.isStar) {
        const len = m.r * 3.8;
        ctx.strokeStyle = m.color; ctx.lineWidth = 0.95;
        ctx.beginPath(); ctx.moveTo(m.x - len, m.y); ctx.lineTo(m.x + len, m.y);
        ctx.moveTo(m.x, m.y - len); ctx.lineTo(m.x, m.y + len); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    rafId = requestAnimationFrame(draw);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && running && !rafId) rafId = requestAnimationFrame(draw);
  });
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

// -------------------------------------------------------------------------
// 5. 動的ステージ背景Canvas（通常時ステージ廃止・深紅×黄金統一＋裏画面停止）
// -------------------------------------------------------------------------
const StageBg = (() => {
  const cv = document.getElementById('stageBgCanvas');
  const ctx = cv.getContext('2d');
  let w = 360, h = 360, angle = 0, rafId = null, lastT = 0;
  const K = 2;   // 30fps化に伴う動き補正

  const goldShards = Array.from({ length: 26 }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.009, vy: -(0.004 + Math.random() * 0.011), sz: 4 + Math.random() * 8.5, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.16, isKanji: i % 6 === 0, color: i % 3 === 0 ? '#fef9c3' : i % 3 === 1 ? '#facc15' : '#f59e0b' }));
  const rays = Array.from({ length: 20 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), spd: 0.018 + Math.random() * 0.026, len: 0.14 + Math.random() * 0.24 }));
  const remShards = Array.from({ length: 22 }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.006, vy: (Math.random() - 0.5) * 0.007, sz: 3.5 + Math.random() * 9, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.11, color: ['#e879f9', '#d946ef', '#38bdf8', '#f472b6', '#ffffff', '#a855f7'][i % 6] }));

  function resize() {
    const rect = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.max(100, rect.width); h = Math.max(100, rect.height);
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawMagicCircle(cx, cy, radius, color, rot, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.6;
    ctx.shadowColor = color; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 2); ctx.stroke();
    for (let k = 0; k < 2; k++) {
      ctx.beginPath();
      for (let i = 0; i < 3; i++) { const a = (Math.PI * 2 * i) / 3 + (k * Math.PI / 3); const x = Math.cos(a) * radius * 0.92, y = Math.sin(a) * radius * 0.92; i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.closePath(); ctx.stroke();
    }
    ctx.restore();
  }
  function drawUnseenTendrils(t, pulse) {
    ctx.save(); ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const left = i % 2 === 0, startX = left ? -10 : w + 10, baseY = h * (0.18 + (i % 3) * 0.28);
      ctx.beginPath(); ctx.moveTo(startX, baseY);
      const dir = left ? 1 : -1, reach = w * (0.28 + Math.sin(t * 2.1 + i) * 0.08 + pulse * 0.06);
      ctx.bezierCurveTo(startX + dir * reach * 0.45, baseY + Math.sin(t * 3.0 + i * 1.4) * 38, startX + dir * reach * 0.85, baseY + Math.cos(t * 2.5 + i) * 44, startX + dir * reach, baseY + Math.sin(t * 1.9 + i * 2) * 28);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(232, 121, 249, 0.44)' : 'rgba(147, 51, 234, 0.56)';
      ctx.shadowColor = '#d946ef'; ctx.shadowBlur = 8;
      ctx.lineWidth = 10 + pulse * 5; ctx.stroke();
    }
    ctx.restore();
  }

  function tick(ts) {
    if (document.hidden) { rafId = null; return; }
    if (ts && ts - lastT < 30) { rafId = requestAnimationFrame(tick); return; }   // 約30fps
    lastT = ts || 0;
    const pulse = (typeof BgmEngine !== 'undefined') ? BgmEngine.consumePulse() : 0;
    const isCut = (typeof BgmEngine !== 'undefined') ? BgmEngine.isCut() : false;
    const ph = (typeof state !== 'undefined') ? state.phase : 'NORMAL';
    const sc = (typeof state !== 'undefined') ? state.activeScene : 'normal';
    const rm = (typeof state !== 'undefined') ? state.rushMode : 'onigakari';
    const frozen = (isCut && ph === 'ANIMATING') || ((window.__timeStopUntil || 0) > performance.now());
    if (!frozen) angle += (0.006 + pulse * 0.012) * K;

    const cx = w * 0.52, cy = h * 0.50;
    ctx.clearRect(0, 0, w, h);

    if (ph === 'RUSH' || (ph === 'ANIMATING' && sc === 'rush-idle')) {
      if (rm === 'onigakari') {
        const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.78);
        bg.addColorStop(0, `rgba(245, 158, 11, ${0.62 + pulse * 0.25})`);
        bg.addColorStop(0.42, `rgba(180, 40, 12, ${0.80 + pulse * 0.14})`);
        bg.addColorStop(1, 'rgba(30, 8, 4, 0.96)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.globalAlpha = 0.16 + pulse * 0.08; ctx.fillStyle = '#fef08a';
        ctx.font = `900 ${Math.round(Math.min(w, h) * 0.74)}px "Shippori Mincho", serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('鬼', cx, cy + 8); ctx.restore();
        drawMagicCircle(cx, cy, 122 + pulse * 14, '#fde047', angle * 1.4, 0.26 + pulse * 0.14);
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * (1 + pulse * 0.95) * K; if (r.r > 1.25) { r.r = 0.05; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.80, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 2 === 0 ? '#fef08a' : '#f59e0b'; ctx.globalAlpha = Math.min(0.88, r.r * 0.88); ctx.lineWidth = idx % 3 === 0 ? 3.0 : 1.6;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        goldShards.forEach(s => {
          if (!frozen) { s.x += s.vx * K; s.y += s.vy * (1 + pulse * 0.7) * K; s.rot += s.vrot * K; if (s.y < -0.08) { s.y = 1.08; s.x = Math.random(); } if (s.x < -0.08) s.x = 1.08; if (s.x > 1.08) s.x = -0.08; }
          ctx.save(); ctx.translate(s.x * w, s.y * h); ctx.rotate(s.rot); ctx.fillStyle = s.color; ctx.shadowColor = '#facc15'; ctx.shadowBlur = 0;
          if (s.isKanji) { ctx.globalAlpha = 0.66; ctx.font = `900 ${Math.round(s.sz * 2.2)}px "Shippori Mincho", serif`; ctx.fillText('鬼', -s.sz, s.sz); }
          else { ctx.globalAlpha = 0.86; ctx.fillRect(-s.sz, -s.sz * 0.45, s.sz * 2, s.sz * 0.9); }
          ctx.restore();
        });
      } else if (rm === 'brain') {
        const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.76);
        bg.addColorStop(0, `rgba(192, 38, 211, ${0.46 + pulse * 0.30})`); bg.addColorStop(0.48, `rgba(88, 28, 135, ${0.76 + pulse * 0.14})`); bg.addColorStop(1, 'rgba(14, 3, 24, 0.98)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * (1.2 + pulse) * K; if (r.r > 1.2) { r.r = 0.08; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.78, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 3 === 0 ? '#f0abfc' : idx % 3 === 1 ? '#e11d48' : '#a855f7'; ctx.globalAlpha = Math.min(0.75, r.r * 0.75); ctx.lineWidth = idx % 2 === 0 ? 2.2 : 1.3;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1; drawUnseenTendrils(angle * 4, pulse);
      } else {
        const bg = ctx.createRadialGradient(cx, cy * 0.82, 14, cx, cy, Math.max(w, h) * 0.82);
        bg.addColorStop(0, `rgba(217, 70, 239, ${0.45 + pulse * 0.24})`); bg.addColorStop(0.42, `rgba(88, 28, 135, ${0.80 + pulse * 0.14})`); bg.addColorStop(0.78, 'rgba(18, 24, 62, 0.92)'); bg.addColorStop(1, 'rgba(8, 6, 26, 0.98)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        drawMagicCircle(cx, cy * 0.88, 122 + pulse * 14, '#e879f9', -angle * 1.1, 0.24 + pulse * 0.14);
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * 0.95 * K; if (r.r > 1.25) { r.r = 0.06; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.82, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 3 === 0 ? '#38bdf8' : idx % 3 === 1 ? '#f0abfc' : '#f472b6'; ctx.globalAlpha = Math.min(0.74, r.r * 0.74); ctx.lineWidth = idx % 3 === 0 ? 2.4 : 1.5;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        remShards.forEach(s => {
          if (!frozen) { s.x += s.vx * K; s.y += s.vy * K; s.rot += s.vrot * K; if (s.y < -0.05) s.y = 1.05; if (s.y > 1.05) s.y = -0.05; if (s.x < -0.05) s.x = 1.05; if (s.x > 1.05) s.x = -0.05; }
          ctx.save(); ctx.translate(s.x * w, s.y * h); ctx.rotate(s.rot); ctx.fillStyle = s.color; ctx.shadowColor = s.color; ctx.shadowBlur = 0; ctx.globalAlpha = 0.78;
          ctx.beginPath(); ctx.moveTo(0, -s.sz); ctx.lineTo(s.sz * 0.65, 0); ctx.lineTo(0, s.sz); ctx.lineTo(-s.sz * 0.65, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        });
      }
    } else {
      const bg = ctx.createRadialGradient(cx, cy * 0.90, 14, cx, cy, Math.max(w, h) * 0.82);
      bg.addColorStop(0, '#441118'); bg.addColorStop(0.62, '#1d070c'); bg.addColorStop(1, '#0b0306');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 138 + pulse * 36);
      aura.addColorStop(0, 'rgba(250, 204, 21, 0.34)'); aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
      drawMagicCircle(cx, cy, 114 + pulse * 8, '#facc15', angle * 0.75, 0.24 + pulse * 0.14);
      // ---- v7.1 通常時の密度アップ ----
      ctx.save(); ctx.globalAlpha = 0.07 + pulse * 0.03; ctx.fillStyle = '#fef08a';
      ctx.font = `900 ${Math.round(Math.min(w, h) * 0.80)}px "Shippori Mincho", serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('鬼', cx, cy + 8); ctx.restore();
      drawMagicCircle(cx, cy, 168 + pulse * 10, '#f59e0b', -angle * 0.55, 0.17 + pulse * 0.08);
      const maxD = Math.max(w, h) * 0.78;
      for (let i = 0; i < 9; i++) {
        const r = rays[i];
        r.r += r.spd * 0.45 * K; if (r.r > 1.2) { r.r = 0.08; r.a = Math.random() * Math.PI * 2; }
        const r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
        ctx.strokeStyle = i % 2 ? '#fef08a' : '#f59e0b'; ctx.globalAlpha = Math.min(0.30, r.r * 0.30); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (let i = 0; i < 16; i++) {
        const sh = goldShards[i];
        sh.x += sh.vx * 0.6 * K; sh.y += sh.vy * 0.5 * K; sh.rot += sh.vrot * 0.5 * K;
        if (sh.y < -0.08) { sh.y = 1.08; sh.x = Math.random(); } if (sh.x < -0.08) sh.x = 1.08; if (sh.x > 1.08) sh.x = -0.08;
        ctx.save(); ctx.translate(sh.x * w, sh.y * h); ctx.rotate(sh.rot); ctx.fillStyle = sh.color; ctx.globalAlpha = 0.5;
        ctx.fillRect(-sh.sz * 0.6, -sh.sz * 0.25, sh.sz * 1.2, sh.sz * 0.5); ctx.restore();
      }
    }
    rafId = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !rafId) rafId = requestAnimationFrame(tick); });
  window.addEventListener('resize', resize); setTimeout(resize, 40); rafId = requestAnimationFrame(tick);
  return { resize };
})();
// -------------------------------------------------------------------------
// 6. 最前面FX Canvas（リッチ画質＋裏画面完全停止）
// -------------------------------------------------------------------------
const FxCanvas = (() => {
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');
  let w = 360, h = 360, ambientMode = 'ember', rafId = null;
  const particles = [], rings = [], bolts = [], cracks = [];
  let glassBreakState = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(100, rect.width); h = Math.max(100, rect.height);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function clearAll() { particles.length = 0; rings.length = 0; bolts.length = 0; cracks.length = 0; glassBreakState = null; ctx.clearRect(0, 0, w, h); }
  function pushParticle(p) { if (particles.length < 180) particles.push(p); }
  function spawnRing(color = '#ef4444', maxR = 280, lw = 8) { rings.push({ x: w / 2, y: h / 2, r: 12, maxR, color, lw, alpha: 1 }); }
  function spawnLightning(color = '#fde047', count = 5) {
    for (let n = 0; n < count; n++) {
      const pts = []; let x = Math.random() * w, y = 0; pts.push({ x, y });
      for (let i = 1; i <= 7; i++) { x += (Math.random() - 0.5) * 86; y = (h / 7) * i; pts.push({ x, y }); }
      bolts.push({ pts, color, alpha: 1 });
    }
  }
  function spawnPurpleHands(count = 32) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 0 : w;
      pushParticle({ type: 'spark', x: side + (side === 0 ? -5 : 5), y: Math.random() * h, vx: (side === 0 ? 1 : -1) * (2.4 + Math.random() * 4.0), vy: (Math.random() - 0.5) * 1.4, size: 3.2 + Math.random() * 4.5, color: i % 3 === 0 ? '#e879f9' : '#7e22ce', alpha: 0.94, decay: 0.018 });
    }
  }
  function spawnRedCracks() {
    cracks.length = 0; const cx = w * 0.5, cy = h * 0.5;
    for (let b = 0; b < 7; b++) {
      const baseA = (Math.PI * 2 * b) / 7 + (Math.random() - 0.5) * 0.4;
      const pts = [{ x: cx, y: cy }]; let px = cx, py = cy;
      for (let s = 1; s <= 6; s++) { const len = 24 + Math.random() * 28, a = baseA + (Math.random() - 0.5) * 0.7; px += Math.cos(a) * len; py += Math.sin(a) * len; pts.push({ x: px, y: py }); }
      cracks.push({ pts, progress: 0 });
    }
  }
  function clearCracks() { cracks.length = 0; }

  function triggerGlassShatter() {
    const cx = w * 0.5, cy = h * 0.5, maxR = Math.hypot(w, h) * 0.75;
    const raysList = [], numRays = 20;
    for (let i = 0; i < numRays; i++) {
      const baseA = (Math.PI * 2 * i) / numRays + (Math.random() - 0.5) * 0.16;
      const pts = [{ x: cx, y: cy }]; let r = 0, a = baseA;
      while (r < maxR) { r += 24 + Math.random() * 38; a += (Math.random() - 0.5) * 0.14; pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }); }
      raysList.push({ pts, width: 2.2 + Math.random() * 4.0 });
    }
    const ringsList = [0.20, 0.42, 0.68].map(scale => {
      const pts = [];
      for (let i = 0; i <= numRays; i++) { const a = (Math.PI * 2 * i) / numRays; const rr = maxR * scale * (0.85 + Math.random() * 0.30); pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr }); }
      return pts;
    });
    glassBreakState = { rays: raysList, rings: ringsList, alpha: 1.0, flash: 0.92, age: 0 };
  }

  function burstGold(count = 54) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2.4 + Math.random() * 6.8;
      pushParticle({ type: 'confetti', x: w * 0.5, y: h * 0.48, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.0, size: 4 + Math.random() * 5.2, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.25, color: ['#fffbeb', '#fef08a', '#facc15', '#f59e0b', '#fb7185'][i % 5], alpha: 1, decay: 0.012 + Math.random() * 0.008 });
    }
  }
  function burstRainbow(count = 72) {
    const colors = ['#fffbeb', '#fef08a', '#f472b6', '#c084fc', '#7dd3fc', '#6ee7b7', '#facc15'];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 2.6 + Math.random() * 7.6;
      pushParticle({ type: i % 3 === 0 ? 'spark' : 'confetti', x: w * 0.5, y: h * 0.48, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.2, size: 3.8 + Math.random() * 5.2, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.28, color: colors[i % colors.length], alpha: 1, decay: 0.011 + Math.random() * 0.008 });
    }
  }
  function burstFlames(count = 44) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.8 + Math.random() * 5.6;
      pushParticle({ type: 'spark', x: w * 0.5, y: h * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 2.5 + Math.random() * 4.5, color: ['#ef4444', '#f97316', '#fde047'][i % 3], alpha: 1, decay: 0.020 + Math.random() * 0.014 });
    }
  }
  function spawnFeathers(count = 28) {
    for (let i = 0; i < count; i++) {
      pushParticle({ type: 'feather', x: Math.random() * w, y: -15 - Math.random() * h * 0.45, vx: (Math.random() - 0.5) * 1.1, vy: 0.9 + Math.random() * 1.5, size: 7 + Math.random() * 6, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.04, sway: Math.random() * Math.PI * 2, color: i % 3 === 0 ? '#fef08a' : '#ffffff', alpha: 0.95, decay: 0.005 });
    }
  }

  function tick() {
    if (document.hidden) { rafId = null; return; }
    if ((window.__timeStopUntil || 0) > performance.now()) { rafId = requestAnimationFrame(tick); return; }
    ctx.clearRect(0, 0, w, h);

    if (ambientMode === 'ember' && particles.length < 22 && Math.random() < 0.34) {
      pushParticle({ type: 'spark', x: Math.random() * w, y: h + 8, vx: (Math.random() - 0.5) * 0.5, vy: -(0.7 + Math.random() * 1.3), size: 1.6 + Math.random() * 2.2, color: Math.random() < 0.55 ? '#facc15' : '#fb923c', alpha: 0.65, decay: 0.008 });
    } else if (ambientMode === 'wedding' && particles.length < 44 && Math.random() < 0.36) {
      spawnFeathers(1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
      if (p.alpha <= 0 || p.y < -60 || p.y > h + 60) { particles.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.max(0, p.alpha); ctx.fillStyle = p.color;
      if (p.type === 'spark') {
        ctx.shadowColor = p.color; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'confetti') {
        p.vy += 0.12; p.rot += p.vrot;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
      } else if (p.type === 'feather') {
        p.sway += 0.05; p.x += Math.sin(p.sway) * 0.85; p.rot += p.vrot;
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.shadowColor = '#fef08a'; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.32, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += (r.maxR - r.r) * 0.16 + 4; r.alpha -= 0.036;
      if (r.alpha <= 0 || r.r >= r.maxR) { rings.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.max(0, r.alpha); ctx.strokeStyle = r.color; ctx.shadowColor = r.color; ctx.shadowBlur = 14; ctx.lineWidth = r.lw * r.alpha;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.alpha -= 0.08;
      if (b.alpha <= 0) { bolts.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = b.alpha; ctx.strokeStyle = b.color; ctx.shadowColor = b.color; ctx.shadowBlur = 14; ctx.lineWidth = 3.2;
      ctx.beginPath(); b.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); ctx.restore();
    }
    if (cracks.length > 0) {
      cracks.forEach(cr => {
        cr.progress = Math.min(cr.pts.length - 1, cr.progress + 0.34);
        const maxIdx = Math.floor(cr.progress);
        ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 10; ctx.lineWidth = 2.8;
        ctx.beginPath(); ctx.moveTo(cr.pts[0].x, cr.pts[0].y); for (let i = 1; i <= maxIdx; i++) ctx.lineTo(cr.pts[i].x, cr.pts[i].y); ctx.stroke(); ctx.restore();
      });
    }

    if (glassBreakState) {
      const g = glassBreakState; g.age++;
      if (g.flash > 0) { ctx.save(); ctx.fillStyle = `rgba(255,255,255,${g.flash})`; ctx.fillRect(0, 0, w, h); ctx.restore(); g.flash = Math.max(0, g.flash - 0.14); }
      ctx.save(); ctx.globalAlpha = g.alpha; ctx.fillStyle = 'rgba(0,0,0,0.48)'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#020205'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      g.rays.forEach(r => { ctx.lineWidth = r.width * 2.1; ctx.beginPath(); r.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); });
      g.rings.forEach(ring => { ctx.lineWidth = 3.5; ctx.beginPath(); ring.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); });
      ctx.strokeStyle = '#f8fafc'; ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 6;
      g.rays.forEach(r => { ctx.lineWidth = r.width * 0.72; ctx.beginPath(); r.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); });
      g.rings.forEach(ring => { ctx.lineWidth = 1.4; ctx.beginPath(); ring.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); });
      ctx.restore();
      if (g.age > 26) { g.alpha -= 0.06; if (g.alpha <= 0) glassBreakState = null; }
    }

    rafId = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !rafId) rafId = requestAnimationFrame(tick); });
  window.addEventListener('resize', resize); setTimeout(resize, 40); rafId = requestAnimationFrame(tick);
  return { resize, clearAll, setAmbient: m => { ambientMode = m; }, spawnRing, spawnLightning, spawnPurpleHands, spawnRedCracks, clearCracks, triggerGlassShatter, burstGold, burstRainbow, burstFlames, spawnFeathers };
})();

// -------------------------------------------------------------------------
// 7. タイミング制御＆v7.0 筐体DOM参照
// -------------------------------------------------------------------------
let seqToken = 0;

function wait(ms, token = seqToken) {
  return new Promise((resolve, reject) => { setTimeout(() => { token !== seqToken ? reject('CANCELLED') : resolve(); }, Math.max(55, ms)); });
}
function waitFreeze(ms, token = seqToken) {
  return new Promise((resolve, reject) => { setTimeout(() => { token !== seqToken ? reject('CANCELLED') : resolve(); }, ms); });
}

let promoInterruptResolver = null;
function canInterruptPromotion() { return typeof promoInterruptResolver === 'function'; }
function interruptPromotionByOk() {
  if (typeof promoInterruptResolver === 'function') { const fn = promoInterruptResolver; promoInterruptResolver = null; fn('OK_INTERRUPT'); return true; }
  return false;
}
function waitInterruptible(ms, token = seqToken) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => { if (done) return; done = true; promoInterruptResolver = null; token !== seqToken ? reject('CANCELLED') : resolve('TIMEOUT'); }, Math.max(80, ms));
    promoInterruptResolver = (reason) => { if (done) return; done = true; clearTimeout(timer); promoInterruptResolver = null; token !== seqToken ? reject('CANCELLED') : resolve(reason); };
  });
}

let uniBotanTapResolver = null;
function canTapUniBotan() { return typeof uniBotanTapResolver === 'function'; }
function triggerUniBotanTap() {
  if (typeof uniBotanTapResolver === 'function') { const fn = uniBotanTapResolver; uniBotanTapResolver = null; fn('TAPPED'); return true; }
  return false;
}

const ambientBgLayer = document.getElementById('ambientBgLayer');
const sunburstLayer = document.getElementById('sunburstLayer');
const globalBlackoutCurtain = document.getElementById('globalBlackoutCurtain');
const globalRainbowFlash = document.getElementById('globalRainbowFlash');
const globalCutinOverlay = document.getElementById('globalCutinOverlay');
const weddingCinemaOverlay = document.getElementById('weddingCinemaOverlay');
const pageShakeTargets = [document.querySelector('header'), document.querySelector('main')].filter(Boolean);

const cabinetShell = document.getElementById('cabinetShell');
const cabinetRemGlow = document.getElementById('cabinetRemGlow');
const logoPocketShadow = document.getElementById('logoPocketShadow');
const yakumonoLogoWrap = document.getElementById('yakumonoLogoWrap');
const yakumonoLogoImg = document.getElementById('yakumonoLogoImg');
const yakumonoRail = document.getElementById('yakumonoRail');
const lcdBox = document.getElementById('lcdBox');
const railRemEl = document.getElementById('railRem');
const lcdNiziiroBackLayer = document.getElementById('lcdNiziiroBackLayer');
const lcdOnigakariOverlay = document.getElementById('lcdOnigakariOverlay');

const lcdFrame = document.getElementById('lcdFrame');
const slashHost = document.getElementById('slashHost');
const premiaFrameOverlay = document.getElementById('premiaFrameOverlay');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const crtScanLayer = document.getElementById('crtScanLayer');
const fsLogoWrap = document.getElementById('fsLogoWrap');
const fsLogoImg = document.getElementById('fsLogoImg');
const fsSub = document.getElementById('fsSub');
const fsMain = document.getElementById('fsMain');
const fsExtra = document.getElementById('fsExtra');

const rushMetaHud = document.getElementById('rushMetaHud');
const hudRushRemain = document.getElementById('hudRushRemain');
const hudVStockBadge = document.getElementById('hudVStockBadge');
const res4Dots = document.querySelectorAll('.res4-dot');

const oniRushStage = document.getElementById('oniRushStage');
const oniRemApproachWrap = document.getElementById('oniRemApproachWrap');
const oniRemApproachImg = document.getElementById('oniRemApproachImg');
const oniReels = [0,1,2].map(i => document.getElementById(`oniReel${i}`));

const brainRushStage = document.getElementById('brainRushStage');
const brainPetePositions = [document.getElementById('brainPetePos0'), document.getElementById('brainPetePos1')];
const brainPeteImgs = [document.getElementById('brainPeteImg0'), document.getElementById('brainPeteImg1')];
const brainBotanImg = document.getElementById('brainBotanImg');
const brainBotanRing = document.getElementById('brainBotanRing');
const brainBotanGlow = document.getElementById('brainBotanGlow');
const brainTextSwarm = document.getElementById('brainTextSwarm');
const brainEvoFlash = document.getElementById('brainEvoFlash');
const brainFurueruOverlay = document.getElementById('brainFurueruOverlay');
const brainFurueruImg = document.getElementById('brainFurueruImg');
let brainPeteSlot = 0;

const remRushStage = document.getElementById('remRushStage');
const remLampOuter = document.getElementById('remLampOuter');
const remLampImg = document.getElementById('remLampImg');
const remHornGlow = document.getElementById('remHornGlow');
const remDigitsLayer = document.getElementById('remDigitsLayer');
const remReels = [0,1,2].map(i => document.getElementById(`remReel${i}`));

const rushTopBadge = document.getElementById('rushTopBadge');
const hiddenRemBadge = document.getElementById('hiddenRemBadge');
const rushNoiseVeil = document.getElementById('rushNoiseVeil');

const scenePanes = { normal: document.getElementById('scene-normal'), reach: document.getElementById('scene-reach'), 'rush-idle': document.getElementById('scene-rush-idle'), bonus: document.getElementById('scene-bonus') };

const reachActorBg = document.getElementById('reachActorBg');
const reachActorImg = document.getElementById('reachActorImg');
const reelBoxes = [0,1,2].map(i => document.getElementById(`reelBox${i}`));
const reelNums = [0,1,2].map(i => document.getElementById(`reelNum${i}`));
const pushButtonArea = document.getElementById('pushButtonArea');
const btnOniPush = document.getElementById('btnOniPush');
const reachBotanImg = document.getElementById('reachBotanImg');
const reachBotanRing = document.getElementById('reachBotanRing');
const reachBotanGlow = document.getElementById('reachBotanGlow');
const reachBotanText = document.getElementById('reachBotanText');
const btnSecretOk = document.getElementById('btnSecretOk');

const universalBotanOverlay = document.getElementById('universalBotanOverlay');
const uniBotanLabel = document.getElementById('uniBotanLabel');
const btnUniBotanTap = document.getElementById('btnUniBotanTap');
const uniBotanImg = document.getElementById('uniBotanImg');
const uniBotanRing = document.getElementById('uniBotanRing');
const uniBotanGlow = document.getElementById('uniBotanGlow');
const uniBotanHint = document.getElementById('uniBotanHint');
if (btnUniBotanTap) btnUniBotanTap.addEventListener('click', () => triggerUniBotanTap());

const bonusLogoWrap = document.getElementById('bonusLogoWrap');
const bonusLogoImg = document.getElementById('bonusLogoImg');
const bonusSubLabel = document.getElementById('bonusSubLabel');
const bonusMainTitle = document.getElementById('bonusMainTitle');
const bonusCountNum = document.getElementById('bonusCountNum');
const bonusDesc = document.getElementById('bonusDesc');
const subtleWhisperSlot = document.getElementById('subtleWhisperSlot');
const subtleWhisperText = document.getElementById('subtleWhisperText');

const lampRippleHost = document.getElementById('lampRippleHost');
const lampStatusText = document.getElementById('lampStatusText');
const reserveLabel = document.getElementById('reserveLabel');
const resSlots = [0,1,2,3,4].map(i => document.getElementById(`resSlot${i}`));

let remTestOverride = false, brainTestOverride = false, oniTestOverride = false;

// -------------------------------------------------------------------------
// 8. ★v7.0 役物落下・色変化・背面niziiro・筐体イルミネーション制御★
// -------------------------------------------------------------------------
// =========================================================================
// 8. 役物モジュール（ロゴ＝レール常時表示→液晶中央へ落下／レム＝レール内発光）
//    発光の強さ上限は index.html の CSS で制御（chance .25 / hit .40 / premium .50）
// =========================================================================
const Yakumono = (() => {
  const REST = 'translateX(-50%) translateY(0px) scale(1)';
  const DUR = 760, IMPACT_MS = 290;      // 落下全体 / 着地までの時間（落下SEと同期）
  const geo = { dy: 200, scale: 2.2 };
  let dropAnim = null, backAnim = null, dropped = false;

  const pose = (y, s) => `translateX(-50%) translateY(${y}px) scale(${s})`;

  // レール上のロゴ中心 → 液晶中心 までの距離と、液晶幅の約55%になる拡大率を実測
  function measure() {
    if (!yakumonoLogoWrap || !lcdBox || !yakumonoRail) return;
    const logoCy = yakumonoRail.offsetTop + yakumonoLogoWrap.offsetTop + yakumonoLogoWrap.offsetHeight / 2;
    const lcdCy = lcdBox.offsetTop + lcdBox.offsetHeight / 2;
    const imgW = (yakumonoLogoImg && yakumonoLogoImg.offsetWidth) || 108;
    geo.dy = Math.max(60, lcdCy - logoCy);
    geo.scale = Math.max(1.0, Math.min(3.2, (lcdBox.offsetWidth * 0.68) / imgW));
  }
  function dropFrames(g = geo) {
    const { dy, scale } = g;
    return [
      { transform: pose(0, 1), offset: 0, easing: 'cubic-bezier(.5,0,.95,.6)' },
      { transform: pose(dy, scale * 1.22), offset: 0.38, easing: 'cubic-bezier(.2,.6,.4,1)' },   // 着地：一瞬つぶれて大きく
      { transform: pose(dy - 34, scale * 1.04), offset: 0.52, easing: 'cubic-bezier(.5,0,.9,.6)' },
      { transform: pose(dy, scale * 1.10), offset: 0.66, easing: 'ease-out' },
      { transform: pose(dy - 11, scale), offset: 0.80, easing: 'ease-in' },
      { transform: pose(dy, scale), offset: 1 }
    ];
  }
  // 着地の衝撃：フラッシュ(不透明度上限.34)＋衝撃波リング＋筐体シェイク（transform/opacityのみ）
  function impactFx(color) {
    if (!lcdBox) return;
    const col = color === 'rainbow' ? '254,240,138' : color === 'gold' ? '250,204,21' : '239,68,68';
    const flash = document.createElement('div');
    flash.style.cssText = `position:absolute;inset:0;z-index:33;pointer-events:none;background:rgb(${col});opacity:0`;
    const ring = document.createElement('div');
    ring.style.cssText = `position:absolute;left:50%;top:50%;width:120px;height:120px;margin:-60px 0 0 -60px;z-index:33;pointer-events:none;border-radius:50%;border:5px solid rgba(${col},.95);opacity:0`;
    lcdBox.appendChild(flash); lcdBox.appendChild(ring);
    flash.animate([{ opacity: 0.34 }, { opacity: 0 }], { duration: 240, easing: 'ease-out' }).onfinish = () => flash.remove();
    ring.animate([{ transform: 'scale(.3)', opacity: 0.95 }, { transform: 'scale(3.4)', opacity: 0 }], { duration: 580, easing: 'cubic-bezier(.1,.7,.3,1)' }).onfinish = () => ring.remove();
    if (cabinetShell) cabinetShell.animate([
      { transform: 'translate(0,0)' }, { transform: 'translate(-7px,4px)' }, { transform: 'translate(6px,-4px)' },
      { transform: 'translate(-4px,3px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(0,0)' }
    ], { duration: 440 });
  }
  // 時間停止：ロゴ・CSSアニメ・背景/パーティクルのCanvasを一瞬止める（着地の余韻）
  function holdTime(ms) {
    window.__timeStopUntil = performance.now() + ms;
    document.documentElement.classList.add('time-stop');
    const a = dropAnim; if (a) { try { a.pause(); } catch (e) {} }
    setTimeout(() => {
      document.documentElement.classList.remove('time-stop');
      if (a && dropAnim === a) { try { a.play(); } catch (e) {} }
    }, ms);
  }
  function stopAnims() {
    [dropAnim, backAnim].forEach(a => { if (a) { try { a.cancel(); } catch (e) {} } });
    dropAnim = backAnim = null;
  }
  function setRemGlow(cls = '') { if (cabinetRemGlow) cabinetRemGlow.className = cls; }

  function setColor(color = 'white') {
    if (!yakumonoLogoWrap || !yakumonoLogoImg) return;
    const src = Assets.getYakumono(color === 'chance' ? 'white' : color);
    if (src && yakumonoLogoImg.src !== src) yakumonoLogoImg.src = src;
    yakumonoLogoWrap.classList.remove('yakumono-red', 'yakumono-gold', 'yakumono-rainbow', 'yakumono-off', 'yakumono-chance');
    if (color === 'red') yakumonoLogoWrap.classList.add('yakumono-red');
    else if (color === 'gold') yakumonoLogoWrap.classList.add('yakumono-gold');
    else if (color === 'rainbow') yakumonoLogoWrap.classList.add('yakumono-rainbow');
    else if (color === 'off') yakumonoLogoWrap.classList.add('yakumono-off');
    else if (color === 'chance') yakumonoLogoWrap.classList.add('yakumono-chance');
  }

  // 落下→着地(バウンド)→保持→レールへ滑らかに戻る
  function release() {
    if (!yakumonoLogoWrap) return;
    if (!dropped) { if (logoPocketShadow) logoPocketShadow.classList.remove('pocket-open'); return; }
    dropped = false;
    const from = getComputedStyle(yakumonoLogoWrap).transform;       // 現在位置から戻す
    stopAnims();
    backAnim = yakumonoLogoWrap.animate(
      [{ transform: (from && from !== 'none') ? from : pose(geo.dy, geo.scale) }, { transform: REST }],
      { duration: 480, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    const me = backAnim;
    me.onfinish = () => {
      if (backAnim !== me) return;
      try { me.cancel(); } catch (e) {}
      backAnim = null;
      yakumonoLogoWrap.classList.remove('yakumono-dropped');
      if (logoPocketShadow) logoPocketShadow.classList.remove('pocket-open');
    };
  }

  async function drop({ color = 'rainbow', holdMs = 1150, withNiziiroBack = false, withSound = true, landOffset = 0, scaleMul = 1, onImpact = null, timeStop = 0, token = seqToken } = {}) {
    if (!yakumonoLogoWrap) return;
    stopAnims();
    setColor(color);
    measure();
    if (logoPocketShadow) logoPocketShadow.classList.add('pocket-open');
    yakumonoLogoWrap.classList.add('yakumono-dropped');
    dropped = true;
    dropAnim = yakumonoLogoWrap.animate(dropFrames({ dy: geo.dy + landOffset, scale: Math.max(1, geo.scale * scaleMul) }), { duration: DUR, fill: 'forwards' });

    if (withSound) StudioAudio.playYakumonoDrop(color);

    // 着地の瞬間に 発光・パーティクル・筐体の揺れ・虹背景(同時)・時間停止
    setTimeout(() => {
      if (!dropped) return;
      if (withNiziiroBack) setLcdNiziiroBack(true, { instant: true });
      if (onImpact) { try { onImpact(); } catch (e) { console.error('onImpact', e); } }
      if (timeStop > 0) setTimeout(() => holdTime(timeStop), 90);
      impactFx(color);
      if (cabinetShell) { cabinetShell.classList.add('shake-burst'); setTimeout(() => cabinetShell.classList.remove('shake-burst'), 520); }
      try { if (navigator && navigator.vibrate) navigator.vibrate(color === 'rainbow' ? [65, 30, 95] : [50, 25, 50]); } catch (e) {}
      if (color === 'rainbow') { setCabinetGlow('rainbow'); FxCanvas.burstRainbow(68); FxCanvas.spawnRing('#fef08a', 320, 9); }
      else if (color === 'gold') { setCabinetGlow('gold'); FxCanvas.burstGold(48); FxCanvas.spawnRing('#facc15', 280, 8); }
      else if (color === 'red') { setCabinetGlow('red'); FxCanvas.burstFlames(40); FxCanvas.spawnRing('#ef4444', 260, 8); }
    }, IMPACT_MS);

    if (holdMs > 0) {
      await wait(Math.max(holdMs, DUR + 80) + timeStop, token);     // 最低でもバウンド完了まで見せる
      resetYakumono(color === 'rainbow' ? 'rainbow' : 'white');
    }
  }

  // 違和感：ロゴとレムが小さく揺れる
  function shake() {
    if (!yakumonoLogoWrap || dropped) return Promise.resolve();
    const j = x => ({ transform: `translateX(calc(-50% + ${x}px)) translateY(0px) scale(1)` });
    const a = yakumonoLogoWrap.animate([j(0), j(-3), j(3), j(-2), j(2), j(0)], { duration: 380, easing: 'linear' });
    if (railRemEl) railRemEl.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(6deg)' }, { transform: 'rotate(-3deg)' }, { transform: 'rotate(0deg)' }], { duration: 380 });
    setRemGlow('rem-glow-strobe'); setTimeout(() => setRemGlow(''), 380);
    return a.finished.then(() => {}, () => {});
  }

  // 落下フェイント：全体を少しだけ下げて戻す（落ちかけて戻る。音・揺れなし）
  let lastFeintAt = 0;
  function canFeint() { return !dropped && yakumonoLogoWrap && (performance.now() - lastFeintAt) > 22000; }
  function feint() {
    if (!canFeint()) return Promise.resolve(false);
    lastFeintAt = performance.now();
    const f = (y, sc) => ({ transform: `translateX(calc(-50% + 0px)) translateY(${y}px) scale(${sc})` });
    const a = yakumonoLogoWrap.animate([f(0, 1), f(20, 1.03), f(20, 1.03), f(0, 1)],
      { duration: 900, offset: [0, .38, .55, 1], easing: 'cubic-bezier(.4,0,.3,1)' });
    return a.finished.then(() => true, () => true);
  }

  // 統一入口： 'idle' | 'chance' | 'iwakan' | 'hit' | 'premium' | 'off'
  function fire(kind, opts = {}) {
    switch (kind) {
      case 'idle':    release(); setColor('white'); setCabinetGlow('idle'); return;
      case 'chance':  setColor('chance'); setRemGlow('rem-glow-slow'); return;
      case 'iwakan':  return shake();
      case 'hit':     return drop({ color: 'gold', holdMs: 900, ...opts });
      case 'premium': return drop({ color: 'rainbow', holdMs: 1100, withNiziiroBack: true, ...opts });
      case 'off':     setCabinetGlow('off'); return;
    }
  }
  return { measure, setColor, setRemGlow, drop, release, shake, feint, canFeint, fire, isDropped: () => dropped };
})();

// 既存の呼び出し名を維持（game.js / effects.js の呼び出しは無変更）
function setYakumonoColor(color = 'white') { Yakumono.setColor(color); }
function resetYakumono(color = 'white') { Yakumono.release(); Yakumono.setColor(color); }
async function triggerYakumonoDrop(opts = {}) { return Yakumono.drop(opts); }

function setLcdNiziiroBack(on, { instant = false } = {}) {
  if (!lcdNiziiroBackLayer) return;
  lcdNiziiroBackLayer.classList.toggle('niziiro-instant', !!(on && instant));
  const src = Assets.getVStock('niziiro');
  if (on && src) {
    if (!lcdNiziiroBackLayer.querySelector('img')) {
      lcdNiziiroBackLayer.innerHTML = `<img src="${src}" class="w-full h-full object-cover fx-niziiro-bg opacity-75" alt=""><div class="absolute inset-0" style="background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.66) 0%,rgba(0,0,0,.46) 48%,rgba(0,0,0,.12) 100%)"></div>`;
    }
    lcdNiziiroBackLayer.classList.remove('hidden');
  } else {
    lcdNiziiroBackLayer.classList.add('hidden');
  }
}

// 発光：液晶の縁（CSS側で上限）＋レール内レムの丸い光のみ。液晶面には被せない
function setCabinetGlow(mode = 'idle') {
  if (cabinetShell) cabinetShell.classList.remove('cabinet-blackout', 'cabinet-red-glow', 'cabinet-rem-glow', 'cabinet-rainbow-glow', 'cabinet-gold-glow');
  Yakumono.setRemGlow('');
  const add = c => { if (cabinetShell) cabinetShell.classList.add(c); };
  if (mode === 'off')            { add('cabinet-blackout'); Yakumono.setColor('off'); }
  else if (mode === 'red')       { add('cabinet-red-glow'); Yakumono.setRemGlow('rem-glow-red'); }
  else if (mode === 'gold')      { add('cabinet-gold-glow'); }
  else if (mode === 'rem')       { add('cabinet-rem-glow'); Yakumono.setRemGlow('rem-glow-rem'); }
  else if (mode === 'rem-slow')  { add('cabinet-rem-glow'); Yakumono.setRemGlow('rem-glow-slow'); }
  else if (mode === 'rem-strobe'){ add('cabinet-rem-glow'); Yakumono.setRemGlow('rem-glow-strobe'); }
  else if (mode === 'rainbow')   { add('cabinet-rainbow-glow'); Yakumono.setRemGlow('rem-glow-rainbow'); }
}

// -------------------------------------------------------------------------
// 9. 3D図柄レンダラー（zugara.jpg 1〜8 + 0.jpg）
// -------------------------------------------------------------------------
let lastNormalVals = [7, 3, 7], lastOniVals = [8, 3, 4], lastRemVals = [3, 4, 7];

function clampDigit08(v) {
  const n = parseInt(v, 10);
  if (isNaN(n)) return 7;
  if (n === 0) return 0;
  return ((Math.abs(n) - 1) % 8) + 1;
}

function renderDigitIntoEl(containerEl, val, imgClass, fallbackCls) {
  if (!containerEl) return;
  const n = clampDigit08(val);
  const url = Assets.getDigit(n);
  if (url) {
    let img = containerEl.querySelector('img');
    if (!img) { containerEl.textContent = ''; img = document.createElement('img'); img.className = imgClass; containerEl.appendChild(img); }
    if (img.src !== url) img.src = url;
    img.alt = String(n);
  } else {
    containerEl.innerHTML = `<span class="${fallbackCls}">${n}</span>`;
  }
}

function setReels(a, b, c, { spinning = [false, false, false], tenpai = false } = {}) {
  lastNormalVals = [a, b, c];
  [a, b, c].forEach((v, i) => {
    const fb = `text-4xl sm:text-5xl font-black ${v % 2 === 1 ? 'gold-grad-text' : 'crimson-grad-text'}`;
    renderDigitIntoEl(reelNums[i], v, 'normal-digit-img', fb);
    reelNums[i].className = `w-full h-full flex items-center justify-center${spinning[i] ? ' reel-spinning' : ''}`;
    reelBoxes[i].classList.toggle('reel-tenpai', tenpai && (i === 0 || i === 2));
  });
}
function randomMissReels() {
  const a = Math.floor(Math.random() * 8) + 1, b = Math.floor(Math.random() * 8) + 1;
  let c = Math.floor(Math.random() * 8) + 1; if (a === c) c = (c % 8) + 1;
  setReels(a, b, c);
}

function setOniReels(a, b, c, { spinning = false, hitLock = false, tenpaiSide = false, midSpin = false } = {}) {
  lastOniVals = [a, b, c];
  [a, b, c].forEach((v, i) => {
    const el = oniReels[i]; if (!el) return;
    const sizeCls = i === 1 ? 'oni-digit-mid' : 'oni-digit-side';
    const fb = `text-5xl font-black ${v === 0 || v % 2 === 1 ? 'gold-grad-text' : 'cyan-grad-text'}`;
    renderDigitIntoEl(el, v, 'oni-digit-img', fb);
    const isSpin = spinning || (midSpin && i === 1);
    const isSideLock = tenpaiSide && (i === 0 || i === 2);
    el.className = `oni-digit-slot ${sizeCls}${isSpin ? ' oni-reel-spin' : ''}${hitLock ? ' oni-digit-hit-lock' : ''}${isSideLock ? ' oni-digit-tenpai-side' : ''}`;
  });
}
function randomOniMissReels(spinning = false) {
  const a = Math.floor(Math.random() * 8) + 1, b = Math.floor(Math.random() * 8) + 1;
  let c = Math.floor(Math.random() * 8) + 1; if (a === c) c = (c % 8) + 1;
  setOniReels(a, b, c, { spinning });
}

function setRemReels(a, b, c, { spinning = false, hitLock = false } = {}) {
  lastRemVals = [a, b, c];
  [a, b, c].forEach((v, i) => {
    const el = remReels[i]; if (!el) return;
    const sizeCls = i === 1 ? 'rem-digit-mid' : 'rem-digit-side';
    const fb = `text-5xl font-black ${v === 0 || v % 2 === 1 ? 'gold-grad-text' : 'cyan-grad-text'}`;
    renderDigitIntoEl(el, v, 'rem-digit-img', fb);
    el.className = `oni-digit-slot ${sizeCls}${spinning ? ' oni-reel-spin' : ''}${hitLock ? ' oni-digit-hit-lock' : ''}`;
  });
}
function randomRemMissReels(spinning = false) {
  const a = Math.floor(Math.random() * 8) + 1, b = Math.floor(Math.random() * 8) + 1;
  let c = Math.floor(Math.random() * 8) + 1; if (a === c) c = (c % 8) + 1;
  setRemReels(a, b, c, { spinning });
}

function refreshAllDigitDisplays() {
  setReels(...lastNormalVals); setOniReels(...lastOniVals); setRemReels(...lastRemVals);
}

function pickRushRuleDigit(bonusType, hadNotice = false) {
  const evens = [2, 4, 6, 8];
  if (bonusType === 'BONUS_300') return evens[Math.floor(Math.random() * evens.length)];
  if (bonusType === 'BONUS_1500') return Math.random() < 0.5 ? 1 : 5;
  if (hadNotice && Math.random() < 0.24) return evens[Math.floor(Math.random() * evens.length)];
  if (Math.random() < 0.14 && Assets.getDigit(0)) return 0;
  if (Math.random() < 0.56) return 7;
  if (Math.random() < 0.84) return 3;
  return Math.random() < 0.5 ? 1 : 5;
}

// -------------------------------------------------------------------------
// 10. ボーナス背景一体表示＆最前面「本物の画像斜め引き裂き」
// -------------------------------------------------------------------------
function ensureBonusBgLayer() {
  const pane = scenePanes.bonus;
  if (!pane) return null;
  let layer = document.getElementById('bonusCustomBgLayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'bonusCustomBgLayer';
    layer.className = 'pointer-events-none absolute inset-0 z-0 overflow-hidden hidden';
    pane.style.position = 'relative';
    pane.insertBefore(layer, pane.firstChild);
    Array.from(pane.children).forEach(ch => {
      if (ch !== layer && !ch.classList.contains('absolute')) {
        ch.style.position = 'relative';
        ch.style.zIndex = '5';
      }
    });
  }
  return layer;
}

function setBonusSceneBackdrop(kind = null) {
  const layer = ensureBonusBgLayer();
  if (!layer) return;
  if (!kind) { layer.classList.add('hidden'); layer.innerHTML = ''; return; }
  if (kind === '300' && Assets.getVStock('bg300')) {
    layer.innerHTML = `<img src="${Assets.getVStock('bg300')}" class="w-full h-full object-cover opacity-88" alt=""><div class="absolute inset-0 bg-black/32"></div>`;
    layer.classList.remove('hidden');
  } else if (kind === '1500' && Assets.getVStock('bg1500')) {
    layer.innerHTML = `<img src="${Assets.getVStock('bg1500')}" class="w-full h-full object-cover opacity-88" alt=""><div class="absolute inset-0 bg-black/30"></div>`;
    layer.classList.remove('hidden');
  } else if (kind === 'niziiro' && Assets.getVStock('niziiro')) {
    layer.innerHTML = `<img src="${Assets.getVStock('niziiro')}" class="w-full h-full object-cover fx-niziiro-bg opacity-92" alt=""><div class="absolute inset-0 bg-black/26"></div>`;
    layer.classList.remove('hidden');
  } else if (kind === 'restart' && Assets.getVStock('restart')) {
    const src = Assets.getVStock('restart');
    const feather = 'style="-webkit-mask-image:radial-gradient(ellipse at 50% 50%,#000 58%,transparent 100%);mask-image:radial-gradient(ellipse at 50% 50%,#000 58%,transparent 100%)"';
    const N = 7;
    const strips = Array.from({ length: N }, (_, i) => `<img data-rs="${i}" src="${src}" ${feather} class="absolute inset-0 w-full h-full object-contain" style="clip-path:inset(${(i / N * 100).toFixed(2)}% 0 ${(100 - (i + 1) / N * 100).toFixed(2)}% 0);opacity:0" alt="">`).join('');
    layer.innerHTML = `
      <div class="absolute inset-0 bg-black"></div>
      <div id="rsZoom" class="absolute inset-0">
        <img id="rsBase" src="${src}" ${feather} class="absolute inset-0 w-full h-full object-contain" style="opacity:0" alt="Re:Start">
        ${strips}
      </div>
      <div id="rsHeart" class="absolute inset-0" style="background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 38%,rgba(170,0,24,.62) 100%);opacity:0"></div>
      <div id="rsScan" class="absolute inset-0" style="background:repeating-linear-gradient(0deg,rgba(255,255,255,.07) 0 1px,rgba(0,0,0,0) 1px 3px);opacity:.9"></div>
      <div id="rsBar" class="absolute left-0 right-0" style="top:0;height:15%;background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.42) 45%,rgba(120,200,255,.28) 55%,rgba(255,255,255,0));opacity:0"></div>`;
    layer.classList.remove('hidden');
    try {
      const q = id => layer.querySelector('#' + id);
      // 巻き戻しの横ノイズ帯が2回走る
      q('rsBar').animate([{ transform: 'translateY(-110%)', opacity: 1 }, { transform: 'translateY(700%)', opacity: 1 }], { duration: 560, iterations: 2, easing: 'linear' });
      // 画像が横ずれした帯から元の位置へ戻る（巻き戻って揃う）
      layer.querySelectorAll('img[data-rs]').forEach((el, i) => {
        const dx = (Math.random() < .5 ? -1 : 1) * (28 + Math.random() * 70);
        el.animate([{ transform: `translateX(${dx}px)`, opacity: 0 }, { transform: `translateX(${dx * .35}px)`, opacity: 1, offset: .45 }, { transform: 'translateX(0)', opacity: 1 }],
          { duration: 680, delay: 280 + i * 45, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
      });
      q('rsBase').animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 1250, fill: 'forwards' });
      q('rsZoom').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }], { duration: 4200, delay: 900, easing: 'ease-out', fill: 'forwards' });
      q('rsHeart').animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: .2, offset: .35 }, { opacity: .85, offset: .55 }, { opacity: 0 }], { duration: 1150, delay: 1100, iterations: Infinity });
    } catch (e) { console.error('restart rewind', e); }
  } else {
    layer.classList.add('hidden'); layer.innerHTML = '';
  }
}

function setBonusLogo(logoKey) {
  let url = null, isV = false;
  if (logoKey === 'v300') { url = Assets.getVStock('v300'); isV = true; }
  else if (logoKey === 'v1500') { url = Assets.getVStock('v1500'); isV = true; }
  else if (logoKey) { url = Assets.getLogo(logoKey); }

  if (url && bonusLogoWrap && bonusLogoImg) {
    bonusLogoImg.src = url;
    bonusLogoImg.className = isV ? 'bonus-v-big' : 'logo-alive-img bonus-logo-img';
    void bonusLogoImg.offsetWidth;
    bonusLogoWrap.classList.remove('hidden');
    if (isV) fireVImpactShake();
    return true;
  }
  if (bonusLogoWrap) bonusLogoWrap.classList.add('hidden');
  return false;
}

// V登場時の迫力：着地で画面と本体がドンと揺れ、リングが走る（transformのみ）
function fireVImpactShake() {
  try {
    setTimeout(() => {
      if (bonusLogoWrap) bonusLogoWrap.animate([
        { transform: 'translate(0,0)' }, { transform: 'translate(-9px,5px)' }, { transform: 'translate(8px,-6px)' }, { transform: 'translate(-6px,-3px)' },
        { transform: 'translate(5px,4px)' }, { transform: 'translate(-3px,2px)' }, { transform: 'translate(0,0)' }], { duration: 520, easing: 'ease-out' });
      lcdFrame.classList.add('shake-burst'); setTimeout(() => lcdFrame.classList.remove('shake-burst'), 760);
      FxCanvas.spawnRing('#fef08a', 320, 10);
    }, 190);
  } catch (e) { console.error('fireVImpactShake', e); }
}

function fireImageRipSlash(sourceKind = 'restart') {
  let frontHtml = '';
  if (sourceKind === 'restart' && Assets.getVStock('restart')) {
    const r = Assets.getVStock('restart');
    frontHtml = `<div class="w-full h-full bg-black relative flex items-center justify-center"><img src="${r}" class="relative z-10 w-full h-full object-contain" style="-webkit-mask-image:radial-gradient(ellipse at 50% 50%,#000 58%,transparent 100%);mask-image:radial-gradient(ellipse at 50% 50%,#000 58%,transparent 100%)"><div class="absolute inset-0" style="background:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,0) 40%,rgba(150,0,20,.5) 100%)"></div></div>`;
  } else if (sourceKind === '300' && Assets.getVStock('bg300')) {
    const b = Assets.getVStock('bg300'), v = Assets.getVStock('v300');
    frontHtml = `<div class="w-full h-full bg-black relative flex items-center justify-center"><img src="${b}" class="absolute inset-0 w-full h-full object-cover">${v ? `<img src="${v}" class="relative z-10 max-h-[60%] object-contain">` : ''}</div>`;
  } else if (sourceKind === '1500' && Assets.getVStock('bg1500')) {
    const b = Assets.getVStock('bg1500'), v = Assets.getVStock('v1500');
    frontHtml = `<div class="w-full h-full bg-black relative flex items-center justify-center"><img src="${b}" class="absolute inset-0 w-full h-full object-cover">${v ? `<img src="${v}" class="relative z-10 max-h-[60%] object-contain">` : ''}</div>`;
  } else {
    firePhysicalSplitSlash();
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'pointer-events-none absolute inset-0 z-[90] overflow-hidden';
  wrap.innerHTML = `
    <div class="rip-half-top">${frontHtml}</div>
    <div class="rip-half-bot">${frontHtml}</div>
    <div class="rip-slash-beam"></div>
  `;
  lcdFrame.appendChild(wrap);
  setPageMegaShake(true);
  fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fef08a', 360, 11);
  FxCanvas.spawnLightning('#fef08a', 6);
  FxCanvas.burstRainbow(72);
  FxCanvas.burstFlames(40);
  setTimeout(() => { wrap.remove(); setPageMegaShake(false); }, 880);
}

// -------------------------------------------------------------------------
// 11. 縁外・LED・プレミア枠・ボタン・ステージ一元制御
// -------------------------------------------------------------------------
function setPremiaFrame(on) {
  if (!premiaFrameOverlay) return;
  premiaFrameOverlay.classList.toggle('premia-on', !!on && !!Assets.getPremiaFrame());
}
function setAmbientBg(mode = '') { ambientBgLayer.className = 'fixed inset-0 pointer-events-none z-0' + (mode ? ` bg-mode-${mode}` : ''); }
function setSunburst(on) { sunburstLayer.classList.toggle('hidden', !on); }
function setGlobalBlackout(on) { globalBlackoutCurtain.classList.toggle('hidden', !on); }
function hideGlobalCutin() {
  globalCutinOverlay.classList.add('hidden'); globalCutinOverlay.innerHTML = '';
  if (lcdOnigakariOverlay) { lcdOnigakariOverlay.classList.add('hidden'); lcdOnigakariOverlay.innerHTML = ''; }
}
function setPageMegaShake(on) { pageShakeTargets.forEach(el => el.classList.toggle('page-mega-shake', on)); }

function fireGlobalRainbowFlash() {
  globalRainbowFlash.className = 'fixed inset-0 z-[998] pointer-events-none global-rainbow-burst';
  void globalRainbowFlash.offsetWidth;
  setTimeout(() => { globalRainbowFlash.className = 'hidden fixed inset-0 z-[998] pointer-events-none'; }, 750);
}
function setLed() {}          // 旧サイドLED（v7.1で廃止・互換のため空関数）
function setLedSide() {}

function setReachActor(type = null) {
  if (!reachActorBg || !reachActorImg) return;
  let src = null;
  if (type === 'rem') src = Assets.getRemLamp();
  else if (type === 'pete') src = Assets.getPeteFrame(1) || Assets.getPeteFrame(0);
  if (src) { reachActorImg.src = src; reachActorBg.classList.add('actor-show'); }
  else reachActorBg.classList.remove('actor-show');
}

function applyBotanStyle(imgEl, ringEl, glowEl, { vibe = 'idle', color = '', drop = false, redChassis = false } = {}) {
  if (imgEl) {
    imgEl.className = 'botan-img-base' + (redChassis ? ' botan-red-chassis' : '');
    void imgEl.offsetWidth;
    if (drop) imgEl.classList.add('btn-drop-ochi');
    else if (vibe === 'weak') imgEl.classList.add('btn-vibe-weak');
    else if (vibe === 'mid') imgEl.classList.add('btn-vibe-mid');
    else if (vibe === 'max') imgEl.classList.add('btn-vibe-max');
  }
  if (ringEl) {
    ringEl.className = 'absolute w-[118%] h-[118%] rounded-full pointer-events-none opacity-0';
    if (vibe === 'max' || drop || color === 'rainbow') ringEl.classList.add('btn-ring-rainbow');
    else if (vibe === 'weak' || vibe === 'mid' || color || redChassis) ringEl.classList.add('btn-ring-active');
  }
  if (glowEl) {
    glowEl.className = 'botan-crystal-glow';
    if (redChassis) glowEl.classList.add('botan-glow-red');
    else if (color) glowEl.classList.add(`botan-glow-${color}`);
  }
}
function setReachBotanState(opts) { applyBotanStyle(reachBotanImg, reachBotanRing, reachBotanGlow, opts); }
function setBrainButtonState(vibe = 'idle', color = '') {
  const autoCol = color || (vibe === 'max' ? 'rainbow' : vibe === 'mid' ? 'red' : vibe === 'weak' ? 'purple' : '');
  applyBotanStyle(brainBotanImg, brainBotanRing, brainBotanGlow, { vibe, color: autoCol });
}

function showUniversalBotan({ label = '一撃解放!!', vibe = 'max', color = 'rainbow', drop = false, redChassis = false, interactive = false } = {}) {
  uniBotanLabel.textContent = label;
  uniBotanLabel.className = redChassis
    ? 'text-sm sm:text-base font-black crimson-grad-text tracking-wider drop-shadow pop-in text-center'
    : 'text-xs sm:text-base font-black rainbow-grad-text tracking-wider drop-shadow text-center';
  universalBotanOverlay.classList.remove('hidden');
  universalBotanOverlay.style.pointerEvents = interactive ? 'auto' : 'none';
  if (uniBotanHint) uniBotanHint.classList.toggle('hidden', !interactive);
  applyBotanStyle(uniBotanImg, uniBotanRing, uniBotanGlow, { vibe, color, drop, redChassis });
}
function hideUniversalBotan() {
  uniBotanTapResolver = null;
  universalBotanOverlay.classList.add('hidden');
  universalBotanOverlay.style.pointerEvents = 'none';
  if (uniBotanHint) uniBotanHint.classList.add('hidden');
  applyBotanStyle(uniBotanImg, uniBotanRing, uniBotanGlow, { vibe: 'idle', color: '', redChassis: false });
}
function waitUniversalBotanTap({ label = '鬼がかりチャレンジ!!', vibe = 'weak', color = 'gold', drop = false, redChassis = false, token = seqToken } = {}) {
  showUniversalBotan({ label, vibe, color, drop, redChassis, interactive: true });
  return new Promise((resolve, reject) => {
    uniBotanTapResolver = () => {
      uniBotanTapResolver = null;
      if (token !== seqToken) reject('CANCELLED');
      else resolve();
    };
  });
}

function setVStockBadge(on, isRed = false) {
  if (!hudVStockBadge) return;
  hudVStockBadge.classList.toggle('hidden', !on);
  if (on) {
    hudVStockBadge.textContent = isRed ? '赤V-STOCK' : '青V-STOCK';
    hudVStockBadge.className = isRed
      ? 'px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-red-600 via-amber-500 to-yellow-300 text-slate-950 border border-white shadow-lg animate-pulse'
      : 'px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white border border-sky-200 shadow-lg animate-pulse';
  }
}

function syncRushStages() {
  const isRushIdle = (typeof state !== 'undefined') && state.activeScene === 'rush-idle';
  const inRush = (typeof state !== 'undefined') && (state.phase === 'RUSH' || state.phase === 'ANIMATING');
  const rm = (typeof state !== 'undefined') ? state.rushMode : 'onigakari';

  const showOni = oniTestOverride || (isRushIdle && inRush && rm === 'onigakari');
  const showBrain = brainTestOverride || (isRushIdle && inRush && rm === 'brain');
  const showRem = remTestOverride || (isRushIdle && inRush && rm === 'rem');

  oniRushStage.classList.toggle('hidden', !showOni);
  if (showOni) { const hi = document.getElementById('oniHaikeiImg'), hs = Assets.getVStock('oniHaikei'); if (hi && hs && hi.getAttribute('src') !== hs) hi.src = hs; }
  else oniRushStage.classList.remove('oni-bg-blue', 'oni-bg-dark', 'oni-bg-freeze');
  if (!showOni) oniRemApproachWrap.classList.add('hidden');

  brainRushStage.classList.toggle('hidden', !showBrain);
  if (showBrain) {
    const anyShown = brainPetePositions.some(p => p.classList.contains('pete-shown'));
    if (!anyShown && Assets.hasPete()) setBrainPeteLevel(0, { withFlash: false });
  } else {
    brainTextSwarm.innerHTML = '';
    if (brainFurueruOverlay) brainFurueruOverlay.classList.add('hidden');
    setBrainButtonState('idle');
    brainPetePositions.forEach(p => p.classList.remove('pete-shown'));
  }

  remRushStage.classList.toggle('hidden', !showRem);
  if (!showRem) {
    remHornGlow.classList.remove('horn-on');
    remLampOuter.classList.remove('rem-front-burst');
    if (remDigitsLayer) remDigitsLayer.classList.remove('rem-digits-behind');
  }
}

function clearGlobalChaosEffects() {
  promoInterruptResolver = null;
  uniBotanTapResolver = null;
  SoftSparkle.forceClear();
  setGlobalBlackout(false);
  hideGlobalCutin();
  hideUniversalBotan();
  setPremiaFrame(false);
  setLcdNiziiroBack(false);
  setPageMegaShake(false);
  setSunburst(false);
  resetYakumono('white');
  if (cabinetShell) cabinetShell.classList.remove('cabinet-blackout', 'rail-dim', 'rail-rem-off', 'shake-burst', 'iwakan-rempuru');
  if (weddingCinemaOverlay) { weddingCinemaOverlay.classList.add('hidden'); weddingCinemaOverlay.innerHTML = ''; }
  lcdFrame.classList.remove('fx-rgb-glitch');
  slashHost.innerHTML = '';
}

function showIwakanAnswer(text, isBrainWhisper = false) {
  if (!text) { hideIwakanAnswer(); return; }
  subtleWhisperText.textContent = text;
  if (isBrainWhisper) {
    subtleWhisperSlot.className = 'absolute top-0.5 right-1 px-2.5 py-0.5 rounded-md bg-black/88 border border-purple-400/65 shadow-lg max-w-[82%] z-20';
    subtleWhisperText.className = 'font-mincho text-xs font-semibold text-purple-200 tracking-widest';
    void subtleWhisperSlot.offsetWidth;
    subtleWhisperSlot.classList.add('fx-whisper-in');
  } else {
    subtleWhisperSlot.className = 'absolute top-0.5 right-1 px-2 py-0.5 rounded-md bg-black/85 border border-amber-500/50 shadow-lg max-w-[75%] z-20';
    subtleWhisperText.className = 'font-mincho text-[10px] sm:text-xs font-semibold text-amber-100 tracking-wider';
  }
  subtleWhisperSlot.classList.remove('hidden');
}
function hideIwakanAnswer() { subtleWhisperSlot.classList.add('hidden'); subtleWhisperSlot.classList.remove('fx-whisper-in'); }

function setActiveScene(sceneName) {
  if (typeof state !== 'undefined') state.activeScene = sceneName;
  Object.entries(scenePanes).forEach(([key, el]) => el.classList.toggle('hidden', key !== sceneName));
  if (sceneName !== 'bonus') {
    hideIwakanAnswer(); setBonusLogo(null); setBonusSceneBackdrop(null); bonusCountNum.classList.add('hidden');
    lcdFrame.classList.remove('bonus-theme-brain', 'bonus-theme-rem');
  }
  if (sceneName !== 'reach') { pushButtonArea.classList.add('hidden'); setReachActor(null); }
  if (sceneName !== 'rush-idle') { rushTopBadge.classList.add('hidden'); hiddenRemBadge.classList.add('hidden'); }
  btnSecretOk.classList.toggle('secret-ok-active', sceneName === 'reach' || sceneName === 'rush-idle' || sceneName === 'bonus');
  syncRushStages();
}

function ensureFsNiziiroLayer() {
  let layer = document.getElementById('fsNiziiroBgLayer');
  if (!layer && fullscreenOverlay) {
    layer = document.createElement('div');
    layer.id = 'fsNiziiroBgLayer';
    layer.className = 'pointer-events-none absolute inset-0 z-0 overflow-hidden hidden';
    fullscreenOverlay.insertBefore(layer, fullscreenOverlay.firstChild);
  }
  return layer;
}

function showFullscreenOverlay({ mode = 'blackout', sub = '', main = '', extra = '', logoKey = null, scanlines = false, premia = false }) {
  oniRushStage.classList.add('hidden');
  brainRushStage.classList.add('hidden');
  remRushStage.classList.add('hidden');
  fullscreenOverlay.classList.remove('hidden', 'overlay-blackout', 'overlay-6000', 'overlay-wedding', 'overlay-rainbow');
  crtScanLayer.classList.toggle('hidden', !scanlines);
  setPremiaFrame(premia || mode === 'rainbow');

  const niziLayer = ensureFsNiziiroLayer();
  const niziSrc = Assets.getVStock('niziiro');
  if (niziLayer) {
    if ((mode === 'rainbow' || mode === '6000') && niziSrc) {
      niziLayer.innerHTML = `<img src="${niziSrc}" class="w-full h-full object-cover fx-niziiro-bg" alt=""><div class="absolute inset-0 bg-radial from-transparent via-black/15 to-black/55"></div>`;
      niziLayer.classList.remove('hidden');
    } else {
      niziLayer.classList.add('hidden'); niziLayer.innerHTML = '';
    }
  }

  const logoUrl = logoKey ? Assets.getLogo(logoKey) : null;
  if (logoUrl && fsLogoWrap && fsLogoImg) {
    fsLogoImg.src = logoUrl;
    fsLogoImg.className = 'logo-alive-img fs-logo-img';
    void fsLogoImg.offsetWidth;
    fsLogoWrap.classList.remove('hidden');
  } else if (fsLogoWrap) {
    fsLogoWrap.classList.add('hidden');
  }

  if (mode === 'wedding') {
    fullscreenOverlay.classList.add('overlay-wedding');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-rose-600 mb-1';
    fsMain.className = `relative z-10 font-mincho ${logoUrl ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-4xl'} font-black text-rose-700 tracking-wider leading-snug pop-in px-1`;
    fsExtra.className = 'relative z-10 mt-2 text-xs sm:text-sm font-bold text-rose-900/90 max-w-md';
  } else if (mode === 'rainbow') {
    fullscreenOverlay.classList.add('overlay-rainbow');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.20em] text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] mb-1';
    fsMain.className = `relative z-10 ${logoUrl ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-4xl'} font-black text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.98)] tracking-wider leading-tight pop-in px-1`;
    fsExtra.className = 'relative z-10 mt-1.5 text-[11px] sm:text-xs font-black text-amber-100 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] bg-black/50 px-3 py-1 rounded-full max-w-xs';
  } else if (mode === '6000' || mode === 'gold') {
    fullscreenOverlay.classList.add('overlay-6000');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.20em] text-amber-300 mb-1';
    fsMain.className = `relative z-10 ${logoUrl ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-4xl'} font-black ${mode === '6000' ? 'rainbow-grad-text' : 'gold-grad-text'} tracking-wider leading-tight pop-in px-1`;
    fsExtra.className = 'relative z-10 mt-1.5 text-[11px] sm:text-xs font-bold text-amber-100/95 max-w-xs';
  } else {
    fullscreenOverlay.classList.add('overlay-blackout');
    fsSub.className = 'relative z-10 text-xs font-black tracking-[0.20em] text-rose-500/80 mb-2';
    fsMain.className = 'relative z-10 font-mincho text-xl sm:text-3xl font-black text-rose-100 tracking-widest';
    fsExtra.className = 'relative z-10 mt-2 text-xs text-slate-400';
  }

  fsSub.textContent = sub;
  fsMain.textContent = logoUrl && (main.includes('BONUS') || main.includes('6,000') || main.includes('12,000') || main.includes('RUSH')) ? '' : main;
  fsExtra.textContent = extra;
}

function hideFullscreenOverlay() {
  fullscreenOverlay.classList.add('hidden');
  crtScanLayer.classList.add('hidden');
  if (fsLogoWrap) fsLogoWrap.classList.add('hidden');
  const niziLayer = document.getElementById('fsNiziiroBgLayer');
  if (niziLayer) { niziLayer.classList.add('hidden'); niziLayer.innerHTML = ''; }
  clearGlobalChaosEffects();
  FxCanvas.clearCracks();
  syncRushStages();
}

function updateReserveSlots(mode = 'NORMAL', special = null, targetSlotIdx = 0) {
  if (mode === 'BRAIN') {
    reserveLabel.textContent = '文字保留';
    ['脳', 'が', '震', 'え', 'る'].forEach((ch, i) => {
      const el = resSlots[i]; el.classList.remove('hidden');
      if (special === 'HANDS' && i === 0) { el.textContent = '手'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-fuchsia-300 bg-gradient-to-br from-purple-700 to-fuchsia-950 flex items-center justify-center text-[10px] font-black text-fuchsia-100 shadow-lg shadow-fuchsia-500/80 animate-pulse'; }
      else if (special === 'HIT') { el.textContent = ch; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-amber-300 bg-gradient-to-br from-rose-600 to-purple-800 flex items-center justify-center text-[10px] font-black text-amber-200 shadow-lg animate-pulse'; }
      else if ((special === 'GAZE' || special === 'NOGA') && i < 2) { el.textContent = ch; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-rose-400 bg-rose-950 flex items-center justify-center text-[10px] font-black text-rose-200 shadow shadow-rose-500/70 animate-pulse'; }
      else { el.textContent = ch; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-purple-700/80 bg-purple-950/80 flex items-center justify-center text-[10px] font-black text-purple-300'; }
    });
    return;
  }

  reserveLabel.textContent = '保留';
  resSlots[4].classList.add('hidden');
  const idx = Math.max(0, Math.min(3, targetSlotIdx));
  for (let i = 0; i < 4; i++) {
    const el = resSlots[i];
    if (special === 'ALL_ONI') { el.textContent = '鬼'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-amber-200 bg-gradient-to-br from-red-600 to-amber-700 flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-pulse'; }
    else if (i === idx && special === 'RED') { el.textContent = '鬼'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-rose-200 bg-gradient-to-br from-red-500 to-rose-900 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-red-600/80 animate-pulse'; }
    else if (i === idx && special === 'RAINBOW') { el.textContent = '鬼'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white bg-gradient-to-r from-yellow-300 via-pink-400 to-sky-400 flex items-center justify-center text-[10px] font-black text-slate-950 shadow-lg animate-bounce'; }
    else if (i === idx && special === 'BLINK') { el.textContent = '●'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-sky-200 bg-sky-500/80 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-sky-400/80 res-blink'; }
    else if (i === idx && special === 'BLINK_RED') { el.textContent = '鬼'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-amber-200 bg-gradient-to-br from-rose-500 to-red-900 flex items-center justify-center text-[10px] font-black text-amber-100 shadow-lg shadow-rose-500/90 res-blink-fast'; }
    else if (i === idx && special === 'REM_CYAN') { el.textContent = '鬼'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-sky-200 bg-gradient-to-br from-sky-400 to-blue-800 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-sky-400/90 animate-pulse'; }
    else { el.textContent = '○'; el.className = 'w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-amber-900/80 bg-black/75 flex items-center justify-center text-[10px] font-black text-amber-200/60'; }
  }
}

function updateRes4Dots(activeCount) {
  res4Dots.forEach((dot, i) => {
    dot.className = i < activeCount ? 'res4-dot w-1.5 h-1.5 rounded-full bg-amber-400 border border-yellow-100 shadow' : 'res4-dot w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-600';
  });
}

function clearIwakanEffects() {
  lcdFrame.style.filter = ''; lcdFrame.classList.remove('iwakan-mono', 'iwakan-rempuru', 'shake-weak', 'shake-mid', 'fx-rgb-glitch');
  lcdFrame.style.transform = '';
  if (cabinetShell) cabinetShell.classList.remove('iwakan-rempuru');
  if (hudRushRemain) hudRushRemain.classList.remove('iwakan-fade-remain');
  oniReels.forEach(el => { if (el) el.style.transform = ''; });
  remReels.forEach(el => { if (el) el.style.transform = ''; });
  hiddenRemBadge.classList.add('hidden');
  rushNoiseVeil.classList.add('hidden');
  rushTopBadge.classList.add('hidden');
  try { OniFx.clearAll(); } catch (e) {}      // 文字なしカウントダウン／テンパイの残骸を必ず消す
}

function clearVisualEffects() {
  clearIwakanEffects();
  clearGlobalChaosEffects();
  setAmbientBg('');
  setCabinetGlow('idle');
  lcdFrame.classList.remove('fx-redbare', 'fx-rainbow', 'fx-gold', 'fx-restart', 'fx-glitch', 'shake-intense', 'shake-burst', 'mode-despair-bg', 'bonus-theme-brain', 'bonus-theme-rem');
  setReachBotanState({ vibe: 'idle', color: '' });
  FxCanvas.clearCracks();
  setLed('');
  const ph = (typeof state !== 'undefined') ? state.phase : 'NORMAL';
  lampStatusText.textContent = ph === 'RUSH' ? 'RUSH中' : '待機中';
  lampStatusText.className = 'text-[10px] font-black text-amber-200 min-w-[46px] text-right whitespace-nowrap';
  syncRushStages();
}

function triggerLamp(type, label) {
  if (type === 'red') {
    setCabinetGlow('red'); setYakumonoColor('red'); setLed('red');
  } else if (type === 'rem') {
    setCabinetGlow('rem'); setYakumonoColor('white'); setLed('rem');
  } else if (type === 'rainbow') {
    setCabinetGlow('rainbow'); setYakumonoColor('rainbow'); setLed('rainbow');
  }

  lampStatusText.textContent = label;
  lampStatusText.className = type === 'red' ? 'text-[10px] font-black text-rose-400 min-w-[46px] text-right whitespace-nowrap'
    : type === 'rem' ? 'text-[10px] font-black text-sky-300 min-w-[46px] text-right whitespace-nowrap'
    : 'text-[10px] font-black text-amber-300 min-w-[46px] text-right whitespace-nowrap';

  const color = type === 'red' ? '#ef4444' : type === 'rem' ? '#38bdf8' : '#fef08a';
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      if (lampRippleHost) {
        const r = document.createElement('div'); r.className = 'lamp-ripple'; r.style.borderColor = color;
        lampRippleHost.appendChild(r);
        setTimeout(() => r.remove(), 750);
      }
      FxCanvas.spawnRing(color, 250 + i * 70, 8);
    }, i * 130);
  }
}

function fireRainbowBurst(lampLabel = '大当り!!', { withBackNiziiro = true } = {}) {
  fireGlobalRainbowFlash();
  if (withBackNiziiro) setLcdNiziiroBack(true, { instant: true });
  setAmbientBg('rainbow'); setSunburst(true); setPremiaFrame(true);
  triggerLamp('rainbow', lampLabel); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
  FxCanvas.spawnRing('#fef08a', 320, 9); FxCanvas.spawnRing('#7dd3fc', 250, 7); FxCanvas.burstRainbow(72);
  setTimeout(() => lcdFrame.classList.remove('shake-burst'), 720);
}

// -------------------------------------------------------------------------
// 12. 引き裂き・ガラス割れ・残保留V-STOCK告知
// -------------------------------------------------------------------------
function firePhysicalSplitSlash() {
  const beam = document.createElement('div'); beam.className = 'h-slash-beam';
  const pT = document.createElement('div'); pT.className = 'split-panel-top';
  const pB = document.createElement('div'); pB.className = 'split-panel-bottom';
  slashHost.appendChild(pT); slashHost.appendChild(pB); slashHost.appendChild(beam);
  setPageMegaShake(true); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fef08a', 360, 11); FxCanvas.spawnRing('#ef4444', 280, 9);
  FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(64); FxCanvas.burstFlames(36);
  setTimeout(() => { beam.remove(); pT.remove(); pB.remove(); setPageMegaShake(false); }, 820);
}

async function playGlassShatterFail(token) {
  BgmEngine.cut();
  StudioAudio.playGlassBreak();
  FxCanvas.triggerGlassShatter();
  lcdFrame.classList.add('shake-burst');
  try { if (navigator && navigator.vibrate) navigator.vibrate([85, 35, 45]); } catch (e) {}
  await wait(760, token);
  lcdFrame.classList.remove('shake-burst');
}

async function playVStockNotice({ isRed = false, token = seqToken } = {}) {
  const bg = isRed ? Assets.getVStock('bg1500') : Assets.getVStock('bg300');
  const vImg = isRed ? Assets.getVStock('v1500') : Assets.getVStock('v300');
  if (!slashHost) return;
  try {
    StudioAudio.playVImpact(isRed);
    triggerLamp(isRed ? 'red' : 'rem', isRed ? '赤V-STOCK!!' : '青V-STOCK!!');
    slashHost.innerHTML = `
      <div class="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-black/90 pl-5">
        ${bg ? `<img src="${bg}" class="absolute inset-0 w-full h-full object-cover opacity-92" alt="">` : ''}
        <div class="relative z-10 flex flex-col items-center justify-center">
          ${vImg
            ? `<img src="${vImg}" class="bonus-v-big drop-shadow-[0_0_28px_rgba(254,240,138,0.95)]" alt="V-STOCK">`
            : `<div class="text-7xl font-black ${isRed ? 'crimson-grad-text' : 'cyan-grad-text'} bonus-v-slam">V</div>`}
          <div class="mt-1 px-3.5 py-0.5 rounded-full bg-black/85 border-2 ${isRed ? 'border-amber-300 text-amber-200' : 'border-sky-300 text-sky-200'} text-xs font-black tracking-[0.14em] pop-in">
            ${isRed ? '赤V-STOCK 獲得!!（1,500以上）' : '青V-STOCK 獲得!!（300以上）'}
          </div>
        </div>
      </div>
    `;
    fireVImpactShake();
    if (isRed) FxCanvas.burstFlames(44); else FxCanvas.spawnRing('#38bdf8', 300, 9);
    await wait(960, token);
    lcdFrame.classList.remove('shake-burst');
  } finally {
    slashHost.innerHTML = '';
  }
}

function fireDropCrash(fakeTitle = '') {
  const panel = document.createElement('div'); panel.className = 'drop-crash-panel';
  panel.innerHTML = `<div class="text-2xl sm:text-3xl font-black text-slate-200">${fakeTitle}</div>`;
  slashHost.appendChild(panel); setPageMegaShake(true); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fef08a', 360, 11); FxCanvas.burstRainbow(64);
  setTimeout(() => { panel.remove(); setPageMegaShake(false); }, 860);
}
function fireShatterFly() {
  const configs = [
    { l: '0%', t: '0%', w: '34%', h: '51%', tx: '-140%', ty: '-120%', rot: '-52deg' },
    { l: '33%', t: '0%', w: '34%', h: '51%', tx: '10%', ty: '-150%', rot: '28deg' },
    { l: '66%', t: '0%', w: '35%', h: '51%', tx: '145%', ty: '-115%', rot: '58deg' },
    { l: '0%', t: '50%', w: '34%', h: '51%', tx: '-145%', ty: '125%', rot: '-44deg' },
    { l: '33%', t: '50%', w: '34%', h: '51%', tx: '-12%', ty: '155%', rot: '-26deg' },
    { l: '66%', t: '50%', w: '35%', h: '51%', tx: '140%', ty: '130%', rot: '48deg' }
  ];
  const nodes = configs.map(c => {
    const d = document.createElement('div'); d.className = 'shatter-shard';
    d.style.left = c.l; d.style.top = c.t; d.style.width = c.w; d.style.height = c.h;
    d.style.setProperty('--tx', c.tx); d.style.setProperty('--ty', c.ty); d.style.setProperty('--rot', c.rot);
    slashHost.appendChild(d); return d;
  });
  setPageMegaShake(true); lcdFrame.classList.add('fx-rgb-glitch'); fireGlobalRainbowFlash();
  FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(68);
  setTimeout(() => { nodes.forEach(n => n.remove()); lcdFrame.classList.remove('fx-rgb-glitch'); setPageMegaShake(false); }, 880);
}
function fireMegaQuakeBrainBreak() {
  setPageMegaShake(true); lcdFrame.classList.add('fx-rgb-glitch'); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#ef4444', 360, 12); FxCanvas.spawnRing('#fef08a', 290, 9);
  FxCanvas.spawnLightning('#fef08a', 6); FxCanvas.burstRainbow(72); FxCanvas.burstFlames(42);
  setTimeout(() => { lcdFrame.classList.remove('fx-rgb-glitch'); setPageMegaShake(false); }, 1050);
}

// -------------------------------------------------------------------------
// 13. 🧠 脳が震えるRUSH / 💙 レム告知 / 🔥 鬼がかりRUSH 演出群
// -------------------------------------------------------------------------
function fireBrainEvoFlash() { brainEvoFlash.classList.remove('flash-fire'); void brainEvoFlash.offsetWidth; brainEvoFlash.classList.add('flash-fire'); }
function setBrainPeteLevel(lv = 0, { withFlash = false } = {}) {
  const src = Assets.getPeteFrame(lv); if (!src) return;
  const idx = Math.max(0, Math.min(5, lv));
  const prevSlot = brainPeteSlot, nextSlot = 1 - brainPeteSlot;
  if (withFlash) fireBrainEvoFlash();
  brainPeteImgs[nextSlot].src = src;
  brainPetePositions[nextSlot].className = 'brain-pete-pos' + (idx >= 4 ? ' pete-cover-pos' : '');
  brainPeteImgs[nextSlot].className = 'brain-pete-img' + (idx >= 4 ? ' pete-cover-img' : '');
  void brainPeteImgs[nextSlot].offsetWidth;
  brainPetePositions[prevSlot].classList.remove('pete-shown'); brainPeteImgs[prevSlot].classList.remove('pete-breath', 'pete-punch');
  brainPetePositions[nextSlot].classList.add('pete-shown'); brainPeteImgs[nextSlot].classList.add(idx === 0 ? 'pete-breath' : 'pete-punch');
  brainPeteSlot = nextSlot;
}
function setBrainTextSwarm(lv = 0, { isGoldButtonGa = false, customWord = null } = {}) {
  brainTextSwarm.innerHTML = '';
  if (lv <= 0 && !customWord) return;
  const word = customWord || (isGoldButtonGa ? 'ボタンが' : '脳が');
  const cls = isGoldButtonGa ? 'noga-word noga-gold' : (lv >= 4 ? 'noga-word noga-hot' : 'noga-word');
  const layouts = {
    1: [{ x: '10%', y: '34%', sz: 26, rot: '-16deg', sc: 1.0 }, { x: '68%', y: '44%', sz: 24, rot: '14deg', sc: 0.95 }],
    2: [{ x: '9%', y: '30%', sz: 32, rot: '-18deg', sc: 1.0 }, { x: '66%', y: '52%', sz: 34, rot: '16deg', sc: 1.05 }, { x: '14%', y: '62%', sz: 22, rot: '-10deg', sc: 0.95 }],
    3: [{ x: '10%', y: '24%', sz: 46, rot: '-14deg', sc: 1.05 }, { x: '64%', y: '28%', sz: 34, rot: '18deg', sc: 1.0 }, { x: '62%', y: '60%', sz: 38, rot: '-12deg', sc: 1.0 }, { x: '10%', y: '64%', sz: 28, rot: '12deg', sc: 0.95 }],
    4: [{ x: '8%', y: '20%', sz: 50, rot: '-18deg', sc: 1.08 }, { x: '60%', y: '22%', sz: 44, rot: '16deg', sc: 1.05 }, { x: '8%', y: '54%', sz: 42, rot: '12deg', sc: 1.05 }, { x: '62%', y: '56%', sz: 48, rot: '-16deg', sc: 1.08 }, { x: '30%', y: '18%', sz: 28, rot: '8deg', sc: 0.95 }],
    5: [{ x: '8%', y: '16%', sz: 54, rot: '-18deg', sc: 1.12 }, { x: '56%', y: '16%', sz: 52, rot: '16deg', sc: 1.12 }, { x: '8%', y: '46%', sz: 50, rot: '14deg', sc: 1.08 }, { x: '60%', y: '48%', sz: 52, rot: '-15deg', sc: 1.10 }, { x: '10%', y: '70%', sz: 38, rot: '-10deg', sc: 1.02 }, { x: '64%', y: '70%', sz: 40, rot: '12deg', sc: 1.04 }]
  };
  const items = layouts[Math.min(5, Math.max(1, lv))] || layouts[3];
  items.forEach((it, idx) => {
    const el = document.createElement('div'); el.className = cls; el.textContent = word;
    el.style.left = it.x; el.style.top = it.y; el.style.fontSize = `${it.sz}px`;
    el.style.setProperty('--rot', it.rot); el.style.setProperty('--sc', it.sc);
    el.style.animationDelay = `${idx * 0.025}s, ${0.18 + idx * 0.025}s`;
    brainTextSwarm.appendChild(el);
  });
}

async function playBrainModeSequence({ isHit, is6000, bonusType, isHands = false, custOchiburu = true, forceTargetLv = null, token }) {
  brainRushStage.classList.remove('hidden');
  const isShakeReserve = isHit && Math.random() < 0.18;

  let targetLv;
  if (forceTargetLv !== null) targetLv = forceTargetLv;
  else if (isHit) {
    if (is6000) targetLv = Math.random() < 0.58 ? 5 : Math.random() < 0.90 ? 4 : 3;
    else targetLv = Math.random() < 0.34 ? 5 : Math.random() < 0.72 ? 4 : Math.random() < 0.92 ? 3 : 2;
  } else {
    const r = Math.random();
    targetLv = r < 0.42 ? 1 : r < 0.74 ? 2 : r < 0.93 ? 3 : 4;
  }

  const doJumpFrom1 = (targetLv >= 3) && (Math.random() < 0.42);
  const isButtonGa = (isHit && is6000 && Math.random() < 0.48);

  updateReserveSlots('BRAIN', isHands ? 'HANDS' : isShakeReserve ? 'HIT' : 'NOGA');
  if (isHands) FxCanvas.spawnPurpleHands(30);

  if (doJumpFrom1) {
    setBrainPeteLevel(1, { withFlash: true }); setBrainTextSwarm(1, { isGoldButtonGa: false });
    setBrainButtonState('weak', 'purple'); StudioAudio.playSoftHeartbeat();
    await wait(420, token);
  }

  setBrainPeteLevel(targetLv, { withFlash: true });
  setBrainTextSwarm(targetLv, { isGoldButtonGa: isButtonGa });
  setBrainButtonState(targetLv >= 4 ? 'mid' : 'weak', isButtonGa ? 'gold' : targetLv >= 4 ? 'red' : 'purple');
  FxCanvas.spawnLightning(isButtonGa ? '#fef08a' : '#e879f9', targetLv >= 4 ? 5 : 2);

  if (targetLv >= 3) { lcdFrame.classList.add('shake-weak'); StudioAudio.playSoftHeartbeat(); }
  await wait(targetLv >= 4 ? 640 : 500, token);
  lcdFrame.classList.remove('shake-weak');

  if (!isHit) {
    setBrainTextSwarm(0); setBrainButtonState('idle'); setBrainPeteLevel(0, { withFlash: false });
    updateReserveSlots('BRAIN', null);
    return { triggeredOchiburu: false, note: '' };
  }

  updateReserveSlots('BRAIN', 'HIT');
  let triggeredOchiburu = false;
  let note = isButtonGa ? '「ボタンが」震える(6000濃厚)' : (targetLv === 5 ? '脳が煽りLv5(濃厚)' : '');
  const hasFurueruLogo = !!Assets.getLogo('furueru');
  if (hasFurueruLogo && brainFurueruOverlay && brainFurueruImg) {
    brainFurueruImg.src = Assets.getLogo('furueru');
    brainFurueruOverlay.classList.remove('hidden');
  }

  if (is6000 && (isButtonGa || Math.random() < (custOchiburu ? 0.62 : 0.32))) {
    triggeredOchiburu = true; note = note || '脳が震える・強';
    BgmEngine.cut(); setPremiaFrame(true);
    setBrainPeteLevel(5, { withFlash: true });
    if (!hasFurueruLogo) setBrainTextSwarm(5, { isGoldButtonGa: true, customWord: '震える!!' });
    setBrainButtonState('max', 'rainbow'); StudioAudio.playOchiburu(true);
    lcdFrame.classList.add('shake-intense', 'fx-rainbow');
    setAmbientBg('rainbow'); setSunburst(true); triggerLamp('rainbow', '6,000!!');
    FxCanvas.spawnLightning('#fef08a', 6); FxCanvas.burstRainbow(68);
    await wait(1420, token); lcdFrame.classList.remove('shake-intense');
  } else if (bonusType === 'BONUS_1500' || is6000) {
    note = note || '脳が震える・中';
    if (targetLv < 4) setBrainPeteLevel(4, { withFlash: true });
    if (!hasFurueruLogo) setBrainTextSwarm(4, { isGoldButtonGa: false, customWord: '震える!' });
    setBrainButtonState('mid', 'red'); lcdFrame.classList.add('shake-mid', 'fx-gold');
    try { if (navigator && navigator.vibrate) navigator.vibrate([70, 30, 70, 30, 120]); } catch (e) {}
    StudioAudio.playKyuin(); FxCanvas.spawnRing('#e879f9', 280, 8);
    await wait(680, token); lcdFrame.classList.remove('shake-mid');
  } else {
    note = note || '脳が震える・弱';
    if (!hasFurueruLogo) setBrainTextSwarm(3, { isGoldButtonGa: false, customWord: '震える…' });
    setBrainButtonState('weak', 'purple'); lcdFrame.classList.add('shake-weak');
    try { if (navigator && navigator.vibrate) navigator.vibrate([45, 35, 65]); } catch (e) {}
    await wait(580, token); lcdFrame.classList.remove('shake-weak');
  }

  if (brainFurueruOverlay) brainFurueruOverlay.classList.add('hidden');
  setBrainTextSwarm(0); setBrainButtonState('idle');
  return { triggeredOchiburu, note };
}

function setRemLampVisual(mode = 'idle', { bringFront = false } = {}) {
  remLampOuter.classList.toggle('rem-front-burst', bringFront);
  if (remDigitsLayer) remDigitsLayer.classList.toggle('rem-digits-behind', bringFront);

  remLampImg.className = ''; void remLampImg.offsetWidth;
  if (mode === 'lit') { remLampImg.className = 'rem-img-lit'; remHornGlow.classList.add('horn-on'); }
  else if (mode === 'slow') { remLampImg.className = 'rem-img-slow'; setTimeout(() => { if (!remRushStage.classList.contains('hidden')) remHornGlow.classList.add('horn-on'); }, 550); }
  else if (mode === 'rainbow') { remLampImg.className = 'rem-img-rainbow'; remHornGlow.classList.add('horn-on'); }
  else if (mode === 'strobe') { remLampImg.className = 'rem-img-strobe'; remHornGlow.classList.add('horn-on'); }
  else {
    remLampImg.className = 'rem-img-idle'; remHornGlow.classList.remove('horn-on');
    remLampOuter.classList.remove('rem-front-burst');
    if (remDigitsLayer) remDigitsLayer.classList.remove('rem-digits-behind');
    [0, 1, 2].forEach(i => { const el = remReels[i]; if (el) el.classList.remove('oni-digit-hit-lock'); });
  }
}

function triggerRemSakibareBack({ is6000 = false, pat = 'NORMAL', countdownSpins = 3 } = {}) {
  const visual = pat === 'CLASSIC_FLASH' ? 'strobe' : pat === 'SLOW_GLOW' ? 'slow' : is6000 && pat !== 'NORMAL' ? 'rainbow' : 'lit';
  setRemLampVisual(visual, { bringFront: false });
  triggerLamp(is6000 && pat !== 'NORMAL' ? 'rainbow' : 'rem', '先バレ点灯!!');
  StudioAudio.playPokyun(is6000 && pat !== 'NORMAL');
  FxCanvas.spawnRing(is6000 && pat !== 'NORMAL' ? '#fef08a' : '#38bdf8', 280, 8);
  if (is6000 && pat !== 'NORMAL') FxCanvas.burstRainbow(48);
  updateReserveSlots('NORMAL', is6000 && pat !== 'NORMAL' ? 'RAINBOW' : 'REM_CYAN', Math.min(3, Math.max(0, countdownSpins)));
}

async function playRemTougaiBurst({ is6000, bonusType, fromSakibare = false, forcePat = null, token }) {
  BgmEngine.cut();
  const winDig = pickRushRuleDigit(bonusType || (is6000 ? 'BONUS_6000' : 'BONUS_1500'), fromSakibare);

  if (fromSakibare) {
    setRemLampVisual(is6000 ? 'rainbow' : 'lit', { bringFront: true });
    setRemReels(winDig, winDig, winDig, { hitLock: true });
    if (winDig === 0 || is6000) { setPremiaFrame(true); StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(64); }
    else { StudioAudio.playKyuin(); FxCanvas.spawnRing('#38bdf8', 280, 8); FxCanvas.burstGold(44); }
    await wait(780, token);
    setRemLampVisual('idle', { bringFront: false });
    return winDig === 0 ? '0揃い特別違和感' : 'レム先バレ点灯';
  }

  let pat = forcePat || 'NORMAL';
  if (!forcePat && is6000 && Math.random() < 0.72) {
    const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
    pat = p6[Math.floor(Math.random() * p6.length)];
  }
  let note = 'レム突点灯';
  if (pat === 'SLOW_GLOW') {
    note = 'レム徐々に点灯'; setCabinetGlow('rem-slow'); lampStatusText.textContent = 'じわ〜っ…'; setLed('rem');
    setRemLampVisual('slow', { bringFront: true }); await wait(1120, token);
    setRemLampVisual('rainbow', { bringFront: true }); triggerLamp('rainbow', '6,000!!'); setPremiaFrame(true);
    StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(62);
  } else if (pat === 'DOUBLE_BLINK') {
    note = 'レム再点灯'; setCabinetGlow('rem'); lampStatusText.textContent = 'ピッ…'; setRemLampVisual('lit', { bringFront: true }); await wait(180, token);
    setCabinetGlow('off'); lampStatusText.textContent = '……'; setLed('off'); setRemLampVisual('idle', { bringFront: true }); await wait(520, token);
    setRemLampVisual('rainbow', { bringFront: true }); triggerLamp('rainbow', '再点灯!!'); setPremiaFrame(true);
    StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(62);
  } else if (pat === 'CLASSIC_FLASH') {
    note = '旧レム閃光'; setRemLampVisual('strobe', { bringFront: true }); setCabinetGlow('rem-strobe'); lampStatusText.textContent = '閃光!!';
    setLed('rainbow'); setPremiaFrame(true); StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true);
    FxCanvas.spawnRing('#4ade80', 320, 9); FxCanvas.spawnLightning('#e0f2fe', 5); await wait(880, token);
    setCabinetGlow('rainbow'); setRemLampVisual('rainbow', { bringFront: true });
  } else {
    setRemLampVisual('lit', { bringFront: true }); triggerLamp('rem', '突点灯!!');
    StudioAudio.playPokyun(false); FxCanvas.spawnRing('#38bdf8', 260, 8);
  }

  setRemReels(winDig, winDig, winDig, { hitLock: true });
  await wait(720, token);
  setRemLampVisual('idle', { bringFront: false });
  return winDig === 0 ? '0揃い特別違和感' : note;
}

// -------------------------------------------------------------------------
// 13b. 鬼がかりRUSH：文字を使わない映像表現（テンパイ煽り／カウントダウン）
//   ・「テンパイ煽り!」「COUNT [3]」のような説明テキストは出さない（見れば分かる演出にする）
//   ・図柄アート・光・リング・ひび割れだけで伝える。位置は図柄の列と同じ高さで、液晶上部のロゴ領域には掛けない
//   ・カウントダウンの約束事：3 → 2 → 1 に届いたら大当り濃厚（ハズレは必ず 3 か 2 で割れて終わる）／1の次の 0 は 6000濃厚（0揃い）
// -------------------------------------------------------------------------
const OniFx = (() => {
  const hosts = { back: null, front: null };
  const SHARDS = [
    'polygon(0 0, 55% 0, 30% 45%, 0 38%)',
    'polygon(55% 0, 100% 0, 100% 30%, 62% 42%, 30% 45%)',
    'polygon(0 38%, 30% 45%, 22% 100%, 0 100%)',
    'polygon(30% 45%, 62% 42%, 70% 100%, 22% 100%)',
    'polygon(62% 42%, 100% 30%, 100% 100%, 70% 100%)'
  ];
  const SH_ORIGIN = ['21% 21%', '69% 25%', '13% 70%', '46% 72%', '83% 68%'];
  const SH_VEC = [[-16, -4], [14, -10], [-12, 12], [2, 16], [16, 10]];
  const rand = (a, b) => a + Math.random() * (b - a);

  function host(which) {
    let el = hosts[which];
    if (el && el.isConnected) return el;
    el = document.createElement('div');
    el.className = `oni-fx-host oni-fx-${which}`;
    oniRushStage.appendChild(el);
    hosts[which] = el;
    return el;
  }
  function layer(which, cls = '') {
    const d = document.createElement('div');
    d.className = `oni-fx-layer ${cls}`.trim();
    host(which).appendChild(d);
    return d;
  }
  function clearAll() {
    ['back', 'front'].forEach(k => { const h = hosts[k]; if (h && h.isConnected) h.innerHTML = ''; });
  }

  // 数字アート（0〜8の画像）を並べた大きなカウント表示。画像が無い時は金／水色グラデ文字で代替
  function bigNumber(str, tone) {
    const el = document.createElement('div');
    el.className = `oni-count-digit${tone ? ' tone-' + tone : ''}`;
    el.style.setProperty('--n', String(String(str).length));
    [...String(str)].forEach(ch => {
      const n = parseInt(ch, 10);
      const url = Assets.getDigit(clampDigit08(n));
      const cell = document.createElement('div'); cell.className = 'oni-count-cell';
      if (url) { const im = document.createElement('img'); im.src = url; im.alt = ch; im.className = 'oni-count-img'; cell.appendChild(im); }
      else cell.innerHTML = `<span class="oni-count-fallback ${n % 2 === 1 || n === 0 ? 'gold-grad-text' : 'cyan-grad-text'}">${ch}</span>`;
      el.appendChild(cell);
    });
    return el;
  }

  function popIn(el, dur = 170, from = 1.85) {
    return el.animate([
      { opacity: 0, transform: `scale(${from})`, filter: 'blur(8px) brightness(2.4)' },
      { opacity: 1, transform: 'scale(0.95)', filter: 'blur(0px) brightness(1.4)', offset: 0.6 },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px) brightness(1)' }
    ], { duration: dur, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' });
  }
  function beat(el, dur = 260, amp = 1.07) {
    return el.animate([{ transform: 'scale(1)' }, { transform: `scale(${amp})` }, { transform: 'scale(1)' }], { duration: dur, easing: 'ease-in-out', iterations: 2 });
  }
  // 数字を消す（レイヤーごと除去）。to>1 なら光に溶けるように拡大して消える
  function retire(el, dur = 110, to = 0.66) {
    if (!el) return;
    const lay = el.parentElement;
    const a = el.animate([{ opacity: 1 }, { opacity: 0, transform: `scale(${to})`, filter: 'blur(4px)' }], { duration: dur, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = () => { if (lay && lay.classList.contains('oni-fx-layer')) lay.remove(); };
  }
  function countShow(str, { tone = '', dur = 170, from = 1.85 } = {}) {
    const lay = layer('front', 'oni-count-lay');
    const el = bigNumber(str, tone);
    lay.appendChild(el);
    popIn(el, dur, from);
    return el;
  }
  function rays(rgb = '254,240,138', hue = false) {
    const d = layer('back', `oni-rays${hue ? ' oni-rays-hue' : ''}`);
    d.style.setProperty('--ray-rgb', rgb);
    d.animate([{ transform: 'rotate(0deg)', opacity: 0 }, { transform: 'rotate(40deg)', opacity: 1, offset: 0.15 }, { transform: 'rotate(360deg)', opacity: 1 }],
      { duration: 2600, easing: 'linear', fill: 'forwards' });
    return d;
  }

  // ハズレ：数字にひびが走って、5枚の破片になって落ちる
  async function crackAway(el, token) {
    if (!el) return;
    const lay = el.parentElement;
    const w = el.offsetWidth, h = el.offsetHeight;
    const wrap = document.createElement('div');
    wrap.className = 'oni-shatter'; wrap.style.width = `${w}px`; wrap.style.height = `${h}px`;
    const shards = SHARDS.map((poly, i) => {
      const c = el.cloneNode(true);
      c.style.clipPath = poly; c.style.webkitClipPath = poly; c.style.transformOrigin = SH_ORIGIN[i];
      wrap.appendChild(c); return c;
    });
    wrap.insertAdjacentHTML('beforeend', '<svg class="oni-crack" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="52,-2 43,20 58,38 39,58 57,78 47,102" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round"/></svg>');
    lay.replaceChild(wrap, el);
    const crack = wrap.querySelector('.oni-crack');
    crack.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 80, fill: 'forwards' });
    StudioAudio.playCrackNoise();
    await wait(95, token);
    shards.forEach((s, i) => {
      const [vx, vy] = SH_VEC[i];
      s.animate([
        { transform: 'translate(0px,0px) rotate(0deg)', opacity: 1 },
        { transform: `translate(${vx * 0.6}px, ${vy * 0.6}px) rotate(${vx * 0.4}deg)`, opacity: 1, offset: 0.25 },
        { transform: `translate(${vx * 1.6 + rand(-6, 6)}px, ${70 + rand(0, 60)}px) rotate(${vx * 2.2 + rand(-20, 20)}deg)`, opacity: 0 }
      ], { duration: 520 + i * 35, easing: 'cubic-bezier(.45,0,.85,.6)', fill: 'forwards' });
    });
    crack.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'forwards' });
    await wait(430, token);
  }

  const RING = { 3: ['#7dd3fc', 200, 5], 2: ['#fbbf24', 240, 6], 1: ['#fef08a', 300, 9], 0: ['#f9a8d4', 340, 10] };

  // 当選：3 → 2 → 1（大当り濃厚）。揃う図柄が 0 のときだけ最後に 0（6000濃厚）まで数える
  async function countHit(withZero, token) {
    const seq = withZero ? [3, 2, 1, 0] : [3, 2, 1];
    let prev = null;
    for (const n of seq) {
      if (prev) retire(prev, 100);
      const el = countShow(String(n), { tone: n === 0 ? 'rainbow' : String(n), from: n === 3 ? 1.9 : 1.7 });
      const [col, r, lw] = RING[n];
      FxCanvas.spawnRing(col, r, lw);
      if (n === 3) StudioAudio.playSoftHeartbeat();
      if (n === 1) { FxCanvas.burstGold(34); rays('254,240,138'); beat(el, 200, 1.09); }
      if (n === 0) { FxCanvas.burstRainbow(56); FxCanvas.spawnLightning('#fef08a', 4); rays('255,255,255', true); beat(el, 220, 1.08); }
      prev = el;
      await wait(n === 1 || n === 0 ? 430 : 290, token);
    }
    retire(prev, 160, 1.55);               // 最後の数字は、図柄が揃う瞬間に光へ溶ける
  }

  // ハズレ：必ず 3 か 2 で止まり、1 には届かない
  async function countMiss(stopAt, token) {
    const seq = stopAt === 3 ? [3] : [3, 2];
    let prev = null;
    for (const n of seq) {
      if (prev) retire(prev, 100);
      const el = countShow(String(n), { tone: String(n), from: n === 3 ? 1.9 : 1.7 });
      const [col, r, lw] = RING[n];
      FxCanvas.spawnRing(col, r, lw);
      if (n === 3) StudioAudio.playSoftHeartbeat();
      prev = el;
      await wait(n === stopAt ? 360 : 290, token);
    }
    await crackAway(prev, token);
  }

  // 6000濃厚のプレミアカウント：1→2→3→4→5→6 と駆け上がり、最後は「6000」の数字アートが虹の光とともに現れる
  async function premiumCount(token) {
    let prev = null;
    for (let n = 1; n <= 6; n++) {
      if (prev) retire(prev, 70);
      const el = countShow(String(n), { tone: n >= 4 ? '1' : String(Math.min(n, 3)), dur: 120, from: 1.5 });
      FxCanvas.spawnRing(n >= 4 ? '#fef08a' : '#fbbf24', 180 + n * 26, n >= 4 ? 7 : 5);
      if (n === 1) StudioAudio.playSoftHeartbeat();
      if (n >= 4) setPremiaFrame(true);
      prev = el;
      await wait(n >= 4 ? 190 : 170, token);
    }
    retire(prev, 90);
    const big = countShow('6000', { tone: 'rainbow', dur: 200, from: 2.1 });
    rays('255,255,255', true);
    FxCanvas.burstRainbow(60); FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.spawnRing('#fef08a', 340, 11);
    beat(big, 220, 1.08);
    await wait(520, token);
    retire(big, 160, 1.5);
  }

  // テンパイ煽り：図柄の列を上下から挟む光のビーム＋中央リールの脈動（プレミア図柄は放射光つき）。文字は出さない
  function tenpai({ premium = false, dig = 0 } = {}) {
    const nodes = [];
    const rowR = oniReels[1] ? oniReels[1].getBoundingClientRect() : null;
    const stR = oniRushStage.getBoundingClientRect();
    const col = premium ? '254,240,138' : '248,113,113';
    if (rowR && stR.height > 0) {
      const ys = [rowR.top - stR.top - 4, rowR.bottom - stR.top + 2];
      ys.forEach((y, i) => {
        const b = document.createElement('div'); b.className = 'oni-beam'; b.style.top = `${y}px`; b.style.setProperty('--c', col);
        host('front').appendChild(b); nodes.push(b);
        b.animate([{ transform: 'scaleX(0)', opacity: 0 }, { transform: 'scaleX(1)', opacity: 1 }], { duration: 170 + i * 50, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' });
      });
    }
    const pulse = layer('back', 'oni-pulse'); pulse.style.setProperty('--c', col);
    pulse.animate([{ opacity: 0, transform: 'scale(.72)' }, { opacity: 0.9, transform: 'scale(1.06)' }, { opacity: 0, transform: 'scale(.72)' }],
      { duration: premium ? 460 : 560, iterations: Infinity, easing: 'ease-in-out' });
    nodes.push(pulse);
    if (premium && (dig === 7 || dig === 0)) nodes.push(rays(dig === 0 ? '255,255,255' : '254,240,138', dig === 0));
    return {
      stop() {
        nodes.forEach(n => { const a = n.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }); a.onfinish = () => n.remove(); });
      }
    };
  }

  return { clearAll, countHit, countMiss, premiumCount, tenpai };
})();

async function playOniTenpaiAori({ isHit, is6000, bonusType, fixedDig = null, token }) {
  const dig = fixedDig !== null ? fixedDig
    : isHit ? pickRushRuleDigit(bonusType || (is6000 ? 'BONUS_6000' : 'BONUS_1500'), true)
    : [1, 2, 3, 4, 5, 6, 8][Math.floor(Math.random() * 7)];

  const isPremDig = (dig === 7 || dig === 3 || dig === 0);
  setOniReels(dig, (dig % 8) + 1, dig, { tenpaiSide: true, midSpin: true });
  if (dig === 7 || dig === 0) setPremiaFrame(true);

  // 説明テキストは出さず、光のビーム・脈動・リング・鼓動だけで「テンパイ」を見せる
  const fx = OniFx.tenpai({ premium: isPremDig, dig });
  FxCanvas.spawnRing(isPremDig ? '#fef08a' : '#ef4444', 250, 7);
  StudioAudio.playSoftHeartbeat();
  try { await wait(isPremDig ? 720 : 540, token); }
  finally { fx.stop(); }

  if (!isHit) {
    const missMid = (dig % 8) + 1;
    setOniReels(dig, missMid, dig, { tenpaiSide: false, midSpin: false });
    await wait(240, token);
    return { note: '', winDig: dig };
  }

  await playOniTotsuAtariPause({ is6000, bonusType, fixedDig: dig, hadNotice: true, token });
  const note = dig === 7 ? '7テンパイ(プレミア)' : dig === 0 ? '0揃い特別違和感' : (dig === 3 ? '3テンパイ揃い' : '');
  return { note, winDig: dig };
}

async function playOniTotsuAtariPause({ is6000, bonusType = null, fixedDig = null, hadNotice = false, token }) {
  BgmEngine.cut();
  const bType = bonusType || (state.pendingRushHit && state.pendingRushHit.type) || (is6000 ? 'BONUS_6000' : 'BONUS_1500');
  const winDig = fixedDig !== null ? fixedDig : pickRushRuleDigit(bType, hadNotice);
  setOniReels(winDig, winDig, winDig, { spinning: false, hitLock: true });

  if (winDig === 0 || winDig === 7) setPremiaFrame(true);
  StudioAudio.playSoftHeartbeat();
  const ringCol = (winDig === 7 || winDig === 3 || winDig === 0) ? '#fef08a' : (winDig % 2 === 1 ? '#fb7185' : '#38bdf8');
  FxCanvas.spawnRing(ringCol, 260, 8);
  await wait(550, token);

  if (winDig === 7 || winDig === 3 || winDig === 0) {
    StudioAudio.playPokyun(true); setLcdNiziiroBack(true); FxCanvas.burstRainbow(64);
  } else if (winDig % 2 === 0 && bType === 'BONUS_300') {
    StudioAudio.play300Sound();
  } else {
    StudioAudio.playKyuin(); FxCanvas.burstGold(52);
  }
  await wait(340, token);
  return winDig;
}

async function playOnigakariCountdown({ isHit, is6000, bonusType = null, token }) {
  const bType = bonusType || (is6000 ? 'BONUS_6000' : 'BONUS_1500');
  // 当選時は揃う図柄を先に決める。6000のプレミアカウント(55%)は 0揃い、通常は図柄ルール通り（0 のときだけ最後に 0 まで数える）
  const premium = isHit && is6000 && Math.random() < 0.55;
  let winDig = null, note = '';
  if (premium) { note = 'プレミアカウント(1→2→3→4→5→6→000)'; winDig = Assets.getDigit(0) ? 0 : null; }
  else if (isHit) winDig = pickRushRuleDigit(bType, true);

  // 暗い背景に数字だけを浮かべる（既に暗転中ならそのまま）
  const hadDark = oniRushStage.classList.contains('oni-bg-dark');
  oniRushStage.classList.add('oni-bg-dark');
  try {
    if (premium) await OniFx.premiumCount(token);
    else if (isHit) await OniFx.countHit(winDig === 0, token);
    else await OniFx.countMiss(Math.random() < 0.45 ? 3 : 2, token);   // ハズレは 3 か 2 で止まる（1には届かない）
  } finally {
    OniFx.clearAll();
    if (!hadDark) oniRushStage.classList.remove('oni-bg-dark');
  }

  if (isHit) {
    const wd = await playOniTotsuAtariPause({ is6000, bonusType, fixedDig: winDig, hadNotice: true, token });
    return { note, winDig: wd };
  }
  return { note: '', winDig: null };
}

async function playOniRemApproach6000(token) {
  BgmEngine.cut();
  oniRushStage.classList.remove('hidden');
  setOniReels(7, 7, 7, { hitLock: true });
  setPremiaFrame(true);
  if (Assets.getRemLamp()) {
    oniRemApproachWrap.classList.remove('hidden');
    oniRemApproachImg.className = 'max-h-[92%] max-w-[92%] object-contain oni-rem-approach';
  }
  StudioAudio.playOchiburu(true);
  setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
  triggerLamp('rainbow', '鬼レム接近!!');
  FxCanvas.spawnLightning('#fef08a', 6); FxCanvas.burstRainbow(72);
  await wait(1250, token);
  oniRemApproachWrap.classList.add('hidden');
  await runSuddenOchiburu6000({ sub: '鬼レム覚醒', skipAlarm: true, token });
}

// -------------------------------------------------------------------------
// 14. 本家違和感18種（筐体レムぷる・ロゴ一瞬虹・画像版隠れレム・巻き戻り等）
// -------------------------------------------------------------------------
// 液晶が一瞬モザイク状になる（点滅3回）。SVGフィルタ非対応のSafariは、ブロックのノイズで代替
async function playMosaicGlitch(token) {
  const safari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
  let veil = null;
  try {
    for (let i = 0; i < 3; i++) {
      if (!safari) lcdFrame.style.filter = 'url(#fxMosaic)';
      else {
        veil = document.createElement('div');
        veil.style.cssText = 'position:absolute;inset:0;z-index:58;pointer-events:none;display:grid;grid-template-columns:repeat(10,1fr);grid-template-rows:repeat(16,1fr);opacity:.9';
        for (let c = 0; c < 160; c++) { const d = document.createElement('div'); d.style.background = `hsl(${Math.random() * 40},55%,${6 + Math.random() * 26}%)`; veil.appendChild(d); }
        lcdFrame.appendChild(veil);
      }
      await wait(i === 2 ? 340 : 170, token);
      lcdFrame.style.filter = ''; if (veil) { veil.remove(); veil = null; }
      await wait(110, token);
    }
  } finally { lcdFrame.style.filter = ''; if (veil) veil.remove(); }
}

// 心音ドクン：暗くなり、縁が赤く2回脈打つ
async function playHeartbeatPulse(token) {
  const v = document.createElement('div');
  v.style.cssText = 'position:absolute;inset:0;z-index:57;pointer-events:none;background:rgba(0,0,0,.55);box-shadow:inset 0 0 46px 10px rgba(220,20,40,.85);opacity:0';
  lcdFrame.appendChild(v);
  try {
    try { StudioAudio.playSoftHeartbeat(); } catch (e) {}
    v.animate([{ opacity: 0 }, { opacity: 1, offset: .12 }, { opacity: .25, offset: .3 }, { opacity: .9, offset: .5 }, { opacity: 0 }],
      { duration: 1000, easing: 'ease-out', fill: 'forwards' });
    await wait(1050, token);
  } finally { v.remove(); }
}

// 画面のひび：液晶にヒビが走って消える
async function playCrackOverlay(token) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 160'); svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:57;pointer-events:none';
  const r = (a, b) => a + Math.random() * (b - a);
  const branch = (x, y, ang, len, depth) => {
    let d = `M${x} ${y}`; const n = 5;
    for (let i = 0; i < n; i++) {
      ang += r(-.5, .5); x += Math.cos(ang) * len / n; y += Math.sin(ang) * len / n; d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (depth > 0 && Math.random() < .35) paths.push(branch(x, y, ang + r(-1, 1), len * .5, depth - 1));
    }
    return d;
  };
  const paths = [], cx = r(30, 70), cy = r(40, 110);
  for (let k = 0; k < 4; k++) paths.push(branch(cx, cy, r(0, 6.28), r(40, 70), 1));
  paths.forEach(d => {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'rgba(255,255,255,.9)');
    p.setAttribute('stroke-width', '.7'); p.setAttribute('vector-effect', 'non-scaling-stroke');
    p.style.filter = 'drop-shadow(0 0 2px rgba(180,220,255,.9))';
    svg.appendChild(p);
  });
  lcdFrame.appendChild(svg);
  try {
    try { StudioAudio.playCrackNoise(); } catch (e) {}
    svg.animate([{ opacity: 0 }, { opacity: 1, offset: .1 }, { opacity: 1, offset: .75 }, { opacity: 0 }], { duration: 1100, fill: 'forwards' });
    await wait(1150, token);
  } finally { svg.remove(); }
}

// 抽選の重み：通常=1 / モザイク=少なめ / プレミア=低頻度
const IWAKAN_WEIGHTS = { MOSAIC: 0.5, LOGO_BLINK: 0.25, SCREEN_CRACK: 0.25, COUNT_6000: 0.25, REMAIN_77: 0.25, PT_77777: 0.25, RAINBOW_GLINT: 0.25 };
function pickWeighted(pool) {
  const w = pool.map(k => (k in IWAKAN_WEIGHTS ? IWAKAN_WEIGHTS[k] : 1));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) { r -= w[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}

async function playIwakanEffect({ is6000, rushMode, token }) {
  const commonPool = [
    'LED_ONE_OFF', 'LED_ALL_OFF', 'MONO_SCREEN', 'FADE_REMAIN', 'REM_PURU',
    'GLITCH_BLINK', 'HIDDEN_REM', 'BGM_SILENT', 'REMAIN_REWIND', 'REMAIN_202',
    'REEL_FLIP', 'REEL_BIG_MID', 'ALL_ONI_RES', 'MINI_POKYUN', 'SCREEN_TILT', 'MOSAIC',
    'LOGO_SHAKE', 'HEARTBEAT', 'REMAIN_FLOW', 'LOGO_BLINK', 'SCREEN_CRACK'
  ];
  if (typeof Yakumono !== 'undefined' && Yakumono.canFeint()) commonPool.push('LOGO_FEINT');   // 落下フェイントは間隔を空けて
  if (rushMode === 'onigakari') commonPool.push('ONI_BG_FREEZE', 'ONI_BG_BLUE', 'ONI_BG_DARK', 'ONI_MID_LATE');   // 鬼ラッシュ専用
  const pool = is6000 ? [...commonPool, 'COUNT_6000', 'REMAIN_77', 'PT_77777', 'RAINBOW_GLINT'] : commonPool;
  const pick = pickWeighted(pool);
  const baseLed = rushMode === 'brain' ? 'brain' : rushMode === 'rem' ? 'rem' : 'red';
  let label = '';

  switch (pick) {
    case 'LED_ONE_OFF': label = '役物レム消灯'; if (cabinetShell) cabinetShell.classList.add('rail-rem-off'); await wait(880, token); if (cabinetShell) cabinetShell.classList.remove('rail-rem-off'); break;
    case 'LED_ALL_OFF': label = '役物全消灯'; if (cabinetShell) cabinetShell.classList.add('rail-dim'); await wait(880, token); if (cabinetShell) cabinetShell.classList.remove('rail-dim'); break;
    case 'MONO_SCREEN': label = '液晶モノクロ化'; lcdFrame.classList.add('iwakan-mono'); await wait(860, token); lcdFrame.classList.remove('iwakan-mono'); break;
    case 'FADE_REMAIN': label = '残り回数消失'; if (hudRushRemain) hudRushRemain.classList.add('iwakan-fade-remain'); await wait(900, token); if (hudRushRemain) hudRushRemain.classList.remove('iwakan-fade-remain'); break;
    case 'REM_PURU': label = 'レムぷる(筐体微振動)'; if (cabinetShell) cabinetShell.classList.add('iwakan-rempuru'); lcdFrame.classList.add('iwakan-rempuru'); Yakumono.shake(); try { if (navigator && navigator.vibrate) navigator.vibrate([30,40,30,40,30]); } catch (e) {} await wait(860, token); if (cabinetShell) cabinetShell.classList.remove('iwakan-rempuru'); lcdFrame.classList.remove('iwakan-rempuru'); break;
    case 'ONI_BG_FREEZE': {
      label = '背景静止(時が止まる)';
      oniRushStage.classList.add('oni-bg-freeze'); window.__timeStopUntil = performance.now() + 1000;
      try { await wait(1000, token); } finally { oniRushStage.classList.remove('oni-bg-freeze'); }
      break;
    }
    case 'ONI_BG_BLUE': {
      label = '背景が青く変色';
      oniRushStage.classList.add('oni-bg-blue');
      try { await wait(900, token); } finally { oniRushStage.classList.remove('oni-bg-blue'); }
      break;
    }
    case 'ONI_BG_DARK': {
      label = '炎が消えて鬼だけ残る';
      oniRushStage.classList.add('oni-bg-dark');
      try { await wait(1000, token); } finally { oniRushStage.classList.remove('oni-bg-dark'); }
      break;
    }
    case 'ONI_MID_LATE': {
      label = '中図柄だけ変動が遅れる';
      const v = (typeof lastOniVals !== 'undefined' && lastOniVals) ? lastOniVals.slice() : [7, 1, 7];
      setOniReels(v[0], v[1], v[2], { midSpin: true });
      try { await wait(1000, token); } finally { setOniReels(v[0], v[1], v[2]); }
      break;
    }
    case 'LOGO_SHAKE': label = 'ロゴ小揺れ'; await Yakumono.shake(); await wait(420, token); break;
    case 'LOGO_FEINT': label = 'ロゴ落下フェイント'; await Yakumono.feint(); await wait(200, token); break;
    case 'HEARTBEAT': label = '心音ドクン'; await playHeartbeatPulse(token); break;
    case 'SCREEN_CRACK': label = '画面のひび'; await playCrackOverlay(token); break;
    case 'LOGO_BLINK': {
      label = '無音＋ロゴ一瞬点灯';
      BgmEngine.cut(); Yakumono.setColor('off'); await wait(620, token);
      Yakumono.setColor('chance'); await wait(240, token);
      Yakumono.setColor('white'); await wait(300, token); break;
    }
    case 'REMAIN_FLOW': {
      label = '残り回数が逆に流れる';
      if (hudRushRemain) {
        const orig = hudRushRemain.textContent, n = parseInt(orig, 10);
        try {
          if (Number.isFinite(n)) for (let i = 1; i <= 4; i++) { hudRushRemain.textContent = String(n + i); await wait(110, token); }
          await wait(380, token);
        } finally { hudRushRemain.textContent = orig; }
      } else await wait(900, token);
      break;
    }
    case 'MOSAIC': label = '画面モザイク'; await playMosaicGlitch(token); break;
    case 'GLITCH_BLINK': label = '映像ノイズ停止'; rushNoiseVeil.classList.remove('hidden'); lcdFrame.classList.add('fx-glitch'); await wait(260, token); lcdFrame.classList.remove('fx-glitch'); rushNoiseVeil.classList.add('hidden'); await wait(620, token); break;
    case 'HIDDEN_REM': {
      label = 'ひょっこり隠れレム';
      const rUrl = Assets.getRemLamp();
      hiddenRemBadge.className = 'pointer-events-none absolute bottom-2 right-3 z-[27] opacity-90 transition-opacity';
      hiddenRemBadge.innerHTML = rUrl
        ? `<img src="${rUrl}" class="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.85)]" alt="隠れレム">`
        : `<span class="px-2 py-0.5 rounded bg-sky-900/90 text-sky-200 text-xs font-black">レム</span>`;
      hiddenRemBadge.classList.remove('hidden'); await wait(960, token); hiddenRemBadge.classList.add('hidden'); break;
    }
    case 'BGM_SILENT': label = 'BGM無音停止'; BgmEngine.cut(); await wait(940, token); break;
    case 'REMAIN_REWIND': {
      label = '残り回数巻き戻り(+1)';
      if (hudRushRemain) { const orig = hudRushRemain.textContent; hudRushRemain.textContent = String((parseInt(orig, 10) || 100) + 1); await wait(960, token); hudRushRemain.textContent = orig; }
      break;
    }
    case 'REMAIN_202': {
      label = '残り回数「202」(レム誕生日)';
      if (hudRushRemain) { const orig = hudRushRemain.textContent; hudRushRemain.textContent = '202'; hudRushRemain.className = 'text-lg sm:text-xl font-black cyan-grad-text leading-none num-fixed'; await wait(960, token); hudRushRemain.textContent = orig; hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none num-fixed'; }
      break;
    }
    case 'REMAIN_77': {
      label = '残り回数「77」変化';
      if (hudRushRemain) { const orig = hudRushRemain.textContent; hudRushRemain.textContent = '77'; hudRushRemain.className = 'text-lg sm:text-xl font-black rainbow-grad-text leading-none num-fixed'; await wait(960, token); hudRushRemain.textContent = orig; hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none num-fixed'; }
      break;
    }
    case 'PT_77777': {
      label = '累計払出「77,777個」変化';
      const dispEl = document.getElementById('rushDispDisplay');
      if (dispEl) { const orig = dispEl.textContent; dispEl.textContent = '77,777個'; await wait(960, token); dispEl.textContent = orig; }
      else await wait(600, token);
      break;
    }
    case 'REEL_FLIP': {
      label = '図柄上下反転';
      const arr = rushMode === 'rem' ? remReels : oniReels;
      arr.forEach(el => { if (el) el.style.transform = 'rotate(180deg)'; }); await wait(900, token); arr.forEach(el => { if (el) el.style.transform = ''; }); break;
    }
    case 'REEL_BIG_MID': {
      label = '中図柄巨大化';
      const mid = rushMode === 'rem' ? remReels[1] : oniReels[1];
      if (mid) mid.style.transform = rushMode === 'onigakari' ? 'scale(1.2)' : 'scale(1.48)'; await wait(900, token); if (mid) mid.style.transform = ''; break;
    }
    case 'ALL_ONI_RES': {
      label = '保留すべて「鬼」変化';
      if (rushMode !== 'brain') updateReserveSlots('NORMAL', 'ALL_ONI'); await wait(920, token); if (rushMode !== 'brain') updateReserveSlots('NORMAL', null); break;
    }
    case 'MINI_POKYUN': label = '極小ポキュン音'; StudioAudio.playMiniPokyun(); await wait(840, token); break;
    case 'SCREEN_TILT': label = '液晶わずかに傾き'; Yakumono.shake(); lcdFrame.style.transform = 'rotate(-2.4deg)'; await wait(900, token); lcdFrame.style.transform = ''; break;
    case 'COUNT_6000': {
      label = '残り回数「6000」変化';
      if (hudRushRemain) { const orig = hudRushRemain.textContent; hudRushRemain.textContent = '6000'; hudRushRemain.className = 'text-lg sm:text-xl font-black rainbow-grad-text leading-none num-fixed'; await wait(960, token); hudRushRemain.textContent = orig; hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none num-fixed'; }
      break;
    }
    case 'RAINBOW_GLINT': label = 'レム＆役物一瞬虹発光'; setCabinetGlow('rainbow'); setYakumonoColor('rainbow'); await wait(220, token); setCabinetGlow('idle'); setYakumonoColor('white'); await wait(680, token); break;
  }
  return label;
}

// -------------------------------------------------------------------------
// 15. ★液晶内ブラックアウト「鬼がかってますね」・カウントアップ・死に戻り・昇格★
// -------------------------------------------------------------------------
async function playOnigakariImageCutin({
  caption = '鬼がかってますね', dur = 3600, withPokyun = true, fromBlackout = false, token
}) {
  BgmEngine.cut();
  const imgSrc = Assets.getOnigakari();
  const host = lcdOnigakariOverlay;
  if (!host) return;
  const rnd = (a, b) => a + Math.random() * (b - a);
  let sparkTimer = null;

  try {
    // ① 暗転（液晶内のみ・背景は黒のまま）。役物・レム・背景の光も落とす
    setCabinetGlow('off'); setLed('off'); setAmbientBg(''); setSunburst(false);
    host.innerHTML = ''; host.classList.remove('hidden');
    if (!fromBlackout) host.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    await waitFreeze(fromBlackout ? 700 : 560, token);

    // ② キラキラ（暗闇に星が瞬く。長めに続く）
    const sp = document.createElement('div');
    sp.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:20';
    host.appendChild(sp);
    const spawnStar = () => {
      if (!sp.isConnected) return;
      const sz = rnd(3, 9), st = document.createElement('div');
      st.style.cssText = `position:absolute;left:${rnd(4, 96)}%;top:${rnd(6, 94)}%;width:${sz}px;height:${sz}px;border-radius:50%;background:#fff;box-shadow:0 0 ${sz * 2}px ${sz / 2}px rgba(254,240,138,.85);opacity:0`;
      sp.appendChild(st);
      const an = st.animate([{ opacity: 0, transform: 'scale(0)' }, { opacity: 1, transform: 'scale(1.4)' }, { opacity: 0, transform: 'scale(.3)' }],
        { duration: rnd(800, 1500), easing: 'ease-in-out' });
      an.onfinish = () => st.remove();
    };
    for (let i = 0; i < 14; i++) setTimeout(spawnStar, rnd(0, 700));   // 立ち上がり
    sparkTimer = setInterval(spawnStar, 75);                           // 以降は最後まで継続
    await waitFreeze(1000, token);                         // キラキラが始まってから

    // ③ キラキラの途中で、画像をとても緩やかにフェードイン
    host.insertAdjacentHTML('afterbegin', `
      <div class="relative z-10 w-full flex flex-col items-center gap-2 px-1">
        <div id="cutinFrameBox" class="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/20 bg-black" style="opacity:0">
          ${imgSrc ? `<img src="${imgSrc}" alt="鬼がかってますね" class="w-full h-full object-cover">`
            : `<div class="w-full h-full flex items-center justify-center"><span class="font-mincho text-2xl font-black text-white">${caption}</span></div>`}
          <div id="cutinShimmerBar" class="hidden prism-shimmer-bar"></div>
        </div>
        <div id="cutinCapText" class="font-mincho text-xl sm:text-3xl font-black tracking-widest whitespace-nowrap" style="min-height:1.4em"></div>
      </div>`);
    const box = document.getElementById('cutinFrameBox'), shimmer = document.getElementById('cutinShimmerBar'), cap = document.getElementById('cutinCapText');
    if (box) box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 3000, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });
    await waitFreeze(3000, token);

    // ④ 画面表示（枠が脈打つ。背景は黒のまま、縁だけ虹）
    if (box) box.classList.add('mystic-halo-frame');
    if (shimmer) shimmer.classList.remove('hidden');
    setCabinetGlow('rainbow'); setYakumonoColor('rainbow');
    await waitFreeze(600, token);

    // ⑤ 「鬼がかってますね」を左から1文字ずつ、虹色でゆっくり
    const chars = Array.from(caption);
    if (cap) {
      chars.forEach((ch, i) => {
        const hue = (i * 47) % 360, sp2 = document.createElement('span'); sp2.textContent = ch;
        sp2.style.cssText = `display:inline-block;opacity:0;color:hsl(${hue},96%,72%);text-shadow:0 0 14px hsl(${hue},96%,62%),0 2px 10px rgba(0,0,0,.9)`;
        cap.appendChild(sp2);
        sp2.animate([{ opacity: 0, transform: 'translateX(-14px)' }, { opacity: 1, transform: 'translateX(0)' }],
          { duration: 560, delay: i * 320, easing: 'ease-out', fill: 'forwards' });
      });
    }
    await waitFreeze(chars.length * 320 + 560 + 900, token);
  } finally {
    if (sparkTimer) clearInterval(sparkTimer);
    host.classList.add('hidden'); host.innerHTML = '';
  }
}

function get6000LogoKey(rushMode) {
  const rm = rushMode || (typeof state !== 'undefined' ? state.rushMode : 'onigakari');
  if (rm === 'brain' && Assets.getLogo('brain6000')) return 'brain6000';
  return Assets.getLogo('oni6000') ? 'oni6000' : (Assets.getLogo('brain6000') ? 'brain6000' : null);
}

function applyBonusModeTheme(rushMode, { isDespair = false, is6000 = false } = {}) {
  lcdFrame.classList.remove('mode-despair-bg', 'fx-gold', 'fx-rainbow', 'bonus-theme-brain', 'bonus-theme-rem');
  if (isDespair) { lcdFrame.classList.add('mode-despair-bg'); return { titleCls: 'text-lg sm:text-2xl font-black text-slate-100 drop-shadow pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.16em] text-sky-200 leading-none' }; }
  if (is6000) { lcdFrame.classList.add('fx-rainbow'); return { titleCls: 'text-xl sm:text-3xl font-black rainbow-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.16em] text-amber-300 leading-none' }; }
  if (rushMode === 'brain') { lcdFrame.classList.add('bonus-theme-brain'); return { titleCls: 'text-lg sm:text-2xl font-black purple-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.16em] text-fuchsia-300 leading-none' }; }
  if (rushMode === 'rem') { lcdFrame.classList.add('bonus-theme-rem'); return { titleCls: 'text-lg sm:text-2xl font-black cyan-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.16em] text-sky-300 leading-none' }; }
  lcdFrame.classList.add('fx-gold');
  return { titleCls: 'text-lg sm:text-2xl font-black gold-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.16em] text-amber-300 leading-none' };
}

async function runCountUpBreak6000({ rushMode = 'onigakari', iwakanAnswer = '', token }) {
  try {
    BgmEngine.cut();
    setActiveScene('bonus'); hideIwakanAnswer();
    const th = applyBonusModeTheme(rushMode, { isDespair: false });
    setBonusSceneBackdrop('1500');
    StudioAudio.play1500Jackpot(true); FxCanvas.burstGold(48);

    setBonusLogo(Assets.getVStock('v1500') ? 'v1500' : (rushMode === 'brain' ? 'rezeroPurple' : 'rezeroChain'));
    bonusSubLabel.className = th.subCls;
    bonusSubLabel.textContent = rushMode === 'brain' ? '脳が震えるRUSH' : rushMode === 'rem' ? 'レム告知モード' : '鬼がかりRUSH';
    bonusMainTitle.className = th.titleCls; bonusMainTitle.textContent = '';
    bonusCountNum.classList.remove('hidden');
    bonusCountNum.className = 'text-4xl sm:text-5xl font-black gold-grad-text tracking-tight leading-none pop-in num-fixed';
    bonusCountNum.textContent = '1,500';
    bonusDesc.textContent = '払出 1,500個…';
    if (iwakanAnswer) showIwakanAnswer(iwakanAnswer, false);

    const waitRes = await waitInterruptible(1150, token);
    if (waitRes === 'OK_INTERRUPT') { await runSuddenOchiburu6000({ sub: '限界突破!!', rushMode, token }); return; }

    StudioAudio.playSoftHeartbeat(); lcdFrame.classList.add('shake-mid');
    bonusDesc.textContent = '止まらない…!!'; await wait(520, token);

    for (const st of [
      { val: '3,000', snd: () => StudioAudio.playKyuin(), desc: '限界突破 3,000!!', color: '#fef08a' },
      { val: '4,500', snd: () => StudioAudio.playPokyun(true), desc: 'さらに上乗せ 4,500!!', color: '#7dd3fc' }
    ]) {
      st.snd();
      bonusCountNum.className = 'text-4xl sm:text-5xl font-black rainbow-grad-text tracking-tight leading-none count-break-pop num-fixed';
      bonusCountNum.textContent = st.val; bonusDesc.textContent = st.desc;
      FxCanvas.spawnRing(st.color, 300, 9); FxCanvas.burstRainbow(52);
      await wait(680, token);
    }

    lcdFrame.classList.remove('shake-mid');
    StudioAudio.playOchiburu(true); StudioAudio.playSlash(); fireImageRipSlash('1500');
    setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow'); triggerLamp('rainbow', '6,000!!');
    showFullscreenOverlay({
      mode: 'rainbow', sub: '限界突破', main: '超・鬼がかり 6,000 BONUS!!',
      logoKey: get6000LogoKey(rushMode), premia: true,
      extra: '1,500 → 3,000 → 4,500 → 6,000個（実質純増 5,600発）!!'
    });
    await wait(1100, token); StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(68);
    await wait(2150, token);
  } finally { bonusCountNum.classList.add('hidden'); setBonusSceneBackdrop(null); clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runResultRevivalSequence(token) {
  try {
    BgmEngine.cut(); StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setCabinetGlow('off'); setLed('off'); setAmbientBg(''); setSunburst(false);

    lcdFrame.classList.add('fx-rgb-glitch');
    showFullscreenOverlay({ mode: 'blackout', sub: '', main: '', extra: '', scanlines: true });
    await waitFreeze(900, token);
    lcdFrame.classList.remove('fx-rgb-glitch');

    StudioAudio.playSoftHeartbeat();
    FxCanvas.spawnPurpleHands(34);
    showFullscreenOverlay({ mode: 'blackout', sub: 'RETURN BY DEATH', main: '……まだ、終わっていない', extra: '', scanlines: true });
    await waitFreeze(1150, token);
    hideFullscreenOverlay();

    setActiveScene('bonus'); setBonusLogo(null); setBonusSceneBackdrop('restart');
    bonusSubLabel.textContent = ''; bonusMainTitle.textContent = ''; bonusDesc.textContent = '';
    StudioAudio.playReStart(); FxCanvas.burstFlames(40);
    await waitFreeze(980, token);

    StudioAudio.playPokyun(true); StudioAudio.playOchiburu(true); StudioAudio.playSlash();
    fireImageRipSlash('restart');
    setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow'); triggerLamp('rainbow', '死に戻り復活!!');
    showFullscreenOverlay({
      mode: 'rainbow', sub: '死に戻り復活', main: '超・鬼がかり 6,000 BONUS!!',
      logoKey: get6000LogoKey(), premia: true,
      extra: '絶望からの奇跡の逆転!! 払出 6,000個（純増 5,600発）＋ ST144回復活!!'
    });
    await wait(950, token); StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(72);
    await wait(2200, token);
  } finally { setBonusSceneBackdrop(null); clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runWhale3000Direct(token) {
  try {
    BgmEngine.cut();
    await triggerYakumonoDrop({ color: 'rainbow', holdMs: 920, withNiziiroBack: true, token });
    setAmbientBg('rainbow'); setSunburst(true); fireGlobalRainbowFlash();
    StudioAudio.playSlash(); firePhysicalSplitSlash();
    showFullscreenOverlay({
      mode: 'rainbow', sub: '白鯨討伐・3,000 BONUS', main: '鬼がかり 3,000 BONUS!!',
      logoKey: 'rezeroChain', premia: true,
      extra: '払出 3,000個（純増 2,800発）＋ 鬼がかりRUSH直行!!'
    });
    StudioAudio.play3000Jackpot(); triggerLamp('rainbow', '3,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
    await wait(2200, token); lcdFrame.classList.remove('shake-burst');
  } finally { clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runSuddenOchiburu6000({ sub = '鬼がかりRUSH', extra = '払出 6,000個（実質純増 5,600発）獲得!!', rushMode = null, skipAlarm = false, token }) {
  try {
    BgmEngine.cut();
    if (!skipAlarm) StudioAudio.playOchiburu(true);
    setAmbientBg('rainbow'); setSunburst(true); setPageMegaShake(true); fireGlobalRainbowFlash();
    triggerLamp('rainbow', '6,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-intense'); setLed('rainbow');
    FxCanvas.spawnLightning('#fef08a', 6); FxCanvas.burstRainbow(72);
    showFullscreenOverlay({ mode: 'rainbow', sub, main: '超・鬼がかり 6,000 BONUS!!', logoKey: get6000LogoKey(rushMode), premia: true, extra });
    await wait(skipAlarm ? 300 : 1250, token);
    setPageMegaShake(false); lcdFrame.classList.remove('shake-intense');
    StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(64);
    await wait(2150, token);
  } finally { clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runSudden3sFreeze6000(token) {
  try {
    BgmEngine.cut(); StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setCabinetGlow('off'); setLed('off'); setAmbientBg(''); setSunburst(false);
    if (lcdOnigakariOverlay) { lcdOnigakariOverlay.innerHTML = ''; lcdOnigakariOverlay.classList.remove('hidden'); }
    await waitFreeze(1800, token);

    await playOnigakariImageCutin({ caption: '鬼がかってますね', dur: 3500, withPokyun: true, fromBlackout: true, token });

    StudioAudio.playSlash(); StudioAudio.playOchiburu(false); firePhysicalSplitSlash();
    setAmbientBg('rainbow'); setSunburst(true);
    showFullscreenOverlay({ mode: 'rainbow', sub: '鬼がかってますね', main: '超・鬼がかり 6,000 BONUS!!', logoKey: get6000LogoKey(), premia: true, extra: '払出 6,000個（実質純増 5,600発）獲得!!' });
    StudioAudio.play6000Fanfare(false); triggerLamp('rainbow', '6,000!!');
    lcdFrame.classList.add('fx-rainbow'); setLed('rainbow');
    await wait(2300, token);
  } finally { clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runGoldenPromotionSequence({
  fakeSub, fakeTitle, fakeDesc, fakeStyle = 'despair', fakeRestart = false,
  fakeSound = '300', fakeIsRush = false, fakeBurstGold = false, rushMode = 'onigakari',
  iwakanAnswer = '', finalSub, finalTitle, finalExtra, finalSound = '6000',
  crashType = 'auto', token
}) {
  let mode = crashType, useRareWhisper = false;
  if (mode === 'auto') {
    if (finalSound === '6000') {
      const r = Math.random();
      if (fakeRestart || fakeSound === 'restart') mode = r < 0.45 ? 'pokyun' : 'slash';
      else if (r < 0.22) mode = 'pokyun';
      else if (r < 0.36) mode = 'freeze3s';
      else {
        const pool = ['slash', 'drop', 'shatter', 'quake', 'botan'];
        mode = pool[Math.floor(Math.random() * pool.length)];
        if (Math.random() < 0.22) useRareWhisper = true;
      }
    } else {
      const pool = ['freeze3s', 'slash', 'botan', 'shatter'];
      mode = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  const finalLogoKey = finalSound === '6000' ? get6000LogoKey(rushMode) : 'oniRush';
  const ripSource = (fakeRestart || fakeSound === 'restart') ? 'restart' : (fakeSound === '300' ? '300' : (fakeSound === '1500' ? '1500' : null));

  try {
    BgmEngine.cut();
    setActiveScene('bonus'); hideIwakanAnswer();

    if (fakeRestart || fakeSound === 'restart') {
      StudioAudio.playReStart(); setBonusLogo(null); setBonusSceneBackdrop('restart');
      bonusSubLabel.textContent = ''; bonusMainTitle.textContent = ''; bonusDesc.textContent = '';
    } else if (fakeSound === '300' && fakeIsRush) {
      StudioAudio.playVImpact(false); StudioAudio.play300Sound();
      const th = applyBonusModeTheme(rushMode, { isDespair: true });
      setBonusSceneBackdrop('300');
      setBonusLogo(Assets.getVStock('v300') ? 'v300' : 'rezeroPurple');
      bonusSubLabel.className = th.subCls; bonusMainTitle.className = th.titleCls;
      bonusSubLabel.textContent = fakeSub; bonusMainTitle.textContent = fakeTitle; bonusDesc.textContent = fakeDesc;
    } else if (fakeSound === '1500' && fakeIsRush) {
      StudioAudio.playVImpact(true); StudioAudio.play1500Jackpot(true);
      const th = applyBonusModeTheme(rushMode, { isDespair: false });
      setBonusSceneBackdrop('1500');
      setBonusLogo(Assets.getVStock('v1500') ? 'v1500' : 'rezeroChain');
      bonusSubLabel.className = th.subCls; bonusMainTitle.className = th.titleCls;
      bonusSubLabel.textContent = fakeSub; bonusMainTitle.textContent = fakeTitle; bonusDesc.textContent = fakeDesc;
      if (fakeBurstGold) FxCanvas.burstGold(44);
    } else {
      if (fakeSound === 'fail') StudioAudio.playFail();
      else StudioAudio.play1500Jackpot(fakeIsRush);
      const th = applyBonusModeTheme(rushMode, { isDespair: fakeStyle === 'despair' });
      setBonusSceneBackdrop(null);
      setBonusLogo(fakeStyle === 'despair' || rushMode === 'brain' ? 'rezeroPurple' : 'rezeroChain');
      bonusSubLabel.className = th.subCls; bonusMainTitle.className = th.titleCls;
      bonusSubLabel.textContent = fakeSub; bonusMainTitle.textContent = fakeTitle; bonusDesc.textContent = fakeDesc;
    }

    if (iwakanAnswer && !useRareWhisper) showIwakanAnswer(iwakanAnswer, false);

    const waitRes = await waitInterruptible(1280, token);

    if (waitRes === 'OK_INTERRUPT') {
      StudioAudio.playSlash(); StudioAudio.playOchiburu(true);
      if (ripSource) fireImageRipSlash(ripSource); else firePhysicalSplitSlash();
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
      triggerLamp('rainbow', '6,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(1100, token); StudioAudio.play6000Fanfare(false); await wait(2000, token);
      lcdFrame.classList.remove('shake-burst'); return;
    }

    if (mode === 'pokyun') {
      StudioAudio.playPokyun(true); StudioAudio.playOchiburu(true); StudioAudio.playSlash();
      if (ripSource) fireImageRipSlash(ripSource); else firePhysicalSplitSlash();
      setAmbientBg('rainbow'); setSunburst(true); triggerLamp('rainbow', '6,000!!');
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(950, token); StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(72);
      await wait(2200, token); lcdFrame.classList.remove('shake-burst'); return;
    }

    if (mode === 'slash' && ripSource) {
      StudioAudio.playPokyun(true); StudioAudio.playSlash(); StudioAudio.playOchiburu(true);
      fireImageRipSlash(ripSource);
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
      triggerLamp('rainbow', finalSound === '3000' ? 'RUSH!!' : '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(950, token);
      if (finalSound === '3000') StudioAudio.play3000Jackpot(); else StudioAudio.play6000Fanfare(false);
      await wait(2150, token); lcdFrame.classList.remove('shake-burst'); return;
    }

    if (mode === 'botan') {
      showUniversalBotan({ label: '一撃昇格!!', vibe: 'max', color: 'rainbow', drop: true });
      StudioAudio.playOchiburu(true); setPageMegaShake(true); await wait(1050, token);
      setPageMegaShake(false); hideUniversalBotan();
      StudioAudio.playSlash(); if (ripSource) fireImageRipSlash(ripSource); else firePhysicalSplitSlash();
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
      triggerLamp('rainbow', finalSound === '3000' ? 'RUSH!!' : '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(260, token);
      if (finalSound === '3000') StudioAudio.play3000Jackpot(); else StudioAudio.play6000Fanfare(false);
      await wait(2150, token); lcdFrame.classList.remove('shake-burst'); return;
    }

    if (useRareWhisper) {
      StudioAudio.playSoftHeartbeat(); showIwakanAnswer('これから脳が震える…', true);
      await wait(1250, token);
    }

    StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setCabinetGlow('off'); setLed('off'); setAmbientBg(''); setSunburst(false);
    lcdFrame.classList.remove('fx-gold', 'fx-rainbow', 'mode-despair-bg', 'bonus-theme-brain', 'bonus-theme-rem');

    if (mode === 'freeze3s') {
      if (lcdOnigakariOverlay) { lcdOnigakariOverlay.innerHTML = ''; lcdOnigakariOverlay.classList.remove('hidden'); }
      await waitFreeze(1600, token);
      await playOnigakariImageCutin({ caption: '鬼がかってますね', dur: 3400, withPokyun: true, fromBlackout: true, token });
    } else {
      showFullscreenOverlay({ mode: 'blackout', sub: '', main: '', extra: '', scanlines: false });
      await wait(650, token);
      StudioAudio.playCrackNoise(); crtScanLayer.classList.remove('hidden');
      lcdFrame.classList.add('fx-glitch'); FxCanvas.spawnRedCracks();
      await wait(450, token); lcdFrame.classList.remove('fx-glitch');
    }

    FxCanvas.clearCracks();
    if (mode !== 'freeze3s') StudioAudio.playPokyun(true);
    StudioAudio.playSlash(); StudioAudio.playOchiburu(mode !== 'freeze3s');
    if (mode === 'drop') fireDropCrash(fakeTitle);
    else if (mode === 'shatter') fireShatterFly();
    else if (mode === 'quake') fireMegaQuakeBrainBreak();
    else if (ripSource) fireImageRipSlash(ripSource);
    else firePhysicalSplitSlash();

    setAmbientBg('rainbow'); setSunburst(true);
    showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
    triggerLamp('rainbow', finalSound === '3000' ? 'RUSH!!' : '6,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
    await wait(mode === 'freeze3s' ? 150 : 950, token);
    if (finalSound === '3000') StudioAudio.play3000Jackpot(); else StudioAudio.play6000Fanfare(false);
    await wait(2150, token); lcdFrame.classList.remove('shake-burst');
  } finally { setBonusSceneBackdrop(null); clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}
