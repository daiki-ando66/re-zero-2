// =========================================================================
// bgm.js (v4.0) : Web Audio API 本格シンセBGMエンジン（Lookaheadスケジューラ）
//  ・全5トラック（通常 / SPリーチ / 鬼がかりRUSH / 脳が震えるRUSH / レム告知）
//  ・4小節（64ステップ）コード進行・ドライブベース・擬似サイドチェイン・ステレオディレイ＆リバーブ
//  ・プチュン暗転／無音違和感／大当たり時に0.01秒で瞬間無音切断
// =========================================================================
const BgmEngine = (() => {
  let ctx = null;
  let masterBus = null;
  let duckBus = null;       // キック連動サイドチェイン用バス
  let dryBus = null;
  let fxSend = null;
  let delaySend = null;
  let driveShaper = null;
  let noiseBuf = null;

  let enabled = true;
  let globalMuted = false;
  let cutFlag = false;
  let userVolume = 0.65;

  let currentTrack = 'normal'; // 'normal' | 'reach' | 'onigakari' | 'brain' | 'rem'
  let schedulerId = null;
  let nextNoteTime = 0;
  let currentStep = 0;         // 0〜63（4小節 × 16ステップ）
  let pulseLevel = 0;

  const TRACK_BPM = {
    normal: 120,
    reach: 154,
    onigakari: 164,
    brain: 146,
    rem: 134
  };

  // MIDIノート番号 → 周波数(Hz)
  function m2f(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function createDriveCurve(amount = 2.6) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      c[i] = Math.tanh(x * amount);
    }
    return c;
  }

  function createRoomIR(audioCtx, dur = 1.4) {
    const sr = audioCtx.sampleRate, len = Math.floor(sr * dur);
    const buf = audioCtx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / sr;
        const env = Math.pow(1 - t / dur, 2.9);
        const alpha = Math.max(0.08, 0.45 - (t / dur) * 0.34);
        lp += alpha * ((Math.random() * 2 - 1) * env - lp);
        d[i] = lp * 0.55;
      }
    }
    return buf;
  }

  function ensureCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 5.5;
      comp.attack.value = 0.004; comp.release.value = 0.14;

      const lowEq = ctx.createBiquadFilter();
      lowEq.type = 'lowshelf'; lowEq.frequency.value = 110; lowEq.gain.value = 2.8;

      masterBus = ctx.createGain();
      masterBus.gain.value = 0.0001;

      lowEq.connect(comp).connect(masterBus).connect(ctx.destination);

      dryBus = ctx.createGain(); dryBus.gain.value = 0.92;
      dryBus.connect(lowEq);

      // サイドチェイン（キック時に一瞬へこむバス）
      duckBus = ctx.createGain(); duckBus.gain.value = 1.0;
      duckBus.connect(dryBus);

      // ドライブベース用サチュレーター
      driveShaper = ctx.createWaveShaper();
      driveShaper.curve = createDriveCurve(2.8);
      driveShaper.oversample = '2x';
      driveShaper.connect(duckBus);

      // ルームリバーブセンド
      fxSend = ctx.createGain(); fxSend.gain.value = 0.42;
      const revHP = ctx.createBiquadFilter(); revHP.type = 'highpass'; revHP.frequency.value = 280;
      const conv = ctx.createConvolver(); conv.buffer = createRoomIR(ctx, 1.4);
      fxSend.connect(revHP).connect(conv).connect(lowEq);

      // ピンポンステレオディレイ（リード・アルペジオ・ベル用）
      delaySend = ctx.createGain(); delaySend.gain.value = 0.34;
      const dL = ctx.createDelay(0.6); dL.delayTime.value = 0.185;
      const dR = ctx.createDelay(0.6); dR.delayTime.value = 0.278;
      const fbL = ctx.createGain(); fbL.gain.value = 0.30;
      const fbR = ctx.createGain(); fbR.gain.value = 0.28;
      const dLP = ctx.createBiquadFilter(); dLP.type = 'lowpass'; dLP.frequency.value = 4200;
      const dHP = ctx.createBiquadFilter(); dHP.type = 'highpass'; dHP.frequency.value = 480;
      const merger = ctx.createChannelMerger(2);
      delaySend.connect(dHP).connect(dLP);
      dLP.connect(dL);
      dL.connect(fbL).connect(dR);
      dR.connect(fbR).connect(dL);
      dL.connect(merger, 0, 0);
      dR.connect(merger, 0, 1);
      merger.connect(lowEq);

      // ドラム用ノイズバッファ
      const nLen = Math.floor(ctx.sampleRate * 0.45);
      noiseBuf = ctx.createBuffer(1, nLen, ctx.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function applyMasterGain(immediate = false) {
    if (!masterBus || !ctx) return;
    const now = ctx.currentTime;
    const trackScale = currentTrack === 'normal' ? 0.36
      : currentTrack === 'rem' ? 0.40
      : currentTrack === 'reach' ? 0.48
      : 0.50;
    const target = (cutFlag || !enabled || globalMuted) ? 0.0001 : Math.max(0.001, userVolume * trackScale);
    masterBus.gain.cancelScheduledValues(now);
    if (immediate) {
      masterBus.gain.setValueAtTime(target, now);
    } else {
      masterBus.gain.setTargetAtTime(target, now, 0.035);
    }
  }

  // =======================================================================
  // 楽器シンセサイザー群（グルーヴ・フィルター・立体感重視）
  // =======================================================================
  function triggerSidechain(t, depth = 0.42, recover = 0.14) {
    if (!duckBus) return;
    duckBus.gain.cancelScheduledValues(t);
    duckBus.gain.setValueAtTime(1.0, t);
    duckBus.gain.linearRampToValueAtTime(1.0 - depth, t + 0.008);
    duckBus.gain.exponentialRampToValueAtTime(1.0, t + recover);
  }

  function playKick(t, { gain = 0.72, punchHz = 155, bodyHz = 42, dur = 0.15, duck = 0.42 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(punchHz, t);
    o.frequency.exponentialRampToValueAtTime(bodyHz, t + dur * 0.75);
    g.gain.setValueAtTime(0.001, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(dryBus);
    o.start(t); o.stop(t + dur + 0.02);

    // アタッククリック（抜けの良さ）
    const cOsc = ctx.createOscillator(), cG = ctx.createGain();
    cOsc.type = 'triangle';
    cOsc.frequency.setValueAtTime(880, t);
    cOsc.frequency.exponentialRampToValueAtTime(110, t + 0.016);
    cG.gain.setValueAtTime(gain * 0.28, t);
    cG.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    cOsc.connect(cG).connect(dryBus);
    cOsc.start(t); cOsc.stop(t + 0.022);

    if (duck > 0) triggerSidechain(t, duck, dur * 1.15);
    pulseLevel = 1.0;
  }

  function playSnare(t, { gain = 0.28, toneHz = 205, snappy = 1.0, dur = 0.14 } = {}) {
    // ボディ
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(toneHz, t);
    o.frequency.exponentialRampToValueAtTime(toneHz * 0.55, t + 0.06);
    og.gain.setValueAtTime(gain * 0.75, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.085);
    o.connect(og).connect(dryBus);
    o.start(t); o.stop(t + 0.095);

    // スナッピーノイズ＋リバーブ
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2100 * snappy; bp.Q.value = 0.8;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(gain, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(bp).connect(ng);
    ng.connect(dryBus);
    const rv = ctx.createGain(); rv.gain.value = 0.45;
    ng.connect(rv).connect(fxSend);
    src.start(t); src.stop(t + dur + 0.02);
  }

  function playHat(t, { gain = 0.12, open = false, hpHz = 7600 } = {}) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = hpHz;
    const g = ctx.createGain();
    const d = open ? 0.13 : 0.032;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + d);
    src.connect(hp).connect(g).connect(dryBus);
    src.start(t); src.stop(t + d + 0.01);
  }

  function playMetalPerc(t, freq = 1480, gain = 0.14) {
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o1.type = 'square'; o2.type = 'sawtooth';
    o1.frequency.setValueAtTime(freq, t);
    o2.frequency.setValueAtTime(freq * 1.414, t);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1100;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o1.connect(hp); o2.connect(hp); hp.connect(g);
    g.connect(dryBus); g.connect(fxSend);
    o1.start(t); o2.start(t); o1.stop(t + 0.09); o2.stop(t + 0.09);
  }

  // ドライブ・シンセベース（フィルター開閉＋ゲートタイムでタイトに切る）
  function playDriveBass(t, midi, dur, { gain = 0.34, cutoff = 1250, res = 3.2, driven = true, sub = true } = {}) {
    const f = m2f(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = res;
    lp.frequency.setValueAtTime(cutoff * 1.9, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(180, cutoff * 0.34), t + Math.min(dur, 0.14));

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.005);
    env.gain.setValueAtTime(gain * 0.85, t + Math.max(0.01, dur * 0.72));
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator();
    o1.type = 'sawtooth'; o2.type = 'square';
    o1.frequency.setValueAtTime(f, t);
    o2.frequency.setValueAtTime(f, t); o2.detune.value = 5;
    const o2g = ctx.createGain(); o2g.gain.value = 0.45;
    o1.connect(lp); o2.connect(o2g).connect(lp);

    if (sub) {
      const s = ctx.createOscillator(), sg = ctx.createGain();
      s.type = 'sine'; s.frequency.setValueAtTime(f * 0.5, t);
      sg.gain.value = 0.42;
      s.connect(sg).connect(env);
      s.start(t); s.stop(t + dur + 0.02);
    }

    lp.connect(env);
    env.connect(driven ? driveShaper : duckBus);
    o1.start(t); o2.start(t);
    o1.stop(t + dur + 0.02); o2.stop(t + dur + 0.02);
  }

  // SuperSaw コードパッド／スタブ（サイドチェイン連動）
  function playPadChord(t, midis, dur, { gain = 0.11, cutoff = 1600, attack = 0.03, detune = 11, rev = 0.7 } = {}) {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 1.2;
    lp.frequency.setValueAtTime(cutoff * 0.55, t);
    lp.frequency.exponentialRampToValueAtTime(cutoff, t + Math.min(dur * 0.5, 0.25));
    lp.frequency.exponentialRampToValueAtTime(cutoff * 0.65, t + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(gain, t + attack);
    env.gain.setValueAtTime(gain * 0.85, t + Math.max(attack + 0.01, dur - 0.08));
    env.gain.exponentialRampToValueAtTime(0.001, t + dur + 0.05);

    midis.forEach(m => {
      const f = m2f(m);
      [-detune, detune].forEach(dt => {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.detune.value = dt;
        o.connect(lp);
        o.start(t); o.stop(t + dur + 0.06);
      });
    });

    lp.connect(env);
    env.connect(duckBus);
    if (rev > 0) {
      const rg = ctx.createGain(); rg.gain.value = rev;
      env.connect(rg).connect(fxSend);
    }
  }

  // リード・アルペジオ・クリスタルベル（ステレオディレイ＆リバーブ付き）
  function playSynthLead(t, midi, dur, { gain = 0.14, type = 'sawtooth', cutoff = 3800, delay = 0.55, rev = 0.50, detune = 7 } = {}) {
    const f = m2f(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.Q.value = 2.0;
    lp.frequency.setValueAtTime(cutoff, t);
    lp.frequency.exponentialRampToValueAtTime(Math.max(500, cutoff * 0.42), t + dur);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);

    const o1 = ctx.createOscillator();
    o1.type = type; o1.frequency.setValueAtTime(f, t);
    o1.connect(lp); o1.start(t); o1.stop(t + dur + 0.03);

    if (detune > 0) {
      const o2 = ctx.createOscillator();
      o2.type = type; o2.frequency.setValueAtTime(f, t); o2.detune.value = detune;
      o2.connect(lp); o2.start(t); o2.stop(t + dur + 0.03);
    }

    lp.connect(env);
    env.connect(dryBus);
    if (delay > 0) { const dg = ctx.createGain(); dg.gain.value = delay; env.connect(dg).connect(delaySend); }
    if (rev > 0) { const rg = ctx.createGain(); rg.gain.value = rev; env.connect(rg).connect(fxSend); }
  }

  function playCrystalBell(t, midi, dur = 0.34, gain = 0.13) {
    const f = m2f(midi);
    const car = ctx.createOscillator(), over = ctx.createOscillator(), env = ctx.createGain();
    car.type = 'sine'; over.type = 'triangle';
    car.frequency.setValueAtTime(f, t);
    over.frequency.setValueAtTime(f * 2.0, t);
    const og = ctx.createGain(); og.gain.value = 0.28;
    env.gain.setValueAtTime(0.001, t);
    env.gain.linearRampToValueAtTime(gain, t + 0.006);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    car.connect(env); over.connect(og).connect(env);
    env.connect(dryBus);
    const dg = ctx.createGain(); dg.gain.value = 0.72; env.connect(dg).connect(delaySend);
    const rg = ctx.createGain(); rg.gain.value = 0.85; env.connect(rg).connect(fxSend);
    car.start(t); over.start(t); car.stop(t + dur + 0.04); over.stop(t + dur + 0.04);
  }

  // =======================================================================
  // 5トラックの4小節（64ステップ）シーケンス定義
  // =======================================================================
  function scheduleStep(step, t, stepDur) {
    const bar = Math.floor(step / 16); // 0..3
    const s = step % 16;               // 0..15

    // ---------------------------------------------------------------------
    // 1. 通常時（BPM 120）：切なく幻想的なファンタジー・グルーヴ
    //    進行：Am7 - Fmaj7 - Cmaj7 - G6
    // ---------------------------------------------------------------------
    if (currentTrack === 'normal') {
      const chords = [[57,60,64,67], [53,57,60,64], [48,52,55,59], [55,59,62,64]];
      const roots  = [45, 41, 36, 43];
      const arps = [
        [69,0,72,0,76,0,72,0, 79,0,76,0,72,0,71,0],
        [65,0,69,0,72,0,69,0, 76,0,72,0,69,0,67,0],
        [64,0,67,0,72,0,67,0, 74,0,72,0,67,0,64,0],
        [62,0,67,0,71,0,67,0, 74,0,71,0,67,0,64,0]
      ];
      if (s === 0) playPadChord(t, chords[bar], stepDur * 15.5, { gain: 0.085, cutoff: 1250, attack: 0.08, detune: 9, rev: 0.8 });
      if (s === 0 || s === 6 || s === 10) playKick(t, { gain: 0.44, punchHz: 118, bodyHz: 44, dur: 0.14, duck: 0.24 });
      if (s === 4 || s === 12) playSnare(t, { gain: 0.14, toneHz: 190, snappy: 0.85, dur: 0.11 });
      if (s % 2 === 0) playHat(t, { gain: s % 4 === 2 ? 0.08 : 0.045, open: s === 14 });
      if (s === 0 || s === 6 || s === 10 || s === 14) {
        const note = (s === 14 && bar === 3) ? roots[bar] + 2 : roots[bar];
        playDriveBass(t, note, stepDur * 1.6, { gain: 0.22, cutoff: 480, res: 1.5, driven: false, sub: false });
      }
      const an = arps[bar][s];
      if (an) playCrystalBell(t, an, stepDur * 2.4, 0.085);
      return;
    }

    // ---------------------------------------------------------------------
    // 2. 通常時SPリーチ（BPM 154）：緊迫のバトル・ロック
    //    進行：Dm - Bb - C - A7
    // ---------------------------------------------------------------------
    if (currentTrack === 'reach') {
      const chords = [[62,65,69], [58,62,65], [60,64,67], [57,61,64,67]];
      const roots  = [38, 34, 36, 33];
      const lead = [
        [74,0,74,77, 76,0,74,0, 72,0,74,0, 77,0,76,0],
        [70,0,70,74, 72,0,70,0, 69,0,70,0, 74,0,72,0],
        [72,0,72,76, 74,0,72,0, 79,0,77,0, 76,0,74,0],
        [73,0,76,0, 79,0,76,0, 81,0,79,76, 73,0,76,0]
      ];
      if (s === 0 || s === 8) playPadChord(t, chords[bar], stepDur * 7.2, { gain: 0.10, cutoff: 2200, attack: 0.02, detune: 12, rev: 0.55 });
      if (s % 4 === 0 || (bar === 3 && s >= 12)) playKick(t, { gain: 0.68, punchHz: 150, bodyHz: 42, dur: 0.12, duck: 0.38 });
      if (s === 4 || s === 12 || (bar === 3 && s >= 12 && s % 2 === 1)) playSnare(t, { gain: 0.26, toneHz: 215, snappy: 1.1 });
      if (s % 2 === 1) playHat(t, { gain: 0.11, open: s === 15 });
      // 刻む16分ドライブベース（休符ありでタイト！）
      if (s % 2 === 0 || s === 7 || s === 15) {
        const oct = (s === 7 || s === 15) ? 12 : 0;
        playDriveBass(t, roots[bar] + oct, stepDur * 0.85, { gain: 0.34, cutoff: 1450, res: 3.4, driven: true });
      }
      const ln = lead[bar][s];
      if (ln) playSynthLead(t, ln, stepDur * 1.45, { gain: 0.13, type: 'sawtooth', cutoff: 4200, delay: 0.45, rev: 0.45 });
      return;
    }

    // ---------------------------------------------------------------------
    // 3. 鬼がかりRUSH（BPM 164）：王道ハイテンション・トランスロック
    //    進行：Dm - Bb - F - C（4小節目後半にドラムフィル＆上昇リード！）
    // ---------------------------------------------------------------------
    if (currentTrack === 'onigakari') {
      const chords = [[62,65,69], [58,62,65], [65,69,72], [60,64,67]];
      const roots  = [38, 34, 41, 36];
      const lead = [
        [74,0,77,0, 81,0,79,77, 74,0,77,0, 81,0,84,0],
        [82,0,81,0, 77,0,74,0, 77,0,81,0, 82,0,81,0],
        [81,0,84,0, 86,0,84,81, 77,0,81,0, 84,0,81,0],
        [79,0,84,0, 86,0,88,0, 84,0,86,88, 89,0,88,86]
      ];
      // 4つ打ちパワフルキック＋サイドチェイン
      if (s % 4 === 0) playKick(t, { gain: 0.78, punchHz: 165, bodyHz: 42, dur: 0.13, duck: 0.50 });
      if (s === 4 || s === 12) playSnare(t, { gain: 0.28, toneHz: 225, snappy: 1.15, dur: 0.13 });
      // 4小節目終わりのスネアフィルイン
      if (bar === 3 && (s === 13 || s === 14 || s === 15)) playSnare(t, { gain: 0.22 + (s - 12) * 0.04, toneHz: 230, snappy: 1.2, dur: 0.09 });
      if (s % 2 === 1) playHat(t, { gain: s % 4 === 2 ? 0.15 : 0.09, open: s === 2 || s === 10 });

      // 裏打ちで跳ねる極太オクターブ・ドライブベース
      if (s % 2 === 1 || s === 0) {
        const oct = (s % 4 === 2 || s % 4 === 3) ? 12 : 0;
        playDriveBass(t, roots[bar] + oct, stepDur * (s % 2 === 1 ? 0.82 : 0.72), {
          gain: s % 2 === 1 ? 0.38 : 0.26, cutoff: 1750, res: 3.8, driven: true
        });
      }
      // SuperSawコードスタブ（サイドチェインでうねる）
      if (s === 0 || s === 6 || s === 12) {
        playPadChord(t, chords[bar], stepDur * 4.5, { gain: 0.115, cutoff: 2800, attack: 0.015, detune: 14, rev: 0.65 });
      }
      // 疾走シンセリード
      const ln = lead[bar][s];
      if (ln) playSynthLead(t, ln, stepDur * 1.65, { gain: 0.135, type: 'sawtooth', cutoff: 5200, delay: 0.62, rev: 0.55, detune: 10 });
      return;
    }

    // ---------------------------------------------------------------------
    // 4. 脳が震えるRUSH（BPM 146）：重低音ダーク・インダストリアルブレイクビーツ
    //    進行：Cm - Db - Cm - Bdim（不穏な半音進行＋跳ねるシンコペーション）
    // ---------------------------------------------------------------------
    if (currentTrack === 'brain') {
      const chords = [[60,63,67], [61,65,68], [60,63,67], [59,62,65,68]];
      const bassRiff = [
        [36,0,0,36, 0,0,39,0, 36,0,37,0, 0,36,39,37],
        [37,0,0,37, 0,0,40,0, 37,0,36,0, 0,37,41,37],
        [36,0,0,36, 0,0,43,0, 36,0,37,0, 0,36,42,39],
        [35,0,35,0, 38,0,0,35, 36,0,37,0, 41,0,38,37]
      ];
      const eerieBell = [
        [0,0,0,0, 0,0,75,0, 0,0,0,0, 0,0,73,0],
        [0,0,0,0, 0,0,76,0, 0,0,0,0, 0,73,72,0],
        [0,0,0,0, 0,0,78,0, 0,0,0,0, 0,0,75,0],
        [0,0,74,0, 0,0,73,0, 0,0,72,0, 75,0,73,0]
      ];
      // 心拍のように襲い掛かる変則ブレイクビーツ
      if (s === 0 || s === 3 || s === 8 || s === 10 || (bar === 3 && s === 14)) {
        playKick(t, { gain: 0.80, punchHz: 132, bodyHz: 35, dur: 0.16, duck: 0.46 });
      }
      if (s === 4 || s === 12) playSnare(t, { gain: 0.30, toneHz: 175, snappy: 1.25, dur: 0.15 });
      if (s % 2 === 0) playHat(t, { gain: 0.085, open: s === 6 || s === 14, hpHz: 6500 });
      if (s === 7 || s === 15) playMetalPerc(t, bar % 2 === 0 ? 1320 : 1580, 0.11);

      if (s === 0) playPadChord(t, chords[bar], stepDur * 14.5, { gain: 0.095, cutoff: 1150, attack: 0.06, detune: 18, rev: 0.75 });
      const bn = bassRiff[bar][s];
      if (bn) playDriveBass(t, bn, stepDur * 1.45, { gain: 0.42, cutoff: 1100, res: 4.5, driven: true, sub: true });
      const eb = eerieBell[bar][s];
      if (eb) playSynthLead(t, eb, stepDur * 2.2, { gain: 0.11, type: 'square', cutoff: 2600, delay: 0.72, rev: 0.75, detune: 16 });
      return;
    }

    // ---------------------------------------------------------------------
    // 5. レム告知モード（BPM 134）：蒼く透き通るディープ・アンビエントトランス
    //    進行：Fm9 - Dbmaj7 - Abmaj7 - Eb6（静寂の余白が点灯＋ポキュ↑ーン↓を際立たせる）
    // ---------------------------------------------------------------------
    if (currentTrack === 'rem') {
      const chords = [[53,56,60,67], [49,53,56,60], [56,60,63,67], [51,55,58,63]];
      const roots  = [41, 37, 44, 39];
      const bells = [
        [72,0,0,75, 0,0,79,0, 75,0,0,72, 0,0,70,0],
        [72,0,0,77, 0,0,80,0, 77,0,0,72, 0,0,68,0],
        [75,0,0,79, 0,0,84,0, 79,0,0,75, 0,0,72,0],
        [74,0,0,79, 0,0,82,0, 79,0,0,75, 0,0,74,0]
      ];
      if (s === 0) playPadChord(t, chords[bar], stepDur * 15.8, { gain: 0.105, cutoff: 1350, attack: 0.12, detune: 12, rev: 0.95 });
      if (s === 0 || s === 8) playKick(t, { gain: 0.50, punchHz: 112, bodyHz: 42, dur: 0.16, duck: 0.34 });
      if (s === 4 || s === 12) playHat(t, { gain: 0.08, open: s === 12, hpHz: 8500 });
      if (s === 0 || s === 10) playDriveBass(t, roots[bar], stepDur * 3.8, { gain: 0.24, cutoff: 420, res: 1.4, driven: false, sub: true });
      const bm = bells[bar][s];
      if (bm) playCrystalBell(t, bm, stepDur * 3.5, 0.12);
    }
  }

  // Lookaheadスケジューラ（25msごとに110ms先まで正確予約）
  function schedulerTick() {
    if (!ctx || ctx.state !== 'running' || !enabled || globalMuted || cutFlag) return;
    const bpm = TRACK_BPM[currentTrack] || 130;
    const stepDur = (60 / bpm) / 4; // 16分音符1ステップ秒
    const lookahead = 0.11;

    while (nextNoteTime < ctx.currentTime + lookahead) {
      scheduleStep(currentStep, nextNoteTime, stepDur);
      nextNoteTime += stepDur;
      currentStep = (currentStep + 1) % 64;
    }
  }

  function startScheduler() {
    if (schedulerId) return;
    const c = ensureCtx();
    if (!c) return;
    nextNoteTime = c.currentTime + 0.04;
    schedulerId = setInterval(schedulerTick, 25);
  }

  function stopScheduler() {
    if (schedulerId) {
      clearInterval(schedulerId);
      schedulerId = null;
    }
  }

  return {
    unlock() {
      const c = ensureCtx();
      if (!c) return;
      applyMasterGain(false);
      if (enabled && !globalMuted && !cutFlag) startScheduler();
    },

    setTrack(track) {
      if (!TRACK_BPM[track]) track = 'normal';
      if (currentTrack !== track) {
        currentTrack = track;
        currentStep = 0;
        if (ctx) nextNoteTime = ctx.currentTime + 0.03;
      }
      applyMasterGain(false);
      if (enabled && !globalMuted && !cutFlag) startScheduler();
    },

    // ★プチュン・無音違和感・大当たり突入時の0.01秒瞬間無音切断！★
    cut() {
      cutFlag = true;
      stopScheduler();
      applyMasterGain(true);
    },

    resume(track = null) {
      if (track && TRACK_BPM[track]) {
        if (currentTrack !== track) { currentTrack = track; currentStep = 0; }
      }
      cutFlag = false;
      if (!enabled || globalMuted) return;
      const c = ensureCtx();
      if (!c) return;
      nextNoteTime = c.currentTime + 0.04;
      applyMasterGain(false);
      startScheduler();
    },

    toggle() {
      enabled = !enabled;
      if (enabled) {
        cutFlag = false;
        const c = ensureCtx();
        if (c) {
          nextNoteTime = c.currentTime + 0.04;
          applyMasterGain(false);
          startScheduler();
        }
      } else {
        this.cut();
      }
      return enabled;
    },

    setGlobalMute(m) {
      globalMuted = !!m;
      if (globalMuted) {
        stopScheduler();
        applyMasterGain(true);
      } else if (enabled && !cutFlag) {
        const c = ensureCtx();
        if (c) { nextNoteTime = c.currentTime + 0.04; applyMasterGain(false); startScheduler(); }
      }
    },

    setVolume(v) {
      userVolume = Math.max(0, Math.min(1, v));
      applyMasterGain(false);
    },

    isEnabled: () => enabled,
    isCut: () => cutFlag || !enabled || globalMuted,
    getTrack: () => currentTrack,
    consumePulse() {
      const v = pulseLevel;
      pulseLevel *= 0.84;
      if (pulseLevel < 0.01) pulseLevel = 0;
      return v;
    }
  };
})();
