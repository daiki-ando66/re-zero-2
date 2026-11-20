// =========================================================================
// addons.js (v1) : 鬼化レムランプ役物（白背景自動透過）＆暗転フェードイン進化
// =========================================================================
(function initAddonsV1() {
  // 1. 追加演出用CSSを自動注入
  if (!document.getElementById('addons-v1-css')) {
    const st = document.createElement('style');
    st.id = 'addons-v1-css';
    st.textContent = `
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
      }
      #remLampImg {
        max-height: 96%;
        max-width: 96%;
        object-fit: contain;
        transition: filter 0.22s ease, opacity 0.25s ease, transform 0.28s ease;
        will-change: filter, opacity, transform;
      }

      /* 待機中（消灯：暗い筐体にうっすら浮かぶ役物） */
      .rem-img-idle {
        opacity: 0.24;
        filter: brightness(0.22) saturate(0.25) contrast(1.25);
        transform: scale(0.96);
      }

      /* 通常点灯（パッと水色爆光） */
      .rem-img-lit {
        opacity: 1 !important;
        filter: brightness(1.22) saturate(1.35) drop-shadow(0 0 18px rgba(56,189,248,0.98)) drop-shadow(0 0 42px rgba(14,165,233,0.9)) !important;
        transform: scale(1.04) !important;
      }

      /* 徐々に点灯（6000濃厚：暗闇から1.2秒かけてじわ〜っと覚醒） */
      @keyframes remImgSlowWake {
        0%   { opacity: 0.22; filter: brightness(0.22) saturate(0.25); transform: scale(0.96); }
        55%  { opacity: 0.85; filter: brightness(0.95) saturate(1.15) drop-shadow(0 0 18px rgba(56,189,248,0.85)); transform: scale(1.01); }
        100% { opacity: 1; filter: brightness(1.35) saturate(1.45) drop-shadow(0 0 24px rgba(250,204,21,0.98)) drop-shadow(0 0 54px rgba(56,189,248,0.95)); transform: scale(1.07); }
      }
      .rem-img-slow {
        animation: remImgSlowWake 1.2s ease-in forwards !important;
      }

      /* 虹覚醒（6000濃厚フィニッシュ） */
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

      /* 旧レム風ストロボフラッシュ（6000濃厚） */
      @keyframes remImgStrobe {
        0%, 100% { opacity: 1; filter: brightness(1.85) saturate(1.3) drop-shadow(0 0 34px rgba(224,242,254,1)) drop-shadow(0 0 65px rgba(56,189,248,1)); transform: scale(1.08); }
        50%      { opacity: 0.28; filter: brightness(0.35) saturate(0.4); transform: scale(0.98); }
      }
      .rem-img-strobe {
        animation: remImgStrobe 0.13s steps(2) infinite !important;
      }

      /* 暗転のまま「鬼がかってますね」じわっとフェードイン */
      @keyframes darkFadeInCutin {
        0%   { opacity: 0; transform: scale(0.96); filter: brightness(0.35); }
        42%  { opacity: 1; transform: scale(1.00); filter: brightness(1.06); }
        100% { opacity: 1; transform: scale(1.05); filter: brightness(1.08); }
      }
      .cutin-dark-fade {
        animation: darkFadeInCutin 2.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
    `;
    document.head.appendChild(st);
  }

  // 2. 鬼化レム画像（rem_lamp.jpg）の読み込み＆外側の白背景だけ自動透過処理
  //    ※四隅からBFSで繋がる白領域だけを抜くため、メイド服の白は100%残ります
  let remLampTransparentUrl = null;

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
      for (let x = 0; x < w; x++) {
        queue.push(x);
        queue.push((h - 1) * w + x);
      }
      for (let y = 1; y < h - 1; y++) {
        queue.push(y * w);
        queue.push(y * w + (w - 1));
      }

      let head = 0;
      while (head < queue.length) {
        const idx = queue[head++];
        if (visited[idx]) continue;
        visited[idx] = 1;
        if (!isWhiteBg(idx)) continue;

        d[idx * 4 + 3] = 0; // 透明化
        const x = idx % w;
        const y = (idx - x) / w;
        if (x > 0 && !visited[idx - 1]) queue.push(idx - 1);
        if (x < w - 1 && !visited[idx + 1]) queue.push(idx + 1);
        if (y > 0 && !visited[idx - w]) queue.push(idx - w);
        if (y < h - 1 && !visited[idx + w]) queue.push(idx + w);
      }

      // 境界の白いフチを1pxだけソフトに馴染ませる
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const idx = y * w + x;
          const p = idx * 4;
          if (d[p + 3] > 0) {
            const hasTransNeighbor =
              d[(idx - 1) * 4 + 3] === 0 || d[(idx + 1) * 4 + 3] === 0 ||
              d[(idx - w) * 4 + 3] === 0 || d[(idx + w) * 4 + 3] === 0;
            if (hasTransNeighbor && d[p] > 215 && d[p + 1] > 215 && d[p + 2] > 215) {
              d[p + 3] = 95;
            }
          }
        }
      }

      c.putImageData(imgData, 0, 0);
      return cv.toDataURL('image/png');
    } catch (e) {
      return img.src;
    }
  }

  // 液晶内に鬼化レム役物ステージを配置
  const remLampStage = document.createElement('div');
  remLampStage.id = 'remLampStage';
  remLampStage.className = 'hidden';
  const remLampImg = document.createElement('img');
  remLampImg.id = 'remLampImg';
  remLampImg.alt = 'レムランプ';
  remLampImg.className = 'rem-img-idle';
  remLampStage.appendChild(remLampImg);
  lcdFrame.insertBefore(remLampStage, lcdFrame.firstChild);

  function setRemLampVisual(mode) {
    if (!remLampTransparentUrl) {
      remLampStage.classList.add('hidden');
      return;
    }
    if (!mode || mode === 'hidden') {
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

  // rem_lamp.jpg を事前ロード＆自動透過
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
        if (typeof state !== 'undefined' && state.phase === 'RUSH' && state.rushMode === 'rem') {
          setRemLampVisual('idle');
        }
      };
      img.onerror = next;
      img.src = src;
    }
    next();
  })();

  // 3. RUSH見た目更新・エフェクトリセットに鬼化レム役物の表示切替をフック
  const _origApplyRushModeVisuals = window.applyRushModeVisuals;
  window.applyRushModeVisuals = function () {
    _origApplyRushModeVisuals();
    if (state.phase === 'RUSH' && state.rushMode === 'rem') {
      setRemLampVisual('idle');
    } else {
      setRemLampVisual('hidden');
    }
  };

  const _origClearVisualEffects = window.clearVisualEffects;
  window.clearVisualEffects = function () {
    _origClearVisualEffects();
    if (typeof state !== 'undefined' && state.phase === 'RUSH' && state.rushMode === 'rem') {
      setRemLampVisual('idle');
    } else {
      setRemLampVisual('hidden');
    }
  };

  // 4. レム告知パターン4種を「鬼化レム画像ランプ発光」へアップグレード
  window.playRemNoticePattern = async function ({ is6000, forcePat = null, token }) {
    let pat = forcePat || 'NORMAL';
    if (!forcePat && is6000 && Math.random() < 0.75) {
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

  // 5. ★暗転のまま「鬼がかってますね」じわっとフェードイン進化★
  window.playOnigakariImageCutin = async function ({
    caption = '鬼がかってますね',
    dur = 3000,
    withPokyun = true,
    fromBlackout = false,
    token
  }) {
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
        // 漆黒のままじわっと浮かび上がってから、虹オーラ＆ポキュ↑ーン↓が弾ける！
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
      StudioAudio.playPuchun();
      FxCanvas.setAmbient('none');
      FxCanvas.clearAll();
      setLed('off');
      setAmbientBg('');
      setSunburst(false);

      // 3秒間の完全ブラックアウト
      setGlobalBlackout(true);
      await waitFreeze(3000, token);

      // 暗転を解かず、そのまま漆黒の中で「鬼がかってますね」をじわっとフェードイン！
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

  // 6. テストメニューに「💙 鬼化レムランプ点灯」ボタンを自動追加（4パターン順番に確認可）
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
        state.phase = prevPhase;
        clearVisualEffects();
        setActiveScene(prevScene);
        if (prevPhase === 'RUSH') {
          applyRushModeVisuals();
          setControlMode('RUSH');
        } else {
          FxCanvas.setAmbient('ember');
          setControlMode('NORMAL');
        }
      }
    });
  }
})();
