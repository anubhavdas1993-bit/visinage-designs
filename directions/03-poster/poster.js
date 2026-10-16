/* Direction three: the poster. Page logic shared by index.html, radar.html and article.html.
   All words and numbers come from window.VISINAGE (lib/content.js + lib/content-phase-b.js).
   One frame loop per page: GSAP's ticker drives the ScrollTrigger scrub and the count-ups; everything else is
   IntersectionObserver or CSS transitions. Canvases are capped at a device pixel ratio of 1.5 where this file sizes them. */
(function () {
  "use strict";
  const V = window.VISINAGE, VC = window.VCharts, VA = window.VArt, VM = window.VMotion;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mqPhone = window.matchMedia("(max-width: 767px)");
  const touch = window.matchMedia("(hover: none)").matches;
  const G = (window.gsap && window.ScrollTrigger) ? window.gsap : null;
  if (G) G.registerPlugin(window.ScrollTrigger);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const COL = { off: "#F1F5F7", navy: "#082C4C", red: "#E8324F", cyan: "#1FA3D6", yellow: "#F4C518", grey: "#A7B3BF", rule: "#D3DAE0" };
  const RGB = { navy: [8, 44, 76], red: [232, 50, 79], cyan: [31, 163, 214], yellow: [244, 197, 24] };
  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  const ROT = [-3, 2, -1.5, 3, -2.5, 1, -1, 2.5];
  /* Literal photograph paths (one per file in assets/img), so build_artifact.py can embed them as data URIs for the hosted copy;
     a data-URI photograph is same-origin, which is what lets WebGL read it as a texture. */
  const SRC = { "office-people.jpg": "../../assets/img/office-people.jpg", "city-aerial.jpg": "../../assets/img/city-aerial.jpg", "highway-aerial.jpg": "../../assets/img/highway-aerial.jpg",
    "industrial.jpg": "../../assets/img/industrial.jpg", "crowd-lights.jpg": "../../assets/img/crowd-lights.jpg", "desk-hands.jpg": "../../assets/img/desk-hands.jpg", "london-night.jpg": "../../assets/img/london-night.jpg",
    "times-square.jpg": "../../assets/img/times-square.jpg", "manhattan.jpg": "../../assets/img/manhattan.jpg", "stairs-figure.jpg": "../../assets/img/stairs-figure.jpg", "turbines-road.jpg": "../../assets/img/turbines-road.jpg" };
  const IMG_DIR = "../../assets/img/";
  const src = file => SRC[file] || (IMG_DIR + file);
  const NAV_H = 72;
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  /* Run a measurement now, again once the display face has actually loaded (fonts.ready can resolve before Archivo is requested), and once more as a backstop */
  function whenFonts(fn) { fn(); if (document.fonts) { try { document.fonts.load('900 100px "Archivo"').then(fn, fn); document.fonts.ready.then(fn); } catch (e) { /* no font loading API */ } } setTimeout(fn, 2500); }

  /* Photograph per topic, with its duotone pair: navy + red (Labour, Macroeconomics), navy + cyan (Cities, Climate), navy + yellow (Public finance) */
  const PHOTO = { "Labour": [V.photos.labour, "red"], "Macroeconomics": [V.photos.macro, "red"], "Cities": [V.photos.cities, "cyan"], "Climate": [V.photos.climate, "cyan"],
    "Public finance": [V.photos.publicFinance, "yellow"], "Housing": [V.photos.housing, "cyan"], "Technology": [V.photos.technology, "red"], "Sport": [V.photos.publicFinance, "yellow"],
    "Methods": [V.photos.about, "cyan"], "Inequality": [V.photos.lead, "red"], "Trade": [V.photos.manhattan, "cyan"] };
  const photoFor = topic => PHOTO[topic] || [V.photos.lead, "red"];
  const duoImg = (file, tone, w, h, extra) => `<img class="duo duo--${tone}" data-file="${file}" data-tone="${tone}" src="${src(file)}" width="${w || 1400}" height="${h || 875}" alt="" loading="lazy" decoding="async"${extra || ""}>`;

  /* Duotone as a cached canvas pass. Each photograph is drawn once per (file, tone) with compositing operations only
     (desaturate, multiply by the colour, lighten by navy), so it works from file:// where pixels cannot be read back;
     every placement then gets a cheap copy. A static canvas composites for free on scroll, where a CSS reference filter
     would be re-rasterised in software as the image enters the viewport. The CSS filter stays as the no-script look. */
  const duoCache = {};
  const TONE = { red: COL.red, cyan: COL.cyan, yellow: COL.yellow };
  function duoCanvasFor(file, tone, img) {
    const key = file + "|" + tone; if (duoCache[key]) return duoCache[key];
    const w = 900, h = Math.round(w * (img.naturalHeight || 875) / (img.naturalWidth || 1400));
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    x.drawImage(img, 0, 0, w, h);
    x.globalCompositeOperation = "saturation"; x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "multiply"; x.fillStyle = TONE[tone] || COL.red; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "lighten"; x.fillStyle = COL.navy; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = "source-over";
    duoCache[key] = c; return c;
  }
  /* one canvas per task, after an asynchronous decode, so a row of photographs entering the viewport never costs a long frame */
  const duoQueue = []; let duoBusy = false;
  function duoPump() { const fn = duoQueue.shift(); if (!fn) { duoBusy = false; return; } duoBusy = true; fn(); setTimeout(duoPump, 0); }
  function duotoneOne(img, now) {
    if (img.dataset.duoDone) return; img.dataset.duoDone = "1";
    const draw = () => { try {
      const base = duoCanvasFor(img.dataset.file, img.dataset.tone, img);
      const cv = document.createElement("canvas"); cv.width = base.width; cv.height = base.height; cv.getContext("2d").drawImage(base, 0, 0);
      cv.className = "duo-canvas"; cv.setAttribute("aria-hidden", "true"); cv.style.objectFit = "cover";
      img.replaceWith(cv);
    } catch (e) { /* keep the filtered img */ } };
    const go = () => { if (now) { draw(); return; } duoQueue.push(draw); if (!duoBusy) duoPump(); };
    const ready = () => { if (img.decode && !now) img.decode().then(go, go); else go(); };
    if (img.complete && img.naturalWidth) ready(); else img.addEventListener("load", ready, { once: true });
  }
  function duotonePass() {
    const imgs = $$("img.duo"); if (!imgs.length) return;
    const hero = imgs.filter(i => i.closest(".stage-fb")); hero.forEach(i => duotoneOne(i, true));
    const rest = imgs.filter(i => !i.closest(".stage-fb"));
    if (!("IntersectionObserver" in window)) { rest.forEach(duotoneOne); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { duotoneOne(e.target); io.unobserve(e.target); } }), { rootMargin: "900px 0px" });
    rest.forEach(i => io.observe(i));
  }
  const stamp = (text, i, cls) => `<span class="stamp ${cls || ""}" style="--rot:${ROT[(i || 0) % ROT.length]}deg">${text}</span>`;

  /* Duotone as an SVG filter: desaturate, add contrast, then map luminance 0 to navy and 1 to the second colour. Works from file:// (no canvas read-back). */
  function duoDefs() {
    const f = (id, c) => { const t = ch => `${(RGB.navy[ch] / 255).toFixed(3)} ${(c[ch] / 255).toFixed(3)}`;
      return `<filter id="${id}" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/>` +
        `<feComponentTransfer><feFuncR type="linear" slope="1.35" intercept="-0.14"/><feFuncG type="linear" slope="1.35" intercept="-0.14"/><feFuncB type="linear" slope="1.35" intercept="-0.14"/></feComponentTransfer>` +
        `<feComponentTransfer><feFuncR type="table" tableValues="${t(0)}"/><feFuncG type="table" tableValues="${t(1)}"/><feFuncB type="table" tableValues="${t(2)}"/></feComponentTransfer></filter>`; };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "svg-defs"); svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `<defs>${f("duo-navy-red", RGB.red)}${f("duo-navy-cyan", RGB.cyan)}${f("duo-navy-yellow", RGB.yellow)}</defs>`;
    document.body.prepend(svg);
  }

  /* Header: wordmark, the slot the title docks into, the sections as a sentence, a visible search field, Subscribe. */
  function header(titleLines) {
    const h = $("#hdr"); if (!h) return null;
    const lines = titleLines || [];
    const navLinks = V.nav.map(n => `<a href="${n === "Research" ? "index.html#latest" : "#"}">${n}</a>`).join("");
    h.innerHTML = `<div class="frame">
      <a class="wordmark" href="index.html">${V.name}</a>
      <div class="hdr-title" id="hdr-title" aria-hidden="true">${lines.map(l => `<span>${esc(l)}</span>`).join("")}</div>
      <nav class="hdr-nav" aria-label="Sections">${navLinks}</nav>
      <form class="hdr-search" role="search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg><input type="search" placeholder="Search" aria-label="Search Visinage"></form>
      <a class="hdr-sub" href="#newsletter">Subscribe</a>
      <button class="hdr-s-icon" type="button" aria-label="Search"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="7" cy="7" r="5"/><path d="M11 11l3.5 3.5"/></svg></button>
      <button class="hdr-menu" type="button" aria-expanded="false" aria-controls="menu-panel">Menu</button>
    </div>
    <nav class="menu-panel" id="menu-panel" aria-label="Sections">${navLinks}<a href="radar.html">Radar</a></nav>`;
    $(".hdr-search", h).addEventListener("submit", e => e.preventDefault());
    const btn = $(".hdr-menu", h), panel = $("#menu-panel", h);
    btn.addEventListener("click", () => { const open = !panel.classList.contains("is-open"); panel.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); btn.textContent = open ? "Close" : "Menu"; });
    return h;
  }

  /* Section colour choreography: the body ground and the nav take the colour of the section directly beneath the bar (a 1px band under the nav). */
  function grounds() {
    const secs = $$("[data-ground]"); if (!secs.length) return;
    const set = g => { if (document.body.dataset.ground !== g) document.body.dataset.ground = g; };
    set(secs[0].dataset.ground);
    if (!("IntersectionObserver" in window)) return;
    let io = null;
    const build = () => {
      if (io) io.disconnect();
      io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) set(e.target.dataset.ground); }),
        { rootMargin: `-${NAV_H + 1}px 0px -${Math.max(0, window.innerHeight - NAV_H - 3)}px 0px`, threshold: 0 });
      secs.forEach(s => io.observe(s));
    };
    build(); window.addEventListener("resize", build);
  }

  /* Numerals: count up (one GSAP tween each, on the shared ticker); small integers scramble their digits instead of counting from zero. */
  // motion: storytelling: the number arrives by counting, the way the finding arrives in the data.
  function numeralHTML(value) {
    return value.split(/(\s+)/).map(tok => /^[a-z]+$/i.test(tok) ? `<em class="num-word">${esc(tok)}</em>` : esc(tok)).join("");
  }
  function countUp(el, text, delay) {
    const m = /^([^\d]*)(\d+(?:\.\d+)?)(.*)$/.exec(text);
    const done = () => { el.innerHTML = numeralHTML(text); };
    if (!m || reduced || !G) { done(); return; }
    const pre = m[1], num = parseFloat(m[2]), dec = (m[2].split(".")[1] || "").length, suf = m[3];
    if (num < 10 && dec === 0) { scramble(el, text, 0.8, delay, "0123456789", numeralHTML); return; }
    const o = { v: 0 };
    el.innerHTML = numeralHTML(pre + (0).toFixed(dec) + suf);
    G.to(o, { v: num, duration: 1.4, delay: delay || 0, ease: "power3.out", onUpdate: () => { el.innerHTML = numeralHTML(pre + o.v.toFixed(dec) + suf); }, onComplete: done });
  }
  function scramble(el, text, dur, delay, alphabet, render) {
    const r = render || (s => esc(s)); const final = () => { el.innerHTML = r(text); };
    if (reduced || !G) { final(); return; }
    const o = { p: 0 };
    G.to(o, { p: 1, duration: dur || 0.6, delay: delay || 0, ease: "none", onUpdate: () => {
      const n = text.length, settled = Math.floor(o.p * (n + 2));
      el.innerHTML = r(text.split("").map((ch, i) => (i < settled || !/[A-Za-z0-9]/.test(ch)) ? ch : alphabet[Math.floor(Math.random() * alphabet.length)]).join(""));
    }, onComplete: final });
  }
  function countOnView(root) {
    const els = $$("[data-count]", root);
    const run = el => { if (el.dataset.done) return; el.dataset.done = "1"; countUp(el, el.dataset.count, parseFloat(el.dataset.delay || "0")); };
    if (reduced || !("IntersectionObserver" in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
    els.forEach(e => io.observe(e));
  }

  /* The lead line chart, written here so the narrator can drive its states; the anatomy is the shared one
     (title as the finding, subtitle with measure, unit and period, legend, direct labels, source line with the demo label). */
  function lineChart(container, o) {
    const NS = "http://www.w3.org/2000/svg";
    const c = typeof container === "string" ? $(container) : container;
    c.classList.add("chart"); c.innerHTML = "";
    const add = (tag, cls, txt) => { const d = document.createElement(tag); d.className = cls; if (txt) d.textContent = txt; c.appendChild(d); return d; };
    if (o.title) add("div", "chart-title", o.title);
    if (o.subtitle) add("div", "chart-subtitle", o.subtitle);
    if (o.legend) { const l = add("div", "chart-legend"); l.innerHTML = o.legend.map(it => `<span class="legend-item${it.hl ? " legend-item--hl" : ""}"><i class="legend-swatch ${it.cls || ""}"></i>${esc(it.label)}</span>`).join(""); }
    const w = o.width || 720, h = o.height || 360;
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${w} ${h}`); svg.setAttribute("class", "chart-svg"); svg.setAttribute("role", "img"); svg.setAttribute("aria-label", o.title || "chart"); c.appendChild(svg);
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); (parent || svg).appendChild(n); return n; };
    const txt = (x, y, s, attrs, parent) => { const t = el("text", Object.assign({ x, y }, attrs), parent); t.textContent = s; return t; };
    if (o.source) { const s = add("div", "chart-source"); s.innerHTML = esc(o.source) + (o.dataLink ? ` <a href="${o.dataHref || "#dataset"}">${esc(o.dataLink)}</a>` : ""); }
    const m = Object.assign({ t: 18, r: 120, b: 36, l: 40 }, o.margin || {});
    const years = o.x, keys = Object.keys(o.series), y0 = o.yDomain[0], y1 = o.yDomain[1];
    const sx = v => m.l + (v - years[0]) / (years[years.length - 1] - years[0]) * (w - m.l - m.r);
    const sy = v => (h - m.b) - (v - y0) / (y1 - y0) * (h - m.b - m.t);
    for (let v = y0; v <= y1; v += (o.yStep || 10)) { el("line", { x1: m.l, x2: w - m.r, y1: sy(v), y2: sy(v), class: "grid" }); txt(m.l - 8, sy(v) + 4, v + "%", { class: "tick tick--y", "text-anchor": "end" }); }
    (o.xTicks || years.filter(y => y % 5 === 0)).forEach(y => txt(sx(y), h - m.b + 18, y, { class: "tick tick--x", "text-anchor": "middle" }));
    el("line", { x1: m.l, x2: w - m.r, y1: sy(y0), y2: sy(y0), class: "axis" });
    const hl = o.highlight, order = keys.filter(k => k !== hl).concat(hl ? [hl] : []);
    const paths = [], ends = [];
    order.forEach(k => {
      const d = o.series[k].map((v, i) => `${i ? "L" : "M"}${sx(years[i]).toFixed(1)},${sy(v).toFixed(1)}`).join("");
      paths.push(el("path", { d, class: `series series--${k} ${k === hl ? "series--hl" : "series--muted"}` }));
      const last = o.series[k][o.series[k].length - 1], g = el("g", { class: "end end--" + k });
      el("circle", { cx: sx(years[years.length - 1]), cy: sy(last), r: k === hl ? 4.5 : 3, class: `end-dot end-dot--${k}` }, g);
      txt(sx(years[years.length - 1]) + 10, sy(last) + 4, `${(o.labels && o.labels[k]) || k} ${last.toFixed(1)}%`, { class: `end-label end-label--${k}${k === hl ? " end-label--hl" : ""}` }, g);
      ends.push(g);
    });
    const mk = el("g", { class: "marker" + (o.markerOn ? " is-on" : "") });
    el("line", { x1: m.l, x2: w - m.r, y1: sy(50), y2: sy(50), class: "marker-line" }, mk);
    txt(w - m.r - 4, sy(50) - 6, o.markerText || "50% of employment", { class: "marker-text", "text-anchor": "end" }, mk);
    const anns = {};
    (o.annotations || []).forEach((a, idx) => {
      const i = years.indexOf(a.year); if (i < 0) return;
      const v = o.series[a.series || hl][i], x = sx(a.year), y = sy(v);
      const dy = a.dy !== undefined ? a.dy : (idx % 2 ? 44 : -44);
      const g = el("g", { class: "ann" + (o.annOn !== false ? " is-on" : ""), "data-year": a.year });
      el("line", { x1: x, x2: x, y1: y, y2: y + dy, class: "annotation-line" }, g);
      el("circle", { cx: x, cy: y, r: 4.5, class: "annotation-dot" }, g);
      const linesOf = s => { if (!o.wrap) return [s]; const out = []; let cur = ""; s.split(" ").forEach(wd => { if ((cur + " " + wd).trim().length > o.wrap) { out.push(cur.trim()); cur = wd; } else cur += " " + wd; }); if (cur.trim()) out.push(cur.trim()); return out; };
      const ls = linesOf(a.text), lh = 14, ty = y + dy + (dy > 0 ? 14 : -8 - (ls.length - 1) * lh);
      const t = el("text", { x: x + (a.anchor === "end" ? -6 : 6), y: ty, class: "annotation", "text-anchor": a.anchor || "start" }, g);
      ls.forEach((s, li) => { const sp = el("tspan", { x: x + (a.anchor === "end" ? -6 : 6), dy: li ? lh : 0 }, t); sp.textContent = s; });
      anns[a.year] = g;
    });
    const rg = el("g", { class: "ruler-g" });
    const rl = el("line", { x1: 0, x2: 0, y1: m.t, y2: h - m.b, class: "ruler-line" }, rg);
    const rd = el("circle", { cx: 0, cy: 0, r: 5, class: "ruler-dot" }, rg);
    const rt = txt(0, h - m.b - 6, "", { class: "ruler-text", "text-anchor": "middle" }, rg);
    return {
      svg, el: c, paths,
      // motion: storytelling: the lead chart draws itself over the data cover as the dissolve completes, so the finding arrives as a line.
      drawProgress(q) {
        paths.forEach(p => { const L = p.__len || (p.__len = p.getTotalLength()); p.style.strokeDasharray = L; p.style.strokeDashoffset = L * (1 - clamp(q, 0, 1)); });
        const late = clamp((q - 0.78) / 0.22, 0, 1); ends.forEach(g => g.style.opacity = late); Object.keys(anns).forEach(k => anns[k].style.opacity = late);
      },
      setYear(year) {
        const i = years.indexOf(year); if (i < 0) { rg.classList.remove("is-on"); return; }
        const k = c.classList.contains("hl-high") ? "high" : hl, x = sx(year), y = sy(o.series[k][i]);
        rl.setAttribute("x1", x); rl.setAttribute("x2", x); rd.setAttribute("cx", x); rd.setAttribute("cy", y); rt.setAttribute("x", x); rt.textContent = year; rg.classList.add("is-on");
      },
      setState(state) {
        const on = (y, v) => anns[y] && anns[y].classList.toggle("is-on", v);
        c.classList.remove("hl-high");
        if (state === "highlight-middle") { on(2009, false); on(2016, false); mk.classList.remove("is-on"); }
        else if (state === "annotate-2009") { on(2009, true); on(2016, false); mk.classList.remove("is-on"); }
        else if (state === "annotate-2016") { on(2009, true); on(2016, true); mk.classList.add("is-on"); }
        else if (state === "highlight-high") { on(2009, true); on(2016, true); mk.classList.add("is-on"); c.classList.add("hl-high"); }
        else { on(2009, true); on(2016, true); }
      }
    };
  }
  const leadChartOpts = (mobile, extra) => Object.assign({
    title: V.featured.chartTitle, subtitle: V.featured.chartSubtitle, source: V.featured.source, dataLink: "Data", dataHref: "#dataset",
    width: mobile ? 350 : 760, height: mobile ? 300 : 400, margin: mobile ? { t: 18, r: 108, b: 30, l: 34 } : { t: 22, r: 132, b: 36, l: 40 },
    x: V.years, series: V.series, labels: V.seriesLabels, highlight: "middle", yDomain: [10, 60], yStep: 10, xTicks: mobile ? [1995, 2005, 2015, 2024] : undefined, wrap: mobile ? 17 : 0,
    annotations: [Object.assign({}, V.annotations[0], { dy: mobile ? -36 : -58 }), Object.assign({}, V.annotations[1], { dy: mobile ? 40 : 54 })],
    legend: [{ label: V.seriesLabels.middle, hl: true }, { label: V.seriesLabels.high }, { label: V.seriesLabels.low }]
  }, extra || {});

  /* The dissolve opener: a WebGL pixel-block dissolve from the duotone photograph to the halftone data cover, scrubbed by
     1.2 viewports of pinned scroll; the title lines fly into the header slot (FLIP) and the index numerals fly into the rail.
     CSS crossfade fallback when WebGL or the texture is unavailable (file:// cannot hand a local photograph to WebGL). */
  function opener(cfg) {
    const stage = cfg.stage, op = cfg.opener, hdr = $("#hdr"), gl = cfg.gl, fb = cfg.fb;
    const lines = $$(".ln", cfg.title), slotLines = $$("span", $("#hdr-title"));
    const heroIdx = cfg.index ? $$("a", cfg.index) : [], rail = cfg.rail, railIdx = rail ? $$("a", rail) : [];
    const fades = cfg.fades || [], fin = cfg.final, bars = cfg.bars || [];
    let counted = false, last = 0, lastT = 0;
    const coverB = document.createElement("canvas");
    VA.halftone(coverB, { width: 1440, height: 900, seed: cfg.seed || "poster-cover", colors: ["rgba(8,44,76,.5)", "rgba(232,50,79,.5)"], values: V.series.middle, bg: COL.off, cell: 12 });
    const fbCanvas = $(".fb-cover", fb); fbCanvas.width = coverB.width; fbCanvas.height = coverB.height; fbCanvas.getContext("2d").drawImage(coverB, 0, 0);
    let glRender = null;
    /* keep one full-viewport layer at a time: while WebGL draws, the fallback is hidden; once the dissolve is complete the static
       cover canvas stands alone (the GL canvas and the photograph canvas are hidden), so the stage is cheap to composite as it scrolls out */
    const setT = t => { lastT = t; fb.style.setProperty("--t", t); const done = t >= 0.999;
      if (glRender) { glRender(t); gl.style.visibility = done ? "hidden" : ""; fb.style.visibility = done ? "" : "hidden"; } else { fb.style.visibility = ""; }
      fb.classList.toggle("is-covered", done); };
    // motion: storytelling: the photograph of the subject dissolves block by block into the data that explains it.
    function useFallback() { glRender = null; gl.hidden = true; fb.style.visibility = ""; fb.style.setProperty("--t", lastT); }
    function initGL() {
      const g = gl.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: false }); if (!g) return false;
      const photo = new Image(); photo.src = src(cfg.photo);
      const vs = "attribute vec2 p; varying vec2 v; void main(){ v = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }";
      const fs = `precision mediump float; varying vec2 v; uniform sampler2D a; uniform sampler2D b; uniform float t; uniform vec2 res; uniform vec2 ar; uniform vec2 br; uniform float px; uniform vec3 c1; uniform vec3 c2; uniform vec3 band;
        float rnd(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233)))*43758.5453); }
        vec2 cover(vec2 uv, vec2 tex){ float ca = res.x/res.y, ta = tex.x/tex.y; vec2 s = ca > ta ? vec2(1.0, ta/ca) : vec2(ca/ta, 1.0); return (uv - 0.5) * s + 0.5; }
        void main(){
          vec2 cell = floor(gl_FragCoord.xy / px);
          float n = clamp(rnd(cell) * 0.86 + 0.07 + 0.05 * sin(cell.x * 0.35) + 0.05 * cos(cell.y * 0.5), 0.001, 0.999);
          vec4 pa = texture2D(a, cover(v, ar)); float lum = dot(pa.rgb, vec3(0.299, 0.587, 0.114)); lum = smoothstep(0.08, 0.92, lum);
          vec3 duo = mix(c1, c2, lum);
          vec4 cb = texture2D(b, cover(v, br));
          float e = step(t, n); vec3 col = mix(cb.rgb, duo, e);
          float bw = clamp(1.0 - abs(n - t) / 0.06, 0.0, 1.0) * step(0.002, t) * step(t, 0.998);
          col = mix(col, band, bw * 0.95);
          gl_FragColor = vec4(col, 1.0); }`;
      const c2 = RGB[cfg.tone || "red"];
      let ready = false, photoOk = false, u = null;
      function size() { const dpr = Math.min(window.devicePixelRatio || 1, 1.5); gl.width = Math.round(stage.clientWidth * dpr); gl.height = Math.round(stage.clientHeight * dpr); g.viewport(0, 0, gl.width, gl.height); g.uniform2f(u("res"), gl.width, gl.height); g.uniform1f(u("px"), 16 * dpr); }
      /* (Re)build the program, geometry and static uniforms; run again after a restored context, when every GPU resource is gone */
      function build() {
        const sh = (type, s) => { const o = g.createShader(type); g.shaderSource(o, s); g.compileShader(o); return o; };
        const prog = g.createProgram(); g.attachShader(prog, sh(g.VERTEX_SHADER, vs)); g.attachShader(prog, sh(g.FRAGMENT_SHADER, fs)); g.linkProgram(prog);
        if (!g.getProgramParameter(prog, g.LINK_STATUS)) return false;
        g.useProgram(prog);
        const buf = g.createBuffer(); g.bindBuffer(g.ARRAY_BUFFER, buf); g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), g.STATIC_DRAW);
        const loc = g.getAttribLocation(prog, "p"); g.enableVertexAttribArray(loc); g.vertexAttribPointer(loc, 2, g.FLOAT, false, 0, 0);
        u = n => g.getUniformLocation(prog, n);
        g.uniform3f(u("c1"), RGB.navy[0] / 255, RGB.navy[1] / 255, RGB.navy[2] / 255); g.uniform3f(u("c2"), c2[0] / 255, c2[1] / 255, c2[2] / 255); g.uniform3f(u("band"), RGB.red[0] / 255, RGB.red[1] / 255, RGB.red[2] / 255);
        size();
        return true;
      }
      const tex = (unit, s) => { const t = g.createTexture(); g.activeTexture(g.TEXTURE0 + unit); g.bindTexture(g.TEXTURE_2D, t); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR); g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, g.RGBA, g.UNSIGNED_BYTE, s); return t; };
      function render(t) { if (!ready || g.isContextLost()) return; g.uniform1f(u("t"), t); g.drawArrays(g.TRIANGLE_STRIP, 0, 4); }
      function upload() {
        if (g.isContextLost()) return; /* the restored handler will upload again; never unhide a canvas that cannot draw */
        try { tex(0, photo); tex(1, coverB); g.uniform1i(u("a"), 0); g.uniform1i(u("b"), 1); g.uniform2f(u("ar"), photo.naturalWidth || 1400, photo.naturalHeight || 875); g.uniform2f(u("br"), coverB.width, coverB.height);
          if (g.getError() !== g.NO_ERROR || g.isContextLost()) { useFallback(); return; }
          ready = true; glRender = render; render(lastT); gl.hidden = false; }
        catch (err) { useFallback(); }
      }
      if (!build()) return false;
      window.addEventListener("resize", () => { if (!glRender || g.isContextLost()) return; size(); render(lastT); });
      // motion: state: if the GPU drops the context, the CSS crossfade carries the same progress and the pixel dissolve resumes once the context is restored.
      gl.addEventListener("webglcontextlost", e => { e.preventDefault(); ready = false; useFallback(); });
      gl.addEventListener("webglcontextrestored", () => { if (build() && photoOk) upload(); });
      const start = () => { photoOk = true; if (photo.decode) photo.decode().then(upload, upload); else upload(); };
      if (photo.complete && photo.naturalWidth) start(); else { photo.addEventListener("load", start); photo.addEventListener("error", useFallback); }
      glRender = render;
      window.__posterGL = () => ({ ready, fallback: gl.hidden, lost: g.isContextLost(), t: lastT });
      return true;
    }
    const M = {};
    function measure() {
      lines.forEach(l => l.style.transform = "none"); heroIdx.forEach(a => a.style.transform = "none");
      const sr = stage.getBoundingClientRect();
      M.base = lines.map(l => { const r = l.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, h: r.height }; });
      M.target = slotLines.map((s, i) => { const r = s.getBoundingClientRect(), b = M.base[i]; return { x: r.left - sr.left, y: r.top - NAV_H, s: b && b.h ? r.height / b.h : 0.09 }; });
      M.ibase = heroIdx.map(a => { const r = a.getBoundingClientRect(); return { x: r.left - sr.left, y: r.top - sr.top, h: r.height }; });
      const railOn = rail && rail.getBoundingClientRect().width > 0;
      M.itarget = railOn ? railIdx.map((a, i) => { const r = a.getBoundingClientRect(), b = M.ibase[i]; return { x: r.left - sr.left, y: r.top - NAV_H, s: b && b.h ? r.height / b.h : 1 }; }) : null;
    }
    function setP(p) {
      last = p;
      const t = easeInOut(clamp((p - 0.06) / 0.46, 0, 1));
      const d = easeInOut(clamp((p - 0.5) / 0.3, 0, 1));
      const f = clamp((p - 0.62) / 0.2, 0, 1);
      const q = clamp((p - 0.7) / 0.28, 0, 1);
      setT(t);
      const light = t > 0.5;
      stage.classList.toggle("is-light", light);
      if (light !== M.light) { M.light = light; op.dataset.ground = light ? "off" : "navy"; document.body.dataset.ground = op.dataset.ground; }
      // motion: hierarchy: the title shrinks into the header and the index into the rail, so the page keeps both without the hero.
      if (M.base) lines.forEach((ln, i) => { const b = M.base[i], tg = M.target[i]; if (!b || !tg) return; ln.style.transform = `translate3d(${((tg.x - b.x) * d).toFixed(2)}px, ${((tg.y - b.y) * d).toFixed(2)}px, 0) scale(${(1 - (1 - tg.s) * d).toFixed(4)})`; });
      fades.forEach(e => { e.style.opacity = 1 - clamp(d * 1.8, 0, 1); });
      heroIdx.forEach((a, i) => {
        const sp = a.querySelector("span"); if (sp) sp.style.opacity = 1 - clamp(d * 1.6, 0, 1);
        if (!M.itarget) { a.style.opacity = 1 - d; return; }
        const b = M.ibase[i], tg = M.itarget[i]; if (!b || !tg) return;
        a.style.transform = `translate3d(${((tg.x - b.x) * d).toFixed(2)}px, ${((tg.y - b.y) * d).toFixed(2)}px, 0) scale(${(1 - (1 - tg.s) * d).toFixed(4)})`;
      });
      const docked = d >= 0.999;
      stage.classList.toggle("is-docked", docked); if (hdr) hdr.classList.toggle("is-docked", docked);
      if (cfg.index) cfg.index.style.visibility = docked ? "hidden" : "visible";
      if (rail) rail.classList.toggle("is-on", docked);
      if (fin) { fin.style.opacity = f; fin.classList.toggle("is-on", f > 0.5); }
      const ch = cfg.chart && cfg.chart(); if (ch) ch.drawProgress(q);
      bars.forEach((b, i) => b.style.setProperty("--p", clamp((p - i / 3) * 3, 0, 1)));
      if (p > 0.78 && !counted) { counted = true; cfg.onFinal && cfg.onFinal(); }
    }
    if (mqPhone.matches) { useFallback(); setT(0); const ch = cfg.chart && cfg.chart(); if (ch) ch.drawProgress(1); if (fin) countOnView(fin); return { setP: () => {} }; }
    if (reduced || !G) { useFallback(); setP(1); const ch = cfg.chart && cfg.chart(); if (ch) ch.drawProgress(1); cfg.onFinal && cfg.onFinal(); return { setP }; }
    let ok = false; try { ok = initGL(); } catch (e) { ok = false; } if (!ok) useFallback();
    measure(); setP(0);
    window.ScrollTrigger.create({ trigger: op, start: "top " + NAV_H + "px", end: "bottom bottom", scrub: 0.3, onUpdate: s => setP(s.progress), onRefresh: () => { measure(); setP(last); } });
    whenFonts(() => { measure(); setP(last); });
    return { setP };
  }

  /* Latest: the Locomotive list with inline previews and stamps */
  function latest(container) {
    const items = V.latest.map(a => Object.assign({ href: "article.html" }, a)).concat([Object.assign({ essay: true, topic: "Labour", href: "#essay" }, V.visualEssay)]);
    container.innerHTML = items.map((a, i) => {
      const words = a.title.split(" "), k = Math.max(1, Math.floor(words.length / 2));
      const pf = a.essay ? null : photoFor(a.topic);
      const prev = `<span class="prev" aria-hidden="true">${a.essay ? `<canvas width="220" height="140" data-essay-thumb></canvas>` : duoImg(pf[0], pf[1], 220, 140)}<span class="prev-tag">${a.essay ? "12 countries" : esc(a.topic)}</span></span>`;
      const title = words.map((w, j) => `<span class="w">${esc(w)}</span>${j === k - 1 ? prev : ""}`).join(" ");
      return `<article class="entry${touch ? " is-touch" : ""}">
        <div class="entry-meta mono"><span><b>${esc(a.type)}</b></span><span>${esc(a.topic)}</span><span>${esc(a.date)}</span><span>${esc(a.read)} read</span></div>
        <h3 class="entry-title disp disp--title list-size"><a href="${a.href}">${title}</a></h3>
        <p class="entry-deck ui">${esc(a.deck)}</p>
        ${stamp(`${esc(a.date)} · ${esc(a.topic)}`, i)}
      </article>`;
    }).join("");
    const th = $("[data-essay-thumb]", container);
    if (th) VA.ridges(th, { width: 220, height: 140, seed: "twelve-thumb", series: V.countries.map(c => [c.s, (c.s * 2 + c.e) / 3, (c.s + c.e * 2) / 3, c.e]), colors: [COL.red, COL.off], rows: 12, bg: COL.navy });
    if (touch) $$(".entry", container).forEach(e => { const p = $(".prev", e); if (p) $(".entry-title", e).after(p); });
  }

  /* Three questions on red */
  function questions(container) {
    container.innerHTML = V.questions.map((q, i) => `<div class="q-row">
      <h3 class="q-q disp disp--title q-size">${esc(q.q)}</h3>
      <div class="q-card"><div id="q-chart-${i}"></div><div class="q-ans"><span class="label">The answer, in one sentence</span><p class="answer">${esc(q.a)}</p><a class="more" href="${i ? "#latest" : "article.html"}">${esc(q.piece)} <span class="arrow">&rarr;</span></a></div></div>
    </div>`).join("");
    VC.responsive(mobile => {
      lineChart("#q-chart-0", leadChartOpts(mobile, { width: mobile ? 350 : 640, height: mobile ? 280 : 320, margin: mobile ? { t: 16, r: 104, b: 28, l: 34 } : { t: 18, r: 126, b: 32, l: 38 } }));
      VC.dumbbellChart("#q-chart-1", { title: V.vacancy.title, subtitle: V.vacancy.subtitle, source: V.vacancy.source, width: mobile ? 350 : 640, rows: V.vacancy.rows, max: 40, xStep: 10, labelA: "2019 Q4", labelB: "2026 Q2", rowHeight: mobile ? 26 : 30, margin: mobile ? { t: 26, r: 36, b: 26, l: 86 } : { t: 28, r: 52, b: 28, l: 112 }, legend: [{ label: "2019 Q4", cls: "sw-a" }, { label: "2026 Q2", cls: "sw-b", hl: true }] });
      const mx = Math.max(...V.profits.rows.map(r => r.v));
      VC.barChart("#q-chart-2", { title: V.profits.title, subtitle: V.profits.subtitle, source: V.profits.source, width: mobile ? 350 : 640, rows: V.profits.rows.map(r => Object.assign({}, r, { hl: r.v === mx })), max: 60, xStep: 10, rowHeight: mobile ? 28 : 32, margin: mobile ? { t: 8, r: 40, b: 26, l: 100 } : { t: 8, r: 48, b: 26, l: 116 }, legend: [{ label: "Unit-profit contribution", hl: true }, { label: "Other economies" }] });
      $$(".chart-source", container).forEach(s => { if (!$("a", s)) s.innerHTML += ' <a href="#dataset">Data</a>'; });
    });
  }

  function spotlight(container) {
    const rows = V.vacancy.rows, r0 = rows[0], rl = rows[rows.length - 1];
    container.innerHTML = `<div class="spot">
      <div><span class="label dim">${ROMAN[2]} · Data spotlight</span>
        <p class="reading" style="margin-top:18px">${esc(r0.city)} went from ${r0.a}% to ${r0.b}%. Every one of the ${rows.length} cities in the tracker is above its 2019 level; ${esc(rl.city)}, the lowest, went from ${rl.a}% to ${rl.b}%.</p>
        <p style="margin-top:28px"><a class="more" href="#projects">Open the ${esc(V.projects[1].title)} <span class="arrow">&rarr;</span></a></p>
        <p class="mono dim" style="margin-top:18px">${esc(V.projects[1].status)} · ${esc(V.demoLabel)}</p></div>
      <div id="spot-chart"></div></div>`;
    VC.responsive(mobile => {
      VC.dumbbellChart("#spot-chart", { title: V.vacancy.title, subtitle: V.vacancy.subtitle, source: V.vacancy.source, width: mobile ? 350 : 760, rows: rows, max: 40, xStep: 10, labelA: "2019 Q4", labelB: "2026 Q2", rowHeight: mobile ? 28 : 36, margin: mobile ? { t: 26, r: 36, b: 26, l: 86 } : { t: 30, r: 60, b: 30, l: 124 }, legend: [{ label: "2019 Q4", cls: "sw-a" }, { label: "2026 Q2", cls: "sw-b", hl: true }] });
      const s = $("#spot-chart .chart-source"); if (s) s.innerHTML += ' <a href="#projects">Data</a>';
    });
  }

  function teaser(container) {
    const R = V.radar, top = R.items.slice(0, 4);
    container.innerHTML = `<div class="tz">${top.map(it => `<div class="tz-item">
      <span class="tz-rank">${String(it.rank).padStart(2, "0")}</span>
      <div><div class="tz-topic">${esc(it.topic)}</div><div class="tz-sub mono">${esc(it.topicTag)} · first seen ${esc(it.firstSeen)} · ${it.sources.length} sources</div></div>
      <div class="tz-spark" data-spark="${it.rank}"></div>
      <div class="tz-move">${it.direction === "down" ? "&darr;" : "&uarr;"}${it.movement > 0 ? "+" : "&minus;"}${Math.abs(it.movement)}<small>24h movement · ${esc(V.demoLabel)}</small></div>
    </div>`).join("")}</div>
    <div class="tz-foot"><span class="mono">Refreshed ${esc(R.lastRefresh)}, ${R.refreshesToday} times today · next at ${esc(R.nextRefresh)} · ${R.sourcesPolled} sources polled</span><a class="more" href="radar.html">All ${R.items.length} moving, on the radar <span class="arrow">&rarr;</span></a></div>`;
    top.forEach(it => { const c = $(`[data-spark="${it.rank}"]`, container); if (c) VC.sparkline(c, it.spark, { width: 120, height: 32 }); });
  }

  function video(container) {
    const L = V.video.lead, S = V.video.shorts;
    const posters = [[V.photos.cities, "cyan"], [V.photos.climate, "red"], [V.photos.publicFinance, "yellow"]];
    container.innerHTML = `<div class="video-grid">
      <div><a class="player" href="#" aria-label="Play ${esc(L.title)}, ${esc(L.duration)}">${duoImg(V.photos.labour, "yellow")}${stamp("Explainer · " + esc(V.demoLabel), 1, "stamp--yellow")}<span class="play">Play</span>${stamp(esc(L.duration), 3, "stamp--yellow tc")}</a>
        <div class="player-cap"><h3>${esc(L.title)}</h3><span class="mono dim">${esc(L.piece)} · ${esc(L.date)}</span></div>
        <ol class="chapters">${L.chapters.map((c, i) => `<li><i>${String(i + 1).padStart(2, "0")}</i>${esc(c)}</li>`).join("")}</ol></div>
      <div><span class="label dim" style="display:block;margin-bottom:16px">Three shorts</span><div class="shorts">${S.map((s, i) => `<a class="short" href="#">${duoImg(posters[i][0], posters[i][1])}${stamp(esc(s.duration), i + 4, "stamp--yellow")}<span class="short-cap">${esc(s.title)}</span></a>`).join("")}</div></div>
    </div>`;
  }

  function essay(container) {
    const E = V.visualEssay;
    container.innerHTML = `<div class="essay-head"><div><span class="label dim">Visual essay</span><h2 class="disp disp--title h2" style="margin-top:14px">${esc(E.title)}</h2></div>
      <div><p class="serif s32">${esc(E.deck)}</p><p class="mono dim" style="margin-top:16px">${esc(E.type)} · ${esc(E.date)} · ${esc(E.read)} read · middle-wage share of employment, 1995 vs 2024 (%) · ${esc(V.demoLabel)}</p></div></div>
      <div id="slopes"></div>`;
    VC.slopeGrid("#slopes", { rows: V.countries });
  }

  function notes(container) {
    container.innerHTML = `<div class="notes">${V.notes.map(n => `<a class="note" href="#"><span class="mono dim">${esc(n.date)}</span><h3>${esc(n.title)}</h3><span class="mono dim right">${esc(n.topic)} · ${esc(n.read)}</span></a>`).join("")}</div>`;
  }

  function projects(container) {
    const P = V.projects[0], T = V.projects[1], D = V.dataset;
    container.innerHTML = `<div class="proj-grid">
      <a class="proj" href="#">${`<div class="proj-cover">${duoImg(V.photos.publicFinance, "yellow")}${stamp(`Part ${P.done} of ${P.parts}`, 0, "stamp--yellow")}</div>`}
        <div class="proj-body"><span class="label" style="color:var(--yellow)">Project · ${esc(P.topic)}</span><h3>${esc(P.title)}</h3><p>${esc(P.deck)}</p><div class="parts">${Array.from({ length: P.parts }, (_, i) => `<i class="${i < P.done ? "done" : ""}"></i>`).join("")}<span>${esc(P.status)}</span></div></div></a>
      <a class="proj" href="#">${`<div class="proj-cover">${duoImg(V.photos.cities, "cyan")}${stamp("Tool · quarterly", 2, "stamp--yellow")}</div>`}
        <div class="proj-body"><span class="label" style="color:var(--yellow)">Tool · ${esc(T.topic)}</span><h3>${esc(T.title)}</h3><p>${esc(T.deck)}</p><span class="mono" style="color:var(--off-2)">${esc(T.status)} · ${esc(V.demoLabel)}</span></div></a>
      <a class="proj proj--data" href="#" id="dataset">
        <div class="proj-body"><span class="label" style="color:var(--red-text)">Dataset · ${esc(D.version)} · ${esc(D.licence)}</span><h3>${esc(D.title)}</h3><p>${esc(D.desc)}</p><div class="chips">${D.fields.map(f => `<span>${esc(f)}</span>`).join("")}</div>
        <dl class="proj-meta"><div><dt class="sr">Rows</dt><dd>${esc(D.rows)}</dd></div><div><dd>${esc(D.cols)}</dd></div><div><dd>${esc(D.size)}</dd></div><div><dd>${esc(D.updated)}</dd></div></dl><span class="mono" style="color:var(--red-text)">${esc(V.demoLabel)}</span></div></a>
    </div>`;
  }

  function topics(container) {
    container.innerHTML = `<div class="topics">${V.topics.map(t => `<a href="#">${esc(t.name)}<sup>${t.n}</sup></a>`).join("")}</div>`;
  }

  function newsletter(container) {
    const N = V.newsletter;
    container.innerHTML = `<div class="nl"><div><h2 class="disp h2">${esc(N.title)}</h2><p class="serif s32" style="margin-top:28px;max-width:640px">${esc(N.text)}</p></div>
      <form><label for="nl-email">Your email</label><input id="nl-email" type="email" placeholder="${esc(N.placeholder)}" autocomplete="email"><button type="submit">${esc(N.button)}</button></form></div>`;
    $("form", container).addEventListener("submit", e => e.preventDefault());
  }

  function footer(container, compact) {
    const F = V.footer;
    container.innerHTML = `<div class="foot${compact ? " foot--compact" : ""}"><div class="foot-mark" aria-hidden="true">${V.name}</div>
      <div class="foot-grid"><p class="serif s32">${esc(F.about)}</p>
        <div class="foot-cols">${F.cols.map(c => `<div><h4>${esc(c.h)}</h4><ul>${c.links.map(l => `<li><a href="#">${esc(l)}</a></li>`).join("")}</ul></div>`).join("")}</div></div>
      <div class="foot-legal mono"><span>${esc(F.legal)}</span><span class="demo">${esc(F.demo)} Photographs are placeholders (Unsplash via Picsum).</span></div></div>`;
    const mark = $(".foot-mark", container);
    const fit = () => { const box = mark.clientWidth; mark.style.fontSize = "100px"; const w = mark.scrollWidth; if (w > 0 && box > 0) mark.style.fontSize = Math.max(40, Math.floor(100 * box / w * 0.985)) + "px"; };
    whenFonts(fit); window.addEventListener("resize", fit);
  }

  /* ---------- Homepage ---------- */
  function homePage() {
    const F = V.featured;
    header(["WHERE THE ", "MIDDLE-", "WAGE JOBS ", "WENT"]);
    const idx = [["latest", "Latest"], ["questions", "Three questions"], ["spotlight", "Data spotlight"], ["radar", "Radar"], ["video", "Video"], ["essay", "Visual essay"], ["notes", "Research notes"], ["projects", "Projects"]];
    $("#op-index").innerHTML = idx.map(([id, l], i) => `<a href="#${id}"><i>${ROMAN[i]}</i><span>${l}</span></a>`).join("");
    $("#rail").innerHTML = idx.map(([id, l], i) => `<a href="#${id}"><i>${ROMAN[i]}</i><span>${l}</span></a>`).join("");
    $("#op-kicker").innerHTML = `<span><b>${esc(F.kicker)}</b></span><span>${esc(V.author)}</span><span>${esc(F.date)}</span><span>${esc(F.readTime)}</span><span>${F.tags.map(esc).join(" · ")}</span>`;
    $("#op-deck").textContent = F.deck;
    const nums = V.article.twoSpeeds.numbers;
    $("#op-nums").innerHTML = nums.map((n, i) => `<div><span class="numeral disp num disp--title" data-count="${esc(n.value)}" data-delay="${i * 0.15}">${numeralHTML(n.value)}</span><span class="numeral-label mono">${esc(n.label)} · ${esc(V.demoLabel)}</span></div>`);
    let lead = null;
    VC.responsive(mobile => { lead = lineChart("#lead-chart", leadChartOpts(mobile)); if (mobile) lead.drawProgress(1); });
    opener({ opener: $("#opener"), stage: $("#stage"), gl: $("#gl"), fb: $("#fb"), photo: V.photos.lead, tone: "red", seed: "poster-home",
      title: $("#op-title"), index: $("#op-index"), rail: $("#rail"), fades: [$("#op-kicker"), $("#op-deck")], final: $("#op-final"), bars: $$("#op-progress i"),
      chart: () => lead, onFinal: () => $$("#op-nums [data-count]").forEach(el => { if (!el.dataset.done) { el.dataset.done = "1"; countUp(el, el.dataset.count, parseFloat(el.dataset.delay)); } }) });
    latest($("#latest-list"));
    $("#latest-foot").innerHTML = `<span class="mono dim">${V.latest.length + 1} pieces this month</span><a class="more" href="#">All research <span class="arrow">&rarr;</span></a>`;
    questions($("#questions-body"));
    spotlight($("#spotlight-body"));
    teaser($("#radar-body"));
    video($("#video-body"));
    essay($("#essay-body"));
    notes($("#notes-body"));
    projects($("#projects-body"));
    topics($("#topics-body"));
    newsletter($("#newsletter-body"));
    footer($("#footer-body"));
    VM.spy("main section[id]", ".rail a");
  }

  /* ---------- Radar page ---------- */
  function radarPage() {
    header([]);
    const R = V.radar, G8 = ["navy", "red", "cyan", "off", "navy", "red", "cyan", "off"];
    $("#rd-open-body").innerHTML = `<span class="label dim">What is moving today</span><h1 class="disp h0" style="margin-top:16px">Moving today</h1>
      <div class="rd-meta mono"><span><b>${esc(R.date)}</b></span><span>Refreshed ${esc(R.lastRefresh)}, ${R.refreshesToday} times today, next at ${esc(R.nextRefresh)}</span><span>${R.sourcesPolled} sources polled</span>${stamp(esc(V.demoLabel), 0, "stamp--fill")}</div>
      <p class="mono dim" style="margin-top:18px">Source: ${R.sourcesPolled} sources polled by five collectors (${R.collectors.map(esc).join(", ")}); movement is the change in a composite attention score over 24 hours. ${esc(V.demoLabel)}.</p>`;
    const status = it => it.status === "published" ? `Published as <a href="article.html">${esc(it.publishedAs)}</a> · <a href="#started">started on the radar, ${esc(it.radarDate)}</a>` : it.status === "picked" ? "On the desk" : "Watching";
    $("#rd-items").innerHTML = R.items.map((it, i) => { const g = G8[i], pf = photoFor(it.topicTag); return `<section class="sec rd-item g-${g}" data-ground="${g}" id="r${it.rank}">
      <div class="rd-photo" aria-hidden="true">${duoImg(pf[0], pf[1])}</div>
      <div class="frame rd-body">
        <div class="rd-top"><span class="mono">${String(it.rank).padStart(2, "0")} / ${String(R.items.length).padStart(2, "0")}</span>${stamp(esc(it.topicTag), i)}<span class="mono">${it.status === "picked" ? "on the desk" : esc(it.status)}</span></div>
        <h2 class="rd-topic disp h2" data-topic="${esc(it.topic)}" ${it.status === "picked" ? 'data-changed="1"' : ""}>${esc(it.topic)}</h2>
        <div class="rd-grid">
          <div class="rd-move"><span class="arr">${it.direction === "down" ? "&darr;" : "&uarr;"}</span><span>${it.movement > 0 ? "+" : "&minus;"}${Math.abs(it.movement)}</span></div>
          <div class="rd-detail">
            <div class="row"><span class="label">24h score</span><div class="rd-spark" data-spark="${it.rank}"></div></div>
            <div class="row"><span class="label">Sources</span><div class="stamps">${it.sources.map((s, j) => stamp(esc(s), i + j)).join("")}</div></div>
            <div class="row"><span class="label">First seen</span><span class="mono">${esc(it.firstSeen)}</span></div>
            <div class="row"><span class="label">Status</span><span class="rd-status ui-s">${status(it)}</span></div>
            ${it.note ? `<div class="row"><span class="label">Note</span><div class="rd-card"><p class="rd-note">${esc(it.note)}</p></div></div>` : ""}
            <div class="row"><span class="label">Movement</span><span class="mono dim">Source: ${it.sources.map(esc).join(", ")}; change in a composite attention score over 24 hours. ${esc(V.demoLabel)}.</span></div>
          </div>
        </div>
      </div></section>`; }).join("");
    R.items.forEach(it => { const c = $(`[data-spark="${it.rank}"]`); if (c) { const s = VC.sparkline(c, it.spark, { width: 240, height: 64 }); s.classList.add("spark--big"); } });
    // motion: feedback: items that changed since the last refresh scramble once, to say the data moved.
    $$("[data-changed]").forEach((h, i) => scramble(h, h.dataset.topic, 0.6, 0.1 * i, "ABCDEFGHIJKLMNOPQRSTUVWXYZ"));
    $("#how-body").innerHTML = `<div class="sec-head"><div><span class="label dim">How the radar works</span><h2 class="disp h2" style="margin-top:14px">Five collectors</h2></div><p class="side">${esc(R.howItWorks)}</p></div>
      <div class="collectors">${R.collectors.map((c, i) => stamp(esc(c), i)).join("")}</div>
      <div class="how"><div><ul class="raw mono-s">${R.rawHeadlines.map(h => `<li>${esc(h)}</li>`).join("")}</ul><p class="mono-s dim" style="margin-top:12px">The noise beneath the scores: raw headlines from the last poll · ${esc(V.demoLabel)}</p></div>
      <p class="mono"><b>The desk is private.</b> The radar shows what is moving and whether a topic was picked; nothing about the desk itself. Refreshed ${esc(R.lastRefresh)}, ${R.refreshesToday} times today; next at ${esc(R.nextRefresh)}; ${R.sourcesPolled} sources polled.</p></div>`;
    const pub = R.items.filter(it => it.status === "published");
    $("#started-body").innerHTML = `<div class="sec-head"><div><span class="label dim">Started on the radar</span><h2 class="disp h2" style="margin-top:14px">Two pieces</h2></div><p class="side">Topics the radar surfaced first, then the desk picked, then we published.</p></div>
      <div class="started">${pub.map((it, i) => `<a class="card" href="article.html"><span class="mono dim">On the radar ${esc(it.radarDate)} · published ${esc(it.publishedDate)}</span><h3>${esc(it.publishedAs)}</h3><span class="mono">${esc(it.topicTag)} · ${stamp("radar-sourced", i, "stamp--red")}</span></a>`).join("")}</div>`;
    footer($("#footer-body"), true);
  }

  /* ---------- Article page ---------- */
  function articlePage() {
    const F = V.featured, A = V.article;
    header(["WHERE THE ", "MIDDLE-", "WAGE JOBS ", "WENT"]);
    $("#op-index").innerHTML = A.steps.map((s, i) => `<a href="#step-${i + 1}"><i>${ROMAN[i]}</i><span>${esc(s.title)}</span></a>`).join("");
    $("#rail").innerHTML = A.steps.map((s, i) => `<a href="#step-${i + 1}"><i>${ROMAN[i]}</i><span>${esc(s.title)}</span></a>`).join("");
    $("#op-kicker").innerHTML = `<span><b>${esc(A.kicker)}</b></span><span>${esc(V.author)}</span><span>${esc(F.date)}</span><span>${esc(F.readTime)}</span>`;
    $("#op-deck").textContent = F.deck;
    $("#op-final-body").innerHTML = `<div class="chart-wrap"><p class="serif s40">${esc(F.deck)}</p><p class="mono" style="margin-top:20px">${esc(A.radarLine)} · ${esc(F.readTime)} · ${F.tags.map(esc).join(", ")}</p></div>`;
    opener({ opener: $("#opener"), stage: $("#stage"), gl: $("#gl"), fb: $("#fb"), photo: V.photos.lead, tone: "red", seed: "poster-article",
      title: $("#op-title"), index: $("#op-index"), rail: $("#rail"), fades: [$("#op-kicker"), $("#op-deck")], final: $("#op-final"), bars: $$("#op-progress i") });
    $("#file").innerHTML = `<div><dt>Kicker</dt><dd>${esc(A.kicker)}</dd></div><div><dt>Published</dt><dd>${esc(F.date)} · ${esc(F.readTime)}</dd></div><div><dt>Author</dt><dd>${esc(V.author)}</dd></div><div><dt>Provenance</dt><dd>${esc(A.radarLine)}</dd></div>
      <div class="span2"><dt>Method</dt><dd>${esc(A.method)}</dd></div><div class="span2"><dt>Data</dt><dd>${esc(A.data)} · ${esc(V.demoLabel)}</dd></div><div class="span2"><dt>Tags</dt><dd>${F.tags.map(esc).join(" · ")}</dd></div>`;
    $("#two-nums").innerHTML = A.twoSpeeds.numbers.map((n, i) => `<div class="two-num"><span class="numeral disp num disp--title" data-count="${esc(n.value)}" data-delay="${i * 0.15}">${numeralHTML(n.value)}</span><span class="numeral-label mono">${esc(n.label)} · ${esc(V.demoLabel)}</span></div>`).join("");
    $("#two-view").innerHTML = `<span class="label" style="color:var(--red-text);display:block;margin-bottom:16px">The viewpoint, for the fast reader</span>${esc(A.twoSpeeds.viewpoint)}`;
    countOnView($("#two"));
    $("#steps").innerHTML = A.steps.map((s, i) => `<div class="step" id="step-${i + 1}" data-state="${s.state}" data-year="${s.year}"><span class="label">${ROMAN[i]} · ${s.year}</span><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join("");
    let chart = null;
    const years = [1995, 2000, 2005, 2010, 2015, 2020, 2024];
    $("#ruler").innerHTML = years.map(y => `<i data-y="${y}">${y}</i>`).join("") + `<span class="cursor" aria-hidden="true"></span>`;
    const ruler = $("#ruler"), cursor = $(".cursor", ruler);
    const setYear = y => { $$("i", ruler).forEach(i => i.classList.toggle("is-year", +i.dataset.y === y)); const ticks = $$("i", ruler).map(i => ({ y: +i.dataset.y, x: i.offsetLeft + i.offsetWidth / 2 })); let lo = ticks[0], hi = ticks[ticks.length - 1];
      ticks.forEach(t => { if (t.y <= y && t.y >= lo.y) lo = t; if (t.y >= y && t.y <= hi.y) hi = t; });
      cursor.style.left = (hi.y === lo.y ? lo.x : lo.x + (hi.x - lo.x) * (y - lo.y) / (hi.y - lo.y)) + "px"; $("#ruler-now").textContent = y; if (chart) chart.setYear(y); };
    VC.responsive(mobile => { chart = lineChart("#narr-chart", leadChartOpts(mobile, { annOn: false, width: mobile ? 350 : 760, height: mobile ? 260 : 420, margin: mobile ? { t: 18, r: 104, b: 28, l: 34 } : { t: 26, r: 132, b: 36, l: 40 } })); const cur = $(".step.is-on"); chart.setState(cur ? cur.dataset.state : "highlight-middle"); chart.setYear(cur ? +cur.dataset.year : 1995); });
    const steps = $$(".step");
    // motion: storytelling: each claim changes one thing on the pinned chart and moves the year ruler to the year of the claim.
    const activate = st => { steps.forEach(s => s.classList.toggle("is-on", s === st)); if (chart) chart.setState(st.dataset.state); setYear(+st.dataset.year); $$("#rail a").forEach((a, i) => a.classList.toggle("is-current", steps[i] === st)); };
    if (reduced || !("IntersectionObserver" in window)) { steps.forEach(s => s.classList.add("is-on")); if (chart) chart.setState("highlight-high"); setYear(2024); }
    else { activate(steps[0]); const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) activate(e.target); }), { rootMargin: "-45% 0px -45% 0px", threshold: 0 }); steps.forEach(s => io.observe(s)); }
    $("#seam-body").innerHTML = `<span class="fig">Fig 1</span><span class="serif s32">${esc(F.chartTitle)}</span><span class="mono" style="margin-left:auto">${esc(V.demoLabel)}</span>`;
    $("#body").innerHTML = A.body.map(p => `<p>${esc(p)}</p>`).join("");
    $("#fig-notes").innerHTML = `<span class="label" style="color:var(--red-text)">Fig 1 · notes</span><p class="ui-s">${esc(A.chartNotes)}</p><p class="mono dim">${esc(F.source)} <a href="#dataset">Data: ${esc(V.dataset.title)}</a></p>`;
    $("#continues").innerHTML = `${stamp("Continues", 1, "stamp--red")}<span class="mono dim">The full piece: ${esc(F.readTime)}, four sections, methodology and corrections.</span>`;
    $("#related").innerHTML = `<span class="label dim">Related research</span><ul style="margin-top:16px">${A.related.map(r => `<li><a href="#">${esc(r)}</a></li>`).join("")}</ul>`;
    footer($("#footer-body"), true);
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", () => {
    duoDefs();
    const page = document.body.dataset.page;
    if (page === "home") homePage(); else if (page === "radar") radarPage(); else if (page === "article") articlePage();
    duotonePass();
    grounds();
    VM.reveal(".rv");
    if (G) window.ScrollTrigger.refresh();
  });
})();
