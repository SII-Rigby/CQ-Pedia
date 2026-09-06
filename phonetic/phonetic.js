const phoneticState = {
  entries: [],
  query: "",
  activeEntry: null,
  page: 1
};

const els = {
  form: document.querySelector("#phoneticSearchForm"),
  input: document.querySelector("#phoneticSearchInput"),
  recentSearchMenu: document.querySelector("#phoneticRecentSearchMenu"),
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
  aboutButtons: document.querySelectorAll("[data-open-about]"),
  aboutModal: document.querySelector("#aboutModal"),
  moreWrap: document.querySelector(".more-menu"),
  moreBtn: document.querySelector("#moreBtn"),
  moreMenu: document.querySelector("#moreMenu"),
  labelHelpBtn: document.querySelector("#labelHelpBtn"),
  labelHelpModal: document.querySelector("#labelHelpModal"),
  labelHelpCard: document.querySelector("#labelHelpCard")
};

const MUST_READ_DOCS = [
  { id: "phonology", title: "重庆方言音系介绍", file: "../docs/phonology.md" },
  { id: "pinyin-scheme", title: "重庆话拼音方案", file: "../docs/pinyin-scheme.md" },
  { id: "connected-speech", title: "重庆话的吞音与连读", file: "../docs/connected-speech.md" },
  { id: "usage", title: "使用说明 - 重庆话音典", file: "../docs/usage-phonetics.md" }
];

const docCache = new Map();
let activeDocId = null;
const FEATURED_CHARACTERS = "嘉陵夜雨南山秋灯长街人静远雾云横心存热望步履从容";
const RESULTS_PER_PAGE = 120;
const PHONETIC_RECENT_SEARCH_STORAGE_KEY = "cq-pedia-phonetic-recent-searches-v1";
const RECENT_SEARCH_LIMIT = 5;
const LABEL_HELP = {
  "正": {
    name: "正音",
    tone: "主要读法",
    summary: "韵书流传切法进入重庆话后的常规音，或现代重庆话中最稳定的单字读法。",
    example: "一个字只有一个音时，默认为「正」。多音字可有多个「正」。"
  },
  "白": {
    name: "白读",
    tone: "口头读法",
    summary: "口语里使用的白读音，常见于日常词、熟语或本地习惯说法。",
    example: "同一个音也可能同时标「正」「白」，表示正音和口头读法合流。"
  },
  "变": {
    name: "变读",
    tone: "环境读法",
    summary: "受连读、轻重音、儿化或固定搭配影响形成的读法。",
    example: "通常只在给出的词例或相近语境中使用。"
  },
  "罕": {
    name: "罕读",
    tone: "少见读法",
    summary: "日常口语、书面用语都极少用到的字或读音，重庆话基本不会涉及。",
    example: "保留作线索，在一些古籍或专业文献中可能会遇到。"
  },
  "训": {
    name: "训读",
    tone: "借字读法",
    summary: "按意义借用该字记录方言词，读音来自被记录的方言词而非该字常规音。",
    example: "应结合词例理解，不宜脱离词例套用。"
  }
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const abbreviateErhuaSpelling = (value) => String(value)
  .replace(/ae/g, "æ")
  .replace(/eo/g, "ə")
  .replace(/yuer(?=[0-9]|$)/g, "yur")
  .replace(/yer(?=[0-9]|$)/g, "yir")
  .replace(/üer(?=[0-9]|$)/g, "ür")
  .replace(/ier(?=[0-9]|$)/g, "ir")
  .replace(/uer(?=[0-9]|$)/g, "ur");
const normalizePinyinText = (value) => abbreviateErhuaSpelling(normalize(value))
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


function readRecentSearches() {
  try {
    const raw = localStorage.getItem(PHONETIC_RECENT_SEARCH_STORAGE_KEY);
    const items = JSON.parse(raw || "[]");
    return Array.isArray(items)
      ? items.map((item) => String(item || "").trim()).filter(Boolean).slice(0, RECENT_SEARCH_LIMIT)
      : [];
  } catch (error) {
    return [];
  }
}

function writeRecentSearches(searches) {
  try {
    localStorage.setItem(PHONETIC_RECENT_SEARCH_STORAGE_KEY, JSON.stringify(searches));
  } catch (error) {
    // Ignore storage failures; search still works for this visit.
  }
}

function mountRecentSearchMenu() {
  if (els.recentSearchMenu && els.recentSearchMenu.parentElement !== document.body) {
    document.body.appendChild(els.recentSearchMenu);
  }
}

function positionRecentSearchMenu() {
  if (!els.form || !els.recentSearchMenu) {
    return;
  }

  mountRecentSearchMenu();
  const rect = els.form.getBoundingClientRect();
  const inset = 11;
  const availableWidth = Math.max(0, rect.width - inset * 2);
  const maxViewportWidth = Math.max(0, window.innerWidth - rect.left - inset - 12);
  const width = Math.min(availableWidth, maxViewportWidth, Math.max(220, Math.round(availableWidth / 3)));
  els.recentSearchMenu.style.left = `${rect.left + inset}px`;
  els.recentSearchMenu.style.top = `${rect.bottom + 3}px`;
  els.recentSearchMenu.style.width = `${width}px`;
}

function setRecentSearchMenuVisible(visible) {
  if (!els.recentSearchMenu) {
    return;
  }

  if (visible) {
    positionRecentSearchMenu();
  }

  els.recentSearchMenu.hidden = !visible;
  els.input?.setAttribute("aria-expanded", String(visible));
}

function renderRecentSearches() {
  if (!els.recentSearchMenu) {
    return 0;
  }

  const searches = readRecentSearches();
  els.recentSearchMenu.innerHTML = searches
    .map((query) => `
      <button type="button" role="option" data-recent-search="${escapeHtml(query)}">
        <span>${escapeHtml(query)}</span>
      </button>
    `)
    .join("");

  if (!searches.length) {
    setRecentSearchMenuVisible(false);
  }

  return searches.length;
}

function showRecentSearches() {
  setRecentSearchMenuVisible(renderRecentSearches() > 0);
}

function rememberSearch(query) {
  const normalizedQuery = String(query || "").trim();
  if (!normalizedQuery) {
    return;
  }

  const searches = [
    normalizedQuery,
    ...readRecentSearches().filter((item) => item !== normalizedQuery)
  ].slice(0, RECENT_SEARCH_LIMIT);

  writeRecentSearches(searches);
  renderRecentSearches();
}
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

function phoneticAudioSrc(pinyin) {
  const filename = `${encodeURIComponent(normalizePinyinText(pinyin))}.wav`;
  return `../data/audio/phonetic/${filename}`;
}

function renderAudioButtonHtml(pinyin) {
  const normalizedPinyin = normalizePinyinText(pinyin);
  if (!normalizedPinyin) {
    return "";
  }

  return `
    <button type="button" class="audio-button phonetic-audio-button" data-audio-src="${escapeHtml(phoneticAudioSrc(normalizedPinyin))}" aria-label="播放${escapeHtml(normalizedPinyin)}读音" aria-pressed="false" hidden>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path class="speaker-body" d="M4 9v6h4l5 4V5L8 9H4z"></path>
        <path d="M16 9.5c1.2 1.4 1.2 3.6 0 5"></path>
        <path d="M18.5 7c2.3 2.7 2.3 7.3 0 10"></path>
      </svg>
    </button>
  `;
}

async function audioExists(src) {
  try {
    const response = await fetch(src, { method: "HEAD", cache: "no-store" });
    if (response.ok) {
      return true;
    }
    if (response.status !== 405) {
      return false;
    }
  } catch (error) {
    return false;
  }

  try {
    const response = await fetch(src, { headers: { Range: "bytes=0-0" }, cache: "no-store" });
    return response.ok || response.status === 206;
  } catch (error) {
    return false;
  }
}

async function revealAvailablePhoneticAudio(root) {
  const buttons = [...root.querySelectorAll("button.phonetic-audio-button[hidden][data-audio-src]")];
  await Promise.all(buttons.map(async (button) => {
    if (await audioExists(button.dataset.audioSrc)) {
      button.hidden = false;
    }
  }));
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
        ${renderAudioButtonHtml(reading.pinyin)}
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
  revealAvailablePhoneticAudio(els.detailContent);
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

function setMoreMenuOpen(open, restoreFocus = false) {
  if (!els.moreBtn || !els.moreMenu) return;
  els.moreMenu.hidden = !open;
  els.moreBtn.setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("topic-menu-open", open);

  if (open) {
    els.moreMenu.querySelector(".topic-menu-panel")?.focus();
  } else if (restoreFocus) {
    els.moreBtn.focus();
  }
}

function openAboutModal() {
  setMoreMenuOpen(false);
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

function submitSearch() {
  phoneticState.query = els.input.value.trim();
  rememberSearch(phoneticState.query);
  setRecentSearchMenuVisible(false);
  phoneticState.page = 1;
  render();
  els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  submitSearch();
});

els.input.addEventListener("focus", showRecentSearches);
els.input.addEventListener("click", showRecentSearches);

els.recentSearchMenu?.addEventListener("mousedown", (event) => {
  event.preventDefault();
});

els.recentSearchMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-recent-search]");
  if (!button) {
    return;
  }

  els.input.value = button.dataset.recentSearch || "";
  submitSearch();
});

document.addEventListener("click", (event) => {
  if (!els.form.contains(event.target)) {
    setRecentSearchMenuVisible(false);
  }
});

window.addEventListener("scroll", () => {
  if (!els.recentSearchMenu?.hidden) {
    positionRecentSearchMenu();
  }
}, { passive: true });

window.addEventListener("resize", () => {
  if (!els.recentSearchMenu?.hidden) {
    positionRecentSearchMenu();
  }
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

els.aboutButtons.forEach((button) => button.addEventListener("click", openAboutModal));
els.aboutModal.addEventListener("click", (event) => {
  if (event.target.closest("[data-about-close]")) {
    closeAboutModal();
  }
});

if (els.moreBtn && els.moreMenu) {
  els.moreBtn.addEventListener("click", () => setMoreMenuOpen(els.moreMenu.hidden));
  els.moreBtn.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMoreMenuOpen(true);
    }
  });
  els.moreMenu.addEventListener("click", (event) => {
    if (event.target.closest("[data-more-menu-close]")) {
      setMoreMenuOpen(false, true);
    }
  });
  els.moreMenu.addEventListener("keydown", (event) => {
    const items = Array.from(els.moreMenu.querySelectorAll('[role="menuitem"]'));
    const index = items.indexOf(document.activeElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setMoreMenuOpen(false, true);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(index + 1 + items.length) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(index - 1 + items.length) % items.length]?.focus();
    }
  });
  document.addEventListener("click", (event) => {
    if (!els.moreMenu.hidden && !els.moreWrap?.contains(event.target) && !els.moreMenu.contains(event.target)) {
      setMoreMenuOpen(false);
    }
  });
}

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
  setRecentSearchMenuVisible(false);
  if (!els.detailModal.hidden) closeDetail();
  if (!els.mustReadModal.hidden) closeMustReadModal();
  if (!els.aboutModal.hidden) closeAboutModal();
  if (els.moreMenu && !els.moreMenu.hidden) setMoreMenuOpen(false, true);
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
renderRecentSearches();
loadEntries();
