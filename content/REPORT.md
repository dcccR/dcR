# 轉換報告

產生時間：2026-09-17T16:00:01.719Z

## 來源

- 單字：`content/seed/raw-words.json（種子資料，尚未放入真實 HTML）`
- 文法：`content/seed/raw-grammar.json（種子資料，尚未放入真實 HTML）`

## 總量

- 原始條目 87 筆 → 合併後單字 85 個
- 主題 9 個（其中動詞為獨立模組）
- 小節 16 節
- 文法 10 節
- 反查索引 645 個形

## 各主題字數與小節

| 主題 | 單字 | 小節 |
|---|---:|---:|
| 招呼・基本片語 Pozdravy a fráze | 7 | 1 |
| 標示與告示 Nápisy a značky | 7 | 1 |
| 人與國籍 Lidé a národnosti | 12 | 1 |
| 城市與場所 Město a místa | 8 | 1 |
| 居住 Bydlení | 7 | 1 |
| 飲食 Jídlo a pití | 13 | 2 |
| 顏色 Barvy | 5 | 1 |
| 時間與星期 Čas a dny | 8 | 1 |
| 動詞 Slovesa | 20 | 7 |

## 動詞分區

| 分區 | 動詞數 | 小節 |
|---|---:|---:|
| 第 1 類 -AT → -ÁM | 3 | 1 |
| 第 2 類 -IT/-ET/-ĚT → -ÍM | 6 | 1 |
| 第 3 類 -OVAT → -UJU | 3 | 1 |
| 第 4 類 不規則 | 8 | 1 |
| 情態動詞 | 3 | 1 |
| 移動動詞對 | 4 | 1 |
| 反身動詞 | 3 | 1 |

## 待人工確認的 headword

把判定寫進 `content/authored/headword-overrides.json`，鍵為原始 headword，

`type` 可填 `gender-pair` / `aspect-pair` / `variant` / `adjective` / `split` / `contrast`。

| headword | 來源 | 自動判定說明 |
|---|---|---|
| `Ahoj! / Čau!` | L1p1 | 兩形拼寫不近，無法自動判定（預設為③同義變體） |

## 缺例句的名詞

共 38 個（§4.5 目標是每個名詞 4 句、示範第 1／2／4／6 格；初版每主題補 3–5 個即可，UI 會優雅處理例句不足）

- **標示與告示**：vchod、východ、pokladna、šatna
- **人與國籍**：učitel、kamarád、Čech、muž、kluk、holka、čeština、angličtina、němčina、španělština
- **城市與場所**：nádraží、kino、náměstí、obchod、restaurace
- **居住**：byt、dům、kuchyň、koupelna、záchod、patro
- **飲食**：obchod、restaurace、chleba、voda、maso、polévka、zelenina、máslo、guláš
- **時間與星期**：pondělí、úterý、sobota、neděle、týden、narozeniny

## 缺例句的其他詞性

共 21 個

- **招呼・基本片語**：Ahoj!（phrase）、Dobrý den!（phrase）、Na shledanou!（phrase）、Děkuju!（phrase）、Prosím!（phrase）、Promiňte!（phrase）
- **標示與告示**：OTEVŘENO（adv）、ZAVŘENO（adv）、MIMO PROVOZ（phrase）
- **城市與場所**：daleko × blízko（contrast-set）
- **飲食**：horký（adj）、hořký（adj）
- **顏色**：černý（adj）、červený（adj）、zelený（adj）、modrý（adj）
- **時間與星期**：nikdy × někdy × vždycky（contrast-set）、hodně × málo（contrast-set）
- **動詞**：mýt（verb）、jezdit（verb）、ptát se（verb）

## 缺變格資料的名詞

- úterý（L6）

## 其他警告

（無）
