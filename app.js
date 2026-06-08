const state = {
  entries: [],
  query: "",
  type: "all",
  tag: "all"
};

const els = {
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#searchInput"),
  type: document.querySelector("#searchType"),
  results: document.querySelector("#results"),
  count: document.querySelector("#resultCount"),
  quickSearch: document.querySelector(".quick-search"),
  indexTabs: document.querySelectorAll(".index-tab")
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function entryText(entry, type) {
  const definitions = entry.definitions.map((item) => item.text).join(" ");
  const examples = entry.examples.map((item) => `${item.text} ${item.pinyin} ${item.translation}`).join(" ");
  const variants = entry.variants || [];
  const tags = entry.tags || [];
  const notes = entry.notes || "";

  if (type === "headword") {
    return [entry.headword, ...variants].join(" ");
  }

  if (type === "pinyin") {
    return [entry.pinyin, ...entry.examples.map((item) => item.pinyin)].join(" ");
  }

  if (type === "definition") {
    return definitions;
  }

  return [
    entry.headword,
    entry.pinyin,
    entry.partOfSpeech,
    definitions,
    examples,
    notes,
    ...variants,
    ...tags
  ].join(" ");
}

function matches(entry) {
  const query = normalize(state.query);
  const tags = entry.tags || [];
  const tagMatched = state.tag === "all" || tags.includes(state.tag);

  if (!tagMatched) {
    return false;
  }

  if (!query) {
    return true;
  }

  return normalize(entryText(entry, state.type)).includes(query);
}

function renderEntry(entry, index) {
  const definitions = entry.definitions
    .map((item) => `<li>${escapeHtml(item.text)}</li>`)
    .join("");
  const examples = entry.examples
    .map((item) => `
      <div class="example">
        <strong>例：</strong>${escapeHtml(item.text)}
        <p>${escapeHtml(item.pinyin)}</p>
        <p>${escapeHtml(item.translation)}</p>
      </div>
    `)
    .join("");
  const tags = entry.tags && entry.tags.length
    ? `<div class="tags">${entry.tags.map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`
    : "";
  const variants = entry.variants && entry.variants.length
    ? `<p class="variants">异体写法：${escapeHtml(entry.variants.join("、"))}</p>`
    : "";
  const notes = entry.notes
    ? `<p class="notes">${escapeHtml(entry.notes)}</p>`
    : "";

  return `
    <article class="entry">
      <span class="entry-no">${String(index + 1).padStart(2, "0")}</span>
      <div class="entry-head">
        <h3>${escapeHtml(entry.headword)}</h3>
        <span class="pos">${escapeHtml(entry.partOfSpeech)}</span>
      </div>
      <p class="pinyin">${escapeHtml(entry.pinyin)}</p>
      ${variants}
      <ol class="definitions">${definitions}</ol>
      ${examples}
      ${tags}
      ${notes}
    </article>
  `;
}

function render() {
  const filtered = state.entries.filter(matches);
  els.count.textContent = `${filtered.length} 筆`;

  if (!filtered.length) {
    els.results.innerHTML = '<p class="empty">没有找到符合条件的词条。</p>';
    return;
  }

  els.results.innerHTML = filtered.map(renderEntry).join("");
}

async function loadEntries() {
  try {
    const response = await fetch("data/entries.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json();
    state.entries = payload.entries;
    render();
  } catch (error) {
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
  state.query = els.input.value;
  state.type = els.type.value;
  render();
});

els.input.addEventListener("input", () => {
  state.query = els.input.value;
  render();
});

els.type.addEventListener("change", () => {
  state.type = els.type.value;
  render();
});

els.quickSearch.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-query]");
  if (!button) {
    return;
  }

  els.input.value = button.dataset.query;
  state.query = button.dataset.query;
  render();
});

els.indexTabs.forEach((button) => {
  button.addEventListener("click", () => {
    els.indexTabs.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    state.tag = button.dataset.filter;
    render();
  });
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

/* 极简 Markdown 渲染：标题/段落/列表/引用/代码块/行内代码/链接/粗斜体/分隔线/表格 */
function renderMarkdown(md) {
  const lines = md.replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  let i = 0;

  const inline = (text) => {
    let s = escapeHtml(text);
    // 行内代码
    s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
    // 粗体 **x**
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // 斜体 *x*（避开已被替换的 strong）
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    // 链接 [text](url)
    s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, t, u) =>
      `<a href="${u}" target="_blank" rel="noopener">${t}</a>`);
    return s;
  };

  const isTableSep = (line) => /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(line);
  const splitRow = (line) =>
    line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    // 空行
    if (/^\s*$/.test(line)) {
      i++;
      continue;
    }

    // 代码块 ```lang
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    // 分隔线
    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>");
      i++;
      continue;
    }

    // 标题
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i++;
      continue;
    }

    // 表格：当前行有 | 且下一行是分隔行
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

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }

    // 有序列表
    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      out.push(`<ol>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ol>`);
      continue;
    }

    // 无序列表
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inline(it)}</li>`).join("")}</ul>`);
      continue;
    }

    // 段落（连续非空行合并）
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

  modalEls.view.innerHTML = '<p class="empty">载入中…</p>';
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
  if (event.key === "Escape" && !modalEls.modal.hidden) {
    closeModal();
  }
});

buildDocList();
