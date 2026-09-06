(function (global) {
  "use strict";

  const STORAGE_KEY = "cq-pedia-pinyin-scheme-v1";
  const DEFAULT_SCHEME = "sichuan";
  const SCHEMES = new Set(["numbers", "sichuan", "ipa"]);
  const DISPLAY_SELECTOR = [
    "[data-pinyin-display]",
    ".pinyin",
    ".example-pinyin",
    ".topic-entry-pinyin",
    ".phonetic-reading-value",
    ".phonetic-reading-pinyin",
    ".definition-text",
    ".example-translation",
    ".note p",
    ".phonetic-description",
    ".phonetic-note"
  ].join(",");
  const PINYIN_TOKEN = /[A-Za-züæəê]+[1-4](?:-[1-4])?/gu;
  const TONE_MARKS = Object.freeze({
    1: "\u0304",
    2: "\u0302",
    3: "\u0300",
    4: "\u0301"
  });
  const IPA_TONES = Object.freeze({
    1: "⁴⁵",
    2: "²¹",
    3: "⁴²",
    4: "²¹³"
  });
  const INITIAL_IPA = Object.freeze({
    b: "p", p: "pʰ", m: "m", f: "f", v: "v",
    d: "t", t: "tʰ", n: "n", l: "l",
    g: "k", k: "kʰ", ng: "ŋ", h: "x",
    j: "tɕ", q: "tɕʰ", x: "ɕ",
    z: "ts", c: "tsʰ", s: "s", r: "z"
  });
  const FINAL_IPA = Object.freeze({
    a: "a", ia: "ia", ua: "ua",
    o: "o", uo: "uo", io: "ɥo",
    i: "i", u: "ʋ", "ü": "y", "üu": "ɥu",
    e: "e", ie: "ie", ue: "ue", "üe": "ye",
    ai: "aɪ", iai: "iaɪ", uai: "uaɪ",
    ei: "eɪ", ui: "ueɪ",
    ao: "au", iao: "iau",
    ou: "əu", iu: "iəu",
    an: "an", ian: "iɛn", uan: "uan", "üan": "yɛn",
    en: "ən", in: "in", ing: "iŋ", un: "uən", "ün": "yn",
    ang: "ɑŋ", iang: "iɑŋ", uang: "uɑŋ",
    ong: "oŋ", iong: "ɥoŋ",
    er: "ɚɭ", ar: "aɚɭ", ir: "iɚɭ", iar: "iaɚɭ",
    ur: "uɚɭ", uar: "uaɚɭ", "ür": "yɚɭ", "üar": "yaɚɭ",
    ianr: "iɛɚɭ",
    "æ": "æ", "iæ": "iæ", "ə": "ə", "ê": "ɛ",
    m: "m̩", n: "n̩", ng: "ŋ̍"
  });

  let activeScheme = readScheme();
  let returnFocus = null;
  let observer = null;
  let rawDocumentTitle = "";
  const rawTextNodes = new WeakMap();

  function readScheme() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return SCHEMES.has(stored) ? stored : DEFAULT_SCHEME;
    } catch (_) {
      return DEFAULT_SCHEME;
    }
  }

  function writeScheme(scheme) {
    try {
      localStorage.setItem(STORAGE_KEY, scheme);
    } catch (_) {
      // The preference still applies to the current page when storage is unavailable.
    }
  }

  function splitTone(token) {
    const match = String(token || "").match(/^([A-Za-züæəê]+)([1-4])(?:-([1-4]))?$/u);
    if (!match) return null;
    return {
      base: match[1].toLowerCase(),
      originalTone: Number(match[2]),
      actualTone: Number(match[3] || match[2])
    };
  }

  function toneMarkIndex(base) {
    const umlautDoubleU = base.indexOf("üu");
    if (umlautDoubleU >= 0) return umlautDoubleU + 1;
    const doubleU = base.indexOf("uu");
    if (doubleU >= 0) return doubleU + 1;
    const ash = base.indexOf("æ");
    if (ash >= 0) return ash;
    const schwa = base.indexOf("ə");
    if (schwa >= 0) return schwa;
    const a = base.indexOf("a");
    if (a >= 0) return a;
    const o = base.indexOf("o");
    if (o >= 0) return o;
    const e = base.indexOf("e");
    if (e >= 0) return e;
    if (base.includes("iu") || base.includes("ui")) {
      return Math.max(base.lastIndexOf("i"), base.lastIndexOf("u"));
    }
    for (const vowel of ["i", "u", "ü"]) {
      const index = base.indexOf(vowel);
      if (index >= 0) return index;
    }
    if (base.endsWith("ng")) return base.length - 2;
    if (base.endsWith("m") || base.endsWith("n")) return base.length - 1;
    return -1;
  }

  function sichuanSyllable(token) {
    const parts = splitTone(token);
    if (!parts) return token;
    const index = toneMarkIndex(parts.base);
    if (index < 0) return parts.base;
    return `${parts.base.slice(0, index + 1)}${TONE_MARKS[parts.actualTone]}${parts.base.slice(index + 1)}`.normalize("NFC");
  }

  function zeroInitialFinal(base) {
    const forms = {
      yi: "i", ya: "ia", yai: "iai", yao: "iao", ye: "ie",
      yan: "ian", yang: "iang", yin: "in", ying: "ing",
      yo: "io", yong: "iong", you: "iu", "yæ": "iæ",
      yu: "ü", yue: "üe", yuan: "üan", yun: "ün", yuu: "üu",
      yir: "ir", yur: "ür", yuar: "üar", yar: "iar", yanr: "ianr",
      wu: "u", wa: "ua", wai: "uai", wan: "uan", wang: "uang",
      wei: "ui", wen: "un", wo: "uo", wong: "ong",
      wer: "ur", war: "uar"
    };
    return forms[base] || null;
  }

  function parseIpaParts(base) {
    const zeroFinal = zeroInitialFinal(base);
    if (zeroFinal) return { initial: "", final: zeroFinal };
    if (["m", "n", "ng"].includes(base)) return { initial: "", final: base };

    const initial = ["ng", "b", "p", "m", "f", "v", "d", "t", "n", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "r"]
      .find((candidate) => base.startsWith(candidate)) || "";
    let final = base.slice(initial.length);

    if (["j", "q", "x"].includes(initial)) {
      const rounded = {
        u: "ü", ue: "üe", uan: "üan", un: "ün",
        uu: "üu", ur: "ür", uar: "üar"
      };
      final = rounded[final] || final;
    }
    return { initial, final };
  }

  function ipaSyllable(token) {
    const parts = splitTone(token);
    if (!parts) return token;
    const parsed = parseIpaParts(parts.base);
    const initial = INITIAL_IPA[parsed.initial] || "";
    let final = FINAL_IPA[parsed.final];
    if (parsed.final === "i" && ["z", "c", "s", "r"].includes(parsed.initial)) final = "ɿ";
    if (!final) final = parsed.final;
    return `${initial}${final}${IPA_TONES[parts.actualTone]}`;
  }

  function format(value, scheme = activeScheme) {
    const source = String(value ?? "");
    if (scheme === "numbers") return source;
    const converter = scheme === "ipa" ? ipaSyllable : sichuanSyllable;
    return source.replace(PINYIN_TOKEN, converter);
  }

  function displayNodes(root) {
    if (!root) return [];
    const nodes = [];
    if (root.nodeType === 1 && root.matches(DISPLAY_SELECTOR)) nodes.push(root);
    if (root.querySelectorAll) nodes.push(...root.querySelectorAll(DISPLAY_SELECTOR));
    return nodes;
  }

  function refresh(root = document) {
    displayNodes(root).forEach((node) => {
      if (!node.childElementCount) {
        if (!node.dataset.rawPinyin) node.dataset.rawPinyin = node.textContent.trim();
        const rendered = format(node.dataset.rawPinyin);
        if (node.textContent !== rendered) node.textContent = rendered;
        return;
      }

      const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let textNode = walker.nextNode();
      while (textNode) {
        if (!rawTextNodes.has(textNode)) rawTextNodes.set(textNode, textNode.nodeValue);
        const rendered = format(rawTextNodes.get(textNode));
        if (textNode.nodeValue !== rendered) textNode.nodeValue = rendered;
        textNode = walker.nextNode();
      }
    });
    document.documentElement.dataset.pinyinScheme = activeScheme;
    if (rawDocumentTitle) document.title = format(rawDocumentTitle);
  }

  function closeMoreMenu() {
    const menu = document.querySelector("#moreMenu");
    const trigger = document.querySelector("#moreBtn");
    if (menu) menu.hidden = true;
    trigger?.setAttribute("aria-expanded", "false");
    document.querySelector(".more-menu")?.classList.remove("open");
    document.body.classList.remove("topic-menu-open");
  }

  function settingsMarkup() {
    return `
      <div class="modal pinyin-settings-modal" id="pinyinSettingsModal" role="dialog" aria-modal="true" aria-labelledby="pinyinSettingsTitle" hidden>
        <div class="modal-backdrop" data-pinyin-settings-close></div>
        <section class="modal-window pinyin-settings-window" role="document" tabindex="-1">
          <header class="modal-head">
            <h2 id="pinyinSettingsTitle">设置</h2>
            <button type="button" class="modal-close" data-pinyin-settings-close aria-label="关闭设置">
              <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 6l12 12"></path><path d="M18 6 6 18"></path></svg>
            </button>
          </header>
          <form class="pinyin-settings-form" id="pinyinSettingsForm">
            <fieldset>
              <legend>偏好的拼音方案</legend>
              <label class="pinyin-scheme-option">
                <input type="radio" name="pinyinScheme" value="numbers">
                <span class="pinyin-scheme-copy"><strong>数字标调拼音方案</strong><small>拼音加调类；保留原调及变调，如 ma1、tou2-1</small></span>
                <span class="pinyin-scheme-preview" aria-hidden="true">妈 ma1 麻 ma2 马 ma3 骂 ma4</span>
              </label>
              <label class="pinyin-scheme-option">
                <input type="radio" name="pinyinScheme" value="sichuan">
                <span class="pinyin-scheme-copy"><strong>符号标调拼音方案</strong><small>在韵母或特殊音节上标实际声调</small></span>
                <span class="pinyin-scheme-preview" aria-hidden="true">妈 mā　麻 mâ　马 mà　骂 má</span>
              </label>
              <label class="pinyin-scheme-option">
                <input type="radio" name="pinyinScheme" value="ipa">
                <span class="pinyin-scheme-copy"><strong>国际音标方案</strong><small>按重庆话音系显示实际调值：45、21、42、213</small></span>
                <span class="pinyin-scheme-preview pinyin-scheme-preview-ipa" aria-hidden="true">妈 ma⁴⁵　麻 ma²¹　马 ma⁴²　骂 ma²¹³</span>
              </label>
            </fieldset>
            <div class="pinyin-settings-actions">
              <button type="submit">保存设置</button>
            </div>
          </form>
        </section>
      </div>`;
  }

  function mountSettings() {
    const menuList = document.querySelector("#moreMenu .topic-menu-list");
    if (menuList && !menuList.querySelector("[data-open-pinyin-settings]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("role", "menuitem");
      button.setAttribute("data-open-pinyin-settings", "");
      button.innerHTML = '<span class="topic-menu-title">⚙️ 设置</span><span class="topic-menu-arrow" aria-hidden="true">→</span>';
      const themeButton = menuList.querySelector("[data-theme-toggle]");
      menuList.insertBefore(button, themeButton || null);
    }

    if (!document.querySelector("#pinyinSettingsModal")) {
      document.body.insertAdjacentHTML("beforeend", settingsMarkup());
    }
  }

  function openSettings(trigger) {
    const modal = document.querySelector("#pinyinSettingsModal");
    if (!modal) return;
    returnFocus = trigger?.closest("#moreMenu")
      ? document.querySelector("#moreBtn")
      : trigger || document.activeElement;
    closeMoreMenu();
    const input = modal.querySelector(`input[value="${activeScheme}"]`);
    if (input) input.checked = true;
    modal.hidden = false;
    document.body.classList.add("modal-open");
    modal.querySelector(".pinyin-settings-window")?.focus();
  }

  function closeSettings() {
    const modal = document.querySelector("#pinyinSettingsModal");
    if (!modal || modal.hidden) return;
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    const target = returnFocus?.isConnected ? returnFocus : document.querySelector("#moreBtn");
    returnFocus = null;
    target?.focus();
  }

  function setScheme(scheme, persist = true) {
    if (!SCHEMES.has(scheme)) return;
    activeScheme = scheme;
    if (persist) writeScheme(scheme);
    refresh(document);
    document.dispatchEvent(new CustomEvent("cq-pinyin-scheme-change", { detail: { scheme } }));
  }

  function bindSettings() {
    document.addEventListener("click", (event) => {
      const openButton = event.target.closest("[data-open-pinyin-settings]");
      if (openButton) {
        event.preventDefault();
        openSettings(openButton);
        return;
      }
      if (event.target.closest("[data-pinyin-settings-close]")) closeSettings();
    });

    document.querySelector("#pinyinSettingsForm")?.addEventListener("submit", (event) => {
      event.preventDefault();
      const selected = new FormData(event.currentTarget).get("pinyinScheme");
      setScheme(String(selected || DEFAULT_SCHEME));
      closeSettings();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !document.querySelector("#pinyinSettingsModal")?.hidden) {
        event.preventDefault();
        closeSettings();
      }
    });
  }

  function init() {
    rawDocumentTitle = document.title;
    mountSettings();
    bindSettings();
    refresh(document);
    observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === 1) refresh(node);
      }));
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  const api = Object.freeze({
    format,
    refresh,
    setScheme,
    getScheme: () => activeScheme,
    toSichuan: (value) => format(value, "sichuan"),
    toIpa: (value) => format(value, "ipa")
  });
  global.PinyinDisplay = api;

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
    else init();
  }
}(typeof window !== "undefined" ? window : globalThis));
