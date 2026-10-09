/* Lichtplein: navigatie, zoeken, offertelijst, filters, productpagina. Geen frameworks. */
(function () {
  "use strict";
  var LANG = { en: "en", de: "de" }[document.documentElement.lang] || "nl";
  var P = { en: "/en", de: "/de" }[LANG] || "";
  var LOC = "nl-NL";
  var T = {
    nl: { added: "Toegevoegd aan offerte", none: "Geen resultaten", each: "per stuk", set: "per set", req: "op aanvraag", results: "resultaten", empty: "Uw offertelijst is nog leeg", rm: "Verwijder", art: "Kennisbank", proj: "projectprijs op aanvraag", unknown: "onbekend artikelnummer", min: "min.", added_n: "artikelen toegevoegd aan uw offerte", note: "Graag een projectprijs voor de aantallen in deze lijst.", add: "+ Toevoegen" },
    en: { added: "Added to quote", none: "No results", each: "each", set: "per set", req: "on request", results: "results", empty: "Your quote list is still empty", rm: "Remove", art: "Knowledge base", proj: "project price on request", unknown: "unknown item number", min: "min.", added_n: "items added to your quote", note: "Please quote a project price for the quantities in this list.", add: "+ Add" },
    de: { added: "Zum Angebot hinzugefügt", none: "Keine Ergebnisse", each: "je Stück", set: "je Set", req: "auf Anfrage", results: "Ergebnisse", empty: "Ihre Angebotsliste ist noch leer", rm: "Entfernen", art: "Wissen", proj: "Projektpreis auf Anfrage", unknown: "unbekannte Artikelnummer", min: "mind.", added_n: "Artikel zum Angebot hinzugefügt", note: "Bitte einen Projektpreis für die Mengen in dieser Liste.", add: "+ Hinzufügen" }
  }[LANG];
  var KEY = "lp-offerte";
  var VARIANTS = window.LP_VARIANTS || {};
  var SHOP = "5wkm0h-xs.myshopify.com";

  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function eur(v) { return v == null ? T.req : new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v); }
  var PACK = { nl: "verpakt per", en: "packed per", de: "verpackt je" }[LANG], ROUNDED = { nl: "afgerond naar", en: "rounded up to", de: "aufgerundet auf" }[LANG];
  function norm(q, moqv) { moqv = moqv || 1; q = Math.max(1, parseInt(q, 10) || 1); if (q < moqv) return moqv; return moqv > 1 ? Math.ceil(q / moqv) * moqv : q; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* ---- offertelijst (localStorage) ---- */
  function readQ() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function writeQ(items) { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {} badge(); }
  function addQ(sku, qty, moqv) { if (moqv) { var n2 = norm(qty, moqv); if (n2 !== qty) { toast(T.added + " (" + ROUNDED + " " + n2 + ", " + PACK + " " + moqv + ")"); qty = n2; } else toast(T.added); } else toast(T.added); var it = readQ(), ex = it.filter(function (i) { return i.sku === sku; })[0]; if (ex) ex.qty += qty; else it.push({ sku: sku, qty: qty }); writeQ(it); }
  function badge() { var n = readQ().length; $$(".quote-link .n").forEach(function (b) { b.textContent = n; b.classList.toggle("show", n > 0); }); }
  var toastEl;
  function toast(msg) { if (!toastEl) { toastEl = document.createElement("div"); toastEl.className = "toast"; toastEl.setAttribute("role", "status"); document.body.appendChild(toastEl); } toastEl.textContent = msg; toastEl.classList.add("show"); clearTimeout(toastEl.t); toastEl.t = setTimeout(function () { toastEl.classList.remove("show"); }, 3200); }
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
  function name(p) { return (LANG !== "nl" && p[LANG]) ? p[LANG] : p.nl; }
  function url(p) { return p.a ? P + "/kennis/" + p.a + "/" : P + "/product/" + p.sku.toLowerCase() + "/"; }
  function isMast(p) { return p.s === "TURRIS" || (p.s === "CIVIS" && /mast/i.test(p.nl)); }
  function byIndex(cb) { index().then(function (idx) { var by = {}; idx.forEach(function (p) { if (p.sku) by[p.sku] = p; }); cb(by, idx); }); }
  function miniHtml(p, qty) {
    return '<div class="mini" data-sku="' + p.sku + '" data-moq="' + p.m + '"><a class="shot" href="' + url(p) + '">' + (p.i ? '<img src="/img/p/' + p.i + '" alt="" loading="lazy" width="120" height="120">' : "") + '</a><div class="mb"><a class="name" href="' + url(p) + '">' + esc(name(p)) + '</a><div class="pr">' + (p.p != null ? eur(p.p) + " <small>" + (p.u === "set" ? T.set : T.each) + "</small>" : T.req) + '</div></div><button class="btn btn-sm add-bundle" type="button" data-sku="' + p.sku + '" data-qty="' + (qty || p.m) + '">' + T.add + "</button></div>";
  }
  function search(q, items, limit) {
    var terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    var out = [];
    for (var i = 0; i < items.length && out.length < limit; i++) {
      var p = items[i], hay = (p.sku + " " + p.nl + " " + (p.en || "") + " " + (p.de || "") + " " + p.s + " " + p.g + " " + (p.f || "") + (p.a ? " " + T.art : "")).toLowerCase();
      var ok = true;
      for (var j = 0; j < terms.length; j++) if (hay.indexOf(terms[j]) < 0) { ok = false; break; }
      if (ok) out.push(p);
    }
    return out;
  }
  function row(p) {
    if (p.a) return '<a href="' + url(p) + '"><img src="' + (p.i ? "/img/p/" + p.i : "/img/blank.svg") + '" alt="" loading="lazy"><span>' + esc(name(p)) + '<small>' + T.art + (p.s ? " · " + esc(p.s) : "") + '</small></span><span class="price">&rarr;</span></a>';
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
        out2.innerHTML = hits.length ? hits.filter(function (p) { return !p.a; }).map(function (p) { return card(p); }).join("") : '<div class="empty">' + T.none + "</div>";
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
    var out = $("#qty"), sub = $("#subtotaal"), qty = moq, packEl = $("#pack");
    var tier2 = parseInt(pdp.getAttribute("data-tier2"), 10) || 100, hint = parseInt(pdp.getAttribute("data-hint"), 10) || 10, ups = $("#upsell-qty");
    var upd = function () { out.value = qty; if (sub) sub.textContent = isNaN(price) ? T.req : (qty >= tier2 ? T.proj : eur(price * qty)); var co = $("#checkout"); if (co) { co.href = "https://" + SHOP + "/cart/" + VARIANTS[sku] + ":" + qty; co.hidden = !VARIANTS[sku] || qty >= tier2; } $$(".pricebox tr").forEach(function (tr) { var min = parseInt(tr.getAttribute("data-min"), 10); if (!isNaN(min)) tr.classList.toggle("on", qty >= min && qty < parseInt(tr.getAttribute("data-max"), 10)); }); if (ups) ups.hidden = qty < hint; $$(".mini[data-sync] .add-bundle").forEach(function (b) { b.setAttribute("data-qty", qty); }); };
    var minus = $("#min"), plus = $("#plus");
    if (minus) minus.addEventListener("click", function () { qty = Math.max(moq, qty - step); upd(); });
    if (plus) plus.addEventListener("click", function () { qty += step; upd(); });
    out.addEventListener("change", function () { var v = norm(out.value, moq); if (packEl) packEl.hidden = !(moq > 1 && v !== parseInt(out.value, 10)); qty = v; upd(); });
    out.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); out.blur(); } });
    var add = $("#add"); if (add) add.addEventListener("click", function () { addQ(sku, qty); });
    var quick = $("#quick"); if (quick) quick.addEventListener("click", function () { addQ(sku, qty); location.href = P + "/offerte/"; });
    document.body.classList.add("has-sticky");
    var go = $("#upsell-go"); if (go) go.addEventListener("click", function () { addQ(sku, qty); location.href = P + "/offerte/?project=1"; });
    var pr = $("#print"); if (pr) pr.addEventListener("click", function () { window.print(); });
    var st = $("#sticky-buy"), sa = $("#sticky-add"), act = $(".actions");
    if (st && act && "IntersectionObserver" in window) { new IntersectionObserver(function (es) { st.classList.toggle("show", !es[0].isIntersecting && es[0].boundingClientRect.top < 0); }).observe(act); }
    if (sa) sa.addEventListener("click", function () { addQ(sku, qty); });
    $$(".add-all").forEach(function (b) { b.addEventListener("click", function () { addQ(sku, qty); var first = $('.minis[data-group="' + b.getAttribute("data-group") + '"] .mini'); if (first) { addQ(first.getAttribute("data-sku"), qty, parseInt(first.getAttribute("data-moq"), 10) || 1); } location.href = P + "/offerte/"; }); });
    upd();
    var main = $(".gallery .main img"), thumbs = $$(".gallery .thumbs button");
    thumbs.forEach(function (b) { b.addEventListener("click", function () { main.src = b.getAttribute("data-src"); thumbs.forEach(function (x) { x.removeAttribute("aria-current"); }); b.setAttribute("aria-current", "true"); }); });
  }

  /* ---- bundelknoppen (productpagina, offertepagina) ---- */
  document.addEventListener("click", function (ev) {
    var b = ev.target.closest && ev.target.closest(".add-bundle"); if (!b) return;
    var mini = b.closest(".mini"), moqv = parseInt(mini && mini.getAttribute("data-moq"), 10) || 1, q = parseInt(b.getAttribute("data-qty"), 10) || moqv;
    addQ(b.getAttribute("data-sku"), q, moqv); b.textContent = "\u2713"; setTimeout(function () { b.textContent = T.add; }, 1400);
    if (typeof window.__qdraw === "function") window.__qdraw();
  });

  /* ---- kennisbank: categorietabs ---- */
  var kt = $("#ktabs");
  if (kt) {
    var want = new URLSearchParams(location.search).get("cat") || "";
    var applyK = function () { var n = 0; $$("#kgrid .art-card").forEach(function (c) { var ok = !want || c.getAttribute("data-cat") === want; c.hidden = !ok; if (ok) n++; }); $$("#ktabs .tab").forEach(function (t) { t.classList.toggle("on", (t.getAttribute("data-cat") || "") === want); }); var le = $("#kleeg"); if (le) le.hidden = n > 0; };
    $$("#ktabs .tab").forEach(function (t) { t.addEventListener("click", function () { want = t.getAttribute("data-cat") || ""; history.replaceState(null, "", want ? "?cat=" + want : location.pathname); applyK(); }); });
    applyK();
  }

  /* ---- snel bestellen ---- */
  var sin = $("#snel-in");
  if (sin) {
    var sout = $("#snel-uit"), sadd = $("#snel-add"), parsed = [];
    var parse = function (by) {
      parsed = [];
      return sin.value.split(/\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
        var m = l.match(/([A-Za-z]{2}-?[A-Za-z]{2}\d{3})/), sku = m ? m[1].toUpperCase().replace(/^([A-Z]{2})([A-Z]{2})/, "$1-$2") : "", rest = l.replace(m ? m[0] : "", "").replace(/[;,\t]/g, " ").trim(), q = parseInt(rest, 10);
        var p = by[sku];
        if (p) { var qq = isNaN(q) || q < 1 ? p.m : norm(q, p.m); parsed.push({ sku: sku, qty: qq }); return { ok: true, p: p, q: qq, line: l, rounded: !isNaN(q) && qq !== q }; }
        return { ok: false, line: l };
      });
    };
    $("#snel-check").addEventListener("click", function () {
      byIndex(function (by) {
        var rows = parse(by);
        sout.innerHTML = '<table class="snel specs"><thead><tr><th scope="col">#</th><th scope="col">' + (LANG === "en" ? "Item" : "Artikel") + '</th><th scope="col">' + (LANG === "en" ? "Qty" : LANG === "de" ? "Menge" : "Aantal") + '</th><th scope="col">' + (LANG === "en" ? "Price" : LANG === "de" ? "Preis" : "Prijs") + '</th></tr></thead><tbody>' + rows.map(function (r, i) {
          return r.ok ? '<tr><td>' + (i + 1) + '</td><td><a href="' + url(r.p) + '">' + esc(r.p.sku) + '</a> ' + esc(name(r.p)) + '</td><td>' + r.q + ' <small class="muted">(' + (r.rounded ? ROUNDED + " " + r.q + ", " : "") + T.min + " " + r.p.m + ')</small></td><td>' + (r.p.p != null ? eur(r.p.p * r.q) : T.req) + '</td></tr>'
                      : '<tr class="bad"><td>' + (i + 1) + '</td><td colspan="3">' + esc(r.line) + ' <small>' + T.unknown + "</small></td></tr>";
        }).join("") + "</tbody></table>";
        sadd.hidden = !parsed.length; sadd.textContent = (LANG === "en" ? "Add " : LANG === "de" ? "" : "Zet ") + parsed.length + (LANG === "en" ? " items to quote" : LANG === "de" ? " Artikel zum Angebot" : " artikelen in offerte");
      });
    });
    sadd.addEventListener("click", function () { parsed.forEach(function (x) { addQ(x.sku, x.qty); }); location.href = P + "/offerte/"; });
  }

  /* ---- offertepagina ---- */
  var qp = $("#offerte");
  if (qp) {
    var list = $("#qlist"), form = $("#qform"), tot = $("#qtotaal"), emptyBox = $("#qleeg"), hidden = $("#q-artikelen"), totIn = $("#q-totaal");
    var BUND = null;
    var suggest = function (rows, by) {
      var box = $("#q-sugg"), list = $("#q-sugg-list"); if (!box) return;
      var go = function (B) {
        var have = {}; rows.forEach(function (r) { have[r.sku] = r.qty; });
        var out = [], seen = {};
        var push = function (sku, qty) { if (!have[sku] && !seen[sku] && by[sku]) { seen[sku] = 1; out.push(miniHtml(by[sku], qty)); } };
        rows.forEach(function (r) {
          var b = B[r.sku]; if (!b) return;
          if (b.lum && !rows.some(function (x) { return B[x.sku] && B[x.sku].mast; })) b.lum.slice(0, 2).forEach(function (s) { push(s, r.qty); });
          if (b.box && !rows.some(function (x) { return /^LP-NX10[12]$/.test(x.sku); })) push(b.box[0], r.qty);
          if (b.mast && !rows.some(function (x) { return B[x.sku] && B[x.sku].lum; })) b.mast.slice(0, 2).forEach(function (s) { push(s, r.qty); });
        });
        list.innerHTML = out.slice(0, 4).join(""); box.hidden = !out.length;
      };
      if (BUND) go(BUND); else fetch("/data/bundels.json").then(function (r) { return r.json(); }).then(function (B) { BUND = B; go(B); }).catch(function () {});
    };
    var draw = function () {
      var items = readQ();
      index().then(function (idx) {
        var by = {}; idx.forEach(function (p) { if (p.sku) by[p.sku] = p; });
        var rows = items.filter(function (i) { return by[i.sku]; });
        var pj = $("#q-project");
        if (!rows.length) { emptyBox.hidden = false; qp.hidden = true; return; }
        emptyBox.hidden = true; qp.hidden = false;
        var big = rows.some(function (i) { return i.qty >= (isMast(by[i.sku]) ? 20 : 100); }), tot0 = 0; rows.forEach(function (i) { if (by[i.sku].p != null) tot0 += by[i.sku].p * i.qty; });
        var wantProj = big || tot0 >= 2500 || new URLSearchParams(location.search).get("project") === "1";
        if (pj) pj.hidden = !wantProj;
        var opm = $("#f5"); if (wantProj && opm && !opm.value) opm.value = T.note;
        suggest(rows, by);
        var total = 0, lines = [];
        list.innerHTML = rows.map(function (i) {
          var p = by[i.sku], line = p.p != null ? p.p * i.qty : null; if (line) total += line;
          lines.push(i.qty + "x " + p.sku + " " + name(p) + (p.p != null ? " (" + eur(p.p) + ")" : " (" + T.req + ")"));
          return '<div class="qrow"><img src="' + (p.i ? "/img/p/" + p.i : "/img/blank.svg") + '" alt=""><div><a class="name" href="' + url(p) + '">' + esc(name(p)) + '</a><small>' + esc(p.sku) + " · " + (p.p != null ? eur(p.p) + " " + (p.u === "set" ? T.set : T.each) : T.req) + '</small></div><input type="number" min="' + p.m + '" step="' + (p.m > 1 ? p.m : 1) + '" value="' + i.qty + '" data-sku="' + p.sku + '" aria-label="Aantal"><div class="line">' + (line != null ? eur(line) : T.req) + '</div><button class="rm" data-sku="' + p.sku + '" aria-label="' + T.rm + '">&times;</button></div>';
        }).join("");
        tot.textContent = eur(total);
        if (hidden) hidden.value = lines.join("\n");
        if (totIn) totIn.value = eur(total) + ({ nl: " excl. btw", en: " excl. VAT", de: " zzgl. MwSt." }[LANG]);
        var ids = rows.filter(function (i) { return VARIANTS[i.sku]; }).map(function (i) { return VARIANTS[i.sku] + ":" + i.qty; });
        var allOk = ids.length === rows.length && !big;
        var co = $("#q-checkout"); if (co) { co.hidden = !allOk; co.href = "https://" + SHOP + "/cart/" + ids.join(","); }
        var cn = $("#q-chk-note"); if (cn) cn.hidden = allOk || !ids.length;
        $$("input[data-sku]", list).forEach(function (inp) { inp.addEventListener("change", function () { var v = norm(inp.value, by[inp.getAttribute("data-sku")].m); writeQ(readQ().map(function (x) { return x.sku === inp.getAttribute("data-sku") ? { sku: x.sku, qty: v } : x; })); draw(); }); });
        $$(".rm", list).forEach(function (b) { b.addEventListener("click", function () { writeQ(readQ().filter(function (x) { return x.sku !== b.getAttribute("data-sku"); })); draw(); }); });
      });
    };
    var clear = $("#qclear"); if (clear) clear.addEventListener("click", function () { if (confirm(clear.getAttribute("data-confirm") || "?")) { writeQ([]); draw(); } });
    var pjb = $("#q-project-btn"); if (pjb) pjb.addEventListener("click", function () { var f = $("#f1"); if (f) f.focus(); });
    window.__qdraw = draw;
    var qa = $("#q-add"); if (qa) qa.addEventListener("click", function () { var v = ($("#q-sku").value || "").trim().toUpperCase().replace(/^([A-Z]{2})([A-Z]{2}\d)/, "$1-$2$3"), n = parseInt($("#q-qty").value, 10) || 1; byIndex(function (by) { if (by[v]) { addQ(v, n, by[v].m); $("#q-sku").value = ""; draw(); } else toast(T.unknown); }); });
    var qs = $("#q-sku"); if (qs) qs.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); qa.click(); } });
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

  /* ---- marquee: pauzeren (touch, toetsenbord, knop) ---- */
  $$(".marquee").forEach(function (m) {
    var kids = Array.prototype.slice.call(m.querySelector(".track").children), half = kids.length / 2;
    kids.slice(half).forEach(function (c) { c.setAttribute("aria-hidden", "true"); c.setAttribute("tabindex", "-1"); });
    m.addEventListener("touchstart", function () { m.classList.add("paused"); }, { passive: true });
  });
  var mqb = $(".mq-pause");
  if (mqb) mqb.addEventListener("click", function () { var on = !$(".marquee").classList.contains("paused"); $$(".marquee").forEach(function (m) { m.classList.toggle("paused", on); }); mqb.setAttribute("aria-pressed", on); mqb.textContent = on ? mqb.getAttribute("data-play") : mqb.getAttribute("data-pause"); });

  /* ---- filters: aria ---- */
  var ftb = $(".filter-toggle"); if (ftb) ftb.addEventListener("click", function () { ftb.setAttribute("aria-expanded", $(".filters").classList.contains("open")); });

  /* ---- reveal ---- */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    $$(".rv").forEach(function (el) { io.observe(el); });
  } else { $$(".rv").forEach(function (el) { el.classList.add("in"); }); }

  /* ---- teller ---- */
  $$("[data-count]").forEach(function (el) {
    var to = parseInt(el.getAttribute("data-count"), 10), suf = el.getAttribute("data-suffix") || "", t0 = null;
    var tick = function (ts) { if (!t0) t0 = ts; var k = Math.min(1, (ts - t0) / 1400); var v = Math.round(to * (1 - Math.pow(1 - k, 3))); el.textContent = v.toLocaleString(LOC) + suf; if (k < 1) requestAnimationFrame(tick); };
    if ("IntersectionObserver" in window) { var o = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { requestAnimationFrame(tick); o.disconnect(); } }); o.observe(el); } else el.textContent = to + suf;
  });
})();
