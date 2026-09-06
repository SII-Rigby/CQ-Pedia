(function () {
  "use strict";

  const initials = [
    ["b", "p", "把", "ba3"], ["p", "pʰ", "怕", "pa4"], ["m", "m", "妈", "ma1"],
    ["f", "f", "飞", "fei1"], ["v", "v", "雾", "vu4"], ["d", "t", "打", "da3"],
    ["t", "tʰ", "他", "ta1"], ["l", "l", "拉", "la1"], ["g", "k", "哥", "go1"],
    ["k", "kʰ", "课", "ko4"], ["ng", "ŋ", "爱", "ngai4"], ["h", "x", "喝", "ho1"],
    ["j", "tɕ", "鸡", "ji1"], ["q", "tɕʰ", "期", "qi1"], ["x", "ɕ", "西", "xi1"],
    ["z", "ts", "资", "zi1"], ["c", "tsʰ", "此", "ci3"], ["s", "s", "思", "si1"],
    ["r", "z", "日", "ri2"]
  ];

  const finals = [
    ["开口呼", [
      ["a", "a", "妈", "ma1"], ["o", "o", "哥", "go1"], ["i", "ɿ", "资", "zi1"],
      ["e", "e", "额", "nge2"], ["ai", "aɪ", "才", "cai2"], ["ei", "eɪ", "飞", "fei1"],
      ["ao", "au", "包", "bao1"], ["ou", "əu", "口", "kou3"], ["an", "an", "安", "ngan1"],
      ["en", "ən", "跟", "gen1"], ["ang", "ɑŋ", "方", "fang1"], ["er", "ɚɭ", "门儿", "mer2"],
      ["ar", "aɚɭ", "猫儿", "mar1"], ["æ", "æ", "吗", "mæ1"], ["ə", "ə", "个", "gə4"]
    ]],
    ["齐齿呼", [
      ["i", "i", "鸡", "ji1"], ["ia", "ia", "家", "jia1"], ["ie", "ie", "姐", "jie3"],
      ["iai", "iaɪ", "解", "jiai3"], ["iao", "iau", "桥", "qiao2"], ["iu", "iəu", "秋", "qiu1"],
      ["ian", "iɛn", "烟", "yan1"], ["in", "in", "亲", "qin1"], ["iang", "iɑŋ", "羊", "yang2"],
      ["ir", "iɚɭ", "兵儿", "bir1"], ["iar", "iaɚɭ", "眼儿", "yar3"]
    ]],
    ["合口呼", [
      ["u", "ʋ", "猪", "zu1"], ["ua", "ua", "瓦", "wa3"], ["uo", "uo", "屙", "wo1"],
      ["ue", "ue", "国", "gue2"], ["uai", "uaɪ", "快", "kuai4"], ["ui", "ueɪ", "贵", "gui4"],
      ["uan", "uan", "宽", "kuan1"], ["un", "uən", "文", "wen2"], ["uang", "uɑŋ", "光", "guang1"],
      ["ong", "oŋ", "工", "gong1"], ["ur", "uɚɭ", "绳儿", "sur2"], ["uar", "uaɚɭ", "官儿", "guar1"]
    ]],
    ["撮口呼", [
      ["ü", "y", "鱼", "yu2"], ["üu", "ɥu", "俗", "xuu2"], ["üe", "ye", "月", "yue2"],
      ["io", "ɥo", "学", "xio2"], ["üan", "yɛn", "宣", "xuan1"], ["ün", "yn", "军", "jun1"],
      ["iong", "ɥoŋ", "穷", "qiong2"], ["ür", "yɚɭ", "群儿", "qur2"], ["üar", "yaɚɭ", "圈儿", "quar1"]
    ]]
  ];

  const tones = [
    ["阴平", "45", "˦˥", "1", "mā", "妈", "ma1"],
    ["阳平", "21", "˨˩", "2", "mâ", "麻", "ma2"],
    ["上声", "42", "˦˨", "3", "mà", "马", "ma3"],
    ["去声", "213", "˨˩˧", "4", "má", "骂", "ma4"]
  ];

  const escapeHtml = (value) => String(value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function soundCard([symbol, ipa, character, pinyin]) {
    const example = `<button class="play-example" type="button" data-audio-pinyin="${escapeHtml(pinyin)}" aria-label="播放${escapeHtml(character)}，${escapeHtml(pinyin)}">
          <span aria-hidden="true">▶</span>${escapeHtml(character)}
        </button>`;
    return `
      <article class="sound-card">
        <strong class="sound-symbol">${escapeHtml(symbol)}</strong>
        <span class="sound-ipa">[${escapeHtml(ipa)}]</span>
        <div class="sound-example">
          ${example}
          <span class="example-pinyin-teaching" data-pinyin-display>${escapeHtml(pinyin)}</span>
        </div>
      </article>`;
  }

  document.querySelector("#initialGrid").innerHTML = initials.map(soundCard).join("");
  document.querySelector("#finalGroups").innerHTML = finals.map(([title, items]) => `
    <section class="final-group">
      <h3>${escapeHtml(title)}</h3>
      <div class="sound-grid">${items.map(soundCard).join("")}</div>
    </section>`).join("");

  document.querySelector("#toneGrid").innerHTML = tones.map(([name, value, contour, number, marked, character, pinyin]) => `
    <article class="tone-card">
      <strong>${number} · ${escapeHtml(name)}</strong>
      <span class="tone-contour" aria-label="调值${escapeHtml(value)}">${escapeHtml(contour)}</span>
      <p class="tone-value">${value}</p>
      <div class="tone-example">
        <span>${escapeHtml(marked)}</span>
        <button class="play-example" type="button" data-audio-pinyin="${escapeHtml(pinyin)}" aria-label="播放${escapeHtml(character)}">${escapeHtml(character)} ▶</button>
      </div>
    </article>`).join("");

  let audio = null;
  let activeButton = null;
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-audio-pinyin]");
    if (!button) return;
    const pinyin = button.dataset.audioPinyin;
    if (audio) audio.pause();
    activeButton?.classList.remove("is-playing");
    audio = new Audio(`../data/audio/phonetic/${encodeURIComponent(pinyin)}.wav`);
    activeButton = button;
    button.classList.add("is-playing");
    audio.addEventListener("ended", () => button.classList.remove("is-playing"), { once: true });
    audio.addEventListener("error", () => {
      button.classList.remove("is-playing");
      button.title = "这个读音暂时没有录音";
    }, { once: true });
    audio.play().catch(() => button.classList.remove("is-playing"));
  });
}());
