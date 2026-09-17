# ČEŠTINA APP · 設計規格書

給 Claude Code 讀取的實作規格。目標：把現有的兩份 HTML 教材（`cestina-L1-L7-slovicka.html`、`cestina-L1-L7-gramatika.html`）整合成一個捷克語學習 App，含單字、文法、聽力、閱讀四大模組。

**核心原則一：不做評分、不做計時、不做排行。** 這不是應試 App。回饋只有「對／錯 + 解釋」與「這個單元學完了沒」。

**核心原則二：架構優先，內容後補。** 使用者已學過 L1–L7 全部內容，本 App 的任務是**整合與複習**，不是首次教學。因此第一階段把頁面與流程做完整，每個模組只放少量示範內容即可跑通，內容分批擴充。

---

## 0. 先讀這段：與參考 App 的關係

參考對象（刷刷庫 / 單字庫類的刷題 App）只借用三個**機制**，其餘一律不抄：

| 借用的機制 | 我們的版本 |
|---|---|
| 內容切成小塊、逐塊推進 | 主題 → 小節（≤10 字）→ 每 4 字一個檢查點 |
| 卡片正／反面 + 收藏星號 | 單字卡 + 精選（★）+ 需加強清單 |
| 題組式測驗（題幹＋選項＋解析） | 選擇題，但只回饋對錯與解析 |

**不借用**：分數、正確率百分比、倒數計時、模擬考、連續登入天數壓力、付費解鎖分級。

---

## 1. 產品定位

- 使用者：中文母語、已修完 Basic Czech I–II（L1 part 1 – L7 part 2）、需要整合複習的學習者。
- 因為內容全部學過，**小節切分與例句用詞不需要受「未學詞」限制**，可自由跨課次組合。
- 介面語言：繁體中文為主，捷克文為學習標的，英文為輔助對照（**英文預設顯示**，可關閉）。
- 平台：**行動優先的 Web App（PWA）**，桌機亦可用。需可離線。

---

## 2. 來源資料與轉換

### 2.1 單字檔 `slovicka.html`

檔內 `<script>` 有兩個陣列，直接解析即可：

```js
const T = [ ["greet","Pozdravy a fráze","招呼・基本片語"], ... ]  // 20 個主題
const D = [ {c, z, e, g, d, s, t, n, r, x, v}, ... ]              // 單字條目
```

| 欄位 | 意義 | 備註 |
|---|---|---|
| `c` | 捷克文 headword | 可能含 `/` 或 `×`，處理規則見 §2.3 |
| `z` | 中文 | |
| `e` | 英文 | |
| `g` | 性別 | `m` 陽性有生命、`mi` 陽性無生命、`f` 陰性、`n` 中性 |
| `d` | `[第2格, 第4格, 第6格]` | 單數；第 1 格＝`c` |
| `s` | 來源 | `L1p1`…`L7p2`，共 11 種 |
| `t` | 主題 id | 對應 `T` |
| `n` | 補充註記 | 中文，內含大量可抽取的結構化資訊（見 §2.4） |
| `r` | vazba／接續要求 | 如 `na + 4. pád` |
| `x` | `[捷克例句, 中文翻譯]` | 目前僅動詞多半有 |
| `v` | 動詞資訊 | `{a, p, f[6], neg, pf?[6]}` |

### 2.2 文法檔 `gramatika.html`

每個 `<div class="gram">` 是一節，含 `<h3>編號 · 標題 <span class="tag">來源</span></h3>` 與表格／段落。共 **58 節**。解析時保留節編號、標題、來源 tag、內文 HTML（表格結構必須保留）。

### 2.3 headword 的斜線與對比符號處理（重要）

`c` 欄裡混了五種不同語意的寫法，**轉換腳本必須分類處理**，不可一律拆或一律留：

| 類型 | 例 | 處理方式 |
|---|---|---|
| **① 人物陰陽性對** | `student / studentka`、`učitel / učitelka`、`prodavač / prodavačka`、`herec / herečka`、`číšník / číšnice`、`manžel / manželka` | **兩形都保留。** `cz` = 陽性形，`czFem` = 陰性形。卡片上並列顯示並標 `M` / `F`，兩形都可朗讀。測驗、變格、搜尋以陽性形為主，陰性形僅供對照。 |
| **② 體對（aspect pair）** | `psát / napsat`、`platit / zaplatit`、`čekat / počkat`、`hasit / uhasit`、`otevřít / zavřít` | **只留第一個。** 體的資訊已存在 `v.p` 與 `v.pf`，且文法區有專節（第 12、50 節）。 |
| **③ 同義變體** | `Ahoj! / Čau!`、`Děkuju! / Děkuji!`、`chleba / chléb`、`záchod / toaleta`、`jen / jenom`、`potom / pak`、`brzo / brzy`、`pohlednice / pohled`、`lidi / lidé`、`raději / radši` | **headword 只留第一個**，其餘收進 `alsoWritten: string[]`，在卡片註記區以「亦作：…」一行呈現。不進測驗、不進搜尋主結果。 |
| **④ 形容詞三性並列** | `bílá / bílý`、`černá / černý`、`zelená / zelený`（顏色主題全部） | headword 改為**陽性形**（`bílý`），下方加一條三性形 `bílý / bílá / bílé`，與其他形容詞卡格式一致。 |
| **⑤ 多詞並排** | `čeština / angličtina / němčina / španělština`、`pondělí / úterý` | **拆成獨立條目**。`-ina` 結尾的語言名依 `-ina → -iny / -inu / -ině` 規則自動補變格。 |
| **⑥ `×` 對比卡** | `nikdy × někdy × vždycky`、`daleko × blízko`、`něco × nic`、`teplo × chladno`、`hodně × málo`、`někde × nikde` | **原樣保留，不拆。** 這是刻意設計的對比教學卡，`pos` 標為 `contrast-set`，卡片改用左右對照版型。 |

分類方式：先寫規則（含 `×` → ⑥；顏色主題 → ④；`v` 欄存在且兩形為體對 → ②；`g` 為 `m` 且第二形以 `-ka/-ice/-kyně` 結尾 → ①），**剩餘無法自動判定的一律列進 `content/REPORT.md` 的待確認清單**，人工核對後寫進 `authored/headword-overrides.json`。

### 2.4 重複條目合併

資料裡有同一個詞出現多筆的情況（`guláš`、`obchod`、`narozeniny`、`týden`、`sobota`、`neděle`、`zelenina`、`moct`、`jet`、`máslo`、`restaurace`、`patro`、`chléb` 等，分屬不同課次或主題）。

**合併成單一 Word**：
- `sources: Source[]`（陣列）
- `topics: string[]`（陣列）——該字在多個主題清單下都會出現，但**共用同一張卡、同一個 wordId**
- `note` 合併去重
- ★ 精選與需加強狀態因此不會分裂

### 2.5 註記欄 `n` 的再利用

`n` 欄藏了不少結構化資訊，轉換腳本要用正則抽出來：

- **反義／對照**：`↔ starý`、`× hořký`、`對照 poslouchat` → `relations: [{type:"antonym"|"contrast", ref}]`
- **同族詞**：`-kaz 字族`、`同族：celý・celkem` → `relations: [{type:"family"}]`
- **只有複數**：`只有複數形` → `pluraleTantum: true`（格位條改顯示複數格位）
- **片語例句**：`Mám chuť na pivo.` → 併入 `examples`
- **易混淆標記**：`注意與 horký 熱的 區分`、`mýt 洗 × mít 有` → `confusables: string[]`，供測驗誘答使用

抽不出來的殘留文字留在 `note` 原樣顯示。

### 2.6 轉換產出

```
content/
  topics.json
  words.json
  grammar.json
  units.json
  listening.json
  reading.json
  audio-manifest.json
  REPORT.md              # 每次轉換產生的檢查報告
content/authored/         # 人工／AI 撰寫，腳本不可覆寫
  headword-overrides.json
  unit-titles.json
  examples.json
  grammar-quiz.json
  grammar-explanations.json
  listening-items.json
  reading-items.json
```

`scripts/ingest.ts` **必須可重跑**。人工內容由腳本 merge，永不覆寫。

---

## 3. 資料模型

```ts
type Gender = "m" | "mi" | "f" | "n";
type Source = "L1p1"|"L1p2"|"L2p1"|"L2p2"|"L3p1"|"L3p2"|"L4p1"|"L5"|"L6"|"L7p1"|"L7p2";

interface Word {
  id: string;              // 穩定 slug，例：w_pokoj
  cz: string;              // headword（陽性形 / 第一形）
  czFem?: string;          // 類型①的陰性形
  alsoWritten?: string[];  // 類型③的同義變體
  contrastSet?: string[];  // 類型⑥的對比成員
  zh: string;
  en: string;
  pos: "noun"|"verb"|"adj"|"adv"|"phrase"|"num"|"prep"|"pron"|"contrast-set"|"other";
  gender?: Gender;
  pluraleTantum?: boolean;

  declension?: {
    sg: { nom: string; gen: string; acc: string; loc: string };
    pl?: { nom?: string; gen?: string; acc?: string; loc?: string };
  };

  adjForms?: { m: string; f: string; n: string };   // 形容詞三性

  verb?: {
    aspect: "impf"|"pf";
    pair?: string;
    verbClass: 1|2|3|4;                              // 變化類，見 §4.2
    present: [string,string,string,string,string,string];
    pairPresent?: string[];
    negation?: string;
    past?: { m: string; f: string; n: string; plAnim: string; plOther: string };
    imperative?: { ty: string; vy: string };
    reflexive?: "se"|"si"|null;
  };

  rekce?: string;
  note?: string;
  relations?: { type: "antonym"|"synonym"|"contrast"|"family"|"derived"; ref: string; label?: string }[];
  confusables?: string[];

  examples: Example[];
  topics: string[];        // 可屬多個主題
  units: string[];         // 可屬多個小節
  sources: Source[];
  grammarRefs?: number[];
}

interface Example {
  id: string;
  cz: string;
  zh: string;
  en?: string;
  targetForm: string;      // 句中該字實際出現的形
  case?: 1|2|4|6;
  person?: 1|2|3|4|5|6;
  origin: "textbook"|"generated";
  reviewed: boolean;
  audio?: string;
}

interface Unit {
  id: string;              // u_city_01
  topicId: string;
  index: number;
  title: { cz: string; zh: string };
  wordIds: string[];       // ≤ 10（餘數併入時可到 12）
  checkpoints: number[];   // [4, 8, 10]
}

interface GrammarSection {
  id: string;              // g12
  number: number;
  titleCz: string;
  titleZh: string;
  source: Source;
  categories: GrammarCategory[];   // 可多屬
  bodyHtml: string;
  relatedWordIds: string[];
}

type GrammarCategory =
  | "pronunciation" | "person-tense" | "case-1" | "case-2" | "case-4" | "case-6"
  | "adjective" | "pronoun" | "verb-type" | "motion-verbs" | "frequency-time"
  | "number-date" | "preposition" | "syntax" | "situation";
```

### 使用者狀態（本地）

```ts
interface UserState {
  starred: string[];
  needsWork: Record<string, number>;   // wordId -> 連續答對次數
  unitProgress: Record<string, { status: "new"|"in-progress"|"done"; lastWordIndex: number; checkpointsPassed: number[] }>;
  grammarProgress: Record<string, "new"|"read"|"quizzed">;
  listeningDone: string[];
  readingDone: string[];
  settings: {
    audioSpeed: 0.75 | 1.0;
    autoplayCard: boolean;
    showEnglish: boolean;      // 預設 true
    theme: "paper"|"dark";
  };
}
```

**持久化**：IndexedDB（主）＋ localStorage（settings 鏡射）。必須提供「匯出／匯入 JSON」，避免清瀏覽器資料就全毀。

---

## 4. 單字模組

### 4.1 分頁結構

```
主題 (19)  →  小節 (每節 ≤10 字)  →  單字卡  →  檢查點測驗
```

**小節切分規則**（`scripts/ingest.ts`）：

1. 主題內依 `sources` 首個來源排序（L1p1 → L7p2），同來源維持原始順序。
2. 每 10 個字切一節；餘數 ≥4 自成一節，餘數 <4 併入前一節（該節最多 12 字，檢查點改 `[4,8,12]`）。
3. **允許跨課次混合**——使用者已學完全部內容，不需要 i+1 限制。
4. 小節標題自動產生：`{主題中文} ・ 第 N 節`，副標為首尾單字（`muž → holka`）。可用 `authored/unit-titles.json` 覆寫。

### 4.2 動詞獨立成模組

`verb` 主題的條目遠多於其他主題（切出十幾節），**不放在主題清單裡跟「顏色」並列**。

動詞獨立為一個入口，依**變化類**分區：

| 分區 | 內容 | 對應文法節 |
|---|---|---|
| 第 1 類 `-AT → -ÁM` | dělat, znát, čekat, hledat… | 12 |
| 第 2 類 `-IT/-ET/-ĚT → -ÍM` | mluvit, prosit, vidět, bydlet… | 12 |
| 第 3 類 `-OVAT → -UJU` | studovat, pracovat, kupovat… | 24 |
| 第 4 類 不規則 | jít, jet, číst, psát, pít, žít, mýt… | 35 |
| 情態動詞 | muset, moct, chtít, smět, mít + inf. | 43, 46 |
| 移動動詞對 | jít×chodit, jet×jezdit | 36, 47 |
| 反身動詞 | dívat se, ptát se, těšit se, učit se, dát si… | 13, 50 |

`verbClass` 由 `ingest.ts` 依不定式字尾 + `v.f[0]` 字尾推導；情態與移動動詞以白名單指定。一個動詞可同時出現在「第 4 類」與「移動動詞對」兩區。

### 4.3 主題清單頁

- 卡片網格：主題中文、捷克文、單字總數、小節進度（`3 / 7 節`）。
- 進度用格狀小方塊（已完成填滿／進行中半填／未開始空白），**不顯示百分比或分數**。
- 篩選列：來源（L1p1…L7p2）、僅看 ★、僅看需加強。
- 頂部獨立放「動詞」大卡片（因為它是獨立模組）。

### 4.4 單字卡頁面（核心畫面）

單一直式卡片，全螢幕，左右滑動換字，底部 `3 / 10`。

由上到下：

1. **來源標籤**（右上小字，多來源時顯示最早的一個 + `…`）＋ **★ 精選鈕**
2. **捷克文 headword**（最大字級）＋ 性別標籤（`M 有生命` 藍 / `M 無生命` 淡藍 / `F` 紅 / `N` 綠）
   - 類型①：第二行並列陰性形，前綴 `F`，可獨立朗讀
3. **朗讀鈕**：大顆喇叭。點擊播放；長按＝0.75 倍速。設定可開「進頁自動播放」。
4. **中文**（中字級）／**英文**（斜體，預設顯示）
5. **格位條**（名詞）：`1 / 2 / 4 / 6` 四格橫條，變化的字尾用黃色 highlight，每格右側小喇叭
   - `pluraleTantum` 改顯示複數格位並加註「只有複數形」
6. **三性形**（形容詞）：`bílý / bílá / bílé` 一行
7. **動詞表**（動詞）：6 個人稱兩欄（未完成／完成體），否定形單獨一列，每列可朗讀；上方標變化類（`第 3 類 -OVAT`）
8. **vazba 用法條**（有 `rekce` 時）：紅框，點擊連到對應文法節
9. **例句區**（見 §4.5）
10. **註記**：黃色左邊線；若有 `alsoWritten`，第一行為「亦作：Čau!」
11. **關聯詞**：反義／對照／同族 chip，點擊跳轉

**對比卡版型**（`pos: "contrast-set"`）：headword 區改為左右（或三欄）對照，每欄有自己的中文與例句，共用一組註記。

**不做音標。** 不顯示 IPA、不顯示方括號近似音，不做發音規則抽屜。發音靠語音。

### 4.5 例句要求

**現況**：原始資料只有動詞多半有例句，名詞幾乎沒有。

**目標規格**：
- **名詞**：4 句，分別示範第 1、2、4、6 格，標 `case`
- **動詞**：3 句，涵蓋不同人稱（1sg / 3sg / 2pl），並示範 `rekce`
- **形容詞**：3 句，涵蓋三性
- **片語／招呼語**：1 句情境對話

**但初版不必補齊。** 依核心原則二，第一階段每個主題只補 3–5 個字的完整例句作為示範，其餘顯示「格位條 + 教材原有例句」即可。UI 必須能優雅處理「例句不足」的情況（少於 4 句就顯示現有的，不留空位、不報錯）。

**例句產生方式**（見 §12.3）：模板生成 + 自動驗證 + 人工複核，`origin: "generated"`、`reviewed: true/false`。App 預設只顯示 `reviewed: true` 的句子。

呈現：捷克文粗體、目標字 highlight、中文在下、右側喇叭。

### 4.6 一個小節的進行流程

```
卡片1–4 → 【檢查點測驗 A（4 題）】
卡片5–8 → 【檢查點測驗 B（4 題）】
卡片9–10 → 【小節總測驗（6 題，涵蓋全節）】
→ 完成頁
```

- 檢查點測驗**只考剛學的那 4 個字**，一字一題。
- 總測驗從該節抽 6 題，優先抽先前答錯的字。
- 答錯 → 加入 `needsWork`，計數歸零；之後每答對一次 +1，**連續答對 2 次**移出。
- 完成頁：本節單字一覽（可直接點★）、「再測一次」、「下一節」、「回主題」。**不顯示正確率**。
- 可隨時中斷，回來從 `lastWordIndex` 續讀。
- **例句不足的字如何出題**：若該字沒有可挖空的例句，改用「中英文 → 選捷克字」的純詞義題型，不跳過。

### 4.7 單字測驗題型

**選項一律使用原形（headword 形）**，考的是詞義與詞彙辨識，不是形態。形態留給文法測驗。

- **題型 1（有例句時）**：例句挖空
  ```
  Mám hezký ______ .
  我有個好看的房間。
  I have a nice room.

  [ pokoj 🔊 ]  [ byt 🔊 ]  [ dům 🔊 ]
  ```
  挖空處以底線呈現，**選項顯示原形**；作答後才顯示句中的正確變格形，並說明「這裡是第 4 格，pokoj 陽性無生命第 4 格與第 1 格同形」。

- **題型 2（無例句時）**：純詞義
  ```
  「房間」／ room

  [ pokoj 🔊 ]  [ byt 🔊 ]  [ dům 🔊 ]
  ```

- **選項規則**：3 個選項，每個旁邊有喇叭，**點喇叭播放捷克文、點選項本體才算作答**。
- **誘答挑選順序**：
  1. 該字的 `confusables`（教材標過的易混淆字）
  2. 同小節、同詞性、同性別
  3. 同主題、同詞性
  4. 拼寫相近（Levenshtein ≤ 2）
  5. 同來源分頁隨機同詞性
- **作答後**：
  - 正確 → 綠框、播放完整例句語音
  - 錯誤 → 紅框標所選、綠框標正解、**一行解釋**、提供「回看這張卡」
- **「不確定，直接看答案」按鈕**固定在底部：**不算答錯**，但該字進 `needsWork`。

### 4.8 精選（★）與需加強

- **精選清單**：跨主題瀏覽、可依主題／來源分組、「開始複習」→ 純卡片流，可選擇附帶測驗。
- **需加強清單**：自動蒐集，顯示「還需答對 N 次」。可一鍵複習。
- 兩個清單都可全部清空或單筆移除。
- 首頁「今天複習」卡：`★ 12 個 ・ 需加強 5 個`，點進去是混合複習流（最多 15 題）。

---

## 5. 語音

### 5.1 TTS 產生流程

建置期的一次性工作：腳本把所有捷克文字串送去語音服務，換回 mp3 存進 `public/audio/`。App 執行時只播放本地檔案，**不連任何外部服務**。

**服務：`edge-tts`**
- 語音：`cs-CZ-AntoninNeural`（男）、`cs-CZ-VlastaNeural`（女）
- 免費、不需帳號、不需信用卡，音質等同 Azure Neural
- 風險：非官方管道，微軟改版可能失效。**但 mp3 產生後就是本地檔案，腳本失效不影響已產生的音檔**，只影響日後新增內容。
- 因此 `scripts/tts.ts` 必須寫成**服務可抽換**的形式：`interface TtsProvider { synth(text, voice): Promise<Buffer> }`，`EdgeTtsProvider` 為預設，預留 `AzureTtsProvider` 實作骨架，切換只需改設定。

**產生範圍**：
- 每個 headword（含 `czFem`）
- 每個變格形（`declension.sg` 四格）
- 每個動詞人稱形（6 × 1–2 體）
- 每個 `reviewed: true` 的例句
- 聽力題全部音檔（對話用兩個不同 voice）

**檔名**：`audio/{sha1(text+voice).slice(0,12)}.mp3`，寫入 `audio-manifest.json`（`text → file`）。腳本**只補新增的、已存在的跳過**。

**備援**：Web Speech API (`lang="cs-CZ"`)。僅在音檔缺失時使用，並提示「此裝置可能無捷克語語音」。iOS 預設不含捷克語音，不可當主力。

### 5.2 離線策略

- **預載**：headword、變格形、動詞人稱形（短音檔，體積小）→ Service Worker 於首次啟動時快取
- **隨用隨快取**：例句、聽力題、閱讀朗讀（體積大）→ 播放過才存
- 設定頁提供「下載全部音檔」與「清除音檔快取」，顯示目前佔用空間

### 5.3 播放器行為

- 單例播放器：新音檔播放中斷前一個
- 卡片切換時停止播放
- 測驗選項的語音**不排隊**，點哪個播哪個，直接中斷前一個
- 慢速用 `HTMLAudioElement.playbackRate = 0.75`（不另存檔案）
- 全域靜音開關

---

## 6. 文法模組

### 6.1 分區

58 節依 `GrammarCategory` 重新歸類（不照課本順序，照學習邏輯）。一節可屬多區：

| 區塊 | 節編號 |
|---|---|
| 發音與拼寫 | 1 |
| 人稱與時態 | 2, 11, 12, 24, 31, 32, 35, 43, 44, 46, 50 |
| 第 1 格（主格） | 4, 5, 7, 23 |
| 第 2 格（屬格） | 3, 20, 27 |
| 第 4 格（賓格） | 13, 15, 23, 51, 54, 55 |
| 第 6 格（位格） | 39, 41 |
| 形容詞與副詞 | 6, 17, 18, 29 |
| 代名詞與所有格 | 8, 51, 54, 57 |
| 動詞特殊用法 | 14, 19, 36, 43, 46, 47 |
| 頻率與時間 | 10, 21, 30, 49 |
| 數字與日期 | 9, 20, 27 |
| 介系詞 | 37, 38, 39, 41, 42 |
| 語序與句法 | 13, 50, 52, 53, 56 |
| 實用場景 | 22, 25, 26, 33, 34, 42, 45, 58 |

區塊清單頁顯示節數與已讀狀態。

### 6.2 文法節閱讀頁

- 保留原教材表格結構，**表格橫向可捲動，行動裝置不可溢出**（沿用原檔的 `.tscroll` 做法）
- 捷克文例句全部可朗讀（自動掃描 `.cz-i` 內容包上播放器）
- 例句中的字若在 `words.json` 找得到 → 點擊彈出單字小卡（中文、格位、★ 鈕）
- 頂部「本節相關單字」chip 列
- 底部固定按鈕「做個小測驗」

### 6.3 文法測驗

**選項一律使用同一個詞的不同變格／人稱**，考的是形態。

**題型 A — 變格選擇**
```
Jsem v ______ .            我在布拉格。
[ Praha ]  [ Prahy ]  [ Praze ]
```
選項由 `declension` 直接生成，取 3–4 形（含正解）。

**題型 B — 人稱變化**
```
Moji rodiče ______ v Praze.
[ žiju ]  [ žije ]  [ žijou ]  [ žijeme ]
```
選項由 `verb.present` 生成。

**題型 C — 二選一對比**（特殊用法節專用）
```
Každý den ______ do školy pěšky.
[ jdu ]  [ chodím ]
```
用於 jít×chodit、jet×jezdit、znát×vědět×umět、mít rád×líbí se、už×ještě、musím×smím×můžu、do×na、spolu×dohromady。**這類題必須有解析**。

**題型 D — 介系詞＋格**
```
Jdu ______ kina.        Jdu ______ koncert.
[ do ]  [ na ]  [ v ]
```

**題庫**：目標每節 ≥8 題、測驗抽 6 題；**初版每節先寫 3 題即可跑通**。存 `authored/grammar-quiz.json`：

```json
{
  "sectionId": "g15",
  "items": [{
    "id": "g15_q1",
    "type": "declension",
    "stem": "Znáte ______ ?",
    "stemZh": "您認識諾瓦克先生嗎？",
    "lemma": "pan Novák",
    "options": ["pan Novák", "pana Nováka", "panu Novákovi"],
    "answer": 1,
    "explain": "znát + 第 4 格；陽性有生命第 4 格加 -a，名與姓都要變。"
  }]
}
```

測驗完成 → 每題回顧（題幹、你的答案、正解、解析），可跳回文法節對應段落。

---

## 7. 聽力模組

**初版只做架構與各 Part 2–3 題示範內容**，題庫日後另行整理擴充。

### Part L1 — 看圖選句
- 1 張圖 + 3 句捷克短句語音（不給文字），選出描述正確的一句
- 句長 4–8 字
- **初版暫不實作**（插圖是純美術工，最後補）。資料結構與頁面先預留。

### Part L2 — 聽問選答（優先實作）
- 聽一個問句（不給文字）+ 3 個口語回應，選出合理的回應
- 題材：`Odkud jsi?` / `Kolik je hodin?` / `Máš čas?` / `Co si dáte?` / `Kam jdeš?` / `Kolik to stojí?`
- 誘答設計：一個答非所問但字面相近（問 `Kam?` 卻答 `V Praze.`）、一個格位或人稱錯誤
- **這個 Part 最適合練 kam×kde、do×na**

### Part L3 — 短對話（次優先）
- 2–4 個來回，兩個說話者（不同 TTS voice）
- 每段 2 題，選項為中文
- 題材：點餐、問路、買東西、約時間、宿舍生活、看牙醫（L7 課文）
- 對話全文（捷／中對照）作答後才顯示，可逐句重聽

### 共通
- 可重聽，**不限次數**，不計時
- 難度標 `A`（L1–L3 詞彙）／`B`（L1–L5）／`C`（L1–L7），使用者可自選
- 作答後列出「本題出現的單字」chip，可直接★或跳轉

```ts
interface ListeningItem {
  id: string;
  part: "L1" | "L2" | "L3";
  level: "A" | "B" | "C";
  topicRefs: string[];
  vocabRefs: string[];
  image?: string;
  script: { speaker: "A"|"B"; cz: string; zh: string }[];
  questions: {
    id: string;
    promptCz?: string;
    promptZh?: string;
    options: { cz?: string; zh?: string; audio?: boolean }[];
    answer: number;
    explain: string;
  }[];
}
```

---

## 8. 閱讀模組

**初版同樣只做架構與各 Part 2–3 篇示範**，目標量為 R1×15、R2×10、R3×6，日後補齊。

### Part R1 — 標示與告示（優先實作）
- 直接用 `signs` 主題素材：`VCHOD` / `VÝCHOD` / `OTEVŘENO` / `MIMO PROVOZ` / `POKLADNA` / `ŠATNA`…
- 用 CSS 做成仿真標示牌（不用圖片），問「你在哪裡會看到？」「這代表什麼？」
- 每題 1 問，選項中文

### Part R2 — 實用短文本
- 菜單、課表、簡訊、便條、購物清單、車票、申請表（第 34 節欄位）
- 長度 20–50 字，每則 1–2 題（找資訊型）

### Part R3 — 短文
- 60–100 字敘述文，仿教材課文風格（Hanna / Juan / Honza 的日常）
- 每則 2–3 題：主旨 1、細節 1–2

### 共通（**點字查詞是最重要的功能，優先做**）
- 文章任一字可點擊 → 彈出單字小卡（原形、中文、格位、★）
  - 需要一個「變格形 → 原形」的反查索引，由 `ingest.ts` 建立（把所有 `declension`、`verb.present`、`targetForm` 建成 `form → wordId` 的 map）
- 中譯整篇可展開／收合，預設收合
- 朗讀全文，句子逐句 highlight

---

## 9. 資訊架構與導覽

底部 4 個 tab（行動版）：

```
單字        文法         練習       我的
Slovíčka    Gramatika    Cvičení    Já
```

- **單字**：主題清單（含動詞獨立入口）→ 小節清單 → 卡片流 → 測驗
- **文法**：區塊清單 → 節清單 → 閱讀 → 測驗
- **練習**：聽力／閱讀入口，各自分 Part 與難度
- **我的**：★ 精選、需加強、進度總覽、設定、匯出／匯入

### 「跟著課本走」線性模式

首頁另外提供一個入口，把同一課次的內容串成一條線：

```
L1 part 1
  ├ 單字：招呼語 8 個 ・ 標示 12 個
  ├ 文法：第 1 節 發音與拼寫
  └ 練習：聽力 L2 ×2

L1 part 2
  ├ 單字：人與國籍 15 個 ・ 城市場所 10 個
  ├ 文法：第 2、3、4 節
  └ 練習：閱讀 R1 ×3
```

- **與主題模式共用同一份資料與同一套進度狀態**，只是排序與分組不同
- 同一個字在兩種模式下的 ★、需加強狀態完全一致
- 多來源的字（§2.4 合併過的）在最早的課次出現一次即可，後續課次以淡色標「已在 L1p2 出現」

### 全域搜尋

頂部搜尋列，沿用現有 HTML 的體驗：
- 捷／中／英三向查詢
- **去變音符搜尋**（`cestina` 找得到 `čeština`）——沿用 `normalize("NFD")` 做法
- **變格形也要搜得到**（輸入 `Praze` 找到 `Praha`），用 §8 的反查索引
- 結果分組：單字 / 文法節 / 例句，命中片段 highlight

---

## 10. 視覺設計

沿用現有 HTML 的視覺語言（紙張質感、格線背景、實用主義排版）：

```css
--paper:#EDEAE1;  --paper-2:#F6F4EF;  --ink:#191A1C;  --ink-soft:#5C5E63;
--rule:#CFCABC;   --red:#C4162A;      --blue:#1F4E8C; --marker:#F2D14B;
--green:#2C6E52;
```

- 字型：`Archivo` / `Archivo Narrow`（拉丁）、`Noto Sans TC`（中文）、`IBM Plex Mono`（標籤、格位）
- 性別色全 App 一致：`M 有生命` 藍、`M 無生命` 淡藍、`F` 紅、`N` 綠
- 格位標記一律 `IBM Plex Mono` 的 `1 / 2 / 4 / 6`
- 重點 highlight 一律 `--marker` 黃
- 深色模式：`paper` 反轉 `#16171A`，marker 改低飽和金

**行動優先**：卡片寬度 100%，最小觸控目標 44×44px，喇叭鈕不得與文字重疊。桌機最大寬 1080px 置中。

動效克制：卡片切換水平位移 180ms，答題回饋顏色淡入 120ms。尊重 `prefers-reduced-motion`。

---

## 11. 技術選型

| 項目 | 選擇 |
|---|---|
| 框架 | React 18 + TypeScript + Vite |
| 樣式 | Tailwind + CSS 變數 |
| 路由 | React Router |
| 狀態 | Zustand |
| 儲存 | IndexedDB（`idb`）+ localStorage |
| PWA | `vite-plugin-pwa` |
| 內容 | 靜態 JSON + 音檔，隨 build 部署 |
| TTS | `edge-tts`（建置期腳本，Python） |
| 測試 | Vitest（邏輯）+ Playwright（關鍵流程） |

**無後端。** 所有資料本地化。

```
/content            # 產生的 JSON
/content/authored   # 人工／AI 撰寫，腳本不可覆寫
/public/audio       # TTS 產生的 mp3
/scripts            # ingest.ts / tts.ts / gen-examples.ts / validate.ts
/src
  /components
  /features
    /vocab  /grammar  /listening  /reading  /review
  /lib
    audio.ts        # 播放器
    quiz.ts         # 題目生成與誘答
    lemma.ts        # 變格形 → 原形反查
    storage.ts
  /styles
```

---

## 12. 實作順序

### M0 — 資料管線
- `scripts/ingest.ts`：解析兩份 HTML → JSON
- headword 六類分類邏輯（§2.3），無法自動判定的列進 REPORT
- 重複條目合併（§2.4）、註記抽取（§2.5）、`verbClass` 推導、變格反查索引
- `scripts/validate.ts`：id 唯一、必要欄位齊全、unit ≤12 字、每個 `topics/sources` 有效
- 產出 `content/REPORT.md`：各主題字數、缺例句清單、待人工確認的 headword 清單

### M1 — 單字模組（無語音）
主題頁 → 小節頁 → 卡片流 → 檢查點測驗。格位條、動詞表、對比卡版型、★、本地儲存。動詞獨立入口。

### M2 — 語音
`scripts/tts.ts`（edge-tts，provider 可抽換）+ manifest + Service Worker 快取策略。卡片、測驗選項、例句接上播放器。

### M3 — 例句（示範量）
`gen-examples.ts` + 驗證（§12.3）。每個主題先補 3–5 個字的完整四格例句作為示範。

### M4 — 文法模組
區塊分類 + 閱讀頁（表格可捲動、例句可朗讀、單字可點擊）+ 測驗（題型 A–D，每節先 3 題）。

### M5 — 複習系統
精選清單、需加強清單、混合複習流、首頁「今天複習」、「跟著課本走」線性模式。

### M6 — 聽力與閱讀
資料結構與介面先做完整。內容：Part L2 ×3、L3 ×2、R1 ×3、R2 ×2、R3 ×2 作為示範。Part L1 頁面預留但不實作。

### M7 — PWA、深色模式、匯出匯入、無障礙檢查

### 12.3 例句生成與驗證流程

由 AI 生成並自檢，不依賴使用者校對捷克文。**用模板生成，不自由造句**：

1. **句型模板固定**
   - 第 1 格：`To je {adj-nom} {noun-nom}.`
   - 第 2 格：`{noun-nom} je bez {noun-gen}.` / `Jdu do {noun-gen}.`
   - 第 4 格：`Mám {adj-acc} {noun-acc}.` / `Vidím {noun-acc}.`
   - 第 6 格：`Jsem v {noun-loc}.` / `Mluvíme o {noun-loc}.`
2. **代入的形直接取自資料的 `declension`**，程式不自行推導變格
3. **修飾語從既有形容詞庫挑**，性數格由程式配對，不手寫
4. **自動驗證**（`scripts/validate-examples.ts`）：
   - 標註的 `case` 與模板是否相符
   - 句中每個字是否都在詞庫中找得到
   - 形容詞性別是否與名詞一致
   - 介系詞與格位搭配是否正確（`v` + 6、`do` + 2、`bez` + 2、`na` + 4/6）
   - 目標字的 `targetForm` 是否真的出現在句中
5. **語意複核**：生成後逐批人工過一次，剔除文法對但語意怪的句子（如 `Mám ošklivý pokoj.`）
6. 通過的標 `reviewed: true`，App 只顯示這些

**已知限制**：模板句會偏僵硬。這是刻意取捨——寧可句子平淡而正確，不要生動而錯誤。

---

## 13. 明確不做的事

- 不計分、不顯示正確率百分比、不計時
- 不做 streak / 連續登入 / 推播催促
- 不做排行榜、社群、分享成績
- 不做付費牆或分級解鎖
- 不做完整 SRS 排程（`needsWork` 的「連對 2 次」已足夠）
- 不做手寫辨識、發音評分
- **不顯示音標**（IPA 或方括號近似都不做），發音資訊一律靠語音
- 不對單字測驗使用變格形選項（那是文法測驗的工作）

---

## 14. 每日一句（iOS 桌面小工具，延伸功能）

不屬於主 App 的四大模組，是獨立的輕量延伸：用 iOS 的 **Scriptable** 讀取主 App 產生的靜態 JSON，在桌面顯示每日一句捷克文＋中文，點擊可 deep link 回主 App 的對應單字卡。不需要原生開發、不需要上架、不需要開發者帳號。

### 15.1 資料產出：`scripts/gen-daily.ts`

從 `content/words.json` 裡所有 `origin: "textbook"` 且 `reviewed: true` 的例句中篩選，產生固定順序的每日清單，寫入 `content/daily.json`（與其他 `content/*.json` 一起隨主 App 部署，不需要額外的空間或服務）。

**篩選條件**（挑「適合單獨呈現、不需要上下文就看得懂」的句子）：

- 長度 3–8 個捷克文字（太短像 `To je pravda.` 沒有學習價值，太長超出小工具版面）
- 不是挖空模板生成的句子（排除 `origin: "generated"`），只用 `textbook` 或已審過的自然例句
- 不含代名詞開頭且缺乏上下文會看不懂的句子（例如 `Znám ho.` 不知道 ho 是誰）——用簡單規則過濾：句首若為 `On/Ona/Ono/Oni/To/Ten/Ta` 且句中無具體名詞則排除
- 優先挑常用招呼語、日常短句、情境對話中的單句（`greet`、`travel`、`shop`、`restaurant` 主題優先）
- 每句記錄來源 `wordId`，供點擊 deep link 使用

**排序**：不隨機，**依固定索引排序**（可先按主題與課次順序排，讓幾個月下來慢慢從 L1 走到 L7），存成陣列，選句時用「天數 % 陣列長度」對應到固定的一句。

```ts
interface DailyItem {
  index: number;      // 陣列位置，同時也決定哪一天出現
  cz: string;
  zh: string;
  wordId: string;      // 供 deep link
}
```

**去重與循環**：陣列跑完一輪後從頭開始（例如 200 句可以撐 200 天，之後重複）。若之後想避免重複，可在 `gen-daily.ts` 加入「排除近 30 天出現過的」邏輯，但初版不需要，句子夠多的話重複週期已經很長。

**驗證**：`scripts/validate.ts` 加一項檢查——`daily.json` 裡的每個 `wordId` 都必須在 `words.json` 裡存在（deep link 才不會連到不存在的卡片）。

### 15.2 靜態空間

`daily.json` **跟著主 App 一起部署，不需要另外找地方放**。主 App 本來就是純靜態內容（§11：無後端，靜態 JSON + 音檔），部署到哪裡（GitHub Pages、Cloudflare Pages、Vercel 等）`daily.json` 就自動在那個網域下的 `/content/daily.json`。

Scriptable 抓取沒有跨網域（CORS）限制，直接用完整網址 `https://你的網域/content/daily.json` 即可。

**deep link**：`APP_BASE_URL` 設成主 App 的單字卡路由，例如 `https://你的網域/word/`，接上 `wordId` 就能從桌面小工具直接跳進 App 對應那張卡。這代表**單字卡的路由需要支援直接用 wordId 開啟**（不必先經過主題→小節），實作時 React Router 開一條 `/word/:id` 的路徑，內部自動查出該字所屬的 unit 並載入卡片即可。

### 15.3 Scriptable 腳本

腳本本身（`cestina-daily-widget.js`）不放在主 App 專案裡，是使用者手動貼進 Scriptable App 的獨立檔案，設計要點：

- 抓取 JSON 成功就寫入本機快取（`FileManager`），下次沒網路直接讀快取，避免顯示空白
- 選句公式與 `gen-daily.ts` 一致：`(今天與起算日的天數差) % 陣列長度`，兩邊的起算日 `START_DATE` 需手動保持一致
- 點擊小工具用 `widget.url` 開啟 `APP_BASE_URL + wordId`
- 視覺沿用主 App 的色票（`--paper` `--ink` `--red` 等），維持一致感

安裝步驟：開 Scriptable App → 新增腳本 → 貼上程式碼 → 桌面長按加入小工具 → 選 Scriptable → 編輯小工具指定剛才那個腳本。

---

## 15. 已確認的決策紀錄

| # | 決策 |
|---|---|
| 1 | 導覽主軸為主題，另提供「跟著課本走」線性入口，共用同一份資料與進度 |
| 2 | 小節切分**允許跨課次混合**（使用者已學完全部內容） |
| 3 | 動詞獨立成模組，按變化類分區 |
| 4 | 重複條目合併為單一 Word，`topics` / `sources` 改為陣列 |
| 5 | headword 斜線分六類處理：①人物陰陽性保留 ②體對只留第一個 ③同義變體收進「亦作」 ④形容詞改陽性形+三性行 ⑤多詞並排拆開 ⑥`×` 對比卡原樣保留 |
| 6 | 內容分批：架構先做完整，例句與題庫初版只放示範量 |
| 7 | 單字測驗用**原形**選項；文法測驗用**變格形**選項 |
| 8 | 「直接看答案」不算答錯，但該字進需加強清單 |
| 9 | 英文**預設顯示** |
| 10 | TTS 用 `edge-tts`，provider 介面可抽換 |
| 11 | 音檔離線：單字與變格形預載，例句／聽力隨用隨快取 |
| 12 | **取消音標功能** |
| 13 | 聽力初版只做 Part L2、L3 少量示範；Part L1（看圖）頁面預留不實作 |
| 14 | 閱讀目標量 R1×15 / R2×10 / R3×6，初版各 2–3 篇 |
| 15 | 例句由 AI 模板生成 + 自動驗證 + 自行語意複核，不依賴使用者校對 |
| 16 | iOS 桌面小工具用 Scriptable 讀取主 App 的靜態 `daily.json`，不做原生 WidgetKit；單字卡路由需支援 `/word/:id` 直連以供 deep link |
