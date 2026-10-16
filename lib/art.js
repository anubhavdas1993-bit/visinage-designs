/* Generative data-art for covers. Every image is computed from a seed and, where given, from the
   piece's own numbers, so artwork and evidence share a source. Canvas 2D only; deterministic. */
(function () {
  const mulberry = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hash = str => { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  /* 2D value noise with smooth interpolation */
  function noise2(seed) {
    const r = mulberry(seed), g = new Float32Array(512 * 512);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const f = t => t * t * (3 - 2 * t);
    return (x, y) => { const xi = Math.floor(x) & 511, yi = Math.floor(y) & 511, xf = x - Math.floor(x), yf = y - Math.floor(y);
      const a = g[yi * 512 + xi], b = g[yi * 512 + ((xi + 1) & 511)], c = g[((yi + 1) & 511) * 512 + xi], d = g[((yi + 1) & 511) * 512 + ((xi + 1) & 511)];
      const u = f(xf), v = f(yf); return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v; };
  }
  function setup(canvas, w, h) { const dpr = Math.min(window.devicePixelRatio || 1, 2); canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr); return ctx; }

  /* Flow field: particle trails steered by noise, hue chosen from the series values. */
  function flow(canvas, o) {
    const w = o.width || canvas.clientWidth || 600, h = o.height || canvas.clientHeight || 400;
    const ctx = setup(canvas, w, h), seed = hash(o.seed || "visinage"), rnd = mulberry(seed), n = noise2(seed);
    ctx.fillStyle = o.bg || "#0e0f12"; ctx.fillRect(0, 0, w, h);
    const cols = o.colors || ["#d9481f", "#1b6f8a", "#e9e4d8"], N = o.count || 900, steps = o.steps || 70, scale = o.scale || 0.0035;
    const vals = o.values || [0.5]; const bias = vals.reduce((a, b) => a + b, 0) / vals.length;
    for (let i = 0; i < N; i++) {
      let x = rnd() * w, y = rnd() * h; const c = cols[Math.floor(rnd() * cols.length)];
      ctx.strokeStyle = c; ctx.globalAlpha = 0.18 + rnd() * 0.5; ctx.lineWidth = 0.6 + rnd() * 1.6; ctx.beginPath(); ctx.moveTo(x, y);
      for (let s = 0; s < steps; s++) { const a = (n(x * scale * 100, y * scale * 100) - 0.5) * Math.PI * 4 + bias * 2; x += Math.cos(a) * 2.2; y += Math.sin(a) * 2.2; if (x < 0 || y < 0 || x > w || y > h) break; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* Ridges: stacked ridgelines drawn from the series; a "joyplot" cover. */
  function ridges(canvas, o) {
    const w = o.width || canvas.clientWidth || 600, h = o.height || canvas.clientHeight || 400;
    const ctx = setup(canvas, w, h), seed = hash(o.seed || "ridges"), n = noise2(seed);
    ctx.fillStyle = o.bg || "#0e0f12"; ctx.fillRect(0, 0, w, h);
    const rows = o.rows || 22, series = o.series || [], cols = o.colors || ["#d9481f", "#1b6f8a"];
    for (let r = 0; r < rows; r++) {
      const base = h * 0.18 + (h * 0.78) * (r / rows); ctx.beginPath(); ctx.moveTo(-10, h + 10);
      for (let x = -10; x <= w + 10; x += 4) {
        const t = x / w; let v = 0;
        if (series.length) { const s = series[r % series.length]; const i = Math.min(s.length - 1, Math.max(0, Math.floor(t * (s.length - 1)))); v = (s[i] - Math.min(...s)) / (Math.max(...s) - Math.min(...s) + 1e-9); }
        const y = base - v * h * 0.22 - n(x * 0.012 + r * 3, r * 0.7) * h * 0.08;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + 10, h + 10); ctx.closePath();
      ctx.fillStyle = o.bg || "#0e0f12"; ctx.fill();
      ctx.strokeStyle = cols[r % cols.length]; ctx.globalAlpha = 0.55 + 0.45 * (r / rows); ctx.lineWidth = 1.4; ctx.stroke(); ctx.globalAlpha = 1;
    }
  }

  /* Halftone: dot grid whose dot size follows a data surface. Reads as a dithered image. */
  function halftone(canvas, o) {
    const w = o.width || canvas.clientWidth || 600, h = o.height || canvas.clientHeight || 400;
    const ctx = setup(canvas, w, h), seed = hash(o.seed || "halftone"), n = noise2(seed);
    ctx.fillStyle = o.bg || "#f4f4f1"; ctx.fillRect(0, 0, w, h);
    const cell = o.cell || 9, cols = o.colors || ["#0c0c0d"], values = o.values || null;
    for (let y = cell / 2; y < h; y += cell) for (let x = cell / 2; x < w; x += cell) {
      let v = n(x * 0.01, y * 0.01);
      if (values) { const i = Math.floor((x / w) * (values.length - 1)); const mn = Math.min(...values), mx = Math.max(...values); v = 0.35 * v + 0.65 * (1 - (values[i] - mn) / (mx - mn + 1e-9)) * (1 - y / h) ; }
      const r = Math.max(0, v * cell * 0.62);
      ctx.fillStyle = cols[Math.floor(((x + y) / cell) % cols.length)]; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  }

  /* Animated loop: slowly drifting flow field; call stop() to end. Used as a "video" cover. */
  function loop(canvas, o) {
    const w = o.width || canvas.clientWidth || 600, h = o.height || canvas.clientHeight || 400;
    const ctx = setup(canvas, w, h), seed = hash(o.seed || "loop"), rnd = mulberry(seed), n = noise2(seed);
    const cols = o.colors || ["#d9481f", "#1b6f8a", "#e9e4d8"], N = o.count || 500;
    const P = Array.from({ length: N }, () => ({ x: rnd() * w, y: rnd() * h, c: cols[Math.floor(rnd() * cols.length)], a: 0.2 + rnd() * 0.5 }));
    ctx.fillStyle = o.bg || "#0e0f12"; ctx.fillRect(0, 0, w, h);
    let t = 0, raf = null, on = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = () => {
      ctx.fillStyle = (o.bg || "#0e0f12"); ctx.globalAlpha = 0.08; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
      t += 0.004;
      for (const p of P) { const a = (n(p.x * 0.004 + t, p.y * 0.004 - t) - 0.5) * Math.PI * 4; const nx = p.x + Math.cos(a) * 1.6, ny = p.y + Math.sin(a) * 1.6;
        ctx.strokeStyle = p.c; ctx.globalAlpha = p.a; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(nx, ny); ctx.stroke();
        p.x = nx; p.y = ny; if (p.x < 0 || p.y < 0 || p.x > w || p.y > h) { p.x = rnd() * w; p.y = rnd() * h; } }
      ctx.globalAlpha = 1;
      if (on && !reduced) raf = requestAnimationFrame(frame);
    };
    if (reduced) { for (let i = 0; i < 120; i++) frame(); } else frame();
    return { stop() { on = false; if (raf) cancelAnimationFrame(raf); } };
  }

  /* Morph: particles that start on an instrument ring and resolve into chart lines. progress 0..1 via set(p). */
  function morph(canvas, o) {
    const w = o.width, h = o.height; const ctx = setup(canvas, w, h); const rnd = mulberry(hash(o.seed || "morph"));
    const cols = o.colors; const targets = [];
    o.lines.forEach((pts, li) => { const per = Math.floor((o.count || 2400) / o.lines.length);
      for (let i = 0; i < per; i++) { const t = i / per; const k = t * (pts.length - 1), a = Math.floor(k), b = Math.min(pts.length - 1, a + 1), f = k - a;
        targets.push({ tx: pts[a][0] + (pts[b][0] - pts[a][0]) * f + (rnd() - 0.5) * 2.5, ty: pts[a][1] + (pts[b][1] - pts[a][1]) * f + (rnd() - 0.5) * 2.5, c: cols[li], r: (li === o.highlight ? 1.6 : 1.1) + rnd() * 0.6 }); } });
    const cx = w / 2, cy = h / 2, R = Math.min(w, h) * 0.38;
    const P = targets.map(t => { const ang = rnd() * Math.PI * 2, rr = R * (0.85 + rnd() * 0.3); return Object.assign({ sx: cx + Math.cos(ang) * rr, sy: cy + Math.sin(ang) * rr, ang, rr, j: rnd() * Math.PI * 2 }, t); });
    let p = 0, time = 0;
    function draw() {
      ctx.clearRect(0, 0, w, h); time += 0.01;
      const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      // instrument ring ticks, fading with progress
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(time * 0.15); ctx.globalAlpha = 1 - e; ctx.strokeStyle = o.ring || "#5c6170"; ctx.lineWidth = 1;
      for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, L = i % 10 === 0 ? 14 : 6; ctx.beginPath(); ctx.moveTo(Math.cos(a) * (R + 18), Math.sin(a) * (R + 18)); ctx.lineTo(Math.cos(a) * (R + 18 + L), Math.sin(a) * (R + 18 + L)); ctx.stroke(); }
      ctx.restore();
      for (const q of P) { const wob = Math.sin(time * 1.3 + q.j) * (1 - e) * 6; const x = q.sx + (q.tx - q.sx) * e + wob, y = q.sy + (q.ty - q.sy) * e + wob * 0.6;
        ctx.fillStyle = q.c; ctx.globalAlpha = 0.55 + 0.45 * e; ctx.beginPath(); ctx.arc(x, y, q.r, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    return { set(v) { p = Math.max(0, Math.min(1, v)); draw(); }, draw, get progress() { return p; } };
  }

  window.VArt = { flow, ridges, halftone, loop, morph, hash };
})();
