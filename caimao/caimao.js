const MAX_GUESSES = 10;
const STORAGE_KEY = "cq-pedia-caimao-state-v1";
const THEME_KEY = "cq-pedia-caimao-theme-v1";
// 固定每日题目的首版词库快照；后续词条仍会立即进入练习模式，但不会在白天改写当日题目。
const DAILY_POOL_MAX_ENTRY_NUMBER = 1213;
const CHONGQING_UTC_OFFSET_MS = 8 * 60 * 60 * 1000;
const INITIALS = ["ng", "b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w"];
const STATE_EMOJI = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛"
};

const app = {
  entries: [],
  phonetics: [],
  phoneticByCharacter: new Map(),
  answers: [],
  mode: "daily",
  game: null,
  store: null,
  readingDrafts: [],
  helperTarget: 0,
  helperReading: null,
  timerSegmentStarted: null,
  timerHandle: null,
  dailyRefreshHandle: null,
  toastHandle: null,
  lastFocusedModalTrigger: null
};

const els = {
  board: document.querySelector("#board"),
  puzzleMeta: document.querySelector("#puzzleMeta"),
  timerText: document.querySelector("#timerText"),
  gameNotice: document.querySelector("#gameNotice"),
  composer: document.querySelector("#composer"),
  wordStep: document.querySelector("#wordStep"),
  pronunciationStep: document.querySelector("#pronunciationStep"),
  characterInputs: Array.from(document.querySelectorAll("#characterInputs input")),
  toPronunciation: document.querySelector("#toPronunciation"),
  backToWord: document.querySelector("#backToWord"),
  readingEditor: document.querySelector("#readingEditor"),
  submitGuess: document.querySelector("#submitGuess"),
  openRareHelper: document.querySelector("#openRareHelper"),
  rareHelperModal: document.querySelector("#rareHelperModal"),
  rareSearchInput: document.querySelector("#rareSearchInput"),
  rareResults: document.querySelector("#rareResults"),
  rareHint: document.querySelector("#rareHint"),
  themeToggle: document.querySelector("#themeToggle"),
  themeIcon: document.querySelector("#themeIcon"),
  newPracticeBtn: document.querySelector("#newPracticeBtn"),
  statsContent: document.querySelector("#statsContent"),
  resultModal: document.querySelector("#resultModal"),
  resultKicker: document.querySelector("#resultKicker"),
  resultTitle: document.querySelector("#resultTitle"),
  resultAnswer: document.querySelector("#resultAnswer"),
  resultReading: document.querySelector("#resultReading"),
  resultDefinition: document.querySelector("#resultDefinition"),
  resultSummary: document.querySelector("#resultSummary"),
  answerLink: document.querySelector("#answerLink"),
  shareResult: document.querySelector("#shareResult"),
  closeResult: document.querySelector("#closeResult"),
  toast: document.querySelector("#toast")
};

function defaultStore() {
  return {
    version: 1,
    mode: "daily",
    dailyGames: {},
    practiceGames: {},
    currentPracticeKey: "",
    practiceSequence: 0,
    lastPracticeEntryId: "",
    stats: {
      played: 0,
      won: 0,
      totalAttempts: 0,
      totalElapsedMs: 0,
      distribution: Array(MAX_GUESSES).fill(0),
      byEntry: {}
    }
  };
}

function readStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== 1) {
      return defaultStore();
    }

    const fallback = defaultStore();
    return {
      ...fallback,
      ...parsed,
      dailyGames: parsed.dailyGames || {},
      practiceGames: parsed.practiceGames || {},
      stats: {
        ...fallback.stats,
        ...(parsed.stats || {}),
        distribution: Array.from(
          { length: MAX_GUESSES },
          (_, index) => Number(parsed.stats?.distribution?.[index]) || 0
        ),
        byEntry: parsed.stats?.byEntry || {}
      }
    };
  } catch (_) {
    return defaultStore();
  }
}

function writeStore() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(app.store));
  } catch (_) {
    showToast("浏览器没有保存本局记录。");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function unicodeCharacters(value) {
  return Array.from(String(value || "").normalize("NFC"));
}

function isHanzi(value) {
  return /^\p{Script=Han}$/u.test(String(value || ""));
}

function plainMarkedText(value) {
  return String(value || "").replaceAll("_", "");
}

function normalizeAnswerHeadword(value) {
  return String(value || "")
    .replace(/_\([^)]*\)/gu, "")
    .replace(/_儿/gu, "")
    .replaceAll("_", "")
    .replace(/[\p{P}\p{S}\s]/gu, "");
}

function splitAnswerReadings(value) {
  return String(value || "")
    .trim()
    .split(/\s*\/\s*/u)
    .map((reading) => reading.split(/\s+/u).map(parseSyllable).filter(Boolean))
    .filter((reading) => reading.length === 4);
}

function parseSyllable(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return null;

  const toneMatches = raw.match(/[1-4]/gu) || [];
  const tone = toneMatches.at(-1) || "";
  const base = raw
    .replace(/[1-4]/gu, "")
    .replaceAll("-", "")
    .replace(/[^\p{L}əæü]/gu, "");
  if (!base) return null;

  const initial = INITIALS.find((item) => base.startsWith(item)) || "∅";
  const final = initial === "∅" ? base : base.slice(initial.length);

  return {
    raw,
    normalized: `${base}${tone}`,
    base,
    initial,
    final: final || "∅",
    tone
  };
}

function normalizeActualReading(value) {
  const syllable = parseSyllable(value);
  return syllable?.tone ? syllable.normalized : "";
}

function validManualReading(value) {
  const reading = String(value || "").trim();
  return unicodeCharacters(reading).length <= 7 && /^[a-züəæê]+[1-4]$/iu.test(reading);
}

function buildAnswerPool(entries) {
  return entries
    .filter((entry) => {
      const tags = Array.isArray(entry.tag) ? entry.tag : [entry.tag];
      return !tags.map((tag) => String(tag || "").trim()).includes("粗俗");
    })
    .map((entry) => {
      const word = normalizeAnswerHeadword(entry.headword);
      const readings = splitAnswerReadings(entry.pinyin);
      if (unicodeCharacters(word).length !== 4 || !readings.length) return null;
      return { entry, word, readings };
    })
    .filter(Boolean)
    .sort((a, b) => a.entry.id.localeCompare(b.entry.id));
}

function buildPhoneticMap(entries) {
  const map = new Map();
  entries.forEach((entry) => {
    const character = String(entry.character || "");
    if (!character) return;
    const current = map.get(character);
    if (current) {
      current.readings.push(...(entry.readings || []));
    } else {
      map.set(character, {
        ...entry,
        readings: Array.isArray(entry.readings) ? entry.readings.slice() : []
      });
    }
  });
  return map;
}

function readingCandidatesFor(character) {
  const entry = app.phoneticByCharacter.get(character);
  if (!entry) return [];

  const candidates = [];
  const seen = new Set();
  (entry.readings || []).forEach((reading) => {
    const value = normalizeActualReading(reading.pinyin);
    if (!value || seen.has(value)) return;
    seen.add(value);
    const labels = Array.isArray(reading.labels)
      ? reading.labels.map((label) => String(label || "").trim()).filter(Boolean)
      : [];
    candidates.push({
      value,
      source: String(reading.pinyin || ""),
      labels,
      regular: labels.includes("正")
    });
  });
  return candidates;
}

function defaultReadingFor(character) {
  const candidates = readingCandidatesFor(character);
  return candidates.find((candidate) => candidate.regular) || candidates[0] || null;
}

function dateKeyInChongqing(timestamp = Date.now()) {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(new Date(timestamp));
    const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
  } catch (_) {
    return new Date(timestamp + CHONGQING_UTC_OFFSET_MS).toISOString().slice(0, 10);
  }
}

function millisecondsUntilNextChongqingMidnight(timestamp = Date.now()) {
  const shifted = new Date(timestamp + CHONGQING_UTC_OFFSET_MS);
  const nextMidnight = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate() + 1
  );
  return Math.max(1, nextMidnight - shifted.getTime());
}

function scheduleDailyRefresh() {
  clearTimeout(app.dailyRefreshHandle);
  app.dailyRefreshHandle = setTimeout(() => {
    const expectedKey = `daily:${dateKeyInChongqing()}`;
    if (app.mode === "daily" && app.game?.key !== expectedKey) {
      setMode("daily");
      showToast("新的一天，今日题目已刷新。");
    }
    scheduleDailyRefresh();
  }, millisecondsUntilNextChongqingMidnight() + 80);
}

function hashString(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function answerForDaily(dateKey) {
  const stablePool = app.answers.filter((answer) => {
    const match = String(answer.entry.id || "").match(/^cq-(\d+)$/u);
    return match && Number(match[1]) <= DAILY_POOL_MAX_ENTRY_NUMBER;
  });
  if (!stablePool.length) return null;
  return stablePool[hashString(`cq-pedia-caimao-v2:${dateKey}`) % stablePool.length];
}

function randomPracticeAnswer() {
  if (!app.answers.length) return null;
  const available = app.answers.filter((answer) => answer.entry.id !== app.store.lastPracticeEntryId);
  const source = available.length ? available : app.answers;
  const values = new Uint32Array(1);
  let index;
  try {
    crypto.getRandomValues(values);
    index = values[0] % source.length;
  } catch (_) {
    index = Math.floor(Math.random() * source.length);
  }
  return source[index];
}

function newGame(key, mode, answer) {
  return {
    key,
    mode,
    entryId: answer.entry.id,
    guesses: [],
    status: "playing",
    startedAt: 0,
    elapsedMs: 0,
    completedAt: 0,
    counted: false
  };
}

function answerForGame(game) {
  return app.answers.find((answer) => answer.entry.id === game?.entryId) || null;
}

function dailyGame() {
  const dateKey = dateKeyInChongqing();
  const key = `daily:${dateKey}`;
  let game = app.store.dailyGames[dateKey];
  const answer = answerForDaily(dateKey);
  if (!game || !answerForGame(game)) {
    game = newGame(key, "daily", answer);
    app.store.dailyGames[dateKey] = game;
    writeStore();
  }
  return game;
}

function practiceGame(forceNew = false) {
  let game = app.store.practiceGames[app.store.currentPracticeKey];
  if (!forceNew && game && game.status === "playing" && answerForGame(game)) {
    return game;
  }

  const answer = randomPracticeAnswer();
  app.store.practiceSequence = Number(app.store.practiceSequence || 0) + 1;
  const key = `practice:${app.store.practiceSequence}:${Date.now()}`;
  game = newGame(key, "practice", answer);
  app.store.practiceGames[key] = game;
  app.store.currentPracticeKey = key;
  app.store.lastPracticeEntryId = answer.entry.id;

  const keys = Object.keys(app.store.practiceGames);
  if (keys.length > 100) {
    keys
      .filter((item) => item !== key)
      .slice(0, keys.length - 100)
      .forEach((item) => delete app.store.practiceGames[item]);
  }
  writeStore();
  return game;
}

function setMode(mode, forcePractice = false) {
  pauseTimer();
  app.mode = mode === "practice" ? "practice" : "daily";
  app.store.mode = app.mode;
  app.game = app.mode === "daily" ? dailyGame() : practiceGame(forcePractice);
  app.readingDrafts = [];
  app.helperReading = null;
  clearCharacterInputs();
  showWordStep();
  if (app.game.startedAt && app.game.status === "playing" && !document.hidden) {
    app.timerSegmentStarted = Date.now();
  }
  writeStore();
  renderAll();
}

function gameStorageBucket(game) {
  if (game.mode === "daily") {
    return app.store.dailyGames;
  }
  return app.store.practiceGames;
}

function persistGame() {
  if (!app.game) return;
  const snapshotElapsed = elapsedNow();
  app.game.elapsedMs = snapshotElapsed;
  if (app.timerSegmentStarted) {
    app.timerSegmentStarted = Date.now();
  }

  if (app.game.mode === "daily") {
    const dateKey = app.game.key.replace(/^daily:/, "");
    app.store.dailyGames[dateKey] = app.game;
  } else {
    gameStorageBucket(app.game)[app.game.key] = app.game;
  }
  writeStore();
}

function ensureTimerStarted() {
  if (!app.game || app.game.status !== "playing") return;
  if (!app.game.startedAt) {
    app.game.startedAt = Date.now();
  }
  if (!app.timerSegmentStarted && !document.hidden) {
    app.timerSegmentStarted = Date.now();
  }
}

function elapsedNow() {
  if (!app.game) return 0;
  const running = app.timerSegmentStarted ? Date.now() - app.timerSegmentStarted : 0;
  return Math.max(0, Number(app.game.elapsedMs || 0) + running);
}

function pauseTimer() {
  if (!app.game || !app.timerSegmentStarted) return;
  app.game.elapsedMs = elapsedNow();
  app.timerSegmentStarted = null;
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(milliseconds || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function renderTimer() {
  els.timerText.textContent = formatDuration(elapsedNow());
}

function scoreSequence(guesses, answers) {
  const result = Array(guesses.length).fill("absent");
  const remaining = new Map();

  guesses.forEach((guess, index) => {
    if (guess === answers[index]) {
      result[index] = "correct";
    } else {
      remaining.set(answers[index], (remaining.get(answers[index]) || 0) + 1);
    }
  });

  guesses.forEach((guess, index) => {
    if (result[index] === "correct") return;
    const count = remaining.get(guess) || 0;
    if (count > 0) {
      result[index] = "present";
      remaining.set(guess, count - 1);
    }
  });
  return result;
}

function scoreAgainstReading(word, guessSyllables, answer, reading) {
  const guessCharacters = unicodeCharacters(word);
  const answerCharacters = unicodeCharacters(answer.word);
  const characters = scoreSequence(guessCharacters, answerCharacters);
  const initials = scoreSequence(
    guessSyllables.map((item) => item.initial),
    reading.map((item) => item.initial)
  );
  const finals = scoreSequence(
    guessSyllables.map((item) => item.final),
    reading.map((item) => item.final)
  );
  const tones = scoreSequence(
    guessSyllables.map((item) => item.tone),
    reading.map((item) => item.tone)
  );
  const soundStates = [...initials, ...finals, ...tones];
  const rank = soundStates.reduce((score, state) => {
    if (state === "correct") return score + 100;
    if (state === "present") return score + 1;
    return score;
  }, 0);

  return {
    rank,
    reading,
    tiles: guessCharacters.map((character, index) => ({
      character,
      syllable: guessSyllables[index],
      states: {
        character: characters[index],
        initial: initials[index],
        final: finals[index],
        tone: tones[index]
      }
    }))
  };
}

function scoreGuess(word, guessSyllables, answer) {
  return answer.readings
    .map((reading) => scoreAgainstReading(word, guessSyllables, answer, reading))
    .sort((a, b) => b.rank - a.rank)[0];
}

function isSoundCorrect(scored) {
  return scored.tiles.every((tile) =>
    ["initial", "final", "tone"].every((part) => tile.states[part] === "correct")
  );
}

function renderBoard() {
  const rows = [];
  const guesses = app.game?.guesses || [];
  guesses.forEach((guess, rowIndex) => {
    rows.push(`
      <div class="board-row" aria-label="第 ${rowIndex + 1} 次猜测">
        ${guess.tiles.map((tile) => `
          <article class="guess-tile">
            <div class="tile-parts" aria-label="${escapeHtml(`${tile.syllable.initial} ${tile.syllable.final} ${tile.syllable.tone}`)}">
              ${renderPart("声母", tile.syllable.initial, tile.states.initial)}
              ${renderPart("韵母", tile.syllable.final, tile.states.final)}
              ${renderPart("声调", tile.syllable.tone, tile.states.tone)}
            </div>
            <div class="guess-character" data-state="${tile.states.character}">
              ${escapeHtml(tile.character)}
              <span class="visually-hidden">${stateLabel(tile.states.character)}</span>
            </div>
          </article>
        `).join("")}
      </div>
    `);
  });

  while (rows.length < MAX_GUESSES) {
    rows.push(`
      <div class="board-row" aria-label="未使用的猜测">
        ${Array.from({ length: 4 }, () => '<div class="guess-tile empty" aria-hidden="true"></div>').join("")}
      </div>
    `);
  }
  els.board.innerHTML = rows.join("");
}

function stateLabel(state) {
  return {
    correct: "内容和位置正确",
    present: "答案中有此内容但位置不同",
    absent: "答案中没有此内容"
  }[state] || "";
}

function renderPart(label, value, state) {
  const length = Math.max(1, unicodeCharacters(value).length);
  return `
    <span class="part-value" data-state="${state}" style="--part-width: ${length + 1.5}ch" aria-label="${label} ${escapeHtml(value)}，${escapeHtml(stateLabel(state))}" title="${escapeHtml(`${label}：${value}；${stateLabel(state)}`)}">${escapeHtml(value)}</span>
  `;
}

function renderMode() {
  document.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === app.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  els.newPracticeBtn.hidden = app.mode !== "practice";
}

function renderStatus() {
  if (!app.game) return;
  const attempts = app.game.guesses.length;
  if (app.mode === "daily") {
    const date = app.game.key.replace(/^daily:/, "");
    els.puzzleMeta.textContent = `${date} · 第 ${attempts + (app.game.status === "playing" ? 1 : 0)} / ${MAX_GUESSES} 猜`;
  } else {
    const number = app.game.key.split(":")[1] || "";
    els.puzzleMeta.textContent = `练习 ${number} · 第 ${attempts + (app.game.status === "playing" ? 1 : 0)} / ${MAX_GUESSES} 猜`;
  }
  els.composer.hidden = app.game.status !== "playing";
}

function renderAll() {
  renderMode();
  renderBoard();
  renderStatus();
  renderTimer();
  renderStats();
  setThemeIcon();
}

function clearCharacterInputs() {
  els.characterInputs.forEach((input) => {
    input.value = "";
    delete input.dataset.reading;
  });
}

function characterInputValues() {
  return els.characterInputs.map((input) => unicodeCharacters(input.value)[0] || "");
}

function assignCharacter(index, character, reading = "") {
  const input = els.characterInputs[index];
  if (!input) return;
  input.value = character;
  if (reading) {
    input.dataset.reading = normalizeActualReading(reading);
  } else {
    delete input.dataset.reading;
  }
}

function showWordStep() {
  els.wordStep.hidden = false;
  els.pronunciationStep.hidden = true;
  app.readingDrafts = [];
}

function showPronunciationStep() {
  const characters = characterInputValues();
  if (characters.some((character) => !isHanzi(character))) {
    showToast("请先填满四个汉字。");
    els.characterInputs[characters.findIndex((character) => !isHanzi(character))]?.focus();
    return;
  }

  ensureTimerStarted();
  app.readingDrafts = characters.map((character, index) => {
    const candidates = readingCandidatesFor(character);
    const saved = els.characterInputs[index].dataset.reading || "";
    const fallback = defaultReadingFor(character)?.value || "";
    return {
      character,
      candidates,
      value: saved || fallback
    };
  });
  renderReadingEditor();
  els.wordStep.hidden = true;
  els.pronunciationStep.hidden = false;
  els.readingEditor.querySelector("select, input")?.focus();
}

function renderReadingEditor() {
  els.readingEditor.innerHTML = app.readingDrafts.map((draft, index) => {
    const selectedExists = draft.candidates.some((candidate) => candidate.value === draft.value);
    const options = draft.candidates.map((candidate) => {
      const label = candidate.labels.length ? ` · ${candidate.labels.join("")}` : "";
      return `<option value="${escapeHtml(candidate.value)}" ${candidate.value === draft.value ? "selected" : ""}>${escapeHtml(candidate.value + label)}</option>`;
    }).join("");

    return `
      <article class="reading-card">
        <span class="reading-character">${escapeHtml(draft.character)}</span>
        <label>
          音点候选
          <select data-reading-select="${index}" ${draft.candidates.length ? "" : "disabled"}>
            ${draft.candidates.length ? options : '<option value="">无音点</option>'}
            <option value="__manual__" ${!selectedExists && draft.value ? "selected" : ""}>手动填写</option>
          </select>
        </label>
        <label>
          提交读音
          <input type="text" value="${escapeHtml(draft.value)}" data-reading-input="${index}" autocomplete="off" spellcheck="false" placeholder="如 zen4">
        </label>
      </article>
    `;
  }).join("");

  els.readingEditor.querySelectorAll("[data-reading-select]").forEach((select) => {
    select.addEventListener("change", () => {
      const index = Number(select.dataset.readingSelect);
      if (select.value === "__manual__") {
        els.readingEditor.querySelector(`[data-reading-input="${index}"]`)?.focus();
        return;
      }
      app.readingDrafts[index].value = select.value;
      const input = els.readingEditor.querySelector(`[data-reading-input="${index}"]`);
      if (input) input.value = select.value;
    });
  });

  els.readingEditor.querySelectorAll("[data-reading-input]").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.readingInput);
      const compact = input.value.toLowerCase().replace(/\s+/gu, "").replace(/-/gu, "");
      input.value = compact;
      app.readingDrafts[index].value = compact;
      const select = els.readingEditor.querySelector(`[data-reading-select="${index}"]`);
      if (select) {
        const matching = Array.from(select.options).some((option) => option.value === compact);
        select.value = matching ? compact : "__manual__";
      }
    });
  });
}

function submitGuess() {
  if (!app.game || app.game.status !== "playing") return;
  const characters = app.readingDrafts.map((draft) => draft.character);
  const readings = app.readingDrafts.map((draft) => draft.value.trim().toLowerCase());
  const invalidIndex = readings.findIndex((reading) => !validManualReading(reading));
  if (invalidIndex >= 0) {
    showToast("每个读音都要用拼音加一个实际声调，且最多 7 个字符。");
    els.readingEditor.querySelector(`[data-reading-input="${invalidIndex}"]`)?.focus();
    return;
  }

  const syllables = readings.map(parseSyllable);
  const word = characters.join("");
  const answer = answerForGame(app.game);
  const scored = scoreGuess(word, syllables, answer);
  const wordCorrect = word === answer.word;
  const soundCorrect = isSoundCorrect(scored);
  const guess = {
    word,
    readingValues: readings,
    tiles: scored.tiles,
    matchedAnswerReading: scored.reading.map((item) => item.normalized),
    wordCorrect,
    soundCorrect
  };
  app.game.guesses.push(guess);

  if (wordCorrect && soundCorrect) {
    finishGame("won");
  } else if (app.game.guesses.length >= MAX_GUESSES) {
    finishGame("failed");
  } else {
    if (wordCorrect) {
      showNotice("写法已经猜对，读音还得再猜猜。");
    } else if (soundCorrect) {
      showNotice("读音已经猜对，但写法与本站当前收录写法不同。重庆话用字可能有不同习惯，可以继续猜。");
    } else {
      hideNotice();
    }
    persistGame();
    clearCharacterInputs();
    showWordStep();
    renderAll();
    els.characterInputs[0].focus();
  }
}

function finishGame(status) {
  app.game.status = status;
  app.game.completedAt = Date.now();
  pauseTimer();
  countFinishedGame();
  persistGame();
  clearCharacterInputs();
  showWordStep();
  hideNotice();
  renderAll();
  openResultModal();
}

function countFinishedGame() {
  if (app.game.counted) return;
  const stats = app.store.stats;
  const won = app.game.status === "won";
  const attempts = app.game.guesses.length;
  const elapsed = elapsedNow();
  stats.played += 1;
  stats.won += won ? 1 : 0;
  stats.totalAttempts += attempts;
  stats.totalElapsedMs += elapsed;
  if (won && attempts >= 1 && attempts <= MAX_GUESSES) {
    stats.distribution[attempts - 1] = (stats.distribution[attempts - 1] || 0) + 1;
  }

  const current = stats.byEntry[app.game.entryId] || {
    played: 0,
    won: 0,
    bestAttempts: 0,
    bestElapsedMs: 0,
    lastElapsedMs: 0
  };
  current.played += 1;
  current.won += won ? 1 : 0;
  current.lastElapsedMs = elapsed;
  if (won && (!current.bestAttempts || attempts < current.bestAttempts)) {
    current.bestAttempts = attempts;
  }
  if (won && (!current.bestElapsedMs || elapsed < current.bestElapsedMs)) {
    current.bestElapsedMs = elapsed;
  }
  stats.byEntry[app.game.entryId] = current;
  app.game.counted = true;
}

function answerDisplayReading(answer) {
  return answer.readings
    .map((reading) => reading.map((syllable) => syllable.normalized).join(" "))
    .join(" / ");
}

function answerDefinition(answer) {
  const first = (answer.entry.definitions || []).find((definition) => definition?.text);
  return first ? plainMarkedText(first.text) : "暂无释义。";
}

function openResultModal() {
  const answer = answerForGame(app.game);
  const won = app.game.status === "won";
  els.resultKicker.textContent = won ? "本局完成" : "本局结束";
  els.resultTitle.textContent = won ? "猜对了" : "答案";
  els.resultAnswer.textContent = answer.word;
  els.resultReading.textContent = answerDisplayReading(answer);
  els.resultDefinition.textContent = answerDefinition(answer);
  els.resultSummary.textContent = `${app.game.guesses.length} / ${MAX_GUESSES} 次 · ${formatDuration(app.game.elapsedMs)}`;
  els.answerLink.href = `../items/${encodeURIComponent(answer.entry.id)}/`;
  openModal(els.resultModal, els.closeResult);
}

function shareText() {
  const title = app.mode === "daily"
    ? `才猫 ${app.game.key.replace(/^daily:/, "")}`
    : `才猫 练习 ${app.game.key.split(":")[1] || ""}`;
  const result = app.game.status === "won" ? `${app.game.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  const lines = [`${title} ${result} ${formatDuration(app.game.elapsedMs)}`];
  app.game.guesses.forEach((guess) => {
    const components = [
      ["字", "character"],
      ["声", "initial"],
      ["韵", "final"],
      ["调", "tone"]
    ];
    lines.push(components.map(([label, key]) => {
      const squares = guess.tiles.map((tile) => STATE_EMOJI[tile.states[key]]).join("");
      return `${label}${squares}`;
    }).join(" "));
  });
  lines.push("https://cqpedia.cn/caimao/");
  return lines.join("\n");
}

async function shareCurrentResult() {
  const text = shareText();
  try {
    if (navigator.share) {
      await navigator.share({ text });
      return;
    }
    await navigator.clipboard.writeText(text);
    showToast("结果已复制。");
  } catch (error) {
    if (error?.name !== "AbortError") {
      showToast("未能分享结果。");
    }
  }
}

function renderStats() {
  const stats = app.store?.stats || defaultStore().stats;
  const winRate = stats.played ? Math.round((stats.won / stats.played) * 100) : 0;
  const averageAttempts = stats.played ? (stats.totalAttempts / stats.played).toFixed(1) : "0";
  const averageTime = stats.played ? formatDuration(stats.totalElapsedMs / stats.played) : "00:00";
  const maxDistribution = Math.max(1, ...stats.distribution);
  const recentGames = [
    ...Object.values(app.store?.dailyGames || {}),
    ...Object.values(app.store?.practiceGames || {})
  ]
    .filter((game) => game?.completedAt)
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, 8);
  els.statsContent.innerHTML = `
    <div class="stats-overview">
      ${statBox(stats.played, "局数")}
      ${statBox(`${winRate}%`, "猜对")}
      ${statBox(averageAttempts, "平均次数")}
      ${statBox(averageTime, "平均用时")}
    </div>
    <div class="distribution" aria-label="猜中次数分布">
      ${stats.distribution.map((count, index) => `
        <div class="distribution-row">
          <span>${index + 1}</span>
          <div class="distribution-bar" style="width:${Math.max(12, (count / maxDistribution) * 100)}%">${count}</div>
        </div>
      `).join("")}
    </div>
    ${recentGames.length ? `
      <section class="recent-records">
        <h3>最近记录</h3>
        <div class="record-list">
          ${recentGames.map((game) => {
            const answer = answerForGame(game);
            const result = game.status === "won" ? `${game.guesses.length} 次` : "未完成";
            return `
              <div class="record-row">
                <strong>${escapeHtml(answer?.word || game.entryId)}</strong>
                <span>${game.mode === "daily" ? "每日" : "练习"} · ${result}</span>
                <time>${formatDuration(game.elapsedMs)}</time>
              </div>
            `;
          }).join("")}
        </div>
      </section>
    ` : ""}
  `;
}

function statBox(value, label) {
  return `<div class="stat-box"><strong>${escapeHtml(value)}</strong><span>${label}</span></div>`;
}

function showNotice(message) {
  els.gameNotice.textContent = message;
  els.gameNotice.hidden = false;
}

function hideNotice() {
  els.gameNotice.hidden = true;
  els.gameNotice.textContent = "";
}

function showToast(message) {
  clearTimeout(app.toastHandle);
  els.toast.textContent = message;
  els.toast.hidden = false;
  app.toastHandle = setTimeout(() => {
    els.toast.hidden = true;
  }, 3200);
}

function openModal(modal, trigger = document.activeElement) {
  if (!modal) return;
  app.lastFocusedModalTrigger = trigger;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  requestAnimationFrame(() => {
    modal.querySelector(".modal-card")?.focus({ preventScroll: true });
  });
}

function closeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  if (!document.querySelector(".game-modal:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
  app.lastFocusedModalTrigger?.focus?.({ preventScroll: true });
}

function theme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function setThemeIcon() {
  const dark = theme() === "dark";
  els.themeIcon.textContent = dark ? "☀" : "🌙";
  els.themeToggle.setAttribute("aria-label", dark ? "切换到浅色模式" : "切换到深色模式");
  els.themeToggle.setAttribute("title", dark ? "切换到浅色模式" : "切换到深色模式");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#110d0a" : "#f47721");
}

function toggleTheme() {
  const next = theme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch (_) {}
  setThemeIcon();
}

function renderRareResults() {
  const query = els.rareSearchInput.value.trim().toLowerCase();
  if (!query) {
    els.rareResults.innerHTML = "";
    els.rareHint.textContent = "输入拼音、声母、韵母、声调或汉字，再点选要填入的字。";
    return;
  }

  const normalizedQuery = query.replace(/\s+/gu, "").replaceAll("-", "");
  const results = app.phonetics
    .map((entry) => {
      const candidates = readingCandidatesFor(entry.character);
      const match = entry.character === query
        || candidates.some((candidate) => candidate.value.includes(normalizedQuery))
        || candidates.some((candidate) => {
          const parsed = parseSyllable(candidate.value);
          return parsed && [parsed.initial, parsed.final, parsed.tone].includes(normalizedQuery);
        });
      return match ? { entry, candidates } : null;
    })
    .filter(Boolean)
    .slice(0, 80);

  els.rareHint.textContent = results.length
    ? `找到 ${results.length}${results.length === 80 ? "+" : ""} 个候选。`
    : "没有找到候选，可以换一个拼音试试。";
  els.rareResults.innerHTML = results.map(({ entry, candidates }) => `
    <button type="button" class="rare-result" data-helper-character="${escapeHtml(entry.character)}" data-helper-reading="${escapeHtml(candidates[0]?.value || "")}">
      <strong>${escapeHtml(entry.character)}</strong>
      <small>${escapeHtml(candidates.slice(0, 3).map((candidate) => candidate.value).join(" / "))}</small>
    </button>
  `).join("");
}

function bindCharacterInputs() {
  els.characterInputs.forEach((input, index) => {
    input.addEventListener("focus", () => {
      app.helperTarget = index;
    });
    input.addEventListener("compositionstart", () => {
      input.dataset.composing = "true";
    });
    input.addEventListener("compositionend", () => {
      delete input.dataset.composing;
      normalizeCharacterInput(input, index);
    });
    input.addEventListener("input", () => {
      if (input.dataset.composing) return;
      normalizeCharacterInput(input, index);
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !input.value && index > 0) {
        els.characterInputs[index - 1].focus();
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        els.characterInputs[index - 1].focus();
      }
      if (event.key === "ArrowRight" && index < 3) {
        event.preventDefault();
        els.characterInputs[index + 1].focus();
      }
      if (event.key === "Enter") {
        event.preventDefault();
        showPronunciationStep();
      }
    });
    input.addEventListener("paste", (event) => {
      const pasted = unicodeCharacters(event.clipboardData?.getData("text") || "").filter(isHanzi);
      if (!pasted.length) return;
      event.preventDefault();
      pasted.slice(0, 4 - index).forEach((character, offset) => {
        assignCharacter(index + offset, character);
      });
      ensureTimerStarted();
      persistGame();
      els.characterInputs[Math.min(3, index + pasted.length)]?.focus();
    });
  });
}

function normalizeCharacterInput(input, index) {
  const characters = unicodeCharacters(input.value).filter(isHanzi);
  if (!characters.length) {
    input.value = "";
    delete input.dataset.reading;
    return;
  }

  const accepted = characters.slice(0, 4 - index);
  accepted.forEach((character, offset) => {
    assignCharacter(index + offset, character);
  });

  if (accepted.length) {
    ensureTimerStarted();
    persistGame();
    els.characterInputs[Math.min(3, index + accepted.length)]?.focus();
  }
}

function bindEvents() {
  bindCharacterInputs();

  document.querySelectorAll("[data-mode]").forEach((button) => {
    button.addEventListener("click", () => setMode(button.dataset.mode));
  });
  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = document.querySelector(`#${CSS.escape(button.dataset.openModal)}`);
      if (modal?.id === "statsModal") renderStats();
      openModal(modal, button);
    });
  });
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.closest(".game-modal")));
  });
  document.querySelectorAll(".game-modal").forEach((modal) => {
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && modal !== els.resultModal) {
        closeModal(modal);
      }
    });
  });

  els.toPronunciation.addEventListener("click", showPronunciationStep);
  els.backToWord.addEventListener("click", showWordStep);
  els.submitGuess.addEventListener("click", submitGuess);
  els.themeToggle.addEventListener("click", toggleTheme);
  els.newPracticeBtn.addEventListener("click", () => setMode("practice", true));
  els.openRareHelper.addEventListener("click", () => {
    const focusedIndex = els.characterInputs.indexOf(document.activeElement);
    if (focusedIndex >= 0) app.helperTarget = focusedIndex;
    els.rareSearchInput.value = "";
    renderRareResults();
    openModal(els.rareHelperModal, els.openRareHelper);
    requestAnimationFrame(() => els.rareSearchInput.focus());
  });
  els.rareSearchInput.addEventListener("input", renderRareResults);
  els.rareResults.addEventListener("click", (event) => {
    const button = event.target.closest("[data-helper-character]");
    if (!button) return;
    assignCharacter(app.helperTarget, button.dataset.helperCharacter, button.dataset.helperReading);
    ensureTimerStarted();
    persistGame();
    closeModal(els.rareHelperModal);
    els.characterInputs[Math.min(3, app.helperTarget + 1)]?.focus();
  });
  els.shareResult.addEventListener("click", shareCurrentResult);
  els.closeResult.addEventListener("click", () => closeModal(els.resultModal));

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      pauseTimer();
      persistGame();
    } else {
      const expectedDailyKey = `daily:${dateKeyInChongqing()}`;
      if (app.mode === "daily" && app.game?.key !== expectedDailyKey) {
        setMode("daily");
        showToast("新的一天，今日题目已刷新。");
      } else if (app.game?.startedAt && app.game.status === "playing") {
        app.timerSegmentStarted = Date.now();
      }
      scheduleDailyRefresh();
    }
  });
  window.addEventListener("beforeunload", () => {
    pauseTimer();
    persistGame();
  });
}

async function loadData() {
  const [entryResponse, phoneticResponse] = await Promise.all([
    fetch("../data/entries.json"),
    fetch("../data/phonetics.json")
  ]);
  if (!entryResponse.ok || !phoneticResponse.ok) {
    throw new Error("data-load-failed");
  }
  const [entryData, phoneticData] = await Promise.all([
    entryResponse.json(),
    phoneticResponse.json()
  ]);
  app.entries = Array.isArray(entryData.entries) ? entryData.entries : [];
  app.phonetics = Array.isArray(phoneticData.entries) ? phoneticData.entries : [];
  app.phoneticByCharacter = buildPhoneticMap(app.phonetics);
  app.answers = buildAnswerPool(app.entries);
  if (!app.answers.length) {
    throw new Error("empty-answer-pool");
  }
}

async function init() {
  app.store = readStore();
  bindEvents();
  setThemeIcon();
  app.timerHandle = setInterval(renderTimer, 1000);

  try {
    await loadData();
    setMode(app.store.mode || "daily");
    scheduleDailyRefresh();
    if (app.game.status !== "playing") {
      openResultModal();
    } else {
      els.characterInputs[0].focus();
    }
  } catch (_) {
    els.puzzleMeta.textContent = "题库载入失败";
    els.composer.hidden = true;
    showNotice("请刷新页面重试。若直接双击打开了网页，请改用本地服务器预览。");
  }
}

init();
