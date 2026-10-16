/* Visinage, direction one: "the instrument". Behaviour for index.html, radar.html and article.html.
   One requestAnimationFrame loop per page (GSAP's ticker, or a plain loop when GSAP is absent); every canvas is
   capped at a device pixel ratio of 1.5; set pieces are lazy and pause off-screen; reduced motion resolves every
   animation to its final state. All words and numbers come from window.VISINAGE (demo data, labelled). */
(function () {
  "use strict";
  const V = window.VISINAGE, VC = window.VCharts, VA = window.VArt, VM = window.VMotion;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const phoneMQ = window.matchMedia("(max-width: 767px)");
  const tabletMQ = window.matchMedia("(max-width: 1023px)");
  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  /* lib/art.js reads window.devicePixelRatio for its own canvases; cap what it sees at 1.5 as well. */
  try { Object.defineProperty(window, "devicePixelRatio", { get: () => DPR, configurable: true }); } catch (e) { /* read-only in this browser; the lib caps at 2 */ }
  const G = window.gsap, ST = window.ScrollTrigger;
  if (G && ST) G.registerPlugin(ST);

  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  const txt = (parent, x, y, s, attrs = {}) => { const t = el("text", Object.assign({ x, y }, attrs), parent); t.textContent = s; return t; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const linear = t => t;
  const pad2 = n => String(n).padStart(2, "0");
  const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hueOf = (topic, dark = true) => (dark ? V.topicHues.dark : V.topicHues.light)[topic] || (dark ? "#A9ACB3" : "#6B6B70");
  /* Both hue variants on one element; .hued picks the one for the ground it sits on (see instrument.css). */
  const hueVars = topic => `--hue-d:${hueOf(topic, true)};--hue-l:${hueOf(topic, false)};`;
  /* Idle work queue: cover art and poster warm-up run in requestIdleCallback slices so they never block a frame. */
  const idleQueue = []; let idleScheduled = false;
  function pumpIdle(deadline) {
    idleScheduled = false; const t0 = performance.now();
    while (idleQueue.length && performance.now() - t0 < 22) idleQueue.shift()();
    if (idleQueue.length) scheduleIdle();
  }
  function scheduleIdle() {
    if (idleScheduled) return; idleScheduled = true;
    if (window.requestIdleCallback) window.requestIdleCallback(pumpIdle, { timeout: 150 }); else setTimeout(() => pumpIdle(null), 24);
  }
  function whenIdle(job) { idleQueue.push(job); scheduleIdle(); }
  const sign = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);

  /* ---------- the one frame loop ---------- */
  const frameSubs = new Set(), tweens = new Set();
  let lastNow = performance.now();
  function frame() {
    const now = performance.now(), dt = Math.min(64, now - lastNow); lastNow = now;
    for (const tw of tweens) {
      if (tw.t0 == null) tw.t0 = now;
      const p = clamp((now - tw.t0) / tw.dur, 0, 1);
      tw.fn(tw.ease(p), p);
      if (p >= 1) { tweens.delete(tw); if (tw.done) tw.done(); }
    }
    for (const fn of frameSubs) fn(now, dt);
  }
  if (G) G.ticker.add(frame); else (function loop() { frame(); requestAnimationFrame(loop); })();
  function tween(dur, fn, ease = easeOut, done) { const tw = { t0: null, dur, fn, ease, done }; tweens.add(tw); return tw; }

  /* Count-up: "47.2%" counts from 0; small integers ("< 1/2", "14 of 14") scramble instead so they do not tick 0, 1. */
  function countUp(elm) {
    const raw = elm.dataset.value;
    const m = raw.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/);
    if (!m || reduced) { elm.textContent = raw; return; }
    const pre = m[1], num = m[2], suf = m[3], to = parseFloat(num), dec = (num.split(".")[1] || "").length;
    if (to < 10 && dec === 0) { scramble(elm, raw, 900); return; }
    // motion: storytelling: the readout counts to the finding so the number is seen arriving, not stated.
    tween(1400, p => { elm.textContent = pre + (to * p).toFixed(dec) + suf; });
  }
  function zeroForm(raw) { const m = raw.match(/^([^\d]*)(\d+(?:\.\d+)?)(.*)$/); if (!m) return raw; const dec = (m[2].split(".")[1] || "").length; return m[1] + (0).toFixed(dec) + m[3]; }
  function armCountUps(scope = document) {
    const els = $$("[data-value]", scope);
    if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => { e.textContent = e.dataset.value; }); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { countUp(e.target); io.unobserve(e.target); } }), { threshold: .5 });
    els.forEach(e => io.observe(e));
  }

  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/[]+-";
  function scramble(elm, text, dur = 600) {
    if (reduced) { elm.textContent = text; return; }
    // motion: feedback: letters scramble then settle, which says the value just changed.
    tween(dur, p => { const n = Math.floor(p * text.length); let s = ""; for (let i = 0; i < text.length; i++) { const ch = text[i]; s += (i < n || ch === " " || p >= 1) ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; } elm.textContent = s; }, linear);
  }

  /* ---------- navigation ---------- */
  function nav() {
    const page = document.body.dataset.page;
    $$(".pill-links, .menu-links").forEach(ul => { ul.innerHTML = V.nav.map(n => `<li><a href="index.html#${n.toLowerCase()}" class="${page === "home" && n === "Research" ? "is-active" : ""}">${n}</a></li>`).join(""); });
    $$(".radar-count").forEach(e => { e.textContent = V.radar.items.length; });
    const right = $(".pill-right");
    if (right && page !== "radar") right.insertAdjacentHTML("afterbegin", `<a class="pill-live" href="radar.html" aria-label="${V.radar.items.length} topics moving on the radar"><i aria-hidden="true"></i>${V.radar.items.length}</a>`);
    const menu = $("#menu"), openBtn = $(".pill-menu"), closeBtn = $(".menu-close"), searchBtn = $(".pill-searchbtn");
    if (!menu) return;
    const open = (focusSearch) => { menu.hidden = false; openBtn.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; (focusSearch ? $("input", menu) : closeBtn).focus(); };
    const close = () => { menu.hidden = true; openBtn.setAttribute("aria-expanded", "false"); document.body.style.overflow = ""; openBtn.focus(); };
    openBtn.addEventListener("click", () => open(false));
    if (searchBtn) searchBtn.addEventListener("click", () => open(true));
    closeBtn.addEventListener("click", close);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && !menu.hidden) close(); });
  }

  /* ---------- section choreography: the ground cross-fades between dark and light as sections enter ---------- */
  function choreograph() {
    const body = document.body, secs = $$("[data-theme]").filter(s => s !== body);
    if (!secs.length) return;
    /* The light ground is a fixed layer that cross-fades by opacity (compositor only); the ink tokens flip once at
       the midpoint of the fade, so the inversion costs one style recalc rather than thousands of transitions. */
    const ground = document.createElement("div"); ground.className = "ground"; ground.setAttribute("aria-hidden", "true"); body.prepend(ground);
    let current = secs[0].dataset.theme, inkTimer = null, prevY = window.scrollY, jumpUntil = 0;
    /* Ink flips per module (.iu): at the fade's midpoint the modules on screen flip in small batches over two or
       three frames, modules just off screen follow one per frame, and the rest flip as they approach (an
       IntersectionObserver with a wide margin). A flip never repaints more than a module's area in one frame, and
       never invalidates tiles far from the viewport. A jump re-syncs every module at once. Pages whose sections carry
       their own world (.t-dark / .t-light) have no modules and only cross-fade the ground. */
    const units = $$(".iu");
    const where = u => { const r = u.getBoundingClientRect(), vh = window.innerHeight; return r.bottom > 0 && r.top < vh ? 0 : (r.bottom > -vh * .6 && r.top < vh * 1.6 ? 1 : 2); };
    let flipping = null;
    const setInk = (theme, all) => {
      if (flipping) cancelAnimationFrame(flipping); flipping = null;
      if (all) { units.forEach(u => { u.dataset.ink = theme; }); return; }
      const on = [], near = [];
      units.forEach(u => { const w = where(u); if (w === 0) on.push(u); else if (w === 1) near.push(u); });
      const per = Math.max(1, Math.ceil(on.length / 3));
      const step = () => {
        const batch = on.length ? on.splice(0, per) : near.splice(0, 1);
        batch.forEach(u => { u.dataset.ink = theme; });
        flipping = (on.length || near.length) ? requestAnimationFrame(step) : null;
      };
      step();
    };
    units.forEach(u => { u.dataset.ink = current; });
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && e.target.dataset.ink !== current) e.target.dataset.ink = current; }), { rootMargin: "60% 0px 60% 0px" });
      units.forEach(u => io.observe(u));
    }
    /* A jump of more than a viewport (an anchor, find-in-page, a programmatic scroll) is a teleport, not a section
       entering: the inversion then switches at once instead of cross-fading. */
    const sectionAtLine = () => { const line = window.innerHeight * .55; let hit = null; for (const s of secs) { const r = s.getBoundingClientRect(); if (r.top <= line && r.bottom > line) { hit = s; break; } } return hit; };
    window.addEventListener("scroll", () => {
      const y = window.scrollY;
      if (Math.abs(y - prevY) > window.innerHeight) { jumpUntil = performance.now() + 400; const s = sectionAtLine(); if (s) setGround(s.dataset.theme); setInk(current, true); }
      prevY = y;
    }, { passive: true });
    const setGround = theme => {
      if (theme === current) return; current = theme;
      const instant = reduced || performance.now() < jumpUntil;
      groundFadingUntil = instant ? 0 : performance.now() + 680;
      // motion: hierarchy: the inversion marks the switch between set piece and reading.
      ground.classList.toggle("no-fade", instant); ground.classList.toggle("is-light", theme === "light");
      clearTimeout(inkTimer);
      if (instant) { body.dataset.ground = theme; setInk(theme, true); setTimeout(() => ground.classList.remove("no-fade"), 60); }
      else {
        /* The ink flips once the fade is past its midpoint and the scroll has been quiet for 300ms (so the flip's
           repaint does not land in the raster burst of a scroll step), and in any case before the fade ends. */
        const started = performance.now();
        const tryFlip = () => {
          const n = performance.now(), quiet = n - lastScrollAt > 300;
          if (n - started >= 240 && (quiet || n - started >= 560)) { body.dataset.ground = theme; setInk(theme, false); }
          else inkTimer = setTimeout(tryFlip, 60);
        };
        inkTimer = setTimeout(tryFlip, 240);
      }
    };
    let lastScrollAt = 0; window.addEventListener("scroll", () => { lastScrollAt = performance.now(); }, { passive: true });
    body.dataset.ground = current; body.dataset.nav = current; ground.classList.toggle("is-light", current === "light");
    if (ST) {
      secs.forEach(sec => {
        ST.create({ trigger: sec, start: "top 55%", end: "bottom 55%", onToggle: self => { if (self.isActive) setGround(sec.dataset.theme); } });
        // motion: state: the pill takes the inverse of the ground it floats over.
        ST.create({ trigger: sec, start: "top 44px", end: "bottom 44px", onToggle: self => { if (self.isActive) body.dataset.nav = sec.dataset.theme; } });
      });
      return;
    }
    if (!("IntersectionObserver" in window)) return;
    const g = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) setGround(e.target.dataset.theme); }), { rootMargin: "-45% 0px -45% 0px" });
    const n = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) body.dataset.nav = e.target.dataset.theme; }), { rootMargin: "-44px 0px -95% 0px" });
    secs.forEach(s => { g.observe(s); n.observe(s); });
  }

  /* ---------- cursor label: a mono tag that says what a click does ---------- */
  function cursorLabel() {
    if (!finePointer) return;
    const lab = document.createElement("div"); lab.className = "cursor-label"; lab.setAttribute("aria-hidden", "true"); document.body.appendChild(lab);
    let tx = 0, ty = 0, x = 0, y = 0, on = false, text = "";
    document.addEventListener("pointermove", e => {
      tx = e.clientX; ty = e.clientY;
      const t = e.target && e.target.closest ? e.target.closest("[data-cursor]") : null;
      const next = t ? t.dataset.cursor : "";
      if (next !== text) { text = next; if (text) lab.textContent = text; if (!on && text) { x = tx; y = ty; } on = !!text; lab.classList.toggle("is-on", on); }
    }, { passive: true });
    document.addEventListener("pointerleave", () => { on = false; text = ""; lab.classList.remove("is-on"); });
    // motion: feedback: the cursor says what a click does.
    frameSubs.add(() => {
      if (!on && Math.abs(x - tx) < .5 && Math.abs(y - ty) < .5) return;
      x += (tx - x) * .22; y += (ty - y) * .22;
      const w = lab.offsetWidth || 60, lx = Math.min(x + 12, window.innerWidth - w - 4), ly = Math.min(y + 12, window.innerHeight - 28);
      lab.style.transform = `translate3d(${Math.round(lx)}px, ${Math.round(ly)}px, 0)`;
    });
  }

  /* ---------- cursor trail: 24px cells that light where the pointer passes and decay over 900ms ---------- */
  function trail(o = {}) {
    if (!finePointer || reduced) return null;
    const cv = document.createElement("canvas"); cv.className = "trail"; cv.setAttribute("aria-hidden", "true"); cv.hidden = true; document.body.prepend(cv); // hidden while empty: an empty fixed canvas is still a layer the compositor draws every frame
    const ctx = cv.getContext("2d"); const CELL = 24, LIFE = 900; const cells = new Map(); let W = 0, H = 0, last = null, painted = false;
    const size = () => { W = window.innerWidth; H = window.innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.width = W + "px"; cv.style.height = H + "px"; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
    size(); window.addEventListener("resize", size);
    const mark = (x, y, t) => cells.set(((x / CELL) | 0) + "," + ((y / CELL) | 0), t);
    document.addEventListener("pointermove", e => {
      const over = e.target && e.target.closest ? e.target.closest(".chart, .prose, .spark, .no-trail, .pill, .menu") : null;
      if (over) { last = null; return; }
      const t = performance.now();
      if (last) { const dx = e.clientX - last.x, dy = e.clientY - last.y, n = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 10)); for (let i = 1; i <= n; i++) mark(last.x + dx * i / n, last.y + dy * i / n, t); }
      else mark(e.clientX, e.clientY, t);
      last = { x: e.clientX, y: e.clientY };
    }, { passive: true });
    document.addEventListener("pointerleave", () => { last = null; });
    // motion: feedback: the ground remembers where the pointer has been for just under a second.
    frameSubs.add(now => {
      if (!cells.size) { if (painted) { ctx.clearRect(0, 0, W, H); painted = false; cv.hidden = true; } return; }
      if (!painted) cv.hidden = false;
      ctx.clearRect(0, 0, W, H); painted = true; ctx.fillStyle = "#FF4D3D";
      for (const [k, t] of cells) {
        const age = now - t; if (age > LIFE) { cells.delete(k); continue; }
        const c = k.indexOf(","), cx = +k.slice(0, c), cy = +k.slice(c + 1);
        ctx.globalAlpha = .12 * (1 - age / LIFE); ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, CELL - 1);
      }
      ctx.globalAlpha = 1;
      if (o.under) o.under(ctx, W, H);
    });
    return cv;
  }

  /* ---------- the direction's own line chart: same anatomy as lib/charts.js, plus named states for the narrator ---------- */
  function lineChart(container, o) {
    const c = typeof container === "string" ? $(container) : container; c.classList.add("chart"); c.innerHTML = "";
    const add = (cls, text) => { const d = document.createElement("div"); d.className = cls; d.textContent = text; c.appendChild(d); return d; };
    if (o.title) add("chart-title", o.title);
    if (o.subtitle) add("chart-subtitle", o.subtitle);
    const legendItems = {};
    if (o.legend) {
      const l = document.createElement("div"); l.className = "chart-legend";
      o.legend.forEach(it => { const s = document.createElement("span"); s.className = "legend-item"; s.innerHTML = `<i class="legend-swatch"></i>${it.label}`; l.appendChild(s); legendItems[it.key] = s; });
      c.appendChild(l);
    }
    const w = o.width || 784, h = o.height || 330, m = Object.assign({ t: 44, r: 128, b: 34, l: 36 }, o.margin || {});
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "chart-svg", role: "img", "aria-label": o.title || "chart" }); c.appendChild(svg);
    if (o.source) add("chart-source", o.source);
    const xs = o.x, keys = Object.keys(o.series), y0 = o.yDomain[0], y1 = o.yDomain[1];
    const sx = x => m.l + (x - xs[0]) / (xs[xs.length - 1] - xs[0]) * (w - m.l - m.r);
    const sy = v => (h - m.b) - (v - y0) / (y1 - y0) * (h - m.b - m.t);
    for (let v = y0; v <= y1; v += (o.yStep || 10)) { el("line", { x1: m.l, x2: w - m.r, y1: sy(v), y2: sy(v), class: "grid" }, svg); txt(svg, m.l - 8, sy(v) + 4, (o.yFormat || (d => d))(v), { class: "tick tick--y", "text-anchor": "end" }); }
    (o.xTicks || xs.filter(x => x % 5 === 0)).forEach(x => txt(svg, sx(x), h - m.b + 18, (o.xFormat || (d => d))(x), { class: "tick tick--x", "text-anchor": "middle" }));
    el("line", { x1: m.l, x2: w - m.r, y1: sy(y0), y2: sy(y0), class: "axis" }, svg);
    const paths = {}, dots = {}, labels = {};
    keys.forEach(k => {
      const d = o.series[k].map((v, i) => `${i ? "L" : "M"}${sx(xs[i]).toFixed(1)},${sy(v).toFixed(1)}`).join("");
      paths[k] = el("path", { d, class: "series series--" + k, fill: "none" }, svg);
      const last = o.series[k][o.series[k].length - 1], lx = sx(xs[xs.length - 1]), ly = sy(last);
      dots[k] = el("circle", { cx: lx, cy: ly, r: 3.5, class: "end-dot end-dot--" + k }, svg);
      labels[k] = txt(svg, lx + 10, ly + 4, `${(o.labels && o.labels[k]) || k} ${(o.endFormat || (v => v.toFixed(1) + "%"))(last)}`, { class: "end-label end-label--" + k });
    });
    const marker = el("g", { class: "marker50" + (o.staged ? " is-off" : "") }, svg);
    if (o.marker !== false) { el("line", { x1: m.l, x2: w - m.r, y1: sy(50), y2: sy(50) }, marker); txt(marker, w - m.r - 4, sy(50) - 6, o.markerText || "50%", { "text-anchor": "end" }); }
    const annos = {};
    (o.annotations || []).forEach((a, idx) => {
      const i = xs.indexOf(a.year); if (i < 0) return;
      const v = o.series[a.series || o.highlight][i], x = sx(a.year), y = sy(v), dy = a.dy !== undefined ? a.dy : (idx % 2 ? 44 : -44);
      const g = el("g", { class: "anno" + (o.staged ? " is-off" : ""), "data-year": a.year }, svg);
      el("line", { x1: x, x2: x, y1: y, y2: y + dy, class: "annotation-line" }, g);
      el("circle", { cx: x, cy: y, r: 4.5, class: "annotation-dot" }, g);
      txt(g, x + (a.anchor === "end" ? -6 : 6), y + dy + (dy > 0 ? 14 : -8), a.text, { class: "annotation", "text-anchor": a.anchor || "start" });
      annos[a.year] = g;
    });
    const STATES = {
      "highlight-middle": { hl: "middle", annos: [], marker: false },
      "annotate-2009": { hl: "middle", annos: [2009], marker: false },
      "annotate-2016": { hl: "middle", annos: [2009, 2016], marker: true },
      "highlight-high": { hl: "high", second: "middle", annos: [2009, 2016], marker: true },
      "final": { hl: "middle", annos: [2009, 2016], marker: false }
    };
    function setState(name) {
      const s = STATES[name] || STATES.final;
      keys.forEach(k => {
        const role = k === s.hl ? "hl" : k === s.second ? "second" : "";
        paths[k].setAttribute("class", "series series--" + k + (role ? " series--" + role : ""));
        dots[k].setAttribute("class", "end-dot end-dot--" + k + (role ? " end-dot--" + role : ""));
        labels[k].setAttribute("class", "end-label end-label--" + k + (role ? " end-label--" + role : ""));
        if (legendItems[k]) legendItems[k].className = "legend-item" + (role ? " legend-item--" + role : "");
      });
      svg.appendChild(paths[s.hl]); svg.appendChild(dots[s.hl]); svg.appendChild(labels[s.hl]);
      Object.keys(annos).forEach(y => annos[y].classList.toggle("is-off", !s.annos.includes(+y)));
      marker.classList.toggle("is-off", !s.marker);
      Object.keys(annos).forEach(y => svg.appendChild(annos[y]));
      svg.dataset.state = name;
    }
    setState(o.state || "final");
    return { svg, c, w, h, sx, sy, setState };
  }

  /* A 24-hour attention chart for a radar item: the same anatomy, hours on the x axis. */
  function attentionChart(container, it, o = {}) {
    const c = typeof container === "string" ? $(container) : container; c.classList.add("chart", "hued"); c.innerHTML = ""; c.style.cssText += hueVars(it.topicTag);
    const add = (cls, text) => { const d = document.createElement("div"); d.className = cls; d.textContent = text; c.appendChild(d); return d; };
    add("chart-title", `${it.topic}: ${sign(it.movement)} on the radar in 24 hours`);
    add("chart-subtitle", `Composite attention score across ${V.radar.sourcesPolled} sources, hourly, to ${V.radar.lastRefresh} today (index)`);
    const w = o.width || 700, h = o.height || 200, m = { t: 16, r: 72, b: 30, l: 40 }, vals = it.spark;
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "chart-svg", role: "img", "aria-label": it.topic }); c.appendChild(svg);
    add("chart-source", `Source: Visinage radar, ${V.radar.sourcesPolled} sources polled, refreshed ${V.radar.lastRefresh}. ${V.demoLabel}.`);
    const mn = Math.floor(Math.min(...vals, 0) / 50) * 50, mx = Math.ceil(Math.max(...vals) / 50) * 50;
    const sx = i => m.l + i / (vals.length - 1) * (w - m.l - m.r), sy = v => (h - m.b) - (v - mn) / (mx - mn) * (h - m.b - m.t);
    for (let v = mn; v <= mx; v += (mx - mn) > 150 ? 100 : 50) { el("line", { x1: m.l, x2: w - m.r, y1: sy(v), y2: sy(v), class: "grid" }, svg); txt(svg, m.l - 8, sy(v) + 4, v, { class: "tick", "text-anchor": "end" }); }
    [[0, "24h ago"], [12, "12h ago"], [23, "now"]].forEach(([i, s]) => txt(svg, sx(i), h - m.b + 18, s, { class: "tick", "text-anchor": i === 0 ? "start" : i === 23 ? "end" : "middle" }));
    el("line", { x1: m.l, x2: w - m.r, y1: sy(mn), y2: sy(mn), class: "axis" }, svg);
    const d = vals.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
    const p = el("path", { d, class: "series series--hl", fill: "none", style: "stroke:var(--hue)" }, svg);
    el("circle", { cx: sx(vals.length - 1), cy: sy(vals[vals.length - 1]), r: 3.5, class: "end-dot end-dot--hl", style: "fill:var(--hue)" }, svg);
    txt(svg, sx(vals.length - 1) + 10, sy(vals[vals.length - 1]) + 4, `${vals[vals.length - 1]} now`, { class: "end-label end-label--hl" });
    return { svg, path: p };
  }

  /* Twelve small multiples: start to end slope per country, the 50% line as the reference. */
  function slopes(container, rows, o = {}) {
    const c = typeof container === "string" ? $(container) : container; c.innerHTML = "";
    if (o.title) { const t = document.createElement("div"); t.className = "chart-title"; t.textContent = o.title; c.appendChild(t); }
    if (o.subtitle) { const t = document.createElement("div"); t.className = "chart-subtitle"; t.textContent = o.subtitle; c.appendChild(t); }
    const grid = document.createElement("div"); grid.className = "slopes"; c.appendChild(grid);
    const min = 40, max = 65, w = 120, h = 64, sy = v => 8 + (max - v) / (max - min) * (h - 16);
    rows.forEach((r, i) => {
      const cell = document.createElement("div"); cell.className = "slope";
      cell.innerHTML = `<div class="name">${r.name}</div>`;
      const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, role: "img", "aria-label": `${r.name}: ${r.s}% to ${r.e}%` });
      el("line", { x1: 26, x2: w - 26, y1: sy(50), y2: sy(50), class: "half" }, svg);
      el("line", { x1: 26, x2: w - 26, y1: sy(r.s), y2: sy(r.e), class: "line series" }, svg);
      el("circle", { cx: 26, cy: sy(r.s), r: 3, class: "pt pt--s" }, svg);
      el("circle", { cx: w - 26, cy: sy(r.e), r: 3, class: "pt" }, svg);
      txt(svg, 20, sy(r.s) + 4, r.s.toFixed(0), { "text-anchor": "end" });
      txt(svg, w - 20, sy(r.e) + 4, r.e.toFixed(0), { class: "e" });
      cell.appendChild(svg); grid.appendChild(cell);
    });
    if (o.source) { const s = document.createElement("div"); s.className = "chart-source slopes-source"; s.textContent = o.source; c.appendChild(s); }
    return grid;
  }

  /* Strip thumbnails: previews of the piece's chart at 120px tall (the full chart, with its anatomy, is in the expanded row). */
  const thumbs = {
    dumbbell(rows) { const w = 126, h = 100, max = 40, sx = v => 4 + v / max * (w - 8); const svg = el("svg", { viewBox: `0 0 ${w} ${h}` }); rows.forEach((r, i) => { const y = 6 + i * (h - 12) / (rows.length - 1); el("line", { x1: sx(r.a), x2: sx(r.b), y1: y, y2: y, class: "dumbbell" }, svg); el("circle", { cx: sx(r.a), cy: y, r: 2.5, class: "dot--a" }, svg); el("circle", { cx: sx(r.b), cy: y, r: 2.5, class: "dot--b" }, svg); }); return svg; },
    bars(rows) { const w = 126, h = 100, max = 60, sx = v => v / max * w; const svg = el("svg", { viewBox: `0 0 ${w} ${h}` }); rows.forEach((r, i) => { const y = i * (h / rows.length); el("rect", { x: 0, y: y + 3, width: sx(r.v), height: h / rows.length - 6, class: "bar" }, svg); }); return svg; },
    spark(vals) { const w = 126, h = 100, mn = Math.min(...vals), mx = Math.max(...vals), sx = i => i / (vals.length - 1) * w, sy = v => h - 4 - (v - mn) / (mx - mn + 1e-9) * (h - 8); const svg = el("svg", { viewBox: `0 0 ${w} ${h}` }); [0, .5, 1].forEach(f => el("line", { x1: 0, x2: w, y1: 4 + f * (h - 8), y2: 4 + f * (h - 8), class: "grid" }, svg)); el("path", { d: vals.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(""), class: "series" }, svg); el("circle", { cx: w, cy: sy(vals[vals.length - 1]), r: 2.5, class: "dot--b" }, svg); return svg; },
    slopes(rows) { const w = 126, h = 100, svg = el("svg", { viewBox: `0 0 ${w} ${h}` }); const cw = w / 6, ch = h / 2, sy = v => (65 - v) / 25 * (ch - 10) + 5; rows.forEach((r, i) => { const ox = (i % 6) * cw, oy = Math.floor(i / 6) * ch; el("line", { x1: ox + 3, x2: ox + cw - 3, y1: oy + sy(r.s), y2: oy + sy(r.e), class: "series" }, svg); }); return svg; },
    tiers() { const w = 126, h = 100, ys = V.series, sx = i => i / 29 * w, sy = v => h - 4 - (v - 10) / 50 * (h - 8); const svg = el("svg", { viewBox: `0 0 ${w} ${h}` }); ["high", "low"].forEach(k => el("path", { d: ys[k].map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(""), class: "grid", fill: "none", style: "stroke-width:1.2" }, svg)); el("path", { d: ys.middle.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(""), class: "series" }, svg); return svg; }
  };

  /* ---------- the particle morph: the ring resolves into the chart (mechanism lifted from lib/art.js VArt.morph) ---------- */
  function morph(canvas, o) {
    const w = o.width, h = o.height, ctx = canvas.getContext("2d");
    canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR); canvas.style.width = w + "px"; canvas.style.height = h + "px"; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const rnd = mulberry(VA.hash(o.seed || "morph")), cx = o.cx, cy = o.cy, R = o.R, targets = [];
    o.lines.forEach((pts, li) => {
      const per = Math.floor(o.count / o.lines.length);
      for (let i = 0; i < per; i++) {
        const t = i / per, k = t * (pts.length - 1), a = Math.floor(k), b = Math.min(pts.length - 1, a + 1), f = k - a;
        targets.push({ tx: pts[a][0] + (pts[b][0] - pts[a][0]) * f + (rnd() - .5) * 2.5, ty: pts[a][1] + (pts[b][1] - pts[a][1]) * f + (rnd() - .5) * 2.5, c: o.colors[li], r: (li === o.highlight ? 1.7 : 1.1) + rnd() * .6 });
      }
    });
    const P = targets.map(t => { const ang = rnd() * Math.PI * 2, rr = R * (.86 + rnd() * .28); return Object.assign({ sx: cx + Math.cos(ang) * rr, sy: cy + Math.sin(ang) * rr, j: rnd() * Math.PI * 2 }, t); });
    let p = 0, time = 0, settled = false;
    /* The tick ring, drawn into any context centred on (0,0); used live during the morph and once for the CSS-rotated canvas. */
    function ticks(c, alpha) {
      c.save(); c.globalAlpha = alpha; c.strokeStyle = o.ring; c.lineWidth = 1;
      c.beginPath(); c.arc(0, 0, R + 14, 0, Math.PI * 2); c.stroke();
      for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, L = i % 10 === 0 ? 16 : i % 5 === 0 ? 9 : 5; c.beginPath(); c.moveTo(Math.cos(a) * (R + 18), Math.sin(a) * (R + 18)); c.lineTo(Math.cos(a) * (R + 18 + L), Math.sin(a) * (R + 18 + L)); c.stroke(); }
      c.globalAlpha = alpha * .5; c.beginPath(); c.arc(0, 0, R * .72, 0, Math.PI * 2); c.stroke();
      c.restore();
    }
    function particles(e, wobble) {
      for (const q of P) {
        const wob = wobble ? Math.sin(time * 1.3 + q.j) * (1 - e) * 6 : 0, x = q.sx + (q.tx - q.sx) * e + wob, y = q.sy + (q.ty - q.sy) * e + wob * .6;
        ctx.fillStyle = q.c; ctx.globalAlpha = .55 + .35 * e; ctx.beginPath(); ctx.arc(x, y, q.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    function draw(dt) {
      if (settled) return;
      time += dt; ctx.clearRect(0, 0, w, h);
      const e = easeInOut(p);
      // the instrument ring: 120 ticks turning at 0.15 rad/s, fading to 20% alpha as the particles land
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * .15); ticks(ctx, 1 - .8 * e); ctx.restore();
      particles(e, true);
    }
    /* Settled: the particles are drawn once in their final place and the loop does no further work; the ring ticks
       move to a separate canvas that the compositor rotates. */
    function settle() { settled = true; p = 1; ctx.clearRect(0, 0, w, h); particles(1, false); }
    function unsettle() { settled = false; }
    return { set(v) { p = clamp(v, 0, 1); }, draw, settle, unsettle, ticks, get p() { return p; }, get time() { return time; }, get settled() { return settled; } };
  }

  /* ---------- a drifting flow field for the video poster, driven by the page's frame loop (mechanism from VArt.loop) ---------- */
  function flowLoop(canvas, o) {
    const w = o.width, h = o.height, ctx = canvas.getContext("2d");
    canvas.width = Math.round(w * DPR); canvas.height = Math.round(h * DPR); canvas.style.width = "100%"; canvas.style.height = "100%"; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    const seed = VA.hash(o.seed || "loop"), rnd = mulberry(seed), g = new Float32Array(256 * 256); const r2 = mulberry(seed ^ 0x9e3779b9); for (let i = 0; i < g.length; i++) g[i] = r2();
    const sm = t => t * t * (3 - 2 * t);
    const noise = (x, y) => { const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, xf = x - Math.floor(x), yf = y - Math.floor(y); const a = g[yi * 256 + xi], b = g[yi * 256 + ((xi + 1) & 255)], c = g[((yi + 1) & 255) * 256 + xi], d = g[((yi + 1) & 255) * 256 + ((xi + 1) & 255)]; const u = sm(xf), v = sm(yf); return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v; };
    const cols = o.colors, P = Array.from({ length: o.count || 500 }, () => ({ x: rnd() * w, y: rnd() * h, c: cols[Math.floor(rnd() * cols.length)], a: .2 + rnd() * .5 }));
    ctx.fillStyle = o.bg; ctx.fillRect(0, 0, w, h);
    let t = 0;
    function step() {
      ctx.fillStyle = o.bg; ctx.globalAlpha = .08; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1; t += .004;
      for (const p of P) {
        const a = (noise(p.x * .004 + t, p.y * .004 - t) - .5) * Math.PI * 4, nx = p.x + Math.cos(a) * 1.2, ny = p.y + Math.sin(a) * 1.2;
        ctx.strokeStyle = p.c; ctx.globalAlpha = p.a; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) { p.x = rnd() * w; p.y = rnd() * h; }
      }
      ctx.globalAlpha = 1;
    }
    /* The settled poster frame is built in idle slices by the caller (o.warm steps), never in one synchronous burst. */
    return { step };
  }

  /* ---------- the ring board (radar): eight segments, needle at now, sources as rim ticks ---------- */
  function ringBoard(host, items, o = {}) {
    const S = 720, C = 360, RIM = 318, R0 = 180, LMAX = 100, slot = Math.PI * 2 / items.length, gap = .07;
    const maxMove = Math.max(...items.map(i => Math.abs(i.movement)));
    const P = (r, a) => [C + Math.cos(a) * r, C + Math.sin(a) * r];
    const arc = (r, a0, a1, sweep) => { const [x0, y0] = P(r, sweep ? a0 : a1), [x1, y1] = P(r, sweep ? a1 : a0); return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r},${r} 0 0 ${sweep ? 1 : 0} ${x1.toFixed(2)},${y1.toFixed(2)}`; };
    const annulus = (a0, a1, r0, r1) => { const [x0, y0] = P(r1, a0), [x1, y1] = P(r1, a1), [x2, y2] = P(r0, a1), [x3, y3] = P(r0, a0); return `M${x0.toFixed(2)},${y0.toFixed(2)}A${r1},${r1} 0 0 1 ${x1.toFixed(2)},${y1.toFixed(2)}L${x2.toFixed(2)},${y2.toFixed(2)}A${r0},${r0} 0 0 0 ${x3.toFixed(2)},${y3.toFixed(2)}Z`; };
    const wrap = document.createElement("div"); wrap.className = "ring-wrap" + (o.compact ? " ring-wrap--compact" : "");
    const svg = el("svg", { viewBox: `0 0 ${S} ${S}`, class: "ring-svg" + (o.compact ? " ring-svg--compact" : ""), role: "img", "aria-label": `Radar board: ${items.length} topics moving, refreshed ${V.radar.lastRefresh}` });
    const defs = el("defs", {}, svg);
    el("circle", { cx: C, cy: C, r: RIM, class: "rim" }, svg);
    el("circle", { cx: C, cy: C, r: R0, class: "zero" }, svg);
    for (let i = 0; i < 96; i++) { const a = i / 96 * Math.PI * 2 - Math.PI / 2, major = i % 4 === 0, [x0, y0] = P(RIM - (major ? 14 : 7), a), [x1, y1] = P(RIM, a); el("line", { x1: x0.toFixed(1), y1: y0.toFixed(1), x2: x1.toFixed(1), y2: y1.toFixed(1), class: "rt" + (major ? " rt--major" : "") }, svg); }
    const segs = [];
    items.forEach((it, i) => {
      const a0 = -Math.PI / 2 + i * slot + gap / 2, a1 = a0 + slot - gap, L = Math.abs(it.movement) / maxMove * LMAX;
      const rIn = it.movement >= 0 ? R0 : R0 - L, rOut = it.movement >= 0 ? R0 + L : R0, hue = hueOf(it.topicTag), mid = (a0 + a1) / 2;
      const a = el("a", { href: "#radar-item-" + it.rank, class: "ring-seg hued", "data-rank": it.rank, style: hueVars(it.topicTag), "aria-label": `${it.rank}. ${it.topic}, ${sign(it.movement)}` }, svg);
      el("title", {}, a).textContent = `${it.topic}: ${sign(it.movement)}`;
      el("path", { d: annulus(a0, a1, rIn, rOut), class: "seg" }, a);
      const n = it.sources.length; it.sources.forEach((s, k) => { const sa = a0 + .05 + (a1 - a0 - .1) * (n === 1 ? .5 : k / (n - 1)); const [x0, y0] = P(RIM + 3, sa), [x1, y1] = P(RIM + 11, sa); const t = el("line", { x1: x0.toFixed(1), y1: y0.toFixed(1), x2: x1.toFixed(1), y2: y1.toFixed(1), class: "src" }, a); el("title", {}, t).textContent = s; });
      const [rx, ry] = P(R0 - 22, mid); txt(a, rx, ry + 4, pad2(it.rank), { class: "rank", "text-anchor": "middle" });
      const bottom = Math.sin(mid) > 0, id = `arc-${o.compact ? "c" : "b"}-${it.rank}`;
      el("path", { id, d: arc(RIM + 22, a0, a1, !bottom), fill: "none" }, defs);
      const t = el("text", { class: "arc-label" }, a); const tp = el("textPath", { href: "#" + id, startOffset: "50%", "text-anchor": "middle" }, t); tp.setAttribute("xlink:href", "#" + id); tp.textContent = it.topic;
      segs.push(a);
    });
    const hourAngle = hm => { const [h, mnt] = hm.split(":").map(Number); return (h + mnt / 60) / 24 * Math.PI * 2 - Math.PI / 2; };
    const an = hourAngle(V.radar.lastRefresh), ax = hourAngle(V.radar.nextRefresh);
    const [nx0, ny0] = P(RIM - 8, ax), [nx1, ny1] = P(RIM + 8, ax); el("line", { x1: nx0, y1: ny0, x2: nx1, y2: ny1, class: "next-tick" }, svg);
    const [nlx, nly] = P(RIM + 36, ax); txt(svg, nlx, nly + 4, `next ${V.radar.nextRefresh}`, { class: "next-label", "text-anchor": Math.cos(ax) < 0 ? "end" : "start" });
    const [px, py] = P(RIM, an); el("line", { x1: C, y1: C, x2: px.toFixed(1), y2: py.toFixed(1), class: "needle" }, svg);
    el("circle", { cx: px.toFixed(1), cy: py.toFixed(1), r: 5, class: "needle-dot" }, svg);
    const [lx, ly] = P(RIM + 40, an); txt(svg, lx, ly + 4, `now ${V.radar.lastRefresh}`, { class: "now-label", "text-anchor": Math.cos(an) < 0 ? "end" : "start" });
    wrap.appendChild(svg);
    /* The live dot's pulse is a DOM element over the ring, so its animation runs on the compositor and never repaints the filtered SVG. */
    const pulse = document.createElement("i"); pulse.className = "ring-pulse"; pulse.setAttribute("aria-hidden", "true"); pulse.style.left = (px / S * 100).toFixed(2) + "%"; pulse.style.top = (py / S * 100).toFixed(2) + "%"; wrap.appendChild(pulse);
    const centre = document.createElement("div"); centre.className = "ring-centre"; wrap.appendChild(centre);
    const idle = () => { centre.classList.remove("hued"); centre.style.cssText = ""; centre.innerHTML = `<div class="big">${items.length}</div><div class="mono">moving</div><div class="mono">refreshed ${V.radar.lastRefresh}<br>next ${V.radar.nextRefresh}</div>`; };
    const show = it => { centre.classList.add("hued"); centre.style.cssText = hueVars(it.topicTag); centre.innerHTML = `<div class="big is-hue">${sign(it.movement)}</div><div class="ctopic">${it.topic}</div><div class="mono">${it.topicTag} · ${it.sources.length} sources</div>`; };
    idle();
    host.appendChild(wrap);
    return { svg, segs, show, idle };
  }

  function ringMarkSVG(cls = "ring-mark") {
    let s = `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="22"/>`;
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, L = i % 15 === 0 ? 11 : i % 5 === 0 ? 7 : 3; const x0 = 50 + Math.cos(a) * 42, y0 = 50 + Math.sin(a) * 42, x1 = 50 + Math.cos(a) * (42 - L), y1 = 50 + Math.sin(a) * (42 - L); s += `<line class="tk${i % 15 === 0 ? " tk--major" : ""}" x1="${x0.toFixed(1)}" y1="${y0.toFixed(1)}" x2="${x1.toFixed(1)}" y2="${y1.toFixed(1)}"/>`; }
    return s + "</svg>";
  }

  /* ---------- footer ---------- */
  function footer(compact) {
    const f = $("#footer"); if (!f) return;
    const F = V.footer;
    f.innerHTML = `<div class="frame iu">${compact ? "" : `<svg class="foot-word" viewBox="0 0 1000 150" aria-label="Visinage"><text x="0" y="128" textLength="1000" lengthAdjust="spacingAndGlyphs" font-size="150">VISINAGE</text></svg>`}
      <div class="foot-grid">
        <div class="foot-about">${ringMarkSVG()}<p>${F.about}</p></div>
        ${F.cols.map(c => `<div class="foot-col"><h4>${c.h}</h4><ul>${c.links.map(l => `<li><a href="#">${l}</a></li>`).join("")}</ul></div>`).join("")}
        <div class="foot-bottom"><span class="mono">${F.legal}</span><span class="mono">${F.demo}</span></div>
      </div></div>`;
    const word = $(".foot-word", f);
    if (word) { if (reduced || !("IntersectionObserver" in window)) word.classList.add("is-in"); else { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { word.classList.add("is-in"); io.disconnect(); } }, { threshold: .3 }); io.observe(word); } }
  }

  /* Reveal in reading order. Unlike VMotion.reveal this keeps the element's own --i (a local stagger of at most
     a few steps) instead of its index in the whole page, so a module low on the page never waits seconds to appear. */
  function reveal(selector) {
    const els = $$(selector);
    if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(e => io.observe(e));
  }

  /* Draw-in: set the dash length of every series inside a container so the CSS transition can draw it. */
  function prepDraw(host) {
    $$("path.series, line.series, line.dumbbell", host).forEach(p => { const L = p.getTotalLength ? Math.ceil(p.getTotalLength()) + 2 : 2000; p.style.setProperty("--len", L); });
  }
  /* Charts draw in one at a time: a chart that enters the viewport joins a queue and starts 520ms after the previous
     one, so at most one SVG repaints per frame while a line is being drawn. */
  const drawQueue = []; let drawBusy = false, groundFadingUntil = 0;
  function drawNext() {
    if (drawBusy || !drawQueue.length) return;
    const wait = groundFadingUntil - performance.now();
    if (wait > 0) { drawBusy = true; setTimeout(() => { drawBusy = false; drawNext(); }, wait); return; } // let the ground fade have the frame
    drawBusy = true; drawQueue.shift().classList.add("is-drawn");
    setTimeout(() => { drawBusy = false; drawNext(); }, 520);
  }
  function armDraw(selector) {
    const els = $$(selector);
    if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-drawn")); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { drawQueue.push(e.target); io.unobserve(e.target); drawNext(); } }), { threshold: .35 });
    els.forEach(e => { prepDraw(e); io.observe(e); });
  }

  /* =====================================================================================================
     HOME
     ===================================================================================================== */
  function home() {
    const F = V.featured, E = V.visualEssay;
    $("#hero-kicker").innerHTML = `<span><b>Research</b> / ${F.kicker}</span><span>${F.date}</span><span>${F.readTime}</span>`;
    $("#hero-title").innerHTML = F.title.split(" ").map((w, i) => `<span class="w" style="transition-delay:${80 + i * 70}ms">${w}</span>`).join(" ");
    $("#hero-deck").textContent = F.deck;
    $("#hero-byline").innerHTML = `<span>By <b>${V.author}</b></span><span>${F.date}</span><span>${F.readTime}</span>`;
    $("#hero-tags").innerHTML = F.tags.map(t => `<a class="chip" href="#" data-cursor="READ">${t}</a>`).join("");
    $("#hero-nums").innerHTML = V.article.twoSpeeds.numbers.map((n, i) => `<div class="hnum"><div class="label">[ ${pad2(i + 1)} ]</div><div class="num" data-value="${n.value}">${reduced ? n.value : zeroForm(n.value)}</div><p>${n.label}</p></div>`).join("");

    /* The lead chart and the ring. The canvas covers the whole hero so the 720px ring can bleed; the particles
       target the chart lines in canvas coordinates taken from the rendered SVG. Once the particles have settled the
       canvas is drawn one last time and the tick ring moves to #ring-ticks, which a CSS animation rotates. */
    const hero = $("#hero"), stage = $("#hero-stage"), canvas = $("#ring"), ticksCanvas = $("#ring-ticks");
    let lead = null, M = null, playing = false, heroVisible = true, resolved = false;
    const showTicks = t => { ticksCanvas.style.animationDelay = `-${(t % 41.9).toFixed(2)}s`; ticksCanvas.classList.add("is-on"); };
    const hideTicks = () => ticksCanvas.classList.remove("is-on");
    const leadOpts = mobile => ({
      title: F.chartTitle, subtitle: F.chartSubtitle, source: F.source,
      width: mobile ? 358 : 784, height: mobile ? 250 : 330, margin: mobile ? { t: 40, r: 112, b: 30, l: 30 } : { t: 44, r: 128, b: 34, l: 36 },
      x: V.years, series: V.series, labels: V.seriesLabels, highlight: "middle", yDomain: [10, 60], yStep: 10, xTicks: mobile ? [1995, 2005, 2015, 2024] : undefined,
      annotations: V.annotations.map((a, i) => ({ year: a.year, series: "middle", text: mobile ? (i ? a.text.replace("Middle-wage share falls ", "") : a.text.split(":")[0]) : a.text, dy: i ? 48 : -46, anchor: i ? "end" : "start" })),
      legend: [{ key: "middle", label: V.seriesLabels.middle }, { key: "high", label: V.seriesLabels.high }, { key: "low", label: V.seriesLabels.low }],
      marker: false, state: "final"
    });
    function buildRing() {
      const hr = hero.getBoundingClientRect(), W = Math.round(hr.width), H = Math.round(hr.height);
      const sr = lead.svg.getBoundingClientRect(), s = sr.width / lead.w, ox = sr.left - hr.left, oy = sr.top - hr.top;
      const lines = ["high", "low", "middle"].map(k => V.series[k].map((v, i) => [ox + lead.sx(V.years[i]) * s, oy + lead.sy(v) * s]));
      const mobile = phoneMQ.matches, R = mobile ? Math.min(150, W * .42) : Math.min(330, W * .3);
      const plotCx = ox + (lead.sx(1995) + lead.sx(2024)) / 2 * s, plotCy = oy + (lead.sy(10) + lead.sy(60)) / 2 * s;
      const cx = mobile ? W / 2 : plotCx, cy = clamp(plotCy, R + 24, Math.max(R + 24, H - R - 24));
      const prev = M ? M.p : 0, wasSettled = M ? M.settled : false, prevTime = M ? M.time : 0;
      M = morph(canvas, { width: W, height: H, cx, cy, R, lines, colors: ["#5C6170", "#5C6170", "#FF4D3D"], highlight: 2, count: mobile ? 1200 : 2600, ring: "#A9ACB3", seed: "visinage-instrument" });
      /* The tick ring canvas: drawn once, centred on the ring, rotated by CSS once the particles have settled. */
      const S = Math.ceil((R + 40) * 2), tc = ticksCanvas.getContext("2d");
      ticksCanvas.width = Math.round(S * DPR); ticksCanvas.height = Math.round(S * DPR); ticksCanvas.style.width = S + "px"; ticksCanvas.style.height = S + "px";
      ticksCanvas.style.left = Math.round(cx - S / 2) + "px"; ticksCanvas.style.top = Math.round(cy - S / 2) + "px";
      tc.setTransform(DPR, 0, 0, DPR, S / 2, S / 2); tc.clearRect(-S / 2, -S / 2, S, S); M.ticks(tc, 1);
      M.set(prev);
      if (wasSettled) { M.settle(); showTicks(prevTime); } else M.draw(0);
    }
    function play() {
      if (!M) return;
      if (reduced) { M.set(1); M.settle(); showTicks(0); stage.classList.add("is-done"); return; }
      playing = true; resolved = false; stage.classList.remove("is-done"); hideTicks(); M.unsettle();
      // motion: storytelling: 2,600 particles leave the instrument ring and settle into the three wage-tier lines over 2.4 seconds; the chart is the finding arriving.
      tween(2400, p => { M.set(p); if (p > .74 && !resolved) { resolved = true; stage.classList.add("is-done"); } }, linear, () => { playing = false; M.settle(); showTicks(M.time); });
    }
    VC.responsive(mobile => { lead = lineChart("#chart-lead", leadOpts(mobile)); buildRing(); });
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; }, { threshold: 0 }).observe(hero);
    // motion: storytelling: the particle canvas is redrawn only while the morph is in flight and the hero is on screen; settled, it costs nothing per frame.
    frameSubs.add((now, dt) => { if (!M || !heroVisible || reduced || M.settled) return; M.draw(dt / 1000); });
    let rt = null; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (lead) buildRing(); }, 180); });
    const replay = () => { if (playing || !M) return; M.set(0); play(); };
    stage.addEventListener("click", e => { if (e.target.closest("a")) return; replay(); });
    stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); replay(); } });
    requestAnimationFrame(() => { document.body.classList.add("is-loaded"); setTimeout(play, 420); });

    /* Latest: Lama Lama rows. Six rows (five pieces and the visual essay); each has a right-anchored strip of
       previews and opens to the deck and the piece's chart drawing itself. */
    const R = V.radar.items;
    const pieces = V.latest.map(a => Object.assign({}, a)).concat([{ title: E.title, topic: "Labour", type: E.type, date: E.date, read: E.read, deck: E.deck, essay: true }]);
    const spec = [
      { art: ["flow", "ridges"], seed: "vacancy-wave", values: V.vacancy.rows.map(r => r.b / 40), series: [V.vacancy.rows.map(r => r.b)], thumb: () => thumbs.dumbbell(V.vacancy.rows), chart: "vacancy" },
      { art: ["ridges", "flow"], seed: "cheap-flight", values: R[6].spark.map(v => v / 50), series: [R[6].spark], thumb: () => thumbs.spark(R[6].spark), chart: "radar", item: R[6] },
      { art: ["flow", "ridges"], seed: "profit-share", values: V.profits.rows.map(r => r.v / 60), series: [V.profits.rows.map(r => r.v)], thumb: () => thumbs.bars(V.profits.rows), chart: "profits" },
      { art: ["ridges", "flow"], seed: "stadium-money", values: R[1].spark.map(v => v / 240), series: [R[1].spark], thumb: () => thumbs.spark(R[1].spark), chart: "radar", item: R[1] },
      { art: ["flow", "ridges"], seed: "forty-hours", values: R[3].spark.map(v => v / 126), series: [R[3].spark], thumb: () => thumbs.spark(R[3].spark), chart: "radar", item: R[3] },
      { art: ["ridges", "flow"], seed: "twelve-countries", values: V.countries.map(c => c.e / 60), series: V.countries.map(c => [c.s, (c.s * 2 + c.e) / 3, (c.s + c.e * 2) / 3, c.e]), thumb: () => thumbs.slopes(V.countries), chart: "slopes" }
    ];
    const rowsHost = $("#rows"), hoverable = finePointer;
    /* Cover art is rendered through one scratch canvas into <img> elements, in idle slices right after boot, so no
       canvas is allocated per row and nothing paints synchronously as rows scroll into view. */
    const scratch = document.createElement("canvas"); scratch.getContext("2d", { willReadFrequently: true }); // CPU-backed: encoding to an image is a copy, not a GPU readback
    /* Hover opens a row only when the pointer has just moved onto it; content sliding under a still pointer during a
       scroll does not flap rows open. Click, Enter and focus always work. */
    let lastMove = 0, lastScroll = 0, lastWheel = 0;
    document.addEventListener("pointermove", () => { lastMove = performance.now(); }, { passive: true });
    document.addEventListener("wheel", () => { lastWheel = performance.now(); }, { passive: true });
    window.addEventListener("scroll", () => { lastScroll = performance.now(); }, { passive: true });
    // the pointer moved onto the row, and the page was not wheeled or scrolled in the last 150ms (a wheel also reports a pointer move)
    const pointerIntent = () => { const n = performance.now(); return n - lastMove < 400 && n - lastWheel > 150 && n - lastScroll > 150; };
    pieces.forEach((a, i) => {
      const s = spec[i], hue = hueOf(a.topic);
      const r = document.createElement("article"); r.className = "row hued iu"; r.style.cssText = hueVars(a.topic) + `--i:${i};`; r.dataset.cursor = "READ";
      r.innerHTML = `<div class="row-head" role="button" tabindex="0" aria-expanded="false" aria-controls="rowmore-${i}">
          <h3 class="row-title h3"><a href="article.html">${a.title}</a></h3>
          <div class="row-meta mono"><span class="chip chip--hue hued" style="${hueVars(a.topic)}">${a.essay ? a.type : a.topic}</span><span>${a.date}</span><span>${a.read}</span></div>
          <span class="row-toggle" aria-hidden="true"></span>
          <div class="row-strip" aria-hidden="true"><img class="cov" width="160" height="120" alt="" data-art="${s.art[0]}" style="width:160px"><div class="thumb thumb--chart"></div><img class="cov" width="120" height="120" alt="" data-art="${s.art[1]}" style="width:120px"></div>
        </div>
        <div class="row-more" id="rowmore-${i}"><div class="row-more-in"><div class="row-more-grid">
          <div class="row-deck"><p>${a.deck}</p><div class="row-actions"><a class="btn btn--solid" href="article.html" data-cursor="READ">Read</a><a class="btn" href="#" data-cursor="DATA">Data</a></div></div>
          <div class="row-chart chart draw"></div>
        </div></div></div>`;
      rowsHost.appendChild(r);
      $(".thumb--chart", r).appendChild(s.thumb());
      const head = $(".row-head", r), chartHost = $(".row-chart", r);
      let charted = false;
      $$("img.cov", r).forEach((img, k) => whenIdle(() => {
        const w = k ? 120 : 160, h = 120;
        if (img.dataset.art === "flow") VA.flow(scratch, { width: w, height: h, seed: s.seed + k, colors: [hue, "#6F737B", "#ECE9E2"], values: s.values, count: 300, steps: 48, bg: "#15171B" });
        else VA.ridges(scratch, { width: w, height: h, seed: s.seed + k, series: s.series, colors: [hue, "#A9ACB3"], rows: 12, bg: "#15171B" });
        img.src = scratch.toDataURL("image/png");
      }));
      const ensureChart = () => {
        if (charted) return; charted = true;
        const cw = tabletMQ.matches ? 358 : 700;
        if (s.chart === "vacancy") VC.dumbbellChart(chartHost, { title: V.vacancy.title, subtitle: V.vacancy.subtitle, source: V.vacancy.source, width: cw, rows: V.vacancy.rows, max: 40, xStep: 10, labelA: "2019 Q4", labelB: "2026 Q2", rowHeight: 20, margin: { t: 24, r: 52, b: 26, l: 104 }, legend: [{ label: "2019 Q4", cls: "sw-a" }, { label: "2026 Q2", cls: "sw-b", hl: true }] });
        else if (s.chart === "profits") VC.barChart(chartHost, { title: V.profits.title, subtitle: V.profits.subtitle, source: V.profits.source, width: cw, rows: V.profits.rows, max: 60, xStep: 10, rowHeight: 24, margin: { t: 8, r: 48, b: 26, l: 104 } });
        else if (s.chart === "radar") attentionChart(chartHost, s.item, { width: cw, height: 200 });
        else slopes(chartHost, V.countries, { title: E.title, subtitle: "Middle-wage share of employment, 1995 to 2024 (%)", source: F.source });
        prepDraw(chartHost);
      };
      const open = v => {
        r.classList.toggle("is-open", v); head.setAttribute("aria-expanded", String(v));
        if (v) { ensureChart(); requestAnimationFrame(() => requestAnimationFrame(() => chartHost.classList.add("is-drawn"))); }
        else chartHost.classList.remove("is-drawn");
      };
      if (hoverable) { r.addEventListener("mouseenter", () => { if (pointerIntent()) open(true); }); r.addEventListener("mouseleave", () => open(false)); }
      head.addEventListener("click", e => { if (e.target.closest("a")) return; open(!r.classList.contains("is-open")); });
      head.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(!r.classList.contains("is-open")); } });
      r.addEventListener("focusin", e => { if (e.target.matches(":focus-visible")) open(true); });
      r.addEventListener("focusout", e => { if (!r.contains(e.relatedTarget) && hoverable) open(false); });
      if (!hoverable) open(true);
    });

    /* Data spotlight: the office-vacancy dumbbell with a two-sentence reading. */
    const sf = V.vacancy.rows[0], tor = V.vacancy.rows[2];
    $("#spot-title").textContent = V.vacancy.title;
    $("#spot-reading").textContent = `${sf.city} went from ${sf.a}% to ${sf.b}% between 2019 and 2026, ${tor.city} from ${tor.a}% to ${tor.b}%. ${V.questions[1].a}`;
    VC.responsive(mobile => {
      VC.dumbbellChart("#chart-vacancy", { title: V.vacancy.title, subtitle: V.vacancy.subtitle, source: V.vacancy.source, width: mobile ? 358 : 784, rows: V.vacancy.rows, max: 40, xStep: 10, labelA: "2019 Q4", labelB: "2026 Q2", rowHeight: mobile ? 28 : 34, margin: mobile ? { t: 26, r: 40, b: 26, l: 92 } : { t: 28, r: 60, b: 30, l: 130 }, legend: [{ label: "2019 Q4", cls: "sw-a" }, { label: "2026 Q2", cls: "sw-b", hl: true }] });
      prepDraw($("#chart-vacancy"));
    });

    /* Three questions: question as headline, one small chart each, the one-sentence answer, a source line, a link. */
    const qHost = $("#questions");
    qHost.innerHTML = V.questions.map((q, i) => `<article class="q iu"><div class="q-idx mono">[ Q${i + 1} ]</div><h3 class="h3">${q.q}</h3><div class="chart draw" id="q-chart-${i}"></div><p class="answer">${(() => { const k = q.a.indexOf(";") > 0 ? q.a.indexOf(";") : q.a.indexOf(","); return k > 0 ? `<b>${q.a.slice(0, k)}</b>${q.a.slice(k)}` : q.a; })()}</p><a class="link" href="article.html" data-cursor="READ">Read: ${q.piece} &rarr;</a></article>`).join("");
    VC.responsive(mobile => {
      const w = mobile ? 358 : 420;
      V.questions.forEach((q, i) => {
        const host = $("#q-chart-" + i);
        if (q.chart === "tiers") lineChart(host, { title: F.chartTitle, subtitle: F.chartSubtitle, source: F.source, width: w, height: 230, margin: { t: 38, r: mobile ? 112 : 100, b: 30, l: 30 }, x: V.years, series: V.series, labels: V.seriesLabels, highlight: "middle", yDomain: [10, 60], yStep: 10, xTicks: [1995, 2005, 2015, 2024], annotations: V.annotations.map((a, k) => ({ year: a.year, series: "middle", text: k ? a.text.replace("Middle-wage share falls ", "") : a.text.split(":")[0], dy: k ? 44 : -40, anchor: k ? "end" : "start" })), legend: [{ key: "middle", label: V.seriesLabels.middle }, { key: "high", label: V.seriesLabels.high }, { key: "low", label: V.seriesLabels.low }], marker: false, state: "final" });
        else if (q.chart === "vacancy") VC.dumbbellChart(host, { title: V.vacancy.title, subtitle: V.vacancy.subtitle, source: V.vacancy.source, width: w, rows: V.vacancy.rows, max: 40, xStep: 10, labelA: "2019 Q4", labelB: "2026 Q2", rowHeight: 20, margin: { t: 24, r: 40, b: 24, l: 92 }, legend: [{ label: "2019 Q4", cls: "sw-a" }, { label: "2026 Q2", cls: "sw-b", hl: true }] });
        else VC.barChart(host, { title: V.profits.title, subtitle: V.profits.subtitle, source: V.profits.source, width: w, rows: V.profits.rows, max: 60, xStep: 10, rowHeight: 24, margin: { t: 8, r: 44, b: 24, l: 96 } });
        prepDraw(host);
      });
    });

    /* Radar teaser: the top four, the refresh line, a compact ring. */
    $("#teaser-refresh").innerHTML = `<i class="live-dot" aria-hidden="true"></i><span>Refreshed ${V.radar.lastRefresh}, ${V.radar.refreshesToday} times today · next at ${V.radar.nextRefresh} · ${V.demoLabel}</span>`;
    ringBoard($("#teaser-ring"), R, { compact: true });
    $("#teaser-list").innerHTML = R.slice(0, 4).map(it => `<li class="titem hued" style="${hueVars(it.topicTag)}"><span class="rank mono">${pad2(it.rank)}</span><div class="topic">${it.topic}<small>${it.topicTag}</small></div><div class="move">${sign(it.movement)}<span>${it.direction === "up" ? "rising" : "falling"} · 24h</span></div><div class="spark-cell" data-spark="${it.rank}"></div></li>`).join("");
    $$("[data-spark]", $("#teaser-list")).forEach(c => { const it = R[+c.dataset.spark - 1]; VC.sparkline(c, it.spark, { width: 120, height: 32 }); });

    /* Video: the player object with a generative poster that drifts only while hovered; chapters as a ruler; three shorts. */
    const L = V.video.lead;
    $("#video-title").textContent = L.title;
    $("#video-meta").textContent = `${L.piece} · ${L.date}`;
    $("#player-title").textContent = L.title;
    $("#player-tc").textContent = L.duration.length < 5 ? "0" + L.duration : L.duration;
    $("#chapters").innerHTML = L.chapters.map((c, i) => `<li><b>${pad2(i + 1)}</b>${c}</li>`).join("");
    const posterHost = $("#player-stage"), poster = $("#player-poster"), still = $("#player-still");
    let loop = null, looping = false, posterVisible = false;
    /* The poster's settled frame is a still image: the flow field is run on a CPU-backed scratch canvas in idle
       slices after boot (half resolution reads fine scaled) and encoded once. The live canvas exists only while the
       poster is pointed at, and is CPU-backed too: thousands of small alpha-blended strokes on an accelerated canvas
       are pathological on software GL, and trivial on the CPU. */
    const PW = 450, PH = 253, posterOpts = { width: PW, height: PH, seed: "four-minutes", colors: ["#FF4D3D", "#5C6170", "#ECE9E2"], count: 320, bg: "#15171B" };
    const warm = document.createElement("canvas"); warm.getContext("2d", { willReadFrequently: true });
    const warmLoop = flowLoop(warm, posterOpts);
    for (let i = 0; i < 4; i++) whenIdle(() => { for (let k = 0; k < 18; k++) warmLoop.step(); if (i === 3) still.src = warm.toDataURL("image/png"); });
    const initPoster = () => {
      if (loop) return;
      poster.getContext("2d", { willReadFrequently: true });
      loop = flowLoop(poster, posterOpts);
      poster.getContext("2d").drawImage(warm, 0, 0, PW * DPR, PH * DPR, 0, 0, PW, PH);
      posterHost.classList.add("is-live");
    };
    if ("IntersectionObserver" in window) new IntersectionObserver(([e]) => { posterVisible = e.isIntersecting; }, { threshold: 0 }).observe(posterHost); else posterVisible = true;
    const start = () => { if (reduced) return; initPoster(); looping = true; }, stop = () => { looping = false; };
    posterHost.addEventListener("mouseenter", start); posterHost.addEventListener("mouseleave", stop); posterHost.addEventListener("focus", start); posterHost.addEventListener("blur", stop);
    posterHost.addEventListener("touchstart", () => { looping ? stop() : start(); }, { passive: true });
    // motion: state: the poster drifts only while it is pointed at, so the player reads as alive without playing.
    frameSubs.add(() => { if (looping && posterVisible && loop) loop.step(); });
    const photoFor = { "Remote work and the office-vacancy wave": ["cities", "Cities"], "The real cost of a cheap flight": ["climate", "Climate"], "Who wins when a stadium gets built": ["publicFinance", "Public finance"] };
    $("#shorts").innerHTML = V.video.shorts.map(s => { const [key, topic] = photoFor[s.piece] || ["lead", "Labour"]; return `<a class="short hued" href="#" data-cursor="PLAY" style="${hueVars(topic)}"><div class="poster"><img src="../../assets/img/${V.photos[key]}" width="1400" height="875" alt="" loading="lazy"><span class="tc">${s.duration}</span><span class="play" aria-hidden="true"></span></div><h4>${s.title}</h4><span class="mono">${s.piece}</span></a>`; }).join("");

    /* Visual essay preview: twelve small multiples. */
    $("#essay-title").textContent = E.title; $("#essay-deck").textContent = E.deck; $("#essay-meta").textContent = `${E.type} · ${E.date} · ${E.read}`;
    slopes("#slopes", V.countries, { title: "The middle lost share in all twelve", subtitle: "Middle-wage share of employment, 1995 to 2024 (%)", source: F.source });
    $("#slopes").classList.add("chart");

    /* Research notes, projects, tool, dataset, topics, newsletter. */
    $("#notes").innerHTML = V.notes.map(n => `<li class="note rv"><span class="date mono">${n.date}</span><a href="#" data-cursor="READ">${n.title}</a><span class="nmeta mono"><span class="chip chip--hue hued" style="${hueVars(n.topic)}">${n.topic}</span>${n.read}</span></li>`).join("");
    const P0 = V.projects[0], P1 = V.projects[1], D = V.dataset;
    const ringProgress = (() => { let s = `<svg class="ring-progress" viewBox="0 0 120 120" role="img" aria-label="${P0.done} of ${P0.parts} parts published">`; const C = 60, Rr = 48, gapA = .18; for (let i = 0; i < P0.parts; i++) { const a0 = -Math.PI / 2 + i * Math.PI * 2 / P0.parts + gapA / 2, a1 = a0 + Math.PI * 2 / P0.parts - gapA; s += `<path class="seg${i < P0.done ? " is-lit" : ""}" d="M${(C + Math.cos(a0) * Rr).toFixed(1)},${(C + Math.sin(a0) * Rr).toFixed(1)}A${Rr},${Rr} 0 0 1 ${(C + Math.cos(a1) * Rr).toFixed(1)},${(C + Math.sin(a1) * Rr).toFixed(1)}"/>`; } return s + `<text x="60" y="64" text-anchor="middle">${P0.done}/${P0.parts}</text><text class="sub" x="60" y="82" text-anchor="middle">PARTS</text></svg>`; })();
    $("#panels").innerHTML = `
      <article class="panel panel--dark t-dark" data-cursor="READ"><div class="label"><span>Project · ${P0.topic}</span><span>[ ${pad2(P0.done)} / ${pad2(P0.parts)} ]</span></div>${ringProgress}<h3 class="h3">${P0.title}</h3><p>${P0.deck}</p><span class="mono">${P0.status}</span><a class="link" href="#">Open the project &rarr;</a></article>
      <article class="panel" data-cursor="DATA"><div class="label"><span>Tool · ${P1.topic}</span><span>[ live ]</span></div><div class="panel-spark chart"><div class="chart-title">${P1.title}</div><div class="chart-subtitle">Vacancy rate across nine tracked cities, 2026 Q2 (%)</div><div id="tracker-spark" class="hued" style="${hueVars("Cities")}"></div><div class="chart-source">${V.vacancy.source}</div></div><h3 class="h3">${P1.title}</h3><p>${P1.deck}</p><span class="mono">${P1.status}</span><a class="link" href="#">Open the tracker &rarr;</a></article>
      <article class="panel" data-cursor="DATA"><div class="label"><span>Dataset</span><span>${D.version}</span></div><div class="schema">${D.fields.map(f => `<span class="chip">${f}</span>`).join("")}</div><h3 class="h3" style="font-size:20px">${D.title}</h3><p>${D.desc}</p><div class="meta-list mono"><span>${D.rows}</span><span>${D.cols}</span><span>${D.size}</span><span>${D.updated}</span><span>${D.licence}</span></div><a class="link" href="#">Download CSV &rarr;</a></article>`;
    VC.sparkline("#tracker-spark", V.vacancy.rows.map(r => r.b), { width: 240, height: 48 });
    $("#topics").innerHTML = V.topics.map(t => `<a href="#" data-cursor="READ">${t.name} <b>[ ${t.n} ]</b></a>`).join("");
    $("#nl-title").textContent = V.newsletter.title; $("#nl-text").textContent = V.newsletter.text;
    $("#nl-email").placeholder = V.newsletter.placeholder; $("#nl-btn").textContent = V.newsletter.button;
    footer(false);
    armDraw(".draw:not(.row-chart)");
  }

  /* =====================================================================================================
     RADAR
     ===================================================================================================== */
  function radar() {
    const R = V.radar;
    $("#board-date").textContent = R.date;
    $("#board-readouts").innerHTML = `<div><b>Refreshed</b>${R.lastRefresh}, ${R.refreshesToday} times today</div><div><b>Next refresh</b>${R.nextRefresh}</div><div><b>Sources polled</b>${R.sourcesPolled}</div><div><b>Data</b>${V.demoLabel}</div>`;
    const board = ringBoard($("#board-ring"), R.items, {});
    const rowsHost = $("#ritems");
    rowsHost.innerHTML = R.items.map(it => {
      const status = it.status === "published" ? `<span class="tag tag--published">published</span><span class="pub"><a href="article.html" data-cursor="READ">${it.publishedAs}</a><br><a href="#" class="mono">started on the radar, ${it.radarDate}</a></span>`
        : it.status === "picked" ? `<span class="tag tag--picked">on the desk</span>` : `<span class="tag">watching</span>`;
      return `<li class="ritem hued" id="radar-item-${it.rank}" data-rank="${it.rank}" style="${hueVars(it.topicTag)}" data-cursor="TRACK">
        <span class="rank mono">${pad2(it.rank)}</span>
        <h3 class="topic" data-topic="${it.topic}">${it.topic}<small>${it.topicTag}</small></h3>
        <div class="move">${sign(it.movement)}<i aria-hidden="true">${it.direction === "up" ? "↑" : "↓"}</i><span class="sr">${it.direction}</span></div>
        <div class="spark-cell" data-spark="${it.rank}"></div>
        <div class="sources">${it.sources.map(s => `<span class="chip">${s}</span>`).join("")}</div>
        <div class="seen mono"><b>First seen</b>${it.firstSeen}</div>
        <div class="status">${status}</div>
        ${it.note ? `<p class="note">${it.note}</p>` : ""}
      </li>`;
    }).join("");
    $$("[data-spark]", rowsHost).forEach(c => { const it = R.items[+c.dataset.spark - 1]; VC.sparkline(c, it.spark, { width: 120, height: 32 }); });
    /* Segment and row point at each other. */
    const rowOf = rank => $(`.ritem[data-rank="${rank}"]`), segOf = rank => board.segs.find(s => s.dataset.rank === String(rank));
    const hl = (rank, on) => { const r = rowOf(rank), s = segOf(rank); if (r) r.classList.toggle("is-hl", on); if (s) s.classList.toggle("is-hl", on); on ? board.show(R.items[rank - 1]) : board.idle(); };
    board.segs.forEach(s => { const rank = +s.dataset.rank; s.addEventListener("mouseenter", () => hl(rank, true)); s.addEventListener("mouseleave", () => hl(rank, false)); s.addEventListener("focus", () => hl(rank, true)); s.addEventListener("blur", () => hl(rank, false)); });
    $$(".ritem").forEach(r => { const rank = +r.dataset.rank; r.addEventListener("mouseenter", () => hl(rank, true)); r.addEventListener("mouseleave", () => hl(rank, false)); });
    /* Picked items scramble-reveal once on load: the feed changed since the last refresh. */
    setTimeout(() => { R.items.filter(i => i.status === "picked").forEach(it => { const t = $(`.ritem[data-rank="${it.rank}"] .topic`); const small = t.querySelector("small"); const node = t.firstChild; if (reduced) return; const ghost = document.createElement("span"); ghost.textContent = it.topic; t.replaceChild(ghost, node); scramble(ghost, it.topic, 600); }); }, 300);
    /* How it works, started on the radar. */
    $("#collectors").innerHTML = R.collectors.map((c, i) => `<li><b>[ ${pad2(i + 1)} ]</b>${c}</li>`).join("");
    $("#how-text").textContent = R.howItWorks;
    $("#started").innerHTML = R.items.filter(i => i.status === "published").map((it, i) => `<li><span class="mono">${pad2(i + 1)}</span><a class="t" href="article.html" data-cursor="READ">${it.publishedAs}</a><span class="mono">on the radar ${it.radarDate} · published ${it.publishedDate}</span></li>`).join("");
    footer(true);
    /* The trail reveals the raw headlines beneath the scored rows: the noise the board is built from. */
    const items = $("#items"), heads = R.rawHeadlines;
    trail({ under: (ctx, W, H) => {
      const r = items.getBoundingClientRect(); if (r.bottom < 0 || r.top > H) return;
      ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "#ECE9E2"; ctx.font = "11px 'JetBrains Mono', monospace"; ctx.globalAlpha = .7;
      let k = 0; for (let y = r.top + 24; y < Math.min(r.bottom, H + 24); y += 34) { if (y < -12) { k += Math.ceil((r.right - r.left) / 380); continue; } for (let x = r.left + 12; x < r.right; x += 380) ctx.fillText(heads[k++ % heads.length], x, y); }
      ctx.globalCompositeOperation = "source-over"; ctx.globalAlpha = 1;
    } });
  }

  /* =====================================================================================================
     ARTICLE
     ===================================================================================================== */
  function article() {
    const A = V.article, F = V.featured;
    $("#file").innerHTML = `<div><b>File</b><span>${A.kicker}</span></div><div><b>Date</b><span>${F.date} · ${F.readTime}</span></div><div><b>Author</b><span>${V.author}</span></div><div><b>Radar</b><span>${A.radarLine}</span></div><div class="wide"><b>Method</b><span>${A.method}</span></div><div class="wide"><b>Data</b><span><a href="#" data-cursor="DATA" class="link" style="text-transform:none;letter-spacing:0">${A.data}</a></span></div><div class="wide"><b>Tags</b><span class="hero-tags">${F.tags.map(t => `<a class="chip" href="#">${t}</a>`).join("")}</span></div>`;
    $("#a-title").innerHTML = F.title.split(" ").map((w, i) => `<span class="w" style="transition-delay:${80 + i * 70}ms">${w}</span>`).join(" ");
    $("#a-deck").textContent = F.deck;
    $("#two-nums").innerHTML = A.twoSpeeds.numbers.map((n, i) => `<div class="hnum"><div class="label">[ ${pad2(i + 1)} ]</div><div class="num" data-value="${n.value}">${reduced ? n.value : zeroForm(n.value)}</div><p>${n.label}</p></div>`).join("");
    $("#two-view").textContent = A.twoSpeeds.viewpoint;
    requestAnimationFrame(() => document.body.classList.add("is-loaded"));

    /* The narrator: a pinned chart, four steps, a year ruler. */
    const stepsHost = $("#steps");
    stepsHost.innerHTML = A.steps.map((s, i) => `<div class="step" data-i="${i}"><span class="sidx mono">[ ${pad2(i + 1)} / ${pad2(A.steps.length)} ] · ${s.year}</span><h3 class="h3">${s.title}</h3><p>${s.text}</p></div>`).join("");
    const steps = $$(".step");
    const ruler = $("#ruler");
    ruler.innerHTML = V.years.map((y, i) => { const major = y % 5 === 0 || y === 2024; return `<span class="rt${major ? " is-major" : ""}" data-year="${y}" style="--p:${(i / (V.years.length - 1)).toFixed(4)}">${major ? `<span>${y}</span>` : ""}</span>`; }).join("") + `<i class="ruler-marker" aria-hidden="true"></i><b class="ruler-year" aria-live="polite"></b>`;
    const marker = $(".ruler-marker", ruler), yearOut = $(".ruler-year", ruler);
    let chart = null;
    const chartOpts = mobile => ({
      title: F.chartTitle, subtitle: F.chartSubtitle, source: F.source,
      width: mobile ? 358 : 784, height: mobile ? 156 : 340, margin: mobile ? { t: 30, r: 112, b: 24, l: 28 } : { t: 46, r: 128, b: 34, l: 36 },
      x: V.years, series: V.series, labels: V.seriesLabels, highlight: "middle", yDomain: [10, 60], yStep: 10, xTicks: mobile ? [1995, 2005, 2015, 2024] : undefined,
      annotations: V.annotations.map((a, i) => ({ year: a.year, series: "middle", text: mobile ? (i ? a.text.replace("Middle-wage share falls ", "") : a.text.split(":")[0]) : a.text, dy: mobile ? (i ? 34 : -22) : (i ? 48 : -46), anchor: i ? "end" : "start" })),
      legend: [{ key: "middle", label: V.seriesLabels.middle }, { key: "high", label: V.seriesLabels.high }, { key: "low", label: V.seriesLabels.low }],
      markerText: mobile ? "50%" : "below 50%", staged: true, state: reduced ? "highlight-high" : "highlight-middle"
    });
    let current = -1;
    const setYear = y => { marker.style.left = `${((y - V.years[0]) / (V.years.length - 1) * 100).toFixed(3)}%`; yearOut.textContent = y; $$(".rt", ruler).forEach(t => t.classList.toggle("is-current", +t.dataset.year === y)); };
    const apply = i => {
      if (i === current) return; current = i; const s = A.steps[i];
      // motion: storytelling: each claim applies one change to the chart in 500ms, and the ruler moves to its year.
      chart.setState(s.state); setYear(s.year);
      steps.forEach((st, k) => st.classList.toggle("is-active", k === i));
    };
    VC.responsive(mobile => { chart = lineChart("#a-chart", chartOpts(mobile)); if (current >= 0) chart.setState(A.steps[current].state); });
    if (reduced) { document.body.classList.add("is-static"); chart.setState("highlight-high"); setYear(2024); steps.forEach(s => s.classList.add("is-active")); }
    else if (ST) steps.forEach((s, i) => ST.create({ trigger: s, start: "top 62%", end: "bottom 62%", onToggle: self => { if (self.isActive) apply(i); } }));
    else if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) apply(+e.target.dataset.i); }), { rootMargin: "-38% 0px -38% 0px" }); steps.forEach(s => io.observe(s)); }
    if (!reduced) apply(0);

    /* The hand-over: FIG 1 with notes and source, four paragraphs, continues, related. */
    $("#fig-title").textContent = F.chartTitle;
    $("#fig-notes").textContent = A.chartNotes;
    $("#fig-source").textContent = F.source;
    $("#a-prose").innerHTML = A.body.map(p => `<p>${p}</p>`).join("");
    $("#related").innerHTML = A.related.map((t, i) => `<li><span class="mono">${pad2(i + 1)}</span><a href="#" data-cursor="READ">${t}</a></li>`).join("");
    footer(true);
  }

  /* ---------- boot ---------- */
  function boot() {
    nav(); choreograph(); cursorLabel();
    const page = document.body.dataset.page;
    if (page === "home") { trail(); home(); }
    else if (page === "radar") radar();
    else if (page === "article") article();
    reveal(".rv"); armCountUps();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
