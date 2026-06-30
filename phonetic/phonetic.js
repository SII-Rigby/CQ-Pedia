const phoneticState = {
  entries: [],
  query: "",
  activeEntry: null
};

const els = {
  form: document.querySelector("#phoneticSearchForm"),
  input: document.querySelector("#phoneticSearchInput"),
  resultsPanel: document.querySelector("#phoneticResultsPanel"),
  results: document.querySelector("#phoneticResults"),
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
  { id: "usage", title: "使用说明", file: "../docs/usage.md" }
];

const docCache = new Map();
let activeDocId = null;
const DAILY_SAMPLE_SIZE = 24;
const LABEL_HELP = {
  "正": {
    name: "正音",
    tone: "放心优先看这个",
    summary: "这个字在重庆话里最常用、最值得先学的读音。",
    example: "查一个字时，先把「正」当作默认读法。如果一个字有多个「正」，通常是不同词义或习惯都能用。"
  },
  "白": {
    name: "白读",
    tone: "更口语、更土的读法",
    summary: "多出现在日常说话、固定词或老派说法里，不一定适合所有词。",
    example: "看到「白」时，可以顺手看词例或说明；它往往对应「这个词里才这样读」的情况。"
  },
  "变": {
    name: "变读",
    tone: "被语流或习惯影响的读法",
    summary: "不是字的最基本读音，而是在某些词、某种语气或连读环境下变出来的读法。",
    example: "如果只是想知道单字怎么读，先不必背「变」；真正说到相关词时再用它。"
  },
  "罕": {
    name: "罕用读音",
    tone: "知道有这个读法就行",
    summary: "这类读音可能是少数人使用、旧读、特殊地名姓氏读法，或还需要继续审校的读法。",
    example: "外行查读音时，不要把「罕」当主读；它更像备注和资料线索。"
  },
  "训": {
    name: "训读 / 义读",
    tone: "按意思读出来的特殊读法",
    summary: "表示这个含义的这个音的本字不是它，但习惯用它来代替。",
    example: "遇到「训」时，一定要看词例或说明；脱离那个词不能随便套用。"
  }
};


const normalize = (value) => String(value || "").trim().toLowerCase();
const normalizeSearchText = (value) => normalize(value)
  .replace(/[0-9]+/g, "")
  .replace(/[\p{P}\p{S}]+/gu, "");
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

function labelText(reading) {
  const labels = readingLabels(reading);
  return (labels.length ? labels : ["正"]).map((label) => `[${label}]`).join("");
}

function readingsOf(entry) {
  return Array.isArray(entry.readings) ? entry.readings : [];
}

function examplesOf(reading) {
  return Array.isArray(reading.examples)
    ? reading.examples.map((example) => String(example || "").trim()).filter(Boolean)
    : [];
}


function searchRank(entry, query, rawQuery) {
  const character = normalizeSearchText(entry.character);
  const pinyins = readingsOf(entry).map((reading) => normalize(reading.pinyin)).join(" ");
  const pinyinNoTone = normalizeSearchText(pinyins);

  if (!query) return 2;
  if (character === query) return 0;
  if (character.includes(query)) return 0.2;
  if (pinyins.split(/\s+/u).includes(normalize(rawQuery))) return 0.5;
  if (pinyinNoTone.includes(query)) return 1;
  return Number.POSITIVE_INFINITY;
}

function dailySeedKey() {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(chinaTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dailyEntries(entries) {
  const random = seededRandom(hashString(dailySeedKey()));
  return entries
    .map((entry, index) => ({ entry, index, score: random() }))
    .sort((a, b) => a.score - b.score || a.index - b.index)
    .slice(0, DAILY_SAMPLE_SIZE)
    .map((item) => item.entry);
}

function filteredEntries() {
  const query = normalizeSearchText(phoneticState.query);

  if (!query) {
    return dailyEntries(phoneticState.entries);
  }

  return phoneticState.entries
    .map((entry, index) => ({ entry, index, rank: searchRank(entry, query, phoneticState.query) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((item) => item.entry);
}

function renderTileReading(reading) {
  const content = `${escapeHtml(labelText(reading))} ${escapeHtml(reading.pinyin)}`;
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

  if (!entries.length) {
    els.results.innerHTML = '<p class="empty">没有找到符合条件的字音。</p>';
    updateBackToSearch();
    return;
  }

  els.results.innerHTML = entries.map(renderTile).join("");
  updateBackToSearch();
}

function renderDetailReading(reading) {
  const examples = examplesOf(reading);
  const description = String(reading.description || "").trim();
  const descriptionHtml = description
    ? `<p class="phonetic-description">${escapeHtml(description)}</p>`
    : "";
  const examplesHtml = examples.length
    ? `<p class="phonetic-examples"><span>词例</span>${examples.map(escapeHtml).join("、")}</p>`
    : "";
  const className = hasRegularReading(reading) ? "phonetic-reading regular" : "phonetic-reading";

  return `
    <section class="${className}">
      <p class="phonetic-reading-line">
        <span class="phonetic-reading-labels">${escapeHtml(labelText(reading))}</span>
        <span class="phonetic-reading-pinyin">${escapeHtml(reading.pinyin)}</span>
      </p>
      ${descriptionHtml}
      ${examplesHtml}
    </section>
  `;
}

function openDetail(entry) {
  phoneticState.activeEntry = entry;
  els.detailTitle.textContent = entry.character;
  els.detailContent.innerHTML = `
    <article class="phonetic-detail-card">
      <div class="phonetic-detail-character" aria-hidden="true">${escapeHtml(entry.character)}</div>
      <div class="phonetic-detail-readings">
        ${readingsOf(entry).map(renderDetailReading).join("")}
      </div>
      ${entry.note ? `<aside class="note entry-note"><span>注</span><p>${escapeHtml(entry.note)}</p></aside>` : ""}
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
  els.labelHelpCard.innerHTML = `
    <div class="label-help-badge">[${escapeHtml(label)}]</div>
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
  render();
  els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

els.input.addEventListener("input", () => {
  phoneticState.query = els.input.value.trim();
  render();
});

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
