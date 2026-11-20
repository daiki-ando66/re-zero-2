// =========================================================================
// sound.js (v3.0) : Web Audio API 爆音サウンドエンジン
// ・先バレ音（ポキュ↑ーン↓）＆場面別大当たり音：確定神設定を完全維持
// ・新・落ちブル警報ロングトーン：490Hz→980Hz高重心チューニング焼き込み
// ・暗転用プチュン：さりげない電源断＋2.2秒ホールリバーブ残響仕様
// =========================================================================
const AUDIO_DEFAULTS = {
  reverbWet: 0.44,
  peakBright: 0.73,
  downBend: 1.15,
  poEmphasis: 1.60,
  grit: 1.15,
  volume: 0.80
};

const LAB_JP_BASE = {
  grit: 95,
  kyuin: 105,
  brass: 110,
  sub: 115,
  pitch: 1.00,
  tempo: 1.05
};

const LAB_OB_BASE = {
  drop: 120,
  speed: 28,
  rattle: 110,
  growl: 120,
  dur: 1.3
};

// 新・落ちブル警報ロングトーン確定神設定（高重心チューニング）
const ALARM_OB_SETTINGS = {
  baseHz: 490,
  hold1: 0.60,
  glide: 0.38,
  hold2: 2.00,
  grit: 140,
  physScale: 0.80
};

const StudioAudio = (() => {
  let ctx = null, masterGain = null, dryBus = null;
  let gritShaper = null, gritBus = null;
  let wetSend = null, wetGain = null, delaySend = null, noiseBuffer = null;

  let jpDryBus = null, jpWetSend = null, jpSaturation = null, jpLowShelf = null, jpHighShelf = null;
  let obOutBus = null;

  const params = { ...AUDIO_DEFAULTS, muted: false };

  function createSoftClipCurve(drive = 10) {
    const n = 44100, curve = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = Math.tanh(x * (1 + drive * 0.14));
    }
    return curve;
  }

  function createGritCurve(gritLevel = 1.15) {
    const n = 44100, curve = new Float32Array(n);
    const drive = 1.2 + gritLevel * 7.5;
    const asym = 0.14 * gritLevel;
    const clipThresh = Math.max(0.38, 0.92 - gritLevel * 0.28);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = Math.tanh((x + asym * x * x) * drive);
      if (y > clipThresh) y = clipThresh + (y - clipThresh) * 0.22;
      else if (y < -clipThresh) y = -clipThresh + (y + clipThresh) * 0.28;
      curve[i] = y / Math.max(0.52, clipThresh + 0.12);
    }
    return curve;
  }

  function makeLabGritCurve(gritPct) {
    const g = Math.max(0, gritPct / 100);
    const n = 44100, curve = new Float32Array(n);
    if (g < 0.02) {
      for (let i = 0; i < n; i++) curve[i] = (i * 2) / n - 1;
      return curve;
    }
    const drive = 1.0 + g * 8.5;
    const asym = 0.16 * g;
    const clip = Math.max(0.32, 0.94 - g * 0.36);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      let y = Math.tanh((x + asym * x * x) * drive);
      if (y > clip) y = clip + (y - clip) * 0.18;
      else if (y < -clip) y = -clip + (y + clip) * 0.24;
      curve[i] = y / Math.max(0.48, clip + 0.14);
    }
    return curve;
  }

  function createHallImpulseResponse(audioCtx, duration = 2.2) {
    const sr = audioCtx.sampleRate, length = Math.floor(sr * duration);
    const impulse = audioCtx.createBuffer(2, length, sr);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      [
        { ms: 11, gain: 0.44 }, { ms: 23, gain: 0.34 },
        { ms: 37, gain: 0.26 }, { ms: 53, gain: 0.19 }, { ms: 71, gain: 0.13 }
      ].forEach(tap => {
        const idx = Math.floor((tap.ms / 1000) * sr) + (ch === 1 ? 14 : 0);
        if (idx < length) data[idx] += tap.gain * (0.85 + Math.random() * 0.3);
      });
      let lpState = 0;
      for (let i = 0; i < length; i++) {
        const t = i / sr;
        const env = Math.pow(1 - t / duration, 2.8);
        const alpha = Math.max(0.08, 0.54 - (t / duration) * 0.42);
        lpState += alpha * ((Math.random() * 2 - 1) * env - lpState);
        data[i] += lpState * 0.60;
      }
    }
    return impulse;
  }

  function init() {
    if (params.muted) return null;
    try {
      if (!ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        ctx = new AudioCtx();

        const lowShelf = ctx.createBiquadFilter();
        lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 140; lowShelf.gain.value = 3.0;

        const lowMid = ctx.createBiquadFilter();
        lowMid.type = 'peaking'; lowMid.frequency.value = 260; lowMid.Q.value = 1.0; lowMid.gain.value = 4.5;

        const presence = ctx.createBiquadFilter();
        presence.type = 'peaking'; presence.frequency.value = 3200; presence.Q.value = 1.2; presence.gain.value = 3.0;

        const shaper = ctx.createWaveShaper();
        shaper.curve = createSoftClipCurve(10); shaper.oversample = '2x';

        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -11; comp.knee.value = 14; comp.ratio.value = 6.5;
        comp.attack.value = 0.002; comp.release.value = 0.15;

        masterGain = ctx.createGain();
        masterGain.gain.value = params.volume;

        lowShelf.connect(lowMid); lowMid.connect(presence); presence.connect(shaper);
        shaper.connect(comp); comp.connect(masterGain); masterGain.connect(ctx.destination);

        dryBus = ctx.createGain(); dryBus.gain.value = 0.92; dryBus.connect(lowShelf);

        gritBus = ctx.createGain(); gritBus.gain.value = 1.0;
        gritShaper = ctx.createWaveShaper();
        gritShaper.curve = createGritCurve(params.grit); gritShaper.oversample = '4x';
        const gritLP = ctx.createBiquadFilter(); gritLP.type = 'lowpass'; gritLP.frequency.value = 7800;
        gritBus.connect(gritShaper); gritShaper.connect(gritLP); gritLP.connect(lowShelf);

        wetSend = ctx.createGain(); wetSend.gain.value = 1.0;
        const convolver = ctx.createConvolver();
        convolver.buffer = createHallImpulseResponse(ctx, 2.2);
        const wetHP = ctx.createBiquadFilter(); wetHP.type = 'highpass'; wetHP.frequency.value = 240;
        wetGain = ctx.createGain(); wetGain.gain.value = params.reverbWet * 1.15;
        wetSend.connect(wetHP); wetHP.connect(convolver); convolver.connect(wetGain); wetGain.connect(lowShelf);

        delaySend = ctx.createGain(); delaySend.gain.value = 0.36;
        const dL = ctx.createDelay(0.5); dL.delayTime.value = 0.080;
        const dR = ctx.createDelay(0.5); dR.delayTime.value = 0.122;
        const fbL = ctx.createGain(); fbL.gain.value = 0.22;
        const fbR = ctx.createGain(); fbR.gain.value = 0.22;
        const dHP = ctx.createBiquadFilter(); dHP.type = 'highpass'; dHP.frequency.value = 900;
        const merger = ctx.createChannelMerger(2);
        delaySend.connect(dHP); dHP.connect(dL);
        dL.connect(fbL); fbL.connect(dR); dR.connect(fbR); fbR.connect(dL);
        dL.connect(merger, 0, 0); dR.connect(merger, 0, 1); merger.connect(wetGain);

        jpDryBus = ctx.createGain(); jpDryBus.gain.value = 0.92;
        jpWetSend = ctx.createGain(); jpWetSend.gain.value = 1.0;

        jpSaturation = ctx.createWaveShaper();
        jpSaturation.curve = makeLabGritCurve(LAB_JP_BASE.grit);
        jpSaturation.oversample = '4x';

        jpLowShelf = ctx.createBiquadFilter();
        jpLowShelf.type = 'lowshelf'; jpLowShelf.frequency.value = 115;
        jpLowShelf.gain.value = 2.0 + (LAB_JP_BASE.sub / 100) * 4.5;

        const jpMidPresence = ctx.createBiquadFilter();
        jpMidPresence.type = 'peaking'; jpMidPresence.frequency.value = 2800; jpMidPresence.Q.value = 1.1; jpMidPresence.gain.value = 3.5;

        jpHighShelf = ctx.createBiquadFilter();
        jpHighShelf.type = 'highshelf'; jpHighShelf.frequency.value = 4600;
        jpHighShelf.gain.value = 1.5 + (LAB_JP_BASE.kyuin / 100) * 3.5;

        const jpCompressor = ctx.createDynamicsCompressor();
        jpCompressor.threshold.value = -14; jpCompressor.knee.value = 10; jpCompressor.ratio.value = 8.0;
        jpCompressor.attack.value = 0.002; jpCompressor.release.value = 0.12;

        jpDryBus.connect(jpSaturation);
        jpWetSend.connect(wetSend);
        jpSaturation.connect(jpLowShelf);
        jpLowShelf.connect(jpMidPresence);
        jpMidPresence.connect(jpHighShelf);
        jpHighShelf.connect(jpCompressor);
        jpCompressor.connect(masterGain);

        obOutBus = ctx.createGain(); obOutBus.gain.value = 1.0;
        const obShaper = ctx.createWaveShaper();
        obShaper.curve = makeLabGritCurve(85); obShaper.oversample = '2x';
        const obComp = ctx.createDynamicsCompressor();
        obComp.threshold.value = -10; obComp.ratio.value = 7.5;
        obComp.attack.value = 0.001; obComp.release.value = 0.08;
        const obWetSend = ctx.createGain(); obWetSend.gain.value = 0.18;

        obOutBus.connect(obShaper);
        obShaper.connect(obComp);
        obComp.connect(masterGain);
        obOutBus.connect(obWetSend);
        obWetSend.connect(wetSend);

        const nLen = Math.floor(ctx.sampleRate * 2.0);
        noiseBuffer = ctx.createBuffer(1, nLen, ctx.sampleRate);
        const nd = noiseBuffer.getChannelData(0);
        for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      masterGain.gain.setValueAtTime(params.muted ? 0 : params.volume, ctx.currentTime);
      wetGain.gain.setValueAtTime(params.reverbWet * 1.15, ctx.currentTime);
      return ctx;
    } catch (e) {
      return null;
    }
  }

  function vibrate(pat) {
    try { if (navigator && navigator.vibrate) navigator.vibrate(pat); } catch (e) {}
  }

  // ★ ポッ・キュ↑・ーン↓（確定神設定・一切変更なし）
  function playPokyun(isRainbow = false) {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    const pitch = params.peakBright, fall = params.downBend, poScale = params.poEmphasis, grit = params.grit;

    vibrate(isRainbow ? [95, 30, 120, 30, 220] : [85, 25, 130]);

    const poFilter = c.createBiquadFilter();
    poFilter.type = 'lowpass'; poFilter.Q.setValueAtTime(4.5, now);
    poFilter.frequency.setValueAtTime(900, now);
    poFilter.frequency.exponentialRampToValueAtTime(2400, now + 0.020);
    poFilter.frequency.exponentialRampToValueAtTime(700, now + 0.080);

    const poEnv = c.createGain();
    poEnv.gain.setValueAtTime(0.001, now);
    poEnv.gain.linearRampToValueAtTime(0.95 * Math.min(1.85, poScale), now + 0.003);
    poEnv.gain.exponentialRampToValueAtTime(0.56 * Math.min(1.85, poScale), now + 0.036);
    poEnv.gain.exponentialRampToValueAtTime(0.001, now + 0.085);

    const poTri = c.createOscillator(), poSaw = c.createOscillator();
    poTri.type = 'triangle'; poSaw.type = 'sawtooth';
    [poTri, poSaw].forEach((osc, idx) => {
      const m = idx === 0 ? 1.0 : 1.004;
      osc.frequency.setValueAtTime(320 * pitch * m, now);
      osc.frequency.exponentialRampToValueAtTime(590 * pitch * m, now + 0.024);
      osc.frequency.exponentialRampToValueAtTime(430 * pitch * m, now + 0.078);
    });
    const poSawG = c.createGain(); poSawG.gain.value = 0.36 + grit * 0.34;
    poTri.connect(poFilter); poSaw.connect(poSawG).connect(poFilter);
    poFilter.connect(poEnv); poEnv.connect(dryBus);
    const poGrit = c.createGain(); poGrit.gain.value = 0.25 + grit * 0.35;
    poEnv.connect(poGrit).connect(gritBus);
    const poWet = c.createGain(); poWet.gain.value = 0.16;
    poEnv.connect(poWet).connect(wetSend);
    poTri.start(now); poSaw.start(now); poTri.stop(now + 0.092); poSaw.stop(now + 0.092);

    const subKick = c.createOscillator(), subG = c.createGain();
    subKick.type = 'triangle';
    subKick.frequency.setValueAtTime(135, now); subKick.frequency.exponentialRampToValueAtTime(48, now + 0.075);
    subG.gain.setValueAtTime(0.001, now);
    subG.gain.linearRampToValueAtTime(1.10 * Math.min(1.55, poScale), now + 0.003);
    subG.gain.exponentialRampToValueAtTime(0.001, now + 0.092);
    subKick.connect(subG).connect(gritBus); subKick.start(now); subKick.stop(now + 0.098);

    const clickSrc = c.createBufferSource(); clickSrc.buffer = noiseBuffer;
    const clickBP = c.createBiquadFilter(); clickBP.type = 'bandpass'; clickBP.frequency.value = 2200; clickBP.Q.value = 1.4;
    const clickG = c.createGain();
    clickG.gain.setValueAtTime((0.68 + grit * 0.28) * Math.min(1.6, poScale), now);
    clickG.gain.exponentialRampToValueAtTime(0.001, now + 0.008);
    clickSrc.connect(clickBP).connect(clickG).connect(gritBus); clickSrc.start(now); clickSrc.stop(now + 0.012);

    const t2 = now + 0.068, tApex = now + 0.165, tFallMid = tApex + 0.34, tEnd = now + 1.35;
    const fStart = 620 * pitch, fApex = 2850 * pitch;
    const fMid = Math.max(580 * pitch, fApex * (1 - Math.min(0.58, 0.32 * fall)));
    const fFinal = Math.max(480 * pitch, fApex * (1 - Math.min(0.66, 0.40 * fall)));

    const vibLfo = c.createOscillator(), vibG = c.createGain();
    vibLfo.type = 'sine'; vibLfo.frequency.setValueAtTime(6.5, tApex);
    vibG.gain.setValueAtTime(0.001, t2); vibG.gain.setValueAtTime(0.001, tApex + 0.04);
    vibG.gain.linearRampToValueAtTime(14 * pitch, tFallMid + 0.10);
    vibG.gain.exponentialRampToValueAtTime(2.5, tEnd);
    vibLfo.connect(vibG); vibLfo.start(t2); vibLfo.stop(tEnd + 0.04);

    const leadLP = c.createBiquadFilter(); leadLP.type = 'lowpass'; leadLP.Q.value = 2.4;
    leadLP.frequency.setValueAtTime(2600 * pitch, t2);
    leadLP.frequency.exponentialRampToValueAtTime(6400 * Math.max(0.8, pitch), tApex);
    leadLP.frequency.exponentialRampToValueAtTime(3400 * Math.max(0.8, pitch), tFallMid);
    leadLP.frequency.exponentialRampToValueAtTime(2100 * Math.max(0.8, pitch), tEnd);

    const leadEnv = c.createGain();
    leadEnv.gain.setValueAtTime(0.001, t2);
    leadEnv.gain.linearRampToValueAtTime(0.42, t2 + 0.014);
    leadEnv.gain.linearRampToValueAtTime(0.52, tApex);
    leadEnv.gain.exponentialRampToValueAtTime(0.22, tFallMid);
    leadEnv.gain.exponentialRampToValueAtTime(0.001, tEnd);

    const sawLead = c.createOscillator(), sqLead = c.createOscillator(), fmMod = c.createOscillator();
    const fmG = c.createGain(), sqMix = c.createGain();
    sawLead.type = 'sawtooth'; sqLead.type = 'square'; fmMod.type = 'sawtooth';

    [{ osc: sawLead, m: 1.0 }, { osc: sqLead, m: 1.00405 }, { osc: fmMod, m: 2.005 }].forEach(it => {
      it.osc.frequency.setValueAtTime(fStart * it.m, t2);
      it.osc.frequency.exponentialRampToValueAtTime(fApex * it.m, tApex);
      it.osc.frequency.exponentialRampToValueAtTime(fMid * it.m, tFallMid);
      it.osc.frequency.exponentialRampToValueAtTime(fFinal * it.m, tEnd);
    });

    const fmScale = 0.45 + grit * 1.15;
    fmG.gain.setValueAtTime(220 * pitch * fmScale, t2);
    fmG.gain.exponentialRampToValueAtTime(1650 * pitch * fmScale, tApex);
    fmG.gain.exponentialRampToValueAtTime(340 * pitch * fmScale, tFallMid);
    fmG.gain.exponentialRampToValueAtTime(35 * fmScale, tEnd);
    sqMix.gain.value = 0.42 + grit * 0.25;

    vibG.connect(sawLead.frequency); vibG.connect(sqLead.frequency);
    fmMod.connect(fmG); fmG.connect(sawLead.frequency); fmG.connect(sqLead.frequency);
    sawLead.connect(leadLP); sqLead.connect(sqMix).connect(leadLP);
    leadLP.connect(leadEnv); leadEnv.connect(gritBus);

    const leadDry = c.createGain(); leadDry.gain.value = Math.max(0.15, 0.55 - grit * 0.25);
    leadEnv.connect(leadDry).connect(dryBus);
    const leadWet = c.createGain(); leadWet.gain.value = 1.05;
    leadEnv.connect(leadWet).connect(wetSend);
    leadEnv.connect(delaySend);
    sawLead.start(t2); sqLead.start(t2); fmMod.start(t2);
    sawLead.stop(tEnd + 0.04); sqLead.stop(tEnd + 0.04); fmMod.stop(tEnd + 0.04);

    const subOct = c.createOscillator(), subLP = c.createBiquadFilter(), subEnv = c.createGain();
    subOct.type = 'sawtooth';
    subOct.frequency.setValueAtTime(fStart * 0.5, t2);
    subOct.frequency.exponentialRampToValueAtTime(fApex * 0.5, tApex);
    subOct.frequency.exponentialRampToValueAtTime(fMid * 0.5, tFallMid);
    subOct.frequency.exponentialRampToValueAtTime(fFinal * 0.5, tEnd);
    subLP.type = 'lowpass'; subLP.frequency.value = 1200; subLP.Q.value = 1.6;
    subEnv.gain.setValueAtTime(0.001, t2);
    subEnv.gain.linearRampToValueAtTime(0.34, t2 + 0.018);
    subEnv.gain.linearRampToValueAtTime(0.38, tApex);
    subEnv.gain.exponentialRampToValueAtTime(0.16, tFallMid);
    subEnv.gain.exponentialRampToValueAtTime(0.001, tEnd);
    subOct.connect(subLP).connect(subEnv); subEnv.connect(gritBus); subEnv.connect(dryBus);
    subOct.start(t2); subOct.stop(tEnd + 0.04);

    if (grit > 0.02) {
      const bSrc = c.createBufferSource(); bSrc.buffer = noiseBuffer; bSrc.loop = true;
      const bBP = c.createBiquadFilter(); bBP.type = 'bandpass'; bBP.Q.value = 1.1;
      bBP.frequency.setValueAtTime(4200, t2);
      bBP.frequency.exponentialRampToValueAtTime(6200, tApex);
      bBP.frequency.exponentialRampToValueAtTime(3800, tEnd);
      const bAM = c.createGain(); bAM.gain.value = 0.65;
      const bLfo = c.createOscillator(), bLfoG = c.createGain();
      bLfo.type = 'square'; bLfo.frequency.value = 95; bLfoG.gain.value = 0.35;
      bLfo.connect(bLfoG).connect(bAM.gain);
      const bEnv = c.createGain(), pk = 0.16 * grit;
      bEnv.gain.setValueAtTime(0.001, t2);
      bEnv.gain.linearRampToValueAtTime(pk * 0.85, t2 + 0.018);
      bEnv.gain.linearRampToValueAtTime(pk, tApex);
      bEnv.gain.exponentialRampToValueAtTime(pk * 0.32, tFallMid);
      bEnv.gain.exponentialRampToValueAtTime(0.001, tEnd);
      bSrc.connect(bBP).connect(bAM).connect(bEnv); bEnv.connect(dryBus); bEnv.connect(wetSend);
      bSrc.start(t2); bLfo.start(t2); bSrc.stop(tEnd + 0.04); bLfo.stop(tEnd + 0.04);
    }

    if (isRainbow) {
      [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96].forEach((f, i) => {
        const t = tApex + i * 0.055;
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(0.36, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
        o.connect(g); g.connect(dryBus); g.connect(wetSend);
        o.start(t); o.stop(t + 0.65);
      });
    }
  }

  // =======================================================================
  // 大当たり音合成レイヤー群（変更なし）
  // =======================================================================
  function applyJackpotProfile(prof) {
    if (!ctx) return;
    const now = ctx.currentTime;
    if (jpSaturation) jpSaturation.curve = makeLabGritCurve(prof.grit);
    if (jpLowShelf) jpLowShelf.gain.setTargetAtTime(2.0 + (prof.sub / 100) * 4.5, now, 0.01);
    if (jpHighShelf) jpHighShelf.gain.setTargetAtTime(1.5 + (prof.kyuin / 100) * 3.5, now, 0.01);
  }

  function createLabVoiceBus(targetDry, targetWet, wetRatio = 0.72) {
    const bus = ctx.createGain();
    bus.gain.value = 1.0;
    bus.connect(targetDry);
    if (targetWet) {
      const w = ctx.createGain();
      w.gain.value = wetRatio;
      bus.connect(w).connect(targetWet);
    }
    return bus;
  }

  function layerImpactExplosion(bus, t, prof, power = 1.0) {
    const subScale = (prof.sub / 100) * power;
    const pMul = prof.pitch;

    if (subScale > 0.01) {
      const subOsc = ctx.createOscillator(), subTri = ctx.createOscillator(), subG = ctx.createGain();
      subOsc.type = 'sine'; subTri.type = 'triangle';
      subOsc.frequency.setValueAtTime(170, t); subOsc.frequency.exponentialRampToValueAtTime(36, t + 0.34);
      subTri.frequency.setValueAtTime(175, t); subTri.frequency.exponentialRampToValueAtTime(38, t + 0.28);
      subG.gain.setValueAtTime(0.001, t);
      subG.gain.linearRampToValueAtTime(1.15 * subScale, t + 0.004);
      subG.gain.exponentialRampToValueAtTime(0.001, t + 0.40);
      subOsc.connect(subG); subTri.connect(subG); subG.connect(bus);
      subOsc.start(t); subTri.start(t); subOsc.stop(t + 0.42); subTri.stop(t + 0.42);
    }

    const sq = ctx.createOscillator(), sqG = ctx.createGain();
    sq.type = 'square';
    sq.frequency.setValueAtTime(125 * pMul, t); sq.frequency.exponentialRampToValueAtTime(48 * pMul, t + 0.14);
    sqG.gain.setValueAtTime(0.001, t);
    sqG.gain.linearRampToValueAtTime(0.45 * Math.max(0.3, subScale), t + 0.003);
    sqG.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    sq.connect(sqG).connect(bus); sq.start(t); sq.stop(t + 0.18);

    const crashSrc = ctx.createBufferSource(); crashSrc.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
    bp.frequency.setValueAtTime(4800, t); bp.frequency.exponentialRampToValueAtTime(950, t + 0.40);
    const crashG = ctx.createGain();
    crashG.gain.setValueAtTime(0.001, t);
    crashG.gain.linearRampToValueAtTime(0.95 * power, t + 0.004);
    crashG.gain.exponentialRampToValueAtTime(0.001, t + 0.46);
    crashSrc.connect(bp).connect(crashG).connect(bus); crashSrc.start(t); crashSrc.stop(t + 0.48);

    const car = ctx.createOscillator(), mod = ctx.createOscillator(), modG = ctx.createGain(), env = ctx.createGain();
    car.type = 'sawtooth'; mod.type = 'square';
    car.frequency.setValueAtTime(920 * pMul, t);
    mod.frequency.setValueAtTime(1410 * pMul, t);
    modG.gain.setValueAtTime(1600, t); modG.gain.exponentialRampToValueAtTime(60, t + 0.26);
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.35 * power, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    mod.connect(modG).connect(car.frequency); car.connect(env).connect(bus);
    car.start(t); mod.start(t); car.stop(t + 0.30); mod.stop(t + 0.30);
  }

  function layerSuperSawBrass(bus, t, freq, dur, prof, gainMul = 1.0) {
    const brassScale = (prof.brass / 100) * gainMul;
    if (brassScale <= 0.01) return;

    const f = freq * prof.pitch;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass'; filter.Q.value = 3.2;
    filter.frequency.setValueAtTime(Math.min(12000, f * 1.5), t);
    filter.frequency.exponentialRampToValueAtTime(Math.min(14000, f * 8.2), t + 0.028);
    filter.frequency.exponentialRampToValueAtTime(Math.min(10000, f * 4.0), t + Math.min(dur, 0.28));

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.28 * brassScale, t + 0.014);
    env.gain.setValueAtTime(0.23 * brassScale, t + Math.max(0.03, dur - 0.09));
    env.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.08);
    filter.connect(env).connect(bus);

    [
      { type: 'sawtooth', c: -18, g: 0.25 },
      { type: 'square',   c: -9,  g: 0.20 },
      { type: 'sawtooth', c: 0,   g: 0.28 },
      { type: 'square',   c: 9,   g: 0.20 },
      { type: 'sawtooth', c: 18,  g: 0.25 }
    ].forEach(d => {
      const osc = ctx.createOscillator(), g = ctx.createGain();
      osc.type = d.type; osc.frequency.setValueAtTime(f, t); osc.detune.setValueAtTime(d.c, t);
      g.gain.value = d.g; osc.connect(g).connect(filter);
      osc.start(t); osc.stop(t + dur + 0.10);
    });

    const sub = ctx.createOscillator(), subG = ctx.createGain();
    sub.type = 'sawtooth'; sub.frequency.setValueAtTime(f * 0.5, t);
    subG.gain.value = 0.24 * Math.max(0.4, prof.sub / 100);
    sub.connect(subG).connect(filter); sub.start(t); sub.stop(t + dur + 0.10);
  }

  function layerKyuinSweep(bus, t, startF, endF, dur, prof, gainMul = 1.0) {
    const kScale = (prof.kyuin / 100) * gainMul;
    if (kScale <= 0.01) return;

    const p = prof.pitch;
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), modG = ctx.createGain(), env = ctx.createGain();
    car.type = 'sawtooth'; mod.type = 'triangle';
    car.frequency.setValueAtTime(startF * p, t);
    car.frequency.exponentialRampToValueAtTime(endF * p, t + dur * 0.45);
    car.frequency.exponentialRampToValueAtTime(endF * 0.92 * p, t + dur);

    mod.frequency.setValueAtTime(startF * 2.15 * p, t);
    mod.frequency.exponentialRampToValueAtTime(endF * 2.05 * p, t + dur * 0.45);
    modG.gain.setValueAtTime(1400 * p, t); modG.gain.exponentialRampToValueAtTime(120, t + dur);

    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.30 * kScale, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);

    mod.connect(modG).connect(car.frequency); car.connect(env).connect(bus);
    car.start(t); mod.start(t); car.stop(t + dur + 0.02); mod.stop(t + dur + 0.02);
  }

  function layerArcadeArp(bus, t, freq, dur, prof, gainMul = 1.0) {
    const kScale = (prof.kyuin / 100) * gainMul;
    if (kScale <= 0.01) return;

    const f = freq * prof.pitch;
    const sq = ctx.createOscillator(), bell = ctx.createOscillator(), env = ctx.createGain();
    sq.type = 'square'; bell.type = 'triangle';
    sq.frequency.setValueAtTime(f, t); bell.frequency.setValueAtTime(f * 2.0, t);
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.19 * kScale, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sq.connect(env); bell.connect(env); env.connect(bus);
    sq.start(t); bell.start(t); sq.stop(t + dur + 0.02); bell.stop(t + dur + 0.02);
  }

  function layerSubKick(bus, t, prof, gainMul = 1.0) {
    const sScale = (prof.sub / 100) * gainMul;
    if (sScale <= 0.01) return;

    const osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(132, t); osc.frequency.exponentialRampToValueAtTime(38, t + 0.13);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(0.95 * sScale, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(g).connect(bus); osc.start(t); osc.stop(t + 0.18);
  }

  function layerRisingSiren(bus, t, dur, prof) {
    const p = prof.pitch;
    const osc1 = ctx.createOscillator(), osc2 = ctx.createOscillator();
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(), env = ctx.createGain();
    osc1.type = 'sawtooth'; osc2.type = 'square';
    osc1.frequency.setValueAtTime(420 * p, t); osc1.frequency.exponentialRampToValueAtTime(2600 * p, t + dur);
    osc2.frequency.setValueAtTime(426 * p, t); osc2.frequency.exponentialRampToValueAtTime(2635 * p, t + dur);
    lfo.type = 'square'; lfo.frequency.setValueAtTime(20, t); lfoG.gain.setValueAtTime(90 * p, t);
    lfo.connect(lfoG); lfoG.connect(osc1.frequency); lfoG.connect(osc2.frequency);
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(0.28 * Math.max(0.5, prof.kyuin / 100), t + 0.05);
    env.gain.linearRampToValueAtTime(0.38 * Math.max(0.5, prof.kyuin / 100), t + dur - 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.04);
    osc1.connect(env); osc2.connect(env); env.connect(bus);
    osc1.start(t); osc2.start(t); lfo.start(t);
    osc1.stop(t + dur + 0.06); osc2.stop(t + dur + 0.06); lfo.stop(t + dur + 0.06);
  }

  function play1500Jackpot(isRush = false) {
    const c = init(); if (!c) return;
    const prof = isRush
      ? { grit: 85, kyuin: 125, brass: 105, sub: 95,  pitch: 1.07, tempo: 1.22 }
      : { grit: 72, kyuin: 88,  brass: 92,  sub: 90,  pitch: 0.98, tempo: 1.00 };
    applyJackpotProfile(prof);

    const bus = createLabVoiceBus(jpDryBus, jpWetSend, isRush ? 0.68 : 0.72);
    const now = c.currentTime + 0.01;
    const spd = prof.tempo;
    const step = 0.16 / spd;

    vibrate(isRush ? [75, 25, 75, 25, 160] : [85, 35, 85, 35, 190]);

    layerImpactExplosion(bus, now, prof, isRush ? 0.85 : 0.88);
    layerKyuinSweep(bus, now + 0.02, isRush ? 1550 : 1250, isRush ? 3950 : 3200, 0.22, prof, isRush ? 1.05 : 0.88);
    layerKyuinSweep(bus, now + 0.14 / spd, isRush ? 1850 : 1500, isRush ? 4300 : 3650, 0.24, prof, isRush ? 1.08 : 0.92);

    const prog = [
      { t: 0.05,         notes: [261.63, 392.00], dur: step * (isRush ? 0.82 : 0.9) },
      { t: 0.05 + step,  notes: [293.66, 440.00], dur: step * (isRush ? 0.82 : 0.9) },
      { t: 0.05 + step*2,notes: [329.63, 493.88], dur: step * (isRush ? 0.82 : 0.9) },
      { t: 0.05 + step*3,notes: [392.00, 523.25, 659.25, 783.99], dur: (isRush ? 0.88 : 1.05) / spd }
    ];
    prog.forEach((p, idx) => {
      const at = now + p.t;
      p.notes.forEach(f => layerSuperSawBrass(bus, at, f, p.dur, prof, idx === 3 ? 0.85 : 0.95));
      layerSubKick(bus, at, prof, idx === 3 ? 1.15 : 0.85);
    });

    const arpNotes = [1568, 2093, 2637, 3136, 2637, 3136, 3951, 4186];
    const arpStart = now + 0.05 + step * 3;
    arpNotes.forEach((f, i) => {
      layerArcadeArp(bus, arpStart + i * (0.068 / spd), f, 0.11 / spd, prof, isRush ? 1.05 : 0.85);
    });
    layerKyuinSweep(bus, arpStart + 0.04, isRush ? 2000 : 1700, isRush ? 4600 : 4100, 0.30, prof, isRush ? 1.10 : 0.92);
  }

  function play3000Jackpot() {
    const c = init(); if (!c) return;
    const prof = { grit: 112, kyuin: 110, brass: 128, sub: 132, pitch: 0.96, tempo: 1.02 };
    applyJackpotProfile(prof);

    const bus = createLabVoiceBus(jpDryBus, jpWetSend, 0.78);
    const now = c.currentTime + 0.01;
    const spd = prof.tempo;
    const b = 0.15 / spd;

    vibrate([100, 30, 120, 40, 100, 30, 260]);

    layerImpactExplosion(bus, now, prof, 1.10);
    layerImpactExplosion(bus, now + 0.17 / spd, prof, 1.25);
    layerKyuinSweep(bus, now + 0.02, 1350, 3600, 0.22, prof, 1.0);
    layerKyuinSweep(bus, now + 0.18 / spd, 1650, 4200, 0.26, prof, 1.1);

    const t0 = now + 0.24 / spd;
    const seq = [
      { off: 0,     notes: [293.66, 440.00], dur: b * 0.85 },
      { off: b,     notes: [349.23, 523.25], dur: b * 0.85 },
      { off: b*2,   notes: [392.00, 587.33], dur: b * 0.85 },
      { off: b*3,   notes: [440.00, 659.25], dur: b * 0.90 },
      { off: b*4.2, notes: [440.00, 659.25, 880.00], dur: b * 0.75 },
      { off: b*5.2, notes: [587.33, 739.99, 880.00, 1174.66], dur: 1.35 / spd }
    ];
    seq.forEach((s, idx) => {
      const at = t0 + s.off;
      s.notes.forEach(f => layerSuperSawBrass(bus, at, f, s.dur, prof, idx === 5 ? 0.96 : 1.02));
      layerSubKick(bus, at, prof, idx === 5 ? 1.40 : 1.08);
    });

    const climaxT = t0 + b * 5.2;
    for (let k = 1; k <= 4; k++) layerSubKick(bus, climaxT + k * (0.24 / spd), prof, 1.10);

    const arpSeq = [1175, 1480, 1760, 2349, 2960, 3520, 2960, 3520, 4186, 4698, 3520, 4698];
    arpSeq.forEach((f, i) => layerArcadeArp(bus, climaxT + i * (0.055 / spd), f, 0.12 / spd, prof, 1.05));
    layerKyuinSweep(bus, climaxT, 1700, 4500, 0.30, prof, 1.15);
    layerKyuinSweep(bus, climaxT + 0.24 / spd, 2000, 4800, 0.34, prof, 1.10);
  }

  function play6000Fanfare(isWedding = false) {
    const c = init(); if (!c) return;
    const prof = isWedding
      ? { grit: 125, kyuin: 145, brass: 145, sub: 145, pitch: 1.04, tempo: 1.10 }
      : { grit: 140, kyuin: 140, brass: 140, sub: 142, pitch: 1.00, tempo: 1.12 };
    applyJackpotProfile(prof);

    const bus = createLabVoiceBus(jpDryBus, jpWetSend, isWedding ? 0.90 : 0.84);
    const now = c.currentTime + 0.01;
    const spd = prof.tempo;
    const b = 0.145 / spd;

    vibrate(isWedding ? [120, 30, 120, 30, 120, 30, 400] : [120, 25, 120, 25, 90, 25, 90, 25, 160, 30, 320]);

    layerImpactExplosion(bus, now, prof, 1.38);
    layerKyuinSweep(bus, now + 0.01, 2800, 5200, 0.22, prof, 1.25);

    const sirenDur = 0.56 / spd;
    layerRisingSiren(bus, now + 0.10 / spd, sirenDur, prof);
    for (let r = 0; r < 8; r++) layerSubKick(bus, now + (0.10 + r * 0.068) / spd, prof, 0.90 + r * 0.05);

    const dropT = now + (0.10 + 0.56) / spd;
    layerImpactExplosion(bus, dropT, prof, 1.48);

    const prog = [
      { off: 0,      notes: [329.63, 493.88, 659.25], dur: b * 0.85 },
      { off: b,      notes: [392.00, 587.33, 783.99], dur: b * 0.85 },
      { off: b*2,    notes: [440.00, 659.25, 880.00], dur: b * 0.85 },
      { off: b*3,    notes: [493.88, 739.99, 987.77], dur: b * 0.90 },
      { off: b*4.2,  notes: [659.25, 987.77, 1318.51], dur: b * 0.72 },
      { off: b*5.1,  notes: [659.25, 987.77, 1318.51], dur: b * 0.72 },
      { off: b*6.1,  notes: [329.63, 493.88, 659.25, 830.61, 987.77, 1318.51], dur: 1.90 / spd }
    ];
    prog.forEach((p, idx) => {
      const at = dropT + p.off;
      p.notes.forEach(f => layerSuperSawBrass(bus, at, f, p.dur, prof, idx === 6 ? 1.0 : 1.08));
      layerSubKick(bus, at, prof, idx >= 4 ? 1.45 : 1.18);
    });

    const cliT = dropT + b * 6.1;
    layerImpactExplosion(bus, cliT, prof, 1.40);
    for (let k = 1; k <= 8; k++) layerSubKick(bus, cliT + k * (0.19 / spd), prof, k % 2 === 0 ? 1.35 : 1.10);

    const chaosArp = [1975, 2489, 2637, 3322, 3951, 4186, 4698, 3951, 3322, 4186, 4698, 5274, 3951, 4698, 5274, 4186];
    chaosArp.forEach((f, i) => layerArcadeArp(bus, cliT + i * (0.052 / spd), Math.min(4800, f), 0.13 / spd, prof, 1.20));
    [0, 0.22, 0.44, 0.72, 1.02].forEach((off, idx) => {
      layerKyuinSweep(bus, cliT + off / spd, 1650 + idx * 200, 4200 + idx * 180, 0.30 / spd, prof, 1.25);
    });

    if (isWedding) {
      [1046.5, 1318.51, 1567.98, 2093.0, 2637.02, 3135.96, 4186.0].forEach((f, i) => {
        const bt = dropT + i * 0.085;
        const bell1 = c.createOscillator(), bell2 = c.createOscillator(), bG = c.createGain();
        bell1.type = 'sine'; bell2.type = 'triangle';
        bell1.frequency.setValueAtTime(f, bt);
        bell2.frequency.setValueAtTime(f * 2.0, bt);
        bG.gain.setValueAtTime(0.001, bt);
        bG.gain.linearRampToValueAtTime(0.32, bt + 0.012);
        bG.gain.exponentialRampToValueAtTime(0.001, bt + 1.85);
        bell1.connect(bG); bell2.connect(bG); bG.connect(dryBus); bG.connect(wetSend);
        bell1.start(bt); bell2.start(bt); bell1.stop(bt + 1.90); bell2.stop(bt + 1.90);
      });
    }
  }

  // =======================================================================
  // ★v3.0 新・落ちブル警報ロングトーン（490Hz→980Hz 高重心＋物理落下バイブ）★
  // withAlarm=true: 物理落ちブル＋高重心警報ロングトーン「とぅーーる↑ーーーー!!」
  // withAlarm=false: 物理落ちブルのみ（昇格フィニッシュ重ね用）
  // =======================================================================
  function playOchiburu(withAlarm = true) {
    const c = init(); if (!c) return;
    const now = c.currentTime + 0.01;
    const p = ALARM_OB_SETTINGS;
    const physGain = c.createGain();
    physGain.gain.value = withAlarm ? p.physScale : 1.0;
    physGain.connect(obOutBus);

    const dropScale = LAB_OB_BASE.drop / 100;
    const motorHz = LAB_OB_BASE.speed;
    const rattleScale = LAB_OB_BASE.rattle / 100;
    const growlScale = LAB_OB_BASE.growl / 100;
    const dur = withAlarm ? 1.65 : LAB_OB_BASE.dur;

    vibrate(withAlarm ? [95, 25, 80, 25, 80, 25, 180, 30, 140] : [95, 20, 75, 20, 75, 20, 120]);

    // --- Part 1: 物理落下衝撃「ガコンッ！」 ---
    if (dropScale > 0.01) {
      const bodyOsc = c.createOscillator(), bodyTri = c.createOscillator(), bodyG = c.createGain();
      bodyOsc.type = 'sine'; bodyTri.type = 'triangle';
      bodyOsc.frequency.setValueAtTime(145, now); bodyOsc.frequency.exponentialRampToValueAtTime(42, now + 0.11);
      bodyTri.frequency.setValueAtTime(160, now); bodyTri.frequency.exponentialRampToValueAtTime(46, now + 0.09);
      bodyG.gain.setValueAtTime(0.001, now);
      bodyG.gain.linearRampToValueAtTime(1.15 * dropScale, now + 0.003);
      bodyG.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
      bodyOsc.connect(bodyG); bodyTri.connect(bodyG); bodyG.connect(physGain);
      bodyOsc.start(now); bodyTri.start(now); bodyOsc.stop(now + 0.15); bodyTri.stop(now + 0.15);

      const clackNoise = c.createBufferSource(); clackNoise.buffer = noiseBuffer;
      const clackBP = c.createBiquadFilter(); clackBP.type = 'bandpass'; clackBP.frequency.setValueAtTime(640, now); clackBP.Q.value = 1.6;
      const clackNG = c.createGain();
      clackNG.gain.setValueAtTime(0.001, now);
      clackNG.gain.linearRampToValueAtTime(1.05 * dropScale, now + 0.002);
      clackNG.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      clackNoise.connect(clackBP).connect(clackNG).connect(physGain);
      clackNoise.start(now); clackNoise.stop(now + 0.055);

      const bT = now + 0.036;
      const bNoise = c.createBufferSource(); bNoise.buffer = noiseBuffer;
      const bBP = c.createBiquadFilter(); bBP.type = 'bandpass'; bBP.frequency.value = 880; bBP.Q.value = 2.0;
      const bG = c.createGain();
      bG.gain.setValueAtTime(0.001, bT);
      bG.gain.linearRampToValueAtTime(0.58 * dropScale, bT + 0.002);
      bG.gain.exponentialRampToValueAtTime(0.001, bT + 0.028);
      bNoise.connect(bBP).connect(bG).connect(physGain);
      bNoise.start(bT); bNoise.stop(bT + 0.035);
    }

    // --- Part 2: 筐体バイブ「ドゥルルルル…」 ---
    const vStart = now + 0.052;
    const vEnd = vStart + dur;
    const lfo = c.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(motorHz * 1.10, vStart);
    lfo.frequency.exponentialRampToValueAtTime(motorHz, vStart + 0.09);
    lfo.frequency.setValueAtTime(motorHz, Math.max(vStart + 0.10, vEnd - 0.14));
    lfo.frequency.exponentialRampToValueAtTime(Math.max(12, motorHz * 0.78), vEnd);

    const lfoSmooth = c.createBiquadFilter();
    lfoSmooth.type = 'lowpass'; lfoSmooth.frequency.value = motorHz * 3.8;
    lfo.connect(lfoSmooth);

    if (growlScale > 0.01) {
      const mSaw = c.createOscillator(), mLP = c.createBiquadFilter(), mAM = c.createGain(), mEnv = c.createGain();
      mSaw.type = 'sawtooth';
      mSaw.frequency.setValueAtTime(76, vStart); mSaw.frequency.exponentialRampToValueAtTime(52, vEnd);
      mLP.type = 'lowpass'; mLP.frequency.value = 210; mLP.Q.value = 1.8;
      mAM.gain.setValueAtTime(0.55, vStart);
      const mLfoDepth = c.createGain(); mLfoDepth.gain.value = 0.46;
      lfoSmooth.connect(mLfoDepth).connect(mAM.gain);
      mEnv.gain.setValueAtTime(0.001, vStart);
      mEnv.gain.linearRampToValueAtTime(0.95 * growlScale, vStart + 0.025);
      mEnv.gain.setValueAtTime(0.90 * growlScale, Math.max(vStart + 0.05, vEnd - 0.10));
      mEnv.gain.exponentialRampToValueAtTime(0.001, vEnd);
      mSaw.connect(mLP).connect(mAM).connect(mEnv).connect(physGain);
      mSaw.start(vStart); mSaw.stop(vEnd + 0.03);
    }

    if (rattleScale > 0.01) {
      const rNoise = c.createBufferSource(); rNoise.buffer = noiseBuffer; rNoise.loop = true;
      const rBP = c.createBiquadFilter(); rBP.type = 'bandpass'; rBP.frequency.value = 1150; rBP.Q.value = 1.1;
      const rAM = c.createGain(); rAM.gain.setValueAtTime(0.50, vStart);
      const rLfoDepth = c.createGain(); rLfoDepth.gain.value = 0.50;
      lfoSmooth.connect(rLfoDepth).connect(rAM.gain);
      const rEnv = c.createGain();
      rEnv.gain.setValueAtTime(0.001, vStart);
      rEnv.gain.linearRampToValueAtTime(0.68 * rattleScale, vStart + 0.02);
      rEnv.gain.setValueAtTime(0.65 * rattleScale, Math.max(vStart + 0.04, vEnd - 0.10));
      rEnv.gain.exponentialRampToValueAtTime(0.001, vEnd);
      rNoise.connect(rBP).connect(rAM).connect(rEnv).connect(physGain);
      rNoise.start(vStart); rNoise.stop(vEnd + 0.03);
    }

    lfo.start(vStart);
    lfo.stop(vEnd + 0.03);

    // --- Part 3: 高重心警報ロングトーン「とぅーー（490Hz）→ る↑（980Hz）→ ーーーー!!」 ---
    if (!withAlarm) return;

    const tStart = now + 0.01;
    const tGlideStart = tStart + p.hold1;
    const tGlideEnd = tGlideStart + p.glide;
    const tEnd = tGlideEnd + p.hold2;
    const f1 = p.baseHz;
    const f2 = p.baseHz * 2.0;

    // 低域モコモコをカットし、中高域の抜けと太さを引き上げるEQチェーン
    const hp = c.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 340; hp.Q.value = 0.7;

    const lp = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.4;
    lp.frequency.setValueAtTime(f1 * 4.5, tStart);
    lp.frequency.exponentialRampToValueAtTime(Math.min(12500, f2 * 6.5), tGlideEnd);
    lp.frequency.exponentialRampToValueAtTime(Math.min(9500, f2 * 4.2), tEnd);

    const hiPresence = c.createBiquadFilter();
    hiPresence.type = 'peaking'; hiPresence.frequency.value = 3100; hiPresence.Q.value = 1.0; hiPresence.gain.value = 4.8;

    const shaper = c.createWaveShaper();
    shaper.curve = makeLabGritCurve(p.grit); shaper.oversample = '4x';

    const env = c.createGain();
    env.gain.setValueAtTime(0.001, tStart);
    env.gain.linearRampToValueAtTime(0.42, tStart + 0.025);
    env.gain.setValueAtTime(0.40, tGlideStart);
    env.gain.linearRampToValueAtTime(0.52, tGlideEnd);
    env.gain.setValueAtTime(0.46, Math.max(tGlideEnd + 0.05, tEnd - 0.35));
    env.gain.exponentialRampToValueAtTime(0.001, tEnd);

    const vib = c.createOscillator(), vibG = c.createGain();
    vib.type = 'sine'; vib.frequency.value = 6.2;
    vibG.gain.setValueAtTime(0.001, tStart);
    vibG.gain.setValueAtTime(0.001, tGlideEnd);
    vibG.gain.linearRampToValueAtTime(f2 * 0.014, tGlideEnd + 0.18);
    vibG.gain.exponentialRampToValueAtTime(2.0, tEnd);
    vib.connect(vibG); vib.start(tStart); vib.stop(tEnd + 0.05);

    // -1octを廃し、5ボイスSuperSaw＋うっすら+1oct倍音で高重心かつ太い音像に
    const voices = [
      { type: 'sawtooth', detune: -16, mul: 1.0, g: 0.28 },
      { type: 'square',   detune: -6,  mul: 1.0, g: 0.24 },
      { type: 'sawtooth', detune: 0,   mul: 1.0, g: 0.32 },
      { type: 'square',   detune: 6,   mul: 1.0, g: 0.24 },
      { type: 'sawtooth', detune: 16,  mul: 1.0, g: 0.28 },
      { type: 'triangle', detune: 3,   mul: 2.0, g: 0.14 }
    ];

    voices.forEach(v => {
      const osc = c.createOscillator(), vg = c.createGain();
      osc.type = v.type; osc.detune.value = v.detune; vg.gain.value = v.g;
      osc.frequency.setValueAtTime(f1 * v.mul, tStart);
      osc.frequency.setValueAtTime(f1 * v.mul, tGlideStart);
      osc.frequency.exponentialRampToValueAtTime(f2 * v.mul, tGlideEnd);
      osc.frequency.setValueAtTime(f2 * v.mul, tEnd);
      vibG.connect(osc.frequency);
      osc.connect(vg).connect(hp);
      osc.start(tStart); osc.stop(tEnd + 0.05);
    });

    hp.connect(lp).connect(shaper).connect(hiPresence).connect(env);
    env.connect(dryBus);
    const alarmWet = c.createGain(); alarmWet.gain.value = 1.05;
    env.connect(alarmWet).connect(wetSend);
  }

  function playSoftHeartbeat() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    vibrate([35, 90, 45]);
    [0, 0.19].forEach((off, idx) => {
      const t = now + off;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(idx === 0 ? 64 : 52, t);
      o.frequency.exponentialRampToValueAtTime(28, t + 0.14);
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.55, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.17);
      o.connect(g).connect(dryBus);
      o.start(t); o.stop(t + 0.19);
    });
  }

  // ★v3.0 さりげない電源断プチュン（控えめ音量＋2.2秒ホールリバーブ残響）★
  function playPuchun() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    vibrate([65]);
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(1950, now);
    o.frequency.exponentialRampToValueAtTime(42, now + 0.13);
    g.gain.setValueAtTime(0.42, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    o.connect(g);
    g.connect(dryBus);
    const pWet = c.createGain(); pWet.gain.value = 1.25;
    g.connect(pWet).connect(wetSend);
    o.start(now); o.stop(now + 0.18);
  }

  function playCrackNoise() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    vibrate([30, 30, 50]);
    const n = c.createBufferSource(); n.buffer = noiseBuffer;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3400; bp.Q.value = 2.4;
    const g = c.createGain();
    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.45, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.12, now + 0.16);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
    n.connect(bp).connect(g); g.connect(gritBus); g.connect(wetSend);
    n.start(now); n.stop(now + 0.38);

    [0, 0.11].forEach(off => {
      const t = now + off;
      const o = c.createOscillator(), og = c.createGain();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(2800 + off * 4000, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.04);
      og.gain.setValueAtTime(0.32, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      o.connect(og).connect(dryBus); o.start(t); o.stop(t + 0.06);
    });
  }

  function playSlash() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    vibrate([70, 25, 240]);

    const n = c.createBufferSource(); n.buffer = noiseBuffer;
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.4;
    bp.frequency.setValueAtTime(7800, now); bp.frequency.exponentialRampToValueAtTime(360, now + 0.38);
    const nG = c.createGain(); nG.gain.setValueAtTime(1.25, now); nG.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    n.connect(bp).connect(nG); nG.connect(gritBus); nG.connect(wetSend);
    n.start(now); n.stop(now + 0.46);

    const blade = c.createOscillator(), bG = c.createGain();
    blade.type = 'sawtooth';
    blade.frequency.setValueAtTime(3900, now); blade.frequency.exponentialRampToValueAtTime(460, now + 0.28);
    bG.gain.setValueAtTime(0.55, now); bG.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    blade.connect(bG); bG.connect(gritBus); bG.connect(wetSend);
    blade.start(now); blade.stop(now + 0.34);

    const boom = c.createOscillator(), bmG = c.createGain();
    boom.type = 'sine';
    boom.frequency.setValueAtTime(155, now); boom.frequency.exponentialRampToValueAtTime(28, now + 0.38);
    bmG.gain.setValueAtTime(1.35, now); bmG.gain.exponentialRampToValueAtTime(0.001, now + 0.44);
    boom.connect(bmG).connect(dryBus); boom.start(now); boom.stop(now + 0.46);
  }

  function playKyuin() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    vibrate([70, 25, 130, 25, 150]);
    [0, 0.14].forEach(off => {
      const t = now + off;
      const car = c.createOscillator(), mod = c.createOscillator();
      const modG = c.createGain(), env = c.createGain();
      car.type = 'sine'; mod.type = 'triangle';
      car.frequency.setValueAtTime(1250, t); car.frequency.exponentialRampToValueAtTime(3600, t + 0.10);
      mod.frequency.setValueAtTime(2800, t); mod.frequency.exponentialRampToValueAtTime(5200, t + 0.10);
      modG.gain.setValueAtTime(900, t); modG.gain.exponentialRampToValueAtTime(80, t + 0.24);
      env.gain.setValueAtTime(0.001, t); env.gain.linearRampToValueAtTime(0.55, t + 0.008);
      env.gain.exponentialRampToValueAtTime(0.001, t + 0.34);
      mod.connect(modG).connect(car.frequency); car.connect(env); env.connect(dryBus); env.connect(wetSend);
      car.start(t); mod.start(t); car.stop(t + 0.36); mod.stop(t + 0.36);
    });
  }

  function playWhaleSiren() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    vibrate([140, 60, 140, 60, 240]);
    [73.42, 110.0, 146.83].forEach(f => {
      const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 950;
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(f * 0.90, now);
      o.frequency.linearRampToValueAtTime(f * 1.08, now + 0.55);
      o.frequency.linearRampToValueAtTime(f * 0.94, now + 1.05);
      g.gain.setValueAtTime(0.001, now); g.gain.linearRampToValueAtTime(0.32, now + 0.14);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.10);
      o.connect(lp).connect(g); g.connect(gritBus); g.connect(wetSend);
      o.start(now); o.stop(now + 1.14);
    });
  }

  function playReStart() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    const o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
    bp.type = 'bandpass'; bp.frequency.value = 1050;
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(1600, now); o.frequency.exponentialRampToValueAtTime(85, now + 0.48);
    g.gain.setValueAtTime(0.48, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
    o.connect(bp).connect(g); g.connect(gritBus); g.connect(wetSend);
    o.start(now); o.stop(now + 0.54);
  }

  function playFail() {
    const c = init(); if (!c) return;
    const now = c.currentTime;
    [311.13, 220.0].forEach((f, i) => {
      const t = now + i * 0.12;
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'triangle'; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.30, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g); g.connect(dryBus); g.connect(wetSend);
      o.start(t); o.stop(t + 0.28);
    });
  }

  return {
    setVolume: v => { params.volume = v; if (masterGain && !params.muted) masterGain.gain.value = v; },
    setReverbWet: w => { params.reverbWet = w; if (wetGain) wetGain.gain.value = w * 1.15; },
    setPeakBright: b => { params.peakBright = b; },
    setDownBend: d => { params.downBend = d; },
    setPoEmphasis: p => { params.poEmphasis = p; },
    setGrit: g => { params.grit = g; if (gritShaper) gritShaper.curve = createGritCurve(g); },
    toggleMute: () => { params.muted = !params.muted; if (masterGain) masterGain.gain.value = params.muted ? 0 : params.volume; return params.muted; },
    playPokyun, playSoftHeartbeat, playPuchun, playCrackNoise, playSlash,
    playOchiburu, playKyuin, playWhaleSiren, playReStart,
    play1500Jackpot, play3000Jackpot, play6000Fanfare, playFail
  };
})();
