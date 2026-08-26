(function () {
  const triggers = Array.from(document.querySelectorAll("[data-topic-menu-trigger]"));
  if (!triggers.length) return;

  const root = triggers[0].dataset.topicRoot || "./";
  let activeTrigger = triggers[0];
  const currentTopicId = document.body.dataset.topicId || "";
  const builtInTopics = [
    {
      id: "four-character",
      title: "四字词语",
      description: "按四字结构汇集的重庆话词语。"
    },
    {
      id: "abb-words",
      title: "ABB式词语",
      description: "按 ABB 重叠结构汇集的重庆话词语。"
    }
  ];
  const allEntriesTopic = {
    id: "all-entries",
    title: "所有词条",
    description: "按声母汇集重庆话正音词典的全部词条。"
  };

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const menu = document.createElement("div");
  menu.className = "topic-menu";
  menu.id = "topicNavigationMenu";
  menu.hidden = true;
  menu.innerHTML = `
    <div class="topic-menu-backdrop" data-topic-menu-close></div>
    <section class="topic-menu-panel" role="dialog" aria-modal="true" aria-labelledby="topicNavigationTitle" tabindex="-1">
      <header class="topic-menu-head">
        <h2 id="topicNavigationTitle">专题分类</h2>
        <button type="button" class="topic-menu-close" data-topic-menu-close aria-label="关闭专题菜单">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M6 6l12 12"></path>
            <path d="M18 6 6 18"></path>
          </svg>
        </button>
      </header>
      <div class="topic-menu-scroll">
        <nav class="topic-menu-list" aria-label="专题列表" aria-busy="true">
          <p class="topic-menu-loading">载入中...</p>
        </nav>
      </div>
    </section>
  `;
  document.body.appendChild(menu);

  const panel = menu.querySelector(".topic-menu-panel");
  const list = menu.querySelector(".topic-menu-list");

  function normalizeTopic(topic) {
    return {
      id: String(topic.id || "").trim(),
      title: String(topic.title || topic.name || topic.id || "").trim(),
      description: String(topic.description || "").trim()
    };
  }

  function mergeTopics(topics) {
    const seen = new Set();
    const configuredTopics = topics.filter((topic) => topic.id !== allEntriesTopic.id);
    const movedTopicIds = new Set(["injury-illness", "daily-labor"]);
    const movedTopics = configuredTopics.filter((topic) => movedTopicIds.has(topic.id));
    const orderedTopics = configuredTopics.filter((topic) => !movedTopicIds.has(topic.id));
    const childhoodIndex = orderedTopics.findIndex((topic) => topic.id === "childhood");
    const insertIndex = childhoodIndex >= 0 ? childhoodIndex + 1 : orderedTopics.length;
    orderedTopics.splice(insertIndex, 0, ...movedTopics);

    return [...builtInTopics, ...orderedTopics, allEntriesTopic]
      .map(normalizeTopic)
      .filter((topic) => {
        if (!topic.id || !topic.title || seen.has(topic.id)) return false;
        seen.add(topic.id);
        return true;
      });
  }

  function renderTopics(topics) {
    list.innerHTML = topics.map((topic) => `
      <a href="${root}topics/${encodeURIComponent(topic.id)}/"${topic.id === currentTopicId ? ' aria-current="page"' : ""}>
        <span class="topic-menu-title">${escapeHtml(topic.title)}</span>
        <span class="topic-menu-arrow" aria-hidden="true">→</span>
      </a>
    `).join("");
    list.setAttribute("aria-busy", "false");
  }

  async function loadTopics() {
    try {
      const response = await fetch(`${root}data/topic-indices.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      renderTopics(mergeTopics(payload.topics || []));
    } catch (error) {
      console.warn("Unable to load topic navigation; showing built-in topics.", error);
      renderTopics(mergeTopics([]));
    }
  }

  function openMenu(event) {
    activeTrigger = event?.currentTarget || triggers[0];
    menu.classList.toggle(
      "topic-menu-centered",
      activeTrigger.dataset.topicMenuPlacement === "center"
    );
    menu.hidden = false;
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "true"));
    document.body.classList.add("topic-menu-open");
    panel.focus();
  }

  function closeMenu(restoreFocus = true) {
    if (menu.hidden) return;
    menu.hidden = true;
    triggers.forEach((trigger) => trigger.setAttribute("aria-expanded", "false"));
    document.body.classList.remove("topic-menu-open");
    if (restoreFocus) activeTrigger.focus();
  }

  triggers.forEach((trigger) => {
    trigger.setAttribute("aria-expanded", "false");
    trigger.addEventListener("click", openMenu);
  });
  menu.addEventListener("click", (event) => {
    if (event.target.closest("[data-topic-menu-close]")) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) closeMenu();
  });

  loadTopics();
}());
