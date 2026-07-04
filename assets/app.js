"use strict";

// Sopalavrinha — geração de frases-senha, 100% no navegador.
// Nada é persistido: o histórico vive apenas em memória durante a sessão.

(function () {
  const WORDS = window.WORDLIST || [];
  const BITS_PER_WORD = Math.log2(WORDS.length);
  const DIGIT_BITS = Math.log2(10);

  // --- Aleatoriedade segura -------------------------------------------------
  // Índice uniforme em [0, max) usando crypto.getRandomValues + rejeição,
  // evitando o viés de módulo do `% max`.
  function randomIndex(max) {
    if (max <= 0) throw new Error("max must be > 0");
    const limit = Math.floor(0xffffffff / max) * max; // maior múltiplo de max
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }

  function randomWord() {
    return WORDS[randomIndex(WORDS.length)];
  }

  // --- Transformações -------------------------------------------------------
  function stripAccents(s) {
    return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  }

  function applyCapitalization(word, mode) {
    switch (mode) {
      case "upper":
        return word.toUpperCase();
      case "each":
        return word.charAt(0).toUpperCase() + word.slice(1);
      default:
        return word;
    }
  }

  // --- Geração --------------------------------------------------------------
  // Retorna as partes da frase-senha para permitir renderização colorida,
  // além da string final pronta para copiar. O número (opcional) fica colado
  // à última palavra, sem separador.
  function build(opts) {
    const words = [];
    for (let i = 0; i < opts.count; i++) {
      let w = randomWord();
      if (opts.stripAccents) w = stripAccents(w);
      w = applyCapitalization(w, opts.capitalization);
      words.push(w);
    }
    const digit = opts.addDigit ? String(randomIndex(10)) : null;
    const phrase = words.join(opts.separator) + (digit !== null ? digit : "");
    return { words, separator: opts.separator, digit, phrase };
  }

  // Monta a frase-senha num elemento usando spans coloridos por tipo.
  function renderPhrase(el, parts) {
    el.textContent = "";
    parts.words.forEach((w, i) => {
      if (i > 0 && parts.separator !== "") {
        const sep = document.createElement("span");
        sep.className = "pp-sep" + (parts.separator === " " ? " pp-sep-space" : "");
        sep.textContent = parts.separator;
        el.appendChild(sep);
      }
      const word = document.createElement("span");
      word.className = "pp-word";
      word.textContent = w;
      el.appendChild(word);
    });
    if (parts.digit !== null) {
      const d = document.createElement("span");
      d.className = "pp-digit";
      d.textContent = parts.digit;
      el.appendChild(d);
    }
  }

  function entropyBits(opts) {
    let bits = opts.count * BITS_PER_WORD;
    if (opts.addDigit) bits += DIGIT_BITS;
    return bits;
  }

  function strengthLabel(bits) {
    if (bits < 50) return { text: "fraca", cls: "s-weak" };
    if (bits < 70) return { text: "boa", cls: "s-ok" };
    if (bits < 100) return { text: "forte", cls: "s-strong" };
    return { text: "excelente", cls: "s-excellent" };
  }

  // --- Tema -----------------------------------------------------------------
  (function () {
    const html = document.documentElement;
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    const ICONS = { light: "☀️", dark: "🌙", system: "🖥️" };
    const systemQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function effectiveTheme(state) {
      if (state === "dark" || state === "light") return state;
      return systemQuery.matches ? "dark" : "light";
    }

    function applyTheme(state) {
      html.setAttribute("data-theme", effectiveTheme(state));
      if (state === "system") {
        localStorage.removeItem("theme");
      } else {
        localStorage.setItem("theme", state);
      }
      const next = state === "light" ? "dark" : state === "dark" ? "system" : "light";
      btn.textContent = ICONS[next];
      btn.title = next === "light" ? "Modo claro" : next === "dark" ? "Modo escuro" : "Seguir sistema";
    }

    function currentState() {
      const stored = localStorage.getItem("theme");
      return stored === "dark" || stored === "light" ? stored : "system";
    }

    applyTheme(currentState());

    btn.addEventListener("click", () => {
      const state = currentState();
      applyTheme(state === "light" ? "dark" : state === "dark" ? "system" : "light");
    });

    systemQuery.addEventListener("change", () => {
      if (currentState() === "system") applyTheme("system");
    });
  })();

  // --- DOM ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  const els = {
    passphrase: $("passphrase"),
    entropy: $("entropy"),
    copyBtn: $("copy-btn"),
    generateBtn: $("generate-btn"),
    words: $("words"),
    wordsValue: $("words-value"),
    separator: $("separator"),
    capitalization: $("capitalization"),
    addDigit: $("add-digit"),
    stripAccents: $("strip-accents"),
    historyList: $("history-list"),
    historyEmpty: $("history-empty"),
    clearHistory: $("clear-history"),
  };

  const history = []; // apenas em memória
  let current = null;

  function readOptions() {
    return {
      count: parseInt(els.words.value, 10),
      separator: els.separator.value,
      capitalization: els.capitalization.value,
      addDigit: els.addDigit.checked,
      stripAccents: els.stripAccents.checked,
    };
  }

  function updateEntropyPreview() {
    const opts = readOptions();
    const bits = entropyBits(opts);
    const s = strengthLabel(bits);
    els.entropy.textContent = `≈ ${bits.toFixed(0)} bits · ${s.text}`;
    els.entropy.className = `entropy ${s.cls}`;
  }

  async function copyText(text, btn) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // Fallback para navegadores sem Clipboard API / contexto não-seguro.
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    }
    if (btn) {
      const original = btn.textContent;
      btn.textContent = "Copiado!";
      btn.disabled = true;
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 1200);
    }
  }

  function renderHistory() {
    els.historyList.innerHTML = "";
    els.historyEmpty.hidden = history.length > 0;
    els.clearHistory.disabled = history.length === 0;

    for (const entry of history) {
      const li = document.createElement("li");

      const code = document.createElement("code");
      code.className = "history-phrase";
      renderPhrase(code, entry.parts);

      const meta = document.createElement("small");
      meta.className = `entropy ${entry.strength.cls}`;
      meta.textContent = `${entry.bits.toFixed(0)} bits`;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "secondary outline history-copy";
      btn.textContent = "Copiar";
      btn.addEventListener("click", () => copyText(entry.phrase, btn));

      li.appendChild(code);
      li.appendChild(meta);
      li.appendChild(btn);
      els.historyList.appendChild(li);
    }
  }

  // recordHistory=false → apenas atualiza o exemplo mostrado (carga inicial e
  // mudanças de configuração), sem poluir o histórico. O botão "Gerar" grava.
  function onGenerate(recordHistory = true) {
    if (WORDS.length === 0) {
      els.passphrase.textContent = "Erro: dicionário não carregado.";
      return;
    }
    const opts = readOptions();
    const parts = build(opts);
    const bits = entropyBits(opts);
    const strength = strengthLabel(bits);

    current = parts.phrase;
    renderPhrase(els.passphrase, parts);
    els.copyBtn.disabled = false;
    updateEntropyPreview();

    if (recordHistory) {
      history.unshift({ parts, phrase: parts.phrase, bits, strength });
      if (history.length > 50) history.pop();
      renderHistory();
    }
  }

  // --- Eventos --------------------------------------------------------------
  // Ao arrastar o controle, só atualiza rótulo/entropia (barato); ao soltar,
  // gera um novo exemplo. Demais controles geram na mudança.
  els.words.addEventListener("input", () => {
    els.wordsValue.textContent = els.words.value;
    updateEntropyPreview();
  });
  els.words.addEventListener("change", () => onGenerate(false));
  [els.separator, els.capitalization, els.addDigit, els.stripAccents].forEach((el) =>
    el.addEventListener("change", () => onGenerate(false))
  );
  els.generateBtn.addEventListener("click", () => onGenerate(true));
  els.copyBtn.addEventListener("click", () => { if (current) copyText(current, els.copyBtn); });
  els.clearHistory.addEventListener("click", () => {
    history.length = 0;
    renderHistory();
  });

  // Estado inicial: já mostra um exemplo pronto (sem gravar no histórico).
  renderHistory();
  onGenerate(false);
})();
