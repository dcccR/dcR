# ČEŠTINA APP

捷克語整合複習 App。規格見 [`docs/design-spec.md`](docs/design-spec.md)，
程式架構見 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)（含流程圖）。依規格實作，目前完成 **M0 資料管線** 與 **M1 單字模組（無語音）**。

不計分、不計時、不排行。回饋只有「對／錯 + 解釋」與「這個單元學完了沒」。

## 跑起來

```bash
npm install
npm run ingest      # 來源 → content/*.json + content/REPORT.md
npm run validate    # id 唯一、unit ≤12 字、雙向參照一致…
npm run dev
```

其他指令：`npm run build`、`npm test`（Vitest，41 項）、`npm run e2e`（Playwright 煙霧測試）。

## 來源資料

`scripts/ingest.ts` 優先讀 `sources/` 裡的兩份教材 HTML：

```
sources/cestina-L1-L7-slovicka.html    # 內含 const T / const D
sources/cestina-L1-L7-gramatika.html   # 內含 div.gram
```

**兩份 HTML 目前還沒放進來**，所以管線暫時讀 `content/seed/` 的種子資料——它的形狀與 HTML 解析結果**完全相同**（`T` / `D` 陣列、文法節陣列）。把真實 HTML 放進 `sources/` 之後重跑 `npm run ingest`，整條管線不用改任何一行，內容就會換成教材全量。

種子目前有 9 個主題、85 個字、16 個小節、10 節文法，足以跑通所有畫面與測驗題型。

## 產出與人工內容

```
content/                 # 腳本產生，可整個刪掉重跑
  topics.json  words.json  units.json  grammar.json  lemma-index.json
  listening.json  reading.json        # M6 用，目前是空陣列
  REPORT.md                           # 每次轉換的檢查報告
content/authored/        # 人工／AI 撰寫，腳本只讀不寫
  headword-overrides.json             # §2.3 判不出來的 headword 分類
  unit-titles.json                    # 覆寫自動產生的小節標題
  examples.json                       # 補的例句
```

`content/REPORT.md` 每次轉換都會列出：各主題字數、動詞分區、**待人工確認的 headword**、缺例句與缺變格的字。待確認的項目寫進 `authored/headword-overrides.json` 即可，下次轉換就會照人工判定走。

## 已實作的規格重點

- **§2.3 headword 六類**：①人物陰陽性保留 ②體對只留第一個 ③同義變體收進「亦作」 ④形容詞改陽性形＋三性行 ⑤多詞並排拆開（`-ina` 語言名自動補變格） ⑥`×` 對比卡原樣保留。判不出來的進 REPORT，不猜。
- **§2.4 重複條目合併**：同一個字只有一張卡、一個 wordId，`topics` / `sources` 為陣列，★ 與需加強狀態不會分裂。合併鍵用原拼寫，`hořký` 與 `horký` 不會被去變音符併在一起。
- **§2.5 註記抽取**：反義 `↔`、對照 `×`、同族、只有複數、片語例句、易混淆標記。抽不出來的原樣留在 `note`。
- **§4.1 小節切分**：每 10 字一節，餘數 ≥4 自成一節、<4 併入前一節；併起來會超過 12 字時改從前一節借字，兩節都落在 4–12。
- **§4.2 動詞獨立模組**：`verbClass` 由不定式字尾＋現在式第一人稱推導，情態與移動動詞走白名單；一個動詞可同時屬於「第 4 類」與「移動動詞對」。
- **§4.4 單字卡**：來源標籤、★、性別色、格位條（變化字尾黃色 highlight）、三性行、動詞表（含否定形）、vazba 紅框、例句、註記、關聯詞 chip、對比卡左右版型。不做音標。
- **§4.6–4.7 測驗**：檢查點只考剛學的 4 個字；總測驗抽 6 題並優先抽答錯過的字；**選項一律原形**；誘答依 confusables → 同小節同性別 → 同主題 → 拼寫相近（Levenshtein ≤2）→ 同來源；例句不足的字改考純詞義，不跳過；「不確定，直接看答案」不算答錯但進需加強；連續答對 2 次才移出需加強。
- **§3 持久化**：IndexedDB 主、localStorage 鏡射 settings，可匯出／匯入 JSON。

中文字型用 **芫荽體 Iansui**（Google Fonts），拉丁／捷克文維持 Archivo・Archivo Narrow，標籤與格位維持 IBM Plex Mono。Iansui 只有 400 一個字重，中文粗體是瀏覽器合成的假粗體。

語音目前是 Web Speech API 備援（§5.1 的 fallback）；M2 會換成建置期產生的本地 mp3 + manifest，`src/lib/audio.ts` 已預留切換點。

## 還沒做

M2 語音、M3 例句補齊、M4 文法模組（資料已就位，分頁先列出節清單）、M5 複習系統與「跟著課本走」、M6 聽力閱讀、M7 PWA 與無障礙。
