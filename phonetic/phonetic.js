const phoneticState = {
  entries: [],
  query: "",
  activeEntry: null,
  page: 1
};

const els = {
  form: document.querySelector("#phoneticSearchForm"),
  input: document.querySelector("#phoneticSearchInput"),
  resultsPanel: document.querySelector("#phoneticResultsPanel"),
  results: document.querySelector("#phoneticResults"),
  pagination: document.querySelector("#phoneticPagination"),
  backToSearch: document.querySelector("#backToSearch"),
  detailModal: document.querySelector("#phoneticDetailModal"),
  detailTitle: document.querySelector("#phoneticDetailTitle"),
  detailContent: document.querySelector("#phoneticDetailContent"),
  mustReadBtn: document.querySelector("#mustReadBtn"),
  mustReadModal: document.querySelector("#mustReadModal"),
  docList: document.querySelector("#docList"),
  docView: document.querySelector("#docView"),
  aboutBtn: document.querySelector("#aboutBtn"),
  aboutModal: document.querySelector("#aboutModal"),
  labelHelpBtn: document.querySelector("#labelHelpBtn"),
  labelHelpModal: document.querySelector("#labelHelpModal"),
  labelHelpCard: document.querySelector("#labelHelpCard")
};

const MUST_READ_DOCS = [
  { id: "phonology", title: "重庆方言音系介绍", file: "../docs/phonology.md" },
  { id: "pinyin-scheme", title: "重庆话拼音方案", file: "../docs/pinyin-scheme.md" },
  { id: "usage", title: "使用说明 - 重庆话音典", file: "../docs/usage-phonetics.md" }
];

const docCache = new Map();
let activeDocId = null;
const FEATURED_CHARACTERS = "嘉陵夜雨南山秋灯长街人静远雾云横心存热望步履从容";
const RESULTS_PER_PAGE = 120;
const LABEL_HELP = {
  "\u6b63": {
    name: "\u6b63\u97f3",
    tone: "\u4e3b\u8981\u8bfb\u6cd5",
    summary: "\u97f5\u4e66\u6d41\u4f20\u5207\u6cd5\u8fdb\u5165\u91cd\u5e86\u8bdd\u540e\u7684\u5e38\u89c4\u97f3\uff0c\u6216\u73b0\u4ee3\u91cd\u5e86\u8bdd\u4e2d\u6700\u7a33\u5b9a\u7684\u5355\u5b57\u8bfb\u6cd5\u3002",
    example: "\u4e00\u4e2a\u5b57\u53ea\u6709\u4e00\u4e2a\u97f3\u65f6\uff0c\u9ed8\u8ba4\u6807\u4e3a\u300c\u6b63\u300d\u3002\u591a\u97f3\u5b57\u53ef\u6709\u591a\u4e2a\u300c\u6b63\u300d\u3002"
  },
  "\u767d": {
    name: "\u767d\u8bfb",
    tone: "\u53e3\u5934\u8bfb\u6cd5",
    summary: "\u53e3\u8bed\u91cc\u6cbf\u7528\u7684\u767d\u8bfb\u97f3\uff0c\u5e38\u89c1\u4e8e\u65e5\u5e38\u8bcd\u3001\u719f\u8bed\u6216\u672c\u5730\u4e60\u60ef\u8bf4\u6cd5\u3002",
    example: "\u540c\u4e00\u4e2a\u97f3\u4e5f\u53ef\u80fd\u540c\u65f6\u6807\u300c\u6b63\u300d\u300c\u767d\u300d\uff0c\u8868\u793a\u6b63\u97f3\u548c\u53e3\u5934\u8bfb\u6cd5\u5408\u6d41\u3002"
  },
  "\u53d8": {
    name: "\u53d8\u8bfb",
    tone: "\u73af\u5883\u8bfb\u6cd5",
    summary: "\u53d7\u8fde\u8bfb\u3001\u8f7b\u91cd\u97f3\u3001\u513f\u5316\u6216\u56fa\u5b9a\u642d\u914d\u5f71\u54cd\u5f62\u6210\u7684\u8bfb\u6cd5\u3002",
    example: "\u901a\u5e38\u53ea\u5728\u7ed9\u51fa\u7684\u8bcd\u4f8b\u6216\u76f8\u8fd1\u8bed\u5883\u4e2d\u4f7f\u7528\u3002"
  },
  "\u7f55": {
    name: "\u7f55\u8bfb",
    tone: "\u5c11\u89c1\u8bfb\u6cd5",
    summary: "\u8f83\u5c11\u4f7f\u7528\u3001\u5730\u57df\u6216\u4ee3\u9645\u5dee\u5f02\u660e\u663e\uff0c\u6216\u8d44\u6599\u4ecd\u9700\u7ee7\u7eed\u6838\u9a8c\u7684\u8bfb\u97f3\u3002",
    example: "\u4fdd\u7559\u4f5c\u7ebf\u7d22\uff0c\u4e0d\u5efa\u8bae\u5f53\u4f5c\u9ed8\u8ba4\u8bfb\u6cd5\u3002"
  },
  "\u8bad": {
    name: "\u8bad\u8bfb",
    tone: "\u501f\u5b57\u8bfb\u6cd5",
    summary: "\u6309\u8bcd\u4e49\u501f\u7528\u67d0\u5b57\u8bb0\u5f55\u65b9\u8a00\u8bcd\uff0c\u8bfb\u97f3\u6765\u81ea\u88ab\u8bb0\u5f55\u7684\u65b9\u8a00\u8bcd\u800c\u975e\u8be5\u5b57\u5e38\u89c4\u97f3\u3002",
    example: "\u5e94\u7ed3\u5408\u8bcd\u4f8b\u7406\u89e3\uff0c\u4e0d\u5b9c\u8131\u79bb\u8bcd\u4f8b\u5957\u7528\u3002"
  }
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const normalizePinyinText = (value) => normalize(value)
  .replace(/u:/g, "\u00fc")
  .replace(/[^a-z0-9\u00fc\u00ea\u00e6\u0259]+/gu, "");
const withoutTone = (value) => normalizePinyinText(value).replace(/[0-9]+$/u, "");
const hasToneNumber = (value) => /[0-9]/u.test(value);
const hasVowel = (value) => /[aeiou\u00fc\u00ea\u00e6\u0259]/u.test(value);
const hasPinyinLetter = (value) => /[a-z\u00fc\u00ea\u00e6\u0259]/u.test(value);
const hanziChars = (value) => Array.from(String(value || "").matchAll(/\p{Unified_Ideograph}/gu), (match) => match[0]);
const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

function readingLabels(reading) {
  return Array.isArray(reading.labels)
    ? reading.labels.map((label) => String(label || "").trim()).filter(Boolean)
    : [];
}

function hasRegularReading(reading) {
  return readingLabels(reading).includes("正");
}

function labelClass(label) {
  const key = String(label || "\u6b63").trim() || "\u6b63";
  return `label-${key.codePointAt(0).toString(16)}`;
}

function renderLabelsHtml(reading) {
  const labels = readingLabels(reading);
  return (labels.length ? labels : ["\u6b63"])
    .map((label) => `<span class="phonetic-label ${labelClass(label)}">${escapeHtml(label)}</span>`)
    .join("");
}


function readingsOf(entry) {
  return Array.isArray(entry.readings) ? entry.readings : [];
}

function examplesOf(reading) {
  return Array.isArray(reading.examples)
    ? reading.examples.map((example) => String(example || "").trim()).filter(Boolean)
    : [];
}

function notesOf(value) {
  if (Array.isArray(value)) {
    return value.map((note) => String(note || "").trim()).filter(Boolean);
  }

  const note = String(value || "").trim();
  return note ? [note] : [];
}

function renderReadingNote(note) {
  const notes = notesOf(note);
  return notes.length
    ? `<p class="phonetic-note"><span>\u6ce8</span>${notes.map(escapeHtml).join("\u3001")}</p>`
    : "";
}



function pinyinSyllablesOf(entry) {
  return readingsOf(entry)
    .flatMap((reading) => String(reading.pinyin || "").split(/[\s/]+/u))
    .map(normalizePinyinText)
    .filter(Boolean);
}

function characterMatches(rawQuery) {
  const chars = [];
  const seen = new Set();
  hanziChars(rawQuery).forEach((char) => {
    if (!seen.has(char)) {
      seen.add(char);
      chars.push(char);
    }
  });
  return chars;
}

function characterResults(chars) {
  const order = new Map(chars.map((char, index) => [char, index]));
  return phoneticState.entries
    .map((entry, index) => ({ entry, index, order: order.get(entry.character) }))
    .filter((item) => item.order !== undefined)
    .sort((a, b) => a.order - b.order || a.index - b.index)
    .map((item) => item.entry);
}

function pinyinRank(entry, query, exactToneQuery) {
  const syllables = pinyinSyllablesOf(entry);

  if (exactToneQuery) {
    return syllables.includes(query) ? 0 : Number.POSITIVE_INFINITY;
  }

  if (hasToneNumber(query)) {
    return syllables.some((syllable) => syllable.includes(query)) ? 0 : Number.POSITIVE_INFINITY;
  }

  let rank = Number.POSITIVE_INFINITY;
  syllables.forEach((syllable) => {
    const base = withoutTone(syllable);
    if (base === query) {
      rank = Math.min(rank, 0);
    } else if (base.startsWith(query)) {
      rank = Math.min(rank, 1);
    } else if (base.includes(query)) {
      rank = Math.min(rank, 2);
    }
  });
  return rank;
}


function featuredEntries(entries) {
  const byCharacter = new Map(entries.map((entry) => [entry.character, entry]));
  return Array.from(FEATURED_CHARACTERS)
    .map((char) => byCharacter.get(char))
    .filter(Boolean);
}

function filteredEntries() {
  const rawQuery = phoneticState.query.trim();
  const chars = characterMatches(rawQuery);

  if (chars.length) {
    return characterResults(chars);
  }

  const query = normalizePinyinText(rawQuery);

  if (!query) {
    return featuredEntries(phoneticState.entries);
  }

  if (!hasPinyinLetter(query)) {
    return [];
  }

  const exactToneQuery = hasToneNumber(query)
    && hasVowel(query)
    && phoneticState.entries.some((entry) => pinyinSyllablesOf(entry).includes(query));

  return phoneticState.entries
    .map((entry, index) => ({ entry, index, rank: pinyinRank(entry, query, exactToneQuery) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.entry);
}

function renderPagination(totalPages) {
  const pages = new Set([1, totalPages]);

  for (let page = phoneticState.page - 2; page <= phoneticState.page + 2; page += 1) {
    if (page >= 1 && page <= totalPages) {
      pages.add(page);
    }
  }

  const items = [...pages].sort((a, b) => a - b);
  const buttons = [];

  items.forEach((page, index) => {
    const previous = items[index - 1];
    if (previous && page - previous > 1) {
      buttons.push('<span class="pagination-ellipsis" aria-hidden="true">...</span>');
    }

    buttons.push(`
      <button type="button" data-page="${page}" ${page === phoneticState.page ? 'class="active" aria-current="page"' : ""}>
        ${page}
      </button>
    `);
  });

  return `
    <nav class="pagination" aria-label="\u97f3\u5178\u5206\u9875">
      <button type="button" data-page="${phoneticState.page - 1}" ${phoneticState.page === 1 ? "disabled" : ""}>\u4e0a\u4e00\u9875</button>
      <span>\u7b2c ${phoneticState.page} / ${totalPages} \u9875</span>
      <div class="pagination-pages">${buttons.join("")}</div>
      <button type="button" data-page="${phoneticState.page + 1}" ${phoneticState.page === totalPages ? "disabled" : ""}>\u4e0b\u4e00\u9875</button>
    </nav>
  `;
}

function renderTileReading(reading) {
  const content = `${renderLabelsHtml(reading)} <span class="phonetic-reading-value">${escapeHtml(reading.pinyin)}</span>`;
  return hasRegularReading(reading)
    ? `<strong>${content}</strong>`
    : `<span>${content}</span>`;
}

function renderTile(entry) {
  return `
    <button type="button" class="mahjong-tile" data-phonetic-id="${escapeHtml(entry.id)}" aria-label="查看${escapeHtml(entry.character)}的字音">
      <span class="mahjong-character">${escapeHtml(entry.character)}</span>
      <span class="mahjong-readings">${readingsOf(entry).map(renderTileReading).join("")}</span>
    </button>
  `;
}

function render() {
  const entries = filteredEntries();
  const totalPages = Math.max(1, Math.ceil(entries.length / RESULTS_PER_PAGE));
  phoneticState.page = Math.min(Math.max(phoneticState.page, 1), totalPages);
  const shouldPaginate = entries.length > RESULTS_PER_PAGE;
  const pageEntries = shouldPaginate
    ? entries.slice((phoneticState.page - 1) * RESULTS_PER_PAGE, phoneticState.page * RESULTS_PER_PAGE)
    : entries;

  if (!entries.length) {
    els.results.innerHTML = '<p class="empty">\u6ca1\u6709\u627e\u5230\u7b26\u5408\u6761\u4ef6\u7684\u5b57\u97f3\u3002</p>';
    if (els.pagination) els.pagination.innerHTML = "";
    updateBackToSearch();
    return;
  }

  els.results.innerHTML = pageEntries.map(renderTile).join("");
  if (els.pagination) {
    els.pagination.innerHTML = shouldPaginate ? renderPagination(totalPages) : "";
  }
  updateBackToSearch();
}

function renderDetailReading(reading) {
  const examples = examplesOf(reading);
  const description = String(reading.description || "").trim();
  const descriptionHtml = description
    ? `<p class="phonetic-description">${escapeHtml(description)}</p>`
    : "";
  const examplesHtml = examples.length
    ? `<p class="phonetic-examples"><span>\u8bcd\u4f8b</span>${examples.map(escapeHtml).join("\u3001")}</p>`
    : "";
  const noteHtml = renderReadingNote(reading.note);
  const className = hasRegularReading(reading) ? "phonetic-reading regular" : "phonetic-reading";

  return `
    <section class="${className}">
      <p class="phonetic-reading-line">
        <span class="phonetic-reading-labels">${renderLabelsHtml(reading)}</span>
        <span class="phonetic-reading-pinyin">${escapeHtml(reading.pinyin)}</span>
      </p>
      ${descriptionHtml}
      ${examplesHtml}
      ${noteHtml}
    </section>
  `;
}

function openDetail(entry) {
  const entryNotes = notesOf(entry.note);
  const entryNoteHtml = entryNotes.length
    ? `<aside class="note entry-note"><span>\u6ce8</span><p>${entryNotes.map(escapeHtml).join("<br>")}</p></aside>`
    : "";

  phoneticState.activeEntry = entry;
  els.detailTitle.textContent = entry.character;
  els.detailContent.innerHTML = `
    <article class="phonetic-detail-card">
      <div class="phonetic-detail-character" aria-hidden="true">${escapeHtml(entry.character)}</div>
      <div class="phonetic-detail-readings">
        ${readingsOf(entry).map(renderDetailReading).join("")}
      </div>
      ${entryNoteHtml}
    </article>
  `;
  els.detailModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeDetail() {
  els.detailModal.hidden = true;
  document.body.classList.remove("modal-open");
  phoneticState.activeEntry = null;
}

async function loadEntries() {
  try {
    const response = await fetch("../data/phonetics.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    phoneticState.entries = Array.isArray(payload.entries) ? payload.entries : [];
    render();
  } catch (error) {
    console.error(error);
    els.results.innerHTML = `
      <p class="empty">
        无法读取 ../data/phonetics.json。请通过本地服务器或部署后的网址访问此页面。
      </p>
    `;
  }
}

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
    line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((cell) => cell.trim());

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const buf = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf.push(lines[i]);
        i += 1;
      }
      i += 1;
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^\s*<table\b/i.test(line)) {
      const buf = [];
      while (i < lines.length) {
        buf.push(lines[i]);
        if (/<\/table>\s*$/i.test(lines[i])) {
          i += 1;
          break;
        }
        i += 1;
      }
      const tableHtml = sanitizeTableHtml(buf.join("\n"));
      if (tableHtml) out.push(tableHtml);
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      out.push("<hr>");
      i += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      out.push(`<h${level}>${inline(heading[2].trim())}</h${level}>`);
      i += 1;
      continue;
    }

    if (line.includes("|") && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const headers = splitRow(line);
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].includes("|") && !/^\s*$/.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      const thead = `<thead><tr>${headers.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead>`;
      const tbody = `<tbody>${rows
        .map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`)
        .join("")}</tbody>`;
      out.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote><p>${inline(buf.join(" "))}</p></blockquote>`);
      continue;
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i += 1;
      }
      out.push(`<ol>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i += 1;
      }
      out.push(`<ul>${items.map((item) => `<li>${inline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    const para = [line];
    i += 1;
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
      i += 1;
    }
    out.push(`<p>${inline(para.join(" "))}</p>`);
  }

  return out.join("\n");
}

function buildDocList() {
  els.docList.innerHTML = MUST_READ_DOCS
    .map((doc) => `<li><button type="button" data-doc="${doc.id}">${escapeHtml(doc.title)}</button></li>`)
    .join("");
}

async function showDoc(id) {
  const doc = MUST_READ_DOCS.find((item) => item.id === id);
  if (!doc) return;

  activeDocId = id;
  els.docList.querySelectorAll("button[data-doc]").forEach((button) => {
    button.classList.toggle("active", button.dataset.doc === id);
  });

  if (docCache.has(id)) {
    els.docView.innerHTML = docCache.get(id);
    els.docView.scrollTop = 0;
    return;
  }

  els.docView.innerHTML = '<p class="empty">载入中...</p>';
  try {
    const response = await fetch(doc.file);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const md = await response.text();
    const html = renderMarkdown(md);
    docCache.set(id, html);
    if (activeDocId === id) {
      els.docView.innerHTML = html;
      els.docView.scrollTop = 0;
    }
  } catch (error) {
    console.error(error);
    els.docView.innerHTML = `
      <p class="empty">
        无法读取 ${escapeHtml(doc.file)}。请通过本地服务器或部署后的网址访问此页面。
      </p>
    `;
  }
}

function openMustReadModal() {
  els.mustReadModal.hidden = false;
  document.body.classList.add("modal-open");
  if (!activeDocId) {
    showDoc(MUST_READ_DOCS[0].id);
  }
}

function closeMustReadModal() {
  els.mustReadModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openAboutModal() {
  els.aboutModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeAboutModal() {
  els.aboutModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function renderLabelHelp(label = "正") {
  if (!els.labelHelpCard) return;
  const item = LABEL_HELP[label] || LABEL_HELP["正"];
  els.labelHelpModal.querySelectorAll("button[data-label-help]").forEach((button) => {
    const active = button.dataset.labelHelp === label;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  els.labelHelpCard.className = `label-help-card ${labelClass(label)}`;
  els.labelHelpCard.innerHTML = `
    <div class="label-help-badge ${labelClass(label)}">${escapeHtml(label)}</div>
    <div>
      <p class="label-help-card-kicker">${escapeHtml(item.tone)}</p>
      <h3>${escapeHtml(item.name)}</h3>
      <p>${escapeHtml(item.summary)}</p>
      <p class="label-help-example">${escapeHtml(item.example)}</p>
    </div>
  `;
}

function openLabelHelpModal() {
  if (!els.labelHelpModal) return;
  renderLabelHelp("正");
  els.labelHelpModal.hidden = false;
  document.body.classList.add("modal-open");
  els.labelHelpCard?.focus({ preventScroll: true });
}

function closeLabelHelpModal() {
  if (!els.labelHelpModal) return;
  els.labelHelpModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function updateBackToSearch() {
  if (!els.backToSearch) return;
  const visible = els.resultsPanel.getBoundingClientRect().top < 0;
  els.backToSearch.classList.toggle("visible", visible);
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  phoneticState.query = els.input.value.trim();
  phoneticState.page = 1;
  render();
  els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

if (els.pagination) {
  els.pagination.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button || button.disabled) return;

    const page = Number(button.dataset.page);
    if (!Number.isFinite(page) || page === phoneticState.page) return;

    phoneticState.page = page;
    render();
    els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

els.results.addEventListener("click", (event) => {
  const tile = event.target.closest("button[data-phonetic-id]");
  if (!tile) return;
  const entry = phoneticState.entries.find((item) => item.id === tile.dataset.phoneticId);
  if (entry) openDetail(entry);
});

els.detailModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-phonetic-close]")) {
    closeDetail();
  }
});

els.mustReadBtn.addEventListener("click", openMustReadModal);
els.mustReadModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-modal-close]")) {
    closeMustReadModal();
  }
});

els.docList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-doc]");
  if (button) showDoc(button.dataset.doc);
});

els.aboutBtn.addEventListener("click", openAboutModal);
els.aboutModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-about-close]")) {
    closeAboutModal();
  }
});

if (els.labelHelpBtn && els.labelHelpModal) {
  els.labelHelpBtn.addEventListener("click", openLabelHelpModal);
  els.labelHelpModal.addEventListener("click", (event) => {
    if (event.target.closest("[data-label-help-close]")) {
      closeLabelHelpModal();
      return;
    }
    const button = event.target.closest("button[data-label-help]");
    if (button) renderLabelHelp(button.dataset.labelHelp);
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!els.detailModal.hidden) closeDetail();
  if (!els.mustReadModal.hidden) closeMustReadModal();
  if (!els.aboutModal.hidden) closeAboutModal();
  if (els.labelHelpModal && !els.labelHelpModal.hidden) closeLabelHelpModal();
});

if (els.backToSearch) {
  window.addEventListener("scroll", updateBackToSearch, { passive: true });
  window.addEventListener("resize", updateBackToSearch);
  els.backToSearch.addEventListener("click", () => {
    document.querySelector("#search").scrollIntoView({ behavior: "smooth", block: "start" });
    els.input.focus({ preventScroll: true });
  });
}

buildDocList();
loadEntries();
