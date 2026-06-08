# 重庆话正音字典示例

这是一个静态词典前端原型。词条数据放在 `data/entries.json`，页面通过 `app.js` 读取并提供词目、拼音、释义和全文搜索。

## 本地预览

由于浏览器直接打开 `index.html` 时可能阻止读取 JSON 文件，建议在项目目录运行：

```powershell
python -m http.server 8000
```

然后访问 `http://localhost:8000/`。

## 数据格式建议

当前用 JSON 存储，适合早期人工整理和版本管理。后续数据量变大后，可以从同一份 JSON 导入 SQLite、PostgreSQL 或搜索引擎索引。

核心字段：

- `id`：稳定唯一编号，不随词目改动。
- `headword`：推荐正字词目。
- `pinyin`：项目当前正音拼写。
- `variants`：可选。只在确有异体写法、俗写、同词不同字形时填写，不要为了占位写空数组或不可靠写法。
- `partOfSpeech`：词性。
- `definitions`：释义数组，便于未来加入多语言释义。
- `examples`：例句、例句读音、普通话译文。
- `tags`：索引分类。
- `notes`：审校说明、来源说明或用法提示。
