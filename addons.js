// =========================================================================
// addons.js (v4.1パッチ) :
//  1. result.jpg（鬼がかりRUSH / 鬼がかり6000 / TOTAL）の切り抜き座標＆透過を厳密修正
//  2. レム点灯時に前面の数字を完全非表示＆終了後に光りっぱなしにならないよう修正
// =========================================================================
(function initV41Hotfix() {
  // -----------------------------------------------------------------------
  // 1. result.jpg の厳密切り抜き＆Assets.getLogo差し替え
  // -----------------------------------------------------------------------
  const fixedLogos = { total: null, oniRush: null, oni6000: null };

  function cleanCutout(c, w, h, thresh = 226) {
    const imgData = c.getImageData(0, 0, w, h);
    const d = imgData.data;
    const total = w * h;
    const visited = new Uint8Array(total);
    const isBg = (idx) => {
      const p = idx * 4;
      const r = d[p], g = d[p + 1], b = d[p + 2];
      return r > thresh && g > thresh && b > thresh && (Math.max(r, g, b) - Math.min(r, g, b)) < 28;
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

    // 白ジャギー1px内側浸食
    const snap = new Uint8Array(total);
    for (let i = 0; i < total; i++) snap[i] = d[i * 4 + 3];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (snap[idx] === 0) continue;
        if (snap[idx - 1] === 0 || snap[idx + 1] === 0 || snap[idx - w] === 0 || snap[idx + w] === 0) {
          const p = idx * 4;
          const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          if (lum > 190) d[p + 3] = 0;
          else d[p + 3] = Math.round(d[p + 3] * 0.65);
        }
      }
    }
    c.putImageData(imgData, 0, 0);
  }

  function trimCanvas(srcCv, pad = 4) {
    const w = srcCv.width, h = srcCv.height;
    const d = srcCv.getContext('2d').getImageData(0, 0, w, h).data;
    let minX = w, minY = h, maxX = -1, maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 24) {
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

  function sliceResultSheetFixed(img) {
    const W = img.naturalWidth, H = img.naturalHeight;
    // 隣の文字（RUSH TIME / 10:177:0 / ×01）を完全に避けた厳密座標
    const crops = [
      { key: 'total',   x: 0.01, y: 0.00, w: 0.29, h: 0.23 },
      { key: 'oniRush', x: 0.01, y: 0.31, w: 0.31, h: 0.68 },
      { key: 'oni6000', x: 0.34, y: 0.59, w: 0.33, h: 0.41 }
    ];
    crops.forEach(cp => {
      const sx = Math.round(W * cp.x), sy = Math.round(H * cp.y);
      const sw = Math.max(10, Math.round(W * cp.w)), sh = Math.max(10, Math.round(H * cp.h));
      const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      cleanCutout(c, sw, sh, 224);
      fixedLogos[cp.key] = trimCanvas(cv, 4).toDataURL('image/png');
    });
  }

  // result.jpg / logo_oni_sheet.jpg を再読み込みして差し替え
  (function reloadResultSheet() {
    const list = ['result.jpg', 'result_2.jpg', 'logo_oni_sheet.jpg', 'logo_oni_sheet.png'];
    let i = 0;
    function next() {
      if (i >= list.length) return;
      const src = list[i++];
      const img = new Image();
      img.onload = () => sliceResultSheetFixed(img);
      img.onerror = next;
      img.src = src + '?v=' + Date.now();
    }
    next();
  })();

  if (typeof Assets !== 'undefined' && typeof Assets.getLogo === 'function') {
    const _origGetLogo = Assets.getLogo;
    Assets.getLogo = function (key) {
      if (fixedLogos[key]) return fixedLogos[key];
      return _origGetLogo(key);
    };
  }

  // -----------------------------------------------------------------------
  // 2. レム点灯時に前面の数字を完全消去＆終了後の光りっぱなし防止
  // -----------------------------------------------------------------------
  function setRemDigitsHidden(hidden) {
    const layer = document.getElementById('remDigitsLayer');
    if (!layer) return;
    layer.style.opacity = hidden ? '0' : '1';
    layer.style.visibility = hidden ? 'hidden' : 'visible';
    layer.classList.remove('rem-digits-dim');
    if (!hidden) {
      // 光りっぱなし（oni-digit-hit-lock）を確実に解除
      [0, 1, 2].forEach(i => {
        const el = document.getElementById(`remReel${i}`);
        if (el) el.classList.remove('oni-digit-hit-lock');
      });
    }
  }

  window.playRemNoticePattern = async function ({ is6000, forcePat = null, token }) {
    let pat = forcePat || 'NORMAL';
    if (!forcePat && is6000 && Math.random() < 0.75) {
      const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
      pat = p6[Math.floor(Math.random() * p6.length)];
    }

    BgmEngine.cut();
    setRemDigitsHidden(true); // ★点灯中は前面の数字を完全に消す★

    let note = '';
    try {
      if (pat === 'SLOW_GLOW') {
        note = 'レム徐々に点灯';
        oniLamp.classList.remove('lamp-rem', 'lamp-rainbow', 'lamp-red'); oniLamp.classList.add('lamp-rem-slow');
        lampStatusText.textContent = 'じわ〜っ…'; setLed('rem'); setRemLampVisual('slow');
        await wait(1150, token);
        setRemLampVisual('rainbow'); triggerLamp('rainbow', '6,000!!');
        StudioAudio.playPokyun(true);
        setAmbientBg('rainbow'); setSunburst(true); FxCanvas.burstRainbow(62);
        await wait(780, token);
      } else if (pat === 'DOUBLE_BLINK') {
        note = 'レム再点灯';
        oniLamp.classList.add('lamp-rem'); lampStatusText.textContent = 'ピッ…'; setRemLampVisual('lit');
        await wait(180, token);
        oniLamp.classList.remove('lamp-rem'); lampStatusText.textContent = '……'; setLed('off'); setRemLampVisual('idle');
        await wait(550, token);
        setRemLampVisual('rainbow'); triggerLamp('rainbow', '再点灯!!');
        StudioAudio.playPokyun(true);
        setAmbientBg('rainbow'); setSunburst(true);
        FxCanvas.spawnLightning('#4ade80', 4); FxCanvas.spawnLightning('#38bdf8', 4); FxCanvas.burstRainbow(62);
        await wait(800, token);
      } else if (pat === 'CLASSIC_FLASH') {
        note = '旧レム閃光';
        setRemLampVisual('strobe'); oniLamp.classList.add('lamp-rem-classic'); lampStatusText.textContent = '閃光!!';
        setLed('rainbow'); StudioAudio.playPokyun(true);
        setAmbientBg('rainbow'); setSunburst(true);
        FxCanvas.spawnRing('#4ade80', 320, 9); FxCanvas.spawnLightning('#e0f2fe', 6);
        await wait(960, token);
        oniLamp.classList.remove('lamp-rem-classic'); setRemLampVisual('rainbow');
      } else {
        setRemLampVisual('lit'); triggerLamp('rem', '点灯!!');
        StudioAudio.playPokyun(false);
        FxCanvas.spawnRing('#38bdf8', 260, 8);
        await wait(760, token);
      }
      return note;
    } finally {
      // 待機へ戻るときに光りっぱなしを確実にリセット
      setRemDigitsHidden(false);
    }
  };

  if (typeof window.setRemLampVisual === 'function') {
    const _origSetRemLamp = window.setRemLampVisual;
    window.setRemLampVisual = function (mode = 'idle') {
      _origSetRemLamp(mode);
      if (mode === 'idle') {
        setRemDigitsHidden(false);
      }
    };
  }
})();
