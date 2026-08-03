from __future__ import annotations

import json
import re
import unicodedata
from html import escape
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ENTRIES_PATH = ROOT / "data" / "entries.json"
TOPIC_INDICES_PATH = ROOT / "data" / "topic-indices.json"
SITE_URL = "https://cqpedia.cn"
ITEMS_DIR = ROOT / "items"
TOPICS_DIR = ROOT / "topics"
URLS_PATH = ROOT / "urls.txt"
GENERATED_MARKER = "<!-- GENERATED CQ-PEDIA ENTRY PAGE -->"
GENERATED_TOPIC_MARKER = "<!-- GENERATED CQ-PEDIA TOPIC PAGE -->"
AUDIO_EXTENSIONS = ("wav", "m4a", "mp3", "ogg")
EXAMPLE_AUDIO_SUFFIXES = "abcdefghijklmnopqrstuvwxyz"
INITIALS = ("b", "c", "d", "f", "g", "h", "j", "k", "l", "m", "ng", "p", "q", "r", "s", "t", "v", "w", "x", "y", "z", "other")
INITIAL_MATCH_ORDER = ("ng", "yu", "b", "p", "m", "f", "v", "d", "t", "l", "g", "k", "h", "j", "q", "x", "z", "c", "s", "r", "y", "w")
OTHER_INITIAL = "other"
DEFAULT_TOPIC_INDEXES = (
    {
        "id": "four-character",
        "title": "四字词语",
        "description": "按四字结构汇集的重庆话词语。",
        "generated": "four-character-headword",
        "entries": [],
    },
    {
        "id": "abb-words",
        "title": "ABB式词语",
        "description": "按 ABB 重叠结构汇集的重庆话词语。",
        "generated": "abb-headword",
        "entries": [],
    },
)
ALL_ENTRIES_TOPIC = {
    "id": "all-entries",
    "title": "所有词条",
    "description": "按声母汇集重庆话正音词典的全部词条。",
    "generated": "all-entries",
    "entries": [],
}


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


def entry_title(entry: dict) -> str:
    headword = plain_marked_text(entry.get("headword"))
    pinyin = str(entry.get("pinyin") or "").strip()
    title_parts = [headword]

    if pinyin:
        title_parts.append(pinyin)

    return f"{' | '.join(title_parts)}是什么意思？重庆话词条解释 - 重庆话正音词典 CQ-Pedia"


def topic_title_emoji(title: object) -> str:
    match = re.match(r"^([^\u4e00-\u9fffA-Za-z0-9]+)", str(title or "").strip())
    return match.group(1).strip() if match else ""


def load_entry_topic_badges() -> dict[str, str]:
    try:
        data = json.loads(TOPIC_INDICES_PATH.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        return {}

    badges_by_entry: dict[str, list[str]] = {}
    for topic in data.get("topics") or []:
        emoji = topic_title_emoji(topic.get("title"))
        if not emoji:
            continue

        for entry_id in topic.get("entries") or []:
            entry_id = str(entry_id or "").strip()
            if entry_id:
                badges_by_entry.setdefault(entry_id, []).append(emoji)

    return {entry_id: "/".join(badges) for entry_id, badges in badges_by_entry.items()}


def normalize_topic(topic: dict) -> dict:
    return {
        "id": str(topic.get("id") or "").strip(),
        "title": str(topic.get("title") or topic.get("name") or topic.get("id") or "").strip(),
        "description": str(topic.get("description") or "").strip(),
        "generated": str(topic.get("generated") or "").strip(),
        "entries": [
            str(entry_id or "").strip()
            for entry_id in topic.get("entries") or []
            if str(entry_id or "").strip()
        ],
    }


def load_topic_indexes() -> list[dict]:
    try:
        payload = json.loads(TOPIC_INDICES_PATH.read_text(encoding="utf-8-sig"))
    except FileNotFoundError:
        payload = {}

    topics = []
    seen = set()
    for raw_topic in (*DEFAULT_TOPIC_INDEXES, *(payload.get("topics") or [])):
        topic = normalize_topic(raw_topic)
        if topic["id"] == ALL_ENTRIES_TOPIC["id"]:
            continue
        if not topic["id"] or not topic["title"] or topic["id"] in seen:
            continue
        seen.add(topic["id"])
        topics.append(topic)

    topics.append(normalize_topic(ALL_ENTRIES_TOPIC))

    return topics


def normalized_headword_for_length(entry: dict) -> str:
    text = str(entry.get("headword") or "")
    text = re.sub(r"_\([^)]*\)", "", text)
    text = text.replace("_儿", "").replace("_", "")
    return "".join(
        char for char in text
        if not char.isspace() and unicodedata.category(char)[:1] not in {"P", "S"}
    )


def is_four_character_entry(entry: dict) -> bool:
    return len(normalized_headword_for_length(entry)) == 4


def is_abb_entry(entry: dict) -> bool:
    chars = list(normalized_headword_for_length(entry))
    return len(chars) == 3 and chars[0] != chars[1] and chars[1] == chars[2]


def topic_entries(topic: dict, entries: list[dict]) -> list[dict]:
    entries_by_id = {entry["id"]: entry for entry in entries}
    entry_ids = []

    if topic.get("generated") == "four-character-headword":
        entry_ids.extend(entry["id"] for entry in entries if is_four_character_entry(entry))

    if topic.get("generated") == "abb-headword":
        entry_ids.extend(entry["id"] for entry in entries if is_abb_entry(entry))

    if topic.get("generated") == "all-entries":
        entry_ids.extend(entry["id"] for entry in entries)

    entry_ids.extend(topic.get("entries") or [])
    unique_ids = dict.fromkeys(entry_ids)
    return [entries_by_id[entry_id] for entry_id in unique_ids if entry_id in entries_by_id]


def pinyin_reading_sort_key(reading: str) -> tuple:
    syllables = []
    for token in reading.split():
        match = re.match(r"([A-Za-z]+)(\d+)?", token)
        if match:
            syllables.append((match.group(1).lower(), int(match.group(2) or 9)))
        else:
            syllables.append((token.lower(), 9))

    return tuple(syllables)


def first_syllables(pinyin: object) -> list[str]:
    return [
        re.sub(r"[0-9].*$", "", reading.split()[0].lower())
        for reading in re.split(r"\s*/\s*", str(pinyin or "").strip())
        if reading.split()
    ]


def initial_for_syllable(syllable: str) -> str:
    matched = next((initial for initial in INITIAL_MATCH_ORDER if syllable.startswith(initial)), "")
    if matched == "yu":
        return "y"
    return matched or OTHER_INITIAL


def initials_of(entry: dict) -> list[str]:
    initials = [initial_for_syllable(syllable) for syllable in first_syllables(entry.get("pinyin"))]
    return list(dict.fromkeys(initials or [OTHER_INITIAL]))


def reading_for_initial(entry: dict, initial: str) -> str:
    readings = re.split(r"\s*/\s*", str(entry.get("pinyin") or "").strip())
    for reading in readings:
        syllables = first_syllables(reading)
        if syllables and initial_for_syllable(syllables[0]) == initial:
            return reading
    return readings[0] if readings else ""


def initial_entry_sort_key(entry: dict, initial: str) -> tuple:
    return (
        pinyin_reading_sort_key(reading_for_initial(entry, initial)),
        plain_marked_text(entry.get("headword")),
        str(entry.get("id") or ""),
    )


def pinyin_sort_key(entry: dict) -> tuple:
    reading = re.split(r"\s*/\s*", str(entry.get("pinyin") or "").strip(), maxsplit=1)[0]
    return (
        pinyin_reading_sort_key(reading),
        plain_marked_text(entry.get("headword")),
        str(entry.get("id") or ""),
    )


def topic_display_title(title: object) -> str:
    raw_title = str(title or "").strip()
    emoji = topic_title_emoji(raw_title)
    return raw_title[len(emoji):].strip() if emoji else raw_title

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
        <h3><span>{headword}</span></h3>
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


def render_page(entry: dict, topic_badge: str = "") -> str:
    headword = plain_marked_text(entry.get("headword"))
    title = entry_title(entry)
    description = entry_description(entry)
    canonical = f"{SITE_URL}/items/{entry['id']}/"
    detail_badge = topic_badge

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
    <link rel="stylesheet" href="../../styles.css?v=20260722-header-nav">
    <script src="../../posthog.js"></script>
    <script src="../../baidu-analytics.js"></script>
    <script src="../../topic-menu.js?v=20260722-all-entries" defer></script>
    <script src="../../item-detail.js?v=20260615-detail" defer></script>
    <script src="../../audio.js?v=20260615-audio" defer></script>
  </head>
  <body class="entry-detail-page">
    {GENERATED_MARKER}
    <header class="site-header">
      <a class="brand" href="../../" aria-label="重庆话正音词典首页">
        <img class="brand-icon" src="../../assets/logo-red.svg" alt="" aria-hidden="true">
        <span>CQ-Pedia</span>
      </a>
      <nav class="top-nav dictionary-nav" aria-label="主导航">
        <button type="button" id="mustReadBtn" aria-haspopup="dialog" aria-controls="mustReadModal">必读</button>
        <button type="button" data-topic-menu-trigger data-topic-root="../../" aria-haspopup="dialog" aria-controls="topicNavigationMenu">专题</button>
        <a href="../../phonetic/">音典</a>
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
          <h2 id="aboutTitle">关于</h2>
          <button type="button" class="modal-close" data-about-close aria-label="关闭">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </header>
        <div class="about-content">
          <section class="about-section about-intro" aria-labelledby="aboutSiteTitle">
            <h3 id="aboutSiteTitle">关于本站</h3>
            <div class="about-prose">
              <p>CQ-Pedia 是一个由个人维护的重庆话资料网站。本站整理重庆话及川渝方言词汇，提供读音、释义、例句、用法和相关索引；“重庆话音典”另收录常用汉字读音，方便查阅与学习。</p>
              <p>建设本站，是希望为重庆话留下一个便于使用、可以持续补充的公开入口：既服务日常查词和方言学习，也尽量记录仍在使用或逐渐少见的“老言子儿”。词条、例句、插图、读音和专题内容会继续整理完善。</p>
              <p>本站主要由作者个人编校，资料难免有疏漏。若你熟悉某个词的写法、读音或用例，欢迎提供反馈；也欢迎把网站分享给关心川渝方言的朋友。</p>
            </div>
          </section>
          <div class="about-grid">
            <section class="about-section" aria-labelledby="feedbackSurveyTitle">
              <h3 id="feedbackSurveyTitle">勘误与反馈</h3>
              <p>如果发现词条、读音、标签、例句或说明有误，可以通过问卷提交建议。</p>
              <a class="survey-link about-action" href="https://wj.qq.com/s2/27012512/a2d1/" target="_blank" rel="noopener" aria-label="打开反馈问卷">
                <figure class="survey-code">
                  <img src="../../assets/questionnaire.jpg" alt="反馈问卷二维码">
                </figure>
              </a>
            </section>
            <section class="about-section author-section" aria-labelledby="authorTitle">
              <h3 id="authorTitle">维护与支持</h3>
              <div class="support-content">
                <div class="author-copy">
                  <p>网站由 Rigby 维护。</p>
                  <p>联系邮箱：<a href="mailto:georgeliu677@gmail.com">georgeliu677@gmail.com</a></p>
                  <p>如果本站对你有帮助，也可以自愿赞赏，用于网站的持续整理与维护。</p>
                </div>
                <figure class="donate-code">
                  <img src="../../assets/donate.jpg" alt="赞赏码">
                </figure>
              </div>
            </section>
          </div>
          <section class="about-section acknowledgements-section" aria-labelledby="acknowledgementsTitle">
            <h3 id="acknowledgementsTitle">鸣谢</h3>
            <p>感谢在资料、建议和网站建设方面提供帮助的朋友。</p>
            <div class="acknowledgement-list">
              <a class="acknowledgement-person" href="https://leehenry.top/" target="_blank" rel="noopener">
                <span class="acknowledgement-avatar">
                  <img src="../../assets/acknowledgement/伏枥.webp" alt="伏枥头像">
                </span>
                <span class="acknowledgement-name">伏枥</span>
              </a>
            </div>
            <p class="about-image-note">词条配图多数来自 Unsplash、Pixabay 等免费可商用图库，少部分来自百度百科及媒体文章，仅用于科普展示。如有侵权，请联系删除。</p>
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
          <span>{escape(detail_badge)}</span>
        </div>
        <div class="results">
          {render_entry(entry)}
        </div>
      </section>
    </main>

    <footer class="site-footer">
      <span class="footer-title">
        <img class="footer-mark" src="../../assets/logo-color.svg" alt="" aria-hidden="true">
        <span>重庆话正音词典</span>
      </span>
      <span class="footer-notice">© 2026 CQ-Pedia · 原创内容采用 <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans" target="_blank" rel="license noopener">CC BY-NC 4.0</a> 许可</span>
    </footer>
  </body>
</html>
"""


def render_topic_entry(entry: dict) -> str:
    headword = plain_marked_text(entry.get("headword"))
    pinyin = str(entry.get("pinyin") or "").strip()
    return f"""
          <a class="topic-entry-link" href="../../items/{escape(entry['id'])}/">
            <span class="topic-entry-headword">{render_marked_text(entry.get('headword'))}</span>
            <span class="topic-entry-pinyin">{escape(pinyin)}</span>
            <span class="topic-entry-arrow" aria-hidden="true">→</span>
            <span class="visually-hidden">查看{escape(headword)}的释义与例句</span>
          </a>
    """


def render_topic_modals() -> str:
    return """
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
          <h2 id="aboutTitle">关于</h2>
          <button type="button" class="modal-close" data-about-close aria-label="关闭">
            <svg aria-hidden="true" viewBox="0 0 24 24">
              <path d="M6 6l12 12"></path>
              <path d="M18 6 6 18"></path>
            </svg>
          </button>
        </header>
        <div class="about-content">
          <section class="about-section about-intro" aria-labelledby="aboutSiteTitle">
            <h3 id="aboutSiteTitle">关于本站</h3>
            <div class="about-prose">
              <p>CQ-Pedia 是一个由个人维护的重庆话资料网站。本站整理重庆话及川渝方言词汇，提供读音、释义、例句、用法和相关索引；“重庆话音典”另收录常用汉字读音，方便查阅与学习。</p>
              <p>建设本站，是希望为重庆话留下一个便于使用、可以持续补充的公开入口：既服务日常查词和方言学习，也尽量记录仍在使用或逐渐少见的“老言子儿”。词条、例句、插图、读音和专题内容会继续整理完善。</p>
              <p>本站主要由作者个人编校，资料难免有疏漏。若你熟悉某个词的写法、读音或用例，欢迎提供反馈；也欢迎把网站分享给关心川渝方言的朋友。</p>
            </div>
          </section>
          <div class="about-grid">
            <section class="about-section" aria-labelledby="feedbackSurveyTitle">
              <h3 id="feedbackSurveyTitle">勘误与反馈</h3>
              <p>如果发现词条、读音、标签、例句或说明有误，可以通过问卷提交建议。</p>
              <a class="survey-link about-action" href="https://wj.qq.com/s2/27012512/a2d1/" target="_blank" rel="noopener" aria-label="打开反馈问卷">
                <figure class="survey-code">
                  <img src="../../assets/questionnaire.jpg" alt="反馈问卷二维码">
                </figure>
              </a>
            </section>
            <section class="about-section author-section" aria-labelledby="authorTitle">
              <h3 id="authorTitle">维护与支持</h3>
              <div class="support-content">
                <div class="author-copy">
                  <p>网站由 Rigby 维护。</p>
                  <p>联系邮箱：<a href="mailto:georgeliu677@gmail.com">georgeliu677@gmail.com</a></p>
                  <p>如果本站对你有帮助，也可以自愿赞赏，用于网站的持续整理与维护。</p>
                </div>
                <figure class="donate-code">
                  <img src="../../assets/donate.jpg" alt="赞赏码">
                </figure>
              </div>
            </section>
          </div>
          <section class="about-section acknowledgements-section" aria-labelledby="acknowledgementsTitle">
            <h3 id="acknowledgementsTitle">鸣谢</h3>
            <p>感谢在资料、建议和网站建设方面提供帮助的朋友。</p>
            <div class="acknowledgement-list">
              <a class="acknowledgement-person" href="https://leehenry.top/" target="_blank" rel="noopener">
                <span class="acknowledgement-avatar">
                  <img src="../../assets/acknowledgement/伏枥.webp" alt="伏枥头像">
                </span>
                <span class="acknowledgement-name">伏枥</span>
              </a>
            </div>
            <p class="about-image-note">词条配图多数来自 Unsplash、Pixabay 等免费可商用图库，少部分来自百度百科及媒体文章，仅用于科普展示。如有侵权，请联系删除。</p>
          </section>
        </div>
      </div>
    </div>
    """


def render_topic_page(topic: dict, entries: list[dict]) -> str:
    title = topic["title"]
    display_title = topic_display_title(title)
    description = topic.get("description") or f"重庆话“{title}”专题词表。"
    topic_id = topic["id"]
    canonical = f"{SITE_URL}/topics/{topic_id}/"
    selected_entries = sorted(topic_entries(topic, entries), key=pinyin_sort_key)
    grouped_entries: dict[str, list[dict]] = {}
    for entry in selected_entries:
        for initial in initials_of(entry):
            grouped_entries.setdefault(initial, []).append(entry)

    for initial, initial_entries in grouped_entries.items():
        initial_entries.sort(key=lambda entry: initial_entry_sort_key(entry, initial))

    active_initials = set(grouped_entries)
    initial_nav = "".join(
        f'<a href="#initial-{initial}" aria-label="跳到 {"其他" if initial == OTHER_INITIAL else initial.upper()} 声母">'
        f'{"其他" if initial == OTHER_INITIAL else initial.upper()}</a>'
        if initial in active_initials
        else f'<span aria-disabled="true">{"其他" if initial == OTHER_INITIAL else initial.upper()}</span>'
        for initial in INITIALS
    )

    groups_html = "".join(
        f"""
      <section class="topic-initial-section" id="initial-{initial}" aria-labelledby="initial-title-{initial}">
        <header class="topic-initial-head">
          <h2 id="initial-title-{initial}">{'其他' if initial == OTHER_INITIAL else initial.upper()}</h2>
          <span>{len(grouped_entries[initial])} 词</span>
        </header>
        <div class="topic-entry-grid">
          {''.join(render_topic_entry(entry) for entry in grouped_entries[initial])}
        </div>
      </section>
        """
        for initial in INITIALS
        if grouped_entries.get(initial)
    )

    emoji = topic_title_emoji(title)
    pattern_html = ""
    title_emoji_html = ""
    page_theme = "topic-page-cross"
    if emoji:
        page_theme = "topic-page-emoji"
        emoji_asset = f"../../assets/topic-emoji/{escape(topic_id)}.svg"
        pattern_html = (
            '<div class="topic-emoji-pattern" aria-hidden="true" '
            f'style="--topic-emoji-image: url(\'{emoji_asset}\');"></div>'
        )
        title_emoji_html = (
            f'<span class="topic-title-emoji" aria-hidden="true">{escape(emoji)}</span>'
        )

    structured_data = json.dumps(
        {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": f"{display_title} - 重庆话专题词表",
            "description": description,
            "url": canonical,
            "mainEntity": {
                "@type": "ItemList",
                "numberOfItems": len(selected_entries),
                "itemListElement": [
                    {
                        "@type": "ListItem",
                        "position": index,
                        "name": plain_marked_text(entry.get("headword")),
                        "url": f"{SITE_URL}/items/{entry['id']}/",
                    }
                    for index, entry in enumerate(selected_entries, start=1)
                ],
            },
        },
        ensure_ascii=False,
        separators=(",", ":"),
    ).replace("</", "<\\/")

    return f"""<!doctype html>
<html lang="zh-Hans">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{escape(display_title)} | 重庆话专题词表 - CQ-Pedia</title>
    <meta name="description" content="{escape(description)}">
    <link rel="canonical" href="{escape(canonical)}">
    <meta property="og:title" content="{escape(display_title)} | 重庆话专题词表">
    <meta property="og:description" content="{escape(description)}">
    <meta property="og:url" content="{escape(canonical)}">
    <meta property="og:type" content="website">
    <link rel="icon" href="../../assets/logo-color.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="../../assets/logo-color.svg">
    <link rel="stylesheet" href="../../styles.css?v=20260722-header-nav">
    <script type="application/ld+json">{structured_data}</script>
    <script src="../../posthog.js"></script>
    <script src="../../baidu-analytics.js"></script>
    <script src="../../topic-menu.js?v=20260722-all-entries" defer></script>
    <script src="../../item-detail.js?v=20260615-detail" defer></script>
    <script src="../../topic-page.js?v=20260722-back-to-top" defer></script>
  </head>
  <body class="topic-page {page_theme}" data-topic-id="{escape(topic_id)}">
    {GENERATED_TOPIC_MARKER}
    <header class="site-header">
      <a class="brand" href="../../" aria-label="重庆话正音词典首页">
        <img class="brand-icon" src="../../assets/logo-red.svg" alt="" aria-hidden="true">
        <span>CQ-Pedia</span>
      </a>
      <nav class="top-nav dictionary-nav" aria-label="主导航">
        <button type="button" id="mustReadBtn" aria-haspopup="dialog" aria-controls="mustReadModal">必读</button>
        <button type="button" data-topic-menu-trigger data-topic-root="../../" aria-haspopup="dialog" aria-controls="topicNavigationMenu">专题</button>
        <a href="../../phonetic/">音典</a>
        <button type="button" id="aboutBtn" aria-haspopup="dialog" aria-controls="aboutModal">关于</button>
      </nav>
    </header>

    {render_topic_modals()}

    <main>
      <section class="topic-hero">
        {pattern_html}
        <div class="topic-hero-inner">
          {title_emoji_html}
          <h1>{escape(display_title)}</h1>
          <p class="topic-description">{escape(description)}</p>
          <p class="topic-count"><strong>{len(selected_entries)}</strong><span>词条</span></p>
        </div>
      </section>

      <nav class="topic-initial-nav" aria-label="按声母浏览">
        {initial_nav}
      </nav>

      <div class="topic-main">
        {groups_html}
      </div>
    </main>

    <footer class="site-footer">
      <span class="footer-title">
        <img class="footer-mark" src="../../assets/logo-color.svg" alt="" aria-hidden="true">
        <span>重庆话正音词典</span>
      </span>
      <span class="footer-notice">© 2026 CQ-Pedia · 原创内容采用 <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.zh-hans" target="_blank" rel="license noopener">CC BY-NC 4.0</a> 许可</span>
    </footer>

    <button type="button" class="back-to-search" data-back-to-top aria-label="回到顶部">
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 5 5 12"></path>
        <path d="m12 5 7 7"></path>
        <path d="M12 6v13"></path>
      </svg>
    </button>
  </body>
</html>
"""


def write_entry_pages(entries: list[dict], topic_badges: dict[str, str]) -> None:
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
        page = render_page(entry, topic_badges.get(entry["id"], ""))
        page = "\n".join(line.rstrip() for line in page.splitlines()) + "\n"
        (directory / "index.html").write_text(
            page,
            encoding="utf-8",
            newline="\n",
        )


def write_topic_pages(entries: list[dict], topics: list[dict]) -> None:
    valid_topics = [topic for topic in topics if re.fullmatch(r"[a-z0-9-]+", topic["id"])]
    current_ids = {topic["id"] for topic in valid_topics}
    TOPICS_DIR.mkdir(exist_ok=True)

    for directory in TOPICS_DIR.iterdir():
        if not directory.is_dir() or directory.name in current_ids:
            continue
        index_path = directory / "index.html"
        if index_path.exists() and GENERATED_TOPIC_MARKER in index_path.read_text(encoding="utf-8"):
            index_path.unlink()
            directory.rmdir()

    for topic in valid_topics:
        directory = TOPICS_DIR / topic["id"]
        directory.mkdir(exist_ok=True)
        page = render_topic_page(topic, entries)
        page = "\n".join(line.rstrip() for line in page.splitlines()) + "\n"
        (directory / "index.html").write_text(page, encoding="utf-8", newline="\n")


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


def write_sitemap(entries: list[dict], topics: list[dict]) -> None:
    urls = [
        f"  <url><loc>{SITE_URL}/</loc></url>",
        f"  <url><loc>{SITE_URL}/phonetic/</loc></url>",
        f"  <url><loc>{SITE_URL}/quiz/</loc></url>",
    ]
    urls.extend(f"  <url><loc>{SITE_URL}/items/{escape(entry['id'])}/</loc></url>" for entry in entries)
    urls.extend(f"  <url><loc>{SITE_URL}/topics/{escape(topic['id'])}/</loc></url>" for topic in topics)
    sitemap = "\n".join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        *urls,
        '</urlset>',
        '',
    ])
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8", newline="\n")


def write_urls(entries: list[dict], topics: list[dict]) -> None:
    urls = [f"{SITE_URL}/phonetic/", f"{SITE_URL}/quiz/"]
    urls.extend(f"{SITE_URL}/items/{entry['id']}/" for entry in entries)
    urls.extend(f"{SITE_URL}/topics/{topic['id']}/" for topic in topics)
    URLS_PATH.write_text("\n".join(urls) + "\n", encoding="utf-8", newline="\n")


def main() -> None:
    data = json.loads(ENTRIES_PATH.read_text(encoding="utf-8-sig"))
    entries = data.get("entries") or []
    topics = load_topic_indexes()
    topic_badges = load_entry_topic_badges()
    removed = remove_legacy_root_pages()
    write_entry_pages(entries, topic_badges)
    write_topic_pages(entries, topics)
    write_sitemap(entries, topics)
    write_urls(entries, topics)
    print(f"Generated {len(entries)} entry pages and {len(topics)} topic pages")
    if removed:
        print(f"Removed {removed} legacy root entry pages")


if __name__ == "__main__":
    main()
