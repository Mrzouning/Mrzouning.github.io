/* ==========================================================================
   切西瓜 / Melon Slash
   纯 Canvas 2D + Web Audio，无外部依赖。
   配色全部读取站点 CSS 变量，因此六套外观与深浅色切换会实时作用于画布。
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('game-canvas');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');
  var stage = document.querySelector('.game-stage');
  if (!stage) return;

  var TAU = Math.PI * 2;
  var GAME_SECONDS = 60;
  var TRAIL_MS = 210;
  var BEST_KEY = 'z-melon-best';
  var SOUND_KEY = 'z-melon-sound';
  var reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

  var overlayStart = document.querySelector('[data-overlay="start"]');
  var overlayEnd = document.querySelector('[data-overlay="end"]');
  var el = {
    score: document.querySelector('[data-score]'),
    time: document.querySelector('[data-time]'),
    lives: document.querySelector('[data-lives]'),
    best: document.querySelector('[data-best]'),
    combo: document.querySelector('[data-combo]'),
    endScore: document.querySelector('[data-end-score]'),
    endBest: document.querySelector('[data-end-best]'),
    endNote: document.querySelector('[data-end-note]'),
    endEyebrow: document.querySelector('[data-end-eyebrow]'),
    endTitle: document.querySelector('[data-end-title]'),
    sound: document.querySelector('[data-sound]')
  };

  /* 六种水果。颜色保持自然色，保证在任何外观下都有辨识度；描边与刀光跟随站点变量。 */
  var FRUITS = [
    { id: 'watermelon', r: 46, skin: '#397a45', skin2: '#1f4d2b', flesh: '#e2504b', flesh2: '#f47d6e', juice: '#e2504b', points: 12, leaf: false, shape: 'round' },
    { id: 'orange', r: 37, skin: '#e8912e', skin2: '#c46d18', flesh: '#f8b84c', flesh2: '#fbd07a', juice: '#f0a03a', points: 10, leaf: true, shape: 'round' },
    { id: 'lemon', r: 34, skin: '#e8c63c', skin2: '#c9a520', flesh: '#f6dd6c', flesh2: '#fbeaa0', juice: '#efd24d', points: 10, leaf: false, shape: 'lemon' },
    { id: 'kiwi', r: 32, skin: '#8a6540', skin2: '#66472a', flesh: '#96c65a', flesh2: '#c1e08a', juice: '#9ecb5e', points: 14, leaf: false, shape: 'round' },
    { id: 'strawberry', r: 31, skin: '#d8443d', skin2: '#a92b2a', flesh: '#f0736a', flesh2: '#f9a49b', juice: '#e0554c', points: 16, leaf: true, shape: 'berry' },
    { id: 'peach', r: 38, skin: '#efa07d', skin2: '#d97c5c', flesh: '#f9c58f', flesh2: '#fde0b4', juice: '#f0a878', points: 12, leaf: true, shape: 'round' }
  ];

  var W = 0, H = 0, dpr = 1, frameTs = 0, lastTs = 0;
  var state = 'idle';
  var elapsed = 0, spawnIn = 0, score = 0, lives = 3, best = 0, comboHits = 0;
  var fruits = [], halves = [], particles = [], floaters = [], trail = [], idleDecor = [];
  var isDown = false, lastPoint = null;
  var lastMissAt = -1e9;
  var colors = {};
  var hudCache = {}, comboTimer = null, shakeTimer = null;
  var soundOn = true, audio = null, master = null, noiseBuf = null;

  /* --- 存储 --------------------------------------------------------------- */
  try { best = parseInt(localStorage.getItem(BEST_KEY), 10) || 0; } catch (e) { best = 0; }
  try { soundOn = localStorage.getItem(SOUND_KEY) !== 'off'; } catch (e) { soundOn = true; }
  function saveBest(v) { try { localStorage.setItem(BEST_KEY, String(v)); } catch (e) {} }

  /* --- 外观变量 ------------------------------------------------------------ */
  function cssVar(cs, name, fallback) {
    var v = cs.getPropertyValue(name);
    return (v && v.trim()) || fallback;
  }
  function readColors() {
    var cs = window.getComputedStyle(document.documentElement);
    colors.paper = cssVar(cs, '--paper', '#f7f1e6');
    colors.paperLight = cssVar(cs, '--paper-light', '#fffaf1');
    colors.ink = cssVar(cs, '--ink', '#17211e');
    colors.muted = cssVar(cs, '--muted', '#6f766d');
    colors.line = cssVar(cs, '--line', 'rgba(23,33,30,.15)');
    colors.red = cssVar(cs, '--red', '#b84f38');
    colors.green = cssVar(cs, '--green', '#2e5d4d');
  }

  /* --- 音效（Web Audio 合成，不加载任何音频文件） --------------------------- */
  function ensureAudio() {
    if (!soundOn) return;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!audio) {
        audio = new AC();
        master = audio.createGain();
        master.gain.value = 0.5;
        master.connect(audio.destination);
        noiseBuf = audio.createBuffer(1, Math.floor(audio.sampleRate * 0.5), audio.sampleRate);
        var data = noiseBuf.getChannelData(0);
        for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      if (audio.state === 'suspended') audio.resume();
    } catch (e) {}
  }
  function tone(f1, f2, dur, type, vol) {
    if (!soundOn || !audio) return;
    var t = audio.currentTime;
    var o = audio.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    var g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noiseSweep(f1, f2, dur, vol) {
    if (!soundOn || !audio || !noiseBuf) return;
    var t = audio.currentTime;
    var s = audio.createBufferSource(); s.buffer = noiseBuf;
    var bp = audio.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 0.85;
    bp.frequency.setValueAtTime(f1, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(60, f2), t + dur);
    var g = audio.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }
  function playSlash() { noiseSweep(2200, 420, 0.16, 0.22); tone(680, 300, 0.12, 'triangle', 0.06); }
  function playMiss() { tone(240, 150, 0.18, 'sine', 0.10); }
  function playCombo() { tone(520, 780, 0.10, 'triangle', 0.10); window.setTimeout(function () { tone(780, 1040, 0.12, 'triangle', 0.10); }, 90); }
  function playBomb() { noiseSweep(900, 80, 0.45, 0.35); tone(110, 42, 0.42, 'sawtooth', 0.18); }
  function playEnd() { tone(420, 260, 0.30, 'sine', 0.08); }

  /* --- HUD ----------------------------------------------------------------- */
  function setText(node, key, value) {
    if (!node || hudCache[key] === value) return;
    node.textContent = value;
    hudCache[key] = value;
  }
  function updateHud() {
    setText(el.score, 'score', String(score));
    setText(el.time, 'time', String(Math.max(0, Math.ceil(GAME_SECONDS - elapsed))));
    setText(el.lives, 'lives', lives > 0 ? '♥ '.repeat(lives).trim() : '—');
    if (el.lives) el.lives.classList.toggle('is-low', lives === 1);
    setText(el.best, 'best', String(best));
  }
  function showCombo(n) {
    if (!el.combo) return;
    el.combo.textContent = n + ' COMBO!';
    el.combo.classList.remove('is-on');
    void el.combo.offsetWidth;
    el.combo.classList.add('is-on');
    window.clearTimeout(comboTimer);
    comboTimer = window.setTimeout(function () { el.combo.classList.remove('is-on'); }, 900);
  }
  function shake() {
    if (reduced && reduced.matches) return;
    stage.classList.remove('is-shaking');
    void stage.offsetWidth;
    stage.classList.add('is-shaking');
    window.clearTimeout(shakeTimer);
    shakeTimer = window.setTimeout(function () { stage.classList.remove('is-shaking'); }, 380);
  }

  /* --- 尺寸 ---------------------------------------------------------------- */
  function resize() {
    var r = stage.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width));
    H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    idleDecor = [
      { x: W * 0.24, y: H * 0.60, def: FRUITS[0], r: 34, rot: -0.18, phase: 0 },
      { x: W * 0.51, y: H * 0.40, def: FRUITS[1], r: 27, rot: 0.28, phase: 1.8 },
      { x: W * 0.77, y: H * 0.63, def: FRUITS[4], r: 24, rot: -0.10, phase: 3.2 }
    ];
  }

  /* --- 绘制：背景 ---------------------------------------------------------- */
  function drawBackground() {
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.55;
    var gap = 44;
    for (var x = gap; x < W; x += gap) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (var y = gap; y < H; y += gap) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = colors.muted;
    ctx.font = '700 10px sans-serif';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('FIELD NOTE / MELON SLASH', 16, H - 14);
    ctx.textAlign = 'right';
    ctx.fillText('60s · 3 LIVES', W - 16, H - 14);
    ctx.restore();
  }

  /* --- 绘制：完整水果 ------------------------------------------------------- */
  function fruitPath(def, r) {
    ctx.beginPath();
    if (def.shape === 'lemon') {
      ctx.ellipse(0, 0, r * 1.08, r * 0.84, 0, 0, TAU);
    } else if (def.shape === 'berry') {
      ctx.moveTo(0, r * 1.05);
      ctx.bezierCurveTo(-r * 1.24, r * 0.28, -r * 0.96, -r * 0.96, 0, -r * 0.72);
      ctx.bezierCurveTo(r * 0.96, -r * 0.96, r * 1.24, r * 0.28, 0, r * 1.05);
      ctx.closePath();
    } else {
      ctx.arc(0, 0, r, 0, TAU);
    }
  }
  function drawFruitShape(def, x, y, r, rot, alpha) {
    var a = alpha == null ? 1 : alpha;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.globalAlpha = a;

    ctx.beginPath();
    ctx.arc(3, 4, r, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.10)';
    ctx.fill();

    fruitPath(def, r);
    ctx.fillStyle = def.skin;
    ctx.fill();

    ctx.save();
    fruitPath(def, r);
    ctx.clip();
    if (def.id === 'watermelon') {
      ctx.strokeStyle = def.skin2;
      ctx.lineWidth = r * 0.15;
      for (var i = -2; i <= 2; i++) {
        var sx = i * r * 0.40;
        ctx.beginPath();
        ctx.moveTo(sx, -r * 1.2);
        ctx.quadraticCurveTo(sx + r * 0.18, 0, sx, r * 1.2);
        ctx.stroke();
      }
    } else if (def.id === 'kiwi') {
      ctx.fillStyle = 'rgba(60,40,20,.45)';
      for (var k = 0; k < 22; k++) {
        var ka = k * 2.399, kr = r * (0.30 + (k % 5) * 0.15);
        ctx.beginPath(); ctx.arc(Math.cos(ka) * kr, Math.sin(ka) * kr, 1.4, 0, TAU); ctx.fill();
      }
    } else if (def.id === 'orange' || def.id === 'lemon') {
      ctx.fillStyle = def.skin2;
      ctx.globalAlpha = a * 0.45;
      for (var o = 0; o < 26; o++) {
        var oa = o * 2.399, orr = r * (0.20 + (o % 6) * 0.13);
        ctx.beginPath(); ctx.arc(Math.cos(oa) * orr, Math.sin(oa) * orr, 1.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = a;
    } else if (def.id === 'strawberry') {
      ctx.fillStyle = '#f7dc82';
      for (var s = 0; s < 15; s++) {
        var sa = s * 2.399, sr = r * (0.22 + (s % 4) * 0.20);
        ctx.save();
        ctx.translate(Math.cos(sa) * sr, Math.sin(sa) * sr);
        ctx.rotate(sa);
        ctx.beginPath(); ctx.ellipse(0, 0, 1.5, 2.5, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    } else if (def.id === 'peach') {
      ctx.strokeStyle = def.skin2;
      ctx.lineWidth = r * 0.06;
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.quadraticCurveTo(r * 0.16, 0, 0, r); ctx.stroke();
    }
    ctx.restore();

    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.34, r * 0.30, r * 0.16, -0.55, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.28)';
    ctx.fill();

    fruitPath(def, r);
    ctx.lineWidth = Math.max(1.5, r * 0.055);
    ctx.strokeStyle = colors.ink;
    ctx.globalAlpha = a * 0.5;
    ctx.stroke();
    ctx.globalAlpha = a;

    if (def.leaf) {
      ctx.fillStyle = '#3f7a45';
      ctx.beginPath(); ctx.ellipse(-r * 0.22, -r * 0.94, r * 0.36, r * 0.14, -0.35, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.ellipse(r * 0.16, -r * 0.96, r * 0.32, r * 0.13, 0.35, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = def.skin2;
    ctx.fillRect(-r * 0.05, -r * 1.14, r * 0.10, r * 0.24);
    ctx.restore();
  }

  /* --- 绘制：切面纹理 ------------------------------------------------------- */
  function drawFleshDetail(def, r) {
    var i, a, rr;
    if (def.id === 'watermelon') {
      ctx.fillStyle = '#2b2320';
      for (i = 0; i < 8; i++) {
        a = i * 2.399; rr = r * (0.30 + (i % 3) * 0.19);
        ctx.save();
        ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr);
        ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.055, r * 0.09, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
    } else if (def.id === 'kiwi') {
      ctx.fillStyle = '#f1e8c8';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.19, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2f3a22';
      for (i = 0; i < 12; i++) {
        a = i * (TAU / 12); rr = r * 0.42;
        ctx.save(); ctx.translate(Math.cos(a) * rr, Math.sin(a) * rr); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, r * 0.035, r * 0.06, 0, 0, TAU); ctx.fill();
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1;
      for (i = 0; i < 10; i++) {
        a = i * (TAU / 10);
        ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
        ctx.lineTo(Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74); ctx.stroke();
      }
    } else if (def.id === 'orange' || def.id === 'lemon') {
      ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = r * 0.055;
      for (i = 0; i < 8; i++) {
        a = i * (TAU / 8);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,255,255,.6)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, TAU); ctx.fill();
    } else if (def.id === 'strawberry') {
      ctx.fillStyle = '#f7dc82';
      for (i = 0; i < 10; i++) {
        a = i * 2.399; rr = r * (0.25 + (i % 3) * 0.20);
        ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.045, 0, TAU); ctx.fill();
      }
    } else if (def.id === 'peach') {
      ctx.fillStyle = '#c9573f';
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.22, r * 0.30, 0, 0, TAU); ctx.fill();
    }
  }
  function halfPath(r, side) {
    ctx.beginPath();
    if (side > 0) ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    else ctx.arc(0, 0, r, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
  }
  function drawHalf(h) {
    var def = h.def, r = h.r, a = Math.max(0, Math.min(1, h.life));
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    ctx.globalAlpha = a;

    ctx.save();
    halfPath(r, h.side);
    ctx.clip();
    ctx.fillStyle = def.skin;
    ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.beginPath(); ctx.arc(0, 0, r - r * 0.12, 0, TAU);
    ctx.fillStyle = def.flesh; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r - r * 0.22, 0, TAU);
    ctx.fillStyle = def.flesh2; ctx.fill();
    drawFleshDetail(def, r);
    ctx.restore();

    ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(0, r);
    ctx.lineWidth = Math.max(1.5, r * 0.055);
    ctx.strokeStyle = colors.paperLight;
    ctx.stroke();
    halfPath(r, h.side);
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.strokeStyle = def.skin2;
    ctx.stroke();
    ctx.restore();
  }

  /* --- 绘制：炸弹 ----------------------------------------------------------- */
  function drawBomb(f) {
    var r = f.r;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.beginPath(); ctx.arc(3, 4, r, 0, TAU);
    ctx.fillStyle = 'rgba(0,0,0,.14)'; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU);
    ctx.fillStyle = colors.ink; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-r * 0.30, -r * 0.34, r * 0.22, r * 0.12, -0.5, 0, TAU);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.12, -r * 0.88);
    ctx.quadraticCurveTo(r * 0.48, -r * 1.36, r * 0.76, -r * 1.12);
    ctx.lineWidth = Math.max(2, r * 0.10);
    ctx.strokeStyle = colors.ink; ctx.stroke();
    ctx.beginPath();
    ctx.arc(r * 0.78, -r * 1.14, 3 + Math.abs(Math.sin(frameTs / 90)) * 3, 0, TAU);
    ctx.fillStyle = colors.red; ctx.fill();
    ctx.fillStyle = colors.paper;
    ctx.font = '700 ' + Math.round(r * 1.05) + 'px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('!', 0, r * 0.04);
    ctx.restore();
  }

  /* --- 绘制：粒子 / 飘分 / 刀光 ---------------------------------------------- */
  function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
      ctx.restore();
    }
  }
  function drawFloaters() {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = '700 19px ' + 'Georgia, serif';
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      ctx.globalAlpha = Math.max(0, f.life);
      ctx.fillStyle = f.color || colors.red;
      ctx.fillText(f.text, f.x, f.y - (1 - f.life) * 34);
    }
    ctx.restore();
  }
  function drawTrail() {
    if (trail.length < 2) return;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (var i = 1; i < trail.length; i++) {
      var a = trail[i - 1], b = trail[i];
      var k = Math.max(0, 1 - (frameTs - b.t) / TRAIL_MS);
      if (k <= 0) continue;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.globalAlpha = k * 0.85;
      ctx.strokeStyle = colors.red;
      ctx.lineWidth = 2 + 13 * k;
      ctx.stroke();
      if (k > 0.35) {
        ctx.globalAlpha = k * 0.9;
        ctx.strokeStyle = colors.paperLight;
        ctx.lineWidth = 1 + 3 * k;
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  function render() {
    drawBackground();
    if (state === 'idle') {
      for (var i = 0; i < idleDecor.length; i++) {
        var d = idleDecor[i];
        drawFruitShape(d.def, d.x, d.y + Math.sin(frameTs / 900 + d.phase) * 9,
          d.r, d.rot + Math.sin(frameTs / 1400 + d.phase) * 0.08, 0.75);
      }
    }
    for (var h = 0; h < halves.length; h++) drawHalf(halves[h]);
    for (var j = 0; j < fruits.length; j++) {
      var f = fruits[j];
      if (f.bomb) drawBomb(f);
      else drawFruitShape(f.def, f.x, f.y, f.r, f.rot, 1);
    }
    drawParticles();
    drawFloaters();
    drawTrail();
  }

  /* --- 玩法：生成 / 切中 / 漏切 ---------------------------------------------- */
  function gravity() { return H * 2; }
  /* 前期约 1.7s 一波、多为单个，给新手反应时间；接近 60s 时压到 0.62s 且成组出现 */
  function spawnInterval() { return Math.max(0.62, 2 - elapsed * 0.023); }
  function spawnWave() {
    var n = elapsed > 30 ? 1 + Math.floor(Math.random() * 3) : 1 + (Math.random() < 0.4 ? 1 : 0);
    var bombChance = elapsed > 12 ? Math.min(0.22, (elapsed - 12) / 140) : 0;
    var bombUsed = false;
    for (var i = 0; i < n; i++) {
      var isBomb = !bombUsed && Math.random() < bombChance;
      if (isBomb) bombUsed = true;
      var def = isBomb ? null : FRUITS[Math.floor(Math.random() * FRUITS.length)];
      var r = isBomb ? 31 : def.r;
      var x = W * (0.14 + Math.random() * 0.72);
      var peak = H * (0.58 + Math.random() * 0.26);
      var vy = -Math.sqrt(2 * gravity() * peak);
      var flight = 2 * Math.abs(vy) / gravity();
      var vx = (W * 0.5 - x) / flight * (0.35 + Math.random() * 0.5);
      fruits.push({
        x: x, y: H + r + 8, vx: vx, vy: vy, r: r, def: def, bomb: isBomb,
        rot: (Math.random() - 0.5) * 0.5, vr: (Math.random() - 0.5) * 2.2
      });
    }
  }
  function spawnJuice(f) {
    var n = reduced && reduced.matches ? 6 : 15;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = 55 + Math.random() * 230;
      particles.push({
        x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 55,
        r: 2 + Math.random() * 4, color: f.def.juice,
        life: 0.45 + Math.random() * 0.45, max: 0.9
      });
    }
    if (particles.length > 320) particles.splice(0, particles.length - 320);
  }
  function explode(f) {
    var n = reduced && reduced.matches ? 12 : 40;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * TAU, sp = 90 + Math.random() * 340;
      particles.push({
        x: f.x, y: f.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        r: 2 + Math.random() * 6, color: i % 3 === 0 ? colors.red : colors.ink,
        life: 0.6 + Math.random() * 0.5, max: 1.1
      });
    }
    shake();
    playBomb();
  }
  function cutFruit(f, ang) {
    var nx = -Math.sin(ang), ny = Math.cos(ang);
    var push = 95 + Math.random() * 55;
    [1, -1].forEach(function (s) {
      halves.push({
        x: f.x + nx * f.r * 0.26 * s, y: f.y + ny * f.r * 0.26 * s,
        vx: f.vx + nx * push * s + (Math.random() - 0.5) * 40,
        vy: f.vy + ny * push * s - 45,
        rot: ang + (s > 0 ? 0 : Math.PI), vr: (Math.random() - 0.5) * 3 + s * 1.6,
        r: f.r, def: f.def, side: s, life: 1.5
      });
    });
    spawnJuice(f);
    score += f.def.points;
    floaters.push({ x: f.x, y: f.y, text: '+' + f.def.points, color: colors.red, life: 1 });
    comboHits += 1;
    playSlash();
    updateHud();
  }
  function sliceCheck(a, b) {
    if (!a || !b) return;
    var dx = b.x - a.x, dy = b.y - a.y, len2 = dx * dx + dy * dy;
    if (len2 < 9) return;
    var ang = Math.atan2(dy, dx);
    for (var i = fruits.length - 1; i >= 0; i--) {
      var f = fruits[i];
      var t = ((f.x - a.x) * dx + (f.y - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      var px = a.x + t * dx, py = a.y + t * dy;
      if (Math.hypot(f.x - px, f.y - py) <= f.r * 0.94) {
        fruits.splice(i, 1);
        if (f.bomb) { explode(f); gameOver('bomb'); return; }
        cutFruit(f, ang);
      }
    }
  }

  /* --- 状态机 --------------------------------------------------------------- */
  function startGame() {
    ensureAudio();
    state = 'playing';
    elapsed = 0; spawnIn = 0.45; score = 0; lives = 3; comboHits = 0;
    fruits.length = 0; halves.length = 0; particles.length = 0;
    floaters.length = 0; trail.length = 0;
    isDown = false; lastPoint = null; lastTs = 0; lastMissAt = -1e9;
    hudCache = {};
    if (overlayStart) overlayStart.hidden = true;
    if (overlayEnd) overlayEnd.hidden = true;
    if (el.combo) el.combo.classList.remove('is-on');
    stage.dataset.gameState = 'playing';
    updateHud();
  }
  function gameOver(reason) {
    if (state !== 'playing') return;
    state = 'over';
    isDown = false; lastPoint = null; trail.length = 0;
    stage.dataset.gameState = 'over';
    var isNew = score > best;
    if (isNew) { best = score; saveBest(best); }
    setText(el.best, 'best', String(best));
    setText(el.endScore, 'endScore', String(score));
    setText(el.endBest, 'endBest', String(best));
    var copy = {
      time: { eyebrow: "TIME'S UP", title: '六十秒，<br><em>切得不错。</em>', note: score >= 200 ? '手起刀落，这一局很稳。' : '再快一点，连击会更高。' },
      lives: { eyebrow: 'OUT OF HEARTS', title: '手慢了，<br><em>再来一次？</em>', note: '漏掉的水果会扣心，横向划更容易救回来。' },
      bomb: { eyebrow: 'BOOM!', title: '碰到炸弹了，<br><em>下次绕开它。</em>', note: '黑色带引线的那颗，看见就躲。' }
    }[reason] || { eyebrow: 'GAME OVER', title: '这局，<br><em>切得不错。</em>', note: '' };
    if (el.endEyebrow) el.endEyebrow.textContent = copy.eyebrow;
    if (el.endTitle) el.endTitle.innerHTML = copy.title;
    if (el.endNote) el.endNote.textContent = isNew ? '新纪录！这一刀值了。' : copy.note;
    if (overlayEnd) overlayEnd.hidden = false;
    if (reason !== 'bomb') playEnd();
  }

  /* --- 更新 ----------------------------------------------------------------- */
  function update(dt) {
    var cutoff = frameTs - TRAIL_MS;
    while (trail.length && trail[0].t < cutoff) trail.shift();

    var i, o;
    for (i = halves.length - 1; i >= 0; i--) {
      o = halves[i];
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.vy += gravity() * 0.72 * dt;
      o.rot += o.vr * dt;
      o.life -= dt * 0.62;
      if (o.life <= 0 || o.y - o.r > H + 40) halves.splice(i, 1);
    }
    for (i = particles.length - 1; i >= 0; i--) {
      o = particles[i];
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.vy += gravity() * 0.55 * dt;
      o.life -= dt;
      if (o.life <= 0) particles.splice(i, 1);
    }
    for (i = floaters.length - 1; i >= 0; i--) {
      o = floaters[i];
      o.life -= dt * 1.05;
      if (o.life <= 0) floaters.splice(i, 1);
    }

    if (state !== 'playing') return;
    elapsed += dt;
    if (elapsed >= GAME_SECONDS) { gameOver('time'); return; }
    spawnIn -= dt;
    if (spawnIn <= 0) { spawnWave(); spawnIn = spawnInterval(); }

    for (i = fruits.length - 1; i >= 0; i--) {
      o = fruits[i];
      o.x += o.vx * dt; o.y += o.vy * dt;
      o.vy += gravity() * dt;
      o.rot += o.vr * dt;
      if (o.y - o.r > H + 14 && o.vy > 0) {
        fruits.splice(i, 1);
        if (!o.bomb) {
          /* 同一波水果几乎同时落地时只算一次失误，避免“一次手滑扣三条命” */
          if (frameTs - lastMissAt > 380) {
            lastMissAt = frameTs;
            lives -= 1;
            floaters.push({ x: Math.min(W - 40, Math.max(40, o.x)), y: H - 30, text: '-1 ♥', color: colors.muted, life: 1 });
            playMiss();
            updateHud();
            if (lives <= 0) { gameOver('lives'); return; }
          }
        }
      }
    }
    var sec = Math.max(0, Math.ceil(GAME_SECONDS - elapsed));
    setText(el.time, 'time', String(sec));
  }
  function frame(ts) {
    frameTs = ts;
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;
    update(dt);
    render();
    window.requestAnimationFrame(frame);
  }

  /* --- 输入 ----------------------------------------------------------------- */
  function pointFrom(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: window.performance.now() };
  }
  stage.addEventListener('pointerdown', function (e) {
    if (state !== 'playing') return;
    if (e.button !== 0 || e.isPrimary === false) return;
    e.preventDefault();
    isDown = true;
    comboHits = 0;
    var p = pointFrom(e);
    lastPoint = p;
    trail.length = 0;
    trail.push(p);
    if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (err) {} }
  });
  window.addEventListener('pointermove', function (e) {
    if (!isDown || state !== 'playing') return;
    var p = pointFrom(e);
    if (lastPoint && Math.hypot(p.x - lastPoint.x, p.y - lastPoint.y) < 2) return;
    trail.push(p);
    if (trail.length > 40) trail.shift();
    sliceCheck(lastPoint, p);
    lastPoint = p;
  }, { passive: true });
  function endStroke() {
    if (!isDown) return;
    isDown = false; lastPoint = null;
    if (state === 'playing' && comboHits >= 2) {
      showCombo(comboHits);
      score += comboHits * 5;
      playCombo();
      updateHud();
    }
  }
  window.addEventListener('pointerup', endStroke);
  window.addEventListener('pointercancel', endStroke);

  /* --- 控件 ----------------------------------------------------------------- */
  function updateSoundButton() {
    if (!el.sound) return;
    el.sound.textContent = '音效：' + (soundOn ? '开' : '关');
    el.sound.setAttribute('aria-pressed', String(soundOn));
  }
  if (el.sound) el.sound.addEventListener('click', function () {
    soundOn = !soundOn;
    try { localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off'); } catch (e) {}
    if (soundOn) ensureAudio();
    updateSoundButton();
  });
  ['data-start', 'data-restart', 'data-restart-overlay'].forEach(function (attr) {
    var btn = document.querySelector('[' + attr + ']');
    if (btn) btn.addEventListener('click', startGame);
  });
  document.addEventListener('keydown', function (e) {
    var tag = (document.activeElement || {}).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
    if ((e.key === ' ' || e.key === 'Spacebar') && state !== 'playing') {
      e.preventDefault();
      startGame();
    } else if (e.key === 'm' || e.key === 'M') {
      if (el.sound) el.sound.click();
    }
  });

  /* --- 初始化 --------------------------------------------------------------- */
  readColors();
  resize();
  updateHud();
  updateSoundButton();
  stage.dataset.gameState = 'idle';

  if (window.ResizeObserver) {
    new window.ResizeObserver(resize).observe(stage);
  } else {
    window.addEventListener('resize', resize);
  }
  window.addEventListener('orientationchange', function () { window.setTimeout(resize, 120); });
  if (window.MutationObserver) {
    new window.MutationObserver(readColors).observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-style', 'data-theme']
    });
  }
  window.requestAnimationFrame(frame);
}());
