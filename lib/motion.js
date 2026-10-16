/* Motion helpers shared by the v2 mockups. No scroll listeners: one requestAnimationFrame loop reads
   scrollY for canvas work, IntersectionObserver drives reveals and counters. Everything respects
   prefers-reduced-motion by resolving to the final state immediately. */
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* Frame loop: subscribers get (scrollY, time). Started lazily, stopped when idle. */
  const subs = new Set(); let raf = null, lastY = -1, running = false;
  const tick = (t) => {
    const y = window.scrollY;
    subs.forEach(fn => fn(y, t));
    lastY = y;
    raf = running ? requestAnimationFrame(tick) : null;
  };
  function onFrame(fn) { subs.add(fn); if (!running) { running = true; raf = requestAnimationFrame(tick); } return () => { subs.delete(fn); if (!subs.size) { running = false; } }; }

  /* Progress of an element through the viewport: 0 when its top reaches the viewport top, 1 after `distance` px. */
  function scrollProgress(el, distance) {
    const r = el.getBoundingClientRect();
    return clamp(-r.top / distance, 0, 1);
  }

  /* Reveal: adds .is-in when 20% visible; optional stagger via --i custom property. */
  function reveal(selector, opts = {}) {
    const els = document.querySelectorAll(selector);
    if (reduced || !("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }), { threshold: opts.threshold || 0.2, rootMargin: opts.rootMargin || "0px 0px -8% 0px" });
    els.forEach((e, i) => { e.style.setProperty("--i", i); io.observe(e); });
  }

  /* Count-up number: data-to="47.2" data-decimals="1" data-prefix="" data-suffix="%" */
  function countUp(selector, duration = 1400) {
    const els = document.querySelectorAll(selector);
    const run = el => {
      const to = parseFloat(el.dataset.to), dec = parseInt(el.dataset.decimals || "0", 10);
      const pre = el.dataset.prefix || "", suf = el.dataset.suffix || "";
      const fmt = v => pre + v.toFixed(dec) + suf;
      if (reduced) { el.textContent = fmt(to); return; }
      const t0 = performance.now();
      const step = now => { const p = easeOut(clamp((now - t0) / duration, 0, 1)); el.textContent = fmt(to * p); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    };
    if (!("IntersectionObserver" in window)) { els.forEach(run); return; }
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } }), { threshold: 0.6 });
    els.forEach(e => io.observe(e));
  }

  /* Draw-in for SVG paths inside a container when it enters the viewport */
  function drawIn(selector) {
    const els = document.querySelectorAll(selector);
    const prep = el => el.querySelectorAll("path.series, line.series").forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 1200; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; p.style.transition = "none"; });
    const go = el => el.querySelectorAll("path.series, line.series").forEach((p, i) => { p.style.transition = `stroke-dashoffset 1.1s cubic-bezier(.4,0,.2,1) ${i * 0.12}s`; p.style.strokeDashoffset = 0; });
    if (reduced || !("IntersectionObserver" in window)) return;
    els.forEach(prep);
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { go(e.target); io.unobserve(e.target); } }), { threshold: 0.35 });
    els.forEach(e => io.observe(e));
  }

  /* Section spy for a rail index: marks the link whose section is in view */
  function spy(sectionSelector, linkSelector) {
    const links = [...document.querySelectorAll(linkSelector)];
    const map = new Map(links.map(l => [l.getAttribute("href").slice(1), l]));
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(entries => entries.forEach(e => { const l = map.get(e.target.id); if (!l) return; if (e.isIntersecting) { links.forEach(x => x.classList.remove("is-current")); l.classList.add("is-current"); } }), { rootMargin: "-40% 0px -55% 0px" });
    document.querySelectorAll(sectionSelector).forEach(s => io.observe(s));
  }

  /* Pointer-following element with easing (used by hover previews). Returns {show(x,y,html), move(x,y), hide()} */
  function follower(el, size = 240) {
    let on = false, lx = 0, ly = 0, tx = 0, ty = 0, raf = null;
    const loop = () => { lx = lerp(lx, tx, 0.18); ly = lerp(ly, ty, 0.18); el.style.transform = `translate3d(${lx - size / 2}px, ${ly - size / 2}px, 0)`; raf = on ? requestAnimationFrame(loop) : null; };
    return {
      show(x, y) { if (!on) { lx = tx = x; ly = ty = y; } on = true; el.classList.add("is-on"); if (!raf) raf = requestAnimationFrame(loop); },
      move(x, y) { tx = x; ty = y; },
      hide() { on = false; el.classList.remove("is-on"); if (raf) { cancelAnimationFrame(raf); raf = null; } }
    };
  }

  window.VMotion = { reduced, clamp, lerp, easeOut, easeInOut, onFrame, scrollProgress, reveal, countUp, drawIn, spy, follower };
})();
