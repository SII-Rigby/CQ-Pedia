const state = {
  entries: [],
  mode: "idle",
  query: "",
  initial: "",
  wordClass: ""
};

const INITIALS = ["b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "ng", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w", "other"];
const INITIAL_MATCH_ORDER = ["ng", "yu", "b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w"];
const OTHER_INITIAL = "other";
const WELCOME_ENTRY_COUNT = 10;

const els = {
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#searchInput"),
  resultsPanel: document.querySelector("#resultsPanel"),
  results: document.querySelector("#results"),
  count: document.querySelector("#resultCount"),
  label: document.querySelector("#resultLabel")
};

const indexEls = {
  btn: document.querySelector("#indexBtn"),
  modal: document.querySelector("#indexModal"),
  grid: document.querySelector("#initialGrid"),
  tabs: document.querySelectorAll("[data-index-type]")
};

const aboutEls = {
  btn: document.querySelector("#aboutBtn"),
  modal: document.querySelector("#aboutModal")
};

const feedbackEls = {
  btn: document.querySelector("#feedbackBtn"),
  modal: document.querySelector("#feedbackModal"),
  tabs: document.querySelectorAll("[data-feedback-tab]"),
  panels: document.querySelectorAll("[data-feedback-panel]"),
  issueForm: document.querySelector("#issueFeedbackForm"),
  entryForm: document.querySelector("#entryContributionForm"),
  status: document.querySelector("#feedbackStatus")
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
const plainMarkedText = (value) => String(value || "").replace(/_/g, "");
const renderMarkedText = (value) => escapeHtml(value)
  .replace(/_儿/g, '<span class="erhua" aria-label="儿">儿</span>');

function todaysSeedKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function hashSeed(value) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed || 1;

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyEntries(entries, count) {
  const random = seededRandom(hashSeed(`daily-entries:${todaysSeedKey()}`));
  const shuffled = entries.slice();

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled.slice(0, count);
}

function wordClassOf(entry) {
  return entry.wordClass || "";
}

function wordClassesOf(entry) {
  return wordClassOf(entry)
    .split(/[；;、,，/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function variantsOf(entry) {
  if (Array.isArray(entry.variants)) {
    return entry.variants;
  }

  return splitList(entry.variants);
}

function entryText(entry) {
  const definitions = (entry.definitions || []).map((item) => plainMarkedText(item.text)).join(" ");
  const definitionNotes = (entry.definitions || []).map((item) => plainMarkedText(item.note)).join(" ");
  const variants = variantsOf(entry);
  const notes = [entry.note, entry.notes].filter(Boolean).map(plainMarkedText).join(" ");

  return [
    plainMarkedText(entry.headword),
    entry.pinyin,
    wordClassOf(entry),
    definitions,
    definitionNotes,
    notes,
    ...variants.map(plainMarkedText)
  ].join(" ");
}

function firstSyllable(pinyin) {
  return normalize(pinyin).split(/\s+/)[0]?.replace(/[0-9].*$/, "") || "";
}

function initialOf(entry) {
  const syllable = firstSyllable(entry.pinyin);
  const matched = INITIAL_MATCH_ORDER.find((initial) => syllable.startsWith(initial));

  if (matched === "yu") {
    return "y";
  }

  if (!matched && /^[aoe]/.test(syllable)) {
    return OTHER_INITIAL;
  }

  return matched || OTHER_INITIAL;
}

function initialLabel(initial) {
  return initial === OTHER_INITIAL ? "其他" : initial;
}

function matchesSearch(entry) {
  const query = normalize(state.query);
  return query ? normalize(entryText(entry)).includes(query) : false;
}

function matchesInitial(entry) {
  return state.initial ? initialOf(entry) === state.initial : false;
}

function matchesWordClass(entry) {
  return state.wordClass ? wordClassesOf(entry).includes(state.wordClass) : false;
}

function filteredEntries() {
  if (state.mode === "idle") {
    return dailyEntries(state.entries, WELCOME_ENTRY_COUNT);
  }

  if (state.mode === "search") {
    return state.entries.filter(matchesSearch);
  }

  if (state.mode === "initial") {
    return state.entries.filter(matchesInitial);
  }

  if (state.mode === "wordClass") {
    return state.entries.filter(matchesWordClass);
  }

  return [];
}

function hasExampleContent(example) {
  return Boolean(example && [example.text, example.pinyin, example.translation].some((value) => String(value || "").trim()));
}

function renderExample(example) {
  if (!hasExampleContent(example)) {
    return "";
  }

  const pinyin = example.pinyin ? `<p class="example-pinyin">${escapeHtml(example.pinyin)}</p>` : "";
  const translation = example.translation ? `<p class="example-translation">${renderMarkedText(example.translation)}</p>` : "";

  return `
    <div class="example">
      <strong>例：</strong>${renderMarkedText(example.text)}
      ${pinyin}
      ${translation}
    </div>
  `;
}

function renderNote(note, modifier = "") {
  if (!String(note || "").trim()) {
    return "";
  }

  const className = modifier ? `note ${modifier}` : "note";

  return `
    <aside class="${className}">
      <span>注</span>
      <p>${renderMarkedText(note)}</p>
    </aside>
  `;
}

function renderFigure(entry) {
  if (!entry.fig) {
    return "";
  }

  const imageSrc = entry.fig === true
    ? `data/fig/${encodeURIComponent(entry.id)}.png`
    : String(entry.fig);
  const alt = `${plainMarkedText(entry.headword || entry.id)} 插图`;

  return `
    <figure class="entry-figure">
      <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(alt)}" loading="lazy">
    </figure>
  `;
}

function renderEntry(entry) {
  const definitions = entry.definitions || [];
  const examples = entry.examples || [];
  const definitionBlocks = definitions
    .map((item, index) => {
      const exampleHtml = renderExample(examples[index]);
      const noteHtml = renderNote(item.note, "definition-note");

      return `
        <section class="definition-block">
          <p class="definition-text"><span class="definition-number">${index + 1}.</span>${renderMarkedText(item.text)}</p>
          ${noteHtml}
          ${exampleHtml}
        </section>
      `;
    })
    .join("");
  const extraExamples = examples.length > definitions.length
    ? examples.slice(definitions.length)
      .map(renderExample)
      .filter(Boolean)
      .join("")
    : "";
  const definitionFallback = definitionBlocks || `
      <section class="definition-block">
        <p class="definition-text">暂无释义。</p>
      </section>
    `;
  const variants = variantsOf(entry);
  const variantsHtml = variants.length
    ? `<p class="variants">异体写法：${renderMarkedText(variants.join("、"))}</p>`
    : "";
  const note = renderNote(entry.note || entry.notes, "entry-note");
  const figure = renderFigure(entry);

  return `
    <article class="entry">
      <div class="entry-head">
        <h3>${renderMarkedText(entry.headword)}</h3>
        <span class="pos">${escapeHtml(wordClassOf(entry))}</span>
      </div>
      <p class="pinyin">${escapeHtml(entry.pinyin)}</p>
      ${variantsHtml}
      ${note}
      ${figure}
      <div class="definitions">${definitionFallback}</div>
      ${extraExamples}
    </article>
  `;
}

function render() {
  const filtered = filteredEntries();

  els.resultsPanel.hidden = false;
  els.count.textContent = `${filtered.length}`;

  if (state.mode === "initial") {
    els.label.textContent = `声母 ${initialLabel(state.initial)}`;
  } else if (state.mode === "wordClass") {
    els.label.textContent = `词性 ${state.wordClass}`;
  } else if (state.mode === "idle") {
    els.label.textContent = "每日十词";
  } else {
    els.label.textContent = `搜索：${state.query}`;
  }

  if (!filtered.length) {
    els.results.innerHTML = '<p class="empty">没有找到符合条件的词条。</p>';
    return;
  }

  els.results.innerHTML = filtered.map(renderEntry).join("");
}

function initialCounts() {
  return state.entries.reduce((acc, entry) => {
    const initial = initialOf(entry);
    acc[initial] = (acc[initial] || 0) + 1;
    return acc;
  }, {});
}

function buildInitialIndex() {
  const counts = initialCounts();
  indexEls.grid.classList.remove("word-class-grid");
  indexEls.grid.innerHTML = INITIALS
    .map((initial) => {
      const count = counts[initial] || 0;
      return `<button type="button" data-initial="${escapeHtml(initial)}">${escapeHtml(initialLabel(initial))}<small>${count} 词条</small></button>`;
    })
    .join("");
}

function wordClassCounts() {
  return state.entries.reduce((acc, entry) => {
    wordClassesOf(entry).forEach((wordClass) => {
      acc[wordClass] = (acc[wordClass] || 0) + 1;
    });
    return acc;
  }, {});
}

function buildWordClassIndex() {
  const counts = wordClassCounts();
  const wordClasses = Object.keys(counts).sort((a, b) => a.localeCompare(b, "zh-Hans"));
  indexEls.grid.classList.add("word-class-grid");
  indexEls.grid.innerHTML = wordClasses
    .map((wordClass) => `<button type="button" data-word-class="${escapeHtml(wordClass)}">${escapeHtml(wordClass)}<small>${counts[wordClass]} 词条</small></button>`)
    .join("");
}

function setIndexType(type) {
  indexEls.tabs.forEach((tab) => {
    const active = tab.dataset.indexType === type;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  if (type === "wordClass") {
    buildWordClassIndex();
  } else {
    buildInitialIndex();
  }
}

async function loadEntries() {
  try {
    const response = await fetch("data/entries.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.entries = payload.entries || [];
    buildInitialIndex();
    render();
  } catch (error) {
    state.mode = "search";
    els.resultsPanel.hidden = false;
    els.count.textContent = "载入失败";
    els.results.innerHTML = `
      <p class="empty">
        无法读取 data/entries.json。请通过本地服务器或部署后的网址访问此页面。
      </p>
    `;
    console.error(error);
  }
}

function syncSearch() {
  state.query = els.input.value.trim();
  state.mode = state.query ? "search" : "idle";
  state.initial = "";
  state.wordClass = "";
  render();
}

window.cqSearch = syncSearch;

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  syncSearch();
});

["input", "change", "search", "keyup", "compositionend"].forEach((eventName) => {
  els.input.addEventListener(eventName, syncSearch);
});

els.form.querySelector("button[type='submit']")?.addEventListener("click", syncSearch);

function openIndexModal() {
  setIndexType("initial");
  indexEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeIndexModal() {
  indexEls.modal.hidden = true;
  document.body.classList.remove("modal-open");
  indexEls.btn.focus();
}

indexEls.btn.addEventListener("click", openIndexModal);

indexEls.modal.addEventListener("click", (event) => {
  if (event.target.closest("[data-index-close]")) {
    closeIndexModal();
    return;
  }

  const tab = event.target.closest("button[data-index-type]");
  if (tab) {
    setIndexType(tab.dataset.indexType);
    return;
  }

  const initialButton = event.target.closest("button[data-initial]");
  const wordClassButton = event.target.closest("button[data-word-class]");
  if (!initialButton && !wordClassButton) {
    return;
  }

  state.mode = initialButton ? "initial" : "wordClass";
  state.initial = initialButton ? initialButton.dataset.initial : "";
  state.wordClass = wordClassButton ? wordClassButton.dataset.wordClass : "";
  state.query = "";
  els.input.value = "";
  closeIndexModal();
  render();
  document.querySelector("#resultsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

function openAboutModal() {
  aboutEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAboutModal() {
  aboutEls.modal.hidden = true;
  document.body.classList.remove("modal-open");
  aboutEls.btn?.focus();
}

if (aboutEls.btn && aboutEls.modal) {
  aboutEls.btn.addEventListener("click", openAboutModal);

  aboutEls.modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-about-close]")) {
      closeAboutModal();
    }
  });
}

/* ===== 反馈 Modal ===== */

function openFeedbackModal() {
  feedbackEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeFeedbackModal() {
  feedbackEls.modal.hidden = true;
  document.body.classList.remove("modal-open");
  feedbackEls.btn?.focus();
}

function finishFeedbackSubmit(form) {
  form.reset();
  closeFeedbackModal();
  syncSearch();
}

function setFeedbackTab(type) {
  feedbackEls.tabs.forEach((tab) => {
    const active = tab.dataset.feedbackTab === type;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });

  feedbackEls.panels.forEach((panel) => {
    const active = panel.dataset.feedbackPanel === type;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function splitLines(value) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitList(value) {
  return String(value || "")
    .split(/[；;、,，\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function compactObject(value) {
  if (Array.isArray(value)) {
    const next = value
      .map(compactObject)
      .filter((item) => item !== undefined);
    return next.length ? next : undefined;
  }

  if (value && typeof value === "object") {
    const next = {};
    Object.entries(value).forEach(([key, item]) => {
      const compacted = compactObject(item);
      if (compacted !== undefined) {
        next[key] = compacted;
      }
    });
    return Object.keys(next).length ? next : undefined;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  return value === null || value === undefined ? undefined : value;
}

function buildIssuePayload(form) {
  const data = new FormData(form);
  const types = data.getAll("issueType").map(String);

  return compactObject({
    type: "issueFeedback",
    recipient: "site-admin",
    createdAt: new Date().toISOString(),
    issue: {
      types,
      entryRef: data.get("entryRef"),
      message: data.get("message")
    },
    reporter: {
      contact: data.get("contact")
    }
  });
}

function buildEntryPayload(form) {
  const data = new FormData(form);
  const definitions = splitLines(data.get("definitions"))
    .map((text) => ({ text }));
  const exampleTexts = splitLines(data.get("examples"));
  const examplePinyin = splitLines(data.get("examplePinyin"));
  const exampleTranslations = splitLines(data.get("exampleTranslation"));
  const examples = exampleTexts.map((text, index) => compactObject({
    text,
    pinyin: examplePinyin[index],
    translation: exampleTranslations[index]
  }));

  return compactObject({
    type: "entryContribution",
    recipient: "site-admin",
    createdAt: new Date().toISOString(),
    entry: {
      id: "pending",
      headword: data.get("headword"),
      pinyin: data.get("pinyin"),
      variants: splitList(data.get("variants")),
      wordClass: data.get("wordClass"),
      definitions,
      examples,
      note: data.get("note")
    },
    contributor: {
      name: data.get("contributor"),
      contact: data.get("contact")
    }
  });
}

function submitFeedbackPayload(payload) {
  window.dispatchEvent(new CustomEvent("cq-feedback-submit", { detail: payload }));
  console.info("CQ-Pedia feedback payload", payload);
  if (feedbackEls.status) {
    feedbackEls.status.textContent = "已提交，感谢反馈。";
  }
}

if (feedbackEls.btn && feedbackEls.modal) {
  feedbackEls.btn.addEventListener("click", openFeedbackModal);

  feedbackEls.modal.addEventListener("click", (event) => {
    if (event.target.closest("[data-feedback-close]")) {
      closeFeedbackModal();
      return;
    }

    const tab = event.target.closest("button[data-feedback-tab]");
    if (tab) {
      setFeedbackTab(tab.dataset.feedbackTab);
    }
  });
}

if (feedbackEls.issueForm) {
  feedbackEls.issueForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitFeedbackPayload(buildIssuePayload(feedbackEls.issueForm));
    finishFeedbackSubmit(feedbackEls.issueForm);
  });
}

if (feedbackEls.entryForm) {
  feedbackEls.entryForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitFeedbackPayload(buildEntryPayload(feedbackEls.entryForm));
    finishFeedbackSubmit(feedbackEls.entryForm);
  });
}

loadEntries();

/* ===== 必读 Modal ===== */

const MUST_READ_DOCS = [
  { id: "phonology", title: "重庆方言音系介绍", file: "docs/phonology.md" },
  { id: "pinyin-scheme", title: "重庆话拼音方案", file: "docs/pinyin-scheme.md" },
  { id: "usage", title: "使用说明", file: "docs/usage.md" }
];

const modalEls = {
  btn: document.querySelector("#mustReadBtn"),
  modal: document.querySelector("#mustReadModal"),
  list: document.querySelector("#docList"),
  view: document.querySelector("#docView")
};

const docCache = new Map();
let activeDocId = null;

function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;

  const inline = (text) => {
    let s = escapeHtml(text);
    s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) =>
      `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
    return s;
  };

  const sanitizeTableHtml = (html) => {
    const template = document.createElement("template");
    template.innerHTML = html;
    const allowedTags = new Set(["TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD"]);
    const allowedAttrs = new Set(["colspan", "rowspan"]);

    template.content.querySelectorAll("*").forEach((node) => {
      if (!allowedTags.has(node.tagName)) {
        node.replaceWith(...node.childNodes);
        return;
      }

      [...node.attributes].forEach((attr) => {
        if (!allowedAttrs.has(attr.name.toLowerCase())) {
          node.removeAttribute(attr.name);
        }
      });
    });

    const table = template.content.querySelector("table");
    return table ? table.outerHTML : "";
  };

  const isTableSep = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line);
  const splitRow = (line) =>
    line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\s*<table\b/i.test(line)) {
      const buf = [];
      while (i < lines.length) {
        buf.push(lines[i]);
        if (/<\/table>\s*$/i.test(lines[i])) {
          i++;
          break;
        }
        i++;
      }
      const tableHtml = sanitizeTableHtml(buf.join("\n"));
      if (tableHtml) {
        out.push(tableHtml);
      }
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    const para = [line];
    i++;
    while (
      i < lines.length &&
      !/^\s*$/.test(lines[i]) &&
      !/^(#{1,6})\s+/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*+]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^\s*>\s?/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

function buildDocList() {
  modalEls.list.innerHTML = MUST_READ_DOCS
    .map(
      (doc) => `<li><button type="button" data-doc="${doc.id}">${escapeHtml(doc.title)}</button></li>`
    )
    .join("");

  modalEls.list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-doc]");
    if (!button) return;
    showDoc(button.dataset.doc);
  });
}

async function showDoc(id) {
  const doc = MUST_READ_DOCS.find((item) => item.id === id);
  if (!doc) return;

  activeDocId = id;
  modalEls.list.querySelectorAll("button[data-doc]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.doc === id);
  });

  if (docCache.has(id)) {
    modalEls.view.innerHTML = docCache.get(id);
    modalEls.view.scrollTop = 0;
    return;
  }

  modalEls.view.innerHTML = '<p class="empty">载入中...</p>';
  try {
    const response = await fetch(doc.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const md = await response.text();
    const html = renderMarkdown(md);
    docCache.set(id, html);
    if (activeDocId === id) {
      modalEls.view.innerHTML = html;
      modalEls.view.scrollTop = 0;
    }
  } catch (error) {
    console.error(error);
    modalEls.view.innerHTML = `
      <p class="empty">
        无法读取 ${escapeHtml(doc.file)}。请通过本地服务器或部署后的网址访问此页面。
      </p>
    `;
  }
}

function openModal() {
  modalEls.modal.hidden = false;
  document.body.classList.add("modal-open");
  if (!activeDocId) {
    showDoc(MUST_READ_DOCS[0].id);
  }
}

function closeModal() {
  modalEls.modal.hidden = true;
  document.body.classList.remove("modal-open");
  modalEls.btn.focus();
}

modalEls.btn.addEventListener("click", openModal);

modalEls.modal.addEventListener("click", (event) => {
  if (event.target.closest("[data-modal-close]")) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") {
    return;
  }

  if (!modalEls.modal.hidden) {
    closeModal();
  }

  if (!indexEls.modal.hidden) {
    closeIndexModal();
  }

  if (aboutEls.modal && !aboutEls.modal.hidden) {
    closeAboutModal();
  }

  if (feedbackEls.modal && !feedbackEls.modal.hidden) {
    closeFeedbackModal();
  }
});

buildDocList();
