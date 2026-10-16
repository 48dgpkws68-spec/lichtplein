/* Strapitec: auto-wisselende beelden, reveal, tellers, hover-tilt, kleurkeuze Diamond */
(function () {
  var root = document.querySelector('.stp');
  if (!root) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  setTimeout(function () { root.classList.add('go'); }, 60);

  // auto-wisselaar: elk [data-cycle] met meerdere <img> loopt oneindig door (crossfade + ken-burns)
  function cycle(el) {
    var imgs = [].slice.call(el.querySelectorAll('img')), n = imgs.length;
    if (!n) return;
    var ms = Math.max(3500, Math.min(4500, +el.dataset.cycle || 4000)), i = 0, timer = null, vis = false;
    el.style.setProperty('--kb', (ms + 1300) + 'ms');
    imgs[0].classList.add('on');
    if (RM || n < 2) return;
    var dots = document.createElement('div'); dots.className = 'stp-dots';
    imgs.forEach(function (im, k) {
      var b = document.createElement('button'); b.type = 'button';
      b.setAttribute('aria-label', 'Beeld ' + (k + 1) + ' van ' + n);
      b.addEventListener('click', function () { go(k); });
      dots.appendChild(b);
    });
    el.appendChild(dots);
    var btns = dots.children; btns[0].classList.add('on');
    function go(k) {
      if (k === i) { restart(); return; }
      imgs[i].classList.remove('on'); imgs[i].classList.add('out'); btns[i].classList.remove('on');
      var old = imgs[i];
      setTimeout(function () { old.classList.remove('out'); }, 1400);
      i = (k + n) % n;
      imgs[i].classList.remove('out'); imgs[i].classList.add('on'); btns[i].classList.add('on');
      // herstart de ken-burns-animatie
      imgs[i].style.animation = 'none'; void imgs[i].offsetWidth; imgs[i].style.animation = '';
      restart();
    }
    function restart() { stop(); if (vis) timer = setInterval(function () { go(i + 1); }, ms); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    new IntersectionObserver(function (en) { vis = en[0].isIntersecting; vis ? restart() : stop(); }, { threshold: .15 }).observe(el);
    el.stpGo = go;
  }
  root.querySelectorAll('[data-cycle]').forEach(cycle);

  // kleurkeuze Diamond: knop zet het bijbehorende beeld
  var dc = root.querySelector('#diamond-cycle');
  root.querySelectorAll('.stp-colors button').forEach(function (b) {
    b.addEventListener('click', function () {
      root.querySelectorAll('.stp-colors button').forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      if (dc && dc.stpGo) dc.stpGo(+b.dataset.pick);
    });
  });

  // reveal + tellers
  function fmt(v) { return Math.round(v).toLocaleString('nl-NL'); }
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (x) {
      if (!x.isIntersecting) return;
      x.target.classList.add('in'); io.unobserve(x.target);
      var b = x.target.querySelector('[data-count]');
      if (!b) return;
      var end = +b.dataset.count;
      if (RM) { b.textContent = fmt(end); return; }
      var t0 = performance.now();
      (function f(t) { var k = Math.min(1, (t - t0) / 1600); b.textContent = fmt(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(t0);
    });
  }, { threshold: .15 });
  root.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  // vangnet: als de observer (nog) niet vuurt, alles in beeld tonen bij scrollen of na het laden
  function sweep() { root.querySelectorAll('.rv:not(.in)').forEach(function (el) { var r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) { el.classList.add('in'); io.unobserve(el); var b = el.querySelector('[data-count]'); if (b && !b.dataset.done) { b.dataset.done = 1; b.textContent = fmt(+b.dataset.count); } } }); }
  addEventListener('scroll', sweep, { passive: true }); addEventListener('load', sweep); setTimeout(sweep, 1200);

  // hover-tilt op kaders en kaarten (alleen met muis)
  if (!RM && matchMedia('(hover:hover)').matches) {
    root.querySelectorAll('.stp-tilt').forEach(function (el) {
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--rx', (((e.clientX - r.left) / r.width - .5) * 8).toFixed(2));
        el.style.setProperty('--ry', (((e.clientY - r.top) / r.height - .5) * -8).toFixed(2));
      });
      el.addEventListener('pointerleave', function () { el.style.setProperty('--rx', 0); el.style.setProperty('--ry', 0); });
    });
  }
})();
