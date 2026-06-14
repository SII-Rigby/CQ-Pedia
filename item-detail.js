(function () {
  const DOC_PREFIX = "../../";
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

  const aboutEls = {
    btn: document.querySelector("#aboutBtn"),
    modal: document.querySelector("#aboutModal")
  };

  const docCache = new Map();
  let activeDocId = null;

  const escapeHtml = (value) => String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

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
    if (!modalEls.list) return;

    modalEls.list.innerHTML = MUST_READ_DOCS
      .map((doc) => `<li><button type="button" data-doc="${doc.id}">${escapeHtml(doc.title)}</button></li>`)
      .join("");

    modalEls.list.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-doc]");
      if (!button) return;
      showDoc(button.dataset.doc);
    });
  }

  async function showDoc(id) {
    const doc = MUST_READ_DOCS.find((item) => item.id === id);
    if (!doc || !modalEls.view || !modalEls.list) return;

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
      const response = await fetch(`${DOC_PREFIX}${doc.file}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = renderMarkdown(await response.text());
      docCache.set(id, html);
      if (activeDocId === id) {
        modalEls.view.innerHTML = html;
        modalEls.view.scrollTop = 0;
      }
    } catch (error) {
      console.error(error);
      modalEls.view.innerHTML = `<p class="empty">无法读取 ${escapeHtml(doc.file)}。请通过本地服务器或部署后的网址访问此页面。</p>`;
    }
  }

  function openMustReadModal() {
    if (!modalEls.modal) return;
    modalEls.modal.hidden = false;
    document.body.classList.add("modal-open");
    if (!activeDocId) {
      showDoc(MUST_READ_DOCS[0].id);
    }
  }

  function closeMustReadModal() {
    if (!modalEls.modal) return;
    modalEls.modal.hidden = true;
    document.body.classList.remove("modal-open");
    modalEls.btn?.focus();
  }

  function openAboutModal() {
    if (!aboutEls.modal) return;
    aboutEls.modal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeAboutModal() {
    if (!aboutEls.modal) return;
    aboutEls.modal.hidden = true;
    document.body.classList.remove("modal-open");
    aboutEls.btn?.focus();
  }

  buildDocList();

  modalEls.btn?.addEventListener("click", openMustReadModal);
  modalEls.modal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-modal-close]")) {
      closeMustReadModal();
    }
  });

  aboutEls.btn?.addEventListener("click", openAboutModal);
  aboutEls.modal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-about-close]")) {
      closeAboutModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;

    if (modalEls.modal && !modalEls.modal.hidden) {
      closeMustReadModal();
    }

    if (aboutEls.modal && !aboutEls.modal.hidden) {
      closeAboutModal();
    }
  });
}());
