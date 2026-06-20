const state = {
  entries: [],
  topicIndexes: [],
  mode: "idle",
  query: "",
  initial: "",
  wordClass: "",
  topic: "",
  page: 1
};

const INITIALS = ["b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "ng", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w", "other"];
const INITIAL_MATCH_ORDER = ["ng", "yu", "b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w"];
const OTHER_INITIAL = "other";
const DEFAULT_TOPIC_INDEXES = [
  {
    id: "four-character",
    title: "四字词语",
    generated: "four-character-headword",
    description: ""
  }
];
const WELCOME_ENTRY_COUNT = 10;
const RESULTS_PER_PAGE = 10;
const AUDIO_EXTENSIONS = ["wav", "m4a", "mp3", "ogg"];
const EXAMPLE_AUDIO_SUFFIXES = "abcdefghijklmnopqrstuvwxyz";

const els = {
  form: document.querySelector("#searchForm"),
  input: document.querySelector("#searchInput"),
  resultsPanel: document.querySelector("#resultsPanel"),
  results: document.querySelector("#results"),
  count: document.querySelector("#resultCount"),
  label: document.querySelector("#resultLabel"),
  backToSearch: document.querySelector("#backToSearch")
};

const indexEls = {
  panel: document.querySelector(".filter-panel"),
  toggle: document.querySelector("#filterToggle"),
  modal: document.querySelector("#indexModal"),
  grid: document.querySelector("#initialGrid"),
  tabs: document.querySelectorAll("[data-index-type]"),
  selectedTags: document.querySelector("#selectedTags"),
  openButtons: document.querySelectorAll("[data-open-index]"),
  showAllButton: document.querySelector("[data-show-all]")
};

const aboutEls = {
  btn: document.querySelector("#aboutBtn"),
  modal: document.querySelector("#aboutModal")
};

const welcomeEls = {
  modal: document.querySelector("#welcomeModal"),
  announcement: document.querySelector("#welcomeAnnouncement"),
  startButtons: document.querySelectorAll("[data-welcome-start]"),
  docButton: document.querySelector("[data-welcome-doc]"),
  aboutButton: document.querySelector("[data-welcome-about]")
};

const normalize = (value) => String(value || "").trim().toLowerCase();
const normalizeSearchText = (value) => normalize(value)
  .replace(/[\p{P}\p{S}]+/gu, "");
const escapeHtml = (value) => String(value || "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");
const plainMarkedText = (value) => String(value || "").replace(/_/g, "");
function renderMarkedText(value) {
  const text = String(value || "");
  const markerPattern = /_\(([^)]*)\)|_(.)/gu;
  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = markerPattern.exec(text)) !== null) {
    const markedText = match[1] === undefined ? match[2] : `(${match[1]})`;
    const escapedMarkedText = escapeHtml(markedText);

    html += escapeHtml(text.slice(lastIndex, match.index));
    html += `<span class="erhua" aria-label="${escapedMarkedText}">${escapedMarkedText}</span>`;
    lastIndex = markerPattern.lastIndex;
  }

  return html + escapeHtml(text.slice(lastIndex));
}
const audioPathCache = new Map();

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
    definitions,
    definitionNotes,
    notes,
    ...variants.map(plainMarkedText)
  ].join(" ");
}

function entryDefinitionsText(entry) {
  const definitions = (entry.definitions || [])
    .map((item) => [item.text, item.note].filter(Boolean).map(plainMarkedText).join(" "))
    .join(" ");
  const notes = [entry.note, entry.notes].filter(Boolean).map(plainMarkedText).join(" ");

  return [definitions, notes].filter(Boolean).join(" ");
}

function searchRank(entry, query) {
  const fields = [
    plainMarkedText(entry.headword),
    variantsOf(entry).map(plainMarkedText).join(" "),
    entry.pinyin,
    entryDefinitionsText(entry),
    entryText(entry)
  ];

  const matchedIndex = fields.findIndex((field) => normalizeSearchText(field).includes(query));
  return matchedIndex === -1 ? Number.POSITIVE_INFINITY : matchedIndex;
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

function normalizedHeadwordForLength(entry) {
  return String(entry.headword || "")
    .replace(/_\(([^)]*)\)/gu, "")
    .replace(/_儿/gu, "")
    .replace(/_/gu, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function isFourCharacterEntry(entry) {
  return Array.from(normalizedHeadwordForLength(entry)).length === 4;
}

function topicIndexById(id) {
  return state.topicIndexes.find((topic) => topic.id === id);
}

function topicLabel(id) {
  const topic = topicIndexById(id);
  return topic ? topic.title : id;
}

function topicIds(topic) {
  const ids = [];

  if (topic.generated === "four-character-headword") {
    ids.push(...state.entries.filter(isFourCharacterEntry).map((entry) => entry.id));
  }

  if (Array.isArray(topic.entries)) {
    ids.push(...topic.entries);
  }

  return [...new Set(ids)];
}

function selectedTopicIdSet() {
  const topic = topicIndexById(state.topic);
  return topic ? new Set(topicIds(topic)) : new Set();
}

function matchesSearch(entry) {
  const query = normalizeSearchText(state.query);
  return query ? normalizeSearchText(entryText(entry)).includes(query) : false;
}

function matchesInitial(entry) {
  return state.initial ? initialOf(entry) === state.initial : false;
}

function matchesWordClass(entry) {
  return state.wordClass ? wordClassesOf(entry).includes(state.wordClass) : false;
}

function matchesTopic(entry) {
  return state.topic ? selectedTopicIdSet().has(entry.id) : false;
}

function hasActiveFilters() {
  return Boolean(state.initial || state.wordClass || state.topic);
}

function updateMode() {
  if (state.mode === "all" && !state.query && !hasActiveFilters()) {
    return;
  }

  state.mode = state.query || hasActiveFilters() ? "filter" : "idle";
}

function entryMatchesFilters(entry) {
  if (state.initial && !matchesInitial(entry)) {
    return false;
  }

  if (state.wordClass && !matchesWordClass(entry)) {
    return false;
  }

  if (state.topic && !matchesTopic(entry)) {
    return false;
  }

  return true;
}

function filteredEntries() {
  const query = normalizeSearchText(state.query);
  const hasFilters = hasActiveFilters();

  if (state.mode === "idle" && !query && !hasFilters) {
    return dailyEntries(state.entries, WELCOME_ENTRY_COUNT);
  }

  if (state.mode === "all" && !query && !hasFilters) {
    return state.entries;
  }

  if (query) {
    return state.entries
      .map((entry, index) => ({ entry, index, rank: searchRank(entry, query) }))
      .filter((item) => Number.isFinite(item.rank) && entryMatchesFilters(item.entry))
      .sort((a, b) => a.rank - b.rank || a.index - b.index)
      .map((item) => item.entry);
  }

  if (hasFilters) {
    return state.entries.filter(entryMatchesFilters);
  }

  return [];
}

function hasExampleContent(example) {
  return Boolean(example && [example.text, example.pinyin, example.translation].some((value) => String(value || "").trim()));
}

function audioButton(label, src, hidden = false) {
  return `
    <button type="button" class="audio-button" data-audio-src="${escapeHtml(src)}" aria-label="${escapeHtml(label)}" aria-pressed="false" ${hidden ? "hidden" : ""}>
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path class="speaker-body" d="M4 9h4l5-4v14l-5-4H4z"></path>
        <path class="speaker-wave speaker-wave-one" d="M16 9.5c1.1 1.3 1.1 3.7 0 5"></path>
        <path class="speaker-wave speaker-wave-two" d="M18.6 7c2.3 2.9 2.3 7.1 0 10"></path>
      </svg>
    </button>
  `;
}

function entryAudioPath(entry, extension = "wav") {
  return `data/audio/entries/${entry.id}.${extension}`;
}

function exampleAudioPath(entry, index, extension = "wav") {
  const suffix = EXAMPLE_AUDIO_SUFFIXES[index] || `${index + 1}`;
  return `data/audio/examples/${entry.id}-${suffix}.${extension}`;
}

function renderAudioButton(label, src) {
  return audioButton(label, src, true);
}

function audioCandidates(src) {
  const base = src.replace(/\.[^/.]+$/, "");
  return AUDIO_EXTENSIONS.map((extension) => `${base}.${extension}`);
}

async function firstExistingAudioPath(src) {
  if (audioPathCache.has(src)) {
    return audioPathCache.get(src);
  }

  for (const candidate of audioCandidates(src)) {
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) {
        audioPathCache.set(src, candidate);
        return candidate;
      }
    } catch (error) {
      // Local file previews may block HEAD checks; deployed pages use same-origin HTTP.
    }
  }

  audioPathCache.set(src, "");
  return "";
}

function revealAvailableAudioButtons(root = document) {
  root.querySelectorAll("button.audio-button[hidden][data-audio-src]").forEach(async (button) => {
    const audioPath = await firstExistingAudioPath(button.dataset.audioSrc);
    if (!audioPath) {
      return;
    }

    button.dataset.audioSrc = audioPath;
    button.hidden = false;
  });
}

function renderExample(example, entry, index) {
  if (!hasExampleContent(example)) {
    return "";
  }

  const pinyin = example.pinyin ? `<p class="example-pinyin">${escapeHtml(example.pinyin)}</p>` : "";
  const translation = example.translation ? `<p class="example-translation">${renderMarkedText(example.translation)}</p>` : "";
  const audio = entry ? renderAudioButton(`播放${plainMarkedText(entry.headword)}例句${index + 1}`, exampleAudioPath(entry, index)) : "";

  return `
    <div class="example">
      <p class="example-line"><strong>例：</strong><span>${renderMarkedText(example.text)}</span>${audio}</p>
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

function contributorsOf(entry) {
  const value = entry.contributor || entry.contributors;
  return Array.isArray(value) ? value : splitList(value);
}

function renderContributors(entry) {
  const contributors = contributorsOf(entry);

  if (!contributors.length) {
    return "";
  }

  return `
    <p class="contributors">
      <span>贡献者</span>${escapeHtml(contributors.join("、"))}
    </p>
  `;
}

function renderEntry(entry) {
  const definitions = entry.definitions || [];
  const examples = entry.examples || [];
  const definitionBlocks = definitions
    .map((item, index) => {
      const exampleHtml = renderExample(examples[index], entry, index);
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
      .map((example, index) => renderExample(example, entry, definitions.length + index))
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
  const contributors = renderContributors(entry);

  return `
    <article class="entry">
      <div class="entry-head">
        <h3>
          <span>${renderMarkedText(entry.headword)}</span>
          <a class="entry-open" href="items/${escapeHtml(entry.id)}/" aria-label="打开${escapeHtml(plainMarkedText(entry.headword))}词条">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M5 12h13"></path>
              <path d="m13 6 6 6-6 6"></path>
            </svg>
          </a>
        </h3>
        <span class="pos">${escapeHtml(wordClassOf(entry))}</span>
      </div>
      <div class="entry-audio-line">
        <p class="pinyin">${escapeHtml(entry.pinyin)}</p>
        ${renderAudioButton(`播放${plainMarkedText(entry.headword)}读音`, entryAudioPath(entry))}
      </div>
      ${variantsHtml}
      ${note}
      ${figure}
      <div class="definitions">${definitionFallback}</div>
      ${extraExamples}
      ${contributors}
    </article>
  `;
}

function renderPagination(totalPages) {
  const pages = new Set([1, totalPages]);

  for (let page = state.page - 2; page <= state.page + 2; page += 1) {
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
      <button type="button" data-page="${page}" ${page === state.page ? 'class="active" aria-current="page"' : ""}>
        ${page}
      </button>
    `);
  });

  return `
    <nav class="pagination" aria-label="词条分页">
      <button type="button" data-page="${state.page - 1}" ${state.page === 1 ? "disabled" : ""}>上一页</button>
      <span>第 ${state.page} / ${totalPages} 页</span>
      <div class="pagination-pages">${buttons.join("")}</div>
      <button type="button" data-page="${state.page + 1}" ${state.page === totalPages ? "disabled" : ""}>下一页</button>
    </nav>
  `;
}

function activeFilterLabels() {
  const labels = [];

  if (state.query) {
    labels.push(`搜索：${state.query}`);
  }

  if (state.initial) {
    labels.push(`声母 ${initialLabel(state.initial)}`);
  }

  if (state.wordClass) {
    labels.push(`词性 ${state.wordClass}`);
  }

  if (state.topic) {
    labels.push(`专题 ${topicLabel(state.topic)}`);
  }

  return labels;
}

function renderSelectedTags() {
  if (!indexEls.selectedTags) {
    return;
  }

  const tags = [];

  if (state.initial) {
    tags.push({
      type: "initial",
      label: `声母 ${initialLabel(state.initial)}`
    });
  }

  if (state.wordClass) {
    tags.push({
      type: "wordClass",
      label: `词性 ${state.wordClass}`
    });
  }

  if (state.topic) {
    tags.push({
      type: "topic",
      label: `专题 ${topicLabel(state.topic)}`
    });
  }

  indexEls.selectedTags.innerHTML = tags.length
    ? tags
      .map((tag) => `
        <button type="button" class="filter-tag" data-remove-filter="${tag.type}" aria-label="移除${escapeHtml(tag.label)}">
          <span>${escapeHtml(tag.label)}</span>
          <span aria-hidden="true">×</span>
        </button>
      `)
      .join("")
    : '<span class="empty-tags">未选择筛选条件</span>';
}

function syncFilterControls() {
  indexEls.showAllButton?.classList.toggle(
    "active",
    state.mode === "all" && !state.query && !hasActiveFilters()
  );
  indexEls.toggle?.classList.toggle(
    "active",
    Boolean(indexEls.panel && !indexEls.panel.hidden)
  );
  indexEls.toggle?.classList.toggle("has-filters", hasActiveFilters());
  indexEls.toggle?.setAttribute(
    "aria-expanded",
    indexEls.panel && !indexEls.panel.hidden ? "true" : "false"
  );
}

function render() {
  renderSelectedTags();
  syncFilterControls();
  const filtered = filteredEntries();
  const totalPages = Math.max(1, Math.ceil(filtered.length / RESULTS_PER_PAGE));
  state.page = Math.min(Math.max(state.page, 1), totalPages);
  const shouldPaginate = filtered.length > RESULTS_PER_PAGE;
  const pageEntries = shouldPaginate
    ? filtered.slice((state.page - 1) * RESULTS_PER_PAGE, state.page * RESULTS_PER_PAGE)
    : filtered;

  els.resultsPanel.hidden = false;
  els.count.textContent = `${filtered.length}`;

  const labels = activeFilterLabels();

  if (state.mode === "all" && !labels.length) {
    els.label.textContent = "所有词条";
  } else if (state.mode === "idle") {
    els.label.textContent = "每日十词";
  } else if (labels.length) {
    els.label.textContent = labels.join(" / ");
  } else {
    els.label.textContent = "筛选结果";
  }

  if (!filtered.length) {
    els.results.innerHTML = '<p class="empty">没有找到符合条件的词条。</p>';
    updateBackToSearch();
    return;
  }

  const pagination = shouldPaginate ? renderPagination(totalPages) : "";
  els.results.innerHTML = `${pageEntries.map(renderEntry).join("")}${pagination}`;
  revealAvailableAudioButtons(els.results);
  updateBackToSearch();
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
  indexEls.grid.classList.remove("word-class-grid", "topic-grid");
  indexEls.grid.innerHTML = INITIALS
    .map((initial) => {
      const count = counts[initial] || 0;
      const active = state.initial === initial;
      return `<button type="button" data-initial="${escapeHtml(initial)}" ${active ? 'class="active"' : ""}>${escapeHtml(initialLabel(initial))}<small>${count} 词条</small></button>`;
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
  indexEls.grid.classList.remove("topic-grid");
  indexEls.grid.innerHTML = wordClasses
    .map((wordClass) => {
      const active = state.wordClass === wordClass;
      return `<button type="button" data-word-class="${escapeHtml(wordClass)}" ${active ? 'class="active"' : ""}>${escapeHtml(wordClass)}<small>${counts[wordClass]} 词条</small></button>`;
    })
    .join("");
}

function topicCounts() {
  const entryIds = new Set(state.entries.map((entry) => entry.id));

  return state.topicIndexes.reduce((acc, topic) => {
    acc[topic.id] = topicIds(topic).filter((id) => entryIds.has(id)).length;
    return acc;
  }, {});
}

function buildTopicIndex() {
  const counts = topicCounts();
  indexEls.grid.classList.remove("word-class-grid");
  indexEls.grid.classList.add("topic-grid");
  indexEls.grid.innerHTML = state.topicIndexes
    .map((topic) => {
      const count = counts[topic.id] || 0;
      const active = state.topic === topic.id;
      const description = topic.description ? `<small>${escapeHtml(topic.description)}</small>` : `<small>${count} 词条</small>`;
      return `
        <button type="button" data-topic="${escapeHtml(topic.id)}" ${active ? 'class="active"' : ""}>
          ${escapeHtml(topic.title)}
          ${description}
          ${topic.description ? `<small>${count} 词条</small>` : ""}
        </button>
      `;
    })
    .join("");
}

function setIndexType(type) {
  indexEls.tabs.forEach((tab) => {
    const active = tab.dataset.indexType === type;
    tab.classList.toggle("active", active);
    if (tab.hasAttribute("role")) {
      tab.setAttribute("aria-selected", active ? "true" : "false");
    }
  });

  indexEls.grid.hidden = false;

  if (type === "wordClass") {
    buildWordClassIndex();
  } else if (type === "topic") {
    buildTopicIndex();
  } else {
    buildInitialIndex();
  }
}

function normalizeTopicIndex(topic) {
  return {
    id: String(topic.id || "").trim(),
    title: String(topic.title || topic.name || topic.id || "").trim(),
    description: String(topic.description || "").trim(),
    generated: String(topic.generated || "").trim(),
    entries: Array.isArray(topic.entries)
      ? topic.entries.map((id) => String(id || "").trim()).filter(Boolean)
      : []
  };
}

function mergeTopicIndexes(indexes) {
  const topics = [...DEFAULT_TOPIC_INDEXES, ...indexes]
    .map(normalizeTopicIndex)
    .filter((topic) => topic.id && topic.title);
  const seen = new Set();

  return topics.filter((topic) => {
    if (seen.has(topic.id)) {
      return false;
    }

    seen.add(topic.id);
    return true;
  });
}

async function loadTopicIndexes() {
  try {
    const response = await fetch("data/topic-indices.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    return mergeTopicIndexes(payload.topics || []);
  } catch (error) {
    console.warn("Unable to read data/topic-indices.json; using built-in topic indexes.", error);
    return mergeTopicIndexes([]);
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
    state.topicIndexes = await loadTopicIndexes();
    setIndexType("initial");
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
  updateMode();
  state.page = 1;
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

els.results.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");
  if (!button || button.disabled) {
    return;
  }

  const page = Number(button.dataset.page);
  if (!Number.isFinite(page) || page === state.page) {
    return;
  }

  state.page = page;
  render();
  els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

function updateBackToSearch() {
  if (!els.backToSearch) {
    return;
  }

  if (els.resultsPanel.hidden) {
    els.backToSearch.classList.remove("visible");
    return;
  }

  const visible = els.resultsPanel.getBoundingClientRect().top < 0;
  els.backToSearch.classList.toggle("visible", visible);
}

if (els.backToSearch) {
  window.addEventListener("scroll", updateBackToSearch, { passive: true });
  window.addEventListener("resize", updateBackToSearch);

  els.backToSearch.addEventListener("click", () => {
    document.querySelector("#search").scrollIntoView({ behavior: "smooth", block: "start" });
    els.input.focus({ preventScroll: true });
  });
}

function openIndexModal(type = "initial") {
  setIndexType(type);
  indexEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeIndexModal() {
  indexEls.modal.hidden = true;
  document.body.classList.remove("modal-open");
  indexEls.openButtons.forEach((button) => {
    button.blur();
  });
}

function showAllEntries() {
  if (state.mode === "all" && !state.query && !hasActiveFilters()) {
    state.mode = "idle";
  } else {
    state.mode = "all";
    state.query = "";
    state.initial = "";
    state.wordClass = "";
    state.topic = "";
    els.input.value = "";
  }

  state.page = 1;
  render();
  document.querySelector("#resultsPanel").scrollIntoView({ behavior: "smooth", block: "start" });
}

indexEls.toggle?.addEventListener("click", () => {
  indexEls.panel.hidden = !indexEls.panel.hidden;
  syncFilterControls();
});

indexEls.panel?.addEventListener("click", (event) => {
  const removeButton = event.target.closest("button[data-remove-filter]");
  if (removeButton) {
    if (removeButton.dataset.removeFilter === "initial") {
      state.initial = "";
    }

    if (removeButton.dataset.removeFilter === "wordClass") {
      state.wordClass = "";
    }

    if (removeButton.dataset.removeFilter === "topic") {
      state.topic = "";
    }

    updateMode();
    state.page = 1;
    render();
    return;
  }

  const allButton = event.target.closest("button[data-show-all]");
  if (allButton) {
    showAllEntries();
    return;
  }

  const openButton = event.target.closest("button[data-open-index]");
  if (openButton) {
    openIndexModal(openButton.dataset.openIndex);
  }
});

indexEls.modal?.addEventListener("click", (event) => {
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
  const topicButton = event.target.closest("button[data-topic]");
  if (!initialButton && !wordClassButton && !topicButton) {
    return;
  }

  if (initialButton) {
    state.initial = initialButton.dataset.initial;
  }

  if (wordClassButton) {
    state.wordClass = wordClassButton.dataset.wordClass;
  }

  if (topicButton) {
    state.topic = topicButton.dataset.topic;
  }

  updateMode();
  state.page = 1;
  setIndexType(initialButton ? "initial" : wordClassButton ? "wordClass" : "topic");
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

function splitList(value) {
  return String(value || "")
    .split(/[；;、,，\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
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

const WELCOME_STORAGE_KEY = "cq-pedia-welcome-dismissed-v1";

function isReloadNavigation() {
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  return navigation?.type === "reload" || performance.navigation?.type === 1;
}

function welcomeDismissed() {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === "true";
  } catch (error) {
    return false;
  }
}

function rememberWelcomeDismissed() {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, "true");
  } catch (error) {
    // Ignore storage failures; the welcome window still works for this visit.
  }
}

async function loadWelcomeAnnouncement() {
  if (!welcomeEls.announcement) return;

  try {
    const response = await fetch("docs/welcome.md");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const md = await response.text();
    welcomeEls.announcement.innerHTML = renderMarkdown(md);
  } catch (error) {
    console.error(error);
    welcomeEls.announcement.innerHTML = '<p class="empty">公告暂时无法读取。</p>';
  }
}

function openWelcomeModal() {
  if (!welcomeEls.modal) return;
  welcomeEls.modal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeWelcomeModal(remember = true) {
  if (!welcomeEls.modal) return;
  welcomeEls.modal.hidden = true;
  document.body.classList.remove("modal-open");

  if (remember) {
    rememberWelcomeDismissed();
  }
}

function initWelcomeModal() {
  if (!welcomeEls.modal) return;

  loadWelcomeAnnouncement();

  welcomeEls.startButtons.forEach((button) => {
    button.addEventListener("click", () => closeWelcomeModal(true));
  });

  welcomeEls.docButton?.addEventListener("click", () => {
    closeWelcomeModal(true);
    openModal();
    showDoc("phonology");
  });

  welcomeEls.aboutButton?.addEventListener("click", () => {
    closeWelcomeModal(true);
    openAboutModal();
  });

  if (isReloadNavigation() || !welcomeDismissed()) {
    openWelcomeModal();
  }
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

  if (indexEls.modal && !indexEls.modal.hidden) {
    closeIndexModal();
  }

  if (aboutEls.modal && !aboutEls.modal.hidden) {
    closeAboutModal();
  }

  if (welcomeEls.modal && !welcomeEls.modal.hidden) {
    closeWelcomeModal(true);
  }
});

buildDocList();
initWelcomeModal();
