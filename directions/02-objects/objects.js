/* Visinage, direction two ("the world of objects"): page logic for index.html, radar.html and article.html.
   Every word and number comes from window.VISINAGE (lib/content.js + lib/content-phase-b.js). Charts use lib/charts.js
   where the anatomy fits; the hero and chapter-object charts use the overlay renderer below (same anatomy, drawn so the
   line can be anchored to the 3D slab). One requestAnimationFrame loop per page (VMotion.onFrame); the Three.js scene
   renders inside it, lazy-initialised near the viewport, paused off-screen, DPR capped at 1.5. */
(function () {
  "use strict";
  const V = window.VISINAGE, K = window.VKit, M = window.VMotion, C = window.VCharts;
  const reduced = M.reduced;
  const page = document.body.dataset.page || "home";
  const hues = V.topicHues.light, huesDark = V.topicHues.dark;
  const ACCENT = "#2742D6", INK = "#1A1A1F", PAPER = "#F3EFE6", PAPER2 = "#E9E3D6", DARK = "#141418";
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const phoneMQ = window.matchMedia("(max-width: 767px)");
  const isPhone = () => phoneMQ.matches;
  const isTouch = window.matchMedia("(hover: none)").matches;
  const hueOf = t => hues[t] || hues.Methods;
  /* Topic hue as a CSS pair: the full hue for bars, swatches and objects; a darkened hue (x0.68) for any text, which keeps 4.5:1 on paper-2. */
  const hueVars = h => `--hue:${h};--hue-text:${K.mul(h, 0.68)}`;
  const topicOfPiece = title => { const p = V.latest.find(x => x.title.startsWith(title)) ; return p ? p.topic : "Labour"; };
  const sharesAt = i => { const lo = Math.floor(i), hi = Math.min(V.years.length - 1, lo + 1), f = i - lo; const g = k => V.series[k][lo] + (V.series[k][hi] - V.series[k][lo]) * f; return { low: g("low"), middle: g("middle"), high: g("high") }; };
  const LAST = V.years.length - 1;
  let fig = 0; const nextFig = () => ++fig;

  /* ---------- Shared chrome ---------- */
  function buildNav() {
    const nav = $(".nav"); if (!nav) return;
    const current = page === "radar" ? "Data" : page === "article" ? "Research" : "";
    const links = V.nav.map(n => `<li><a href="${n === "Data" ? "radar.html" : n === "Research" ? "index.html#latest" : "#" + n.toLowerCase()}"${n === current ? ' aria-current="page"' : ""}>${n}</a></li>`).join("");
    nav.innerHTML = `<div class="nav__in frame">
      <div class="nav__left"><a class="nav__brand" href="index.html">${V.name}</a>
        <div class="nav__title" aria-hidden="true">${page === "article" ? esc(V.featured.title) + " <span>· " + esc(V.featured.readTime) + "</span>" : ""}</div></div>
      <ul class="nav__links">${links}</ul>
      <div class="nav__right">
        <input class="nav__search" type="search" placeholder="Search research, data, visuals" aria-label="Search">
        <a class="nav__sub" href="#newsletter">${V.newsletter.button}</a>
        <button class="nav__icon" type="button" aria-label="Search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M16.5 16.5 21 21"/></svg></button>
        <button class="nav__icon nav__burger" type="button" aria-label="Menu" aria-expanded="false" aria-controls="menu"><svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      </div></div>
      <div class="nav__menu" id="menu"><ul>${links}</ul><input class="nav__search" type="search" placeholder="Search" aria-label="Search"></div>`;
    if (page === "article") nav.classList.add("has-title");
    const burger = $(".nav__burger", nav), menu = $(".nav__menu", nav);
    burger.addEventListener("click", () => { const open = menu.classList.toggle("is-open"); burger.setAttribute("aria-expanded", open); });
    menu.addEventListener("click", e => { if (e.target.closest("a")) { menu.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); } });
    const sentinel = $("[data-nav-sentinel]");
    if (sentinel && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(([e]) => nav.classList.toggle("is-compact", !e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
      io.observe(sentinel);
    }
  }

  /* motion: hierarchy: the page ground cross-fades to the colour of the section at the viewport middle. */
  function groundSpy() {
    const els = $$("[data-ground]"); if (!els.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) document.documentElement.style.setProperty("--ground", e.target.dataset.ground); }), { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
    els.forEach(el => io.observe(el));
  }

  /* motion: state: a 300ms cross-fade between pages. */
  function transitions() {
    if (reduced) return;
    document.addEventListener("click", e => {
      const a = e.target.closest("a[href]"); if (!a) return;
      const href = a.getAttribute("href");
      if (!/^[^#]+\.html(#.*)?$/.test(href) || a.target === "_blank" || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
      e.preventDefault(); document.body.classList.add("is-leaving");
      setTimeout(() => { location.href = href; }, 300);
    });
    window.addEventListener("pageshow", () => document.body.classList.remove("is-leaving"));
  }

  /* motion: storytelling: the numbers count up to the finding when they enter. */
  function countUps(selector) {
    const run = el => {
      const to = parseFloat(el.dataset.to), dec = +(el.dataset.decimals || 0), pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      const fmt = v => pre + v.toFixed(dec) + suf;
      if (reduced || isNaN(to)) { el.textContent = fmt(to); return; }
      const t0 = performance.now(), dur = 1400;
      const off = M.onFrame((y, t) => { const p = M.easeOut(M.clamp((t - t0) / dur, 0, 1)); el.textContent = fmt(to * p); if (p >= 1) off(); });
    };
    const els = $$(selector);
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }

  /* ---------- Chart helpers ---------- */
  const plate = (n, inner, cls, figText) => `<div class="plate ${cls || ""}"><div class="plate__fig">${figText || "FIG " + n}</div>${inner}</div>`;
  function sourceLink(container) {
    const s = $(".chart-source", container); if (!s) return;
    s.innerHTML = esc(s.textContent) + ` <a href="index.html#dataset">Data: CSV, CC BY 4.0</a>`;
  }
  function markHl(container, key) { $$(".end-dot--" + key, container).forEach(d => d.classList.add("end-dot--hl")); }
  function prepDraw(container) {
    container.classList.add("draw");
    $$("path.series, line.series", container).forEach(p => { let L = 2000; try { L = p.getTotalLength(); } catch (e) { } p.style.setProperty("--L", L); });
  }
  const legendTiers = hl => [{ label: V.seriesLabels.middle, hl: hl === "middle" }, { label: V.seriesLabels.high, hl: hl === "high" }, { label: V.seriesLabels.low, hl: hl === "low" }];
  function tiersChart(container, phone, opts) {
    const o = Object.assign({
      title: V.featured.chartTitle, subtitle: V.featured.chartSubtitle, source: V.featured.source, legend: legendTiers("middle"),
      x: V.years, series: { middle: V.series.middle, high: V.series.high, low: V.series.low }, labels: V.seriesLabels, highlight: "middle",
      annotations: phone ? V.annotations.map((a, i) => ({ year: a.year, text: a.year + ": " + (i ? "below 50%" : "financial crisis"), series: a.series, anchor: i ? "end" : "start" })) : V.annotations,
      yDomain: [15, 60], yStep: 15, yFormat: d => d + "%", width: phone ? 346 : 720, height: phone ? 250 : 340,
      margin: phone ? { t: 14, r: 92, b: 30, l: 34 } : undefined, xTicks: phone ? [1995, 2005, 2015, 2024] : undefined
    }, opts || {});
    C.lineChart(container, o); markHl(container, o.highlight); sourceLink(container); prepDraw(container);
  }
  function vacancyChart(container, phone, opts) {
    C.dumbbellChart(container, Object.assign({ title: V.vacancy.title, subtitle: V.vacancy.subtitle, source: V.vacancy.source, rows: V.vacancy.rows,
      legend: [{ label: "2019 Q4", cls: "legend-swatch--a" }, { label: "2026 Q2", cls: "legend-swatch--b" }], labelA: "2019", labelB: "2026",
      width: phone ? 346 : 720, rowHeight: phone ? 26 : 30, margin: phone ? { t: 24, r: 40, b: 26, l: 86 } : undefined, max: 40 }, opts || {}));
    sourceLink(container); prepDraw(container);
  }
  function profitsChart(container, phone, opts) {
    C.barChart(container, Object.assign({ title: V.profits.title, subtitle: V.profits.subtitle, source: V.profits.source,
      rows: V.profits.rows.map(r => Object.assign({}, r, { hl: r.name === "Australia" })), width: phone ? 346 : 720, rowHeight: phone ? 26 : 30,
      margin: phone ? { t: 8, r: 44, b: 26, l: 96 } : undefined, max: 60, xStep: 20 }, opts || {}));
    sourceLink(container); prepDraw(container);
  }
  /* A radar item's 24-hour attention line, with full anatomy; used where a piece's own evidence is not in the shared content. */
  function attentionChart(container, item, phone) {
    const x = item.spark.map((v, i) => i - 23);
    const range = Math.max(...item.spark) - Math.min(...item.spark);
    C.lineChart(container, { yStep: range > 200 ? 100 : range > 80 ? 50 : range > 30 ? 10 : 5, title: `${item.topic}: ${item.movement > 0 ? "+" : ""}${item.movement} on the radar in 24 hours`,
      subtitle: `Composite attention score, hourly, the 24 hours to the ${V.radar.lastRefresh} refresh on ${V.radar.date} (index)`,
      source: `Source: Visinage radar, ${V.radar.sourcesPolled} sources polled, surfaced from ${item.sources.join(", ")}. DEMO / PLACEHOLDER DATA.`,
      x, series: { score: item.spark }, labels: { score: "Attention" }, highlight: "score", xTicks: [-20, -15, -10, -5, 0],
      yFormat: d => d, endFormat: v => v.toFixed(0), width: phone ? 346 : 720, height: phone ? 220 : 300, margin: phone ? { t: 14, r: 90, b: 30, l: 34 } : { t: 18, r: 110, b: 36, l: 44 } });
    markHl(container, "score"); sourceLink(container); prepDraw(container);
  }
  function slopePlate(container) {
    C.slopeGrid(container, { rows: V.countries });
    $$("line.series", container).forEach(p => { p.style.setProperty("--L", 200); });
    container.classList.add("draw");
  }

  /* ---------- The overlay line chart: the lead chart drawn so its y-axis is the slab's height scale ---------- */
  function objLine(svg, o) {
    const NS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); (parent || svg).appendChild(n); return n; };
    const years = V.years, n = years.length, keys = ["low", "high", "middle"];
    let x0 = o.x0, x1 = o.x1, yTop = o.yTop, yBottom = o.yBottom, dom = o.yDomain || [15, 60];
    let hl = o.hl || "middle", prog = 1, year = years[0], allow = { 2009: true, 2016: true, m50: true }, leaderPt = null, lastEnd = null;
    const sx = y => x0 + (y - years[0]) / (years[n - 1] - years[0]) * (x1 - x0);
    const sy = v => yBottom + (v - dom[0]) / (dom[1] - dom[0]) * (yTop - yBottom);
    svg.innerHTML = "";
    const gGrid = el("g", { class: "gridg" }), gLines = el("g"), gEnds = el("g"), gAnn = el("g"), gCur = el("g"), gLead = el("g");
    const paths = {}, dots = {}, labels = {};
    keys.forEach(k => { paths[k] = el("path", { class: "series series--" + k, fill: "none" }, gLines); });
    keys.forEach(k => { dots[k] = el("circle", { r: 3.5, class: "end-dot end-dot--" + k }, gEnds); labels[k] = el("text", { class: "end-label end-label--" + k }, gEnds); });
    const anns = {};
    V.annotations.forEach((a, i) => {
      const g = el("g", { class: "ann", "data-year": a.year }, gAnn);
      const parts = a.text.split(": ");
      anns[a.year] = { g, line: el("line", { class: "annotation-line" }, g), dot: el("circle", { r: 4.5, class: "annotation-dot" }, g), text: el("text", { class: "annotation" }, g), parts, up: i === 0 };
    });
    const m50 = el("g", { class: "marker50" }, gAnn); const m50l = el("line", {}, m50), m50t = el("text", {}, m50); m50t.textContent = "50%";
    const cur = el("line", { class: "cursor-line" }, gCur), curT = el("text", { class: "cursor-year", "text-anchor": "middle" }, gCur);
    const lead = el("polyline", { class: "leader" }, gLead), aDot = el("circle", { r: 3, class: "anchor-dot" }, gLead);

    function layout() {
      gGrid.innerHTML = "";
      for (let v = 20; v <= dom[1]; v += 10) {
        el("line", { x1: x0, x2: x1, y1: sy(v), y2: sy(v), class: "grid" }, gGrid);
        const t = el("text", { x: x0 - 8, y: sy(v) + 4, class: "tick", "text-anchor": "end" }, gGrid); t.textContent = v + "%";
      }
      el("line", { x1: x0, x2: x1, y1: sy(dom[0]), y2: sy(dom[0]), class: "axis" }, gGrid);
      (o.xTicks || [1995, 2005, 2015, 2024]).forEach(y => { const t = el("text", { x: sx(y), y: sy(dom[0]) + 18, class: "tick", "text-anchor": "middle" }, gGrid); t.textContent = y; });
      /* Annotation text wraps at 18 characters so it stays inside a 220px plot: 2009 above the line, 2016 below it. */
      const wrap = (s, max) => { const out = []; let line = ""; s.split(" ").forEach(w => { if ((line + " " + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + " " + w).trim(); }); if (line) out.push(line); return out; };
      V.annotations.forEach(a => {
        const A = anns[a.year], i = years.indexOf(a.year), x = sx(a.year), y = sy(V.series[a.series][i]);
        const dy = A.up ? -30 : 30, anchor = A.up ? "start" : "end", tx = x + (A.up ? 5 : -5);
        const lines = wrap(o.annText && o.annText[a.year] ? o.annText[a.year] : a.text, o.wrapAt || 18);
        A.line.setAttribute("x1", x); A.line.setAttribute("x2", x); A.line.setAttribute("y1", y); A.line.setAttribute("y2", y + dy);
        A.dot.setAttribute("cx", x); A.dot.setAttribute("cy", y);
        A.text.innerHTML = ""; A.text.setAttribute("x", tx); A.text.setAttribute("text-anchor", anchor);
        A.text.setAttribute("y", A.up ? y + dy - 8 - 13 * (lines.length - 1) : y + dy + 14);
        lines.forEach((p, j) => { const ts = document.createElementNS(NS, "tspan"); ts.setAttribute("x", tx); ts.setAttribute("dy", j ? 13 : 0); ts.textContent = p; A.text.appendChild(ts); });
      });
      m50l.setAttribute("x1", x0); m50l.setAttribute("x2", x1); m50l.setAttribute("y1", sy(50)); m50l.setAttribute("y2", sy(50));
      m50t.setAttribute("x", x0 + 4); m50t.setAttribute("y", sy(50) - 4); m50t.setAttribute("text-anchor", "start"); m50t.textContent = "below 50%";
      draw();
    }
    function draw() {
      const i = prog * (n - 1), lo = Math.floor(i), f = i - lo;
      keys.forEach(k => {
        const s = V.series[k]; let d = "";
        for (let j = 0; j <= lo; j++) d += (j ? "L" : "M") + sx(years[j]).toFixed(1) + "," + sy(s[j]).toFixed(1);
        let ex = sx(years[lo]), ey = sy(s[lo]), ev = s[lo];
        if (f > 0 && lo < n - 1) { ev = s[lo] + (s[lo + 1] - s[lo]) * f; ex = sx(years[lo] + f); ey = sy(ev); d += "L" + ex.toFixed(1) + "," + ey.toFixed(1); }
        paths[k].setAttribute("d", d);
        paths[k].setAttribute("class", "series series--" + k + (k === hl ? " series--hl" : " series--muted"));
        dots[k].setAttribute("cx", ex); dots[k].setAttribute("cy", ey); dots[k].setAttribute("class", "end-dot end-dot--" + k + (k === hl ? " end-dot--hl" : ""));
        /* End labels sit just above their line end, so the leader can run beneath the highlighted one. */
        labels[k].setAttribute("x", ex + 8); labels[k].setAttribute("y", ey - 6); labels[k].setAttribute("class", "end-label end-label--" + k + (k === hl ? " end-label--hl" : ""));
        labels[k].textContent = V.seriesLabels[k] + " " + ev.toFixed(1) + "%";
        if (k === hl) { paths[k].parentNode.appendChild(paths[k]); dots[k].parentNode.appendChild(dots[k]); labels[k].parentNode.appendChild(labels[k]); lastEnd = [ex, ey]; }
      });
      V.annotations.forEach(a => { const on = allow[a.year] && i >= years.indexOf(a.year) - 0.001; anns[a.year].g.classList.toggle("is-on", !!on); });
      m50.classList.toggle("is-on", !!(allow.m50 && i >= years.indexOf(2016) - 0.001));
      drawCursor(); drawLeader();
    }
    /* The year cursor moves on its own; a year change never rebuilds the series paths. */
    function drawCursor() {
      const cx = sx(year);
      cur.setAttribute("x1", cx); cur.setAttribute("x2", cx); cur.setAttribute("y1", sy(dom[1])); cur.setAttribute("y2", sy(dom[0]));
      curT.setAttribute("x", cx); curT.setAttribute("y", sy(dom[0]) + 32); curT.textContent = Math.round(year);
      gCur.style.display = o.cursor === false ? "none" : ""; curT.style.display = o.cursorLabel === false ? "none" : "";
    }
    /* The leader is the only part that moves every frame, so it updates on its own without redrawing the chart. */
    function drawLeader() {
      if (!leaderPt || !lastEnd) { gLead.style.display = "none"; return; }
      const pts = [[lastEnd[0], lastEnd[1]], [leaderPt[0], lastEnd[1]], [leaderPt[0], leaderPt[1]]].map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
      lead.setAttribute("points", pts); aDot.setAttribute("cx", leaderPt[0]); aDot.setAttribute("cy", leaderPt[1]); gLead.style.display = "";
    }
    layout();
    return {
      setProgress(p) { prog = M.clamp(p, 0, 1); draw(); },
      setYear(y) { year = y; drawCursor(); },
      setHighlight(k) { hl = k; draw(); },
      setAllow(a) { allow = Object.assign(allow, a); draw(); },
      setLeader(pt) { if (pt && leaderPt && Math.abs(pt[0] - leaderPt[0]) < 0.3 && Math.abs(pt[1] - leaderPt[1]) < 0.3) return; leaderPt = pt; drawLeader(); },
      setFrame(f) { x0 = f.x0; x1 = f.x1; yTop = f.yTop; yBottom = f.yBottom; layout(); },
      sy, sx
    };
  }

  /* ---------- The Three.js slab object ---------- */
  function slabScene(canvas, o) {
    const T = window.THREE; if (!T) return null;
    let renderer;
    try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); } catch (e) { return null; }
    /* DPR capped at 1.5; on a software renderer (SwiftShader, llvmpipe) the canvas renders at 0.75 so the frame budget holds. */
    let software = false;
    try { const gl = renderer.getContext(); const dbg = gl.getExtension("WEBGL_debug_renderer_info"); const name = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : ""; software = /swiftshader|llvmpipe|software|mesa/i.test(name); } catch (e) { }
    const dpr = Math.min(window.devicePixelRatio || 1, software ? 0.75 : 1.5);
    renderer.setPixelRatio(dpr);
    renderer.setClearColor(0x000000, 0);
    /* On a software renderer the WebGL canvas stays offscreen and each rendered frame is blitted into a plain 2D canvas, which the
       compositor treats as a bitmap: no per-scroll readback of the GL buffer. On a GPU the WebGL canvas is shown directly. */
    let twoD = null, c2 = null;
    if (software) {
      twoD = document.createElement("canvas"); twoD.className = canvas.className; twoD.setAttribute("role", "img"); twoD.setAttribute("aria-label", canvas.getAttribute("aria-label") || "");
      canvas.insertAdjacentElement("afterend", twoD); canvas.style.display = "none"; c2 = twoD.getContext("2d");
    }
    const view = twoD || canvas;
    const scene = new T.Scene();
    const S = o.S || 7.4, R = o.R || 5.2, F = o.F || 2.3, GAP = o.gap || 2.8, U = o.U || 0.16, BASE = 0.5;
    const cam = new T.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
    const target = new T.Vector3(0, o.targetY || 2.3, 0);
    cam.position.set(40, 40, 40).add(target); cam.lookAt(target);
    /* The toon gradient: three steps (0.80, 0.91, 1.0), the same three tones the SVG kit uses. */
    const grad = new T.DataTexture(new Uint8Array([204, 232, 255]), 3, 1, T.LuminanceFormat);
    grad.minFilter = T.NearestFilter; grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
    const toon = c => new T.MeshToonMaterial({ color: new T.Color(c), gradientMap: grad });
    const inkMat = new T.MeshBasicMaterial({ color: new T.Color(o.ink || INK) });
    const light = new T.DirectionalLight(0xffffff, 1); light.position.set(-0.5, 1, 0.3); scene.add(light);
    const root = new T.Group(); scene.add(root);
    const t = 0.045;
    const disc = new T.Mesh(new T.CylinderGeometry(R, R, BASE, 72), toon(o.paper || "#FAF7F0")); disc.position.y = BASE / 2; root.add(disc);
    [0, BASE].forEach(y => { const r = new T.Mesh(new T.TorusGeometry(R, t / 2, 6, 96), inkMat); r.rotation.x = Math.PI / 2; r.position.y = y; root.add(r); });
    const sc = document.createElement("canvas"); sc.width = sc.height = 128; const g = sc.getContext("2d");
    const rg = g.createRadialGradient(64, 64, 10, 64, 64, 64); rg.addColorStop(0, "rgba(26,26,31,.32)"); rg.addColorStop(0.55, "rgba(26,26,31,.10)"); rg.addColorStop(1, "rgba(26,26,31,0)"); g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    const shadow = new T.Mesh(new T.PlaneGeometry(R * 2.9, R * 2.9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(sc), transparent: true, depthWrite: false })); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.02; root.add(shadow);
    const slabGeo = new T.BoxGeometry(F, 1, F); slabGeo.translate(0, 0.5, 0);
    const vg = new T.BoxGeometry(t, 1, t); vg.translate(0, 0.5, 0);
    const hx = new T.BoxGeometry(F + t, t, t), hz = new T.BoxGeometry(t, t, F + t);
    function makeSlab(x, color) {
      const grp = new T.Group(); grp.position.set(x, BASE, 0); root.add(grp);
      const mesh = new T.Mesh(slabGeo, toon(color)); grp.add(mesh);
      const verts = [];
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => { const m = new T.Mesh(vg, inkMat); m.position.set(sx * F / 2, 0, sz * F / 2); grp.add(m); verts.push(m); });
      const hrods = y => { const arr = []; [-1, 1].forEach(s => { const a = new T.Mesh(hx, inkMat); a.position.set(0, y, s * F / 2); grp.add(a); arr.push(a); const b = new T.Mesh(hz, inkMat); b.position.set(s * F / 2, y, 0); grp.add(b); arr.push(b); }); return arr; };
      hrods(0); const tops = hrods(1);
      const api = { grp, mesh, h: 1, target: 1, color: new T.Color(color), x,
        set(h) { api.h = h; mesh.scale.y = h; verts.forEach(v => { v.scale.y = h; }); tops.forEach(r => { r.position.y = h; }); } };
      return api;
    }
    const slabs = { low: makeSlab(-GAP, o.paper || "#FAF7F0"), middle: makeSlab(0, o.accent || ACCENT), high: makeSlab(GAP, o.paper || "#FAF7F0") };
    let hovered = false, speed = 0.1, last = null, W = 0, H = 0, rendered = false;
    view.addEventListener("pointerenter", () => { hovered = true; });
    view.addEventListener("pointerleave", () => { hovered = false; });
    function resize() {
      W = view.clientWidth || 330; H = view.clientHeight || 470;
      renderer.setSize(W, H, false); const a = W / H; cam.left = -S * a; cam.right = S * a; cam.top = S; cam.bottom = -S; cam.updateProjectionMatrix();
      if (twoD) { twoD.width = Math.round(W * dpr); twoD.height = Math.round(H * dpr); rendered = false; }
      /* project() must work before the first render, so the camera's world and inverse matrices are built here, not left to render(). */
      cam.updateMatrixWorld(true); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    }
    let checked = false, failed = false, lostTimer = null, retried = false, paused = false;
    const fail = () => { if (failed) return; failed = true; if (o.onFail) o.onFail(); };
    /* A lost context is often restored within a few hundred ms (software GL resets at start-up); only a loss that is not restored
       within 1.5s hands over to the SVG twin. three.js re-initialises its state on the restore event. */
    canvas.addEventListener("webglcontextlost", e => { e.preventDefault(); if (!lostTimer) lostTimer = setTimeout(fail, 1500); });
    canvas.addEventListener("webglcontextrestored", () => { if (lostTimer) { clearTimeout(lostTimer); lostTimer = null; } checked = false; rendered = false; });
    const tmp = new T.Vector3();
    function project(x, y, z) { tmp.set(x, y, z).applyMatrix4(root.matrixWorld).project(cam); return [(tmp.x + 1) / 2 * W, (1 - tmp.y) / 2 * H]; }
    resize(); root.updateMatrixWorld(true);
    /* Shaders compile in idle time after init, so the first visible frame (hero) or the frame the object scrolls into (article) carries no compile stall. */
    const lost = () => { try { return renderer.getContext().isContextLost(); } catch (e) { return false; } };
    (window.requestIdleCallback || (f => setTimeout(f, 200)))(() => { if (!failed && !lost()) try { renderer.compile(scene, cam); } catch (e) { } }, { timeout: 1500 });
    let frameNo = 0;
    const api = {
      U, resize, project, view,
      setShares(v, immediate) { Object.keys(slabs).forEach(k => { slabs[k].target = v[k] * U; if (immediate) slabs[k].set(slabs[k].target); }); },
      setHighlight(k) { Object.keys(slabs).forEach(key => slabs[key].color.set(key === k ? (o.accent || ACCENT) : (o.paper || "#FAF7F0"))); },
      topOf(k) { return project(slabs[k].x, BASE + slabs[k].h, 0); },
      pxPerPoint() { const a = project(0, BASE, 0), b = project(0, BASE + U, 0); return a[1] - b[1]; },
      yOfShare(v) { return project(0, BASE + v * U, 0)[1]; },
      /* motion: storytelling: the slab eases to the year's share, so the object is the chart. */
      update(tNow) {
        const dt = last === null ? 0.016 : Math.min(0.05, (tNow - last) / 1000); last = tNow;
        /* motion: hierarchy: the object turns slowly (0.1 rad/s) and stops under the pointer so the reader can look. */
        /* On a software renderer every new canvas frame is a readback on scroll, so the idle turn is off there and the object renders only on state changes. */
        speed += ((hovered || software ? 0 : 0.1) - speed) * 0.08; if (Math.abs(speed) < 0.002) speed = 0;
        const turning = speed !== 0 && !reduced; let easing = false;
        if (turning) root.rotation.y += speed * dt;
        Object.keys(slabs).forEach(k => { const s = slabs[k]; if (Math.abs(s.h - s.target) > 0.0005) { s.set(s.h + (s.target - s.h) * 0.12); easing = true; } if (!s.mesh.material.color.equals(s.color)) { s.mesh.material.color.lerp(s.color, 0.12); easing = true; } });
        if (failed) return;
        frameNo++;
        /* Zero work when still: nothing turning, nothing easing, nothing recolouring means no render call. The 0.1 rad/s turn alone
           renders on every other frame (0.19 degrees per step), which halves the idle cost with no visible difference. */
        if (paused) return;
        if (rendered && !easing && !turning) return;
        /* Half rate for the idle turn, and for everything on a software renderer; the eases are too slow for a skipped frame to show. */
        if (rendered && frameNo % 2 && (software || !easing)) return;
        renderer.render(scene, cam); rendered = true;
        if (c2) { c2.clearRect(0, 0, twoD.width, twoD.height); try { c2.drawImage(canvas, 0, 0, twoD.width, twoD.height); } catch (e) { } }
        /* A shader program that failed to link (software GL, a driver mid-reset) is retried once after 600ms with fresh programs;
           a second failure hands over to the SVG twin rather than show a blank. */
        if (!checked && !lost()) {
          checked = true;
          try {
            if ((renderer.info.programs || []).some(p => p.diagnostics && p.diagnostics.runnable === false)) {
              if (retried) fail();
              else { retried = true; paused = true; setTimeout(() => { scene.traverse(ob => { if (ob.material) ob.material.needsUpdate = true; }); checked = false; rendered = false; paused = false; }, 600); }
            }
          } catch (e) { }
        }
      },
      get failed() { return failed; },
      dispose() { try { renderer.dispose(); } catch (e) { } }
    };
    return api;
  }

  /* A stage: a plate holding the 3D object (or its SVG twin) and the overlay chart. Shared by the hero and the chapter object. */
  function makeStage(stage, o) {
    const canvas = $(".stage__canvas", stage), svg = $(".stage__svg", stage), fb = $(".stage__fallback", stage);
    const phone = isPhone();
    /* No probe canvas: THREE.WebGLRenderer throws when there is no context, and slabScene() returns null, which is the fallback path. */
    const use3D = !phone && !reduced && !!window.THREE;
    let scene = null, chart = null;
    const final = sharesAt(LAST);
    const cur = { v: o.initialShares || final, hl: o.hl || "middle" };
    const renderFb = () => { fb.innerHTML = K.slabs(cur.v, { hl: cur.hl, hue: ACCENT }); };
    function fail() { if (!scene) return; const s = scene; scene = null; s.dispose(); stage.classList.add("is-fallback"); renderFb(); if (chart && !isPhone()) chart.setFrame(frame()); }
    if (!use3D) { stage.classList.add("is-fallback"); renderFb(); }
    else {
      scene = slabScene(canvas, { S: o.S, targetY: o.targetY, onFail: fail });
      if (!scene) { stage.classList.add("is-fallback"); renderFb(); }
      else { scene.setShares(cur.v, true); scene.setHighlight(cur.hl); }
    }
    /* The fallback drawing's anchor and scale, in stage pixels, from the SVG's viewBox (-72 -82 144 132). */
    function fbAnchor(v) {
      const r = fb.getBoundingClientRect(), s = stage.getBoundingClientRect();
      const kx = r.width / 144, ky = r.height / 132;
      return [r.left - s.left + 72 * kx, r.top - s.top + (82 - (5 + v * 0.85)) * ky];
    }
    function fbPxPerPoint() { const r = fb.getBoundingClientRect(); return 0.85 * r.height / 132; }
    function frame() {
      const sw = stage.clientWidth, sh = stage.clientHeight;
      let k, yFinal, x1;
      if (scene) { scene.resize(); k = scene.pxPerPoint(); yFinal = scene.view.offsetTop + scene.yOfShare(final.middle); x1 = scene.view.offsetLeft - 22; }
      /* With the SVG twin the slab scale is too small to read a chart by, so the plot keeps 4.2px per point and the leader's elbow does the joining. */
      else { k = Math.max(fbPxPerPoint(), 4.2); yFinal = fbAnchor(final.middle)[1]; x1 = fb.offsetLeft - 22; }
      return { x0: 44, x1: Math.max(180, x1), yTop: yFinal - (60 - final.middle) * k, yBottom: yFinal + (final.middle - 15) * k, sw, sh };
    }
    if (!phone) { const f = frame(); chart = objLine(svg, Object.assign({ x0: f.x0, x1: f.x1, yTop: f.yTop, yBottom: f.yBottom }, o.chart || {})); }
    function anchor(key) {
      if (scene) { const p = scene.topOf(key); return [scene.view.offsetLeft + p[0], scene.view.offsetTop + p[1]]; }
      const v = cur.v[key]; const a = fbAnchor(v); const dx = key === "low" ? -24 : key === "high" ? 24 : 0; const r = fb.getBoundingClientRect();
      return [a[0] + dx * 0.866 * r.width / 144, a[1] + dx * 0.5 * r.height / 132];
    }
    window.addEventListener("resize", () => { if (chart && !isPhone()) { const f = frame(); chart.setFrame(f); } });
    return { get scene() { return scene; }, chart, canvas, fb, anchor, phone, use3D,
      setShares(v, immediate) { cur.v = v; if (scene) scene.setShares(v, immediate); else renderFb(); },
      setHighlight(k) { cur.hl = k; if (scene) scene.setHighlight(k); else renderFb(); },
      setFallback(v, hl) { cur.v = v; if (hl) cur.hl = hl; renderFb(); } };
  }

  /* ---------- Homepage ---------- */
  function buildHome() {
    const F = V.featured, hue = hueOf("Labour");
    /* The opening moment. */
    const hero = $(".hero");
    const words = F.title.split(" ");
    hero.innerHTML = `<div class="hero__pin">
      <div class="hero__copy" style="--hue:${hue}">
        <span class="kicker">${esc(F.kicker)} · ${esc(F.readTime)}</span>
        <h1 class="hero__title"><span class="l">${words.slice(0, 2).join(" ")}</span><span class="l">${words[2]}</span><span class="l">${words.slice(3).join(" ")}</span></h1>
        <p class="hero__deck">${esc(F.deck)}</p>
        <div class="hero__by"><span>By <b>${esc(V.author)}</b></span><span>${esc(F.date)}</span><span class="tags">${F.tags.map(t => `<span class="tag">${esc(t)}</span>`).join("")}</span></div>
        <div class="nums">${V.article.twoSpeeds.numbers.map(numHTML).join("")}</div>
      </div>
      <div class="hero__plate rv">
        <div class="plate">
          <div class="plate__fig">FIG ${nextFig()}</div>
          <div class="chart-title">${esc(F.chartTitle)}</div>
          <div class="chart-subtitle">${esc(F.chartSubtitle)}</div>
          <div class="chart-legend">${legendHTML(legendTiers("middle"))}</div>
          <div class="stage"><canvas class="stage__canvas" aria-label="Three wage-tier slabs on a disc; the middle slab is the middle-wage share" role="img"></canvas><div class="stage__fallback"></div><svg class="stage__svg" aria-hidden="true"></svg><div class="stage__phone chart"></div><div class="hero__hint">The slab is the chart · click to replay</div></div>
          <div class="chart-source">${esc(F.source)} <a href="#dataset">Data: CSV, CC BY 4.0</a></div>
        </div>
      </div></div><div data-nav-sentinel style="position:absolute;left:0;bottom:30vh;width:1px;height:1px"></div>`;
    const stage = $(".stage", hero);
    const st = makeStage(stage, { S: 7.9, targetY: 2.3, hl: "middle", initialShares: reduced ? sharesAt(LAST) : sharesAt(0) });
    if (st.phone) {
      st.setFallback(sharesAt(LAST), "middle");
      tiersChart($(".stage__phone", stage), true, { title: null, subtitle: null, source: null, legend: null });
      $(".stage__phone", stage).classList.remove("draw");
    } else if (st.chart) {
      const chart = st.chart;
      if (reduced) { chart.setProgress(1); chart.setYear(V.years[LAST]); chart.setLeader(st.anchor("middle")); $(".hero__hint", stage).remove(); }
      else {
        /* motion: storytelling: half a second after load the middle slab sinks from 56.0 to 47.2 over 2.4s and the line draws out of it; scrolling the
           first half viewport advances the same draw, and a click on the object replays it. */
        let p = -1, t0 = null;
        const apply = () => { const i = p * LAST; st.setShares(sharesAt(i), true); chart.setProgress(p); chart.setYear(V.years[0] + i); hero.classList.toggle("is-scrolled", p > 0.9); };
        let off = null;
        const tick = (y, t) => {
          if (t0 === null) t0 = t + 500;
          const auto = M.easeInOut(M.clamp((t - t0) / 2400, 0, 1));
          const np = Math.max(auto, M.clamp(y / Math.max(320, window.innerHeight * 0.5), 0, 1));
          if (np !== p) { p = np; apply(); }
          if (st.scene) st.scene.update(t);
          chart.setLeader(st.anchor("middle"));
        };
        const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !off) off = M.onFrame(tick); else if (!e.isIntersecting && off) { off(); off = null; } }, { threshold: 0 });
        io.observe(stage); p = 0; apply();
        /* motion: feedback: a click on the object replays the draw from 1995. */
        stage.addEventListener("click", () => { t0 = null; });
      }
    }
    countUps(".hero .num__v");

    /* Latest: the bands. */
    const latest = $("#latest");
    const pieces = V.latest.map(p => Object.assign({}, p, { obj: K.topicMap[p.topic] })).concat([Object.assign({}, V.visualEssay, { topic: "Labour", obj: "globe" })]);
    const evidence = [
      c => vacancyChart(c, isPhone()),
      c => attentionChart(c, V.radar.items.find(i => i.topicTag === "Climate" && /fuel/i.test(i.topic)), isPhone()),
      c => profitsChart(c, isPhone()),
      c => attentionChart(c, V.radar.items.find(i => /stadium/i.test(i.topic)), isPhone()),
      c => attentionChart(c, V.radar.items.find(i => /four-day/i.test(i.topic)), isPhone()),
      c => slopePlate(c)
    ];
    const evidenceNote = ["The piece's lead chart", "A related radar signal", "The piece's lead chart", "The radar item this piece started from", "A related radar signal", "The essay's twelve countries"];
    latest.innerHTML = `<div class="frame bands__head"><div><span class="kicker" style="--hue:${INK}">Latest</span><h2 class="sec__title">Six pieces, six objects</h2></div><a class="sec__link" href="#research">All research</a></div>` +
      pieces.map((p, i) => { const h = hueOf(p.topic), tint = K.tint(h); const n = nextFig(); return `<article class="band row" data-ground="${tint}" style="${hueVars(h)};--tint:${tint};--hl:${h}" data-i="${i}">
        <div class="band__in frame">
          <div class="band__obj">${K[p.obj](h)}</div>
          <div><h3 class="band__title"><a href="${i === 5 ? "#essay" : "article.html"}">${esc(p.title)}</a></h3><p class="band__deck">${esc(p.deck)}</p></div>
          <div class="band__meta"><b>${esc(p.topic)}</b>${esc(p.type)}<br>${esc(p.date)} · ${esc(p.read)}</div>
          <button class="band__toggle" type="button" aria-expanded="false" aria-label="Show the evidence for ${esc(p.title)}">+</button>
          <div class="band__more"><div><div class="band__panel">
            <div class="plate"><div class="plate__fig">FIG ${n} · ${evidenceNote[i]}</div>${i === 5 ? `<div class="chart-title">${esc(V.visualEssay.title)}</div><div class="chart-subtitle">Middle-wage share of employment, 1995 to 2024, twelve economies (%)</div>` : ""}<div class="chart" data-ev="${i}"></div>${i === 5 ? `<div class="chart-source">${esc(V.featured.source)} <a href="#dataset">Data: CSV, CC BY 4.0</a></div>` : ""}</div>
            <a class="band__read" href="${i === 5 ? "#essay" : "article.html"}">Read the piece</a>
          </div></div></div>
        </div></article>`; }).join("");
    $$(".band", latest).forEach((b, i) => {
      const c = $("[data-ev]", b); evidence[i](c);
      const open = () => { b.classList.add("is-drawn"); };
      b.addEventListener("pointerenter", open); b.addEventListener("focusin", open);
      $(".band__toggle", b).addEventListener("click", e => { const on = b.classList.toggle("is-open"); e.currentTarget.setAttribute("aria-expanded", on); if (on) open(); });
      if (isTouch || reduced) b.classList.add("is-drawn");
    });
    $$(".band .draw", latest).forEach(c => { c.classList.remove("draw"); c.classList.add("draw-band"); });

    /* Data spotlight. */
    const spot = $("#spotlight");
    spot.innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker" style="--hue:${hueOf("Cities")}">Data spotlight</span><h2 class="sec__title">Office vacancy, nine cities</h2></div><a class="sec__link" href="#tracker">Office Vacancy Tracker</a></div>
      <div class="grid"><div class="spot__plate rv">${plate(nextFig(), '<div class="chart" id="spotChart"></div>')}</div>
      <div class="spot__read rv"><p>${esc(V.latest[0].deck)}</p><p class="mono" style="font-size:12.5px;color:var(--ink-2)">${esc(V.questions[1].a)}</p><a class="sec__link" href="#tracker">Open the Office Vacancy Tracker</a></div></div></div>`;
    C.responsive(ph => vacancyChart($("#spotChart"), ph));

    /* Three questions. */
    const qs = $("#questions");
    qs.innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker" style="--hue:${INK}">Three questions this week</span><h2 class="sec__title">One question, one chart, one answer</h2></div></div>
      <div class="qs">${V.questions.map((q, i) => `<div class="q rv" style="--i:${i}"><h3 class="q__q">${esc(q.q)}</h3>${plate(nextFig(), `<div class="chart" id="q${i}"></div>`)}<p class="q__a"><b>Answer.</b> ${esc(q.a)}</p><a class="sec__link" href="article.html">${esc(q.piece)}</a></div>`).join("")}</div></div>`;
    C.responsive(ph => {
      tiersChart($("#q0"), true, { width: 400, height: 250, margin: { t: 14, r: 96, b: 30, l: 34 }, xTicks: [1995, 2005, 2015, 2024], annotations: V.annotations.map(a => ({ year: a.year, text: String(a.year), series: a.series })) });
      vacancyChart($("#q1"), true, { width: 400, rowHeight: 24, margin: { t: 24, r: 44, b: 26, l: 92 } });
      profitsChart($("#q2"), true, { width: 400, rowHeight: 28, margin: { t: 8, r: 44, b: 26, l: 104 } });
    });

    /* Radar teaser. */
    const rt = $("#radar-teaser"), top4 = V.radar.items.slice(0, 4);
    rt.innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker">The radar</span><h2 class="sec__title">What is moving today</h2></div><a class="sec__link" href="radar.html">Open the radar</a></div>
      <div class="rt rv"><div class="rt__rows">${top4.map(it => { const h = hueOf(it.topicTag); return `<a class="rt__row" href="radar.html" style="${hueVars(h)}"><span class="rt__rank">${String(it.rank).padStart(2, "0")}</span><span class="rt__obj">${K.forTopic(it.topicTag, h)}</span><span><span class="rt__topic">${esc(it.topic)}</span><br><span class="rt__tag">${esc(it.topicTag)} · first seen ${esc(it.firstSeen)} · ${it.status === "picked" ? "on the desk" : it.status}</span></span><span class="rt__move">${it.movement > 0 ? "+" : "−"}${Math.abs(it.movement)}<small>${it.direction === "up" ? "▲ up" : "▼ down"}</small></span></a>`; }).join("")}</div>
      <div class="rt__side"><div>${K.dish(ACCENT)}</div><p>Refreshed ${esc(V.radar.lastRefresh)}, ${V.radar.refreshesToday} times today, next at ${esc(V.radar.nextRefresh)}. ${V.radar.sourcesPolled} sources polled. Movement is the change in a composite attention score over 24 hours.</p><span class="demo">${esc(V.demoLabel)}</span><a class="sec__link" href="radar.html">All eight items</a></div></div></div>`;

    /* The dark block: video and the visual essay. */
    const dark = $("#dark"), vid = V.video;
    const shortObj = s => { const t = topicOfPiece(s.piece); return { t, h: huesDark[t], svg: K.forTopic(t, huesDark[t], { dark: true }) }; };
    dark.innerHTML = `<div class="frame">
      <div class="sec__head"><div><span class="kicker" style="--hue:${huesDark["Public finance"]}">Video</span><h2 class="sec__title">The explainer, in four minutes</h2></div><a class="sec__link" href="#video">All video</a></div>
      <div class="vid">
        <a class="player rv" href="#video" aria-label="Play ${esc(vid.lead.title)}, ${esc(vid.lead.duration)}"><div class="plate__fig player__fig">FIG ${nextFig()} · Player</div><div class="player__obj">${K.camera(huesDark["Public finance"], { dark: true })}</div><span class="player__play"></span><h3 class="player__title">${esc(vid.lead.title)}</h3><div class="player__bar">${vid.lead.chapters.map((c, i) => `<i style="left:${(i / vid.lead.chapters.length * 100).toFixed(1)}%"></i>`).join("")}</div><div class="player__meta"><span>From ${esc(vid.lead.piece)} · ${esc(vid.lead.date)}</span><span>${esc(vid.lead.duration)}</span></div></a>
        <div class="chapters rv"><h3>Chapters</h3><ol>${vid.lead.chapters.map(c => `<li>${esc(c)}<span>chapter</span></li>`).join("")}</ol><p>Posters are objects from the kit, not frames; no video files ship in this prototype. Whether video is central or a bonus is a Phase C decision.</p></div>
        <div class="shorts"><div class="shorts__intro rv"><h3>Three shorts</h3><p>Each cut from a piece. One object, one number, one word.</p></div>${vid.shorts.map((s, i) => { const o = shortObj(s); return `<a class="short rv" style="--i:${i + 1}" href="#video">${o.svg}<span class="short__dur">${esc(s.duration)}</span><h4 class="short__t">${esc(s.title)}</h4><div class="short__m"><span>${esc(s.piece)}</span><span>${esc(o.t)}</span></div></a>`; }).join("")}</div>
      </div>
      <div class="essay" id="essay">
        <div class="essay__head"><div><span class="kicker" style="--hue:${huesDark.Labour}">${esc(V.visualEssay.type)} · ${esc(V.visualEssay.read)}</span><h2 class="sec__title">${esc(V.visualEssay.title)}</h2></div><div><p class="sec__deck">${esc(V.visualEssay.deck)}</p><a class="sec__link" href="#essay">Read the essay</a></div></div>
        <div class="plate rv"><div class="plate__fig">FIG ${nextFig()} · twelve small multiples</div><div class="chart-title">In every one of twelve economies the middle lost share</div><div class="chart-subtitle">Middle-wage share of employment, 1995 (left) to 2024 (right), per country (%)</div><div class="chart-legend"><span class="legend-item legend-item--hl"><i class="legend-swatch"></i>Middle-wage share, 1995 → 2024</span><span class="legend-item"><i class="legend-swatch"></i>50% line</span></div><div id="slopes"></div><div class="chart-source">${esc(V.featured.source)} <a href="#dataset">Data: CSV, CC BY 4.0</a></div></div>
      </div></div>`;
    slopePlate($("#slopes"));

    /* Research notes. */
    const notes = $("#notes");
    notes.innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker" style="--hue:${hueOf("Methods")}">Research notes</span><h2 class="sec__title">Short, dated, about method</h2></div><a class="sec__link" href="#notes">All notes</a></div>
      <div class="notes">${V.notes.map((n, i) => `<a class="note rv" style="--i:${i}" href="#notes"><span class="note__d">${esc(n.date)}</span><span class="note__t">${esc(n.title)}</span><span class="note__k">${esc(n.topic)}</span><span class="note__r">${esc(n.read)}</span></a>`).join("")}</div></div>`;

    /* Projects, tool, dataset. */
    const proj = $("#projects"), wc = V.projects[0], tool = V.projects[1], ds = V.dataset;
    proj.innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker" style="--hue:${hueOf("Sport")}">Projects, tool, dataset</span><h2 class="sec__title">Long work, in parts</h2></div></div>
      <div class="proj">
        <a class="cover cover--wc rv" href="#projects"><div class="cover__k"><span>Project · ${esc(wc.topic)}</span><span>${esc(wc.status)}</span></div><div class="cover__art">${K.diorama()}</div><h3 class="cover__t">${esc(wc.title)}</h3><p class="cover__d">${esc(wc.deck)}</p><div class="cover__s"><span class="parts">${Array.from({ length: wc.parts }, (_, i) => `<i class="${i < wc.done ? "on" : ""}"></i>`).join("")}</span><span>Part ${wc.done} of ${wc.parts} published</span></div></a>
        <a class="cover cover--tool rv" id="tracker" style="--i:1" href="#tracker"><div class="cover__k"><span>Tool · ${esc(tool.topic)}</span></div><div class="cover__art">${K.skyline(hueOf("Cities"))}</div><h3 class="cover__t">${esc(tool.title)}</h3><p class="cover__d">${esc(tool.deck)}</p><div class="cover__s">${esc(tool.status)}</div></a>
        <a class="cover cover--data rv" id="dataset" style="--i:2" href="#dataset"><div class="cover__k"><span>Dataset · ${esc(ds.version)}</span><span>${esc(ds.licence)}</span></div><div class="cover__art">${K.cube(hueOf("Methods"))}</div><h3 class="cover__t">${esc(ds.title)}</h3><p class="cover__d">${esc(ds.desc)}</p><div class="cover__s">${esc(ds.rows)} · ${esc(ds.cols)} · ${esc(ds.size)} · ${esc(ds.updated)}</div><div class="chips">${ds.fields.map(f => `<span>${esc(f)}</span>`).join("")}</div></a>
      </div></div>`;

    /* Topics. */
    $("#topics").innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker" style="--hue:${INK}">Topics</span><h2 class="sec__title">Nine topics</h2></div></div>
      <div class="topics">${V.topics.map((t, i) => `<a class="topic rv" style="--i:${i};${hueVars(hueOf(t.name))}" href="#topics">${esc(t.name)}<sup>${t.n}</sup></a>`).join("")}</div></div>`;

    /* Newsletter and footer. */
    $("#newsletter").innerHTML = `<div class="frame news__in"><div class="news__copy rv"><span class="kicker">Newsletter</span><h2>${esc(V.newsletter.title)}</h2><p>${esc(V.newsletter.text)}</p></div>
      <form class="news__form rv" style="--i:1" onsubmit="return false"><label for="nl">Email</label><input id="nl" type="email" placeholder="${esc(V.newsletter.placeholder)}" required><button type="submit">${esc(V.newsletter.button)}</button></form></div>`;
    buildFooter($("#footer"));
  }
  const numHTML = n => { const m = n.value.match(/^([^\d]*)([\d.]+)(.*)$/); if (!m) return `<div class="num"><div class="num__v">${esc(n.value)}</div><div class="num__l">${esc(n.label)}</div></div>`; const dec = (m[2].split(".")[1] || "").length; return `<div class="num"><div class="num__v" data-to="${m[2]}" data-decimals="${dec}" data-prefix="${esc(m[1])}" data-suffix="${esc(m[3])}">${esc(m[1])}0${esc(m[3])}</div><div class="num__l">${esc(n.label)}</div></div>`; };
  const legendHTML = items => items.map(i => `<span class="legend-item${i.hl ? " legend-item--hl" : ""}"><i class="legend-swatch ${i.cls || ""}"></i>${esc(i.label)}</span>`).join("");
  function buildFooter(el, compact) {
    const f = V.footer;
    el.className = "footer" + (compact ? " footer--compact" : "");
    el.innerHTML = `<div class="frame"><div class="footer__mark" aria-hidden="true">${V.name}</div>
      <div class="footer__kit" aria-hidden="true">${K.names.map(n => K[n](ACCENT)).join("")}</div>
      <div class="footer__cols"><p class="footer__about">${esc(f.about)}</p>${f.cols.map(c => `<div class="footer__col"><h4>${esc(c.h)}</h4><ul>${c.links.map(l => `<li><a href="${l === "Newsletter" ? "#newsletter" : "#"}">${esc(l)}</a></li>`).join("")}</ul></div>`).join("")}</div>
      <div class="footer__legal"><span>${esc(f.legal)}</span><span>${esc(f.demo)}</span></div></div>`;
  }

  /* ---------- Radar page ---------- */
  function buildRadar() {
    const R = V.radar;
    $("#board-head").innerHTML = `<div class="frame board__head"><h1 class="board__title">Moving today</h1>
      <div class="board__meta"><span><b>${esc(R.date)}</b></span><span class="live"><i></i>Refreshed ${esc(R.lastRefresh)}, ${R.refreshesToday} times today, next at ${esc(R.nextRefresh)}</span><span>${R.sourcesPolled} sources polled · movement is the 24-hour change in a composite attention score</span><span class="demo">${esc(V.demoLabel)}</span></div></div>`;
    const items = R.items.slice();
    const alpha = items.slice().sort((a, b) => a.topic.localeCompare(b.topic));
    const byMove = items.slice().sort((a, b) => a.rank - b.rank);
    const maxMove = Math.max(...items.map(i => Math.abs(i.movement)));
    const stamp = (s, j) => { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) & 1023; const r = ((h + j * 7) % 5) - 2; return `<span class="stamp" style="--r:${r}deg">${esc(s)}</span>`; };
    const tileHTML = it => { const h = hueOf(it.topicTag), neg = it.movement < 0, len = Math.abs(it.movement) / maxMove * 90;
      const status = it.status === "watching" ? `<span class="status">Watching</span>` : it.status === "picked" ? `<span class="status status--picked">On the desk</span>` : `<span class="status status--published">Published as <a href="article.html">${esc(it.publishedAs)}</a> · <a href="#started">started on the radar, ${esc(it.radarDate)}</a></span>`;
      return `<li class="tile" style="${hueVars(h)};--hl:${h}" data-topic="${esc(it.topic)}" tabindex="0">
        <div class="tile__top"><span class="tile__rank">${String(it.rank).padStart(2, "0")}</span><span>first seen ${esc(it.firstSeen)}</span></div>
        <div class="tile__art"><div class="tile__obj">${K.forTopic(it.topicTag, h)}</div><div class="tile__bar"><span class="base"></span><span class="bar-v${neg ? " neg" : ""}" style="height:${len.toFixed(0)}px;${neg ? "top:calc(100% - 30px)" : "bottom:30px"}"></span><span class="mv" style="${neg ? "top:calc(100% - 26px);left:38px" : "bottom:" + (30 + len + 8).toFixed(0) + "px"}">${neg ? "−" : "+"}${Math.abs(it.movement)}<small>${it.direction === "up" ? "▲ up" : "▼ down"} · 24h</small></span></div></div>
        <h2 class="tile__topic"><a href="${it.status === "published" ? "article.html" : "#" + it.rank}"><span class="scramble">${esc(it.topic)}</span></a></h2>
        <span class="tile__tag">${esc(it.topicTag)}</span>
        <div class="tile__spark"></div>
        <div class="stamps">${it.sources.map(stamp).join("")}</div>
        <div class="tile__foot">${status}</div>
        ${it.note ? `<div class="tile__note"><div><p>${esc(it.note)}</p></div></div>` : ""}
      </li>`; };
    const board = $("#tiles");
    board.innerHTML = (reduced ? byMove : alpha).map(tileHTML).join("");
    const tiles = $$(".tile", board);
    tiles.forEach(t => { const it = items.find(i => i.topic === t.dataset.topic); const sp = $(".tile__spark", t); sp.innerHTML = ""; C.sparkline(sp, it.spark, { width: 160, height: 32 }); });
    /* motion: feedback: each bar rises to its score on load. */
    requestAnimationFrame(() => tiles.forEach(t => $(".bar-v", t).classList.add("is-in")));
    if (!reduced) {
      /* motion: state: the board sorts itself by what moved, from alphabetical to movement order, in 700ms. */
      setTimeout(() => {
        const first = new Map(tiles.map(t => [t, t.getBoundingClientRect()]));
        byMove.forEach(it => board.appendChild(tiles.find(t => t.dataset.topic === it.topic)));
        tiles.forEach(t => { const f = first.get(t), l = t.getBoundingClientRect(); const dx = f.left - l.left, dy = f.top - l.top; if ((dx || dy) && t.animate) t.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 700, easing: "cubic-bezier(.4,0,.2,1)" }); });
      }, 900);
      /* motion: feedback: items picked for the desk re-type themselves once (600ms) as a sign the data changed since the last refresh. */
      const glyphs = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      tiles.filter(t => items.find(i => i.topic === t.dataset.topic).status === "picked").forEach(t => {
        const s = $(".scramble", t), text = s.textContent, t0 = performance.now();
        const off = M.onFrame((y, now) => { const p = M.clamp((now - t0) / 600, 0, 1); const keep = Math.floor(p * text.length);
          s.textContent = text.split("").map((ch, i) => i < keep || ch === " " ? ch : glyphs[Math.floor(Math.random() * glyphs.length)]).join("");
          if (p >= 1) { s.textContent = text; off(); } });
      });
    }
    $("#raw").innerHTML = `<p class="board__source chart-source">Source: Visinage radar, ${R.sourcesPolled} sources polled by ${R.collectors.length} collectors, refreshed ${esc(R.lastRefresh)} on ${esc(R.date)}; sparklines are the hourly composite attention score over 24 hours. DEMO / PLACEHOLDER DATA.</p><h3>The noise beneath the scores: ${R.rawHeadlines.length} raw headlines, unscored, from the ${R.lastRefresh} poll</h3><ul>${R.rawHeadlines.map(h => `<li>${esc(h)}</li>`).join("")}</ul>`;
    /* How the radar works. */
    const objFor = ["globe", "cube", "house", "building", "dish"];
    $("#how").innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker">How the radar works</span><h2 class="sec__title">Five collectors, one scorer, one public board</h2></div></div>
      <div class="how"><div class="how__text rv"><p>${esc(R.howItWorks)}</p><span class="private">The desk is private. Nothing from it is shown here.</span></div>
      <div class="how__diagram rv" style="--i:1"><div class="collectors">${R.collectors.map((c, i) => `<div class="collector">${K[objFor[i]](hueOf("Methods"))}<span>${esc(c)}</span></div>`).join("")}</div>
        <div class="rail"></div><div class="scorer">An agent scores and deduplicates, ${R.refreshesToday} times today · ${R.sourcesPolled} sources</div>
        <div class="outs"><div class="out">${K.dish(ACCENT)}<div><b>The radar</b>Public. This board, as a JSON feed anyone can read.</div></div><div class="out out--private"><div class="lock" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="1"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></div><div><b>The desk</b>Private. What is picked, and what happens next, is not shown.</div></div></div></div></div></div>`;
    /* Started on the radar. */
    const pub = items.filter(i => i.status === "published");
    $("#started").innerHTML = `<div class="frame"><div class="sec__head"><div><span class="kicker">Started on the radar</span><h2 class="sec__title">Two pieces that began as signals</h2></div></div>
      <div class="started">${pub.map(it => `<a class="started__row rv" href="article.html">${K.forTopic(it.topicTag, hueOf(it.topicTag))}<span class="started__t">${esc(it.publishedAs)}</span><span class="started__m">Published ${esc(it.publishedDate)}<br>started on the radar, ${esc(it.radarDate)} · ${esc(it.topicTag)}</span></a>`).join("")}</div></div>`;
    buildFooter($("#footer"), true);
  }

  /* ---------- Article page ---------- */
  function buildArticle() {
    const A = V.article, F = V.featured, hue = hueOf("Labour");
    $("#file").innerHTML = `<div class="frame file" style="--hue:${hue}">
      <div><span class="kicker">${esc(A.kicker)}</span><br><b>${esc(F.date)}</b> · ${esc(F.readTime)} · By <b>${esc(V.author)}</b><br>${esc(A.radarLine)}</div>
      <div>Method: <b>${esc(A.method)}</b><br>Data: <b>${esc(A.data)}</b><br>Tags: ${F.tags.map(t => `<span class="tag">${esc(t)}</span>`).join(" ")}</div></div>
      <div class="frame"><h1 class="art__title">${esc(F.title)}</h1><p class="art__deck">${esc(F.deck)}</p></div><div data-nav-sentinel></div>`;
    $("#speeds").innerHTML = `<div class="frame speeds"><div class="speeds__nums">${A.twoSpeeds.numbers.map((n, i) => `<div class="plate speed rv" style="--i:${i}">${numHTML(n)}</div>`).join("")}</div><p class="speeds__view rv">${esc(A.twoSpeeds.viewpoint)}</p></div>`;
    countUps(".speed .num__v");
    /* The chapter object. */
    const ch = $("#chapter");
    ch.innerHTML = `<div class="frame chapter"><div class="steps">${A.steps.map((s, i) => `<div class="step" data-i="${i}"><div class="step__n">${String(i + 1).padStart(2, "0")} / 0${A.steps.length} · ${s.year}</div><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></div>`).join("")}</div>
      <div class="chapter__obj"><div class="plate"><div class="plate__fig">FIG 1 · the chapter object</div><div class="chart-title">${esc(F.chartTitle)}</div><div class="chart-subtitle">${esc(F.chartSubtitle)}</div><div class="chart-legend" id="chLegend">${legendHTML(legendTiers("middle"))}</div>
        <div class="stage"><canvas class="stage__canvas" role="img" aria-label="Three wage-tier slabs on a disc; the middle slab changes height with the year"></canvas><div class="stage__fallback"></div><svg class="stage__svg" aria-hidden="true"></svg>
          ${V.annotations.map(a => `<div class="flag" data-year="${a.year}"><b>${a.year}</b>${esc(a.text)}</div>`).join("")}</div>
        <div class="ruler"><svg id="ruler"></svg></div>
        <div class="chart-source">${esc(F.source)} <a href="index.html#dataset">Data: CSV, CC BY 4.0</a></div></div></div></div>`;
    const stage = $(".stage", ch);
    const phone = isPhone();
    const st = makeStage(stage, { S: 8.2, targetY: 2.3, hl: "middle", initialShares: sharesAt(0), chart: { cursor: true, cursorLabel: false } });
    let chart = st.chart;
    if (phone) {
      /* Phone: the overlay svg draws the full chart beside the static slabs. */
      const sv = $(".stage__svg", stage); sv.setAttribute("viewBox", "0 0 300 200"); sv.style.display = "block";
      chart = objLine(sv, { x0: 32, x1: 196, yTop: 18, yBottom: 162, cursor: true, cursorLabel: false, xTicks: [1995, 2010, 2024], annText: { 2009: "Financial crisis", 2016: "Below 50%" }, wrapAt: 10 });
      chart.setProgress(1);
    } else if (chart) { chart.setProgress(1); chart.setAllow({ 2009: false, 2016: false, m50: false }); }
    const flags = $$(".flag", stage);
    const ruler = $("#ruler"); const RW = 600; ruler.setAttribute("viewBox", `0 0 ${RW} 44`);
    const rx = y => 10 + (y - 1995) / 29 * (RW - 20);
    ruler.innerHTML = V.years.map(y => `<line class="t ${y % 5 === 0 ? "t5" : ""}" x1="${rx(y)}" x2="${rx(y)}" y1="14" y2="${y % 5 === 0 ? 26 : 21}"/>`).join("") +
      [1995, 2000, 2005, 2010, 2015, 2020, 2024].map(y => `<text x="${rx(y)}" y="40" text-anchor="middle">${y}</text>`).join("") +
      `<line class="now-tick" id="nowTick" x1="${rx(1995)}" x2="${rx(1995)}" y1="6" y2="26"/><text class="now-lab" id="nowLab" x="${rx(1995)}" y="4" text-anchor="middle">1995</text>`;
    const nowTick = $("#nowTick"), nowLab = $("#nowLab");
    let yearNow = 1995, yearTarget = 1995, active = -1;
    const states = ["highlight-middle", "annotate-2009", "annotate-2016", "highlight-high"];
    function applyStep(i) {
      if (i === active) return; active = i;
      $$(".step", ch).forEach((s, j) => s.classList.toggle("is-active", j === i));
      const step = A.steps[i]; yearTarget = step.year;
      const hl = i >= 3 ? "high" : "middle";
      const idx = V.years.indexOf(step.year);
      st.setShares(sharesAt(idx), reduced || !st.scene); st.setHighlight(hl);
      if (chart) { chart.setAllow({ 2009: i >= 1, 2016: i >= 2, m50: i >= 2 }); chart.setHighlight(hl); }
      flags.forEach(f => f.classList.toggle("is-on", (f.dataset.year === "2009" && i >= 1) || (f.dataset.year === "2016" && i >= 2)));
      $("#chLegend").innerHTML = legendHTML(legendTiers(hl));
      if (reduced || !st.scene) { yearNow = yearTarget; placeYear(); placeFlags(); }
    }
    function placeYear() { if (chart) chart.setYear(yearNow); const x = rx(yearNow); nowTick.setAttribute("x1", x); nowTick.setAttribute("x2", x); nowLab.setAttribute("x", x); nowLab.textContent = Math.round(yearNow); }
    let lastAnchor = null;
    function placeFlags() {
      if (phone) return;
      const a = st.anchor("middle");
      if (!lastAnchor || Math.abs(a[0] - lastAnchor[0]) > 0.3 || Math.abs(a[1] - lastAnchor[1]) > 0.3) {
        lastAnchor = a;
        /* Positioned with a transform (composited), not left/top (layout), because the anchor moves on every frame of a slab ease. */
        flags.forEach((f, i) => { const dx = i === 0 ? -78 : 78; f.style.setProperty("--fx", (a[0] + dx).toFixed(1) + "px"); f.style.setProperty("--fy", Math.max(0, a[1] - 18 - f.offsetHeight).toFixed(1) + "px"); });
      }
      if (chart) chart.setLeader(active >= 3 ? st.anchor("high") : a);
    }
    /* Reduced motion: the pinned sequence shows its final state and the steps read as plain paragraphs; no observer drives the object. */
    if (reduced) { applyStep(3); $$(".step", ch).forEach(s => s.classList.add("is-active")); }
    else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting) applyStep(+e.target.dataset.i);
        /* Scrolling back above the chapter returns the object to its first state. */
        else if (+e.target.dataset.i === 0 && e.boundingClientRect.top > window.innerHeight * 0.55) applyStep(0);
      }), { rootMargin: "-45% 0px -45% 0px", threshold: 0 });
      $$(".step", ch).forEach(s => io.observe(s));
      applyStep(0);
    } else applyStep(0);
    if (!phone && (st.scene || true)) {
      let off = null;
      const tick = (y, t) => {
        if (yearNow !== yearTarget) { yearNow += (yearTarget - yearNow) * 0.1; if (Math.abs(yearTarget - yearNow) < 0.02) yearNow = yearTarget; placeYear(); }
        if (st.scene) st.scene.update(t);
        placeFlags();
      };
      const io2 = new IntersectionObserver(([e]) => { if (e.isIntersecting && !off) off = M.onFrame(tick); else if (!e.isIntersecting && off) { off(); off = null; } }, { threshold: 0 });
      io2.observe(stage);
      if (reduced) { placeYear(); placeFlags(); }
    } else { placeYear(); }
    /* The hand-over: FIG 1 plate, notes, the body, continues, related. */
    $("#body").innerHTML = `<div class="frame body__in">
      <div class="body__fig rv">${plate(1, '<div class="chart" id="bodyChart"></div>', "", "FIG 1 · the lead chart, in full")}</div>
      <div class="body__notes rv" style="--i:1"><h4>Chart notes</h4><p>${esc(A.chartNotes)}</p><h4>Data</h4><p>${esc(A.data)}</p></div>
      <div class="prose rv">${A.body.map(p => `<p>${esc(p)}</p>`).join("")}</div>
      <div class="continues rv">The piece continues · ${esc(F.readTime)}</div>
      <div class="related rv"><h4>Related research</h4>${A.related.map(r => `<a href="${r === V.visualEssay.title ? "index.html#essay" : "index.html#latest"}">${esc(r)}</a>`).join("")}</div></div>`;
    C.responsive(ph => tiersChart($("#bodyChart"), ph));
    buildFooter($("#footer"), true);
  }

  /* ---------- Boot ---------- */
  buildNav();
  if (page === "home") buildHome(); else if (page === "radar") buildRadar(); else if (page === "article") buildArticle();
  groundSpy(); transitions();
  M.reveal(".rv", { threshold: 0.12 });
  M.reveal(".draw", { threshold: 0.3 });
  if (isTouch) M.reveal(".draw-band", { threshold: 0.2 });
})();
