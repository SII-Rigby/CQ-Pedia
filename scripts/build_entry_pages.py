from __future__ import annotations

import json
import re
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRIES_PATH = ROOT / "data" / "entries.json"
SITE_URL = "https://cqpedia.cn"
ITEMS_DIR = ROOT / "items"
URLS_PATH = ROOT / "urls.txt"
GENERATED_MARKER = "<!-- GENERATED CQ-PEDIA ENTRY PAGE -->"
AUDIO_EXTENSIONS = ("wav", "m4a", "mp3", "ogg")
EXAMPLE_AUDIO_SUFFIXES = "abcdefghijklmnopqrstuvwxyz"


def plain_marked_text(value: object) -> str:
    return str(value or "").replace("_", "")


def render_marked_text(value: object) -> str:
    raw_text = str(value or "")

    def replace_mark(match: re.Match[str]) -> str:
        text = match.group(2) or f"({match.group(1)})"
        escaped_text = escape(text)
        return f'<span class="erhua" aria-label="{escaped_text}">{escaped_text}</span>'

    parts: list[str] = []
    last_index = 0
    for match in re.finditer(r"_\(([^)]*)\)|_(.)", raw_text):
        parts.append(escape(raw_text[last_index:match.start()]))
        parts.append(replace_mark(match))
        last_index = match.end()

    parts.append(escape(raw_text[last_index:]))
    return "".join(parts)


def split_list(value: object) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]

    return [item.strip() for item in re.split(r"[；;、,，\n]+", str(value or "")) if item.strip()]


def variants_of(entry: dict) -> list[str]:
    return split_list(entry.get("variants"))


def contributors_of(entry: dict) -> list[str]:
    return split_list(entry.get("contributor") or entry.get("contributors"))


def entry_description(entry: dict) -> str:
    definitions = entry.get("definitions") or []
    first_definition = ""
    for item in definitions:
        first_definition = plain_marked_text(item.get("text"))
        if first_definition:
            break

    parts = [
        plain_marked_text(entry.get("headword")),
        entry.get("pinyin"),
        entry.get("wordClass"),
        first_definition,
    ]
    return "，".join(str(part).strip() for part in parts if str(part or "").strip())[:150]


def audio_button(label: str, src: str) -> str:
    return f"""
    <button type="button" class="audio-button" data-audio-src="{escape(src)}" aria-label="{escape(label)}" aria-pressed="false">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path class="speaker-body" d="M4 9h4l5-4v14l-5-4H4z"></path>
        <path class="speaker-wave speaker-wave-one" d="M16 9.5c1.1 1.3 1.1 3.7 0 5"></path>
        <path class="speaker-wave speaker-wave-two" d="M18.6 7c2.3 2.9 2.3 7.1 0 10"></path>
      </svg>
    </button>
  """


def existing_audio_path(relative_base: str) -> str:
    for extension in AUDIO_EXTENSIONS:
        relative_path = f"{relative_base}.{extension}"
        if (ROOT / relative_path).exists():
            return f"../../{relative_path}"

    return ""


def entry_audio_path(entry: dict) -> str:
    return existing_audio_path(f"data/audio/entries/{entry['id']}")


def example_audio_path(entry: dict, index: int) -> str:
    suffix = EXAMPLE_AUDIO_SUFFIXES[index] if index < len(EXAMPLE_AUDIO_SUFFIXES) else str(index + 1)
    return existing_audio_path(f"data/audio/examples/{entry['id']}-{suffix}")


def render_audio_button(label: str, src: str) -> str:
    return audio_button(label, src) if src else ""


def render_example(example: dict | None, entry: dict | None = None, index: int = 0) -> str:
    if not example or not any(str(example.get(key) or "").strip() for key in ("text", "pinyin", "translation")):
        return ""

    pinyin = f'<p class="example-pinyin">{escape(str(example.get("pinyin")))}</p>' if example.get("pinyin") else ""
    translation = f'<p class="example-translation">{render_marked_text(example.get("translation"))}</p>' if example.get("translation") else ""
    audio = render_audio_button(
        f"播放{plain_marked_text(entry.get('headword'))}例句{index + 1}",
        example_audio_path(entry, index),
    ) if entry else ""

    return f"""
    <div class="example">
      <p class="example-line"><strong>例：</strong><span>{render_marked_text(example.get("text"))}</span>{audio}</p>
      {pinyin}
      {translation}
    </div>
  """


def render_note(note: object, modifier: str = "") -> str:
    if not str(note or "").strip():
        return ""

    class_name = f"note {modifier}" if modifier else "note"
    return f"""
    <aside class="{class_name}">
      <span>注</span>
      <p>{render_marked_text(note)}</p>
    </aside>
  """


def render_figure(entry: dict, prefix: str = "../../") -> str:
    fig = entry.get("fig")
    if not fig:
        return ""

    image_src = f"{prefix}data/fig/{entry['id']}.png" if fig is True else str(fig)
    alt = f"{plain_marked_text(entry.get('headword') or entry.get('id'))} 插图"
    return f"""
    <figure class="entry-figure">
      <img src="{escape(image_src)}" alt="{escape(alt)}" loading="lazy">
    </figure>
  """


def render_contributors(entry: dict) -> str:
    contributors = contributors_of(entry)
    if not contributors:
        return ""

    return f"""
    <p class="contributors">
      <span>贡献者</span>{escape("、".join(contributors))}
    </p>
  """


def render_entry(entry: dict, link_headword: bool = False) -> str:
    definitions = entry.get("definitions") or []
    examples = entry.get("examples") or []
    blocks = []

    for index, item in enumerate(definitions):
        example_html = render_example(examples[index] if index < len(examples) else None, entry, index)
        note_html = render_note(item.get("note"), "definition-note")
        blocks.append(f"""
        <section class="definition-block">
          <p class="definition-text"><span class="definition-number">{index + 1}.</span>{render_marked_text(item.get("text"))}</p>
          {note_html}
          {example_html}
        </section>
      """)

    extra_examples = "".join(
        render_example(item, entry, len(definitions) + index)
        for index, item in enumerate(examples[len(definitions):])
    )
    definition_fallback = "".join(blocks) or """
      <section class="definition-block">
        <p class="definition-text">暂无释义。</p>
      </section>
    """
    variants = variants_of(entry)
    variants_html = f'<p class="variants">异体写法：{render_marked_text("、".join(variants))}</p>' if variants else ""
    note = render_note(entry.get("note") or entry.get("notes"), "entry-note")
    figure = render_figure(entry)
    contributors = render_contributors(entry)
    entry_audio = render_audio_button(f"播放{plain_marked_text(entry.get('headword'))}读音", entry_audio_path(entry))
    headword = render_marked_text(entry.get("headword"))
    if link_headword:
        headword = f'<a href="../{escape(entry["id"])}/">{headword}</a>'

    return f"""
    <article class="entry">
      <div class="entry-head">
        <h3>{headword}</h3>
        <span class="pos">{escape(str(entry.get("wordClass") or ""))}</span>
      </div>
      <div class="entry-audio-line">
        <p class="pinyin">{escape(str(entry.get("pinyin") or ""))}</p>
        {entry_audio}
      </div>
      {variants_html}
      {note}
      {figure}
      <div class="definitions">{definition_fallback}</div>
      {extra_examples}
      {contributors}
    </article>
  """


def render_page(entry: dict) -> str:
    headword = plain_marked_text(entry.get("headword"))
    title = f"{headword} - 重庆话正音词典"
    description = entry_description(entry)
    canonical = f"{SITE_URL}/items/{entry['id']}/"

    return f"""<!doctype html>
<html lang="zh-Hans">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{escape(title)}</title>
    <meta name="description" content="{escape(description)}">
    <link rel="canonical" href="{escape(canonical)}">
    <meta property="og:title" content="{escape(title)}">
    <meta property="og:description" content="{escape(description)}">
    <meta property="og:url" content="{escape(canonical)}">
    <meta property="og:type" content="article">
    <link rel="icon" href="../../assets/logo-color.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="../../assets/logo-color.svg">
    <link rel="stylesheet" href="../../styles.css">
    <script src="../../item-detail.js?v=20260615-detail" defer></script>
    <script src="../../audio.js?v=20260615-audio" defer></script>
  </head>
  <body class="entry-detail-page">
    {GENERATED_MARKER}
    <header class="site-header">
      <a class="brand" href="../../" aria-label="重庆话正音词典首页">
        <span>CQ-Pedia</span>
      </a>
      <nav class="top-nav" aria-label="主导航">
        <button type="button" id="mustReadBtn" aria-haspopup="dialog" aria-controls="mustReadModal">必读</button>
        <button type="button" id="aboutBtn" aria-haspopup="dialog" aria-controls="aboutModal">关于</button>
      </nav>
    </header>

    <div class="modal" id="mustReadModal" role="dialog" aria-modal="true" aria-labelledby="mustReadTitle" hidden>
      <div class="modal-backdrop" data-modal-close></div>
      <div class="modal-window" role="document">
        <header class="modal-head">
          <h2 id="mustReadTitle">必读</h2>
          <button type="button" class="modal-close" data-modal-close aria-label="关闭">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </header>
        <div class="modal-body">
          <aside class="doc-nav" aria-label="文档目录">
            <ul id="docList"></ul>
          </aside>
          <article class="doc-view" id="docView" tabindex="0">
            <p class="empty">载入中...</p>
          </article>
        </div>
      </div>
    </div>

    <div class="modal about-modal" id="aboutModal" role="dialog" aria-modal="true" aria-labelledby="aboutTitle" hidden>
      <div class="modal-backdrop" data-about-close></div>
      <div class="modal-window about-window" role="document">
        <header class="modal-head">
          <div>
            <p class="modal-kicker">About CQ-Pedia</p>
            <h2 id="aboutTitle">关于</h2>
          </div>
          <button type="button" class="modal-close" data-about-close aria-label="关闭">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </header>
        <div class="about-content">
          <section class="about-section author-section" aria-labelledby="authorTitle">
            <h3 id="authorTitle">求打赏</h3>
            <div class="author-copy">
              <span class="author-role">作者</span>
              <p class="author-name">Rigby</p>
              <p class="author-email">georgeliu677@gmail.com</p>
            </div>
            <figure class="donate-code">
              <img src="../../assets/donate.jpg" alt="赞赏码">
            </figure>
          </section>
          <section class="about-section" aria-labelledby="feedbackSurveyTitle">
            <h3 id="feedbackSurveyTitle">反馈</h3>
            <a class="survey-link" href="https://wj.qq.com/s2/27012512/a2d1/" target="_blank" rel="noopener" aria-label="打开反馈问卷">
              <figure class="survey-code">
                <img src="../../assets/questionnaire.jpg" alt="反馈问卷二维码">
              </figure>
            </a>
          </section>
        </div>
      </div>
    </div>

    <main>
      <section class="entry-detail-hero">
        <p class="platform-label">重庆话正音词典</p>
        <h1>{render_marked_text(entry.get("headword"))}</h1>
      </section>

      <section class="results-panel entry-detail-panel" aria-label="{escape(headword)}词条">
        <div class="results-head">
          <p>{escape(entry["id"])}</p>
          <span>词条</span>
        </div>
        <div class="results">
          {render_entry(entry)}
        </div>
        <p class="entry-detail-back"><a href="../../">返回首页搜索</a></p>
      </section>
    </main>

    <footer class="site-footer">
      <span class="footer-title">
        <img class="footer-mark" src="../../assets/logo-color.svg" alt="" aria-hidden="true">
        <span>重庆话正音词典</span>
      </span>
      <span>CQ-Pedia</span>
    </footer>
  </body>
</html>
"""


def write_entry_pages(entries: list[dict]) -> None:
    current_ids = {entry["id"] for entry in entries}
    ITEMS_DIR.mkdir(exist_ok=True)

    for directory in ITEMS_DIR.glob("cq-[0-9][0-9][0-9][0-9][0-9]"):
        index_path = directory / "index.html"
        if directory.name not in current_ids and index_path.exists() and GENERATED_MARKER in index_path.read_text(encoding="utf-8"):
            index_path.unlink()
            directory.rmdir()

    for entry in entries:
        directory = ITEMS_DIR / entry["id"]
        directory.mkdir(exist_ok=True)
        (directory / "index.html").write_text(render_page(entry), encoding="utf-8", newline="\n")


def remove_legacy_root_pages() -> int:
    removed = 0
    for directory in ROOT.glob("cq-[0-9][0-9][0-9][0-9][0-9]"):
        index_path = directory / "index.html"
        if not index_path.exists():
            continue

        if GENERATED_MARKER not in index_path.read_text(encoding="utf-8"):
            continue

        index_path.unlink()
        directory.rmdir()
        removed += 1

    return removed


def write_sitemap(entries: list[dict]) -> None:
    urls = [f"  <url><loc>{SITE_URL}/</loc></url>"]
    urls.extend(f"  <url><loc>{SITE_URL}/items/{escape(entry['id'])}/</loc></url>" for entry in entries)
    sitemap = "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        *urls,
        '</urlset>',
        '',
    ])
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8", newline="\n")


def write_urls(entries: list[dict]) -> None:
    urls = [f"{SITE_URL}/items/{entry['id']}/" for entry in entries]
    URLS_PATH.write_text("\n".join(urls) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    data = json.loads(ENTRIES_PATH.read_text(encoding="utf-8-sig"))
    entries = data.get("entries") or []
    removed = remove_legacy_root_pages()
    write_entry_pages(entries)
    write_sitemap(entries)
    write_urls(entries)
    print(f"Generated {len(entries)} entry pages in items/ and sitemap.xml")
    if removed:
        print(f"Removed {removed} legacy root entry pages")


if __name__ == "__main__":
    main()
