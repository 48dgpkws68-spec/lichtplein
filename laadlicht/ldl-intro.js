/* LUMIVOLT intro: motion-graphics film op canvas (±13 s), harde cuts tussen scènes, overslaan mogelijk */
(function () {
  var box = document.querySelector('.ldl-intro');
  var root = document.querySelector('.ldl');
  if (!box || !root) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('ldlIntro') === '1'; } catch (e) {}
  function finish() {
    if (box.classList.contains('out')) return;
    box.classList.add('out');
    document.documentElement.classList.remove('ldl-lock');
    try { sessionStorage.setItem('ldlIntro', '1'); } catch (e) {}
    root.classList.add('ready', 'go');
    setTimeout(function () { box.hidden = true; running = false; }, 900);
  }
  var running = false;
  if (RM || seen) { box.hidden = true; root.classList.add('ready', 'go'); }
  window.ldlReplay = function () { box.hidden = false; box.classList.remove('out'); start(); };
  box.querySelector('.ldl-skip').addEventListener('click', finish);
  addEventListener('keydown', function (e) { if (e.key === 'Escape' && running) finish(); });

  var cv = box.querySelector('canvas'), cx = cv.getContext('2d'), W, H, M, dpr;
  function size() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; M = Math.min(W, H); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', size);

  var pole = new Image(); pole.src = '/laadlicht/img/hero.webp';
  var C = { ink: '#05070c', cyan: '#22E6FF', blue: '#1530FF', amber: '#FF8A1F', lime: '#D7FF3A', white: '#F4F7FB', red: '#FF3B5C' };
  var DISP = '900 X "Unbounded", "Arial Black", sans-serif', SER = 'italic 400 X "Instrument Serif", Georgia, serif', MONO = '500 X "JetBrains Mono", Menlo, monospace';
  function f(tpl, px) { return tpl.replace('X', Math.round(px) + 'px'); }
  function cl(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function eo(t) { return 1 - Math.pow(1 - cl(t), 4); }          // ease out
  function ex(t) { t = cl(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } // expo out
  function eio(t) { t = cl(t); return t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2; }
  function bg(c) { cx.fillStyle = c; cx.fillRect(0, 0, W, H); }
  var T0 = 0, NOW = 0;

  // HUD in elke scène: dunne kaderlijnen en microtekst, zoals een motion-designer-interface
  function hud(col, label) {
    var pad = Math.max(16, M * .035), fs = Math.max(9, M * .016);
    cx.save(); cx.globalAlpha = .7; cx.strokeStyle = col; cx.fillStyle = col; cx.lineWidth = 1;
    cx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);
    cx.font = f(MONO, fs); cx.textBaseline = 'top';
    var s = (NOW / 1000).toFixed(2).padStart(5, '0');
    cx.textAlign = 'left'; cx.fillText('LUMIVOLT / LAADLICHT', pad + 10, pad + 10);
    cx.textAlign = 'right'; cx.fillText('00:' + s.replace('.', ':'), W - pad - 10, pad + 10);
    cx.textBaseline = 'bottom'; cx.fillText('LICHTPLEIN.NL', W - pad - 10, H - pad - 10);
    cx.textAlign = 'left'; cx.fillText(label || '2 × TYPE 2 · 22 KW · OCPP 1.6', pad + 10, H - pad - 10);
    // kleine kruisjes in de hoeken
    [[pad, pad], [W - pad, pad], [pad, H - pad], [W - pad, H - pad]].forEach(function (q) { cx.fillRect(q[0] - 4, q[1] - .5, 8, 1); cx.fillRect(q[0] - .5, q[1] - 4, 1, 8); });
    cx.restore();
  }

  // groot woord met motion blur: letters schieten van rechts binnen
  function fit(txt, size, frac) { cx.font = f(DISP, 100); return Math.min(size, W * (frac || .86) * 100 / cx.measureText(txt).width); }
  function word(txt, col, p, size, y) {
    size = fit(txt, size);
    cx.save(); cx.font = f(DISP, size); cx.textBaseline = 'middle'; cx.textAlign = 'left'; cx.fillStyle = col;
    var tw = cx.measureText(txt).width, x0 = (W - tw) / 2, x = x0;
    for (var i = 0; i < txt.length; i++) {
      var ch = txt[i], w = cx.measureText(ch).width, k = eo(p * 2.4 - i * .07), off = (1 - k) * W * .7;
      var blur = (1 - k);
      for (var j = 5; j >= 0; j--) { cx.globalAlpha = j === 0 ? 1 : blur * .16; cx.fillText(ch, x + off + j * blur * size * .35, y); }
      x += w;
    }
    cx.restore();
    return tw;
  }
  function serif(txt, col, size, y, a) { cx.save(); cx.globalAlpha = a; cx.font = f(SER, size); cx.fillStyle = col; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(txt, W / 2, y); cx.restore(); }
  function mono(txt, col, size, x, y, al, a) { cx.save(); cx.globalAlpha = a == null ? 1 : a; cx.font = f(MONO, size); cx.fillStyle = col; cx.textAlign = al || 'center'; cx.textBaseline = 'middle'; cx.fillText(txt, x, y); cx.restore(); }

  // starburst-icoon (bliksemster), gebruikt in scène 2 en in het logo
  function burst(x, y, R, k, rot, c1, c2, n) {
    n = n || 14;
    cx.save(); cx.translate(x, y); cx.rotate(rot); cx.lineCap = 'round';
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2, kk = ex(k * 1.3 - i * .02);
      var g = cx.createLinearGradient(0, 0, Math.cos(a) * R, Math.sin(a) * R); g.addColorStop(0, c1); g.addColorStop(1, c2);
      cx.strokeStyle = g; cx.lineWidth = R * .16;
      cx.beginPath(); cx.moveTo(Math.cos(a) * R * .12, Math.sin(a) * R * .12); cx.lineTo(Math.cos(a) * R * kk, Math.sin(a) * R * kk); cx.stroke();
    }
    cx.restore();
  }

  var SC = [
    // 0. stip en ring: het systeem start op
    [1.0, function (p) {
      bg(C.ink); hud('#7f8aa0', 'SYSTEEM START · 230/400 V');
      var r = M * .14;
      cx.strokeStyle = C.white; cx.lineWidth = 2; cx.beginPath(); cx.arc(W / 2, H / 2, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * eio(p * 1.4)); cx.stroke();
      var d = M * .018 * (1 + .25 * Math.sin(p * 30)) * (1 + 6 * Math.pow(cl((p - .78) / .22), 3));
      cx.fillStyle = C.white; cx.shadowColor = C.cyan; cx.shadowBlur = 30; cx.beginPath(); cx.arc(W / 2, H / 2, d, 0, 7); cx.fill(); cx.shadowBlur = 0;
      mono('VERBINDING MAKEN', '#9aa6ba', M * .02, W / 2, H / 2 + r + M * .07, 'center', .5 + .5 * Math.sin(p * 40));
    }],
    // 1. starburst: stroom slaat in
    [1.0, function (p) {
      bg(C.ink); hud('#7f8aa0', 'LADING · 32 A PER FASE');
      cx.save(); cx.strokeStyle = 'rgba(244,247,251,.25)'; cx.setLineDash([2, 10]); cx.lineWidth = 2;
      cx.beginPath(); cx.arc(W / 2, H / 2, M * .36, 0, 7); cx.stroke(); cx.restore();
      burst(W / 2, H / 2, M * .3, p, p * 1.1, C.amber, C.cyan);
      for (var i = 0; i < 24; i++) { var a = i / 24 * 6.283 - p * 2, rr = M * .36; cx.fillStyle = i % 6 ? 'rgba(244,247,251,.5)' : C.cyan; cx.fillRect(W / 2 + Math.cos(a) * rr - 2, H / 2 + Math.sin(a) * rr - 2, 4, 4); }
      if (p > .9) { cx.globalAlpha = (p - .9) * 8; bg(C.white); cx.globalAlpha = 1; }
    }],
    // 2. LADEN.
    [.75, function (p) {
      bg(C.cyan); hud(C.ink, '01 / LADEN');
      word('LADEN.', C.ink, p, Math.min(W * .19, H * .3), H * .47);
      serif('tot 22 kW, twee auto’s tegelijk', C.ink, Math.min(M * .055, W * .06), H * .47 + M * .2, eo(p * 2 - .4));
    }],
    // 3. LICHT.
    [.75, function (p) {
      bg(C.amber); hud(C.ink, '02 / LICHT');
      word('LICHT.', C.ink, p, Math.min(W * .19, H * .3), H * .47);
      serif('straatverlichting er bovenop', C.ink, Math.min(M * .055, W * .06), H * .47 + M * .2, eo(p * 2 - .4));
    }],
    // 4. laadgrafiek per variant
    [1.35, function (p) {
      bg('#0b0f1a'); hud('#7f8aa0', 'VERMOGEN PER VARIANT · KW');
      var rows = [['SPARK', 11, '3×25 A'], ['GLOW', 11, '3×35/40 A'], ['PULSE', 22, '3×50 A'], ['SURGE', 22, '3×63 A'], ['STORM', 22, '3×80 A']];
      var nar = W < 700, x0 = W * (nar ? .3 : .2), x1 = W * (nar ? .7 : .82), y0 = H * .3, gap = H * .1, fs = Math.max(10, M * .022);
      mono('Vermogen per contact, kW', C.white, M * .03, x0, H * .2, 'left', eo(p * 3));
      cx.strokeStyle = 'rgba(244,247,251,.08)'; cx.lineWidth = 1;
      for (var g = 0; g <= 4; g++) { var gx = x0 + (x1 - x0) * g / 4; cx.beginPath(); cx.moveTo(gx, y0 - gap * .5); cx.lineTo(gx, y0 + gap * 4.5); cx.stroke(); }
      rows.forEach(function (r, i) {
        var y = y0 + gap * i, k = eio(p * 1.8 - i * .1), len = (x1 - x0) * r[1] / 22 * k;
        mono(r[0], '#9aa6ba', fs, x0 - 16, y, 'right', 1);
        mono(r[2], '#5c677a', fs * .85, x0 - 16, y + fs * 1.2, 'right', 1);
        var gr = cx.createLinearGradient(x0, 0, x0 + len, 0); gr.addColorStop(0, 'rgba(34,230,255,.05)'); gr.addColorStop(1, C.cyan);
        cx.fillStyle = gr; cx.fillRect(x0, y - 2, len, 4);
        cx.fillStyle = C.white; cx.shadowColor = C.cyan; cx.shadowBlur = 16; cx.beginPath(); cx.arc(x0 + len, y, 6, 0, 7); cx.fill(); cx.shadowBlur = 0;
        mono(Math.round(r[1] * k) + ' kW', C.white, fs, x0 + len + 16, y, 'left', k);
      });
    }],
    // 5. blauw scherm: lamp met satellieten in een baan
    [1.45, function (p) {
      bg(C.blue); hud('#c5ceff', 'KERNMAST · 3 SATELLIETEN');
      var z = 1 + p * .12, r = M * .14 * z, orb = M * .3 * z, n = 12, lit = Math.min(8, Math.floor(eo(p * 1.4) * 8.99));
      var g = cx.createRadialGradient(W / 2 - r * .3, H / 2 - r * .3, r * .1, W / 2, H / 2, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#cfd6e6');
      cx.shadowColor = '#fff'; cx.shadowBlur = 60; cx.fillStyle = g; cx.beginPath(); cx.arc(W / 2, H / 2, r * eo(p * 3), 0, 7); cx.fill(); cx.shadowBlur = 0;
      for (var i = 0; i < n; i++) {
        var a = i / n * 6.283 + p * 1.6, on = i < lit;
        cx.fillStyle = on ? C.white : 'rgba(255,255,255,.35)'; cx.shadowColor = C.cyan; cx.shadowBlur = on ? 18 : 0;
        cx.beginPath(); cx.arc(W / 2 + Math.cos(a) * orb, H / 2 + Math.sin(a) * orb * .92, (on ? 7 : 5) * z, 0, 7); cx.fill();
      }
      cx.shadowBlur = 0;
      mono(String(lit).padStart(2, '0') + ' LAADPUNTEN', C.white, M * .028, W * .08 + 20, H / 2, 'left', 1);
      mono('1 AANSLUITING', '#c5ceff', M * .022, W * .92 - 20, H / 2, 'right', 1);
    }],
    // 6. kabelpatroon: tegels draaien als een stroomgolf erdoorheen trekt
    [1.25, function (p) {
      bg(C.ink);
      var s = Math.max(28, M / 11), cols = Math.ceil(W / s) + 1, rows = Math.ceil(H / s) + 1;
      cx.lineWidth = s * .16; cx.lineCap = 'round';
      for (var i = 0; i < cols; i++) for (var j = 0; j < rows; j++) {
        var hs = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, h = (hs - Math.floor(hs)) > .5 ? 1 : 0, x = i * s, y = j * s;
        var wave = eio((p * 2.2 - (i / cols) * 1.2) * 1.6), ang = (h + wave) * Math.PI / 2;
        var hot = wave > .02 && wave < .98;
        cx.strokeStyle = wave >= .98 ? C.amber : hot ? C.cyan : '#e9eef6';
        cx.save(); cx.translate(x + s / 2, y + s / 2); cx.rotate(ang); cx.translate(-s / 2, -s / 2);
        if (wave >= .98) cx.setLineDash([s * .18, s * .16]);
        cx.beginPath(); cx.arc(0, 0, s / 2, 0, Math.PI / 2); cx.stroke();
        cx.beginPath(); cx.arc(s, s, s / 2, Math.PI, Math.PI * 1.5); cx.stroke();
        cx.restore();
      }
      hud(C.white, 'NET · DAISY CHAIN OF STER');
    }],
    // 7. 3D-stippengolf: het net in de wijk
    [1.35, function (p) {
      bg('#070a12'); hud('#7f8aa0', 'DYNAMISCHE LOADBALANCING');
      var gx = 54, gz = 34, t = p * 7, hor = H * .3;
      for (var z = gz - 1; z >= 0; z--) for (var x = 0; x < gx; x++) {
        var X = (x / (gx - 1) - .5) * 3.2, Z = 1 + z / gz * 3.6;
        var d = Math.sqrt(X * X + (Z - 1.8) * (Z - 1.8)), Y = Math.sin(d * 3.2 - t) * .28 * eo(p * 2.5);
        var sx = W / 2 + X / Z * W * .5, sy = hor + (.75 - Y) / Z * H * .62;
        var b = cl(.5 + Y * 2), r = Math.max(1.2, 5 / Z);
        cx.fillStyle = 'rgba(' + Math.round(34 + 221 * b * b) + ',' + Math.round(200 + 55 * b) + ',255,' + ((.3 + .7 * b) * cl(1.5 - (Z - 1) / 4)).toFixed(3) + ')';
        cx.beginPath(); cx.arc(sx, sy, r / 2 + b * r * .4, 0, 7); cx.fill();
      }
      mono('KERNMAST → SATELLIET 1 → SATELLIET 2 → SATELLIET 3', C.white, Math.max(9, M * .02), W / 2, H * .18, 'center', eo(p * 3));
    }],
    // 8. woordflitsen
    [1.3, function (p) {
      var W4 = [['TWEE', C.lime, C.ink], ['PALEN?', C.ink, C.white], ['NOOIT', C.cyan, C.ink], ['MEER.', C.amber, C.ink]];
      var i = Math.min(3, Math.floor(p * 4)), q = p * 4 - i, w = W4[i];
      bg(w[1]); hud(w[2], '0' + (i + 3) + ' / ÉÉN MAST');
      var sc = 1 + .18 * (1 - eo(q * 3));
      cx.save(); cx.translate(W / 2, H / 2); cx.scale(sc, sc); cx.translate(-W / 2, -H / 2);
      cx.font = f(DISP, fit(w[0], Math.min(W * .2, H * .32))); cx.fillStyle = w[2]; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText(w[0], W / 2, H / 2);
      cx.restore();
    }],
    // 9. product: scanlijn onthult de mast, met specificatielabels
    [1.6, function (p) {
      bg(C.ink);
      var g = cx.createRadialGradient(W / 2, H * .6, 0, W / 2, H * .6, M * .7); g.addColorStop(0, 'rgba(34,140,255,.35)'); g.addColorStop(1, 'rgba(5,7,12,0)'); cx.fillStyle = g; cx.fillRect(0, 0, W, H);
      hud('#7f8aa0', 'LUMIVOLT · 1735 × Ø330 MM · 58 KG');
      if (pole.complete && pole.naturalWidth) {
        var ih = H * .86, iw = ih * pole.naturalWidth / pole.naturalHeight, ix = W / 2 - iw / 2, iy = H * .07;
        var k = eio(p * 1.5), cut = iy + ih * (1 - k);
        cx.save(); cx.beginPath(); cx.rect(0, cut, W, H); cx.clip(); cx.globalCompositeOperation = 'lighten'; cx.drawImage(pole, ix, iy, iw, ih); cx.restore();
        if (k < 1) { cx.fillStyle = C.cyan; cx.shadowColor = C.cyan; cx.shadowBlur = 24; cx.fillRect(W * .25, cut - 1, W * .5, 2); cx.shadowBlur = 0; }
        var tags = [['22 KW', .72, .66, -1], ['IK10 · IP54', .5, .8, 1], ['OCPP 1.6', .3, .62, 1], ['LED-ARMATUUR', .12, .05, -1]];
        tags.forEach(function (t, i) {
          var a = eo((p - .45 - i * .08) * 5); if (a <= 0) return;
          var ty = iy + ih * t[2], tx = W / 2 + t[3] * iw * .05, ex2 = tx + t[3] * Math.min(M * (.12 + .1 * a), iw * .28 + 30);
          cx.strokeStyle = 'rgba(34,230,255,' + a + ')'; cx.lineWidth = 1; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(ex2, ty); cx.stroke();
          cx.fillStyle = C.cyan; cx.beginPath(); cx.arc(tx, ty, 3, 0, 7); cx.fill();
          mono(t[0], C.white, Math.max(10, M * .022), ex2 + t[3] * 10, ty, t[3] > 0 ? 'left' : 'right', a);
        });
      }
    }],
    // 10. logo-lockup
    [1.8, function (p) {
      bg(C.cyan); hud(C.ink, 'LAADLICHT BY LICHTPLEIN');
      cx.font = f(DISP, 100); var size = Math.min(H * .2, W * .78 / (cx.measureText('LUMIVOLT').width / 100 + 1.1)), y = H * .46;
      cx.font = f(DISP, size); var tw = cx.measureText('LUMIVOLT').width, R = size * .42;
      var total = tw + R * 2.6, x0 = (W - total) / 2;
      burst(x0 + R, y, R, eo(p * 2.2), p * 2.5, C.ink, C.ink, 12);
      cx.save(); cx.font = f(DISP, size); cx.textBaseline = 'middle'; cx.fillStyle = C.ink;
      var x = x0 + R * 2.6, txt = 'LUMIVOLT';
      for (var i = 0; i < txt.length; i++) {
        var w = cx.measureText(txt[i]).width, k = eo(p * 2.6 - .2 - i * .06), bl = 1 - k;
        for (var j = 4; j >= 0; j--) { cx.globalAlpha = (j === 0 ? 1 : bl * .2) * cl(k * 3); cx.fillText(txt[i], x + bl * size * .8 + j * bl * size * .3, y); }
        x += w;
      }
      cx.restore();
      serif('laadlicht, de lantaarnpaal die laadt', C.ink, size * .38, y + size * .85, eo(p * 2.5 - .9));
      if (p > .82) { var a = (p - .82) / .18; cx.fillStyle = 'rgba(5,7,12,' + a + ')'; cx.beginPath(); cx.arc(W / 2, H / 2, Math.hypot(W, H) * eio(a), 0, 7); cx.fill(); }
    }]
  ];
  var TOTAL = SC.reduce(function (s, x) { return s + x[0]; }, 0);
  var bar = box.querySelector('.ldl-intro-bar i');

  function frame(ts) {
    if (!running) return;
    if (!T0) T0 = ts;
    NOW = ts - T0;
    var t = NOW / 1000;
    if (t >= TOTAL) { finish(); return; }
    var acc = 0, idx = 0;
    while (idx < SC.length - 1 && t >= acc + SC[idx][0]) { acc += SC[idx][0]; idx++; }
    var p = (t - acc) / SC[idx][0];
    cx.save(); SC[idx][1](p); cx.restore();
    // korte witte flits op elke harde cut
    if (p < .06 && idx > 0) { cx.fillStyle = 'rgba(255,255,255,' + (1 - p / .06) * .55 + ')'; cx.fillRect(0, 0, W, H); }
    if (bar) bar.style.transform = 'scaleX(' + (t / TOTAL) + ')';
    requestAnimationFrame(frame);
  }
  window.ldlDraw = function (t) { running = false; box.hidden = false; box.classList.remove('out'); size(); NOW = t * 1000; var acc = 0, idx = 0; while (idx < SC.length - 1 && t >= acc + SC[idx][0]) { acc += SC[idx][0]; idx++; } cx.save(); SC[idx][1]((t - acc) / SC[idx][0]); cx.restore(); return idx; };
  function start() {
    size(); T0 = 0; running = true;
    document.documentElement.classList.add('ldl-lock');
    var go = function () { requestAnimationFrame(frame); };
    if (document.fonts && document.fonts.load) Promise.race([Promise.all([document.fonts.load(f(DISP, 40)), document.fonts.load(f(SER, 40)), document.fonts.load(f(MONO, 12))]), new Promise(function (r) { setTimeout(r, 1200); })]).then(go); else go();
  }
  if (!RM && !seen) start();
})();
