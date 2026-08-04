(function () {
  "use strict";

  const source = window.CQ_QUIZ_DATA;
  const els = {
    shell: document.querySelector("#quizShell"),
    questionCard: document.querySelector("#questionCard"),
    resultCard: document.querySelector("#resultCard"),
    title: document.querySelector("#questionTitle"),
    hint: document.querySelector("#questionHint"),
    level: document.querySelector("#levelBadge"),
    kind: document.querySelector("#questionKind"),
    answers: document.querySelector("#answerArea"),
    previous: document.querySelector("#previousBtn"),
    action: document.querySelector("#actionBtn"),
    progressLabel: document.querySelector("#progressLabel"),
    progressCount: document.querySelector("#progressCount"),
    progressTrack: document.querySelector("#progressTrack"),
    progressFill: document.querySelector("#progressFill"),
    themeToggle: document.querySelector("#themeToggle"),
    toast: document.querySelector("#quizToast")
  };

  function applyTheme(theme, persist = true) {
    const nextTheme = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.theme = nextTheme;
    if (els.themeToggle) {
      const isDark = nextTheme === "dark";
      const label = isDark ? "切换到日间模式" : "切换到夜间模式";
      els.themeToggle.setAttribute("aria-pressed", String(isDark));
      els.themeToggle.setAttribute("aria-label", label);
      els.themeToggle.title = label;
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", nextTheme === "dark" ? "#0d2023" : "#f6e8c8");
    if (persist) {
      try {
        localStorage.setItem("cq-quiz-theme", nextTheme);
      } catch (_) {}
    }
  }

  applyTheme(document.documentElement.dataset.theme, false);
  els.themeToggle?.addEventListener("click", () => {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  });

  const TYPE_LABELS = {
    single: "单选题",
    multi: "多选题",
    match: "配对题",
    matrix: "分字选音"
  };

  const TYPE_HINTS = {
    single: "点选一个答案，再确认。",
    multi: "可能不止一个答案，选齐后再确认。",
    match: "依次点左右两列，把四组词搭配起来；再点已配对的词可以拆开。",
    matrix: "每个字选一个读音，四个都选好后再确认。"
  };

  const LEVEL_CLASSES = {
    "简单": "level-easy",
    "中等": "level-medium",
    "困难": "level-hard",
    "专家": "level-expert"
  };

  const state = {
    questions: [],
    index: 0,
    responses: new Map(),
    results: [],
    matchSelection: null,
    toastTimer: 0
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function cleanLabel(value) {
    return String(value ?? "").replaceAll("_", "");
  }

  function shuffled(items) {
    const copy = Array.from(items || []);
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const random = new Uint32Array(1);
      if (window.crypto?.getRandomValues) {
        window.crypto.getRandomValues(random);
      } else {
        random[0] = Math.floor(Math.random() * 0xffffffff);
      }
      const target = random[0] % (index + 1);
      [copy[index], copy[target]] = [copy[target], copy[index]];
    }
    return copy;
  }

  function prepareQuestions(questions) {
    return questions.map((question) => {
      const prepared = { ...question };
      if (question.options) {
        prepared.options = shuffled(question.options.map((option) => ({ ...option })));
      }
      if (question.pairs) {
        prepared.pairs = question.pairs.map((pair) => ({ ...pair }));
        prepared.leftItems = shuffled(prepared.pairs);
        prepared.rightItems = shuffled(prepared.pairs);
      }
      if (question.segments) {
        prepared.segments = question.segments.map((segment) => ({
          ...segment,
          options: shuffled(segment.options.map((option) => ({ ...option })))
        }));
      }
      return prepared;
    });
  }

  function emptyResponse(question) {
    if (question.type === "multi") return new Set();
    if (question.type === "match" || question.type === "matrix") return {};
    return "";
  }

  function responseFor(question) {
    if (!state.responses.has(question.id)) {
      state.responses.set(question.id, emptyResponse(question));
    }
    return state.responses.get(question.id);
  }

  function currentQuestion() {
    return state.questions[state.index];
  }

  function setProgress(answered) {
    const total = state.questions.length || 18;
    const safeAnswered = Math.max(0, Math.min(answered, total));
    const percent = total ? (safeAnswered / total) * 100 : 0;
    els.progressFill.style.width = `${percent}%`;
    els.progressTrack.setAttribute("aria-valuemax", String(total));
    els.progressTrack.setAttribute("aria-valuenow", String(safeAnswered));
    els.progressCount.textContent = state.index < total
      ? `第 ${state.index + 1} / ${total} 题`
      : `${total} / ${total}`;
  }

  function renderChoiceQuestion(question) {
    const multiple = question.type === "multi";
    const response = responseFor(question);
    const selected = multiple ? response : new Set(response ? [response] : []);
    const manyClass = question.options.length > 8 ? " many-options" : "";

    return `<div class="choice-list${multiple ? " multi-choice-list" : ""}${manyClass}" role="group" aria-label="${escapeHtml(TYPE_LABELS[question.type])}">
      ${question.options.map((option, index) => {
        const isSelected = selected.has(option.id);
        return `<button class="answer-choice${isSelected ? " selected" : ""}" type="button" data-option="${escapeHtml(option.id)}" aria-pressed="${isSelected}">
          <span class="choice-marker" aria-hidden="true">${multiple ? (isSelected ? "✓" : "＋") : String.fromCharCode(65 + index)}</span>
          <span class="choice-label">${escapeHtml(cleanLabel(option.label))}</span>
        </button>`;
      }).join("")}
    </div>`;
  }

  function renderMatrixQuestion(question) {
    const response = responseFor(question);
    return `<div class="sound-matrix" role="group" aria-label="逐字选择读音">
      ${question.segments.map((segment) => `<section class="sound-segment" aria-label="${escapeHtml(segment.label)}字的读音">
        <span class="sound-character" aria-hidden="true">${escapeHtml(segment.label)}</span>
        <div class="sound-options">
          ${segment.options.map((option) => {
            const selected = response[segment.id] === option.id;
            return `<button type="button" class="sound-option${selected ? " selected" : ""}" data-segment="${escapeHtml(segment.id)}" data-segment-option="${escapeHtml(option.id)}" aria-pressed="${selected}">${escapeHtml(option.label)}</button>`;
          }).join("")}
        </div>
      </section>`).join("")}
    </div>`;
  }

  function pairedLeftForRight(response, rightId) {
    return Object.keys(response).find((leftId) => response[leftId] === rightId) || "";
  }

  function pairNumber(question, leftId) {
    const response = responseFor(question);
    const linked = question.leftItems.map((item) => item.id).filter((id) => response[id]);
    const index = linked.indexOf(leftId);
    return index >= 0 ? index + 1 : 0;
  }

  function renderMatchButton(question, item, side) {
    const response = responseFor(question);
    const leftId = side === "left" ? item.id : pairedLeftForRight(response, item.id);
    const paired = side === "left" ? Boolean(response[item.id]) : Boolean(leftId);
    const selected = state.matchSelection?.side === side && state.matchSelection?.id === item.id;
    const number = paired ? pairNumber(question, leftId) : 0;
    const label = side === "left" ? item.left : item.right;
    const pairedText = paired ? `，已配为第 ${number} 组` : "";

    return `<button type="button" class="match-tile${paired ? " paired" : ""}${selected ? " selected" : ""}" data-match-side="${side}" data-match-id="${escapeHtml(item.id)}" aria-pressed="${selected || paired}" aria-label="${escapeHtml(cleanLabel(label))}${pairedText}">
      <span class="match-number" aria-hidden="true">${number || ""}</span>
      <span>${escapeHtml(cleanLabel(label))}</span>
    </button>`;
  }

  function renderMatchQuestion(question) {
    return `<div class="match-board" role="group" aria-label="词语配对">
      <div class="match-column">
        <span class="match-column-label">左边</span>
        ${question.leftItems.map((item) => renderMatchButton(question, item, "left")).join("")}
      </div>
      <div class="match-bridge" aria-hidden="true"><span>搭</span><i></i><i></i><i></i><i></i></div>
      <div class="match-column">
        <span class="match-column-label">右边</span>
        ${question.rightItems.map((item) => renderMatchButton(question, item, "right")).join("")}
      </div>
    </div>`;
  }

  function renderAnswers(question) {
    if (question.type === "single" || question.type === "multi") {
      return renderChoiceQuestion(question);
    }
    if (question.type === "matrix") return renderMatrixQuestion(question);
    if (question.type === "match") return renderMatchQuestion(question);
    return '<p class="load-error">暂时认不出这道题的题型。</p>';
  }

  function isComplete(question) {
    const response = responseFor(question);
    if (question.type === "single") return Boolean(response);
    if (question.type === "multi") return response.size > 0;
    if (question.type === "matrix") {
      return question.segments.every((segment) => Boolean(response[segment.id]));
    }
    if (question.type === "match") {
      return question.pairs.every((pair) => Boolean(response[pair.id]));
    }
    return false;
  }

  function setsEqual(left, right) {
    return left.size === right.size && Array.from(left).every((item) => right.has(item));
  }

  function isCorrect(question) {
    const response = responseFor(question);
    if (question.type === "single") return response === question.correct[0];
    if (question.type === "multi") return setsEqual(response, new Set(question.correct));
    if (question.type === "matrix") {
      return question.segments.every((segment) => response[segment.id] === segment.correct);
    }
    if (question.type === "match") {
      return question.pairs.every((pair) => response[pair.id] === pair.id);
    }
    return false;
  }

  function expertMistakes(question) {
    if (question.type !== "multi") return { missed: 0, extra: 0 };
    const response = responseFor(question);
    const correct = new Set(question.correct);
    const missed = question.correct.filter((id) => !response.has(id)).length;
    const extra = Array.from(response).filter((id) => !correct.has(id)).length;
    return { missed, extra };
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question) return;

    const levelClass = LEVEL_CLASSES[question.level] || "";
    document.body.dataset.level = levelClass;
    els.questionCard.hidden = false;
    els.resultCard.hidden = true;
    els.level.className = `level-badge ${levelClass}`;
    els.level.textContent = question.level;
    els.kind.textContent = TYPE_LABELS[question.type] || "";
    els.title.textContent = question.prompt;
    els.hint.textContent = TYPE_HINTS[question.type] || "";
    els.answers.innerHTML = renderAnswers(question);
    els.progressLabel.textContent = `${question.level} · ${TYPE_LABELS[question.type]}`;
    setProgress(state.index);
    els.previous.disabled = state.index === 0;
    els.action.textContent = state.index === state.questions.length - 1 ? "提交测验" : "确认并继续";
    els.action.disabled = !isComplete(question);
  }

  function chooseOption(question, optionId) {
    if (question.type === "single") {
      state.responses.set(question.id, optionId);
    } else if (question.type === "multi") {
      const response = responseFor(question);
      if (response.has(optionId)) response.delete(optionId);
      else response.add(optionId);
    }
    renderQuestion();
  }

  function chooseSegment(question, segmentId, optionId) {
    responseFor(question)[segmentId] = optionId;
    renderQuestion();
  }

  function unlinkMatch(question, side, id) {
    const response = responseFor(question);
    if (side === "left" && response[id]) {
      delete response[id];
      return true;
    }
    if (side === "right") {
      const leftId = pairedLeftForRight(response, id);
      if (leftId) {
        delete response[leftId];
        return true;
      }
    }
    return false;
  }

  function chooseMatch(question, side, id) {
    if (unlinkMatch(question, side, id)) {
      state.matchSelection = null;
      renderQuestion();
      return;
    }

    const selected = state.matchSelection;
    if (!selected || selected.side === side) {
      state.matchSelection = selected?.side === side && selected.id === id ? null : { side, id };
      renderQuestion();
      return;
    }

    const leftId = side === "left" ? id : selected.id;
    const rightId = side === "right" ? id : selected.id;
    const response = responseFor(question);
    const previousLeft = pairedLeftForRight(response, rightId);
    if (previousLeft) delete response[previousLeft];
    response[leftId] = rightId;
    state.matchSelection = null;
    renderQuestion();
  }

  function submitAnswer() {
    const question = currentQuestion();
    if (!question || !isComplete(question)) return;

    const mistakes = expertMistakes(question);
    const result = {
      id: question.id,
      level: question.level,
      correct: isCorrect(question),
      missed: mistakes.missed,
      extra: mistakes.extra
    };
    const existingResultIndex = state.results.findIndex((item) => item.id === question.id);
    if (existingResultIndex >= 0) state.results[existingResultIndex] = result;
    else state.results.push(result);
    state.matchSelection = null;

    if (state.index === state.questions.length - 1) {
      renderResult();
      return;
    }

    state.index += 1;
    renderQuestion();
    window.requestAnimationFrame(() => {
      els.title.tabIndex = -1;
      els.title.focus({ preventScroll: true });
      els.questionCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function scoreQuiz() {
    const regularScore = state.results
      .filter((result) => result.level !== "专家" && result.correct)
      .length * 5;
    const penalty = state.results
      .filter((result) => result.level === "专家")
      .reduce((total, result) => total + result.missed * 3 + result.extra * 2, 0);
    const expertScore = Math.max(0, 25 - penalty);
    return {
      regularScore,
      expertScore,
      penalty,
      total: regularScore + expertScore
    };
  }

  function showPreviousQuestion() {
    if (state.index <= 0) return;
    state.index -= 1;
    state.matchSelection = null;
    renderQuestion();
    window.requestAnimationFrame(() => {
      els.title.tabIndex = -1;
      els.title.focus({ preventScroll: true });
      els.questionCard.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function ratingFor(score) {
    if (score < 40) {
      return { title: "黄棒", eyebrow: "初到山城", description: "外省来耍的，听个闹热。", mark: "F" };
    }
    if (score < 60) {
      return { title: "半罐水", eyebrow: "有点耳熟", description: "听得当懂，碰到老言子儿就扯不醒豁。", mark: "D" };
    }
    if (score < 70) {
      return { title: "摸得到门", eyebrow: "渐入佳境", description: "晓得些言子儿，但还不敢乱接腔。", mark: "C" };
    }
    if (score < 80) {
      return { title: "耍得转", eyebrow: "对答如流", description: "日常对话接得起，龙门阵些摆得转。", mark: "B" };
    }
    if (score < 90) {
      return { title: "行市", eyebrow: "地地道道", description: "新词老话都晓得，言子儿展得满天飞。", mark: "A" };
    }
    if (score < 100) {
      return { title: "老江湖", eyebrow: "深藏不露", description: "见多识广，啥子言子儿都麻不到你。", mark: "S" };
    }
    return { title: "老板凳", eyebrow: "镇堂级别", description: "从小坐到大的老资格，勒套题怕不是你出的。", mark: "S+" };
  }

  function renderResult() {
    const score = scoreQuiz();
    const rating = ratingFor(score.total);
    document.body.dataset.level = "level-result";
    state.index = state.questions.length;
    els.questionCard.hidden = true;
    els.resultCard.hidden = false;
    els.progressLabel.textContent = "测验完成";
    setProgress(state.questions.length);

    els.resultCard.innerHTML = `
      <div class="result-confetti" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="rating-emblem" aria-hidden="true">
        <span>${escapeHtml(rating.mark)}</span>
        <i></i>
      </div>
      <p class="result-eyebrow">${escapeHtml(rating.eyebrow)}</p>
      <h1 id="resultTitle">${escapeHtml(rating.title)}</h1>
      <p class="result-description">${escapeHtml(rating.description)}</p>
      <div class="score-display" aria-label="总分 ${score.total} 分，满分 100 分">
        <strong>${score.total}</strong><span>/ 100</span>
      </div>
      <div class="score-breakdown">
        <span><small>基础题</small><strong>${score.regularScore} / 75</strong></span>
        <span><small>专家题</small><strong>${score.expertScore} / 25</strong></span>
      </div>
      <section class="share-callout" aria-labelledby="sharePrompt">
        <div>
          <span class="share-kicker">散给朋友看</span>
          <h2 id="sharePrompt">你身边哪个才是老板凳？</h2>
          <p>分享这回测验，喊耍得好的也来测一盘儿。</p>
        </div>
        <button type="button" class="share-button" data-share-result>
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="18" cy="5" r="2.5"></circle><circle cx="6" cy="12" r="2.5"></circle><circle cx="18" cy="19" r="2.5"></circle><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5"></path></svg>
          分享结果
        </button>
      </section>
      <div class="result-actions">
        <button type="button" data-restart>再测一遍</button>
        <a href="../">回到 CQ-Pedia</a>
      </div>`;

    window.requestAnimationFrame(() => {
      els.resultCard.tabIndex = -1;
      els.resultCard.focus();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.hidden = false;
    state.toastTimer = window.setTimeout(() => {
      els.toast.hidden = true;
    }, 2600);
  }

  function quizUrl() {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.href;
  }

  async function copyText(text) {
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (_) {
        // Continue to the selection-based fallback below.
      }
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }

  async function shareResult() {
    const score = scoreQuiz();
    const rating = ratingFor(score.total);
    const text = `我在 CQ-Pedia 重庆话测验拿到 ${score.total} 分，评级「${rating.title}」！你也来测下言子儿水平。`;
    const url = quizUrl();

    if (navigator.share) {
      try {
        await navigator.share({ title: "重庆话测验｜CQ-Pedia", text, url });
        showToast("分享出去咯！");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    const copied = await copyText(`${text}\n${url}`);
    showToast(copied ? "结果和链接复制好了！" : "复制失败，请手动复制页面链接。 ");
  }

  function restartQuiz() {
    state.questions = prepareQuestions(source.questions);
    state.index = 0;
    state.responses = new Map();
    state.results = [];
    state.matchSelection = null;
    els.resultCard.innerHTML = "";
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.requestAnimationFrame(() => {
      els.title.tabIndex = -1;
      els.title.focus({ preventScroll: true });
    });
  }

  els.answers.addEventListener("click", (event) => {
    const question = currentQuestion();
    if (!question) return;

    const option = event.target.closest("[data-option]");
    if (option) {
      chooseOption(question, option.dataset.option);
      return;
    }

    const segment = event.target.closest("[data-segment]");
    if (segment) {
      chooseSegment(question, segment.dataset.segment, segment.dataset.segmentOption);
      return;
    }

    const match = event.target.closest("[data-match-side]");
    if (match) {
      chooseMatch(question, match.dataset.matchSide, match.dataset.matchId);
    }
  });

  els.action.addEventListener("click", () => {
    submitAnswer();
  });

  els.previous.addEventListener("click", showPreviousQuestion);

  els.resultCard.addEventListener("click", (event) => {
    if (event.target.closest("[data-share-result]")) {
      shareResult();
    } else if (event.target.closest("[data-restart]")) {
      restartQuiz();
    }
  });

  if (!source || !Array.isArray(source.questions) || source.questions.length !== 18) {
    els.title.textContent = "题库没有顺利到站";
    els.hint.textContent = "请刷新页面再试一次。";
    els.answers.innerHTML = '<p class="load-error">无法载入重庆话测验题库。</p>';
    els.action.hidden = true;
    return;
  }

  state.questions = prepareQuestions(source.questions);
  try {
    delete window.CQ_QUIZ_DATA;
  } catch (_) {
    // The quiz keeps its private reference even if the global cannot be removed.
  }
  renderQuestion();
}());
