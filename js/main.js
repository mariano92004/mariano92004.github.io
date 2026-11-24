(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  /* Bayer 4x4 y 8x8, normalizados a (0, 1) */
  const BAYER4 = Float32Array.from(
    [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5],
    (v) => (v + 0.5) / 16
  );
  const BAYER8 = Float32Array.from(
    [
      0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26,
      12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22,
      3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25,
      15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21
    ],
    (v) => (v + 0.5) / 64
  );

  /* ------------------------------------------------------------
     Idioma (es / en)
     ------------------------------------------------------------ */

  const EN = window.I18N_EN || {};
  const ES = {};
  const textNodes = document.querySelectorAll("[data-i18n]");
  const altNodes = document.querySelectorAll("[data-i18n-alt]");
  const ariaNodes = document.querySelectorAll("[data-i18n-aria]");
  const metaDesc = document.querySelector('meta[name="description"]');
  const toggle = document.querySelector("[data-lang-toggle]");

  textNodes.forEach((el) => { ES[el.dataset.i18n] = el.textContent; });
  altNodes.forEach((el) => { ES[el.dataset.i18nAlt] = el.alt; });
  ariaNodes.forEach((el) => { ES[el.dataset.i18nAria] = el.getAttribute("aria-label"); });
  ES.__title = document.title;
  ES.__desc = metaDesc ? metaDesc.content : "";

  let lang = "es";

  function setLang(next) {
    lang = next === "en" ? "en" : "es";
    const dict = lang === "en" ? EN : ES;
    const pick = (key) => dict[key] || ES[key];
    document.documentElement.lang = lang;
    textNodes.forEach((el) => { el.textContent = pick(el.dataset.i18n); });
    altNodes.forEach((el) => { el.alt = pick(el.dataset.i18nAlt); });
    ariaNodes.forEach((el) => { el.setAttribute("aria-label", pick(el.dataset.i18nAria)); });
    document.title = pick("__title");
    if (metaDesc) metaDesc.content = pick("__desc");
    if (toggle) {
      const long = toggle.querySelector(".lang-long");
      const short = toggle.querySelector(".lang-short");
      if (long) long.textContent = lang === "en" ? "Español" : "English";
      if (short) short.textContent = lang === "en" ? "ES" : "EN";
      toggle.lang = lang === "en" ? "es" : "en";
    }
    updateTankReadout();
    window.dispatchEvent(new Event("langchange"));
  }

  function storedLang() {
    try { return localStorage.getItem("lang"); } catch (e) { return null; }
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      setLang(lang === "en" ? "es" : "en");
      try { localStorage.setItem("lang", lang); } catch (e) { /* sin almacenamiento */ }
    });
  }

  /* ------------------------------------------------------------
     Campo de píxeles del inicio
     Ruido de valor animado, umbralado con Bayer en tres capas:
     baldosas (núcleo de cada isla), puntitos sueltos (borde) y nada.
     ------------------------------------------------------------ */

  const hero = document.querySelector(".hero");
  const field = hero && hero.querySelector(".field");
  const fctx = field && field.getContext("2d");

  function hash(x, y) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash(xi, yi), b = hash(xi + 1, yi);
    const c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  function fbm(x, y) {
    return vnoise(x, y) * 0.55 +
      vnoise(x * 2.03 + 31.7, y * 2.03 + 11.3) * 0.3 +
      vnoise(x * 4.11 + 7.1, y * 4.11 + 57.9) * 0.15;
  }

  const TILE = ["#bccde1", "#7f9cc0", "#3d5a80", "#14243b"]; // claro a oscuro
  const DOT = "#97a9bf";
  const ACCENT = ["#8db4de", "#2a5ba6"];

  const F = {
    W: 0, H: 0, cell: 9, cols: 0, rows: 0, dpr: 1,
    mask: null, accent: null,
    px: -9999, py: -9999, tx: -9999, ty: -9999, energy: 0,
    start: performance.now(), last: 0, running: false, visible: true
  };

  function measureField() {
    if (!hero) return;
    const r = hero.getBoundingClientRect();
    F.W = r.width;
    F.H = r.height;
    F.cell = parseFloat(getComputedStyle(hero).getPropertyValue("--cell")) || 9;
    F.dpr = Math.min(window.devicePixelRatio || 1, 2);
    field.width = Math.round(F.W * F.dpr);
    field.height = Math.round(F.H * F.dpr);
    fctx.setTransform(F.dpr, 0, 0, F.dpr, 0, 0);
    F.cols = Math.ceil(F.W / F.cell);
    F.rows = Math.ceil(F.H / F.cell);

    // Zonas libres alrededor del texto, para que nada lo tape.
    // En pantallas angostas el margen se achica para que el campo no quede vacío.
    const zones = [];
    const k = clamp(F.W / 1100, 0.45, 1);
    const add = (sel, pad, fallBase) => {
      const fall = fallBase * k;
      hero.querySelectorAll(sel).forEach((el) => {
        const b = el.getBoundingClientRect();
        if (!b.width) return;
        zones.push({
          x0: b.left - r.left - pad, y0: b.top - r.top - pad,
          x1: b.right - r.left + pad, y1: b.bottom - r.top + pad, fall
        });
      });
    };
    add(".name span", 10, 110);
    add(".lede", 14, 90);
    add(".hero-links li", 12, 70);
    add(".topbar-links li", 8, 46);
    add(".lang", 8, 46);

    const n = F.cols * F.rows;
    F.mask = new Float32Array(n);
    F.accent = new Int8Array(n);
    const fade = Math.min(160, F.H * 0.22);
    for (let row = 0; row < F.rows; row++) {
      const y = row * F.cell + F.cell / 2;
      const bottom = clamp((F.H - y) / fade, 0, 1);
      for (let col = 0; col < F.cols; col++) {
        const x = col * F.cell + F.cell / 2;
        let m = 1;
        for (const z of zones) {
          const dx = Math.max(z.x0 - x, 0, x - z.x1);
          const dy = Math.max(z.y0 - y, 0, y - z.y1);
          const t = clamp(Math.sqrt(dx * dx + dy * dy) / z.fall, 0, 1);
          const s = t * t * (3 - 2 * t);
          if (s < m) m = s;
        }
        const i = row * F.cols + col;
        F.mask[i] = m * bottom;
        const h = hash(col + 913, row + 271);
        F.accent[i] = h > 0.9965 ? 2 : h > 0.992 ? 1 : 0;
      }
    }
  }

  function drawField(t) {
    if (!fctx || !F.mask) return;
    const { cols, rows, cell } = F;
    const intro = reduceMotion ? 0 : 0.5 * Math.pow(1 - clamp(t / 1.8, 0, 1), 3);
    const T_TILE = 0.7 + intro;
    const T_DOT = 0.53 + intro;

    // Puntero suavizado
    F.px += (F.tx - F.px) * 0.18;
    F.py += (F.ty - F.py) * 0.18;
    F.energy *= 0.975;
    const R2 = 95 * 95;
    const boostMax = 0.5 * F.energy;

    const tiles = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
    const dots = new Path2D();
    const acc = [new Path2D(), new Path2D()];
    const gap = cell > 8 ? 1.5 : 1;
    const size = cell - gap * 2;
    const ds = 2;

    const ax = t * 0.035, bx = t * 0.024, by = t * 0.012;

    for (let row = 0; row < rows; row++) {
      const y = row * cell;
      const ny1 = row * 0.085 + 3.3;
      const ny2 = row * 0.07 + 20 + by;
      for (let col = 0; col < cols; col++) {
        const i = row * cols + col;
        const m = F.mask[i];
        if (m <= 0.001) continue;
        const x = col * cell;

        const f = fbm(col * 0.07 + ax, ny1) * 0.62 + fbm(col * 0.09 - bx + 50, ny2) * 0.38;
        let v = (f - 0.5) * 2.6 + 0.5;

        if (boostMax > 0.01) {
          const dx = x + cell / 2 - F.px, dy = y + cell / 2 - F.py;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 * 4) v += boostMax * Math.exp(-d2 / R2);
        }
        v *= m;

        const b = BAYER4[((row & 3) << 2) | (col & 3)];
        if (v > T_TILE) {
          const a = F.accent[i];
          if (a) {
            acc[a - 1].rect(x + gap, y + gap, size, size);
          } else {
            const lvl = (v - T_TILE) / 0.32;
            const k = clamp(Math.floor(lvl * 4 + b - 0.5), 0, 3);
            tiles[k].rect(x + gap, y + gap, size, size);
          }
        } else if (v > T_DOT && b < ((v - T_DOT) / (T_TILE - T_DOT)) * 0.55) {
          dots.rect(x + cell / 2 - ds / 2, y + cell / 2 - ds / 2, ds, ds);
        }
      }
    }

    fctx.clearRect(0, 0, F.W, F.H);
    fctx.fillStyle = DOT;
    fctx.fill(dots);
    for (let k = 0; k < 4; k++) {
      fctx.fillStyle = TILE[k];
      fctx.fill(tiles[k]);
    }
    fctx.fillStyle = ACCENT[0];
    fctx.fill(acc[0]);
    fctx.fillStyle = ACCENT[1];
    fctx.fill(acc[1]);
  }

  function frame(now) {
    if (!F.running) return;
    requestAnimationFrame(frame);
    if (now - F.last < 33) return; // ~30 fps alcanza para algo tan lento
    F.last = now;
    drawField((now - F.start) / 1000);
  }

  function startField() {
    if (reduceMotion || F.running || !F.visible || document.hidden) return;
    F.running = true;
    requestAnimationFrame(frame);
  }

  function stopField() { F.running = false; }

  function redrawStatic() {
    drawField(reduceMotion ? 0 : (performance.now() - F.start) / 1000);
  }

  if (hero && fctx) {
    measureField();
    redrawStatic();

    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      F.tx = e.clientX - r.left;
      F.ty = e.clientY - r.top;
      if (F.px < -999) { F.px = F.tx; F.py = F.ty; }
      F.energy = Math.min(1, F.energy + 0.12);
      if (reduceMotion) redrawStatic();
    }, { passive: true });

    new IntersectionObserver((entries) => {
      F.visible = entries[0].isIntersecting;
      if (F.visible) startField(); else stopField();
    }).observe(hero);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) stopField(); else startField();
    });

    let rt;
    const remeasure = () => {
      clearTimeout(rt);
      rt = setTimeout(() => { measureField(); redrawStatic(); }, 80);
    };
    new ResizeObserver(remeasure).observe(hero);
    window.addEventListener("langchange", remeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasure);

    startField();
  }

  /* ------------------------------------------------------------
     Capturas tramadas (Bayer 8x8, cuatro azules)
     ------------------------------------------------------------ */

  const DITHER = [[19, 35, 58], [52, 92, 150], [141, 180, 222], [223, 233, 245]];
  const DOT_PX = 2; // cada punto de la trama ocupa 2x2 px de CSS

  function ditherShot(img, canvas) {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h || !img.naturalWidth) return;
    const cw = Math.max(1, Math.round(w / DOT_PX));
    const ch = Math.max(1, Math.round(h / DOT_PX));
    if (canvas.width === cw && canvas.height === ch && canvas.classList.contains("ready")) return;

    canvas.width = cw;
    canvas.height = ch;
    const c = canvas.getContext("2d", { willReadFrequently: true });
    c.imageSmoothingEnabled = true;
    c.imageSmoothingQuality = "high";

    // Recorte tipo "cover", anclado arriba (igual que object-fit en el CSS)
    const nw = img.naturalWidth, nh = img.naturalHeight;
    const boxRatio = cw / ch, imgRatio = nw / nh;
    let sx = 0, sy = 0, sw = nw, sh = nh;
    if (imgRatio > boxRatio * 1.01) { sw = nh * boxRatio; sx = (nw - sw) / 2; }
    else if (imgRatio < boxRatio * 0.99) { sh = nw / boxRatio; }
    c.drawImage(img, sx, sy, sw, sh, 0, 0, cw, ch);

    let data;
    try {
      data = c.getImageData(0, 0, cw, ch);
    } catch (e) {
      canvas.remove(); // si el navegador no deja leer la imagen, se ve la original
      return;
    }
    const p = data.data;
    const n = DITHER.length - 1;
    for (let y = 0; y < ch; y++) {
      for (let x = 0; x < cw; x++) {
        const i = (y * cw + x) * 4;
        let l = (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) / 255;
        l = 0.03 + Math.pow(l, 1.25) * 0.9;
        const s = l * n;
        let k = Math.floor(s);
        if (s - k > BAYER8[((y & 7) << 3) | (x & 7)]) k++;
        if (k > n) k = n;
        const col = DITHER[k];
        p[i] = col[0];
        p[i + 1] = col[1];
        p[i + 2] = col[2];
        p[i + 3] = 255;
      }
    }
    c.putImageData(data, 0, 0);
    canvas.classList.add("ready");
  }

  const shots = document.querySelectorAll(".shot-btn");
  const shotRO = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const btn = entry.target;
      const img = btn.querySelector("img");
      const canvas = btn.querySelector("canvas");
      if (img && canvas && img.complete && img.naturalWidth) ditherShot(img, canvas);
    }
  });

  shots.forEach((btn) => {
    const img = btn.querySelector("img");
    const canvas = btn.querySelector("canvas");
    if (!img || !canvas) return;
    const run = () => ditherShot(img, canvas);
    if (img.complete && img.naturalWidth) run();
    else img.addEventListener("load", run, { once: true });
    shotRO.observe(btn);
  });

  /* ------------------------------------------------------------
     Visor de capturas
     ------------------------------------------------------------ */

  const viewer = document.querySelector(".viewer");
  if (viewer && typeof viewer.showModal === "function") {
    const vImg = viewer.querySelector("img");
    const vCap = viewer.querySelector("figcaption");

    shots.forEach((btn) => {
      btn.addEventListener("click", () => {
        const img = btn.querySelector("img");
        const cap = btn.closest("figure").querySelector("figcaption");
        vImg.src = img.currentSrc || img.src;
        vImg.alt = img.alt;
        vCap.textContent = cap ? cap.textContent : "";
        viewer.showModal();
      });
    });

    viewer.addEventListener("click", (e) => {
      if (e.target === viewer) viewer.close();
    });
    viewer.querySelector(".viewer-close").addEventListener("click", () => viewer.close());
  }

  /* ------------------------------------------------------------
     Tanque: ilustración del sensor de nivel
     ------------------------------------------------------------ */

  const tankCanvas = document.querySelector(".tank-canvas");
  const tankRange = document.getElementById("tank-range");
  const outDist = document.getElementById("tank-dist");
  const outPct = document.getElementById("tank-pct");

  // Tanque ficticio de 100 cm, con el sensor 5 cm por encima del borde
  function updateTankReadout() {
    if (!tankRange) return;
    const level = Number(tankRange.value);
    const sep = lang === "en" ? "" : " ";
    if (outDist) outDist.textContent = `${5 + (100 - level)} cm`;
    if (outPct) outPct.textContent = `${level}${sep}%`;
  }

  function drawTank() {
    if (!tankCanvas) return;
    const level = Number(tankRange.value);
    const C = 10, COLS = 22, ROWS = 30;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    tankCanvas.width = COLS * C * dpr;
    tankCanvas.height = ROWS * C * dpr;
    const t = tankCanvas.getContext("2d");
    t.setTransform(dpr, 0, 0, dpr, 0, 0);
    t.clearRect(0, 0, COLS * C, ROWS * C);

    // grilla tenue
    t.fillStyle = "rgba(19, 35, 58, 0.06)";
    for (let x = 0; x <= COLS; x++) t.fillRect(x * C, 0, 1, ROWS * C);
    for (let y = 0; y <= ROWS; y++) t.fillRect(0, y * C, COLS * C, 1);

    const tile = (col, row, color) => {
      t.fillStyle = color;
      t.fillRect(col * C + 1.5, row * C + 1.5, C - 3, C - 3);
    };

    // paredes y fondo
    const L = 2, R = 19, TOP = 7, BOTTOM = 28;
    for (let row = TOP; row <= BOTTOM; row++) { tile(L, row, "#14243b"); tile(R, row, "#14243b"); }
    for (let col = L; col <= R; col++) tile(col, BOTTOM, "#14243b");

    // sensor HC-SR04 sobre el tanque
    for (let col = 7; col <= 14; col++) tile(col, 2, "#14243b");
    tile(8, 3, "#3d5a80"); tile(9, 3, "#3d5a80");
    tile(12, 3, "#3d5a80"); tile(13, 3, "#3d5a80");
    for (let col = 4; col <= 17; col++) if (col < 7 || col > 14) tile(col, 2, "#bccde1");

    // agua
    const inner = BOTTOM - TOP; // filas útiles
    const filled = Math.round((level / 100) * inner);
    const surface = BOTTOM - filled;
    for (let row = surface; row < BOTTOM; row++) {
      const depth = (row - surface) / Math.max(1, inner);
      for (let col = L + 1; col < R; col++) {
        const b = BAYER4[((row & 3) << 2) | (col & 3)];
        if (row === surface && b > 0.55) continue; // superficie con textura
        tile(col, row, depth * 1.6 + 0.15 > b ? "#2a5ba6" : "#8db4de");
      }
    }

    // pulso del sensor hasta la superficie
    t.fillStyle = "#56687e";
    for (let row = 4; row < surface; row += 1) {
      if (row % 2) continue;
      t.fillRect(10.5 * C - 1, row * C + C / 2 - 1, 2, 2);
      t.fillRect(11.5 * C - 1, (row + 1) * C + C / 2 - 1, 2, 2);
    }
  }

  if (tankCanvas && tankRange) {
    tankRange.addEventListener("input", () => { updateTankReadout(); drawTank(); });
    drawTank();
  }

  /* ------------------------------------------------------------
     Arranque del idioma (al final, cuando todo está listo)
     ------------------------------------------------------------ */

  const initial = storedLang() ||
    ((navigator.language || "es").toLowerCase().startsWith("es") ? "es" : "en");
  setLang(initial);
})();
