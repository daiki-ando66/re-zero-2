// =========================================================================
// effects.js (v6.0) : 軽量化＋新V-STOCK＋Re:Start＋本家違和感18種＋画像版隠れレム
// =========================================================================

// -------------------------------------------------------------------------
// 1. 1,500大当たり新音源・300専用控えめ音・ガラス粉砕音・極小ポキュン
// -------------------------------------------------------------------------
const ExtraAudioV51 = (() => {
  let ctx = null;
  let noiseBuf = null;
  let muted = false;
  let vol = 0.80;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      const len = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function play1500(isRush = false) {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.01;
    const master = c.createGain(); master.gain.value = vol * 0.58;
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 6;
    comp.connect(master).connect(c.destination);

    const sub = c.createOscillator(), subG = c.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(165, now); sub.frequency.exponentialRampToValueAtTime(36, now + 0.36);
    subG.gain.setValueAtTime(0.001, now); subG.gain.linearRampToValueAtTime(1.15, now + 0.006); subG.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    sub.connect(subG).connect(comp); sub.start(now); sub.stop(now + 0.46);

    const nSrc = c.createBufferSource(); nSrc.buffer = noiseBuf;
    const hp = c.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 3400; hp.Q.value = 2.4;
    const nG = c.createGain(); nG.gain.setValueAtTime(0.55, now); nG.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    nSrc.connect(hp).connect(nG).connect(comp); nSrc.start(now); nSrc.stop(now + 0.26);

    [1760, 2637, 3520].forEach((hz, idx) => {
      const m = c.createOscillator(), mg = c.createGain();
      m.type = 'triangle'; m.frequency.setValueAtTime(hz * 0.92, now); m.frequency.exponentialRampToValueAtTime(hz, now + 0.04);
      mg.gain.setValueAtTime(0.001, now); mg.gain.linearRampToValueAtTime(0.24 - idx * 0.05, now + 0.008); mg.gain.exponentialRampToValueAtTime(0.001, now + 0.34);
      m.connect(mg).connect(comp); m.start(now); m.stop(now + 0.36);
    });

    const seq = isRush
      ? [
          { t: 0.05, notes: [293.66, 440.00, 587.33], dur: 0.14 },
          { t: 0.18, notes: [369.99, 554.37, 739.99], dur: 0.14 },
          { t: 0.31, notes: [440.00, 659.25, 880.00], dur: 0.16 },
          { t: 0.45, notes: [587.33, 739.99, 880.00, 1174.66], dur: 0.78 }
        ]
      : [
          { t: 0.06, notes: [261.63, 392.00, 523.25], dur: 0.15 },
          { t: 0.20, notes: [329.63, 493.88, 659.25], dur: 0.15 },
          { t: 0.34, notes: [392.00, 587.33, 783.99], dur: 0.16 },
          { t: 0.49, notes: [523.25, 659.25, 783.99, 1046.50], dur: 0.80 }
        ];

    seq.forEach((step, sIdx) => {
      const st = now + step.t;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.6;
      lp.frequency.setValueAtTime(1400, st);
      lp.frequency.exponentialRampToValueAtTime(sIdx === 3 ? 6400 : 4200, st + 0.09);
      lp.frequency.exponentialRampToValueAtTime(2200, st + step.dur);
      const env = c.createGain();
      env.gain.setValueAtTime(0.001, st);
      env.gain.linearRampToValueAtTime(sIdx === 3 ? 0.32 : 0.24, st + 0.018);
      env.gain.setValueAtTime(sIdx === 3 ? 0.26 : 0.18, st + step.dur * 0.65);
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
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(0.16, st + 0.01); g.gain.exponentialRampToValueAtTime(0.001, st + 0.55);
      o.connect(g).connect(comp); o.start(st); o.stop(st + 0.58);
    });
  }

  function play300() {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.01;
    const master = c.createGain(); master.gain.value = vol * 0.42;
    master.connect(c.destination);

    const th = c.createOscillator(), thG = c.createGain();
    th.type = 'sine'; th.frequency.setValueAtTime(110, now); th.frequency.exponentialRampToValueAtTime(48, now + 0.18);
    thG.gain.setValueAtTime(0.55, now); thG.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    th.connect(thG).connect(master); th.start(now); th.stop(now + 0.24);

    [392.00, 523.25].forEach((hz, i) => {
      const st = now + 0.05 + i * 0.14;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(hz, st);
      g.gain.setValueAtTime(0.001, st); g.gain.linearRampToValueAtTime(0.28, st + 0.015); g.gain.exponentialRampToValueAtTime(0.001, st + 0.34);
      o.connect(g).connect(master); o.start(st); o.stop(st + 0.36);
    });
  }

  function playGlassBreak() {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.005;
    const master = c.createGain(); master.gain.value = vol * 0.62;
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

  // ★V-STOCK降臨「ガキィィン!!」金属インパクト音★
  function playVImpact(isRed = false) {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.005;
    const master = c.createGain(); master.gain.value = vol * 0.68;
    master.connect(c.destination);

    const sub = c.createOscillator(), subG = c.createGain();
    sub.type = 'sine'; sub.frequency.setValueAtTime(isRed ? 190 : 150, now); sub.frequency.exponentialRampToValueAtTime(34, now + 0.34);
    subG.gain.setValueAtTime(1.1, now); subG.gain.exponentialRampToValueAtTime(0.001, now + 0.40);
    sub.connect(subG).connect(master); sub.start(now); sub.stop(now + 0.42);

    const freqs = isRed ? [880, 1318.5, 1760, 2637] : [784, 1174.7, 1568, 2349];
    freqs.forEach((hz, idx) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
      o.frequency.setValueAtTime(hz * 0.85, now); o.frequency.exponentialRampToValueAtTime(hz, now + 0.035);
      g.gain.setValueAtTime(0.001, now); g.gain.linearRampToValueAtTime(0.26 - idx * 0.04, now + 0.01); g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      o.connect(g).connect(master); o.start(now); o.stop(now + 0.58);
    });
  }

  // ★極小ポキュン（違和感用：気づく人だけ気づく小さな先バレ音）★
  function playMiniPokyun() {
    if (muted || vol <= 0.01) return;
    const c = ensure(); if (!c) return;
    const now = c.currentTime + 0.01;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(920, now);
    o.frequency.exponentialRampToValueAtTime(1950, now + 0.06);
    o.frequency.exponentialRampToValueAtTime(1280, now + 0.24);
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(vol * 0.14, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    o.connect(g).connect(c.destination);
    o.start(now); o.stop(now + 0.30);
  }

  return {
    play1500, play300, playGlassBreak, playVImpact, playMiniPokyun,
    setMuted: (m) => { muted = !!m; },
    setVolume: (v) => { vol = Math.max(0, Math.min(1, v)); }
  };
})();

if (typeof StudioAudio !== 'undefined') {
  StudioAudio.play1500Jackpot = (isRush = false) => ExtraAudioV51.play1500(isRush);
  StudioAudio.play300Sound = () => ExtraAudioV51.play300();
  StudioAudio.playGlassBreak = () => ExtraAudioV51.playGlassBreak();
  StudioAudio.playVImpact = (isRed = false) => ExtraAudioV51.playVImpact(isRed);
  StudioAudio.playMiniPokyun = () => ExtraAudioV51.playMiniPokyun();
  const _origToggleMute = StudioAudio.toggleMute;
  StudioAudio.toggleMute = function () { const m = _origToggleMute(); ExtraAudioV51.setMuted(m); return m; };
  const _origSetVol = StudioAudio.setVolume;
  StudioAudio.setVolume = function (v) { ExtraAudioV51.setVolume(v); return _origSetVol(v); };
}

// -------------------------------------------------------------------------
// 2. 高画質画像加工エンジン（v1500 / v300 / 1500 / 300 / restart 追加）
// -------------------------------------------------------------------------
const Assets = (() => {
  let onigakariSrc = null;
  let remLampUrl = null;
  let botanUrl = null;
  let premiaFrameUrl = null;
  const peteFrames = new Array(6).fill(null);
  const wedding9Frames = new Array(9).fill(null);
  const digits = {}; // 0..8
  const wedding = { bg1: null, gensitu: null, stairs: null, arch: null, btn: null, onigakari: null };
  const logos = {
    brainRush: null, wedding: null, brain6000: null, oniRush: null, oni6000: null,
    rezeroChain: null, rezeroPurple: null, furueru: null
  };
  const vstock = { v1500: null, v300: null, bg1500: null, bg300: null, restart: null };

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
    const midA = new Uint8Array(total);
    for (let i = 0; i < total; i++) midA[i] = d[i * 4 + 3];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (midA[idx] === 0) continue;
        if (midA[idx - 1] === 0 || midA[idx + 1] === 0 || midA[idx - w] === 0 || midA[idx + w] === 0) {
          const p = idx * 4;
          const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          d[p + 3] = Math.min(d[p + 3], lum > 180 ? 120 : 210);
        }
      }
    }
    c.putImageData(imgData, 0, 0);
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

  function processSingleImage(img, maxDim = 920, { softFlame = false, trim = false } = {}) {
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
        wedding9Frames[idx] = cv.toDataURL('image/jpeg', 0.90);
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
        const outW = Math.min(600, Math.round(sw * 1.35)), outH = Math.min(600, Math.round(sh * 1.35));
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
    tryLoadList(['onigakari.jpg', 'onigakari.png'], (_img, src) => { onigakariSrc = src; });
    tryLoadList(['rem_lamp.jpg', 'rem_lamp.png'], (img) => {
      remLampUrl = processSingleImage(img, 880);
      const r1 = document.getElementById('remLampImg'), r2 = document.getElementById('oniRemApproachImg');
      if (r1) r1.src = remLampUrl; if (r2) r2.src = remLampUrl;
      if (typeof syncRushStages === 'function') syncRushStages();
    });
    tryLoadList(['botan.jpg', 'botan.png'], (img) => {
      botanUrl = processSingleImage(img, 640);
      ['brainBotanImg', 'reachBotanImg', 'uniBotanImg'].forEach(id => { const el = document.getElementById(id); if (el) el.src = botanUrl; });
    });
    tryLoadList(['pete.jpg', 'pete.png'], (img) => { processPeteGrid(img); if (typeof syncRushStages === 'function') syncRushStages(); });

    tryLoadList(['digits.jpg', 'digits.png'], processDigitsGrid);
    tryLoadList(['0.jpg', '0.png'], (img) => { digits[0] = processSingleImage(img, 500, { softFlame: true, trim: true }); });

    tryLoadList(['premia.jpg', 'premia.png'], (img) => {
      premiaFrameUrl = processPremiaFrame(img);
      const pf = document.getElementById('premiaFrameImg');
      if (pf) pf.src = premiaFrameUrl;
    });

    tryLoadList(['oni_rush.jpg', 'oni_rush.png', 'onigakarirush.webp'], (img) => { logos.oniRush = processSingleImage(img, 880, { trim: true }); });
    tryLoadList(['oni_6000.jpg', 'oni_6000.png', 'onigakari6000.webp'], (img) => { logos.oni6000 = processSingleImage(img, 880, { softFlame: true, trim: true }); });
    tryLoadList(['nougahurueru.jpg', 'logo_brain_rush.jpg'], (img) => { logos.brainRush = processSingleImage(img, 840, { trim: true }); });
    tryLoadList(['wedding.jpg', 'logo_wedding.jpg'], (img) => { logos.wedding = processSingleImage(img, 880, { trim: true }); });
    tryLoadList(['hurueru6000.jpg', 'logo_brain_6000.jpg'], (img) => { logos.brain6000 = processSingleImage(img, 840, { softFlame: true, trim: true }); });
    tryLoadList(['rezero bonus.jpg', 'rezero_bonus.jpg'], (img) => { logos.rezeroChain = processSingleImage(img, 840, { trim: true }); });
    tryLoadList(['pete rezero bonus.jpg', 'pete_rezero_bonus.jpg'], (img) => { logos.rezeroPurple = processSingleImage(img, 840, { trim: true }); });
    tryLoadList(['hurueru.jpg', 'logo_furueru.jpg'], (img) => {
      logos.furueru = processSingleImage(img, 800, { softFlame: true, trim: true });
      const fImg = document.getElementById('brainFurueruImg'); if (fImg) fImg.src = logos.furueru;
    });

    tryLoadList(['wedding1.jpg', 'wedding1.png'], (_img, src) => { wedding.bg1 = src; });
    tryLoadList(['gensitu.jpg', 'gensitu.png'], (img) => { wedding.gensitu = processSingleImage(img, 880, { trim: true }); });
    tryLoadList(['wedding9.jpg', 'wedding9.png'], processWedding9Grid);
    tryLoadList(['wedding_stairs.jpg', 'kaidan.jpg'], (_img, src) => { wedding.stairs = src; });
    tryLoadList(['wedding_arch.jpg', 'hana.jpg'], (_img, src) => { wedding.arch = src; });
    tryLoadList(['wed_botan.jpg', 'wedding_btn.jpg'], (_img, src) => { wedding.btn = src; });
    tryLoadList(['wedding_onigakari.jpg', 'wed_onigakari.jpg'], (_img, src) => { wedding.onigakari = src; });

    // ★新素材5枚（V-STOCK赤/青・背景1500/300・Re:Start）★
    tryLoadList(['v1500.jpg', 'v1500.png'], (img) => { vstock.v1500 = processSingleImage(img, 760, { trim: true }); });
    tryLoadList(['v300.jpg', 'v300.png'], (img) => { vstock.v300 = processSingleImage(img, 760, { trim: true }); });
    tryLoadList(['1500.jpg', '1500.png'], (_img, src) => { vstock.bg1500 = src; });
    tryLoadList(['300.jpg', '300.png'], (_img, src) => { vstock.bg300 = src; });
    tryLoadList(['restart.jpg', 'restart.png'], (_img, src) => { vstock.restart = src; });
  }

  setTimeout(preloadAll, 10);

  return {
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
// 3. サラサラキラキラ専用Canvas（軽量版）
// -------------------------------------------------------------------------
const SoftSparkle = (() => {
  const cv = document.getElementById('softSparkleCanvas');
  const ctx = cv.getContext('2d');
  let w = window.innerWidth, h = window.innerHeight, running = false, rafId = null;
  const motes = [];
  const PALETTE = ['#ffffff', '#fef9c3', '#e0f2fe', '#fef3c7', '#fae8ff'];

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function initMotes() {
    motes.length = 0;
    for (let i = 0; i < 56; i++) {
      motes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.24, vy: -(0.14 + Math.random() * 0.36),
        r: 0.9 + Math.random() * 1.9, phase: Math.random() * Math.PI * 2,
        twinkleSpd: 0.026 + Math.random() * 0.048, isStar: Math.random() < 0.28,
        color: PALETTE[i % PALETTE.length]
      });
    }
  }
  function draw() {
    if (!running) return;
    if (document.hidden) { rafId = requestAnimationFrame(draw); return; }
    ctx.clearRect(0, 0, w, h);
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      m.x += m.vx + Math.sin(m.phase * 0.5) * 0.14; m.y += m.vy; m.phase += m.twinkleSpd;
      if (m.y < -12) { m.y = h + 12; m.x = Math.random() * w; }
      if (m.x < -12) m.x = w + 12; if (m.x > w + 12) m.x = -12;
      const alpha = 0.24 + Math.max(0, Math.sin(m.phase)) * 0.72;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.color;
      if (m.isStar) {
        const len = m.r * 3.6;
        ctx.strokeStyle = m.color; ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(m.x - len, m.y); ctx.lineTo(m.x + len, m.y);
        ctx.moveTo(m.x, m.y - len); ctx.lineTo(m.x, m.y + len);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
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

// -------------------------------------------------------------------------
// 4. 動的ステージ背景Canvas（省電力・低発熱チューニング版）
// -------------------------------------------------------------------------
const StageBg = (() => {
  const cv = document.getElementById('stageBgCanvas');
  const ctx = cv.getContext('2d');
  const stageNamePill = document.getElementById('stageNamePill');
  let w = 360, h = 360, angle = 0, frameSkip = 0;

  const NORMAL_STAGES = [
    { name: '王都ルグニカ', c1: '#451218', c2: '#1f080d', accent: '#facc15', glow: 'rgba(250,204,21,0.34)' },
    { name: 'ロズワール邸・夕暮れ', c1: '#5c1d0c', c2: '#230b08', accent: '#fb923c', glow: 'rgba(251,146,60,0.36)' },
    { name: '蒼月の森', c1: '#0c2748', c2: '#071124', accent: '#38bdf8', glow: 'rgba(56,189,248,0.34)' },
    { name: '霧の街道', c1: '#12383a', c2: '#07171a', accent: '#2dd4bf', glow: 'rgba(45,212,191,0.32)' }
  ];

  const goldShards = Array.from({ length: 34 }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.009, vy: -(0.004 + Math.random() * 0.011), sz: 4 + Math.random() * 8, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.16, isKanji: i % 6 === 0, color: i % 3 === 0 ? '#fef9c3' : i % 3 === 1 ? '#facc15' : '#f59e0b' }));
  const rays = Array.from({ length: 24 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), spd: 0.018 + Math.random() * 0.026, len: 0.14 + Math.random() * 0.22 }));
  const remShards = Array.from({ length: 30 }, (_, i) => ({ x: Math.random(), y: Math.random(), vx: (Math.random() - 0.5) * 0.006, vy: (Math.random() - 0.5) * 0.007, sz: 3.5 + Math.random() * 8.5, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.11, color: ['#e879f9', '#d946ef', '#38bdf8', '#f472b6', '#ffffff', '#a855f7'][i % 6] }));

  function resize() {
    const rect = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.max(100, rect.width); h = Math.max(100, rect.height);
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function drawMagicCircle(cx, cy, radius, color, rot, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.5;
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
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const left = i % 2 === 0, startX = left ? -10 : w + 10, baseY = h * (0.22 + (i % 2) * 0.38);
      ctx.beginPath(); ctx.moveTo(startX, baseY);
      const dir = left ? 1 : -1, reach = w * (0.28 + Math.sin(t * 2.1 + i) * 0.08 + pulse * 0.06);
      ctx.bezierCurveTo(startX + dir * reach * 0.45, baseY + Math.sin(t * 3.0 + i * 1.4) * 38, startX + dir * reach * 0.85, baseY + Math.cos(t * 2.5 + i) * 44, startX + dir * reach, baseY + Math.sin(t * 1.9 + i * 2) * 28);
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(232, 121, 249, 0.42)' : 'rgba(147, 51, 234, 0.52)';
      ctx.lineWidth = 10 + pulse * 5; ctx.stroke();
    }
    ctx.restore();
  }

  function tick() {
    if (document.hidden) { requestAnimationFrame(tick); return; }
    const ph = (typeof state !== 'undefined') ? state.phase : 'NORMAL';
    const sc = (typeof state !== 'undefined') ? state.activeScene : 'normal';
    // 通常待機時は30fpsに間引いてスマホ発熱を大幅軽減
    frameSkip++;
    if (ph === 'NORMAL' && sc === 'normal' && (frameSkip & 1)) {
      requestAnimationFrame(tick);
      return;
    }

    const pulse = (typeof BgmEngine !== 'undefined') ? BgmEngine.consumePulse() : 0;
    const isCut = (typeof BgmEngine !== 'undefined') ? BgmEngine.isCut() : false;
    const rm = (typeof state !== 'undefined') ? state.rushMode : 'onigakari';
    const frozen = isCut && ph === 'ANIMATING';
    if (!frozen) angle += (ph === 'NORMAL' ? 0.011 : 0.006) + pulse * 0.012;
    if (stageNamePill) stageNamePill.classList.toggle('hidden', !(ph === 'NORMAL' && sc === 'normal'));

    const cx = w * 0.5, cy = h * 0.48;
    ctx.clearRect(0, 0, w, h);

    if (ph === 'RUSH' || (ph === 'ANIMATING' && sc === 'rush-idle')) {
      if (rm === 'onigakari') {
        const bg = ctx.createRadialGradient(cx, cy, 10, cx, cy, Math.max(w, h) * 0.78);
        bg.addColorStop(0, `rgba(245, 158, 11, ${0.58 + pulse * 0.25})`);
        bg.addColorStop(0.42, `rgba(180, 40, 12, ${0.78 + pulse * 0.14})`);
        bg.addColorStop(1, 'rgba(30, 8, 4, 0.96)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        ctx.save(); ctx.globalAlpha = 0.14 + pulse * 0.08; ctx.fillStyle = '#fef08a';
        ctx.font = `900 ${Math.round(Math.min(w, h) * 0.74)}px "Shippori Mincho", serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('鬼', cx, cy + 8); ctx.restore();
        drawMagicCircle(cx, cy, 132 + pulse * 16, '#fde047', angle * 1.4, 0.24 + pulse * 0.14);
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * (1 + pulse * 0.95); if (r.r > 1.25) { r.r = 0.05; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.80, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 2 === 0 ? '#fef08a' : '#f59e0b'; ctx.globalAlpha = Math.min(0.85, r.r * 0.85); ctx.lineWidth = idx % 3 === 0 ? 2.8 : 1.5;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        goldShards.forEach(s => {
          if (!frozen) { s.x += s.vx; s.y += s.vy * (1 + pulse * 0.7); s.rot += s.vrot; if (s.y < -0.08) { s.y = 1.08; s.x = Math.random(); } if (s.x < -0.08) s.x = 1.08; if (s.x > 1.08) s.x = -0.08; }
          ctx.save(); ctx.translate(s.x * w, s.y * h); ctx.rotate(s.rot); ctx.fillStyle = s.color;
          if (s.isKanji) { ctx.globalAlpha = 0.62; ctx.font = `900 ${Math.round(s.sz * 2.2)}px "Shippori Mincho", serif`; ctx.fillText('鬼', -s.sz, s.sz); }
          else { ctx.globalAlpha = 0.84; ctx.fillRect(-s.sz, -s.sz * 0.45, s.sz * 2, s.sz * 0.9); }
          ctx.restore();
        });
      } else if (rm === 'brain') {
        const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.76);
        bg.addColorStop(0, `rgba(192, 38, 211, ${0.44 + pulse * 0.30})`); bg.addColorStop(0.48, `rgba(88, 28, 135, ${0.74 + pulse * 0.14})`); bg.addColorStop(1, 'rgba(14, 3, 24, 0.98)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * (1.2 + pulse); if (r.r > 1.2) { r.r = 0.08; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.78, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 3 === 0 ? '#f0abfc' : idx % 3 === 1 ? '#e11d48' : '#a855f7'; ctx.globalAlpha = Math.min(0.72, r.r * 0.72); ctx.lineWidth = idx % 2 === 0 ? 2.0 : 1.2;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1; drawUnseenTendrils(angle * 4, pulse);
      } else {
        const bg = ctx.createRadialGradient(cx, cy * 0.78, 14, cx, cy, Math.max(w, h) * 0.82);
        bg.addColorStop(0, `rgba(217, 70, 239, ${0.42 + pulse * 0.24})`); bg.addColorStop(0.42, `rgba(88, 28, 135, ${0.78 + pulse * 0.14})`); bg.addColorStop(0.78, 'rgba(18, 24, 62, 0.92)'); bg.addColorStop(1, 'rgba(8, 6, 26, 0.98)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
        drawMagicCircle(cx, cy * 0.86, 135 + pulse * 14, '#e879f9', -angle * 1.1, 0.22 + pulse * 0.14);
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * 0.95; if (r.r > 1.25) { r.r = 0.06; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.82, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 3 === 0 ? '#38bdf8' : idx % 3 === 1 ? '#f0abfc' : '#f472b6'; ctx.globalAlpha = Math.min(0.70, r.r * 0.70); ctx.lineWidth = idx % 3 === 0 ? 2.2 : 1.5;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        remShards.forEach(s => {
          if (!frozen) { s.x += s.vx; s.y += s.vy; s.rot += s.vrot; if (s.y < -0.05) s.y = 1.05; if (s.y > 1.05) s.y = -0.05; if (s.x < -0.05) s.x = 1.05; if (s.x > 1.05) s.x = -0.05; }
          ctx.save(); ctx.translate(s.x * w, s.y * h); ctx.rotate(s.rot); ctx.fillStyle = s.color; ctx.globalAlpha = 0.74;
          ctx.beginPath(); ctx.moveTo(0, -s.sz); ctx.lineTo(s.sz * 0.65, 0); ctx.lineTo(0, s.sz); ctx.lineTo(-s.sz * 0.65, 0); ctx.closePath(); ctx.fill(); ctx.restore();
        });
      }
    } else {
      const spins = (typeof state !== 'undefined') ? state.currentSpin : 0;
      const stg = NORMAL_STAGES[Math.floor(spins / 30) % NORMAL_STAGES.length];
      if (stageNamePill && stageNamePill.textContent !== stg.name) stageNamePill.textContent = stg.name;
      const bg = ctx.createRadialGradient(cx, cy * 0.85, 16, cx, cy, Math.max(w, h) * 0.8);
      bg.addColorStop(0, stg.c1); bg.addColorStop(0.65, stg.c2); bg.addColorStop(1, '#0d0407');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
      const aura = ctx.createRadialGradient(cx, cy, 10, cx, cy, 145 + pulse * 36);
      aura.addColorStop(0, stg.glow); aura.addColorStop(1, 'transparent');
      ctx.fillStyle = aura; ctx.fillRect(0, 0, w, h);
      drawMagicCircle(cx, cy, 122 + pulse * 8, stg.accent, angle * 0.75, 0.22 + pulse * 0.14);
    }
    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize); setTimeout(resize, 40); requestAnimationFrame(tick);
  return { resize };
})();

// -------------------------------------------------------------------------
// 5. 最前面FX Canvas（軽量化・ガラス画面割れ・衝撃波・パーティクル）
// -------------------------------------------------------------------------
const FxCanvas = (() => {
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');
  let w = 360, h = 360, ambientMode = 'ember', frameSkip = 0;
  const particles = [], rings = [], bolts = [], cracks = [];
  let glassBreakState = null;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = Math.max(100, rect.width); h = Math.max(100, rect.height);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  function clearAll() { particles.length = 0; rings.length = 0; bolts.length = 0; cracks.length = 0; glassBreakState = null; ctx.clearRect(0, 0, w, h); }
  function pushParticle(p) { if (particles.length < 95) particles.push(p); }
  function spawnRing(color = '#ef4444', maxR = 260, lw = 7) { if (rings.length < 8) rings.push({ x: w / 2, y: h / 2, r: 12, maxR, color, lw, alpha: 1 }); }
  function spawnLightning(color = '#fde047', count = 4) {
    for (let n = 0; n < Math.min(count, 5); n++) {
      const pts = []; let x = Math.random() * w, y = 0; pts.push({ x, y });
      for (let i = 1; i <= 7; i++) { x += (Math.random() - 0.5) * 84; y = (h / 7) * i; pts.push({ x, y }); }
      bolts.push({ pts, color, alpha: 1 });
    }
  }
  function spawnPurpleHands(count = 24) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 0 : w;
      pushParticle({ type: 'spark', x: side + (side === 0 ? -5 : 5), y: Math.random() * h, vx: (side === 0 ? 1 : -1) * (2.4 + Math.random() * 3.8), vy: (Math.random() - 0.5) * 1.4, size: 3.0 + Math.random() * 4.2, color: i % 3 === 0 ? '#e879f9' : '#7e22ce', alpha: 0.92, decay: 0.020 });
    }
  }
  function spawnRedCracks() {
    cracks.length = 0; const cx = w * 0.5, cy = h * 0.5;
    for (let b = 0; b < 6; b++) {
      const baseA = (Math.PI * 2 * b) / 6 + (Math.random() - 0.5) * 0.4;
      const pts = [{ x: cx, y: cy }]; let px = cx, py = cy;
      for (let s = 1; s <= 6; s++) { const len = 24 + Math.random() * 28, a = baseA + (Math.random() - 0.5) * 0.7; px += Math.cos(a) * len; py += Math.sin(a) * len; pts.push({ x: px, y: py }); }
      cracks.push({ pts, progress: 0 });
    }
  }
  function clearCracks() { cracks.length = 0; }

  function triggerGlassShatter() {
    const cx = w * 0.5, cy = h * 0.5;
    const maxR = Math.hypot(w, h) * 0.75;
    const raysList = [];
    const numRays = 18;
    for (let i = 0; i < numRays; i++) {
      const baseA = (Math.PI * 2 * i) / numRays + (Math.random() - 0.5) * 0.16;
      const pts = [{ x: cx, y: cy }];
      let r = 0, a = baseA;
      while (r < maxR) {
        r += 24 + Math.random() * 38;
        a += (Math.random() - 0.5) * 0.14;
        pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
      }
      raysList.push({ pts, width: 2.2 + Math.random() * 4.0 });
    }
    const ringsList = [0.20, 0.42, 0.68].map(scale => {
      const pts = [];
      for (let i = 0; i <= numRays; i++) {
        const a = (Math.PI * 2 * i) / numRays;
        const rr = maxR * scale * (0.85 + Math.random() * 0.30);
        pts.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr });
      }
      return pts;
    });
    glassBreakState = { rays: raysList, rings: ringsList, alpha: 1.0, flash: 0.92, age: 0 };
  }

  function burstGold(count = 44) {
    for (let i = 0; i < Math.min(count, 48); i++) {
      const a = Math.random() * Math.PI * 2, sp = 2.4 + Math.random() * 6.5;
      pushParticle({ type: 'confetti', x: w * 0.5, y: h * 0.48, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.0, size: 4 + Math.random() * 5, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.25, color: ['#fffbeb', '#fef08a', '#facc15', '#f59e0b', '#fb7185'][i % 5], alpha: 1, decay: 0.013 + Math.random() * 0.008 });
    }
  }
  function burstRainbow(count = 56) {
    const colors = ['#fffbeb', '#fef08a', '#f472b6', '#c084fc', '#7dd3fc', '#6ee7b7', '#facc15'];
    for (let i = 0; i < Math.min(count, 60); i++) {
      const a = Math.random() * Math.PI * 2, sp = 2.6 + Math.random() * 7.2;
      pushParticle({ type: i % 3 === 0 ? 'spark' : 'confetti', x: w * 0.5, y: h * 0.48, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 2.2, size: 3.8 + Math.random() * 5.0, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.28, color: colors[i % colors.length], alpha: 1, decay: 0.012 + Math.random() * 0.008 });
    }
  }
  function burstFlames(count = 32) {
    for (let i = 0; i < Math.min(count, 36); i++) {
      const a = Math.random() * Math.PI * 2, sp = 1.8 + Math.random() * 5.2;
      pushParticle({ type: 'spark', x: w * 0.5, y: h * 0.5, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: 2.5 + Math.random() * 4.2, color: ['#ef4444', '#f97316', '#fde047'][i % 3], alpha: 1, decay: 0.022 + Math.random() * 0.015 });
    }
  }
  function spawnFeathers(count = 24) {
    for (let i = 0; i < count; i++) {
      pushParticle({ type: 'feather', x: Math.random() * w, y: -15 - Math.random() * h * 0.45, vx: (Math.random() - 0.5) * 1.1, vy: 0.9 + Math.random() * 1.5, size: 7 + Math.random() * 6, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.04, sway: Math.random() * Math.PI * 2, color: i % 3 === 0 ? '#fef08a' : '#ffffff', alpha: 0.95, decay: 0.005 });
    }
  }

  function tick() {
    if (document.hidden) { requestAnimationFrame(tick); return; }
    const hasActive = particles.length > 0 || rings.length > 0 || bolts.length > 0 || cracks.length > 0 || !!glassBreakState;
    frameSkip++;
    if (!hasActive && ambientMode === 'none') { requestAnimationFrame(tick); return; }
    if (ambientMode === 'ember' && rings.length === 0 && bolts.length === 0 && !glassBreakState && (frameSkip & 1)) {
      requestAnimationFrame(tick); return;
    }

    ctx.clearRect(0, 0, w, h);
    if (ambientMode === 'ember' && particles.length < 12 && Math.random() < 0.22) {
      pushParticle({ type: 'spark', x: Math.random() * w, y: h + 8, vx: (Math.random() - 0.5) * 0.5, vy: -(0.7 + Math.random() * 1.2), size: 1.6 + Math.random() * 2.0, color: Math.random() < 0.55 ? '#facc15' : '#fb923c', alpha: 0.58, decay: 0.008 });
    } else if (ambientMode === 'wedding' && particles.length < 32 && Math.random() < 0.30) {
      spawnFeathers(1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
      if (p.alpha <= 0 || p.y < -60 || p.y > h + 60) { particles.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle = p.color;
      if (p.type === 'spark') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill();
      } else if (p.type === 'confetti') {
        p.vy += 0.12; p.rot += p.vrot;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.size, -p.size * 0.5, p.size * 2, p.size);
        ctx.restore();
      } else if (p.type === 'feather') {
        p.sway += 0.05; p.x += Math.sin(p.sway) * 0.85; p.rot += p.vrot;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.32, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;

    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i]; r.r += (r.maxR - r.r) * 0.16 + 4; r.alpha -= 0.038;
      if (r.alpha <= 0 || r.r >= r.maxR) { rings.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.max(0, r.alpha); ctx.strokeStyle = r.color; ctx.lineWidth = r.lw * r.alpha;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    for (let i = bolts.length - 1; i >= 0; i--) {
      const b = bolts[i]; b.alpha -= 0.085;
      if (b.alpha <= 0) { bolts.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = b.alpha; ctx.strokeStyle = b.color; ctx.lineWidth = 3;
      ctx.beginPath(); b.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke(); ctx.restore();
    }
    if (cracks.length > 0) {
      cracks.forEach(cr => {
        cr.progress = Math.min(cr.pts.length - 1, cr.progress + 0.34);
        const maxIdx = Math.floor(cr.progress);
        ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.6;
        ctx.beginPath(); ctx.moveTo(cr.pts[0].x, cr.pts[0].y); for (let i = 1; i <= maxIdx; i++) ctx.lineTo(cr.pts[i].x, cr.pts[i].y); ctx.stroke(); ctx.restore();
      });
    }

    if (glassBreakState) {
      const g = glassBreakState;
      g.age++;
      if (g.flash > 0) {
        ctx.save(); ctx.fillStyle = `rgba(255,255,255,${g.flash})`; ctx.fillRect(0, 0, w, h); ctx.restore();
        g.flash = Math.max(0, g.flash - 0.14);
      }
      ctx.save();
      ctx.globalAlpha = g.alpha;
      ctx.fillStyle = 'rgba(0,0,0,0.48)';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#020205'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      g.rays.forEach(r => {
        ctx.lineWidth = r.width * 2.1;
        ctx.beginPath(); r.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
      });
      g.rings.forEach(ring => {
        ctx.lineWidth = 3.5;
        ctx.beginPath(); ring.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
      });

      ctx.strokeStyle = '#f8fafc';
      g.rays.forEach(r => {
        ctx.lineWidth = r.width * 0.72;
        ctx.beginPath(); r.pts.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
      });
      g.rings.forEach(ring => {
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ring.forEach((pt, idx) => idx === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y)); ctx.stroke();
      });
      ctx.restore();

      if (g.age > 26) {
        g.alpha -= 0.06;
        if (g.alpha <= 0) glassBreakState = null;
      }
    }

    requestAnimationFrame(tick);
  }
  window.addEventListener('resize', resize); setTimeout(resize, 40); requestAnimationFrame(tick);
  return { resize, clearAll, setAmbient: m => { ambientMode = m; }, spawnRing, spawnLightning, spawnPurpleHands, spawnRedCracks, clearCracks, triggerGlassShatter, burstGold, burstRainbow, burstFlames, spawnFeathers };
})();

// -------------------------------------------------------------------------
// 6. タイミング制御＆DOM参照
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

const lcdFrame = document.getElementById('lcdFrame');
const ledLeft = document.getElementById('ledLeft');
const ledRight = document.getElementById('ledRight');
const slashHost = document.getElementById('slashHost');
const premiaFrameOverlay = document.getElementById('premiaFrameOverlay');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const crtScanLayer = document.getElementById('crtScanLayer');
const fsLogoWrap = document.getElementById('fsLogoWrap');
const fsLogoImg = document.getElementById('fsLogoImg');
const fsSub = document.getElementById('fsSub');
const fsMain = document.getElementById('fsMain');
const fsExtra = document.getElementById('fsExtra');

const normalHudRow = document.getElementById('normalHudRow');
const rushMetaHud = document.getElementById('rushMetaHud');
const hudRushChains = document.getElementById('hudRushChains');
const hudRushRemain = document.getElementById('hudRushRemain');
const hudRushPts = document.getElementById('hudRushPts');
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

const oniLamp = document.getElementById('oniLamp');
const lampRippleHost = document.getElementById('lampRippleHost');
const lampStatusText = document.getElementById('lampStatusText');
const reserveLabel = document.getElementById('reserveLabel');
const resSlots = [0,1,2,3,4].map(i => document.getElementById(`resSlot${i}`));

let remTestOverride = false, brainTestOverride = false, oniTestOverride = false;

// -------------------------------------------------------------------------
// 7. 3D図柄レンダラー（0〜8対応）＆実機図柄法則
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
    const fb = `text-6xl font-black ${v === 0 || v % 2 === 1 ? 'gold-grad-text' : 'cyan-grad-text'}`;
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
// 8. 縁外・LED・プレミア枠・赤ボタン・ステージ一元制御
// -------------------------------------------------------------------------
function setPremiaFrame(on) {
  if (!premiaFrameOverlay) return;
  premiaFrameOverlay.classList.toggle('premia-on', !!on && !!Assets.getPremiaFrame());
}
function setAmbientBg(mode = '') { ambientBgLayer.className = 'fixed inset-0 pointer-events-none z-0' + (mode ? ` bg-mode-${mode}` : ''); }
function setSunburst(on) { sunburstLayer.classList.toggle('hidden', !on); }
function setGlobalBlackout(on) { globalBlackoutCurtain.classList.toggle('hidden', !on); }
function hideGlobalCutin() { globalCutinOverlay.classList.add('hidden'); globalCutinOverlay.innerHTML = ''; }
function setPageMegaShake(on) { pageShakeTargets.forEach(el => el.classList.toggle('page-mega-shake', on)); }

function fireGlobalRainbowFlash() {
  globalRainbowFlash.className = 'fixed inset-0 z-[998] pointer-events-none global-rainbow-burst';
  void globalRainbowFlash.offsetWidth;
  setTimeout(() => { globalRainbowFlash.className = 'hidden fixed inset-0 z-[998] pointer-events-none'; }, 750);
}
function setLed(style) { [ledLeft, ledRight].forEach(el => { el.className = 'led-bar shrink-0' + (style ? ` led-${style}` : ''); }); }
function setLedSide(l, r) {
  ledLeft.className = 'led-bar shrink-0' + (l ? ` led-${l}` : '');
  ledRight.className = 'led-bar shrink-0' + (r ? ` led-${r}` : '');
}

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
    ? 'text-base sm:text-lg font-black crimson-grad-text tracking-widest drop-shadow pop-in'
    : 'text-sm sm:text-base font-black rainbow-grad-text tracking-widest drop-shadow';
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
    hudVStockBadge.textContent = isRed ? '赤V-STOCK' : 'V-STOCK';
    hudVStockBadge.className = isRed
      ? 'px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-red-600 via-amber-500 to-yellow-300 text-slate-950 border border-white shadow-lg animate-pulse'
      : 'px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white border border-sky-200 shadow-lg animate-pulse';
  }
}

function setBonusLogo(logoKey) {
  const url = logoKey ? Assets.getLogo(logoKey) : null;
  if (url && bonusLogoWrap && bonusLogoImg) {
    bonusLogoImg.src = url;
    bonusLogoImg.className = 'logo-alive-img bonus-logo-img';
    void bonusLogoImg.offsetWidth;
    bonusLogoWrap.classList.remove('hidden');
    return true;
  }
  if (bonusLogoWrap) bonusLogoWrap.classList.add('hidden');
  return false;
}

function syncRushStages() {
  const isRushIdle = (typeof state !== 'undefined') && state.activeScene === 'rush-idle';
  const inRush = (typeof state !== 'undefined') && (state.phase === 'RUSH' || state.phase === 'ANIMATING');
  const rm = (typeof state !== 'undefined') ? state.rushMode : 'onigakari';

  const showOni = oniTestOverride || (isRushIdle && inRush && rm === 'onigakari');
  const showBrain = brainTestOverride || (isRushIdle && inRush && rm === 'brain');
  const showRem = remTestOverride || (isRushIdle && inRush && rm === 'rem');

  oniRushStage.classList.toggle('hidden', !showOni);
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
  setPageMegaShake(false);
  setSunburst(false);
  if (weddingCinemaOverlay) { weddingCinemaOverlay.classList.add('hidden'); weddingCinemaOverlay.innerHTML = ''; }
  lcdFrame.classList.remove('fx-rgb-glitch');
  slashHost.innerHTML = '';
}

function showIwakanAnswer(text, isBrainWhisper = false) {
  if (!text) { hideIwakanAnswer(); return; }
  subtleWhisperText.textContent = text;
  if (isBrainWhisper) {
    subtleWhisperSlot.className = 'absolute top-0.5 right-1 px-2.5 py-0.5 rounded-md bg-black/88 border border-purple-400/65 shadow-lg max-w-[82%]';
    subtleWhisperText.className = 'font-mincho text-xs font-semibold text-purple-200 tracking-widest';
    void subtleWhisperSlot.offsetWidth;
    subtleWhisperSlot.classList.add('fx-whisper-in');
  } else {
    subtleWhisperSlot.className = 'absolute top-0.5 right-1 px-2 py-0.5 rounded-md bg-black/85 border border-amber-500/50 shadow-lg max-w-[75%]';
    subtleWhisperText.className = 'font-mincho text-[10px] sm:text-xs font-semibold text-amber-100 tracking-wider';
  }
  subtleWhisperSlot.classList.remove('hidden');
}
function hideIwakanAnswer() { subtleWhisperSlot.classList.add('hidden'); subtleWhisperSlot.classList.remove('fx-whisper-in'); }

function setActiveScene(sceneName) {
  if (typeof state !== 'undefined') state.activeScene = sceneName;
  Object.entries(scenePanes).forEach(([key, el]) => el.classList.toggle('hidden', key !== sceneName));
  if (sceneName !== 'bonus') {
    hideIwakanAnswer(); setBonusLogo(null); bonusCountNum.classList.add('hidden');
    lcdFrame.classList.remove('bonus-theme-brain', 'bonus-theme-rem');
  }
  if (sceneName !== 'reach') { pushButtonArea.classList.add('hidden'); setReachActor(null); }
  if (sceneName !== 'rush-idle') { rushTopBadge.classList.add('hidden'); hiddenRemBadge.classList.add('hidden'); }
  btnSecretOk.classList.toggle('secret-ok-active', sceneName === 'reach' || sceneName === 'rush-idle' || sceneName === 'bonus');
  syncRushStages();
}

function showFullscreenOverlay({ mode = 'blackout', sub = '', main = '', extra = '', logoKey = null, scanlines = false, premia = false }) {
  oniRushStage.classList.add('hidden');
  brainRushStage.classList.add('hidden');
  remRushStage.classList.add('hidden');
  fullscreenOverlay.classList.remove('hidden', 'overlay-blackout', 'overlay-6000', 'overlay-wedding', 'overlay-rainbow');
  crtScanLayer.classList.toggle('hidden', !scanlines);
  setPremiaFrame(premia || mode === 'rainbow');

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
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-amber-200 drop-shadow mb-1';
    fsMain.className = `relative z-10 ${logoUrl ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-5xl'} font-black text-white drop-shadow-[0_4px_16px_rgba(0,0,0,0.95)] tracking-wider leading-tight pop-in px-1`;
    fsExtra.className = 'relative z-10 mt-2 text-xs sm:text-sm font-black text-amber-100 drop-shadow max-w-md';
  } else if (mode === '6000' || mode === 'gold') {
    fullscreenOverlay.classList.add('overlay-6000');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-amber-300 mb-1';
    fsMain.className = `relative z-10 ${logoUrl ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-5xl'} font-black ${mode === '6000' ? 'rainbow-grad-text' : 'gold-grad-text'} tracking-wider leading-tight pop-in px-1`;
    fsExtra.className = 'relative z-10 mt-2 text-xs sm:text-sm font-bold text-amber-100/95 max-w-md';
  } else {
    fullscreenOverlay.classList.add('overlay-blackout');
    fsSub.className = 'relative z-10 text-xs font-black tracking-[0.22em] text-rose-500/80 mb-2';
    fsMain.className = 'relative z-10 font-mincho text-2xl sm:text-3xl font-black text-rose-100 tracking-widest';
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
  clearGlobalChaosEffects();
  FxCanvas.clearCracks();
  syncRushStages();
}

function updateReserveSlots(mode = 'NORMAL', special = null, targetSlotIdx = 0) {
  if (mode === 'BRAIN') {
    reserveLabel.textContent = '文字保留';
    ['脳', 'が', '震', 'え', 'る'].forEach((ch, i) => {
      const el = resSlots[i]; el.classList.remove('hidden');
      if (special === 'HANDS' && i === 0) { el.textContent = '手'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-fuchsia-300 bg-gradient-to-br from-purple-700 to-fuchsia-950 flex items-center justify-center text-xs font-black text-fuchsia-100 shadow-lg shadow-fuchsia-500/80 animate-pulse'; }
      else if (special === 'HIT') { el.textContent = ch; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-300 bg-gradient-to-br from-rose-600 to-purple-800 flex items-center justify-center text-xs font-black text-amber-200 shadow-lg animate-pulse'; }
      else if ((special === 'GAZE' || special === 'NOGA') && i < 2) { el.textContent = ch; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-rose-400 bg-rose-950 flex items-center justify-center text-xs font-black text-rose-200 shadow shadow-rose-500/70 animate-pulse'; }
      else { el.textContent = ch; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-purple-700/80 bg-purple-950/80 flex items-center justify-center text-xs font-black text-purple-300'; }
    });
    return;
  }

  reserveLabel.textContent = '保留';
  resSlots[4].classList.add('hidden');
  const idx = Math.max(0, Math.min(3, targetSlotIdx));
  for (let i = 0; i < 4; i++) {
    const el = resSlots[i];
    if (special === 'ALL_ONI') { el.textContent = '鬼'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-200 bg-gradient-to-br from-red-600 to-amber-700 flex items-center justify-center text-xs font-black text-white shadow-lg animate-pulse'; }
    else if (i === idx && special === 'RED') { el.textContent = '鬼'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-rose-200 bg-gradient-to-br from-red-500 to-rose-900 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-red-600/80 animate-pulse'; }
    else if (i === idx && special === 'RAINBOW') { el.textContent = '鬼'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white lamp-rainbow flex items-center justify-center text-xs font-black text-slate-950 shadow-lg animate-bounce'; }
    else if (i === idx && special === 'BLINK') { el.textContent = '●'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-sky-200 bg-sky-500/80 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-sky-400/80 res-blink'; }
    else if (i === idx && special === 'BLINK_RED') { el.textContent = '鬼'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-200 bg-gradient-to-br from-rose-500 to-red-900 flex items-center justify-center text-xs font-black text-amber-100 shadow-lg shadow-rose-500/90 res-blink-fast'; }
    else if (i === idx && special === 'REM_CYAN') { el.textContent = '鬼'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-sky-200 bg-gradient-to-br from-sky-400 to-blue-800 flex items-center justify-center text-xs font-black text-white shadow-lg shadow-sky-400/90 animate-pulse'; }
    else { el.textContent = '○'; el.className = 'w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-amber-900/80 bg-black/75 flex items-center justify-center text-[10px] font-black text-amber-200/60'; }
  }
}

function updateRes4Dots(activeCount) {
  res4Dots.forEach((dot, i) => {
    dot.className = i < activeCount ? 'res4-dot w-1.5 h-1.5 rounded-full bg-amber-400 border border-yellow-100 shadow' : 'res4-dot w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-600';
  });
}

function clearIwakanEffects() {
  lcdFrame.classList.remove('iwakan-mono', 'iwakan-rempuru', 'shake-weak', 'shake-mid', 'fx-rgb-glitch');
  lcdFrame.style.transform = '';
  oniLamp.classList.remove('iwakan-rempuru', 'lamp-rem-slow', 'lamp-rem-classic');
  if (hudRushRemain) hudRushRemain.classList.remove('iwakan-fade-remain');
  oniReels.forEach(el => { if (el) el.style.transform = ''; });
  remReels.forEach(el => { if (el) el.style.transform = ''; });
  hiddenRemBadge.classList.add('hidden');
  rushNoiseVeil.classList.add('hidden');
  rushTopBadge.classList.add('hidden');
}

function clearVisualEffects() {
  clearIwakanEffects();
  clearGlobalChaosEffects();
  setAmbientBg('');
  lcdFrame.classList.remove('fx-redbare', 'fx-rainbow', 'fx-gold', 'fx-restart', 'fx-glitch', 'shake-intense', 'shake-burst', 'mode-despair-bg', 'bonus-theme-brain', 'bonus-theme-rem');
  setReachBotanState({ vibe: 'idle', color: '' });
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow');
  FxCanvas.clearCracks();
  setLed('');
  const ph = (typeof state !== 'undefined') ? state.phase : 'NORMAL';
  lampStatusText.textContent = ph === 'RUSH' ? 'RUSH中' : '待機中';
  lampStatusText.className = 'text-[10px] font-black text-amber-200 min-w-[54px] text-right whitespace-nowrap';
  syncRushStages();
}

function triggerLamp(type, label) {
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow', 'lamp-rem-slow', 'lamp-rem-classic');
  void oniLamp.offsetWidth;
  if (type === 'red') { oniLamp.classList.add('lamp-red'); setLed('red'); }
  else if (type === 'rem') { oniLamp.classList.add('lamp-rem'); setLed('rem'); }
  else if (type === 'rainbow') { oniLamp.classList.add('lamp-rainbow'); setLed('rainbow'); }

  lampStatusText.textContent = label;
  lampStatusText.className = type === 'red' ? 'text-[10px] font-black text-rose-400 min-w-[54px] text-right whitespace-nowrap'
    : type === 'rem' ? 'text-[10px] font-black text-sky-300 min-w-[54px] text-right whitespace-nowrap'
    : 'text-[10px] font-black text-amber-300 min-w-[54px] text-right whitespace-nowrap';

  const color = type === 'red' ? '#ef4444' : type === 'rem' ? '#38bdf8' : '#fef08a';
  for (let i = 0; i < 2; i++) {
    setTimeout(() => {
      const r = document.createElement('div'); r.className = 'lamp-ripple'; r.style.borderColor = color;
      lampRippleHost.appendChild(r); FxCanvas.spawnRing(color, 240 + i * 70, 7);
      setTimeout(() => r.remove(), 750);
    }, i * 130);
  }
}

function fireRainbowBurst(lampLabel = '大当り!!') {
  fireGlobalRainbowFlash(); setAmbientBg('rainbow'); setSunburst(true); setPremiaFrame(true);
  triggerLamp('rainbow', lampLabel); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
  FxCanvas.spawnRing('#fef08a', 320, 9); FxCanvas.spawnRing('#7dd3fc', 250, 7); FxCanvas.burstRainbow(58);
  setTimeout(() => lcdFrame.classList.remove('shake-burst'), 720);
}

// -------------------------------------------------------------------------
// 9. 横一刀両断の引き裂き演出・ガラス画面割れ・バカデカV-STOCK降臨
// -------------------------------------------------------------------------
function firePhysicalSplitSlash() {
  const beam = document.createElement('div'); beam.className = 'h-slash-beam';
  const pT = document.createElement('div'); pT.className = 'split-panel-top';
  const pB = document.createElement('div'); pB.className = 'split-panel-bottom';
  slashHost.appendChild(pT); slashHost.appendChild(pB); slashHost.appendChild(beam);
  setPageMegaShake(true); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fef08a', 360, 11); FxCanvas.spawnRing('#ef4444', 280, 9);
  FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(56); FxCanvas.burstFlames(32);
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

// ★新素材使用：バカデカV-STOCK降臨（青V / 赤V / 青→赤V昇格）★
async function playVStockImpact({ isRed = false, upgradeFromBlue = false, token }) {
  const vBlue = Assets.getVStock('v300'), bgBlue = Assets.getVStock('bg300');
  const vRed = Assets.getVStock('v1500'), bgRed = Assets.getVStock('bg1500');
  const host = slashHost;
  if (!host) return;

  function renderV(red) {
    const bg = red ? bgRed : bgBlue;
    const vImg = red ? vRed : vBlue;
    host.innerHTML = `
      <div class="absolute inset-0 z-30 flex flex-col items-center justify-center overflow-hidden bg-black/85">
        ${bg ? `<img src="${bg}" class="absolute inset-0 w-full h-full object-cover opacity-90" alt="">` : ''}
        <div class="relative z-10 flex flex-col items-center justify-center">
          ${vImg
            ? `<img src="${vImg}" class="max-w-[74%] max-h-[210px] object-contain drop-shadow-[0_0_28px_rgba(254,240,138,0.95)] cutin-slam" alt="V-STOCK">`
            : `<div class="text-7xl font-black ${red ? 'crimson-grad-text' : 'cyan-grad-text'} cutin-slam">V</div>`}
          <div class="mt-1 px-4 py-0.5 rounded-full bg-black/85 border-2 ${red ? 'border-amber-300 text-amber-200' : 'border-sky-300 text-sky-200'} text-xs sm:text-sm font-black tracking-[0.2em] pop-in">
            ${red ? '超・V-STOCK 獲得!!（6,000濃厚）' : 'V-STOCK 獲得!!'}
          </div>
        </div>
      </div>
    `;
  }

  try {
    if (upgradeFromBlue && isRed) {
      StudioAudio.playVImpact(false);
      triggerLamp('rem', 'V-STOCK!!');
      renderV(false);
      lcdFrame.classList.add('shake-burst');
      await wait(780, token);
      lcdFrame.classList.remove('shake-burst');

      // 爆炎で赤Vへ昇格!!
      StudioAudio.playVImpact(true);
      StudioAudio.playPokyun(true);
      fireGlobalRainbowFlash();
      triggerLamp('rainbow', '赤V-STOCK!!');
      renderV(true);
      lcdFrame.classList.add('shake-intense');
      FxCanvas.burstFlames(36);
      await wait(1280, token);
      lcdFrame.classList.remove('shake-intense');
    } else {
      StudioAudio.playVImpact(isRed);
      if (isRed) StudioAudio.playPokyun(true);
      triggerLamp(isRed ? 'rainbow' : 'rem', isRed ? '赤V-STOCK!!' : 'V-STOCK!!');
      renderV(isRed);
      lcdFrame.classList.add('shake-burst');
      if (isRed) FxCanvas.burstFlames(36); else FxCanvas.spawnRing('#38bdf8', 280, 8);
      await wait(1350, token);
      lcdFrame.classList.remove('shake-burst');
    }
  } finally {
    host.innerHTML = '';
  }
}

function fireDropCrash(fakeTitle = '') {
  const panel = document.createElement('div'); panel.className = 'drop-crash-panel';
  panel.innerHTML = `<div class="text-2xl sm:text-3xl font-black text-slate-200">${fakeTitle}</div>`;
  slashHost.appendChild(panel); setPageMegaShake(true); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fef08a', 360, 11); FxCanvas.burstRainbow(54);
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
  FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(56);
  setTimeout(() => { nodes.forEach(n => n.remove()); lcdFrame.classList.remove('fx-rgb-glitch'); setPageMegaShake(false); }, 880);
}
function fireMegaQuakeBrainBreak() {
  setPageMegaShake(true); lcdFrame.classList.add('fx-rgb-glitch'); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#ef4444', 360, 12); FxCanvas.spawnRing('#fef08a', 290, 9);
  FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(56); FxCanvas.burstFlames(36);
  setTimeout(() => { lcdFrame.classList.remove('fx-rgb-glitch'); setPageMegaShake(false); }, 1050);
}

// -------------------------------------------------------------------------
// 10. 🧠 脳が震えるRUSH 4層制御
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
    1: [{ x: '4%', y: '34%', sz: 28, rot: '-16deg', sc: 1.0 }, { x: '70%', y: '44%', sz: 26, rot: '14deg', sc: 0.95 }],
    2: [{ x: '3%', y: '30%', sz: 34, rot: '-18deg', sc: 1.0 }, { x: '68%', y: '52%', sz: 38, rot: '16deg', sc: 1.05 }, { x: '8%', y: '62%', sz: 24, rot: '-10deg', sc: 0.95 }],
    3: [{ x: '4%', y: '24%', sz: 54, rot: '-14deg', sc: 1.05 }, { x: '66%', y: '28%', sz: 38, rot: '18deg', sc: 1.0 }, { x: '64%', y: '60%', sz: 42, rot: '-12deg', sc: 1.0 }, { x: '4%', y: '64%', sz: 32, rot: '12deg', sc: 0.95 }],
    4: [{ x: '2%', y: '20%', sz: 56, rot: '-18deg', sc: 1.08 }, { x: '62%', y: '22%', sz: 48, rot: '16deg', sc: 1.05 }, { x: '2%', y: '54%', sz: 46, rot: '12deg', sc: 1.05 }, { x: '64%', y: '56%', sz: 54, rot: '-16deg', sc: 1.08 }, { x: '28%', y: '18%', sz: 32, rot: '8deg', sc: 0.95 }, { x: '74%', y: '40%', sz: 30, rot: '-22deg', sc: 0.95 }],
    5: [{ x: '1%', y: '16%', sz: 62, rot: '-18deg', sc: 1.12 }, { x: '58%', y: '16%', sz: 60, rot: '16deg', sc: 1.12 }, { x: '1%', y: '46%', sz: 56, rot: '14deg', sc: 1.08 }, { x: '62%', y: '48%', sz: 58, rot: '-15deg', sc: 1.10 }, { x: '4%', y: '70%', sz: 44, rot: '-10deg', sc: 1.02 }, { x: '68%', y: '70%', sz: 46, rot: '12deg', sc: 1.04 }, { x: '26%', y: '26%', sz: 34, rot: '10deg', sc: 0.96 }]
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
  if (isHands) FxCanvas.spawnPurpleHands(24);

  if (doJumpFrom1) {
    setBrainPeteLevel(1, { withFlash: true }); setBrainTextSwarm(1, { isGoldButtonGa: false });
    setBrainButtonState('weak', 'purple'); StudioAudio.playSoftHeartbeat();
    await wait(420, token);
  }

  setBrainPeteLevel(targetLv, { withFlash: true });
  setBrainTextSwarm(targetLv, { isGoldButtonGa: isButtonGa });
  setBrainButtonState(targetLv >= 4 ? 'mid' : 'weak', isButtonGa ? 'gold' : targetLv >= 4 ? 'red' : 'purple');
  FxCanvas.spawnLightning(isButtonGa ? '#fef08a' : '#e879f9', targetLv >= 4 ? 4 : 2);

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
    FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(52);
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

// -------------------------------------------------------------------------
// 11. 💙 レム告知モード
// -------------------------------------------------------------------------
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
  if (is6000 && pat !== 'NORMAL') FxCanvas.burstRainbow(38);
  updateReserveSlots('NORMAL', is6000 && pat !== 'NORMAL' ? 'RAINBOW' : 'REM_CYAN', Math.min(3, Math.max(0, countdownSpins)));
}

async function playRemTougaiBurst({ is6000, bonusType, fromSakibare = false, forcePat = null, token }) {
  BgmEngine.cut();
  const winDig = pickRushRuleDigit(bonusType || (is6000 ? 'BONUS_6000' : 'BONUS_1500'), fromSakibare);

  if (fromSakibare) {
    setRemLampVisual(is6000 ? 'rainbow' : 'lit', { bringFront: true });
    setRemReels(winDig, winDig, winDig, { hitLock: true });
    if (winDig === 0 || is6000) { setPremiaFrame(true); StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(54); }
    else { StudioAudio.playKyuin(); FxCanvas.spawnRing('#38bdf8', 280, 8); FxCanvas.burstGold(38); }
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
    note = 'レム徐々に点灯'; oniLamp.classList.add('lamp-rem-slow'); lampStatusText.textContent = 'じわ〜っ…'; setLed('rem');
    setRemLampVisual('slow', { bringFront: true }); await wait(1120, token);
    setRemLampVisual('rainbow', { bringFront: true }); triggerLamp('rainbow', '6,000!!'); setPremiaFrame(true);
    StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(52);
  } else if (pat === 'DOUBLE_BLINK') {
    note = 'レム再点灯'; oniLamp.classList.add('lamp-rem'); lampStatusText.textContent = 'ピッ…'; setRemLampVisual('lit', { bringFront: true }); await wait(180, token);
    oniLamp.classList.remove('lamp-rem'); lampStatusText.textContent = '……'; setLed('off'); setRemLampVisual('idle', { bringFront: true }); await wait(520, token);
    setRemLampVisual('rainbow', { bringFront: true }); triggerLamp('rainbow', '再点灯!!'); setPremiaFrame(true);
    StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(52);
  } else if (pat === 'CLASSIC_FLASH') {
    note = '旧レム閃光'; setRemLampVisual('strobe', { bringFront: true }); oniLamp.classList.add('lamp-rem-classic'); lampStatusText.textContent = '閃光!!';
    setLed('rainbow'); setPremiaFrame(true); StudioAudio.playPokyun(true); setAmbientBg('rainbow'); setSunburst(true);
    FxCanvas.spawnRing('#4ade80', 320, 9); FxCanvas.spawnLightning('#e0f2fe', 5); await wait(880, token);
    oniLamp.classList.remove('lamp-rem-classic'); setRemLampVisual('rainbow', { bringFront: true });
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
// 12. 🔥 鬼がかりRUSH：7テン完全プレミア・0揃い・厳格カウントダウン
// -------------------------------------------------------------------------
async function playOniTenpaiAori({ isHit, is6000, bonusType, fixedDig = null, token }) {
  const dig = fixedDig !== null ? fixedDig
    : isHit ? pickRushRuleDigit(bonusType || (is6000 ? 'BONUS_6000' : 'BONUS_1500'), true)
    : [1, 2, 3, 4, 5, 6, 8][Math.floor(Math.random() * 7)];

  const isPremDig = (dig === 7 || dig === 3 || dig === 0);
  setOniReels(dig, (dig % 8) + 1, dig, { tenpaiSide: true, midSpin: true });
  if (dig === 7 || dig === 0) setPremiaFrame(true);

  rushTopBadge.classList.remove('hidden');
  rushTopBadge.textContent = dig === 7 ? '7 テンパイ!!（大当り濃厚）' : dig === 0 ? '0 テンパイ!?（超違和感）' : `${dig} テンパイ煽り!`;
  rushTopBadge.className = isPremDig
    ? 'pointer-events-none absolute top-[48px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in whitespace-nowrap'
    : 'pointer-events-none absolute top-[48px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-rose-950/95 border border-amber-400 text-amber-200 shadow-lg whitespace-nowrap';

  FxCanvas.spawnRing(isPremDig ? '#fef08a' : '#ef4444', 250, 7);
  StudioAudio.playSoftHeartbeat();
  await wait(isPremDig ? 720 : 540, token);
  rushTopBadge.classList.add('hidden');

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
    StudioAudio.playPokyun(true); FxCanvas.burstRainbow(54);
  } else if (winDig % 2 === 0 && bType === 'BONUS_300') {
    StudioAudio.play300Sound();
  } else {
    StudioAudio.playKyuin(); FxCanvas.burstGold(44);
  }
  await wait(340, token);
  return winDig;
}

async function playOnigakariCountdown({ isHit, is6000, bonusType = null, token }) {
  let seq = ['3', '2', '1', '0'], note = '', isPrem = false, forceZero = false;
  if (isHit && is6000 && Math.random() < 0.55) {
    seq = ['1', '2', '3', '4', '5', '6', '000'];
    note = 'プレミアカウント(1→2→3→4→5→6→000)';
    isPrem = true; forceZero = true;
  }

  rushTopBadge.classList.remove('hidden');
  for (let i = 0; i < seq.length; i++) {
    rushTopBadge.textContent = `COUNT [ ${seq[i]} ]`;
    const hot = isPrem && i >= 3;
    rushTopBadge.className = hot
      ? 'pointer-events-none absolute top-[48px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in whitespace-nowrap'
      : 'pointer-events-none absolute top-[48px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-rose-950/95 border border-amber-400 text-amber-200 shadow-lg whitespace-nowrap';
    if (hot) setPremiaFrame(true);
    FxCanvas.spawnRing(hot ? '#fef08a' : '#ef4444', 180 + i * 24, 5);
    await wait(isPrem ? 210 : 240, token);
    if (!isHit && i === 2) break;
  }
  rushTopBadge.classList.add('hidden');
  if (isHit) {
    const winDig = await playOniTotsuAtariPause({ is6000, bonusType, fixedDig: forceZero && Assets.getDigit(0) ? 0 : null, hadNotice: true, token });
    return { note, winDig };
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
  FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(58);
  await wait(1250, token);
  oniRemApproachWrap.classList.add('hidden');
  await runSuddenOchiburu6000({ sub: '鬼レム覚醒', skipAlarm: true, token });
}

// -------------------------------------------------------------------------
// 13. ★本家違和感18種（画像版ひょっこり隠れレム・巻き戻り・77/202/77777・反転等）★
// -------------------------------------------------------------------------
async function playIwakanEffect({ is6000, rushMode, token }) {
  const commonPool = [
    'LED_ONE_OFF', 'LED_ALL_OFF', 'MONO_SCREEN', 'FADE_REMAIN', 'REM_PURU',
    'GLITCH_BLINK', 'HIDDEN_REM', 'BGM_SILENT', 'REMAIN_REWIND', 'REMAIN_202',
    'REEL_FLIP', 'REEL_BIG_MID', 'ALL_ONI_RES', 'MINI_POKYUN', 'SCREEN_TILT'
  ];
  const pool = is6000 ? [...commonPool, 'COUNT_6000', 'REMAIN_77', 'PT_77777', 'RAINBOW_GLINT'] : commonPool;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  const baseLed = rushMode === 'brain' ? 'brain' : rushMode === 'rem' ? 'rem' : 'red';
  let label = '';

  switch (pick) {
    case 'LED_ONE_OFF': label = 'サイドLED片側消灯'; Math.random() < 0.5 ? setLedSide('off', baseLed) : setLedSide(baseLed, 'off'); await wait(880, token); break;
    case 'LED_ALL_OFF': label = 'サイドLED全消灯'; setLed('off'); await wait(880, token); break;
    case 'MONO_SCREEN': label = '液晶モノクロ化'; lcdFrame.classList.add('iwakan-mono'); await wait(860, token); lcdFrame.classList.remove('iwakan-mono'); break;
    case 'FADE_REMAIN': label = '残り回数消失'; if (hudRushRemain) hudRushRemain.classList.add('iwakan-fade-remain'); await wait(900, token); if (hudRushRemain) hudRushRemain.classList.remove('iwakan-fade-remain'); break;
    case 'REM_PURU': label = 'レムぷる'; oniLamp.classList.add('iwakan-rempuru'); lcdFrame.classList.add('iwakan-rempuru'); try { if (navigator && navigator.vibrate) navigator.vibrate([30,40,30,40,30]); } catch (e) {} await wait(860, token); oniLamp.classList.remove('iwakan-rempuru'); lcdFrame.classList.remove('iwakan-rempuru'); break;
    case 'GLITCH_BLINK': label = '映像ノイズ停止'; rushNoiseVeil.classList.remove('hidden'); lcdFrame.classList.add('fx-glitch'); await wait(260, token); lcdFrame.classList.remove('fx-glitch'); rushNoiseVeil.classList.add('hidden'); await wait(620, token); break;
    case 'HIDDEN_REM': {
      label = 'ひょっこり隠れレム';
      const rUrl = Assets.getRemLamp();
      hiddenRemBadge.className = 'pointer-events-none absolute bottom-1 right-1 z-[27] opacity-85 transition-opacity';
      hiddenRemBadge.innerHTML = rUrl
        ? `<img src="${rUrl}" class="w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(56,189,248,0.85)]" alt="隠れレム">`
        : `<span class="px-2 py-0.5 rounded bg-sky-900/90 text-sky-200 text-xs font-black">レム</span>`;
      hiddenRemBadge.classList.remove('hidden');
      await wait(960, token);
      hiddenRemBadge.classList.add('hidden');
      break;
    }
    case 'BGM_SILENT': label = 'BGM無音停止'; BgmEngine.cut(); await wait(940, token); break;
    case 'REMAIN_REWIND': {
      label = '残り回数巻き戻り(+1)';
      if (hudRushRemain) {
        const orig = hudRushRemain.textContent;
        const n = parseInt(orig, 10) || 100;
        hudRushRemain.textContent = String(n + 1);
        await wait(960, token);
        hudRushRemain.textContent = orig;
      }
      break;
    }
    case 'REMAIN_202': {
      label = '残り回数「202」(レム誕生日)';
      if (hudRushRemain) {
        const orig = hudRushRemain.textContent;
        hudRushRemain.textContent = '202';
        hudRushRemain.className = 'text-lg sm:text-xl font-black cyan-grad-text leading-none';
        await wait(960, token);
        hudRushRemain.textContent = orig;
        hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none';
      }
      break;
    }
    case 'REMAIN_77': {
      label = '残り回数「77」変化';
      if (hudRushRemain) {
        const orig = hudRushRemain.textContent;
        hudRushRemain.textContent = '77';
        hudRushRemain.className = 'text-lg sm:text-xl font-black rainbow-grad-text leading-none';
        await wait(960, token);
        hudRushRemain.textContent = orig;
        hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none';
      }
      break;
    }
    case 'PT_77777': {
      label = '獲得pt「77,777pt」変化';
      if (hudRushPts) {
        const orig = hudRushPts.textContent;
        hudRushPts.textContent = '77,777pt';
        await wait(960, token);
        hudRushPts.textContent = orig;
      }
      break;
    }
    case 'REEL_FLIP': {
      label = '図柄上下反転';
      const arr = rushMode === 'rem' ? remReels : oniReels;
      arr.forEach(el => { if (el) el.style.transform = 'rotate(180deg)'; });
      await wait(900, token);
      arr.forEach(el => { if (el) el.style.transform = ''; });
      break;
    }
    case 'REEL_BIG_MID': {
      label = '中図柄巨大化';
      const mid = rushMode === 'rem' ? remReels[1] : oniReels[1];
      if (mid) mid.style.transform = 'scale(1.48)';
      await wait(900, token);
      if (mid) mid.style.transform = '';
      break;
    }
    case 'ALL_ONI_RES': {
      label = '保留すべて「鬼」変化';
      if (rushMode !== 'brain') updateReserveSlots('NORMAL', 'ALL_ONI');
      await wait(920, token);
      if (rushMode !== 'brain') updateReserveSlots('NORMAL', null);
      break;
    }
    case 'MINI_POKYUN': {
      label = '極小ポキュン音';
      StudioAudio.playMiniPokyun();
      await wait(840, token);
      break;
    }
    case 'SCREEN_TILT': {
      label = '液晶わずかに傾き';
      lcdFrame.style.transform = 'rotate(-2.4deg)';
      await wait(900, token);
      lcdFrame.style.transform = '';
      break;
    }
    case 'COUNT_6000': {
      label = '残り回数「6000」変化';
      if (hudRushRemain) {
        const orig = hudRushRemain.textContent;
        hudRushRemain.textContent = '6000';
        hudRushRemain.className = 'text-lg sm:text-xl font-black rainbow-grad-text leading-none';
        await wait(960, token);
        hudRushRemain.textContent = orig;
        hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none';
      }
      break;
    }
    case 'RAINBOW_GLINT': label = 'ランプ一瞬虹点灯'; oniLamp.classList.add('lamp-rainbow'); await wait(200, token); oniLamp.classList.remove('lamp-rainbow'); await wait(700, token); break;
  }
  return label;
}

// -------------------------------------------------------------------------
// 14. 神秘「鬼がかってますね」・カウントアップ・新死に戻り復活・昇格
// -------------------------------------------------------------------------
async function playOnigakariImageCutin({
  caption = '鬼がかってますね', dur = 3800, withPokyun = true, fromBlackout = false, sparklePreStarted = false, token
}) {
  BgmEngine.cut();
  const imgSrc = Assets.getOnigakari();
  try {
    if (fromBlackout && !sparklePreStarted) {
      globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
      globalCutinOverlay.innerHTML = ''; globalCutinOverlay.classList.remove('hidden');
      SoftSparkle.start(); await waitFreeze(680, token);
    } else if (fromBlackout) SoftSparkle.start();

    globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
    globalCutinOverlay.innerHTML = `
      <div id="mysticPrismRays" class="mystic-prism-rays"></div>
      <div class="relative z-10 w-full max-w-lg flex flex-col items-center gap-3">
        <div id="cutinFrameBox" class="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-white/20 bg-black transition-all duration-1000 ${fromBlackout ? 'cutin-gentle-fade' : ''}">
          ${imgSrc ? `<img src="${imgSrc}" alt="鬼がかってますね" class="w-full h-full object-cover">`
            : `<div class="w-full h-full overlay-rainbow flex items-center justify-center"><span class="font-mincho text-4xl font-black text-white">${caption}</span></div>`}
          <div id="cutinShimmerBar" class="hidden prism-shimmer-bar"></div>
        </div>
        <div id="cutinCapText" class="font-mincho text-2xl sm:text-3xl font-black rainbow-grad-text tracking-widest drop-shadow-[0_2px_18px_rgba(255,255,255,0.6)] transition-opacity duration-1000 ${fromBlackout ? 'opacity-0' : 'opacity-100 pop-in'}">${caption}</div>
      </div>
    `;
    globalCutinOverlay.classList.remove('hidden');

    if (fromBlackout) {
      await waitFreeze(1450, token);
      const rays = document.getElementById('mysticPrismRays'), box = document.getElementById('cutinFrameBox');
      const shimmer = document.getElementById('cutinShimmerBar'), cap = document.getElementById('cutinCapText');
      if (rays) rays.classList.add('rays-on'); if (box) box.classList.add('border-4', 'mystic-halo-frame');
      if (shimmer) shimmer.classList.remove('hidden'); if (cap) cap.classList.replace('opacity-0', 'opacity-100');
      if (withPokyun) StudioAudio.playPokyun(true);
      setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
      await waitFreeze(Math.max(2100, dur - 1450), token);
    } else {
      const rays = document.getElementById('mysticPrismRays'), box = document.getElementById('cutinFrameBox'), shimmer = document.getElementById('cutinShimmerBar');
      if (rays) rays.classList.add('rays-on'); if (box) box.classList.add('border-4', 'mystic-halo-frame');
      if (shimmer) shimmer.classList.remove('hidden');
      if (withPokyun) StudioAudio.playPokyun(true);
      fireGlobalRainbowFlash(); setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
      await waitFreeze(dur, token);
    }
  } finally { SoftSparkle.stop(); hideGlobalCutin(); }
}

function get6000LogoKey(rushMode) {
  const rm = rushMode || (typeof state !== 'undefined' ? state.rushMode : 'onigakari');
  if (rm === 'brain' && Assets.getLogo('brain6000')) return 'brain6000';
  return Assets.getLogo('oni6000') ? 'oni6000' : (Assets.getLogo('brain6000') ? 'brain6000' : null);
}

function applyBonusModeTheme(rushMode, { isDespair = false, is6000 = false } = {}) {
  lcdFrame.classList.remove('mode-despair-bg', 'fx-gold', 'fx-rainbow', 'bonus-theme-brain', 'bonus-theme-rem');
  if (isDespair) { lcdFrame.classList.add('mode-despair-bg'); return { titleCls: 'text-xl sm:text-2xl font-black text-slate-200 pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.18em] text-slate-400 leading-none' }; }
  if (is6000) { lcdFrame.classList.add('fx-rainbow'); return { titleCls: 'text-2xl sm:text-3xl font-black rainbow-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.18em] text-amber-300 leading-none' }; }
  if (rushMode === 'brain') { lcdFrame.classList.add('bonus-theme-brain'); return { titleCls: 'text-xl sm:text-2xl font-black purple-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.18em] text-fuchsia-300 leading-none' }; }
  if (rushMode === 'rem') { lcdFrame.classList.add('bonus-theme-rem'); return { titleCls: 'text-xl sm:text-2xl font-black cyan-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.18em] text-sky-300 leading-none' }; }
  lcdFrame.classList.add('fx-gold');
  return { titleCls: 'text-xl sm:text-2xl font-black gold-grad-text pop-in', subCls: 'text-[10px] sm:text-xs font-black tracking-[0.18em] text-amber-300 leading-none' };
}

async function runCountUpBreak6000({ rushMode = 'onigakari', iwakanAnswer = '', token }) {
  try {
    BgmEngine.cut();
    setActiveScene('bonus'); hideIwakanAnswer();
    const th = applyBonusModeTheme(rushMode, { isDespair: false });
    StudioAudio.play1500Jackpot(true); FxCanvas.burstGold(34);

    setBonusLogo(rushMode === 'brain' ? 'rezeroPurple' : 'rezeroChain');
    bonusSubLabel.className = th.subCls;
    bonusSubLabel.textContent = rushMode === 'brain' ? '脳が震えるRUSH' : rushMode === 'rem' ? 'レム告知モード' : '鬼がかりRUSH';
    bonusMainTitle.className = th.titleCls; bonusMainTitle.textContent = '';
    bonusCountNum.classList.remove('hidden');
    bonusCountNum.className = 'text-4xl sm:text-5xl font-black gold-grad-text tracking-tight leading-none pop-in';
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
      bonusCountNum.className = 'text-4xl sm:text-5xl font-black rainbow-grad-text tracking-tight leading-none count-break-pop';
      bonusCountNum.textContent = st.val; bonusDesc.textContent = st.desc;
      FxCanvas.spawnRing(st.color, 300, 9); FxCanvas.burstRainbow(38);
      await wait(680, token);
    }

    lcdFrame.classList.remove('shake-mid');
    StudioAudio.playOchiburu(true); StudioAudio.playSlash(); firePhysicalSplitSlash();
    setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow'); triggerLamp('rainbow', '6,000!!');
    showFullscreenOverlay({
      mode: 'rainbow', sub: '限界突破', main: '超・鬼がかり 6,000 BONUS!!',
      logoKey: get6000LogoKey(rushMode), premia: true,
      extra: '1,500 → 3,000 → 4,500 → 6,000個（実質純増 5,600発）!!'
    });
    await wait(1100, token); StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(58);
    await wait(2150, token);
  } finally { bonusCountNum.classList.add('hidden'); clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

// ★新・リザルト死に戻り復活（1回転完全廃止 → 呪いノイズ暗転 → 鼓動 → restart.jpg降臨 → 6,000復活）★
async function runResultRevivalSequence(token) {
  try {
    BgmEngine.cut(); StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setLed('off'); setAmbientBg(''); setSunburst(false);

    // ① 紫ノイズ＆暗転
    lcdFrame.classList.add('fx-rgb-glitch');
    setGlobalBlackout(true);
    await waitFreeze(950, token);
    lcdFrame.classList.remove('fx-rgb-glitch');
    setGlobalBlackout(false);

    // ② 鼓動音＋見えざる手＋「……まだ、終わっていない」
    StudioAudio.playSoftHeartbeat();
    FxCanvas.spawnPurpleHands(30);
    showFullscreenOverlay({ mode: 'blackout', sub: 'RETURN BY DEATH', main: '……まだ、終わっていない', extra: '', scanlines: true });
    await waitFreeze(1150, token);

    // ③ restart.jpg 爆炎降臨!!
    const restartImg = Assets.getVStock('restart');
    StudioAudio.playReStart();
    if (restartImg) {
      slashHost.innerHTML = `<div class="absolute inset-0 z-30 bg-black flex items-center justify-center"><img src="${restartImg}" class="w-full h-full object-cover cutin-slam" alt="Re:Start"></div>`;
    }
    FxCanvas.burstFlames(36);
    await waitFreeze(980, token);
    slashHost.innerHTML = '';

    // ④ 落ちブルボタン → 横一刀両断で6,000復活!!
    showUniversalBotan({ label: '死に戻り復活!!', vibe: 'max', color: 'rainbow', drop: true });
    StudioAudio.playOchiburu(true); setPageMegaShake(true); await wait(1050, token);
    setPageMegaShake(false); hideUniversalBotan();

    StudioAudio.playPokyun(true); StudioAudio.playSlash(); firePhysicalSplitSlash();
    setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow'); triggerLamp('rainbow', '死に戻り復活!!');
    showFullscreenOverlay({
      mode: 'rainbow', sub: '死に戻り復活', main: '超・鬼がかり 6,000 BONUS!!',
      logoKey: get6000LogoKey(), premia: true,
      extra: '絶望からの奇跡の逆転!! 払出 6,000個（純増 5,600発）＋ ST144回復活!!'
    });
    await wait(850, token); StudioAudio.play6000Fanfare(false); await wait(2200, token);
  } finally { slashHost.innerHTML = ''; clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runWhale3000Direct(token) {
  try {
    BgmEngine.cut(); setAmbientBg('rainbow'); setSunburst(true); fireGlobalRainbowFlash();
    StudioAudio.playSlash(); firePhysicalSplitSlash();
    showFullscreenOverlay({
      mode: 'rainbow', sub: '白鯨討伐・3,000 BONUS', main: '鬼がかり 3,000 BONUS!!',
      logoKey: 'rezeroChain', premia: true,
      extra: '払出 3,000個（純増 2,800発）＋ 鬼がかりRUSH直行!!'
    });
    StudioAudio.play3000Jackpot(); triggerLamp('rainbow', '3,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
    await wait(2300, token); lcdFrame.classList.remove('shake-burst');
  } finally { clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runSuddenOchiburu6000({ sub = '鬼がかりRUSH', extra = '払出 6,000個（実質純増 5,600発）獲得!!', rushMode = null, skipAlarm = false, token }) {
  try {
    BgmEngine.cut();
    if (!skipAlarm) StudioAudio.playOchiburu(true);
    setAmbientBg('rainbow'); setSunburst(true); setPageMegaShake(true); fireGlobalRainbowFlash();
    triggerLamp('rainbow', '6,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-intense'); setLed('rainbow');
    FxCanvas.spawnLightning('#fef08a', 5); FxCanvas.burstRainbow(58);
    showFullscreenOverlay({ mode: 'rainbow', sub, main: '超・鬼がかり 6,000 BONUS!!', logoKey: get6000LogoKey(rushMode), premia: true, extra });
    await wait(skipAlarm ? 300 : 1250, token);
    setPageMegaShake(false); lcdFrame.classList.remove('shake-intense');
    StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(52);
    await wait(2150, token);
  } finally { clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}

async function runSudden3sFreeze6000(token) {
  try {
    BgmEngine.cut(); StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setLed('off'); setAmbientBg(''); setSunburst(false);
    setGlobalBlackout(true); await waitFreeze(2300, token);
    SoftSparkle.start(); await waitFreeze(700, token);

    await playOnigakariImageCutin({ caption: '鬼がかってますね', dur: 3800, withPokyun: true, fromBlackout: true, sparklePreStarted: true, token });
    setGlobalBlackout(false);

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
      if (r < 0.22) mode = 'pokyun';
      else if (r < 0.38) mode = 'freeze3s';
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

  try {
    BgmEngine.cut();
    setActiveScene('bonus'); hideIwakanAnswer();

    if (fakeRestart || fakeSound === 'restart') {
      StudioAudio.playReStart(); setBonusLogo(null);
      const rImg = Assets.getVStock('restart');
      if (rImg) {
        slashHost.innerHTML = `<div class="absolute inset-0 z-20 bg-black flex items-center justify-center"><img src="${rImg}" class="w-full h-full object-cover pop-in" alt="Re:Start"></div>`;
      } else {
        lcdFrame.classList.add('mode-despair-bg');
        bonusSubLabel.className = 'text-[10px] sm:text-xs font-black tracking-[0.18em] text-slate-400 leading-none';
        bonusMainTitle.className = 'text-3xl font-black text-slate-200 tracking-tight leading-tight pop-in';
      }
    } else {
      if (fakeSound === 'fail') StudioAudio.playFail();
      else if (fakeSound === '300' || fakeStyle === 'despair') StudioAudio.play300Sound();
      else StudioAudio.play1500Jackpot(fakeIsRush);

      const th = applyBonusModeTheme(rushMode, { isDespair: fakeStyle === 'despair' });
      const fakeLogo = fakeStyle === 'despair' || rushMode === 'brain' ? 'rezeroPurple' : 'rezeroChain';
      setBonusLogo(fakeLogo);
      bonusSubLabel.className = th.subCls; bonusMainTitle.className = th.titleCls;
      if (fakeBurstGold) FxCanvas.burstGold(34);
    }

    bonusSubLabel.textContent = fakeSub;
    bonusMainTitle.textContent = fakeTitle;
    bonusDesc.textContent = fakeDesc;
    if (iwakanAnswer && !useRareWhisper) showIwakanAnswer(iwakanAnswer, false);

    const waitRes = await waitInterruptible(1300, token);
    slashHost.innerHTML = '';

    if (waitRes === 'OK_INTERRUPT') {
      StudioAudio.playSlash(); StudioAudio.playOchiburu(true); firePhysicalSplitSlash();
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
      triggerLamp('rainbow', '6,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(1100, token); StudioAudio.play6000Fanfare(false); await wait(2000, token);
      lcdFrame.classList.remove('shake-burst'); return;
    }

    if (mode === 'pokyun') {
      StudioAudio.playPokyun(true); StudioAudio.playOchiburu(true); fireGlobalRainbowFlash();
      setAmbientBg('rainbow'); setSunburst(true); triggerLamp('rainbow', 'ポキュ↑ーン↓!!');
      lcdFrame.classList.remove('mode-despair-bg'); lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      FxCanvas.burstRainbow(54);
      showFullscreenOverlay({ mode: 'rainbow', sub: fakeRestart ? 'Re:Start' : finalSub, main: 'ポキュ↑ーン↓!!', extra: '', premia: true });
      await wait(1250, token); lcdFrame.classList.remove('shake-burst');
      StudioAudio.playSlash(); firePhysicalSplitSlash();
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
      StudioAudio.play6000Fanfare(false); triggerLamp('rainbow', '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(2200, token); lcdFrame.classList.remove('shake-burst'); return;
    }

    if (mode === 'botan') {
      showUniversalBotan({ label: '一撃昇格!!', vibe: 'max', color: 'rainbow', drop: true });
      StudioAudio.playOchiburu(true); setPageMegaShake(true); await wait(1050, token);
      setPageMegaShake(false); hideUniversalBotan();
      StudioAudio.playSlash(); firePhysicalSplitSlash(); setAmbientBg('rainbow'); setSunburst(true);
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
    setLed('off'); setAmbientBg(''); setSunburst(false);
    lcdFrame.classList.remove('fx-gold', 'fx-rainbow', 'mode-despair-bg', 'bonus-theme-brain', 'bonus-theme-rem');

    if (mode === 'freeze3s') {
      setGlobalBlackout(true); await waitFreeze(2000, token); SoftSparkle.start(); await waitFreeze(650, token);
      await playOnigakariImageCutin({ caption: '鬼がかってますね', dur: 3600, withPokyun: true, fromBlackout: true, sparklePreStarted: true, token });
      setGlobalBlackout(false);
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
    else firePhysicalSplitSlash();

    setAmbientBg('rainbow'); setSunburst(true);
    showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, logoKey: finalLogoKey, premia: true, extra: finalExtra });
    triggerLamp('rainbow', finalSound === '3000' ? 'RUSH!!' : '6,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
    await wait(mode === 'freeze3s' ? 150 : 950, token);
    if (finalSound === '3000') StudioAudio.play3000Jackpot(); else StudioAudio.play6000Fanfare(false);
    await wait(2150, token); lcdFrame.classList.remove('shake-burst');
  } finally { slashHost.innerHTML = ''; clearGlobalChaosEffects(); hideFullscreenOverlay(); }
}
