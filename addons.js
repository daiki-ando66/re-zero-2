// =========================================================================
// addons.js (v4.3) :
//  1. ヘッダー整理（試聴・音・BGM・スピードを「⚙️ 設定」モーダルへ完全移設）
//  2. 大当たり画面のロゴサイズ・余白調整＆違和感答え合わせ枠を右上へ移設（文字被りゼロ）
//  3. レム告知の重複pt表示を撤去＆スマホ1画面に全操作ボタンが収まるようスリム化
//  4. 単体ロゴ（oni_rush / oni_6000：jpg/png/webp全対応）＆レム点灯時数字消去
//  5. 実機図柄法則＆PCスペース長押しハンドル（演出時自動停止・Oキー裏OK）
// =========================================================================
(function initV43Pack() {
  // -----------------------------------------------------------------------
  // 1. 単体ロゴ oni_rush / oni_6000 の高画質白透過＆Assets差し替え
  // -----------------------------------------------------------------------
  const customLogos = { oniRush: null, oni6000: null };

  function cleanSingleCutout(img, maxDim = 920, softAura = false) {
    try {
      const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
      c.drawImage(img, 0, 0, w, h);

      const imgData = c.getImageData(0, 0, w, h);
      const d = imgData.data;
      const total = w * h;
      const visited = new Uint8Array(total);
      const thresh = softAura ? 228 : 230;
      const isBg = (idx) => {
        const p = idx * 4;
        const r = d[p], g = d[p + 1], b = d[p + 2];
        return r > thresh && g > thresh && b > thresh && (Math.max(r, g, b) - Math.min(r, g, b)) < (softAura ? 32 : 24);
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

      const passes = softAura ? 3 : 1;
      for (let pass = 0; pass < passes; pass++) {
        const snap = new Uint8Array(total);
        for (let i = 0; i < total; i++) snap[i] = d[i * 4 + 3];
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (snap[idx] === 0) continue;
            if (snap[idx - 1] < 180 || snap[idx + 1] < 180 || snap[idx - w] < 180 || snap[idx + w] < 180) {
              const p = idx * 4;
              const minC = Math.min(d[p], d[p + 1], d[p + 2]);
              const lum = (d[p] + d[p + 1] + d[p + 2]) / 3;
              if (lum > 200 && minC > 180) d[p + 3] = 0;
              else if (minC > 165) d[p + 3] = Math.min(d[p + 3], Math.round(((255 - minC) / 90) * 240));
              else if (pass === 0) d[p + 3] = Math.min(d[p + 3], 215);
            }
          }
        }
      }
      c.putImageData(imgData, 0, 0);

      let minX = w, minY = h, maxX = -1, maxY = -1;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (d[(y * w + x) * 4 + 3] > 24) {
            if (x < minX) minX = x; if (x > maxX) maxX = x;
            if (y < minY) minY = y; if (y > maxY) maxY = y;
          }
        }
      }
      if (maxX >= minX && maxY >= minY) {
        const pad = 4;
        minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
        maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad);
        const out = document.createElement('canvas');
        out.width = maxX - minX + 1; out.height = maxY - minY + 1;
        out.getContext('2d').drawImage(cv, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
        return out.toDataURL('image/png');
      }
      return cv.toDataURL('image/png');
    } catch (e) {
      return img.src;
    }
  }

  function tryLoadLogo(candidates, key, softAura) {
    let i = 0;
    function next() {
      if (i >= candidates.length) return;
      const src = candidates[i++];
      const img = new Image();
      img.onload = () => { customLogos[key] = cleanSingleCutout(img, 920, softAura); };
      img.onerror = next;
      img.src = src + '?v=' + Date.now();
    }
    next();
  }

  tryLoadLogo(['oni_rush.jpg', 'oni_rush.png', 'oni_rush.webp', 'onigakarirush.webp', 'onigakari_rush.jpg'], 'oniRush', false);
  tryLoadLogo(['oni_6000.jpg', 'oni_6000.png', 'oni_6000.webp', 'onigakari6000.webp', 'onigakari_6000.jpg'], 'oni6000', true);

  if (typeof Assets !== 'undefined' && typeof Assets.getLogo === 'function') {
    const _origGetLogo = Assets.getLogo;
    Assets.getLogo = function (key) {
      if (key === 'oniRush') return customLogos.oniRush || null;
      if (key === 'oni6000') return customLogos.oni6000 || null;
      return _origGetLogo(key);
    };
  }

  // -----------------------------------------------------------------------
  // 2. レム点灯時の前面数字消去＆終了後の光りっぱなし防止
  // -----------------------------------------------------------------------
  function setRemDigitsHidden(hidden) {
    const layer = document.getElementById('remDigitsLayer');
    if (!layer) return;
    layer.style.opacity = hidden ? '0' : '1';
    layer.style.visibility = hidden ? 'hidden' : 'visible';
    layer.classList.remove('rem-digits-dim');
    if (!hidden) {
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
    setRemDigitsHidden(true);

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
      setRemDigitsHidden(false);
    }
  };

  if (typeof window.setRemLampVisual === 'function') {
    const _origSetRemLamp = window.setRemLampVisual;
    window.setRemLampVisual = function (mode = 'idle') {
      _origSetRemLamp(mode);
      if (mode === 'idle') setRemDigitsHidden(false);
    };
  }

  // -----------------------------------------------------------------------
  // 3. 実機図柄法則（偶数=300 / 1・5=1500 / 3・7=6000濃厚 / 予告あり+偶数=6000昇格濃厚）
  // -----------------------------------------------------------------------
  if (typeof window.buildNormalScenario === 'function') {
    const _origBuildNormal = window.buildNormalScenario;
    window.buildNormalScenario = function (res) {
      const sc = _origBuildNormal(res);
      if (sc.is3000) sc.tenpaiNum = 7;
      else if (sc.hesoType === '1500_RUSH') sc.tenpaiNum = [1, 3, 5][Math.floor(Math.random() * 3)];
      else sc.tenpaiNum = [2, 4, 6, 8][Math.floor(Math.random() * 4)];
      return sc;
    };
  }

  function pickRushRuleDigit(bonusType, hadNotice = false) {
    const evens = [2, 4, 6, 8];
    if (bonusType === 'BONUS_300') return evens[Math.floor(Math.random() * evens.length)];
    if (bonusType === 'BONUS_1500') return Math.random() < 0.5 ? 1 : 5;
    if (hadNotice && Math.random() < 0.28) return evens[Math.floor(Math.random() * evens.length)];
    if (Math.random() < 0.55) return 7;
    if (Math.random() < 0.82) return 3;
    return Math.random() < 0.5 ? 1 : 5;
  }

  window.playOniTotsuAtariPause = async function ({ is6000, token, hadNotice = false }) {
    BgmEngine.cut();
    const bType = (state.pendingRushHit && state.pendingRushHit.type) || (is6000 ? 'BONUS_6000' : 'BONUS_1500');
    const winDig = pickRushRuleDigit(bType, hadNotice);
    setOniReels(winDig, winDig, winDig, { spinning: false, hitLock: true });

    StudioAudio.playSoftHeartbeat();
    const ringCol = (winDig === 7 || winDig === 3) ? '#fde047' : (winDig % 2 === 1 ? '#fb7185' : '#38bdf8');
    FxCanvas.spawnRing(ringCol, 260, 8);
    await wait(550, token);

    if (winDig === 7 || winDig === 3) {
      StudioAudio.playPokyun(true); FxCanvas.burstRainbow(64);
    } else {
      StudioAudio.playKyuin(); FxCanvas.burstGold(52);
    }
    await wait(340, token);
  };

  window.playOnigakariCountdown = async function ({ isHit, is6000, token }) {
    let seq = ['3', '2', '1', '0'], note = '', isPrem = false;
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
    rushTopBadge.classList.add('hidden');
    if (isHit) await playOniTotsuAtariPause({ is6000, token, hadNotice: true });
    return isHit ? note : '';
  };

  // -----------------------------------------------------------------------
  // 4. CSS最適化（大当たり文字被りゼロ・レムpt撤去・スマホ1画面完結）
  // -----------------------------------------------------------------------
  if (!document.getElementById('v43-layout-css')) {
    const st = document.createElement('style');
    st.id = 'v43-layout-css';
    st.textContent = `
      /* 設定モーダル内では通常・RUSHカスタム＆チューナーを常時表示 */
      #settingsModalBody #normalCustomPanel,
      #settingsModalBody #rushExtraCustomRow {
        display: grid !important;
      }
      #settingsModalBody #slotQuickButtons button {
        width: 100%;
        padding-top: 8px; padding-bottom: 8px;
        font-size: 11px;
      }

      /* 大当たり画面：ロゴと文字が絶対に被らず・見切れないサイズ設計 */
      #scene-bonus {
        padding-top: 2px !important;
        padding-bottom: 2px !important;
        gap: 2px;
      }
      #scene-bonus .bonus-logo-img {
        max-height: 104px !important;
        max-width: 78% !important;
      }
      @media (min-width: 640px) {
        #scene-bonus .bonus-logo-img {
          max-height: 136px !important;
        }
      }
      #scene-bonus #bonusSubLabel {
        font-size: 10px !important;
        margin-bottom: 0 !important;
      }
      #scene-bonus #bonusMainTitle {
        font-size: 1.35rem !important;
        line-height: 1.15 !important;
      }
      @media (min-width: 640px) {
        #scene-bonus #bonusMainTitle {
          font-size: 1.75rem !important;
        }
      }
      #scene-bonus #bonusDesc {
        margin-top: 2px !important;
        font-size: 11px !important;
        line-height: 1.25 !important;
      }

      /* 違和感答え合わせ枠：右上へ移設して下の文字と100%分離！ */
      #subtleWhisperSlot {
        top: 2px !important;
        right: 4px !important;
        bottom: auto !important;
        padding: 2px 8px !important;
      }

      /* レム告知モード：重複していた左下ptを撤去＆図柄位置を整える */
      #remBottomPtBar { display: none !important; }
      #remDigitsLayer { bottom: 44px !important; }

      /* スマホ1画面完結：縦余白を詰めて操作ボタン全体を表示 */
      #playModeContainer { gap: 6px !important; }
      #rushStatusBar { padding-top: 5px !important; padding-bottom: 5px !important; }
      #rushControls button, #normalControls button {
        padding-top: 9px !important;
        padding-bottom: 9px !important;
      }
      @media (max-width: 639px) {
        #lcdFrame { height: 326px !important; padding: 10px 12px !important; }
      }
      @media (min-width: 640px) {
        #lcdFrame { height: 382px !important; }
      }
    `;
    document.head.appendChild(st);
  }

  // -----------------------------------------------------------------------
  // 5. ヘッダー整理（試聴・音・BGM・スピードをすべて「⚙️ 設定」モーダルへ移設）
  // -----------------------------------------------------------------------
  const testBtn = document.getElementById('btnTestPromo');
  const pokyunBtn = document.getElementById('btnTestPokyun');
  const tunerBtn = document.getElementById('btnToggleTuner');
  const bgmBtn = document.getElementById('btnToggleBgm');
  const speedBtn = document.getElementById('btnSpeedToggle');
  const tunerDrawer = document.getElementById('audioTunerDrawer');

  if (testBtn && !document.getElementById('btnOpenSettings')) {
    const setBtn = document.createElement('button');
    setBtn.id = 'btnOpenSettings';
    setBtn.className = 'px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-slate-900 hover:bg-slate-800 text-amber-200 border border-amber-500/70 active:scale-95 transition';
    setBtn.textContent = '⚙️ 設定';
    testBtn.parentElement.appendChild(setBtn);

    const modal = document.createElement('div');
    modal.id = 'settingsModal';
    modal.className = 'hidden fixed inset-0 z-[900] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto';
    modal.innerHTML = `
      <div class="w-full max-w-md my-auto rounded-3xl bg-gradient-to-b from-[#2a1008] via-[#18080a] to-[#0c0406] border-2 border-amber-500/75 p-4 shadow-2xl space-y-3">
        <div class="flex items-center justify-between border-b border-amber-800/60 pb-2">
          <h3 class="text-sm font-black text-amber-300">⚙️ 設定・サウンド・カスタム</h3>
          <button id="btnCloseSettings" class="px-2.5 py-1 rounded-lg text-[11px] font-black bg-black/60 text-amber-200 border border-amber-700/70 active:scale-95">閉じる</button>
        </div>
        <div id="settingsModalBody" class="space-y-3">
          <div class="space-y-1.5">
            <div class="text-[10px] font-black text-emerald-300/90">サウンド・スピード</div>
            <div id="slotQuickButtons" class="grid grid-cols-3 gap-1.5"></div>
            <div id="slotAudioTuner" class="pt-1"></div>
          </div>
          <div class="space-y-1.5">
            <div class="text-[10px] font-black text-amber-200/80">通常時カスタム</div>
            <div id="slotNormalCustom"></div>
          </div>
          <div class="space-y-1.5">
            <div class="text-[10px] font-black text-fuchsia-300/90">RUSH中カスタム</div>
            <div id="slotRushCustom"></div>
          </div>
          <div class="space-y-1.5">
            <div class="text-[10px] font-black text-cyan-300/90">回転率・交換率・戦績</div>
            <div id="slotMachineStats"></div>
          </div>
          <div class="rounded-xl bg-black/55 border border-amber-800/50 p-2.5 text-[10px] text-amber-100/85 space-y-1">
            <div class="font-black text-amber-300">⌨️ PCキーボード操作</div>
            <div>・<strong>Space単押し</strong>：1回転 ／ <strong>長押し</strong>：連続回転（演出発生で自動停止）</div>
            <div>・<strong>リーチ中Space</strong>：PUSHジャッジ ／ <strong>Oキー</strong>：裏OKボタン</div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // ヘッダーにあった4ボタン＆チューナー本体を設定モーダル内へ綺麗に収容
    const quickBox = document.getElementById('slotQuickButtons');
    if (pokyunBtn) quickBox.appendChild(pokyunBtn);
    if (bgmBtn) quickBox.appendChild(bgmBtn);
    if (speedBtn) quickBox.appendChild(speedBtn);
    if (tunerBtn) tunerBtn.classList.add('hidden'); // チューナーは設定内に直接表示するのでトグル不要

    if (tunerDrawer) {
      tunerDrawer.classList.remove('hidden', 'border-t', 'bg-[#1b0a07]/98');
      tunerDrawer.classList.add('rounded-xl', 'bg-black/50', 'border', 'border-amber-800/50');
      document.getElementById('slotAudioTuner').appendChild(tunerDrawer);
    }

    const normalCustom = document.getElementById('normalCustomPanel');
    const rushExtra = document.getElementById('rushExtraCustomRow');
    const rushModePanel = document.getElementById('rushCustomPanel');
    const customSection = normalCustom ? normalCustom.closest('section') : null;
    const statsSection = document.getElementById('rotRateSlider') ? document.getElementById('rotRateSlider').closest('section') : null;

    if (normalCustom) document.getElementById('slotNormalCustom').appendChild(normalCustom);
    if (rushExtra) {
      rushExtra.classList.remove('mt-1.5', 'pt-1.5', 'border-t', 'border-amber-900/60');
      document.getElementById('slotRushCustom').appendChild(rushExtra);
    }
    if (statsSection) document.getElementById('slotMachineStats').appendChild(statsSection);

    if (customSection && rushModePanel) {
      const syncSlimBar = () => {
        const inRush = !rushModePanel.classList.contains('hidden');
        customSection.classList.toggle('hidden', !inRush);
      };
      const obs = new MutationObserver(syncSlimBar);
      obs.observe(rushModePanel, { attributes: true, attributeFilter: ['class'] });
      syncSlimBar();
    }

    setBtn.addEventListener('click', () => modal.classList.remove('hidden'));
    document.getElementById('btnCloseSettings').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
  }

  // -----------------------------------------------------------------------
  // 6. PCキーボード「スペース長押しハンドル」＆「Oキー裏OK」
  // -----------------------------------------------------------------------
  let spaceDown = false;
  let spaceHoldDelay = null;
  let spaceHoldLoop = null;
  let spaceLockedUntilRelease = false;

  function stopSpaceHandle(lockUntilUp = false) {
    if (spaceHoldDelay) { clearTimeout(spaceHoldDelay); spaceHoldDelay = null; }
    if (spaceHoldLoop) { clearInterval(spaceHoldLoop); spaceHoldLoop = null; }
    if (lockUntilUp) spaceLockedUntilRelease = true;
    if (typeof state !== 'undefined') {
      if (state.phase === 'NORMAL' && !state.autoMode && typeof randomMissReels === 'function') randomMissReels();
      else if (state.phase === 'RUSH' && !state.autoMode) {
        if (state.rushMode === 'onigakari' && typeof randomOniMissReels === 'function') randomOniMissReels(false);
        else if (state.rushMode === 'rem' && typeof randomRemMissReels === 'function') randomRemMissReels(false);
      }
    }
  }

  function stepHandleSpin(isContinuous) {
    if (typeof state === 'undefined') return;
    if (!document.getElementById('resultModal').classList.contains('hidden')) { stopSpaceHandle(true); return; }
    if (document.getElementById('settingsModal') && !document.getElementById('settingsModal').classList.contains('hidden')) { stopSpaceHandle(true); return; }

    if (state.phase === 'NORMAL') {
      stopAuto();
      const res = drawNormalSpin();
      if (res.bareType || res.isHit) {
        stopSpaceHandle(true);
        startNormalReach(res);
      } else {
        clearVisualEffects(); setActiveScene('normal');
        if (isContinuous) {
          setReels(Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, Math.floor(Math.random()*8)+1, { spinning: [true, true, true] });
          normalTitle.textContent = `${state.currentSpin} 回転`;
          normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
          normalSub.textContent = 'Space長押し連続回転中…（演出で自動停止）';
        } else {
          randomMissReels();
          normalTitle.textContent = `${state.currentSpin} 回転`;
          normalTitle.className = 'text-2xl sm:text-3xl font-black text-white';
          normalSub.textContent = '通常変動中…（Space長押しで連続回転）';
        }
        updateStatsUI();
      }
      return;
    }

    if (state.phase === 'RUSH') {
      stopAuto();
      const ev = spinRushOnce();
      if (!ev) { stopSpaceHandle(true); return; }
      if (isContinuous) {
        if (state.rushMode === 'onigakari') randomOniMissReels(true);
        else if (state.rushMode === 'rem') randomRemMissReels(true);
      }
      if (ev.type !== 'MISS' || ev.teaser) stopSpaceHandle(true);
      handleRushEvent(ev, { fromAuto: false });
      return;
    }

    stopSpaceHandle(true);
  }

  window.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.code === 'KeyO' && !e.repeat) {
      const okBtn = document.getElementById('btnSecretOk');
      if (okBtn) okBtn.click();
      return;
    }

    if (e.code !== 'Space') return;
    e.preventDefault();
    if (e.repeat || spaceDown || spaceLockedUntilRelease) return;
    spaceDown = true;

    if (typeof state !== 'undefined' && state.phase === 'REACH') {
      const pushBtn = document.getElementById('btnOniPush');
      if (pushBtn && !document.getElementById('pushButtonArea').classList.contains('hidden')) {
        spaceLockedUntilRelease = true;
        pushBtn.click();
      }
      return;
    }

    stepHandleSpin(false);
    if (!spaceLockedUntilRelease) {
      spaceHoldDelay = setTimeout(() => {
        if (!spaceDown || spaceLockedUntilRelease) return;
        spaceHoldLoop = setInterval(() => {
          if (!spaceDown || spaceLockedUntilRelease) { stopSpaceHandle(false); return; }
          stepHandleSpin(true);
        }, 62);
      }, 220);
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code !== 'Space') return;
    spaceDown = false; spaceLockedUntilRelease = false; stopSpaceHandle(false);
  });

  window.addEventListener('blur', () => {
    spaceDown = false; spaceLockedUntilRelease = false; stopSpaceHandle(false);
  });
})();
