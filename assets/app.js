/* Lichtplein: navigatie, zoeken, offertelijst, filters, productpagina. Geen frameworks. */
(function () {
  "use strict";
  var LANG = document.documentElement.lang === "en" ? "en" : "nl";
  var P = LANG === "en" ? "/en" : "";
  var T = {
    nl: { added: "Toegevoegd aan offerte", none: "Geen resultaten", each: "per stuk", set: "per set", req: "op aanvraag", results: "resultaten", empty: "Uw offertelijst is nog leeg", rm: "Verwijder" },
    en: { added: "Added to quote", none: "No results", each: "each", set: "per set", req: "on request", results: "results", empty: "Your quote list is still empty", rm: "Remove" }
  }[LANG];
  var KEY = "lp-offerte";
  var VARIANTS = window.LP_VARIANTS || {};
  var SHOP = "5wkm0h-xs.myshopify.com";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function eur(v) { return v == null ? T.req : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- offertelijst (localStorage) ---- */
  function readQ() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function writeQ(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} badge(); }
  function addQ(sku, qty) { var it = readQ(), ex = it.filter(function (i) { return i.sku === sku; })[0]; if (ex) ex.qty += qty; else it.push({ sku: sku, qty: qty }); writeQ(it); toast(T.added); }
  function badge() { var n = readQ().length; $$(".quote-link .n").forEach(function (b) { b.textContent = n; b.classList.toggle("show", n > 0); }); }
  var toastEl;
  function toast(msg) { if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; document.body.appendChild(toastEl); } toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastEl.t); toastEl.t = setTimeout(function () { toastEl.classList.remove("show"); }, 1800); }
  badge();

  /* ---- menu ---- */
  var burger = $(".burger"), drawer = $(".drawer");
  if (burger && drawer) {
    var toggle = function (open) { drawer.classList.toggle("open", open); burger.setAttribute("aria-expanded", open); document.body.style.overflow = open ? "hidden" : ""; };
    burger.addEventListener("click", function () { toggle(!drawer.classList.contains("open")); });
    $$(".drawer .scrim, .drawer .close", drawer).forEach(function (el) { el.addEventListener("click", function () { toggle(false); }); });
  }

  /* ---- zoekindex ---- */
  var INDEX = null, loading = null;
  function index() {
    if (INDEX) return Promise.resolve(INDEX);
    if (!loading) loading = fetch("/data/zoek.json").then(function (r) { return r.json(); }).then(function (d) { INDEX = d; return d; });
    return loading;
  }
  function name(p) { return LANG === "en" && p.en ? p.en : p.nl; }
  function url(p) { return P + "/product/" + p.sku.toLowerCase() + "/"; }
  function search(q, items, limit) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    for (var i = 0; i < items.length && out.length < limit; i++) {
      var p = items[i], hay = (p.sku + " " + p.nl + " " + (p.en || "") + " " + p.s + " " + p.g + " " + (p.f || "")).toLowerCase();
      var ok = true;
      for (var j = 0; j < terms.length; j++) if (hay.indexOf(terms[j]) < 0) { ok = false; break; }
      if (ok) out.push(p);
    }
    return out;
  }
  function row(p) {
    return '<a href="' + url(p) + '"><img src="' + (p.i ? "/img/p/" + p.i : "/img/blank.svg") + '" alt="" loading="lazy"><span>' + esc(name(p)) + '<small>' + esc(p.s) + " · " + esc(p.sku) + '</small></span><span class="price">' + (p.p != null ? eur(p.p) : T.req) + "</span></a>";
  }
  $$(".search").forEach(function (box) {
    var inp = $("input", box), res = document.createElement("div"); res.className = "results"; box.appendChild(res);
    var run = function () {
      var q = inp.value.trim();
      if (q.length < 2) { res.classList.remove("open"); return; }
      index().then(function (items) {
        var hits = search(q, items, 12);
        res.innerHTML = hits.length ? hits.map(row).join("") : '<div class="none">' + T.none + "</div>";
        res.classList.add("open");
      });
    };
    inp.addEventListener("input", run);
    inp.addEventListener("focus", function () { index(); if (inp.value.trim().length >= 2) run(); });
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); location.href = P + "/assortiment/?q=" + encodeURIComponent(inp.value.trim()); } if (e.key === "Escape") res.classList.remove("open"); });
    document.addEventListener("click", function (e) { if (!box.contains(e.target)) res.classList.remove("open"); });
  });

  /* ---- assortiment: zoeken over alles ---- */
  var all = $("#zoek-alles");
  if (all) {
    var q = new URLSearchParams(location.search).get("q") || "";
    var inp2 = $("#zoek-input"), out2 = $("#zoek-resultaten");
    inp2.value = q;
    var render = function () {
      var v = inp2.value.trim();
      if (v.length < 2) { out2.innerHTML = ""; all.hidden = true; return; }
      index().then(function (items) {
        var hits = search(v, items, 60);
        all.hidden = false;
        $("#zoek-aantal").textContent = hits.length + " " + T.results;
        out2.innerHTML = hits.length ? hits.map(function (p) { return card(p); }).join("") : '<div class="empty">' + T.none + "</div>";
      });
    };
    inp2.addEventListener("input", render);
    render();
    if (q) inp2.focus();
  }
  function card(p) {
    return '<a class="card" href="' + url(p) + '"><div class="shot">' + (p.i ? '<img src="/img/p/' + p.i + '" alt="" loading="lazy" width="480" height="480">' : '<span class="none">' + esc(p.s) + "</span>") + '<span class="tag">' + esc(p.s) + '</span></div><div class="body"><div class="name">' + esc(name(p)) + '</div><div class="foot"><div><div class="from">' + esc(p.g) + '</div><div class="price">' + (p.p != null ? eur(p.p) : T.req) + "</div></div></div></div></a>";
  }

  /* ---- seriepagina: filters ---- */
  var cat = $("[data-catalog]");
  if (cat) {
    var cards = $$(".card[data-sku]", cat), count = $("#aantal"), sort = $("#sort"), text = $("#filter-tekst"), empty = $("#leeg");
    var boxes = $$(".filters input[type=checkbox]");
    var apply = function () {
      var active = {};
      boxes.forEach(function (b) { if (b.checked) (active[b.name] = active[b.name] || []).push(b.value); });
      var t = (text ? text.value : "").trim().toLowerCase();
      var shown = 0;
      cards.forEach(function (c) {
        var ok = true;
        Object.keys(active).forEach(function (k) { var v = c.getAttribute("data-" + k) || ""; if (active[k].indexOf(v) < 0) ok = false; });
        if (ok && t && (c.getAttribute("data-zoek") || "").indexOf(t) < 0) ok = false;
        c.style.display = ok ? "" : "none";
        if (ok) shown++;
      });
      if (count) count.textContent = shown + " " + T.results;
      if (empty) empty.hidden = shown > 0;
      if (sort && sort.value !== "std") {
        var grid = cards[0] && cards[0].parentNode, dir = sort.value === "up" ? 1 : -1;
        cards.slice().sort(function (a, b) { var pa = parseFloat(a.getAttribute("data-prijs")) || 1e9, pb = parseFloat(b.getAttribute("data-prijs")) || 1e9; return (pa - pb) * dir; }).forEach(function (c) { grid.appendChild(c); });
      } else if (sort) {
        var g2 = cards[0] && cards[0].parentNode; cards.forEach(function (c) { g2.appendChild(c); });
      }
    };
    boxes.forEach(function (b) { b.addEventListener("change", apply); });
    if (sort) sort.addEventListener("change", apply);
    if (text) text.addEventListener("input", apply);
    var clr = $(".filters .clear"); if (clr) clr.addEventListener("click", function (e) { e.preventDefault(); boxes.forEach(function (b) { b.checked = false; }); if (text) text.value = ""; apply(); });
    var ft = $(".filter-toggle"); if (ft) ft.addEventListener("click", function () { $(".filters").classList.toggle("open"); });
    var pre = new URLSearchParams(location.search).get("groep");
    if (pre) boxes.forEach(function (b) { if (b.name === "groep" && b.value === pre) b.checked = true; });
    apply();
  }

  /* ---- productpagina ---- */
  var pdp = $("[data-product]");
  if (pdp) {
    var sku = pdp.getAttribute("data-product"), price = parseFloat(pdp.getAttribute("data-prijs")), moq = parseInt(pdp.getAttribute("data-moq"), 10) || 1, step = parseInt(pdp.getAttribute("data-step"), 10) || 1;
    var out = $("#qty"), sub = $("#subtotaal"), qty = moq;
    var upd = function () { out.value = qty; out.textContent = qty; if (sub) sub.textContent = isNaN(price) ? T.req : eur(price * qty); var co = $("#checkout"); if (co) co.href = "https://" + SHOP + "/cart/" + VARIANTS[sku] + ":" + qty; $$(".pricebox tr").forEach(function (tr) { var min = parseInt(tr.getAttribute("data-min"), 10); if (!isNaN(min)) tr.classList.toggle("on", qty >= min && qty < parseInt(tr.getAttribute("data-max"), 10)); }); };
    var minus = $("#min"), plus = $("#plus");
    if (minus) minus.addEventListener("click", function () { qty = Math.max(moq, qty - step); upd(); });
    if (plus) plus.addEventListener("click", function () { qty += step; upd(); });
    var add = $("#add"); if (add) add.addEventListener("click", function () { addQ(sku, qty); });
    var quick = $("#quick"); if (quick) quick.addEventListener("click", function () { addQ(sku, qty); location.href = P + "/offerte/"; });
    if (VARIANTS[sku]) { var co2 = $("#checkout"); if (co2) co2.hidden = false; }
    upd();
    var main = $(".gallery .main img"), thumbs = $$(".gallery .thumbs button");
    thumbs.forEach(function (b) { b.addEventListener("click", function () { main.src = b.getAttribute("data-src"); thumbs.forEach(function (x) { x.removeAttribute("aria-current"); }); b.setAttribute("aria-current", "true"); }); });
  }

  /* ---- offertepagina ---- */
  var qp = $("#offerte");
  if (qp) {
    var list = $("#qlist"), form = $("#qform"), tot = $("#qtotaal"), emptyBox = $("#qleeg"), hidden = $("#q-artikelen"), totIn = $("#q-totaal");
    var draw = function () {
      var items = readQ();
      index().then(function (idx) {
        var by = {}; idx.forEach(function (p) { by[p.sku] = p; });
        var rows = items.filter(function (i) { return by[i.sku]; });
        if (!rows.length) { emptyBox.hidden = false; qp.hidden = true; return; }
        emptyBox.hidden = true; qp.hidden = false;
        var total = 0, lines = [];
        list.innerHTML = rows.map(function (i) {
          var p = by[i.sku], line = p.p != null ? p.p * i.qty : null; if (line) total += line;
          lines.push(i.qty + "x " + p.sku + " " + name(p) + (p.p != null ? " (" + eur(p.p) + ")" : " (" + T.req + ")"));
          return '<div class="qrow"><img src="' + (p.i ? "/img/p/" + p.i : "/img/blank.svg") + '" alt=""><div><a class="name" href="' + url(p) + '">' + esc(name(p)) + '</a><small>' + esc(p.sku) + " · " + (p.p != null ? eur(p.p) + " " + (p.u === "set" ? T.set : T.each) : T.req) + '</small></div><input type="number" min="1" value="' + i.qty + '" data-sku="' + p.sku + '" aria-label="Aantal"><div class="line">' + (line != null ? eur(line) : T.req) + '</div><button class="rm" data-sku="' + p.sku + '" aria-label="' + T.rm + '">&times;</button></div>';
        }).join("");
        tot.textContent = eur(total);
        if (hidden) hidden.value = lines.join("\n");
        if (totIn) totIn.value = eur(total) + " excl. btw";
        var ids = rows.filter(function (i) { return VARIANTS[i.sku]; }).map(function (i) { return VARIANTS[i.sku] + ":" + i.qty; });
        var co = $("#q-checkout"); if (co) { co.hidden = !ids.length; co.href = "https://" + SHOP + "/cart/" + ids.join(","); }
        $$("input[data-sku]", list).forEach(function (inp) { inp.addEventListener("change", function () { var v = Math.max(1, parseInt(inp.value, 10) || 1); writeQ(readQ().map(function (x) { return x.sku === inp.getAttribute("data-sku") ? { sku: x.sku, qty: v } : x; })); draw(); }); });
        $$(".rm", list).forEach(function (b) { b.addEventListener("click", function () { writeQ(readQ().filter(function (x) { return x.sku !== b.getAttribute("data-sku"); })); draw(); }); });
      });
    };
    var clear = $("#qclear"); if (clear) clear.addEventListener("click", function () { writeQ([]); draw(); });
    draw();
    if (form) form.addEventListener("submit", function () { setTimeout(function () { writeQ([]); }, 800); });
  }
  if (new URLSearchParams(location.search).get("verzonden")) { var n = $("#verzonden"); if (n) n.hidden = false; }

  /* ---- beweging: sterrenveld, parallax, tilt, stagger ---- */
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cv = $(".hero .stars");
  if (cv && !reduce && cv.getContext) {
    var ctx = cv.getContext("2d"), pts = [], W, H, mx = -1, my = -1;
    var size = function () { W = cv.width = cv.offsetWidth * devicePixelRatio; H = cv.height = cv.offsetHeight * devicePixelRatio; };
    size(); window.addEventListener("resize", size);
    for (var i = 0; i < 90; i++) pts.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4, vx: (Math.random() - .5) * .00025, vy: (Math.random() - .5) * .00025, a: Math.random() * Math.PI * 2 });
    cv.parentNode.addEventListener("mousemove", function (e) { var b = cv.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width; my = (e.clientY - b.top) / b.height; });
    cv.parentNode.addEventListener("mouseleave", function () { mx = my = -1; });
    var t = 0, draw = function () {
      t += .016; ctx.clearRect(0, 0, W, H);
      if (mx >= 0) { var g = ctx.createRadialGradient(mx * W, my * H, 0, mx * W, my * H, W * .22); g.addColorStop(0, "rgba(61,139,255,.16)"); g.addColorStop(1, "rgba(61,139,255,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0 || p.x > 1) p.vx *= -1; if (p.y < 0 || p.y > 1) p.vy *= -1;
        var tw = .55 + .45 * Math.sin(t * 1.3 + p.a);
        ctx.beginPath(); ctx.arc(p.x * W, p.y * H, p.r * devicePixelRatio, 0, Math.PI * 2); ctx.fillStyle = "rgba(127,208,255," + (tw * .8) + ")"; ctx.shadowColor = "rgba(61,139,255,.9)"; ctx.shadowBlur = 8 * devicePixelRatio; ctx.fill();
        for (var j = i + 1; j < pts.length; j++) { var q = pts[j], dx = (p.x - q.x) * W, dy = (p.y - q.y) * H, d = dx * dx + dy * dy, lim = (110 * devicePixelRatio) * (110 * devicePixelRatio); if (d < lim) { ctx.shadowBlur = 0; ctx.strokeStyle = "rgba(61,139,255," + (.18 * (1 - d / lim)) + ")"; ctx.lineWidth = devicePixelRatio; ctx.beginPath(); ctx.moveTo(p.x * W, p.y * H); ctx.lineTo(q.x * W, q.y * H); ctx.stroke(); } }
      }
      if (document.visibilityState === "visible" && cv.getBoundingClientRect().bottom > 0) requestAnimationFrame(draw); else setTimeout(function () { requestAnimationFrame(draw); }, 400);
    };
    requestAnimationFrame(draw);
  }
  var par = $("[data-parallax] .hero-cards");
  if (par && !reduce) {
    var hero = $(".hero");
    hero.addEventListener("mousemove", function (e) { var b = hero.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; par.style.transform = "perspective(900px) rotateY(" + (x * 7) + "deg) rotateX(" + (-y * 7) + "deg) translate3d(" + (x * 10) + "px," + (y * 10) + "px,0)"; });
    hero.addEventListener("mouseleave", function () { par.style.transform = ""; });
  }
  if (!reduce) $$(".tilt").forEach(function (el) {
    el.addEventListener("mousemove", function (e) { var b = el.getBoundingClientRect(), x = (e.clientX - b.left) / b.width - .5, y = (e.clientY - b.top) / b.height - .5; el.style.setProperty("--ry", (x * 10) + "deg"); el.style.setProperty("--rx", (-y * 10) + "deg"); });
    el.addEventListener("mouseleave", function () { el.style.setProperty("--ry", "0deg"); el.style.setProperty("--rx", "0deg"); });
  });
  $$(".grid, .series, .tiles, .steps, .serie-list").forEach(function (g) { Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty("--i", i % 12); if (!c.classList.contains("rv")) c.classList.add("rv"); }); });

  /* ---- reveal ---- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function (el) { io.observe(el); });
  } else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }

  /* ---- teller ---- */
  $$("[data-count]").forEach(function (el) {
    var to = parseInt(el.getAttribute("data-count"), 10), suf = el.getAttribute("data-suffix") || "", t0 = null;
    var tick = function (ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 1400); var v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = v.toLocaleString(LANG === "en" ? "en-GB" : "nl-NL") + suf; if (k < 1) requestAnimationFrame(tick); };
    if ("IntersectionObserver" in window) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { requestAnimationFrame(tick); o.disconnect(); } }); o.observe(el); } else el.textContent = to + suf;
  });
})();
