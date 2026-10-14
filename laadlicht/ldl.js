/* LUMIVOLT: loader, deeltjesveld, statuskleuren, hotspots, netconfigurator, dag/nacht, tabs, tellers */
(function () {
  var root = document.querySelector('.ldl');
  if (!root) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // loader
  var bar = root.querySelector('.ldl-bar i'), pct = root.querySelector('.ldl-pct'), p = 0;
  function tick() {
    p = Math.min(100, p + (RM ? 100 : 4 + Math.random() * 9));
    if (bar) bar.style.width = p + '%';
    if (pct) pct.textContent = Math.round(p) + '%';
    if (p < 100) setTimeout(tick, 45); else setTimeout(function () { root.classList.add('ready'); root.classList.add('go'); }, 150);
  }
  tick();

  // status
  var NAMES = { vrij: 'Vrij', stekker: 'Stekker erin', laden: 'Laden', vol: 'Vol', storing: 'Storing' };
  var COL = { vrij: ['#16C97A', '#7CFFB8'], stekker: ['#16C97A', '#7CFFB8'], laden: ['#2F8CFF', '#22E6FF'], vol: ['#FF9F1C', '#FFE066'], storing: ['#FF3B5C', '#FF8FA3'] };
  var manual = false;
  function setState(s) {
    root.dataset.state = s;
    root.querySelectorAll('.ldl-live').forEach(function (el) { el.textContent = NAMES[s]; });
    root.querySelectorAll('.ldl-states button').forEach(function (b) { b.setAttribute('aria-selected', b.dataset.s === s ? 'true' : 'false'); });
  }
  root.querySelectorAll('.ldl-states button').forEach(function (b) {
    b.addEventListener('click', function () { manual = true; setState(b.dataset.s); });
  });
  root.querySelectorAll('.ldl-led span').forEach(function (s, i) { s.style.setProperty('--i', i); });
  // automatische demo in de hero tot iemand zelf kiest
  var demo = ['laden', 'vrij', 'laden', 'stekker', 'laden', 'vol'], di = 0;
  if (!RM) setInterval(function () { if (!manual && window.scrollY < innerHeight * 0.8) setState(demo[di = (di + 1) % demo.length]); }, 4200);

  // deeltjesveld: lading die omhoog stroomt naar de mast
  var cv = root.querySelector('.ldl-field');
  if (cv && !RM) {
    var cx = cv.getContext('2d'), W, H, dpr = Math.min(devicePixelRatio || 1, 2), parts = [], mx = -999, my = -999;
    function size() { W = cv.clientWidth; H = cv.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    size(); addEventListener('resize', size);
    var N = innerWidth < 700 ? 60 : 140;
    for (var i = 0; i < N; i++) parts.push({ x: Math.random(), y: Math.random(), v: .0006 + Math.random() * .0022, r: .6 + Math.random() * 1.8, w: Math.random() * 6.28 });
    cv.parentElement.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; });
    var vis = true;
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; }).observe(cv);
    (function loop(t) {
      requestAnimationFrame(loop);
      if (!vis) return;
      var c = COL[root.dataset.state] || COL.laden;
      cx.clearRect(0, 0, W, H);
      var tx = W > 980 ? W * 0.72 : W * 0.5;
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i];
        q.y -= q.v; q.w += .02;
        if (q.y < -0.05) { q.y = 1.05; q.x = Math.random(); }
        var px = q.x * W + Math.sin(q.w) * 8, py = q.y * H;
        px += (tx - px) * (1 - q.y) * 0.25; // trekt naar de mast
        var dx = px - mx, dy = py - my, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) { px += dx / d * (120 - d) * .4; py += dy / d * (120 - d) * .4; }
        cx.beginPath(); cx.arc(px, py, q.r, 0, 6.28);
        cx.fillStyle = i % 3 ? c[1] : c[0];
        cx.globalAlpha = .25 + .6 * (1 - q.y);
        cx.shadowBlur = 12; cx.shadowColor = c[1];
        cx.fill();
      }
      cx.globalAlpha = 1;
    })();
  }

  // parallax + tilt
  var pole = root.querySelector('.ldl-pole'), det = root.querySelector('.ldl-detail-img img');
  if (!RM) {
    addEventListener('scroll', function () {
      var y = scrollY;
      if (pole) pole.style.setProperty('--py', (y * 0.12).toFixed(1));
      if (det) { var r = det.parentElement.getBoundingClientRect(); det.style.setProperty('--py', ((r.top - innerHeight / 2) * -0.06).toFixed(1)); }
    }, { passive: true });
    var hv = root.querySelector('.ldl-hero-visual');
    if (hv && pole) hv.addEventListener('pointermove', function (e) { var r = hv.getBoundingClientRect(); pole.style.setProperty('--rx', (((e.clientX - r.left) / r.width - .5) * 14).toFixed(2)); });
  }

  // reveal + tellers
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting) return;
      x.target.classList.add('in'); io.unobserve(x.target);
      var b = x.target.querySelector('[data-count]');
      if (b) { var end = +b.dataset.count, t0 = performance.now(); (function f(t) { var k = Math.min(1, (t - t0) / 1400); b.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0); }
    });
  }, { threshold: .18 });
  root.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });

  // secties zetten de kleur bij scrollen (tenzij zelf gekozen)
  var tones = [['#net', 'laden'], ['#straat', 'vrij'], ['#werking', 'stekker'], ['#praktijk', 'laden'], ['#aanvraag', 'laden']];
  var so = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting && !manual) setState(x.target.dataset.tone); }); }, { rootMargin: '-45% 0px -45% 0px' });
  tones.forEach(function (t) { var el = root.querySelector(t[0]); if (el) { el.dataset.tone = t[1]; so.observe(el); } });

  // hotspots
  var pop = root.querySelector('.ldl-pop');
  root.querySelectorAll('.hs').forEach(function (h) {
    h.setAttribute('aria-label', h.dataset.t);
    h.addEventListener('click', function () {
      root.querySelectorAll('.hs').forEach(function (o) { o.classList.toggle('on', o === h); });
      pop.innerHTML = '<b>' + h.dataset.t + '</b><span>' + h.dataset.d + '</span>';
    });
  });

  // netconfigurator
  var conf = root.querySelector('.ldl-conf');
  if (conf) {
    var flow = conf.querySelector('.flow');
    function pick(b) {
      conf.querySelectorAll('.ldl-conf-ctl button').forEach(function (o) { o.setAttribute('aria-checked', o === b ? 'true' : 'false'); });
      var s = +b.dataset.s;
      conf.querySelectorAll('.slave').forEach(function (n) { n.classList.toggle('off', +n.dataset.i > s); });
      var end = [150, 350, 580, 810][s];
      flow.setAttribute('d', 'M150 210 H' + end);
      conf.querySelector('.cn-p').textContent = 2 + s * 2;
      conf.querySelector('.cn-kw').textContent = b.dataset.kw;
      conf.querySelector('.cn-s').textContent = s;
      conf.querySelector('.cn-code').textContent = b.querySelector('span').textContent;
    }
    conf.querySelectorAll('.ldl-conf-ctl button').forEach(function (b) { b.addEventListener('click', function () { pick(b); }); });
    pick(conf.querySelector('[aria-checked=true]'));
  }

  // dag/nacht
  var dn = root.querySelector('.ldl-dn');
  if (dn) {
    var rg = dn.querySelector('input');
    rg.addEventListener('input', function () { dn.style.setProperty('--p', rg.value + '%'); });
    if (!RM) { var shown = false; new IntersectionObserver(function (en) { if (en[0].isIntersecting && !shown) { shown = true; var v = 50, d = -1, n = 0; (function sw() { v += d * 1.2; if (v < 22) d = 1; if (v > 78) d = -1; if (Math.abs(v - 50) < 1 && n++ > 1) { rg.value = 50; dn.style.setProperty('--p', '50%'); return; } rg.value = v; dn.style.setProperty('--p', v + '%'); requestAnimationFrame(sw); })(); } }, { threshold: .5 }).observe(dn); }
  }

  // tabs
  var tl = root.querySelector('.ldl-tablist');
  if (tl) tl.querySelectorAll('[role=tab]').forEach(function (t) {
    t.addEventListener('click', function () {
      tl.querySelectorAll('[role=tab]').forEach(function (o) { o.setAttribute('aria-selected', o === t ? 'true' : 'false'); document.getElementById(o.getAttribute('aria-controls')).hidden = o !== t; });
    });
  });
})();
