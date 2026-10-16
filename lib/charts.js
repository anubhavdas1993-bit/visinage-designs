/* Minimal editorial chart renderer. Plain SVG, no dependencies.
   Every chart is drawn to scale from data. Styling is left to the page CSS via classes:
   .chart, .chart-title, .chart-subtitle, .chart-source, .grid, .axis, .tick, .series, .series--hl,
   .series--muted, .end-label, .annotation, .annotation-line, .annotation-dot, .dumbbell, .bar */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, x, y, s, attrs = {}) => {
    const t = el("text", Object.assign({ x, y }, attrs), parent);
    t.textContent = s;
    return t;
  };
  const scaleLinear = (d0, d1, r0, r1) => v => r0 + (v - d0) / (d1 - d0) * (r1 - r0);

  /* Chart frame: title, subtitle, svg, source. Returns {svg, w, h} */
  function frame(container, opts) {
    const c = typeof container === "string" ? document.querySelector(container) : container;
    c.classList.add("chart");
    c.innerHTML = "";
    if (opts.title) { const h = document.createElement("div"); h.className = "chart-title"; h.textContent = opts.title; c.appendChild(h); }
    if (opts.subtitle) { const s = document.createElement("div"); s.className = "chart-subtitle"; s.textContent = opts.subtitle; c.appendChild(s); }
    if (opts.legend) {
      const l = document.createElement("div"); l.className = "chart-legend";
      opts.legend.forEach(item => {
        const sp = document.createElement("span"); sp.className = "legend-item" + (item.hl ? " legend-item--hl" : "");
        sp.innerHTML = `<i class="legend-swatch ${item.cls || ""}"></i>${item.label}`; l.appendChild(sp);
      });
      c.appendChild(l);
    }
    const w = opts.width || 720, h = opts.height || 360;
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "chart-svg", role: "img", "aria-label": opts.title || "chart" }, c);
    if (opts.source) { const s = document.createElement("div"); s.className = "chart-source"; s.textContent = opts.source; c.appendChild(s); }
    return { svg, w, h, c };
  }

  /* Multi-line chart with one highlighted series and annotations */
  function lineChart(container, o) {
    const { svg, w, h } = frame(container, o);
    const m = Object.assign({ t: 18, r: 110, b: 36, l: 40 }, o.margin || {});
    const years = o.x, keys = Object.keys(o.series);
    const all = keys.flatMap(k => o.series[k]);
    const y0 = o.yDomain ? o.yDomain[0] : Math.floor(Math.min(...all) / 5) * 5;
    const y1 = o.yDomain ? o.yDomain[1] : Math.ceil(Math.max(...all) / 5) * 5;
    const sx = scaleLinear(years[0], years[years.length - 1], m.l, w - m.r);
    const sy = scaleLinear(y0, y1, h - m.b, m.t);
    // gridlines + y ticks
    const step = o.yStep || 10;
    for (let v = y0; v <= y1; v += step) {
      el("line", { x1: m.l, x2: w - m.r, y1: sy(v), y2: sy(v), class: "grid" }, svg);
      txt(svg, m.l - 8, sy(v) + 4, (o.yFormat || (d => d))(v), { class: "tick tick--y", "text-anchor": "end" });
    }
    // x ticks
    const xt = o.xTicks || years.filter(y => y % 5 === 0);
    xt.forEach(y => txt(svg, sx(y), h - m.b + 18, y, { class: "tick tick--x", "text-anchor": "middle" }));
    el("line", { x1: m.l, x2: w - m.r, y1: sy(y0), y2: sy(y0), class: "axis" }, svg);
    // series
    const order = keys.filter(k => k !== o.highlight).concat(o.highlight ? [o.highlight] : []);
    order.forEach(k => {
      const d = o.series[k].map((v, i) => `${i ? "L" : "M"}${sx(years[i]).toFixed(1)},${sy(v).toFixed(1)}`).join("");
      const cls = k === o.highlight ? "series series--hl" : "series series--muted";
      el("path", { d, class: cls + " series--" + k, fill: "none" }, svg);
      const last = o.series[k][o.series[k].length - 1];
      el("circle", { cx: sx(years[years.length - 1]), cy: sy(last), r: k === o.highlight ? 4 : 3, class: "end-dot end-dot--" + k }, svg);
      const lab = (o.labels && o.labels[k]) || k;
      txt(svg, sx(years[years.length - 1]) + 10, sy(last) + 4, `${lab} ${(o.endFormat || (v => v.toFixed(1) + "%"))(last)}`,
        { class: "end-label" + (k === o.highlight ? " end-label--hl" : "") + " end-label--" + k });
    });
    // annotations
    (o.annotations || []).forEach((a, idx) => {
      const i = years.indexOf(a.year); if (i < 0) return;
      const v = o.series[a.series || o.highlight][i];
      const x = sx(a.year), y = sy(v);
      const dy = a.dy !== undefined ? a.dy : (idx % 2 ? 44 : -44);
      el("line", { x1: x, x2: x, y1: y, y2: y + dy, class: "annotation-line" }, svg);
      el("circle", { cx: x, cy: y, r: 4.5, class: "annotation-dot" }, svg);
      const ty = y + dy + (dy > 0 ? 14 : -8);
      txt(svg, x + (a.anchor === "end" ? -6 : 6), ty, a.text, { class: "annotation", "text-anchor": a.anchor || "start" });
    });
    return svg;
  }

  /* Dumbbell: two values per row, horizontal */
  function dumbbellChart(container, o) {
    const rows = o.rows;
    const rowH = o.rowHeight || 30;
    const m = Object.assign({ t: 26, r: 56, b: 28, l: 118 }, o.margin || {});
    const h = m.t + rows.length * rowH + m.b;
    const { svg, w } = frame(container, Object.assign({}, o, { height: h }));
    const max = o.max || Math.ceil(Math.max(...rows.flatMap(r => [r.a, r.b])) / 10) * 10;
    const sx = scaleLinear(0, max, m.l, w - m.r);
    for (let v = 0; v <= max; v += (o.xStep || 10)) {
      el("line", { x1: sx(v), x2: sx(v), y1: m.t - 8, y2: h - m.b + 2, class: "grid" }, svg);
      txt(svg, sx(v), h - m.b + 18, v + (o.unit || "%"), { class: "tick tick--x", "text-anchor": "middle" });
    }
    // column headers as a legend line
    txt(svg, sx(rows[0].a), m.t - 12, o.labelA || "2019", { class: "tick tick--head", "text-anchor": "middle" });
    txt(svg, sx(rows[0].b), m.t - 12, o.labelB || "2026", { class: "tick tick--head tick--head-b", "text-anchor": "middle" });
    rows.forEach((r, i) => {
      const y = m.t + i * rowH + rowH / 2;
      txt(svg, m.l - 12, y + 4, r.city, { class: "row-label", "text-anchor": "end" });
      el("line", { x1: sx(r.a), x2: sx(r.b), y1: y, y2: y, class: "dumbbell" }, svg);
      el("circle", { cx: sx(r.a), cy: y, r: 5, class: "dot dot--a" }, svg);
      el("circle", { cx: sx(r.b), cy: y, r: 5, class: "dot dot--b" }, svg);
      txt(svg, sx(r.b) + 10, y + 4, r.b.toFixed(1), { class: "value-label" });
    });
    return svg;
  }

  /* Horizontal bars, one series */
  function barChart(container, o) {
    const rows = o.rows, rowH = o.rowHeight || 28;
    const m = Object.assign({ t: 8, r: 48, b: 26, l: 112 }, o.margin || {});
    const h = m.t + rows.length * rowH + m.b;
    const { svg, w } = frame(container, Object.assign({}, o, { height: h }));
    const max = o.max || Math.ceil(Math.max(...rows.map(r => r.v)) / 10) * 10;
    const sx = scaleLinear(0, max, m.l, w - m.r);
    for (let v = 0; v <= max; v += (o.xStep || 10)) {
      el("line", { x1: sx(v), x2: sx(v), y1: m.t, y2: h - m.b, class: "grid" }, svg);
      txt(svg, sx(v), h - m.b + 16, v + (o.unit || "%"), { class: "tick tick--x", "text-anchor": "middle" });
    }
    rows.forEach((r, i) => {
      const y = m.t + i * rowH + 5;
      txt(svg, m.l - 10, y + (rowH - 10) / 2 + 4, r.name, { class: "row-label", "text-anchor": "end" });
      el("rect", { x: sx(0), y, width: sx(r.v) - sx(0), height: rowH - 10, class: "bar" + (r.hl ? " bar--hl" : ""), rx: 0 }, svg);
      txt(svg, sx(r.v) + 8, y + (rowH - 10) / 2 + 4, r.v + (o.unit || "%"), { class: "value-label" });
    });
    return svg;
  }

  /* Small multiples: slope (start -> end) per country, as mini two-point lines */
  function slopeGrid(container, o) {
    const c = typeof container === "string" ? document.querySelector(container) : container;
    c.innerHTML = "";
    c.classList.add("slope-grid");
    const min = Math.floor(Math.min(...o.rows.flatMap(r => [r.s, r.e])) / 5) * 5;
    const max = Math.ceil(Math.max(...o.rows.flatMap(r => [r.s, r.e])) / 5) * 5;
    o.rows.forEach(r => {
      const cell = document.createElement("div"); cell.className = "slope-cell";
      const w = 120, h = 72;
      const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "slope-svg" });
      const sy = scaleLinear(min, max, h - 14, 10);
      el("line", { x1: 28, x2: w - 28, y1: sy(50), y2: sy(50), class: "grid" }, svg);
      el("line", { x1: 28, x2: w - 28, y1: sy(r.s), y2: sy(r.e), class: "series series--hl" }, svg);
      el("circle", { cx: 28, cy: sy(r.s), r: 3, class: "end-dot" }, svg);
      el("circle", { cx: w - 28, cy: sy(r.e), r: 3, class: "end-dot" }, svg);
      txt(svg, 24, sy(r.s) + 3, r.s.toFixed(0), { class: "tick", "text-anchor": "end" });
      txt(svg, w - 24, sy(r.e) + 3, r.e.toFixed(0), { class: "tick" });
      cell.appendChild(svg);
      const lab = document.createElement("div"); lab.className = "slope-label"; lab.textContent = r.name; cell.appendChild(lab);
      c.appendChild(cell);
    });
  }

  /* Tiny sparkline from an array */
  function sparkline(container, values, o = {}) {
    const c = typeof container === "string" ? document.querySelector(container) : container;
    const w = o.width || 120, h = o.height || 32;
    const svg = el("svg", { viewBox: `0 0 ${w} ${h}`, class: "spark" }, c);
    const min = Math.min(...values), max = Math.max(...values);
    const sx = scaleLinear(0, values.length - 1, 2, w - 2), sy = scaleLinear(min, max, h - 3, 3);
    const d = values.map((v, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join("");
    el("path", { d, class: "series series--hl", fill: "none" }, svg);
    el("circle", { cx: sx(values.length - 1), cy: sy(values[values.length - 1]), r: 2.5, class: "end-dot" }, svg);
    return svg;
  }

  /* Re-render charts when crossing the phone breakpoint, so phones get a chart drawn for 390px
     (fewer ticks, shorter annotations) rather than a desktop chart scaled down. */
  function responsive(render) {
    const mq = window.matchMedia("(max-width: 767px)");
    const run = () => render(mq.matches);
    run();
    if (mq.addEventListener) mq.addEventListener("change", run); else mq.addListener(run);
  }

  window.VCharts = { lineChart, dumbbellChart, barChart, slopeGrid, sparkline, responsive };
})();
