/* Visinage, direction two ("the world of objects"): the isometric SVG object kit.
   Every object is drawn in three flat tones of the ground colour plus a 1.5px ink outline; the accent or
   topic hue appears only on the data element of the object. Each function returns an SVG string and takes
   the hue, so the same object can be tinted per topic. The projection matches the Three.js slab object:
   true isometric (x and z at 30 degrees from horizontal, y vertical), so the 2D kit and the 3D object read
   as one family.
   Exports window.VKit = { plane, building, coins, stadium, clock, cube, dish, camera, house, globe,
                           slabs, skyline, diorama, forTopic, names, tint, mix, mul, theme } */
(function () {
  const C30 = Math.sqrt(3) / 2, S30 = 0.5;
  /* Project a world point (x right-down, z left-down, y up) to the screen. */
  const P = (x, y, z) => [(x - z) * C30, (x + z) * S30 - y];
  const f = n => String(Math.round(n * 100) / 100);
  const pts = a => a.map(p => f(p[0]) + "," + f(p[1])).join(" ");
  const SW = 'stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"';

  const PAPER = "#F3EFE6", INK = "#1A1A1F", DARK = "#141418";

  function hex2rgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(c => c + c).join(""); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgb2hex(r, g, b) { return "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join(""); }
  function mul(h, k) { const [r, g, b] = hex2rgb(h); return rgb2hex(r * k, g * k, b * k); }
  function mix(a, b, t) { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t); }
  /* A band tint: the hue at 14% over paper. */
  function tint(hue, amount) { return mix(PAPER, hue, amount === undefined ? 0.14 : amount); }

  /* Theme: the three ground tones and the ink. On paper the object is a slightly lighter paper (light, x0.91, x0.80);
     on the dark block it is three lifts of the dark ground with the outline in paper. */
  function theme(o) {
    o = o || {};
    const dark = !!o.dark;
    if (dark) {
      const g = o.ground || DARK, ink = o.ink || PAPER;
      return { light: mix(g, PAPER, 0.24), mid: mix(g, PAPER, 0.14), shadow: mix(g, PAPER, 0.06), ink, dark: true, ground: g };
    }
    const base = o.base || "#FAF7F0";
    return { light: base, mid: mul(base, 0.91), shadow: mul(base, 0.80), ink: o.ink || INK, dark: false, ground: o.ground || PAPER };
  }
  /* The hue in the same three steps, so a coloured data element is shaded like the object it sits on. */
  function hueTones(hue) { return { light: hue, mid: mul(hue, 0.88), shadow: mul(hue, 0.74) }; }

  const poly = (p, fill, T, extra) => `<polygon points="${pts(p)}" fill="${fill}" stroke="${T.ink}" ${SW}${extra ? " " + extra : ""}/>`;
  const polyNoStroke = (p, fill, extra) => `<polygon points="${pts(p)}" fill="${fill}"${extra ? " " + extra : ""}/>`;
  const line = (a, b, T, extra) => `<line x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(b[0])}" y2="${f(b[1])}" stroke="${T.ink}" ${SW}${extra ? " " + extra : ""}/>`;

  /* A box with its minimum corner at (x0, y0, z0). Visible faces: top (light), +z side at the left (mid), +x side at the right (shadow). */
  function box(x0, y0, z0, w, h, d, T, tones) {
    const t = tones || T;
    const top = [P(x0, y0 + h, z0), P(x0 + w, y0 + h, z0), P(x0 + w, y0 + h, z0 + d), P(x0, y0 + h, z0 + d)];
    const right = [P(x0 + w, y0, z0), P(x0 + w, y0 + h, z0), P(x0 + w, y0 + h, z0 + d), P(x0 + w, y0, z0 + d)];
    const left = [P(x0, y0, z0 + d), P(x0, y0 + h, z0 + d), P(x0 + w, y0 + h, z0 + d), P(x0 + w, y0, z0 + d)];
    return poly(left, t.mid, T) + poly(right, t.shadow, T) + poly(top, t.light, T);
  }
  /* The parts of a vertical cylinder, so rings and pucks can reuse them. */
  function cylParts(cx, y0, cz, r, h) {
    const rx = r * C30 * Math.SQRT2, ry = r * S30 * Math.SQRT2;
    const [bx, by] = P(cx, y0, cz), [tx, ty] = P(cx, y0 + h, cz);
    const A = (x, y, sweep) => `A${f(rx)} ${f(ry)} 0 0 ${sweep} ${f(x)} ${f(y)}`;
    return {
      rx, ry, bx, by, tx, ty,
      leftHalf: `M${f(tx - rx)} ${f(ty)}L${f(bx - rx)} ${f(by)}${A(bx, by + ry, 0)}L${f(tx)} ${f(ty + ry)}${A(tx - rx, ty, 1)}Z`,
      rightHalf: `M${f(tx)} ${f(ty + ry)}L${f(bx)} ${f(by + ry)}${A(bx + rx, by, 0)}L${f(tx + rx)} ${f(ty)}${A(tx, ty + ry, 1)}Z`,
      outline: `M${f(tx - rx)} ${f(ty)}L${f(bx - rx)} ${f(by)}${A(bx + rx, by, 0)}L${f(tx + rx)} ${f(ty)}`,
      backHalf: `M${f(tx - rx)} ${f(ty)}L${f(bx - rx)} ${f(by)}${A(bx + rx, by, 1)}L${f(tx + rx)} ${f(ty)}${A(tx - rx, ty, 0)}Z`
    };
  }
  function cyl(cx, y0, cz, r, h, T, tones) {
    const t = tones || T, c = cylParts(cx, y0, cz, r, h);
    return `<path d="${c.leftHalf}" fill="${t.mid}"/><path d="${c.rightHalf}" fill="${t.shadow}"/>` +
      `<path d="${c.outline}" fill="none" stroke="${T.ink}" ${SW}/>` +
      `<ellipse cx="${f(c.tx)}" cy="${f(c.ty)}" rx="${f(c.rx)}" ry="${f(c.ry)}" fill="${t.light}" stroke="${T.ink}" ${SW}/>`;
  }
  /* A ring (a stadium): outer wall, the far inner wall seen through the hole, a pitch at the bottom, the top ring. */
  function ring(cx, y0, cz, R, r, h, T, tones, pitch) {
    const t = tones || T, o = cylParts(cx, y0, cz, R, h), i = cylParts(cx, y0, cz, r, h);
    let s = `<path d="${o.leftHalf}" fill="${t.mid}"/><path d="${o.rightHalf}" fill="${t.shadow}"/><path d="${o.outline}" fill="none" stroke="${T.ink}" ${SW}/>`;
    s += `<ellipse cx="${f(i.bx)}" cy="${f(i.by)}" rx="${f(i.rx)}" ry="${f(i.ry)}" fill="${pitch || t.light}"/>`;
    s += `<path d="${i.backHalf}" fill="${t.shadow}"/>`;
    s += `<path d="M${f(o.tx - o.rx)} ${f(o.ty)}A${f(o.rx)} ${f(o.ry)} 0 1 0 ${f(o.tx + o.rx)} ${f(o.ty)}A${f(o.rx)} ${f(o.ry)} 0 1 0 ${f(o.tx - o.rx)} ${f(o.ty)}Z` +
      `M${f(i.tx - i.rx)} ${f(i.ty)}A${f(i.rx)} ${f(i.ry)} 0 1 1 ${f(i.tx + i.rx)} ${f(i.ty)}A${f(i.rx)} ${f(i.ry)} 0 1 1 ${f(i.tx - i.rx)} ${f(i.ty)}Z" fill="${t.light}" fill-rule="evenodd" stroke="${T.ink}" ${SW}/>`;
    return s;
  }
  /* A rectangle drawn flat on the +z face (z = zf) or the +x face (x = xf). */
  const rectZ = (a, c, b, d, zf) => [P(a, c, zf), P(b, c, zf), P(b, d, zf), P(a, d, zf)];
  const rectX = (xf, c, d, a, b) => [P(xf, c, a), P(xf, d, a), P(xf, d, b), P(xf, c, b)];
  /* A circle drawn flat on the +z face. */
  function circleZ(cx, cy, r, zf, n) { const o = []; n = n || 28; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), zf)); } return o; }
  /* A circle drawn on a top face at height y. */
  function circleY(cx, y, cz, r, n) { const o = []; n = n || 36; for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; o.push(P(cx + r * Math.cos(a), y, cz + r * Math.sin(a))); } return o; }

  function svg(inner, o, fit) {
    const vb = fit.vb || "0 0 100 100";
    const cls = "obj" + (o && o.cls ? " " + o.cls : "");
    const title = o && o.title ? `<title>${o.title}</title>` : "";
    return `<svg class="${cls}" viewBox="${vb}" width="100" height="100" ${o && o.title ? 'role="img"' : 'aria-hidden="true"'} focusable="false">${title}<g transform="translate(${f(fit.tx)} ${f(fit.ty)}) scale(${f(fit.s)})">${inner}</g></svg>`;
  }
  /* Contact shadow under an object: a radial gradient ellipse. */
  let gradId = 0;
  function shadow(cx, cy, rx, ry, T) {
    const id = "vk-sh" + (++gradId);
    const c = T.dark ? "0,0,0" : "26,26,31";
    return `<defs><radialGradient id="${id}"><stop offset="0" stop-color="rgba(${c},${T.dark ? 0.55 : 0.26})"/><stop offset="0.7" stop-color="rgba(${c},${T.dark ? 0.2 : 0.08})"/><stop offset="1" stop-color="rgba(${c},0)"/></radialGradient></defs>` +
      `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="url(#${id})"/>`;
  }

  /* ---------- The ten objects ---------- */

  /* Housing: a house; the roof is the data element. */
  function house(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = box(-14, 0, -12, 28, 16, 24, T);
    s += poly(rectZ(-4, 0, 4, 11, 12), T.shadow, T);                 // door on the +z face
    s += poly(rectX(14, 6, 11, -9, -3), T.light, T);                  // window on the +x face
    s += poly(rectX(14, 6, 11, 2, 8), T.light, T);
    s += poly([P(-14, 16, 12), P(14, 16, 12), P(0, 27, 12)], H.mid, T);  // gable
    s += poly([P(14, 16, -12), P(14, 16, 12), P(0, 27, 12), P(0, 27, -12)], H.light, T); // roof slope
    return svg(s, o, { tx: 50, ty: 64, s: 1.55 });
  }

  /* Cities: a tower with an annex; the top floors carry the hue (the vacant floors). */
  function building(hue, o) {
    const T = theme(o), H = hueTones(hue);
    /* Window tones are pre-mixed (no per-element opacity): software rasterisers pay for every transparency group. */
    const wx = mix(T.shadow, T.ink, 0.28), wz = mix(T.mid, T.ink, 0.2);
    let s = box(-10, 0, -10, 20, 36, 20, T);
    for (let y = 4; y < 34; y += 6) {
      s += polyNoStroke(rectX(10, y, y + 3, -7, -3), wx) + polyNoStroke(rectX(10, y, y + 3, 1, 5), wx);
      s += polyNoStroke(rectZ(-7, y, -3, y + 3, 10), wz) + polyNoStroke(rectZ(1, y, 5, y + 3, 10), wz);
    }
    s += box(-10, 36, -10, 20, 10, 20, T, H);
    s += box(10, 0, -4, 10, 14, 12, T);
    s += polyNoStroke(rectX(20, 4, 7, -2, 2), wx) + polyNoStroke(rectX(20, 9, 12, -2, 2), wx);
    return svg(s, o, { tx: 50, ty: 72, s: 1.2 });
  }

  /* Macroeconomics: a stack of coins; the top coin is the hue. */
  function coins(hue, o) {
    const T = theme(o), H = hueTones(hue);
    const off = [[0, 0], [1.6, 0.4], [-1.2, 1.2], [1.8, -0.6], [0.4, 0.8]];
    let s = "";
    off.forEach((d, i) => { s += cyl(d[0], i * 3.6, d[1], 15, 3.6, T, i === off.length - 1 ? H : null); });
    return svg(s, o, { tx: 50, ty: 66, s: 1.75 });
  }

  /* Public finance (and Sport): a stadium ring; the pitch is the hue. */
  function stadium(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = ring(0, 0, 0, 24, 16, 9, T, null, H.light);
    return svg(s, o, { tx: 50, ty: 58, s: 1.55 });
  }

  /* Labour: a dial on a puck; the wedge is the 40 hours of a 168-hour week, in the hue. */
  function clock(hue, o) {
    const T = theme(o), H = hueTones(hue);
    const R = 20, h = 6;
    let s = cyl(0, 0, 0, R, h, T);
    const span = 40 / 168 * Math.PI * 2;
    const wedge = [P(0, h, 0)];
    for (let i = 0; i <= 24; i++) { const a = -Math.PI / 2 + span * i / 24; wedge.push(P(16 * Math.cos(a), h, 16 * Math.sin(a))); }
    s += poly(wedge, H.light, T);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; s += line(P(15 * Math.cos(a), h, 15 * Math.sin(a)), P(18 * Math.cos(a), h, 18 * Math.sin(a)), T); }
    s += line(P(0, h, 0), P(0, h, -13), T, 'stroke-width="2"');
    s += line(P(0, h, 0), P(8 * Math.cos(0.35), h, 8 * Math.sin(0.35)), T, 'stroke-width="2"');
    s += `<ellipse cx="0" cy="${f(-h)}" rx="2.2" ry="1.3" fill="${T.ink}"/>`;
    return svg(s, o, { tx: 50, ty: 58, s: 1.8 });
  }

  /* Methods: a chart cube; the bars on its face are the hue. */
  function cube(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = box(-12, 0, -12, 24, 24, 24, T);
    [[-9, 7], [-3, 11], [3, 15], [9, 19]].forEach(([x, hb]) => { s += poly(rectZ(x - 2, 3, x + 2, 3 + hb, 12), H.light, T); });
    const pl = [[12, 4, 10], [12, 9, 6], [12, 12, 2], [12, 16, -2], [12, 21, -6], [12, 20, -10]].map(p => P(p[0], p[1], p[2]));
    s += `<polyline points="${pts(pl)}" fill="none" stroke="${H.light}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`;
    return svg(s, o, { tx: 50, ty: 66, s: 1.6 });
  }

  /* The radar: a dish on a post; the signal arcs are the hue. */
  function dish(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = box(-10, 0, -10, 20, 3, 20, T);
    s += cyl(0, 3, 0, 1.8, 13, T);
    const [cx, cy] = P(0, 16, 0);
    const dx = cx + 2, dy = cy - 2;
    s += `<g transform="rotate(-32 ${f(dx)} ${f(dy)})"><ellipse cx="${f(dx)}" cy="${f(dy)}" rx="14" ry="8" fill="${T.light}" stroke="${T.ink}" ${SW}/><ellipse cx="${f(dx)}" cy="${f(dy)}" rx="9.5" ry="5" fill="${T.mid}" stroke="${T.ink}" ${SW}/></g>`;
    s += `<line x1="${f(dx)}" y1="${f(dy)}" x2="${f(dx + 11)}" y2="${f(dy - 8)}" stroke="${T.ink}" ${SW}/>`;
    s += `<circle cx="${f(dx + 11)}" cy="${f(dy - 8)}" r="2.2" fill="${H.light}" stroke="${T.ink}" ${SW}/>`;
    [16, 23, 30].forEach((r, i) => { s += `<path d="M${f(dx + r * 0.5)} ${f(dy - r * 0.87)}A${r} ${r} 0 0 1 ${f(dx + r * 0.97)} ${f(dy - r * 0.05)}" fill="none" stroke="${mix(H.light, T.ground, i * 0.25)}" stroke-width="${2 - i * 0.4}" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`; });
    return svg(s, o, { tx: 46, ty: 70, s: 1.45 });
  }

  /* Video: a camera; the lens and the record light are the hue. */
  function camera(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = box(-13, 0, -7, 26, 14, 14, T);
    s += box(-12, 14, -6, 7, 4, 7, T);                                 // viewfinder
    s += box(-6, 3, 7, 12, 9, 6, T);                                   // lens hood, in front
    s += poly(circleZ(0, 7.5, 3.6, 13), H.light, T);                   // lens
    s += polyNoStroke(circleZ(0, 7.5, 1.6, 13), H.shadow);
    s += poly(circleZ(-9, 10, 1.3, 7), H.light, T);                    // record light on the body
    s += poly(rectX(13, 3, 11, -5, 3), T.light, T);                    // screen on the +x face
    return svg(s, o, { tx: 50, ty: 66, s: 1.85 });
  }

  /* Climate: a plane; the tail fin is the hue. */
  function plane(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = box(-6, 8, -20, 10, 1.2, 16, T);                           // far wing
    s += box(-18, 10, -11, 6, 1, 7, T);                                // far tailplane
    s += box(-18, 6, -4, 36, 8, 8, T);                                 // fuselage
    s += box(18, 7, -3, 6, 6, 6, T);                                   // nose
    s += box(-18, 14, -1, 7, 9, 2, T, H);                              // fin
    s += box(-18, 10, 4, 6, 1, 7, T);                                  // near tailplane
    s += box(-6, 8, 4, 10, 1.2, 16, T);                                // near wing
    for (let i = 0; i < 4; i++) s += polyNoStroke(rectZ(-2 + i * 4.5, 10, 0.5 + i * 4.5, 12.5, 4), mix(T.mid, T.ink, 0.25));
    return svg(s, o, { tx: 50, ty: 70, s: 1.6 });
  }

  /* Trade: a globe on a stand; the equator belt is the hue. */
  function globe(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = cyl(0, 0, 0, 9, 2.5, T) + cyl(0, 2.5, 0, 1.6, 3, T);
    const cx = 0, cy = -(2.5 + 3 + 18), r = 18;
    s += `<circle cx="${cx}" cy="${f(cy)}" r="${r}" fill="${T.light}" stroke="${T.ink}" ${SW}/>`;
    s += `<path d="M${cx} ${f(cy - r)}A${r} ${r} 0 0 1 ${cx} ${f(cy + r)}A${f(r * 0.55)} ${r} 0 0 0 ${cx} ${f(cy - r)}Z" fill="${T.mid}"/>`;
    s += `<path d="M${cx} ${f(cy - r)}A${r} ${r} 0 0 1 ${cx} ${f(cy + r)}A${f(r * 0.86)} ${r} 0 0 0 ${cx} ${f(cy - r)}Z" fill="${T.shadow}"/>`;
    s += `<ellipse cx="${cx}" cy="${f(cy)}" rx="${f(r * 0.42)}" ry="${r}" fill="none" stroke="${mix(T.light, T.ink, 0.35)}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    s += `<ellipse cx="${cx}" cy="${f(cy)}" rx="${r}" ry="${f(r * 0.32)}" fill="none" stroke="${H.light}" stroke-width="3.5" vector-effect="non-scaling-stroke"/>`;
    s += `<ellipse cx="${cx}" cy="${f(cy - r * 0.55)}" rx="${f(r * 0.83)}" ry="${f(r * 0.26)}" fill="none" stroke="${mix(T.light, T.ink, 0.35)}" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
    s += `<circle cx="${cx}" cy="${f(cy)}" r="${r}" fill="none" stroke="${T.ink}" ${SW}/>`;
    return svg(s, o, { tx: 50, ty: 74, s: 1.55 });
  }

  /* ---------- Composite objects ---------- */

  /* The three wage-tier slabs on a disc: the static twin of the Three.js object (reduced motion, no WebGL, phones).
     v = { low, middle, high } in share points; hl = which slab carries the hue. */
  function slabs(v, o) {
    o = o || {};
    const T = theme(o), H = hueTones(o.hue || "#2742D6"), k = 0.85;
    let s = shadow(0, 2, 56, 32, T);
    s += cyl(0, 0, 0, 40, 5, T);
    const draw = (cx, h, hl) => box(cx - 8, 5, -8, 16, h * k, 16, T, hl ? H : null);
    s += draw(-24, v.low, o.hl === "low");
    s += draw(0, v.middle, o.hl === "middle");
    s += draw(24, v.high, o.hl === "high");
    return svg(s, o, { vb: "-72 -82 144 132", tx: 0, ty: 0, s: 1 });
  }

  /* The Office Vacancy Tracker cover: a skyline on a slab; one tower in the hue. */
  function skyline(hue, o) {
    const T = theme(o), H = hueTones(hue);
    let s = shadow(0, 14, 62, 26, T);
    s += box(-34, 0, -14, 68, 3, 28, T);
    const towers = [[-28, -8, 14, 10], [-16, 2, 24, 9], [-4, -8, 38, 11], [9, 0, 30, 10], [21, -9, 18, 9], [26, 4, 12, 8]];
    towers.forEach((t, i) => { s += box(t[0], 3, t[1], t[3], t[2], t[3], T, i === 2 ? H : null); });
    return svg(s, o, { vb: "0 0 200 130", tx: 100, ty: 92, s: 1.45 });
  }

  /* The World Cup money trail: a diorama of stadium rings on a disc, in the project's own palette, on dark. */
  function diorama(o) {
    o = Object.assign({ dark: true }, o || {});
    const T = theme(o);
    const pal = o.palette || ["#2BA662", "#4091DA", "#E84634", "#F4C518"];
    let s = shadow(0, 6, 86, 48, T);
    s += cyl(0, 0, 0, 62, 7, T);
    const spots = [[-30, -24, 12], [4, -34, 9], [30, -18, 11], [-38, 6, 9], [-6, -4, 14], [26, 10, 10], [-22, 30, 10], [12, 30, 12], [40, 32, 8]];
    spots.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    spots.forEach((p, i) => { const c = pal[i % pal.length]; s += ring(p[0], 7, p[1], p[2], p[2] * 0.6, 3.5 + p[2] * 0.15, T, hueTones(c), mul(c, 0.55)); });
    return svg(s, o, { vb: "0 0 320 240", tx: 160, ty: 150, s: 1.3 });
  }

  const objects = { plane, building, coins, stadium, clock, cube, dish, camera, house, globe };
  const topicMap = { Climate: "plane", Cities: "building", Macroeconomics: "coins", "Public finance": "stadium", Sport: "stadium", Labour: "clock", Methods: "cube", Technology: "cube", Housing: "house", Trade: "globe", Video: "camera", Radar: "dish" };
  function forTopic(topic, hue, o) { const fn = objects[topicMap[topic] || "cube"]; return fn(hue, o); }

  window.VKit = { plane, building, coins, stadium, clock, cube, dish, camera, house, globe, slabs, skyline, diorama, forTopic, names: Object.keys(objects), topicMap, tint, mix, mul, theme, hueTones };
})();
