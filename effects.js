// =========================================================================
// effects.js (v4.0) : 統合ビジュアル＆演出エンジン
//  ・高画質エッジ浸食＋フェザー透過（rem_lamp / botan / pete 6コマ）
//  ・動的ステージ背景（通常4ステージ＋鬼がかり黄金紙吹雪＋脳震え見えざる手＋レム紫紅破片）
//  ・鬼がかり超巨大3桁図柄＆鬼レム接近 ／ 脳震え完全中央4層 ／ レムツノ白熱＆虹オーラ
//  ・神秘プリズム「鬼がかってますね」 ／ 出玉カウントアップ突破 ／ リザルト死に戻り復活
//  ・モード別専用大当たり画面 ／ botan.jpg 全編活用
// =========================================================================

// -------------------------------------------------------------------------
// 1. 高画質画像加工エンジン（外側白透過＋1px内側浸食＋滑らかアルファフェザー）
// -------------------------------------------------------------------------
const Assets = (() => {
  let onigakariSrc = null;
  let remLampUrl = null;
  let botanUrl = null;
  let peteFrames = new Array(6).fill(null);

  function applyCleanWhiteCutout(c, w, h, thresh = 232) {
    const imgData = c.getImageData(0, 0, w, h);
    const d = imgData.data;
    const total = w * h;
    const visited = new Uint8Array(total);
    const isBg = (idx) => {
      const p = idx * 4;
      const r = d[p], g = d[p + 1], b = d[p + 2];
      return r > thresh && g > thresh && b > thresh && (Math.max(r, g, b) - Math.min(r, g, b)) < 26;
    };

    const queue = new Int32Array(total);
    let head = 0, tail = 0;
    const push = (idx) => {
      if (!visited[idx]) { visited[idx] = 1; queue[tail++] = idx; }
    };

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

    // パス1：透明隣接ピクセルの白フチを内側へ1px浸食（白ジャギー完全除去）
    const origA = new Uint8Array(total);
    for (let i = 0; i < total; i++) origA[i] = d[i * 4 + 3];

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (origA[idx] === 0) continue;
        const nTrans =
          (origA[idx - 1] === 0 ? 1 : 0) + (origA[idx + 1] === 0 ? 1 : 0) +
          (origA[idx - w] === 0 ? 1 : 0) + (origA[idx + w] === 0 ? 1 : 0);
        if (nTrans > 0) {
          const p = idx * 4;
          const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          if (lum > 195) {
            d[p + 3] = 0; // 白い輪郭ゴミを完全削除
          } else {
            d[p + 3] = Math.round(d[p + 3] * (nTrans >= 2 ? 0.45 : 0.72));
          }
        }
      }
    }

    // パス2：新輪郭を0.5pxソフトに馴染ませるフェザー処理
    const midA = new Uint8Array(total);
    for (let i = 0; i < total; i++) midA[i] = d[i * 4 + 3];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const idx = y * w + x;
        if (midA[idx] === 0) continue;
        if (midA[idx - 1] === 0 || midA[idx + 1] === 0 || midA[idx - w] === 0 || midA[idx + w] === 0) {
          const p = idx * 4;
          const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
          if (lum > 180) d[p + 3] = Math.min(d[p + 3], 120);
          else d[p + 3] = Math.min(d[p + 3], 210);
        }
      }
    }

    c.putImageData(imgData, 0, 0);
  }

  function processSingleImage(img, maxDim = 920) {
    try {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, w, h);
      applyCleanWhiteCutout(c, w, h, 230);
      return cv.toDataURL('image/png');
    } catch (e) { return img.src; }
  }

  function processPeteGrid(img) {
    try {
      const W = img.naturalWidth, H = img.naturalHeight;
      const cw = W / 3, ch = H / 2;
      const mx = Math.round(cw * 0.042);
      const my = Math.round(ch * 0.048);
      const sw = Math.max(10, Math.round(cw - mx * 2));
      const sh = Math.max(10, Math.round(ch - my * 2));

      for (let idx = 0; idx < 6; idx++) {
        if (peteFrames[idx]) continue; // 個別高画質版(pete_0.png等)があれば優先維持
        const col = idx % 3, row = Math.floor(idx / 3);
        const sx = Math.round(col * cw + mx);
        const sy = Math.round(row * ch + my);
        // 少し高解像度側へ滑らかリサンプルしてジャギーを軽減
        const outW = Math.min(640, Math.round(sw * 1.4));
        const outH = Math.min(640, Math.round(sh * 1.4));
        const cv = document.createElement('canvas'); cv.width = outW; cv.height = outH;
        const c = cv.getContext('2d');
        c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
        c.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

        if (idx <= 3) applyCleanWhiteCutout(c, outW, outH, 226);

        // 下端・四隅を紫背景へ自然に溶かすソフトビネット
        c.save();
        c.globalCompositeOperation = 'destination-in';
        const rad = Math.max(outW, outH) * 0.62;
        const g = c.createRadialGradient(outW * 0.5, outH * 0.44, rad * 0.50, outW * 0.5, outH * 0.46, rad);
        g.addColorStop(0, 'rgba(0,0,0,1)');
        g.addColorStop(0.80, 'rgba(0,0,0,0.96)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        c.fillStyle = g;
        c.fillRect(0, 0, outW, outH);
        c.restore();

        peteFrames[idx] = cv.toDataURL('image/png');
      }
    } catch (e) {}
  }

  function applyLoadedBotan() {
    if (!botanUrl) return;
    ['brainBotanImg', 'reachBotanImg', 'uniBotanImg'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.src = botanUrl;
    });
  }

  function applyLoadedRem() {
    if (!remLampUrl) return;
    const r1 = document.getElementById('remLampImg');
    const r2 = document.getElementById('oniRemApproachImg');
    if (r1) r1.src = remLampUrl;
    if (r2) r2.src = remLampUrl;
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
    tryLoadList(['onigakari.jpg', 'onigakari.png', 'image_3da6a7.jpg'], (_img, src) => {
      onigakariSrc = src;
    });
    tryLoadList(['rem_lamp.jpg', 'rem_lamp.png', '1795190676369.jpg'], (img) => {
      remLampUrl = processSingleImage(img, 960);
      applyLoadedRem();
      if (typeof syncRushStages === 'function') syncRushStages();
    });
    tryLoadList(['botan.jpg', 'botan.png', 'image_d97bd3.jpg'], (img) => {
      botanUrl = processSingleImage(img, 680);
      applyLoadedBotan();
    });
    tryLoadList(['pete.jpg', 'pete.png', 'image_69618d.jpg'], (img) => {
      processPeteGrid(img);
      if (typeof syncRushStages === 'function') syncRushStages();
    });

    // 個別高画質版(pete_0.png〜pete_5.png)が置かれた場合は自動で優先差し替え
    for (let k = 0; k < 6; k++) {
      ((idx) => {
        const im = new Image();
        im.onload = () => { peteFrames[idx] = processSingleImage(im, 720); };
        im.src = `pete_${idx}.png`;
      })(k);
    }
  }

  setTimeout(preloadAll, 10);

  return {
    getOnigakari: () => onigakariSrc,
    getRemLamp: () => remLampUrl,
    getBotan: () => botanUrl,
    getPeteFrame: (i) => peteFrames[Math.max(0, Math.min(5, i))] || null,
    hasPete: () => peteFrames.some(Boolean)
  };
})();

// -------------------------------------------------------------------------
// 2. サラサラキラキラ専用Canvas（暗転終盤から上品に漂う光粒）
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
    for (let i = 0; i < 76; i++) {
      motes.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.24, vy: -(0.14 + Math.random() * 0.36),
        r: 0.7 + Math.random() * 1.8, phase: Math.random() * Math.PI * 2,
        twinkleSpd: 0.026 + Math.random() * 0.048, isStar: Math.random() < 0.26,
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

      const alpha = 0.20 + Math.max(0, Math.sin(m.phase)) * 0.72;
      ctx.save();
      ctx.globalAlpha = alpha; ctx.fillStyle = m.color;
      ctx.shadowBlur = m.r * 6.0; ctx.shadowColor = m.color;
      if (m.isStar) {
        const len = m.r * 3.8;
        ctx.translate(m.x, m.y); ctx.strokeStyle = m.color; ctx.lineWidth = 0.8;
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
    start() {
      resize();
      if (!running) { initMotes(); running = true; cv.classList.add('sparkle-on'); draw(); }
      else cv.classList.add('sparkle-on');
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
      cv.classList.remove('sparkle-on'); running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
      ctx.clearRect(0, 0, w, h);
    }
  };
})();

// -------------------------------------------------------------------------
// 3. 動的ステージ背景Canvas（通常4ステージ／鬼がかり黄金紙吹雪／脳震え／レム紫紅破片）
// -------------------------------------------------------------------------
const StageBg = (() => {
  const cv = document.getElementById('stageBgCanvas');
  const ctx = cv.getContext('2d');
  const stageNamePill = document.getElementById('stageNamePill');
  let w = 360, h = 360, angle = 0;

  const NORMAL_STAGES = [
    { name: '王都ルグニカ', c1: '#451218', c2: '#1f080d', accent: '#facc15', glow: 'rgba(250,204,21,0.34)' },
    { name: 'ロズワール邸・夕暮れ', c1: '#5c1d0c', c2: '#230b08', accent: '#fb923c', glow: 'rgba(251,146,60,0.36)' },
    { name: '蒼月の森', c1: '#0c2748', c2: '#071124', accent: '#38bdf8', glow: 'rgba(56,189,248,0.34)' },
    { name: '霧の街道', c1: '#12383a', c2: '#07171a', accent: '#2dd4bf', glow: 'rgba(45,212,191,0.32)' }
  ];

  // 鬼がかりRUSH用：舞い狂う黄金の破片＆「鬼」文字＆スピードライン
  const goldShards = Array.from({ length: 42 }, (_, i) => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.008, vy: -(0.004 + Math.random() * 0.010),
    sz: 4 + Math.random() * 8, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.14,
    isKanji: i % 7 === 0,
    color: i % 3 === 0 ? '#fef9c3' : i % 3 === 1 ? '#facc15' : '#f59e0b'
  }));
  const rays = Array.from({ length: 34 }, () => ({
    a: Math.random() * Math.PI * 2, r: Math.random(),
    spd: 0.016 + Math.random() * 0.026, len: 0.12 + Math.random() * 0.20
  }));
  // レム告知用：本家準拠・紫×ピンク×蒼の光条＆クリスタル破片
  const remShards = Array.from({ length: 36 }, (_, i) => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.005, vy: (Math.random() - 0.5) * 0.006,
    sz: 3 + Math.random() * 8, rot: Math.random() * Math.PI * 2, vrot: (Math.random() - 0.5) * 0.09,
    color: ['#e879f9', '#c026d3', '#38bdf8', '#f472b6', '#ffffff'][i % 5]
  }));

  function resize() {
    const rect = cv.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(100, rect.width); h = Math.max(100, rect.height);
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawMagicCircle(cx, cy, radius, color, rot, alpha) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rot);
    ctx.strokeStyle = color; ctx.globalAlpha = alpha; ctx.lineWidth = 1.4;
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

  function drawUnseenTendrils(t, pulse) {
    ctx.save();
    for (let i = 0; i < 6; i++) {
      const left = i % 2 === 0;
      const startX = left ? -10 : w + 10;
      const baseY = h * (0.18 + (i % 3) * 0.25);
      ctx.beginPath(); ctx.moveTo(startX, baseY);
      const dir = left ? 1 : -1;
      const reach = w * (0.28 + Math.sin(t * 2.1 + i) * 0.08 + pulse * 0.06);
      ctx.bezierCurveTo(
        startX + dir * reach * 0.45, baseY + Math.sin(t * 3.0 + i * 1.4) * 38,
        startX + dir * reach * 0.85, baseY + Math.cos(t * 2.5 + i) * 44,
        startX + dir * reach, baseY + Math.sin(t * 1.9 + i * 2) * 28
      );
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(232, 121, 249, 0.45)' : 'rgba(147, 51, 234, 0.56)';
      ctx.lineWidth = 10 + pulse * 6; ctx.lineCap = 'round';
      ctx.shadowBlur = 22; ctx.shadowColor = '#c026d3';
      ctx.stroke();
    }
    ctx.restore();
  }

  function tick() {
    const pulse = (typeof BgmEngine !== 'undefined') ? BgmEngine.consumePulse() : 0;
    const isCut = (typeof BgmEngine !== 'undefined') ? BgmEngine.isCut() : false;
    const ph = (typeof state !== 'undefined') ? state.phase : 'NORMAL';
    const rm = (typeof state !== 'undefined') ? state.rushMode : 'onigakari';
    const sc = (typeof state !== 'undefined') ? state.activeScene : 'normal';
    const frozen = isCut && ph === 'ANIMATING';
    if (!frozen) angle += 0.006 + pulse * 0.012;

    if (stageNamePill) stageNamePill.classList.toggle('hidden', !(ph === 'NORMAL' && sc === 'normal'));

    const cx = w * 0.5, cy = h * 0.48;
    ctx.clearRect(0, 0, w, h);

    if (ph === 'RUSH' || (ph === 'ANIMATING' && sc === 'rush-idle')) {
      if (rm === 'onigakari') {
        // ★本家風：燃え盛る黄金×深紅のゴージャス空間＋黄金紙吹雪＆金「鬼」文字乱舞★
        const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.78);
        bg.addColorStop(0, `rgba(217, 119, 6, ${0.52 + pulse * 0.25})`);
        bg.addColorStop(0.45, `rgba(153, 27, 27, ${0.72 + pulse * 0.14})`);
        bg.addColorStop(1, 'rgba(26, 8, 4, 0.96)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * (1 + pulse * 0.95); if (r.r > 1.25) { r.r = 0.05; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.78, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 2 === 0 ? '#fef08a' : '#f59e0b';
          ctx.globalAlpha = Math.min(0.85, r.r * 0.88); ctx.lineWidth = idx % 3 === 0 ? 2.6 : 1.4;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;

        goldShards.forEach(s => {
          if (!frozen) {
            s.x += s.vx; s.y += s.vy * (1 + pulse * 0.6); s.rot += s.vrot;
            if (s.y < -0.08) { s.y = 1.08; s.x = Math.random(); }
            if (s.x < -0.08) s.x = 1.08; if (s.x > 1.08) s.x = -0.08;
          }
          ctx.save();
          ctx.translate(s.x * w, s.y * h); ctx.rotate(s.rot);
          ctx.fillStyle = s.color; ctx.shadowBlur = 10; ctx.shadowColor = '#facc15';
          if (s.isKanji) {
            ctx.globalAlpha = 0.55;
            ctx.font = `900 ${Math.round(s.sz * 2.1)}px "Shippori Mincho", serif`;
            ctx.fillText('鬼', -s.sz, s.sz);
          } else {
            ctx.globalAlpha = 0.82;
            ctx.fillRect(-s.sz, -s.sz * 0.45, s.sz * 2, s.sz * 0.9);
          }
          ctx.restore();
        });
      } else if (rm === 'brain') {
        const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.76);
        bg.addColorStop(0, `rgba(192, 38, 211, ${0.44 + pulse * 0.30})`);
        bg.addColorStop(0.48, `rgba(88, 28, 135, ${0.74 + pulse * 0.14})`);
        bg.addColorStop(1, 'rgba(14, 3, 24, 0.98)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * (1.2 + pulse); if (r.r > 1.2) { r.r = 0.08; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.78, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 3 === 0 ? '#f0abfc' : idx % 3 === 1 ? '#e11d48' : '#a855f7';
          ctx.globalAlpha = Math.min(0.75, r.r * 0.75); ctx.lineWidth = idx % 2 === 0 ? 2.0 : 1.2;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;
        drawUnseenTendrils(angle * 4, pulse);
      } else {
        // ★レム告知モード：本家準拠の紫×ピンク×蒼クリスタル破片＆ド派手ネオン空間★
        const bg = ctx.createRadialGradient(cx, cy * 0.85, 14, cx, cy, Math.max(w, h) * 0.82);
        bg.addColorStop(0, `rgba(192, 38, 211, ${0.34 + pulse * 0.20})`);
        bg.addColorStop(0.45, `rgba(59, 7, 100, ${0.72 + pulse * 0.12})`);
        bg.addColorStop(0.80, 'rgba(12, 24, 52, 0.92)');
        bg.addColorStop(1, 'rgba(6, 8, 22, 0.98)');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

        // 斜めに飛び交うピンク＆シアン光条
        rays.forEach((r, idx) => {
          if (!frozen) { r.r += r.spd * 0.75; if (r.r > 1.25) { r.r = 0.06; r.a = Math.random() * Math.PI * 2; } }
          const maxD = Math.max(w, h) * 0.8, r1 = r.r * maxD, r2 = (r.r + r.len) * maxD;
          ctx.strokeStyle = idx % 3 === 0 ? '#38bdf8' : '#e879f9';
          ctx.globalAlpha = Math.min(0.55, r.r * 0.55); ctx.lineWidth = 1.6;
          ctx.beginPath(); ctx.moveTo(cx + Math.cos(r.a) * r1, cy + Math.sin(r.a) * r1); ctx.lineTo(cx + Math.cos(r.a) * r2, cy + Math.sin(r.a) * r2); ctx.stroke();
        });
        ctx.globalAlpha = 1;

        remShards.forEach(s => {
          if (!frozen) {
            s.x += s.vx; s.y += s.vy; s.rot += s.vrot;
            if (s.y < -0.05) s.y = 1.05; if (s.y > 1.05) s.y = -0.05;
            if (s.x < -0.05) s.x = 1.05; if (s.x > 1.05) s.x = -0.05;
          }
          ctx.save();
          ctx.translate(s.x * w, s.y * h); ctx.rotate(s.rot);
          ctx.fillStyle = s.color; ctx.globalAlpha = 0.62;
          ctx.shadowBlur = 12; ctx.shadowColor = s.color;
          ctx.beginPath();
          ctx.moveTo(0, -s.sz); ctx.lineTo(s.sz * 0.65, 0); ctx.lineTo(0, s.sz); ctx.lineTo(-s.sz * 0.65, 0);
          ctx.closePath(); ctx.fill();
          ctx.restore();
        });
      }
    } else {
      // 通常時：30回転ごとに4ステージ自動ローテ
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

  window.addEventListener('resize', resize);
  setTimeout(resize, 40);
  requestAnimationFrame(tick);

  return { resize };
})();

// -------------------------------------------------------------------------
// 4. 最前面FX Canvas（リング・稲妻・紙吹雪・ひび割れ・羽根）
// -------------------------------------------------------------------------
const FxCanvas = (() => {
  const canvas = document.getElementById('fxCanvas');
  const ctx = canvas.getContext('2d');
  let w = 360, h = 360, ambientMode = 'ember';
  const particles = [], rings = [], bolts = [], cracks = [];

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = Math.max(100, rect.width); h = Math.max(100, rect.height);
    canvas.width = w * dpr; canvas.height = h * dpr;
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
        x += (Math.random() - 0.5) * 84; y = (h / 8) * i;
        pts.push({ x, y });
      }
      bolts.push({ pts, color, alpha: 1 });
    }
  }

  function spawnPurpleHands(count = 28) {
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? 0 : w;
      particles.push({
        type: 'spark', x: side + (side === 0 ? -5 : 5), y: Math.random() * h,
        vx: (side === 0 ? 1 : -1) * (2.4 + Math.random() * 3.8), vy: (Math.random() - 0.5) * 1.4,
        size: 3.0 + Math.random() * 4.5, color: i % 3 === 0 ? '#e879f9' : '#7e22ce', alpha: 0.92, decay: 0.018
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
        const len = 24 + Math.random() * 28, a = baseA + (Math.random() - 0.5) * 0.7;
        px += Math.cos(a) * len; py += Math.sin(a) * len;
        pts.push({ x: px, y: py });
      }
      cracks.push({ pts, progress: 0 });
    }
  }
  function clearCracks() { cracks.length = 0; }

  function burstGold(count = 60) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 2.4 + Math.random() * 6.5;
      particles.push({
        type: 'confetti', x: w * 0.5, y: h * 0.48,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.0,
        size: 4 + Math.random() * 5, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.25,
        color: ['#fde047', '#facc15', '#ef4444', '#ffffff', '#fb7185'][i % 5],
        alpha: 1, decay: 0.011 + Math.random() * 0.008
      });
    }
  }

  function burstRainbow(count = 78) {
    const colors = ['#fde047', '#fb7185', '#c084fc', '#38bdf8', '#34d399', '#fb923c', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 2.6 + Math.random() * 7.2;
      particles.push({
        type: i % 3 === 0 ? 'spark' : 'confetti', x: w * 0.5, y: h * 0.48,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2.2,
        size: 3.8 + Math.random() * 5.2, rot: Math.random() * Math.PI, vrot: (Math.random() - 0.5) * 0.28,
        color: colors[i % colors.length], alpha: 1, decay: 0.010 + Math.random() * 0.008
      });
    }
  }

  function burstFlames(count = 40) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2, speed = 1.8 + Math.random() * 5.2;
      particles.push({
        type: 'spark', x: w * 0.5, y: h * 0.5,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 4.2, color: ['#ef4444', '#f97316', '#fde047'][i % 3],
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
        sway: Math.random() * Math.PI * 2, color: i % 3 === 0 ? '#fef08a' : '#ffffff',
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
        size: 1.5 + Math.random() * 2.2, color: Math.random() < 0.55 ? '#facc15' : '#fb923c', alpha: 0.60, decay: 0.006
      });
    } else if (ambientMode === 'wedding' && particles.length < 48 && Math.random() < 0.35) {
      spawnFeathers(1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.alpha -= p.decay;
      if (p.alpha <= 0 || p.y < -60 || p.y > h + 60) { particles.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.max(0, p.alpha);
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
        ctx.save(); ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2.6;
        ctx.shadowBlur = 14; ctx.shadowColor = '#ef4444';
        ctx.beginPath(); ctx.moveTo(cr.pts[0].x, cr.pts[0].y);
        for (let i = 1; i <= maxIdx; i++) ctx.lineTo(cr.pts[i].x, cr.pts[i].y);
        ctx.stroke(); ctx.restore();
      });
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  setTimeout(resize, 40);
  requestAnimationFrame(tick);

  return {
    resize, clearAll, setAmbient: m => { ambientMode = m; },
    spawnRing, spawnLightning, spawnPurpleHands, spawnRedCracks, clearCracks,
    burstGold, burstRainbow, burstFlames, spawnFeathers
  };
})();

// -------------------------------------------------------------------------
// 5. タイミング制御＆DOM参照
// -------------------------------------------------------------------------
let fastMode = false;
let seqToken = 0;

function wait(ms, token = seqToken) {
  const dur = Math.max(55, Math.round(ms * (fastMode ? 0.42 : 1.0)));
  return new Promise((resolve, reject) => {
    setTimeout(() => { token !== seqToken ? reject('CANCELLED') : resolve(); }, dur);
  });
}

function waitFreeze(ms, token = seqToken) {
  const dur = fastMode ? Math.round(ms * 0.65) : ms;
  return new Promise((resolve, reject) => {
    setTimeout(() => { token !== seqToken ? reject('CANCELLED') : resolve(); }, dur);
  });
}

let promoInterruptResolver = null;
function canInterruptPromotion() { return typeof promoInterruptResolver === 'function'; }
function interruptPromotionByOk() {
  if (typeof promoInterruptResolver === 'function') {
    const fn = promoInterruptResolver; promoInterruptResolver = null;
    fn('OK_INTERRUPT'); return true;
  }
  return false;
}
function waitInterruptible(ms, token = seqToken) {
  const dur = Math.max(80, Math.round(ms * (fastMode ? 0.55 : 1.0)));
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return; done = true; promoInterruptResolver = null;
      token !== seqToken ? reject('CANCELLED') : resolve('TIMEOUT');
    }, dur);
    promoInterruptResolver = (reason) => {
      if (done) return; done = true; clearTimeout(timer); promoInterruptResolver = null;
      token !== seqToken ? reject('CANCELLED') : resolve(reason);
    };
  });
}

const ambientBgLayer = document.getElementById('ambientBgLayer');
const sunburstLayer = document.getElementById('sunburstLayer');
const globalBlackoutCurtain = document.getElementById('globalBlackoutCurtain');
const globalRainbowFlash = document.getElementById('globalRainbowFlash');
const globalCutinOverlay = document.getElementById('globalCutinOverlay');
const pageShakeTargets = [document.querySelector('header'), document.querySelector('main')].filter(Boolean);

const lcdFrame = document.getElementById('lcdFrame');
const ledLeft = document.getElementById('ledLeft');
const ledRight = document.getElementById('ledRight');
const slashHost = document.getElementById('slashHost');
const fullscreenOverlay = document.getElementById('fullscreenOverlay');
const crtScanLayer = document.getElementById('crtScanLayer');
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
const oniRushSubBanner = document.getElementById('oniRushSubBanner');

const brainRushStage = document.getElementById('brainRushStage');
const brainPetePositions = [document.getElementById('brainPetePos0'), document.getElementById('brainPetePos1')];
const brainPeteImgs = [document.getElementById('brainPeteImg0'), document.getElementById('brainPeteImg1')];
const brainBotanImg = document.getElementById('brainBotanImg');
const brainBotanRing = document.getElementById('brainBotanRing');
const brainBotanGlow = document.getElementById('brainBotanGlow');
const brainTextSwarm = document.getElementById('brainTextSwarm');
const brainEvoFlash = document.getElementById('brainEvoFlash');
let brainPeteSlot = 0;

const remRushStage = document.getElementById('remRushStage');
const remLampImg = document.getElementById('remLampImg');
const remHornGlow = document.getElementById('remHornGlow');

const rushTopBadge = document.getElementById('rushTopBadge');
const hiddenRemBadge = document.getElementById('hiddenRemBadge');
const rushNoiseVeil = document.getElementById('rushNoiseVeil');

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
const reachBotanImg = document.getElementById('reachBotanImg');
const reachBotanRing = document.getElementById('reachBotanRing');
const reachBotanGlow = document.getElementById('reachBotanGlow');
const reachBotanText = document.getElementById('reachBotanText');
const btnSecretOk = document.getElementById('btnSecretOk');

const universalBotanOverlay = document.getElementById('universalBotanOverlay');
const uniBotanLabel = document.getElementById('uniBotanLabel');
const uniBotanImg = document.getElementById('uniBotanImg');
const uniBotanRing = document.getElementById('uniBotanRing');
const uniBotanGlow = document.getElementById('uniBotanGlow');

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

let remTestOverride = false;
let brainTestOverride = false;
let oniTestOverride = false;

// -------------------------------------------------------------------------
// 6. 縁外・LED・汎用ボタン・3モードステージ一元制御
// -------------------------------------------------------------------------
function setAmbientBg(mode = '') {
  ambientBgLayer.className = 'fixed inset-0 pointer-events-none z-0' + (mode ? ` bg-mode-${mode}` : '');
}
function setSunburst(on) { sunburstLayer.classList.toggle('hidden', !on); }
function setGlobalBlackout(on) { globalBlackoutCurtain.classList.toggle('hidden', !on); }
function hideGlobalCutin() { globalCutinOverlay.classList.add('hidden'); globalCutinOverlay.innerHTML = ''; }
function setPageMegaShake(on) { pageShakeTargets.forEach(el => el.classList.toggle('page-mega-shake', on)); }

function fireGlobalRainbowFlash() {
  globalRainbowFlash.className = 'fixed inset-0 z-[998] pointer-events-none global-rainbow-burst';
  void globalRainbowFlash.offsetWidth;
  setTimeout(() => { globalRainbowFlash.className = 'hidden fixed inset-0 z-[998] pointer-events-none'; }, 750);
}

function setLed(style) {
  [ledLeft, ledRight].forEach(el => { el.className = 'led-bar shrink-0' + (style ? ` led-${style}` : ''); });
}
function setLedSide(leftStyle, rightStyle) {
  ledLeft.className = 'led-bar shrink-0' + (leftStyle ? ` led-${leftStyle}` : '');
  ledRight.className = 'led-bar shrink-0' + (rightStyle ? ` led-${rightStyle}` : '');
}

// 汎用 botan.jpg スタイル制御（通常リーチ／脳震え／一撃昇格で共通利用）
function applyBotanStyle(imgEl, ringEl, glowEl, { vibe = 'idle', color = '', drop = false } = {}) {
  if (imgEl) {
    imgEl.className = 'botan-img-base';
    void imgEl.offsetWidth;
    if (drop) imgEl.classList.add('btn-drop-ochi');
    else if (vibe === 'weak') imgEl.classList.add('btn-vibe-weak');
    else if (vibe === 'mid') imgEl.classList.add('btn-vibe-mid');
    else if (vibe === 'max') imgEl.classList.add('btn-vibe-max');
  }
  if (ringEl) {
    ringEl.className = 'absolute w-[118%] h-[118%] rounded-full pointer-events-none opacity-0';
    if (vibe === 'max' || drop || color === 'rainbow') ringEl.classList.add('btn-ring-rainbow');
    else if (vibe === 'weak' || vibe === 'mid' || color) ringEl.classList.add('btn-ring-active');
  }
  if (glowEl) {
    glowEl.className = 'botan-crystal-glow';
    if (color) glowEl.classList.add(`botan-glow-${color}`);
  }
}

function setReachBotanState(opts) { applyBotanStyle(reachBotanImg, reachBotanRing, reachBotanGlow, opts); }
function setBrainButtonState(vibe = 'idle', color = '') {
  const autoCol = color || (vibe === 'max' ? 'rainbow' : vibe === 'mid' ? 'red' : vibe === 'weak' ? 'purple' : '');
  applyBotanStyle(brainBotanImg, brainBotanRing, brainBotanGlow, { vibe, color: autoCol });
}

function showUniversalBotan({ label = '一撃解放!!', vibe = 'max', color = 'rainbow', drop = false } = {}) {
  uniBotanLabel.textContent = label;
  universalBotanOverlay.classList.remove('hidden');
  applyBotanStyle(uniBotanImg, uniBotanRing, uniBotanGlow, { vibe, color, drop });
}
function hideUniversalBotan() {
  universalBotanOverlay.classList.add('hidden');
  applyBotanStyle(uniBotanImg, uniBotanRing, uniBotanGlow, { vibe: 'idle', color: '' });
}

function setVStockBadge(on) {
  if (hudVStockBadge) hudVStockBadge.classList.toggle('hidden', !on);
}

// ★3モード専用ステージの一元表示切替（他画面への残留100%防止）★
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
    setBrainButtonState('idle');
    brainPetePositions.forEach(p => p.classList.remove('pete-shown'));
  }

  remRushStage.classList.toggle('hidden', !showRem);
  if (!showRem) {
    remHornGlow.classList.remove('horn-on');
  }
}

function clearGlobalChaosEffects() {
  promoInterruptResolver = null;
  SoftSparkle.forceClear();
  setGlobalBlackout(false);
  hideGlobalCutin();
  hideUniversalBotan();
  setPageMegaShake(false);
  setSunburst(false);
  lcdFrame.classList.remove('fx-rgb-glitch');
  slashHost.innerHTML = '';
}

function showIwakanAnswer(text, isBrainWhisper = false) {
  if (!text) { hideIwakanAnswer(); return; }
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

function setActiveScene(sceneName) {
  if (typeof state !== 'undefined') state.activeScene = sceneName;
  Object.entries(scenePanes).forEach(([key, el]) => el.classList.toggle('hidden', key !== sceneName));
  if (sceneName !== 'bonus') {
    hideIwakanAnswer();
    bonusCountNum.classList.add('hidden');
    lcdFrame.classList.remove('bonus-theme-brain', 'bonus-theme-rem');
  }
  if (sceneName !== 'reach') pushButtonArea.classList.add('hidden');
  if (sceneName !== 'rush-idle') {
    rushTopBadge.classList.add('hidden');
    hiddenRemBadge.classList.add('hidden');
  }
  btnSecretOk.classList.toggle('secret-ok-active', sceneName === 'reach' || sceneName === 'rush-idle' || sceneName === 'bonus');
  syncRushStages();
}

function showFullscreenOverlay({ mode = 'blackout', sub = '', main = '', extra = '', scanlines = false }) {
  oniRushStage.classList.add('hidden');
  brainRushStage.classList.add('hidden');
  remRushStage.classList.add('hidden');
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
  } else if (mode === '6000' || mode === 'gold') {
    fullscreenOverlay.classList.add('overlay-6000');
    fsSub.className = 'relative z-10 text-xs sm:text-sm font-black tracking-[0.22em] text-amber-300 mb-2';
    fsMain.className = `relative z-10 text-3xl sm:text-5xl font-black ${mode === '6000' ? 'rainbow-grad-text' : 'gold-grad-text'} tracking-wider leading-tight pop-in px-1`;
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
  syncRushStages();
}

// 通常時リール＆鬼がかり超巨大3桁図柄
function setReels(a, b, c, { spinning = [false, false, false], tenpai = false } = {}) {
  [a, b, c].forEach((v, i) => {
    reelNums[i].textContent = v;
    reelNums[i].className = `text-4xl sm:text-5xl font-black ${v % 2 === 1 ? 'gold-grad-text' : 'crimson-grad-text'}${spinning[i] ? ' reel-spinning' : ''}`;
    reelBoxes[i].classList.toggle('reel-tenpai', tenpai && (i === 0 || i === 2));
  });
}
function randomMissReels() {
  const a = Math.floor(Math.random() * 7) + 1, b = Math.floor(Math.random() * 7) + 1;
  let c = Math.floor(Math.random() * 7) + 1;
  if (a === c) c = (c % 7) + 1;
  setReels(a, b, c);
}

function setOniReels(a, b, c, { spinning = false, gold = false } = {}) {
  [a, b, c].forEach((v, i) => {
    const el = oniReels[i];
    if (!el) return;
    el.textContent = v;
    const sz = i === 1 ? 'text-[56px] sm:text-[74px] translate-y-2' : 'text-[72px] sm:text-[92px]';
    const col = gold ? 'oni-num-gold' : (typeof v === 'number' && v % 2 === 1 ? 'oni-num-odd' : 'oni-num-even');
    el.className = `oni-big-num ${col} ${sz}${spinning ? ' oni-reel-spin' : ''}`;
  });
}
function randomOniMissReels(spinning = false) {
  const a = Math.floor(Math.random() * 8) + 1, b = Math.floor(Math.random() * 8) + 1;
  let c = Math.floor(Math.random() * 8) + 1;
  if (a === c) c = (c % 8) + 1;
  setOniReels(a, b, c, { spinning });
}

function updateReserveSlots(mode = 'NORMAL', special = null) {
  if (mode === 'BRAIN') {
    reserveLabel.textContent = '文字保留';
    ['脳', 'が', '震', 'え', 'る'].forEach((ch, i) => {
      const el = resSlots[i];
      el.classList.remove('hidden');
      if (special === 'HANDS' && i === 0) {
        el.textContent = '手';
        el.className = 'w-8 h-8 rounded-full border-2 border-fuchsia-300 bg-gradient-to-br from-purple-700 to-fuchsia-950 flex items-center justify-center text-xs font-black text-fuchsia-100 shadow-lg shadow-fuchsia-500/80 animate-pulse';
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
      el.className = 'w-8 h-8 rounded-full border-2 border-amber-900/80 bg-black/75 flex items-center justify-center text-[10px] font-black text-amber-200/60';
    }
  }
}

function updateRes4Dots(activeCount) {
  res4Dots.forEach((dot, i) => {
    dot.className = i < activeCount
      ? 'res4-dot w-1.5 h-1.5 rounded-full bg-amber-400 border border-yellow-100 shadow'
      : 'res4-dot w-1.5 h-1.5 rounded-full bg-slate-800 border border-slate-600';
  });
}

function clearIwakanEffects() {
  lcdFrame.classList.remove('iwakan-mono', 'iwakan-rempuru', 'shake-weak', 'shake-mid', 'fx-rgb-glitch');
  oniLamp.classList.remove('iwakan-rempuru', 'lamp-rem-slow', 'lamp-rem-classic');
  if (hudRushRemain) hudRushRemain.classList.remove('iwakan-fade-remain');
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
  lampStatusText.className = 'text-[10px] font-black text-amber-200 min-w-[56px] text-right whitespace-nowrap';
  syncRushStages();
}

function triggerLamp(type, label) {
  oniLamp.classList.remove('lamp-red', 'lamp-rem', 'lamp-rainbow', 'lamp-rem-slow', 'lamp-rem-classic');
  void oniLamp.offsetWidth;
  if (type === 'red') { oniLamp.classList.add('lamp-red'); setLed('red'); }
  else if (type === 'rem') { oniLamp.classList.add('lamp-rem'); setLed('rem'); }
  else if (type === 'rainbow') { oniLamp.classList.add('lamp-rainbow'); setLed('rainbow'); }

  lampStatusText.textContent = label;
  lampStatusText.className = type === 'red'
    ? 'text-[10px] font-black text-rose-400 min-w-[56px] text-right whitespace-nowrap'
    : type === 'rem' ? 'text-[10px] font-black text-sky-300 min-w-[56px] text-right whitespace-nowrap'
    : 'text-[10px] font-black text-amber-300 min-w-[56px] text-right whitespace-nowrap';

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

function fireRainbowBurst(lampLabel = '🌈 大当り!!') {
  fireGlobalRainbowFlash();
  setAmbientBg('rainbow');
  setSunburst(true);
  triggerLamp('rainbow', lampLabel);
  lcdFrame.classList.add('fx-rainbow', 'shake-burst');
  setLed('rainbow');
  FxCanvas.spawnRing('#fde047', 320, 9);
  FxCanvas.spawnRing('#38bdf8', 250, 7);
  FxCanvas.burstRainbow(82);
  setTimeout(() => lcdFrame.classList.remove('shake-burst'), 720);
}

// -------------------------------------------------------------------------
// 7. 物理破壊・画面ぶっ飛び演出
// -------------------------------------------------------------------------
function firePhysicalSplitSlash() {
  const beam = document.createElement('div'); beam.className = 'slash-beam';
  const pL = document.createElement('div'); pL.className = 'split-panel-left';
  const pR = document.createElement('div'); pR.className = 'split-panel-right';
  slashHost.appendChild(pL); slashHost.appendChild(pR); slashHost.appendChild(beam);
  fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fde047', 340, 10); FxCanvas.spawnRing('#ef4444', 270, 8);
  FxCanvas.spawnLightning('#fde047', 5); FxCanvas.burstRainbow(72); FxCanvas.burstFlames(40);
  setTimeout(() => { beam.remove(); pL.remove(); pR.remove(); }, 820);
}

function fireDropCrash(fakeTitle = '') {
  const panel = document.createElement('div'); panel.className = 'drop-crash-panel';
  panel.innerHTML = `<div class="text-2xl sm:text-3xl font-black text-slate-200">${fakeTitle}</div>`;
  slashHost.appendChild(panel);
  setPageMegaShake(true); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#fde047', 360, 11); FxCanvas.burstRainbow(78);
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
  FxCanvas.spawnLightning('#fde047', 6); FxCanvas.spawnLightning('#38bdf8', 4); FxCanvas.burstRainbow(85);
  setTimeout(() => { nodes.forEach(n => n.remove()); lcdFrame.classList.remove('fx-rgb-glitch'); setPageMegaShake(false); }, 880);
}

function fireMegaQuakeBrainBreak() {
  setPageMegaShake(true); lcdFrame.classList.add('fx-rgb-glitch'); fireGlobalRainbowFlash();
  FxCanvas.spawnRing('#ef4444', 360, 12); FxCanvas.spawnRing('#fde047', 290, 9);
  FxCanvas.spawnLightning('#fde047', 7); FxCanvas.burstRainbow(82); FxCanvas.burstFlames(55);
  setTimeout(() => { lcdFrame.classList.remove('fx-rgb-glitch'); setPageMegaShake(false); }, 1050);
}

// -------------------------------------------------------------------------
// 8. 🧠 脳が震えるRUSH 4層制御（完全中央固定・0:常駐→Lv1〜5一発進化）
// -------------------------------------------------------------------------
function fireBrainEvoFlash() {
  brainEvoFlash.classList.remove('flash-fire');
  void brainEvoFlash.offsetWidth;
  brainEvoFlash.classList.add('flash-fire');
}

function setBrainPeteLevel(lv = 0, { withFlash = false } = {}) {
  const src = Assets.getPeteFrame(lv);
  if (!src) return;
  const idx = Math.max(0, Math.min(5, lv));
  const prevSlot = brainPeteSlot;
  const nextSlot = 1 - brainPeteSlot;
  const prevPos = brainPetePositions[prevSlot];
  const nextPos = brainPetePositions[nextSlot];
  const prevImg = brainPeteImgs[prevSlot];
  const nextImg = brainPeteImgs[nextSlot];

  if (withFlash) fireBrainEvoFlash();

  nextImg.src = src;
  nextPos.className = 'brain-pete-pos' + (idx >= 4 ? ' pete-cover-pos' : '');
  nextImg.className = 'brain-pete-img' + (idx >= 4 ? ' pete-cover-img' : '');
  void nextImg.offsetWidth;

  prevPos.classList.remove('pete-shown');
  prevImg.classList.remove('pete-breath', 'pete-punch');
  nextPos.classList.add('pete-shown');
  nextImg.classList.add(idx === 0 ? 'pete-breath' : 'pete-punch');
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
    const el = document.createElement('div');
    el.className = cls; el.textContent = word;
    el.style.left = it.x; el.style.top = it.y; el.style.fontSize = `${it.sz}px`;
    el.style.setProperty('--rot', it.rot); el.style.setProperty('--sc', it.sc);
    el.style.animationDelay = `${idx * 0.025}s, ${0.18 + idx * 0.025}s`;
    brainTextSwarm.appendChild(el);
  });
}

async function playBrainModeSequence({ isHit, is6000, bonusType, isHands = false, custOchiburu = true, forceTargetLv = null, token }) {
  brainRushStage.classList.remove('hidden');
  const isShakeReserve = isHit && Math.random() < 0.16;

  let targetLv;
  if (forceTargetLv !== null) targetLv = forceTargetLv;
  else if (isHit) targetLv = is6000 ? (Math.random() < 0.68 ? 5 : 4) : (Math.random() < 0.40 ? 5 : Math.random() < 0.78 ? 4 : 3);
  else {
    const r = Math.random();
    targetLv = r < 0.36 ? 1 : r < 0.68 ? 2 : r < 0.90 ? 3 : 4;
  }

  // 実機準拠：通常ペテから直接目標Lvへ進化、またはLv1から1回だけ跳ぶ（2段階進化なし）
  const doJumpFrom1 = (targetLv >= 3) && (Math.random() < 0.45);
  const isButtonGa = (isHit && is6000 && Math.random() < 0.45);

  updateReserveSlots('BRAIN', isHands ? 'HANDS' : isShakeReserve ? 'HIT' : 'NOGA');
  if (isHands) FxCanvas.spawnPurpleHands(30);

  if (doJumpFrom1) {
    setBrainPeteLevel(1, { withFlash: true });
    setBrainTextSwarm(1, { isGoldButtonGa: false });
    setBrainButtonState('weak', 'purple');
    StudioAudio.playSoftHeartbeat();
    await wait(440, token);
  }

  setBrainPeteLevel(targetLv, { withFlash: true });
  setBrainTextSwarm(targetLv, { isGoldButtonGa: isButtonGa });
  setBrainButtonState(targetLv >= 4 ? 'mid' : 'weak', isButtonGa ? 'gold' : targetLv >= 4 ? 'red' : 'purple');
  FxCanvas.spawnLightning(isButtonGa ? '#fde047' : '#e879f9', targetLv >= 4 ? 5 : 2);

  if (targetLv >= 3) {
    lcdFrame.classList.add('shake-weak');
    StudioAudio.playSoftHeartbeat();
  }
  await wait(targetLv >= 4 ? 660 : 520, token);
  lcdFrame.classList.remove('shake-weak');

  if (!isHit) {
    setBrainTextSwarm(0);
    setBrainButtonState('idle');
    setBrainPeteLevel(0, { withFlash: false });
    updateReserveSlots('BRAIN', null);
    return { triggeredOchiburu: false, note: '' };
  }

  updateReserveSlots('BRAIN', 'HIT');
  let triggeredOchiburu = false;
  let note = isButtonGa ? '「ボタンが」震える' : (targetLv === 5 ? '脳が煽りLv5' : '');

  if (is6000 && Math.random() < (custOchiburu ? 0.60 : 0.30)) {
    triggeredOchiburu = true;
    note = note || '脳が震える・強';
    BgmEngine.cut();
    setBrainPeteLevel(5, { withFlash: true });
    setBrainTextSwarm(5, { isGoldButtonGa: true, customWord: '脳が震える!!' });
    setBrainButtonState('max', 'rainbow');
    StudioAudio.playOchiburu(true);
    lcdFrame.classList.add('shake-intense', 'fx-rainbow');
    setAmbientBg('rainbow'); setSunburst(true);
    triggerLamp('rainbow', '6,000!!');
    FxCanvas.spawnLightning('#fde047', 6); FxCanvas.burstRainbow(55);
    await wait(1450, token);
    lcdFrame.classList.remove('shake-intense');
  } else if (bonusType === 'BONUS_1500' || is6000) {
    note = note || '脳が震える・中';
    if (targetLv < 4) setBrainPeteLevel(4, { withFlash: true });
    setBrainTextSwarm(4, { isGoldButtonGa: false, customWord: '脳が震える!' });
    setBrainButtonState('mid', 'red');
    lcdFrame.classList.add('shake-mid', 'fx-gold');
    try { if (navigator && navigator.vibrate) navigator.vibrate([70, 30, 70, 30, 120]); } catch (e) {}
    StudioAudio.playSoftHeartbeat();
    FxCanvas.spawnRing('#e879f9', 280, 8);
    await wait(620, token);
    lcdFrame.classList.remove('shake-mid');
  } else {
    note = note || '脳が震える・弱';
    setBrainTextSwarm(3, { isGoldButtonGa: false, customWord: '脳が震える…' });
    setBrainButtonState('weak', 'purple');
    lcdFrame.classList.add('shake-weak');
    try { if (navigator && navigator.vibrate) navigator.vibrate([45, 35, 65]); } catch (e) {}
    await wait(520, token);
    lcdFrame.classList.remove('shake-weak');
  }

  setBrainTextSwarm(0);
  setBrainButtonState('idle');
  return { triggeredOchiburu, note };
}

// -------------------------------------------------------------------------
// 9. 💙 レム告知モード：ツノ白熱発光＋レインボー輪郭オーラ＆同時ポキュ↑ーン↓
// -------------------------------------------------------------------------
function setRemLampVisual(mode = 'idle') {
  remLampImg.className = '';
  void remLampImg.offsetWidth;
  if (mode === 'lit') {
    remLampImg.className = 'rem-img-lit';
    remHornGlow.classList.add('horn-on');
  } else if (mode === 'slow') {
    remLampImg.className = 'rem-img-slow';
    setTimeout(() => { if (!remRushStage.classList.contains('hidden')) remHornGlow.classList.add('horn-on'); }, 550);
  } else if (mode === 'rainbow') {
    remLampImg.className = 'rem-img-rainbow';
    remHornGlow.classList.add('horn-on');
  } else if (mode === 'strobe') {
    remLampImg.className = 'rem-img-strobe';
    remHornGlow.classList.add('horn-on');
  } else {
    remLampImg.className = 'rem-img-idle';
    remHornGlow.classList.remove('horn-on');
  }
}

async function playRemNoticePattern({ is6000, forcePat = null, token }) {
  let pat = forcePat || 'NORMAL';
  if (!forcePat && is6000 && Math.random() < 0.75) {
    const p6 = ['SLOW_GLOW', 'DOUBLE_BLINK', 'CLASSIC_FLASH'];
    pat = p6[Math.floor(Math.random() * p6.length)];
  }

  BgmEngine.cut();
  let note = '';
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
}

// -------------------------------------------------------------------------
// 10. 🔥 鬼がかりRUSH：カウントダウン・鬼チャンス目・鬼レム接近6,000
// -------------------------------------------------------------------------
async function playOnigakariCountdown({ isHit, is6000, token }) {
  let seq = ['3', '2', '1', '0'];
  let note = '';
  let isPrem = false;

  if (isHit && is6000 && Math.random() < 0.55) {
    if (Math.random() < 0.5) { seq = ['3', '4', '5', '6']; note = '法則崩れ(3→4→5→6)'; }
    else { seq = ['6', '0', '0', '0']; note = '特殊カウント(6→0→0→0)'; }
    isPrem = true;
  } else if (isHit && Math.random() < 0.35) {
    seq = ['E', 'M', 'I', '!!']; note = '特殊カウント(E→M→I)'; isPrem = true;
  } else if (Math.random() < 0.35) {
    seq = ['1', '2', '3', '0'];
  }

  rushTopBadge.classList.remove('hidden');
  for (let i = 0; i < seq.length; i++) {
    rushTopBadge.textContent = `COUNT [ ${seq[i]} ]`;
    rushTopBadge.className = (isPrem && i >= 1)
      ? 'pointer-events-none absolute top-[54px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-black/95 border border-yellow-200 rainbow-grad-text shadow-lg pop-in whitespace-nowrap'
      : 'pointer-events-none absolute top-[54px] left-1/2 -translate-x-1/2 z-[28] px-3.5 py-0.5 rounded-full text-xs font-black bg-rose-950/95 border border-amber-400 text-amber-200 shadow-lg whitespace-nowrap';
    FxCanvas.spawnRing(isPrem ? '#fde047' : '#ef4444', 180 + i * 35, 5);
    await wait(240, token);
    if (!isHit && i === 2) break;
  }

  if (isHit) {
    // 当選時は巨大図柄をズドンと揃える！（6000濃厚は 7-7-7 または 6-0-0）
    if (is6000) setOniReels(7, 7, 7, { gold: true });
    else {
      const n = [1, 3, 5, 2, 4][Math.floor(Math.random() * 5)];
      setOniReels(n, n, n, { gold: n % 2 === 1 });
    }
  }
  rushTopBadge.classList.add('hidden');
  return isHit ? note : '';
}

// ★鬼がかりRUSH限定：鬼レム接近 → 6,000直撃!!★
async function playOniRemApproach6000(token) {
  BgmEngine.cut();
  oniRushStage.classList.remove('hidden');
  setOniReels(6, 0, 0, { gold: true });
  if (Assets.getRemLamp()) {
    oniRemApproachWrap.classList.remove('hidden');
    oniRemApproachImg.className = 'max-h-[92%] max-w-[92%] object-contain oni-rem-approach';
  }
  StudioAudio.playOchiburu(true);
  setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
  triggerLamp('rainbow', '鬼レム接近!!');
  FxCanvas.spawnLightning('#fde047', 6);
  FxCanvas.burstRainbow(78);
  await wait(1250, token);
  oniRemApproachWrap.classList.add('hidden');
  await runSuddenOchiburu6000({ sub: '鬼レム覚醒', skipAlarm: true, token });
}

// -------------------------------------------------------------------------
// 11. 違和感演出（全10種・無音違和感でBGM切断！）
// -------------------------------------------------------------------------
async function playIwakanEffect({ is6000, rushMode, token }) {
  const commonPool = ['LED_ONE_OFF', 'LED_ALL_OFF', 'MONO_SCREEN', 'FADE_REMAIN', 'REM_PURU', 'GLITCH_BLINK', 'HIDDEN_REM', 'BGM_SILENT'];
  const pool = is6000 ? [...commonPool, 'COUNT_6000', 'RAINBOW_GLINT'] : commonPool;
  const pick = pool[Math.floor(Math.random() * pool.length)];

  const baseLed = rushMode === 'brain' ? 'brain' : rushMode === 'rem' ? 'rem' : 'red';
  let label = '';

  switch (pick) {
    case 'LED_ONE_OFF':
      label = 'サイドLED片側消灯';
      Math.random() < 0.5 ? setLedSide('off', baseLed) : setLedSide(baseLed, 'off');
      await wait(900, token);
      break;
    case 'LED_ALL_OFF':
      label = 'サイドLED全消灯';
      setLed('off'); await wait(900, token);
      break;
    case 'MONO_SCREEN':
      label = '液晶モノクロ化';
      lcdFrame.classList.add('iwakan-mono'); await wait(880, token);
      lcdFrame.classList.remove('iwakan-mono');
      break;
    case 'FADE_REMAIN':
      label = '残り回数消失';
      if (hudRushRemain) hudRushRemain.classList.add('iwakan-fade-remain');
      await wait(940, token);
      if (hudRushRemain) hudRushRemain.classList.remove('iwakan-fade-remain');
      break;
    case 'REM_PURU':
      label = 'レムぷる';
      oniLamp.classList.add('iwakan-rempuru'); lcdFrame.classList.add('iwakan-rempuru');
      try { if (navigator && navigator.vibrate) navigator.vibrate([30, 40, 30, 40, 30]); } catch (e) {}
      await wait(900, token);
      oniLamp.classList.remove('iwakan-rempuru'); lcdFrame.classList.remove('iwakan-rempuru');
      break;
    case 'GLITCH_BLINK':
      label = '映像ノイズ停止';
      rushNoiseVeil.classList.remove('hidden'); lcdFrame.classList.add('fx-glitch');
      await wait(240, token);
      lcdFrame.classList.remove('fx-glitch'); rushNoiseVeil.classList.add('hidden');
      await wait(620, token);
      break;
    case 'HIDDEN_REM':
      label = '隠レム出現';
      hiddenRemBadge.classList.remove('hidden'); await wait(960, token);
      hiddenRemBadge.classList.add('hidden');
      break;
    case 'BGM_SILENT':
      label = 'BGM無音停止';
      BgmEngine.cut();
      await wait(960, token);
      break;
    case 'COUNT_6000':
      label = '残り回数「6000」変化';
      if (hudRushRemain) {
        const orig = hudRushRemain.textContent;
        hudRushRemain.textContent = '6000';
        hudRushRemain.className = 'text-lg sm:text-xl font-black rainbow-grad-text leading-none';
        await wait(1000, token);
        hudRushRemain.textContent = orig;
        hudRushRemain.className = 'text-lg sm:text-xl font-black gold-grad-text leading-none';
      }
      break;
    case 'RAINBOW_GLINT':
      label = 'ランプ一瞬虹点灯';
      oniLamp.classList.add('lamp-rainbow'); await wait(200, token);
      oniLamp.classList.remove('lamp-rainbow'); await wait(740, token);
      break;
  }
  return label;
}

// -------------------------------------------------------------------------
// 12. 神秘×超ド派手レインボー「鬼がかってますね」カットイン
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
      SoftSparkle.start();
      await waitFreeze(680, token);
    } else if (fromBlackout) {
      SoftSparkle.start();
    }

    globalCutinOverlay.className = 'fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center p-3 pointer-events-none overflow-hidden';
    globalCutinOverlay.innerHTML = `
      <div id="mysticPrismRays" class="mystic-prism-rays"></div>
      <div class="relative z-10 w-full max-w-lg flex flex-col items-center gap-3">
        <div id="cutinFrameBox" class="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-white/20 bg-black transition-all duration-1000 ${fromBlackout ? 'cutin-gentle-fade' : ''}">
          ${imgSrc
            ? `<img src="${imgSrc}" alt="鬼がかってますね" class="w-full h-full object-cover">`
            : `<div class="w-full h-full overlay-rainbow flex items-center justify-center"><span class="font-mincho text-4xl font-black text-white">${caption}</span></div>`}
          <div id="cutinShimmerBar" class="hidden prism-shimmer-bar"></div>
        </div>
        <div id="cutinCapText" class="font-mincho text-2xl sm:text-3xl font-black rainbow-grad-text tracking-widest drop-shadow-[0_2px_18px_rgba(255,255,255,0.6)] transition-opacity duration-1000 ${fromBlackout ? 'opacity-0' : 'opacity-100 pop-in'}">${caption}</div>
      </div>
    `;
    globalCutinOverlay.classList.remove('hidden');

    if (fromBlackout) {
      await waitFreeze(1450, token);
      const rays = document.getElementById('mysticPrismRays');
      const box = document.getElementById('cutinFrameBox');
      const shimmer = document.getElementById('cutinShimmerBar');
      const cap = document.getElementById('cutinCapText');
      if (rays) rays.classList.add('rays-on');
      if (box) box.classList.add('border-4', 'mystic-halo-frame');
      if (shimmer) shimmer.classList.remove('hidden');
      if (cap) cap.classList.replace('opacity-0', 'opacity-100');
      if (withPokyun) StudioAudio.playPokyun(true);
      setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
      await waitFreeze(Math.max(2100, dur - 1450), token);
    } else {
      const rays = document.getElementById('mysticPrismRays');
      const box = document.getElementById('cutinFrameBox');
      const shimmer = document.getElementById('cutinShimmerBar');
      if (rays) rays.classList.add('rays-on');
      if (box) box.classList.add('border-4', 'mystic-halo-frame');
      if (shimmer) shimmer.classList.remove('hidden');
      if (withPokyun) StudioAudio.playPokyun(true);
      fireGlobalRainbowFlash(); setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
      await waitFreeze(dur, token);
    }
  } finally {
    SoftSparkle.stop();
    hideGlobalCutin();
  }
}

// -------------------------------------------------------------------------
// 13. モード別専用大当たり画面テーマ適用 ＆ 新サプライズ演出群
// -------------------------------------------------------------------------
function applyBonusModeTheme(rushMode, { isDespair = false, is6000 = false } = {}) {
  lcdFrame.classList.remove('mode-despair-bg', 'fx-gold', 'fx-rainbow', 'bonus-theme-brain', 'bonus-theme-rem');
  if (isDespair) {
    lcdFrame.classList.add('mode-despair-bg');
    return { titleCls: 'text-3xl sm:text-4xl font-black text-slate-200 pop-in', subCls: 'text-[11px] font-black tracking-[0.18em] text-slate-400 mb-1' };
  }
  if (is6000) {
    lcdFrame.classList.add('fx-rainbow');
    return { titleCls: 'text-3xl sm:text-4xl font-black rainbow-grad-text pop-in', subCls: 'text-[11px] font-black tracking-[0.18em] text-amber-300 mb-1' };
  }
  if (rushMode === 'brain') {
    lcdFrame.classList.add('bonus-theme-brain');
    return { titleCls: 'text-3xl sm:text-4xl font-black purple-grad-text pop-in', subCls: 'text-[11px] font-black tracking-[0.18em] text-fuchsia-300 mb-1' };
  }
  if (rushMode === 'rem') {
    lcdFrame.classList.add('bonus-theme-rem');
    return { titleCls: 'text-3xl sm:text-4xl font-black cyan-grad-text pop-in', subCls: 'text-[11px] font-black tracking-[0.18em] text-sky-300 mb-1' };
  }
  lcdFrame.classList.add('fx-gold');
  return { titleCls: 'text-3xl sm:text-4xl font-black gold-grad-text pop-in', subCls: 'text-[11px] font-black tracking-[0.18em] text-amber-300 mb-1' };
}

// ★新サプライズ：出玉カウントアップ突破 6,000（1,500 → 3,000 → 4,500 → 6,000!!）★
async function runCountUpBreak6000({ rushMode = 'onigakari', iwakanAnswer = '', token }) {
  try {
    BgmEngine.cut();
    setActiveScene('bonus');
    hideIwakanAnswer();
    const th = applyBonusModeTheme(rushMode, { isDespair: false });
    StudioAudio.play1500Jackpot(true);
    FxCanvas.burstGold(34);

    bonusSubLabel.className = th.subCls;
    bonusSubLabel.textContent = rushMode === 'brain' ? '脳が震えるBONUS' : rushMode === 'rem' ? '鬼化レムBONUS' : '鬼がかりBONUS';
    bonusMainTitle.className = th.titleCls;
    bonusMainTitle.textContent = '獲得出玉';
    bonusCountNum.classList.remove('hidden');
    bonusCountNum.className = 'mt-1 text-5xl sm:text-6xl font-black gold-grad-text tracking-tight leading-none pop-in';
    bonusCountNum.textContent = '1,500';
    bonusDesc.textContent = '払出 1,500個…';
    if (iwakanAnswer) showIwakanAnswer(iwakanAnswer, false);

    const waitRes = await waitInterruptible(1150, token);
    if (waitRes === 'OK_INTERRUPT') {
      await runSuddenOchiburu6000({ sub: '限界突破!!', token });
      return;
    }

    // 1,500が震え出して限界突破開始!!
    StudioAudio.playSoftHeartbeat();
    lcdFrame.classList.add('shake-mid');
    bonusDesc.textContent = '止まらない…!!';
    await wait(520, token);

    const steps = [
      { val: '3,000', snd: () => StudioAudio.playKyuin(), desc: '限界突破 3,000!!', color: '#facc15' },
      { val: '4,500', snd: () => StudioAudio.playPokyun(true), desc: 'さらに上乗せ 4,500!!', color: '#38bdf8' }
    ];
    for (const st of steps) {
      st.snd();
      bonusCountNum.className = 'mt-1 text-5xl sm:text-6xl font-black rainbow-grad-text tracking-tight leading-none count-break-pop';
      bonusCountNum.textContent = st.val;
      bonusDesc.textContent = st.desc;
      FxCanvas.spawnRing(st.color, 300, 9);
      FxCanvas.burstRainbow(42);
      await wait(680, token);
    }

    // 6,000 到達＆落ちブル警報＋虹爆発!!
    lcdFrame.classList.remove('shake-mid');
    StudioAudio.playOchiburu(true);
    StudioAudio.playSlash();
    fireShatterFly();
    setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
    triggerLamp('rainbow', '6,000!!');
    showFullscreenOverlay({
      mode: 'rainbow',
      sub: '限界突破',
      main: '超・鬼がかり 6,000 BONUS!!',
      extra: '1,500 → 3,000 → 4,500 → 6,000個（実質純増 5,600発）!!'
    });
    await wait(1100, token);
    StudioAudio.play6000Fanfare(false);
    FxCanvas.burstRainbow(85);
    await wait(2150, token);
  } finally {
    bonusCountNum.classList.add('hidden');
    clearGlobalChaosEffects();
    hideFullscreenOverlay();
  }
}

// ★新サプライズ：リザルト画面からの「死に戻り強制復活」★
async function runResultRevivalSequence(token) {
  try {
    BgmEngine.cut();
    StudioAudio.playPuchun();
    FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setLed('off'); setAmbientBg(''); setSunburst(false);
    setGlobalBlackout(true);
    await waitFreeze(1100, token);
    setGlobalBlackout(false);

    // 画面巻き戻し＋「死に戻り」テキスト
    StudioAudio.playReStart();
    showFullscreenOverlay({
      mode: 'blackout',
      sub: 'RETURN BY DEATH',
      main: '……まだ、終わっていない',
      extra: '',
      scanlines: true
    });
    lcdFrame.classList.add('fx-restart');
    await wait(950, token);
    lcdFrame.classList.remove('fx-restart');

    // botan.jpg がせり上がって落下激震→虹ポキュ↑ーン↓!!
    showUniversalBotan({ label: '死に戻り復活!!', vibe: 'max', color: 'rainbow', drop: true });
    StudioAudio.playOchiburu(true);
    setPageMegaShake(true);
    await wait(1050, token);
    setPageMegaShake(false);
    hideUniversalBotan();

    StudioAudio.playPokyun(true);
    StudioAudio.playSlash();
    firePhysicalSplitSlash();
    setAmbientBg('rainbow'); setSunburst(true); setLed('rainbow');
    triggerLamp('rainbow', '死に戻り復活!!');
    showFullscreenOverlay({
      mode: 'rainbow',
      sub: '死に戻り復活',
      main: '超・鬼がかり 6,000 BONUS!!',
      extra: '絶望からの奇跡の逆転!! 払出 6,000個（純増 5,600発）＋ ST144回復活!!'
    });
    await wait(850, token);
    StudioAudio.play6000Fanfare(false);
    await wait(2200, token);
  } finally {
    clearGlobalChaosEffects();
    hideFullscreenOverlay();
  }
}

async function runWhale3000Direct(token) {
  try {
    BgmEngine.cut();
    setAmbientBg('rainbow'); setSunburst(true); fireGlobalRainbowFlash();
    StudioAudio.playSlash(); fireShatterFly();
    showFullscreenOverlay({
      mode: 'rainbow', sub: '白鯨討伐', main: '鬼がかり 3,000 BONUS!!',
      extra: '払出 3,000個（純増 2,800発）＋ 鬼がかりRUSH直行!!'
    });
    StudioAudio.play3000Jackpot();
    triggerLamp('rainbow', '3,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
    await wait(2300, token);
    lcdFrame.classList.remove('shake-burst');
  } finally {
    clearGlobalChaosEffects(); hideFullscreenOverlay();
  }
}

async function runSuddenOchiburu6000({ sub = '鬼がかりRUSH', extra = '払出 6,000個（実質純増 5,600発）獲得!!', skipAlarm = false, token }) {
  try {
    BgmEngine.cut();
    if (!skipAlarm) StudioAudio.playOchiburu(true);
    setAmbientBg('rainbow'); setSunburst(true); setPageMegaShake(true); fireGlobalRainbowFlash();
    triggerLamp('rainbow', '6,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-intense'); setLed('rainbow');
    FxCanvas.spawnLightning('#fde047', 6); FxCanvas.burstRainbow(85);
    showFullscreenOverlay({ mode: 'rainbow', sub, main: '超・鬼がかり 6,000 BONUS!!', extra });
    await wait(skipAlarm ? 300 : 1250, token);
    setPageMegaShake(false); lcdFrame.classList.remove('shake-intense');
    StudioAudio.play6000Fanfare(false); FxCanvas.burstRainbow(70);
    await wait(2150, token);
  } finally {
    clearGlobalChaosEffects(); hideFullscreenOverlay();
  }
}

async function runSudden3sFreeze6000(token) {
  try {
    BgmEngine.cut();
    StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setLed('off'); setAmbientBg(''); setSunburst(false);

    // 2.3秒完全ブラックアウト → 残り0.7秒からサラサラキラキラ先行フェードイン
    setGlobalBlackout(true);
    await waitFreeze(2300, token);
    SoftSparkle.start();
    await waitFreeze(700, token);

    await playOnigakariImageCutin({
      caption: '鬼がかってますね', dur: 3800, withPokyun: true,
      fromBlackout: true, sparklePreStarted: true, token
    });
    setGlobalBlackout(false);

    StudioAudio.playSlash(); StudioAudio.playOchiburu(false); fireShatterFly();
    setAmbientBg('rainbow'); setSunburst(true);
    showFullscreenOverlay({
      mode: 'rainbow', sub: '鬼がかってますね', main: '超・鬼がかり 6,000 BONUS!!',
      extra: '払出 6,000個（実質純増 5,600発）獲得!!'
    });
    StudioAudio.play6000Fanfare(false); triggerLamp('rainbow', '6,000!!');
    lcdFrame.classList.add('fx-rainbow'); setLed('rainbow');
    await wait(2300, token);
  } finally {
    clearGlobalChaosEffects(); hideFullscreenOverlay();
  }
}

// -------------------------------------------------------------------------
// 14. 昇格シーケンス（ネタバレゼロ・答え合わせ枠・OK割り込み・botan一撃昇格追加）
// -------------------------------------------------------------------------
async function runGoldenPromotionSequence({
  fakeSub, fakeTitle, fakeDesc, fakeStyle = 'despair', fakeRestart = false,
  fakeIsRush = false, fakeBurstGold = false, rushMode = 'onigakari',
  iwakanAnswer = '',
  finalSub, finalTitle, finalExtra, finalSound = '6000',
  crashType = 'auto', token
}) {
  let mode = crashType;
  let useRareWhisper = false;

  if (mode === 'whisper') {
    useRareWhisper = true;
    const pool = ['slash', 'drop', 'shatter', 'quake', 'botan'];
    mode = pool[Math.floor(Math.random() * pool.length)];
  } else if (mode === 'auto') {
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
      const pool = ['slash', 'drop', 'shatter', 'quake', 'botan'];
      mode = pool[Math.floor(Math.random() * pool.length)];
      if (Math.random() < 0.30) useRareWhisper = true;
    }
  }

  try {
    BgmEngine.cut();
    setActiveScene('bonus');
    hideIwakanAnswer();

    if (fakeRestart) {
      StudioAudio.playReStart();
      lcdFrame.classList.add('fx-restart', 'mode-despair-bg');
      bonusSubLabel.className = 'text-[11px] font-black tracking-[0.18em] text-slate-400 mb-1';
      bonusMainTitle.className = 'text-3xl sm:text-4xl font-black text-slate-200 tracking-tight leading-tight pop-in';
    } else {
      StudioAudio.play1500Jackpot(fakeIsRush);
      const th = applyBonusModeTheme(rushMode, { isDespair: fakeStyle === 'despair' });
      bonusSubLabel.className = th.subCls;
      bonusMainTitle.className = th.titleCls;
      if (fakeBurstGold) FxCanvas.burstGold(34);
    }

    bonusSubLabel.textContent = fakeSub;
    bonusMainTitle.textContent = fakeTitle;
    bonusDesc.textContent = fakeDesc;

    if (iwakanAnswer && !useRareWhisper) showIwakanAnswer(iwakanAnswer, false);

    const waitRes = await waitInterruptible(1300, token);
    lcdFrame.classList.remove('fx-restart');

    // OK裏ボタン割り込み昇格
    if (waitRes === 'OK_INTERRUPT') {
      StudioAudio.playSlash(); StudioAudio.playOchiburu(true); firePhysicalSplitSlash();
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, extra: finalExtra });
      triggerLamp('rainbow', '6,000!!'); lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(1100, token);
      StudioAudio.play6000Fanfare(false);
      await wait(2000, token);
      lcdFrame.classList.remove('shake-burst');
      return;
    }

    // 分岐A：油断撃ち抜き虹ポキュ↑ーン↓
    if (mode === 'pokyun') {
      StudioAudio.playPokyun(true); StudioAudio.playOchiburu(true); fireGlobalRainbowFlash();
      setAmbientBg('rainbow'); setSunburst(true); triggerLamp('rainbow', 'ポキュ↑ーン↓!!');
      lcdFrame.classList.remove('mode-despair-bg'); lcdFrame.classList.add('fx-rainbow', 'shake-burst');
      FxCanvas.burstRainbow(72);
      showFullscreenOverlay({ mode: 'rainbow', sub: fakeRestart ? 'Re:Start' : finalSub, main: 'ポキュ↑ーン↓!!', extra: '' });
      await wait(1250, token);
      lcdFrame.classList.remove('shake-burst');
      StudioAudio.playSlash(); firePhysicalSplitSlash();
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, extra: finalExtra });
      StudioAudio.play6000Fanfare(false); triggerLamp('rainbow', '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(2200, token);
      lcdFrame.classList.remove('shake-burst');
      return;
    }

    // 分岐B：botan.jpg せり上がり一撃落下昇格!!
    if (mode === 'botan') {
      showUniversalBotan({ label: '一撃昇格!!', vibe: 'max', color: 'rainbow', drop: true });
      StudioAudio.playOchiburu(true);
      setPageMegaShake(true);
      await wait(1050, token);
      setPageMegaShake(false);
      hideUniversalBotan();
      StudioAudio.playSlash(); fireShatterFly();
      setAmbientBg('rainbow'); setSunburst(true);
      showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, extra: finalExtra });
      triggerLamp('rainbow', finalSound === '3000' ? '3,000!!' : '6,000!!');
      lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');
      await wait(260, token);
      if (finalSound === '3000') StudioAudio.play3000Jackpot();
      else StudioAudio.play6000Fanfare(false);
      await wait(2150, token);
      lcdFrame.classList.remove('shake-burst');
      return;
    }

    // レア枠「これから脳が震える…」
    if (useRareWhisper) {
      StudioAudio.playSoftHeartbeat();
      showIwakanAnswer('これから脳が震える…', true);
      await wait(1250, token);
    }

    // 無音フリーズ（残響プチュン）
    StudioAudio.playPuchun(); FxCanvas.setAmbient('none'); FxCanvas.clearAll();
    setLed('off'); setAmbientBg(''); setSunburst(false);
    lcdFrame.classList.remove('fx-gold', 'fx-rainbow', 'mode-despair-bg', 'bonus-theme-brain', 'bonus-theme-rem');

    if (mode === 'freeze3s') {
      setGlobalBlackout(true);
      await waitFreeze(2300, token);
      SoftSparkle.start();
      await waitFreeze(700, token);
      await playOnigakariImageCutin({
        caption: '鬼がかってますね', dur: 3800, withPokyun: true,
        fromBlackout: true, sparklePreStarted: true, token
      });
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
    else if (mode === 'shatter' || mode === 'freeze3s') fireShatterFly();
    else if (mode === 'quake') fireMegaQuakeBrainBreak();
    else firePhysicalSplitSlash();

    setAmbientBg('rainbow'); setSunburst(true);
    showFullscreenOverlay({ mode: 'rainbow', sub: finalSub, main: finalTitle, extra: finalExtra });
    triggerLamp('rainbow', finalSound === '3000' ? '3,000!!' : '6,000!!');
    lcdFrame.classList.add('fx-rainbow', 'shake-burst'); setLed('rainbow');

    await wait(mode === 'freeze3s' ? 150 : 950, token);
    if (finalSound === '3000') StudioAudio.play3000Jackpot();
    else StudioAudio.play6000Fanfare(false);

    await wait(2150, token);
    lcdFrame.classList.remove('shake-burst');
  } finally {
    clearGlobalChaosEffects(); hideFullscreenOverlay();
  }
}
