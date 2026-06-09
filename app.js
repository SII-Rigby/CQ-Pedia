const state = {
  entries: [],
  mode: "idle",
  query: "",
  initial: ""
};

const INITIALS = ["b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "ng", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w"];
const INITIAL_MATCH_ORDER = ["ng", "yu", "b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w"];
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
  grid: document.querySelector("#initialGrid")
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function entryText(entry) {
  const definitions = (entry.definitions || []).map((item) => item.text).join(" ");
  const variants = entry.variants || [];
  const notes = entry.notes || "";

  return [
    entry.headword,
    entry.pinyin,
    entry.partOfSpeech,
    definitions,
    notes,
    ...variants
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

  return matched || "";
}

function matchesSearch(entry) {
  const query = normalize(state.query);
  return query ? normalize(entryText(entry)).includes(query) : false;
}

function matchesInitial(entry) {
  return state.initial ? initialOf(entry) === state.initial : false;
}

function filteredEntries() {
  if (state.mode === "idle") {
    return state.entries.slice(0, WELCOME_ENTRY_COUNT);
  }

  if (state.mode === "search") {
    return state.entries.filter(matchesSearch);
  }

  if (state.mode === "initial") {
    return state.entries.filter(matchesInitial);
  }

  return [];
}

function renderEntry(entry) {
  const definitions = entry.definitions || [];
  const examples = entry.examples || [];
  const definitionBlocks = definitions
    .map((item, index) => {
      const example = examples[index];
      const exampleHtml = example
        ? `
          <div class="example">
            <strong>例：</strong>${escapeHtml(example.text)}
            <p>${escapeHtml(example.pinyin)}</p>
            <p>${escapeHtml(example.translation)}</p>
          </div>
        `
        : "";

      return `
        <section class="definition-block">
          <p class="definition-text"><span>${index + 1}.</span>${escapeHtml(item.text)}</p>
          ${exampleHtml}
        </section>
      `;
    })
    .join("");
  const extraExamples = examples.length > definitions.length
    ? examples.slice(definitions.length)
      .map((item) => `
        <div class="example">
          <strong>例：</strong>${escapeHtml(item.text)}
          <p>${escapeHtml(item.pinyin)}</p>
          <p>${escapeHtml(item.translation)}</p>
        </div>
      `)
      .join("")
    : "";
  const definitionFallback = definitionBlocks || `
      <section class="definition-block">
        <p class="definition-text">暂无释义。</p>
      </section>
    `;
  const variants = entry.variants && entry.variants.length
    ? `<p class="variants">异体写法：${escapeHtml(entry.variants.join("、"))}</p>`
    : "";
  const notes = entry.notes
    ? `<p class="notes">${escapeHtml(entry.notes)}</p>`
    : "";

  return `
    <article class="entry">
      <div class="entry-head">
        <h3>${escapeHtml(entry.headword)}</h3>
        <span class="pos">${escapeHtml(entry.partOfSpeech)}</span>
      </div>
      <p class="pinyin">${escapeHtml(entry.pinyin)}</p>
      ${variants}
      <div class="definitions">${definitionFallback}</div>
      ${extraExamples}
      ${notes}
    </article>
  `;
}

function render() {
  const filtered = filteredEntries();

  els.resultsPanel.hidden = false;
  els.count.textContent = `${filtered.length}`;

  if (state.mode === "initial") {
    els.label.textContent = `声母 ${state.initial}`;
  } else if (state.mode === "idle") {
    els.label.textContent = "展示词条";
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
  indexEls.grid.innerHTML = INITIALS
    .map((initial) => {
      const count = counts[initial] || 0;
      return `<button type="button" data-initial="${escapeHtml(initial)}">${escapeHtml(initial)}<small>${count} entries</small></button>`;
    })
    .join("");
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

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  state.query = els.input.value.trim();
  state.mode = state.query ? "search" : "idle";
  state.initial = "";
  render();
});

els.input.addEventListener("input", () => {
  state.query = els.input.value.trim();
  state.mode = state.query ? "search" : "idle";
  state.initial = "";
  render();
});

function openIndexModal() {
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

  const button = event.target.closest("button[data-initial]");
  if (!button) {
    return;
  }

  state.mode = "initial";
  state.initial = button.dataset.initial;
  state.query = "";
  els.input.value = "";
  indexEls.grid.querySelectorAll("button[data-initial]").forEach((item) => {
    item.classList.toggle("active", item.dataset.initial === state.initial);
  });
  closeIndexModal();
  render();
  document.querySelector("#resultsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
});

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
});

buildDocList();

