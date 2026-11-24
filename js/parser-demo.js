/* Demo del Validador UML: el analizador LALR(1) paso a paso.
   Los pasos salen de la traza real (`validador_uml revisar ... --traza`)
   sobre la línea `Socio --|> Persona` de un diagrama de clases. */
(() => {
  "use strict";

  const root = document.querySelector(".parser");
  if (!root) return;

  const RULES = {
    r2: "Lineas → Lineas Linea",
    r4: "Linea → Sent NL",
    r6: "Linea → error NL",
    r9: "Sent → Relacion",
    r58: "Relacion → NOMBRE MultOpt FLECHA MultOpt NOMBRE EtiqOpt",
    r60: "MultOpt → ε",
    r62: "EtiqOpt → ε"
  };

  const EXAMPLES = {
    ok: {
      input: [["NOMBRE", "Socio"], ["FLECHA", "--|>"], ["NOMBRE", "Persona"], ["NL", "⏎"]],
      steps: [
        { a: "shift" },
        { a: "reduce", r: "r60", lhs: "MultOpt", n: 0 },
        { a: "shift" },
        { a: "reduce", r: "r60", lhs: "MultOpt", n: 0 },
        { a: "shift" },
        { a: "reduce", r: "r62", lhs: "EtiqOpt", n: 0 },
        { a: "reduce", r: "r58", lhs: "Relacion", n: 6 },
        { a: "reduce", r: "r9", lhs: "Sent", n: 1 },
        { a: "shift" },
        { a: "reduce", r: "r4", lhs: "Linea", n: 2 },
        { a: "reduce", r: "r2", lhs: "Lineas", n: 2 },
        { a: "accept" }
      ]
    },
    err: {
      input: [["NOMBRE", "Socio"], ["FLECHA", "--|>"], ["NL", "⏎"]],
      steps: [
        { a: "shift" },
        { a: "reduce", r: "r60", lhs: "MultOpt", n: 0 },
        { a: "shift" },
        { a: "error" },
        { a: "recover" },
        { a: "shift" },
        { a: "reduce", r: "r6", lhs: "Linea", n: 2 },
        { a: "reduce", r: "r2", lhs: "Lineas", n: 2 },
        { a: "done" }
      ]
    }
  };

  const TEXT = {
    es: {
      start: "Paso 0. La pila ya tiene las líneas anteriores del diagrama.",
      step: (i, n) => `Paso ${i} de ${n}.`,
      shift: (t, v) => `Desplazar: ${t} «${v}» pasa de la entrada a la pila.`,
      reduce: (r, rule) => `Reducir con ${r}: ${rule}.`,
      accept: "La línea es válida y queda dentro de Lineas.",
      error: "Error S01: la línea termina antes de lo esperado. Se esperaba un nombre o un texto entre comillas.",
      recover: "Recuperar: descarta lo leído de la línea y apila el símbolo error para seguir analizando.",
      done: "El análisis sigue con el resto del diagrama y el error queda informado con su línea y columna."
    },
    en: {
      start: "Step 0. The stack already holds the diagram's previous lines.",
      step: (i, n) => `Step ${i} of ${n}.`,
      shift: (t, v) => `Shift: ${t} “${v}” moves from the input to the stack.`,
      reduce: (r, rule) => `Reduce with ${r}: ${rule}.`,
      accept: "The line is valid and becomes part of Lineas.",
      error: "Error S01: the line ends too early. A name or a quoted text was expected.",
      recover: "Recover: drop what was read on this line and push the error symbol to keep parsing.",
      done: "Parsing goes on with the rest of the diagram, and the error is reported with its line and column."
    }
  };

  // Simula los pasos y guarda una foto del estado después de cada uno
  function snapshots(ex) {
    let stack = [{ sym: "Lineas", kind: "n" }];
    let pos = 0;
    const out = [{ stack: stack.slice(), pos, step: null, fresh: -1, bad: -1 }];
    for (const s of ex.steps) {
      let fresh = -1, bad = -1;
      if (s.a === "shift") {
        const [t, v] = ex.input[pos++];
        stack.push({ sym: t, val: v, kind: "t" });
        fresh = stack.length - 1;
      } else if (s.a === "reduce") {
        const kids = stack.splice(stack.length - s.n, s.n);
        stack.push({ sym: s.lhs, kind: s.n === 0 ? "eps" : "n", from: kids.length });
        fresh = stack.length - 1;
      } else if (s.a === "error") {
        bad = pos;
      } else if (s.a === "recover") {
        stack = [{ sym: "Lineas", kind: "n" }, { sym: "error", kind: "err" }];
        fresh = 1;
      }
      out.push({ stack: stack.slice(), pos, step: s, fresh, bad });
    }
    return out;
  }

  const els = {
    source: root.querySelector(".parser-source"),
    stack: root.querySelector('[data-parser="stack"]'),
    input: root.querySelector('[data-parser="input"]'),
    action: root.querySelector(".parser-action"),
    prev: root.querySelector('[data-parser="prev"]'),
    next: root.querySelector('[data-parser="next"]'),
    reset: root.querySelector('[data-parser="reset"]'),
    examples: root.querySelectorAll("[data-parser-example]")
  };

  let current = "ok";
  let states = snapshots(EXAMPLES.ok);
  let i = 0;

  const lang = () => (document.documentElement.lang === "en" ? "en" : "es");

  function tile(item, opts = {}) {
    const li = document.createElement("li");
    li.className = `tile tile-${item.kind}` + (opts.fresh ? " is-new" : "") + (opts.bad ? " is-bad" : "");
    const sym = document.createElement("span");
    sym.className = "tile-sym";
    sym.textContent = item.sym;
    li.append(sym);
    if (item.val || item.kind === "eps") {
      const val = document.createElement("span");
      val.className = "tile-val";
      val.textContent = item.kind === "eps" ? "ε" : item.val;
      li.append(val);
    }
    return li;
  }

  function render(announce) {
    const ex = EXAMPLES[current];
    const st = states[i];
    const T = TEXT[lang()];

    els.source.replaceChildren(...ex.input.filter(([t]) => t !== "NL").map(([, v], k) => {
      const span = document.createElement("span");
      span.textContent = v;
      if (k < st.pos) span.className = "is-read";
      if (k === st.bad) span.className = "is-bad";
      return span;
    }));

    els.stack.replaceChildren(...st.stack.map((it, k) => tile(it, { fresh: k === st.fresh })));
    const rest = ex.input.slice(st.pos).map(([t, v]) => ({ sym: t, val: v, kind: "t" }));
    rest.push({ sym: "$", kind: "end" });
    els.input.replaceChildren(...rest.map((it, k) => tile(it, { bad: st.bad >= 0 && k === 0 })));

    let msg = T.start;
    const s = st.step;
    if (s) {
      const head = T.step(i, states.length - 1) + " ";
      if (s.a === "shift") {
        const it = st.stack[st.stack.length - 1];
        msg = head + T.shift(it.sym, it.val);
      } else if (s.a === "reduce") {
        msg = head + T.reduce(s.r, RULES[s.r]);
      } else {
        msg = head + T[s.a];
      }
    }
    els.action.textContent = msg;
    els.action.classList.toggle("is-final", !!s && (s.a === "accept" || s.a === "done"));
    els.action.classList.toggle("is-error", !!s && s.a === "error");

    els.prev.disabled = i === 0;
    els.next.disabled = i === states.length - 1;
    if (!announce) els.action.removeAttribute("aria-live");
    else els.action.setAttribute("aria-live", "polite");
  }

  function choose(name) {
    current = name;
    states = snapshots(EXAMPLES[name]);
    i = 0;
    els.examples.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.parserExample === name)));
    render(true);
  }

  els.next.addEventListener("click", () => {
    if (i < states.length - 1) { i++; render(true); }
    if (els.next.disabled) els.reset.focus(); // al terminar, el foco no se pierde
  });
  els.prev.addEventListener("click", () => { if (i > 0) { i--; render(true); } });
  els.reset.addEventListener("click", () => { i = 0; render(true); els.next.focus(); });
  els.examples.forEach((b) => b.addEventListener("click", () => choose(b.dataset.parserExample)));
  window.addEventListener("langchange", () => render(false));

  render(false);
})();
