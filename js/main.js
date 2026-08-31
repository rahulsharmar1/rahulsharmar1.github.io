/* ============================================================
   main.js — theme, navigation, scroll-spy, reveals,
   micro-interactions, and the interactive 3D node network.
   ============================================================ */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Theme (dark / light / system, persisted) ---------- */
  const THEME_KEY = "rs-theme";
  const root = document.documentElement;
  const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;

  function applyTheme(pref) {
    if (pref === "system" || !pref) {
      root.setAttribute("data-theme", systemDark() ? "dark" : "light");
      root.dataset.themePref = "system";
    } else {
      root.setAttribute("data-theme", pref);
      root.dataset.themePref = pref;
    }
  }
  applyTheme(localStorage.getItem(THEME_KEY) || "system");
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if ((localStorage.getItem(THEME_KEY) || "system") === "system") applyTheme("system");
  });

  document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const current = root.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  });

  /* ---------- Mobile menu ---------- */
  const menu = document.getElementById("mobileMenu");
  const openMenu = () => menu && menu.classList.add("open");
  const closeMenu = () => menu && menu.classList.remove("open");
  document.querySelector("[data-menu-open]")?.addEventListener("click", openMenu);
  document.querySelectorAll("[data-menu-close]").forEach((el) => el.addEventListener("click", closeMenu));
  menu?.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  /* ---------- Reveal on scroll ----------
     Scroll-driven for reliability (IntersectionObserver can miss
     dynamically-injected nodes and fast/programmatic scrolls).
     Exposed as window.RSReveal so github.js can register its cards. */
  const pending = new Set();
  function doReveal(el) { el.classList.add("in"); pending.delete(el); }
  function checkReveals() {
    const vh = window.innerHeight || document.documentElement.clientHeight;
    pending.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.9 && r.bottom > -40) doReveal(el);
    });
  }
  function registerReveal(el) {
    if (reduceMotion) { el.classList.add("in"); return; }
    pending.add(el);
  }
  document.querySelectorAll("[data-reveal]").forEach(registerReveal);

  if (!reduceMotion) {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => { checkReveals(); ticking = false; });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    checkReveals();
    // catch async layout (fonts, pane sizing, injected content)
    [150, 450, 900].forEach((t) => setTimeout(checkReveals, t));
  }
  window.RSReveal = { register(el) { registerReveal(el); if (!reduceMotion) checkReveals(); } };

  /* ---------- Scroll-spy active nav ---------- */
  const navLinks = [...document.querySelectorAll(".dot-nav a[data-nav]")];
  const sections = navLinks.map((l) => document.getElementById(l.dataset.nav)).filter(Boolean);
  if (sections.length) {
    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const id = e.target.id;
            navLinks.forEach((l) => l.classList.toggle("active", l.dataset.nav === id));
          }
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Copy email ---------- */
  const toast = document.getElementById("toast");
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("show"), 1900);
  }
  document.querySelectorAll("[data-copy-email]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const email = btn.dataset.copyEmail;
      try {
        await navigator.clipboard.writeText(email);
        showToast("Email copied  ·  " + email);
      } catch {
        showToast(email);
      }
      e.preventDefault();
    });
  });

  /* ---------- Card cursor glow ---------- */
  document.addEventListener("pointermove", (e) => {
    const card = e.target.closest?.(".proj-card");
    if (!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
    card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
  });

  /* ============================================================
     Interactive 3D node network — pure canvas, no libraries.
     A rotating cloud of connected nodes = systems / APIs / infra.
     Lazy-initialized when visible, pauses when off-screen,
     honors reduced-motion.
     ============================================================ */
  function initNetwork(canvas) {
    const ctx = canvas.getContext("2d");
    let W, H, DPR, cx, cy;
    const NODE_COUNT = window.innerWidth < 1400 ? 26 : 34;
    const FOCAL = 460;
    let mouseX = 0, mouseY = 0, targetRX = 0.5, targetRY = 0.4, rx = 0.5, ry = 0.4;
    let raf = null, running = false;

    // Fibonacci-sphere distribution for even node spread
    const R = 150;
    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      nodes.push({
        x: R * Math.sin(phi) * Math.cos(theta),
        y: R * Math.sin(phi) * Math.sin(theta),
        z: R * Math.cos(phi),
        pulse: Math.random() * Math.PI * 2,
        size: 1.6 + Math.random() * 1.8,
      });
    }
    // Precompute edges: connect near neighbors
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      const dists = [];
      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue;
        const dx = nodes[i].x - nodes[j].x, dy = nodes[i].y - nodes[j].y, dz = nodes[i].z - nodes[j].z;
        dists.push({ j, d: dx * dx + dy * dy + dz * dz });
      }
      dists.sort((a, b) => a.d - b.d);
      for (let k = 0; k < 3; k++) {
        const j = dists[k].j;
        if (j > i) edges.push([i, j]);
      }
    }

    function css(v) { return getComputedStyle(document.documentElement).getPropertyValue(v).trim(); }
    let colNode, colDim, colAccent;
    function refreshColors() { colNode = css("--node"); colDim = css("--node-dim"); colAccent = css("--accent"); }

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2);
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height; cx = W / 2; cy = H / 2;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      refreshColors();
    }

    function project(n, sinX, cosX, sinY, cosY) {
      // rotate Y then X
      let x = n.x * cosY - n.z * sinY;
      let z = n.x * sinY + n.z * cosY;
      let y = n.y * cosX - z * sinX;
      z = n.y * sinX + z * cosX;
      const scale = FOCAL / (FOCAL + z + 260);
      return { sx: cx + x * scale, sy: cy + y * scale, scale, z };
    }

    let t = 0;
    function frame() {
      t += 0.006;
      // ease rotation toward target (mouse parallax + slow auto-spin)
      targetRY = 0.4 + t;
      rx += (targetRX - rx) * 0.05;
      ry += (targetRY - ry) * 0.06;
      const sinX = Math.sin(rx), cosX = Math.cos(rx), sinY = Math.sin(ry), cosY = Math.cos(ry);

      ctx.clearRect(0, 0, W, H);
      const pts = nodes.map((n) => ({ ...project(n, sinX, cosX, sinY, cosY), ref: n }));

      // edges
      for (const [a, b] of edges) {
        const pa = pts[a], pb = pts[b];
        const depth = (pa.scale + pb.scale) / 2;
        ctx.strokeStyle = colDim;
        ctx.globalAlpha = Math.max(0.05, (depth - 0.55) * 0.9);
        ctx.lineWidth = depth * 0.8;
        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // nodes (painter's algorithm)
      pts.sort((a, b) => a.z - b.z);
      for (const p of pts) {
        const pulse = 0.6 + 0.4 * Math.sin(t * 3 + p.ref.pulse);
        const r = p.ref.size * p.scale * (0.8 + 0.4 * pulse);
        // glow
        const grad = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, r * 5);
        grad.addColorStop(0, colAccent);
        grad.addColorStop(1, "transparent");
        ctx.globalAlpha = 0.14 * p.scale * pulse;
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r * 5, 0, Math.PI * 2); ctx.fill();
        // core
        ctx.globalAlpha = Math.min(1, p.scale + 0.15);
        ctx.fillStyle = colNode;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (running) raf = requestAnimationFrame(frame);
    }

    function drawStatic() {
      // single non-animated render for reduced motion
      refreshColors();
      const sinX = Math.sin(0.5), cosX = Math.cos(0.5), sinY = Math.sin(0.7), cosY = Math.cos(0.7);
      const pts = nodes.map((n) => ({ ...project(n, sinX, cosX, sinY, cosY), ref: n }));
      ctx.clearRect(0, 0, W, H);
      for (const [a, b] of edges) {
        const pa = pts[a], pb = pts[b];
        ctx.strokeStyle = colDim; ctx.globalAlpha = 0.4;
        ctx.beginPath(); ctx.moveTo(pa.sx, pa.sy); ctx.lineTo(pb.sx, pb.sy); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      for (const p of pts.sort((a, b) => a.z - b.z)) {
        ctx.fillStyle = colNode;
        ctx.beginPath(); ctx.arc(p.sx, p.sy, p.ref.size * p.scale, 0, Math.PI * 2); ctx.fill();
      }
    }

    function start() { if (running || reduceMotion) return; running = true; frame(); }
    function stop() { running = false; if (raf) cancelAnimationFrame(raf); }

    // mouse parallax
    canvas.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouseX = (e.clientX - r.left) / r.width - 0.5;
      mouseY = (e.clientY - r.top) / r.height - 0.5;
      targetRX = 0.4 + mouseY * 0.8;
    });
    canvas.addEventListener("pointerleave", () => { targetRX = 0.4; });

    resize();
    window.addEventListener("resize", () => { resize(); if (reduceMotion) drawStatic(); });
    new MutationObserver(() => { refreshColors(); if (reduceMotion) drawStatic(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    if (reduceMotion) {
      drawStatic();
    } else {
      const vis = new IntersectionObserver(
        (entries) => entries.forEach((e) => (e.isIntersecting ? start() : stop())),
        { threshold: 0.05 }
      );
      vis.observe(canvas);
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
    }
  }

  const canvas = document.getElementById("nodeCanvas");
  if (canvas) {
    // lazy-load: only wire up when it approaches the viewport
    const lazy = new IntersectionObserver((entries, obs) => {
      entries.forEach((e) => { if (e.isIntersecting) { initNetwork(canvas); obs.disconnect(); } });
    }, { rootMargin: "200px" });
    lazy.observe(canvas);
  }

  /* ---------- Year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
