// §2.3 headword 的斜線與對比符號處理。
// 六類各自的語意不同，不可一律拆或一律留；自動判不出來的一律列進 REPORT.md。

import type { RawWord } from "./raw.js";

export type HeadwordKind =
  | "plain"
  | "gender-pair"   // ① student / studentka
  | "aspect-pair"   // ② psát / napsat
  | "variant"       // ③ Ahoj! / Čau!
  | "adjective"     // ④ bílá / bílý
  | "split"         // ⑤ čeština / angličtina / …
  | "contrast";     // ⑥ nikdy × někdy × vždycky

export interface Classified {
  kind: HeadwordKind;
  /** 本條目要產生的 headword（⑤ 會產生多個）。 */
  entries: {
    cz: string;
    czFem?: string;
    alsoWritten?: string[];
    contrastSet?: string[];
    adjForms?: { m: string; f: string; n: string };
    declension?: [string, string, string];
    /** 原始 d 欄的變格是否屬於這個形（⑤ 拆分後只有第一形適用）。 */
    useRawDeclension: boolean;
  }[];
  needsReview: boolean;
  reason: string;
}

const FEM_SUFFIX = /(ka|ice|kyně|ička|ová)$/;
const ADJ_FEM = /á$/;
const ADJ_MASC = /ý$/;

/** ④ 的另一種寫法：教材把形容詞記成 `který, -á, -é`（真實資料共 86 筆）。 */
const ADJ_TRIPLE = /^(.+?ý),\s*-á,\s*-é$/;

/**
 * 斜線兩側沒有空白、右側只有一兩個字母，是陰陽性詞尾縮寫而非並列：
 * `Nemohl/a byste to napsat?`、`Chtěl/a bych…`。整句原樣保留，絕對不可拆。
 */
const INWORD_SLASH = /\S\/[a-záéíóúůýčďěňřšťž]{1,2}(?![^\s])/u;

/** ④：陰性形 bílá → 三性 bílý / bílá / bílé。 */
function adjFormsFromMasc(masc: string) {
  const stem = masc.replace(/ý$/, "");
  return { m: `${stem}ý`, f: `${stem}á`, n: `${stem}é` };
}

/** ⑤：`-ina` 結尾的語言名自動補變格（-iny / -inu / -ině）。 */
function autoDeclension(word: string): [string, string, string] | undefined {
  if (/ina$/.test(word)) {
    const stem = word.slice(0, -1); // čeština → češtin
    return [`${stem}y`, `${stem}u`, `${stem}ě`];
  }
  return undefined;
}

export interface Overrides {
  [headword: string]: { type: HeadwordKind; note?: string };
}

export function classify(raw: RawWord, overrides: Overrides = {}): Classified {
  const c = raw.c.trim();
  const forced = overrides[c]?.type;

  // ④ `který, -á, -é` 記法：headword 取陽性形，三性形由字尾推出。
  const triple = ADJ_TRIPLE.exec(c);
  if (triple && !forced) {
    const masc = triple[1];
    return {
      kind: "adjective",
      entries: [{ cz: masc, adjForms: adjFormsFromMasc(masc), useRawDeclension: true }],
      needsReview: false,
      reason: "形容詞三性記法 `X, -á, -é`",
    };
  }

  // ⑥ 對比卡：原樣保留，不拆。
  if (c.includes("×") || forced === "contrast") {
    const members = c.split("×").map((s) => s.trim()).filter(Boolean);
    return {
      kind: "contrast",
      entries: [{ cz: c, contrastSet: members, useRawDeclension: true }],
      needsReview: false,
      reason: "含 × 對比符號",
    };
  }

  // 詞尾縮寫的斜線不是並列符號，整串當一個 headword。
  if (!forced && INWORD_SLASH.test(c) && !/\s\/\s/.test(c)) {
    return {
      kind: "plain",
      entries: [{ cz: c, useRawDeclension: true }],
      needsReview: false,
      reason: "斜線為陰陽性詞尾縮寫（Nemohl/a），不是並列",
    };
  }

  if (!c.includes("/")) {
    return {
      kind: "plain",
      entries: [{ cz: c, useRawDeclension: true }],
      needsReview: false,
      reason: "單一 headword",
    };
  }

  const parts = c.split("/").map((s) => s.trim()).filter(Boolean);

  const build = (kind: HeadwordKind): Classified => {
    switch (kind) {
      case "gender-pair":
        return {
          kind,
          entries: [{ cz: parts[0], czFem: parts[1], useRawDeclension: true }],
          needsReview: false,
          reason: "陽性形 + -ka/-ice/-kyně 陰性形",
        };
      case "aspect-pair":
        return {
          kind,
          entries: [{ cz: parts[0], useRawDeclension: true }],
          needsReview: false,
          reason: "體對，體資訊已在 v.p / v.pf",
        };
      case "adjective": {
        const masc = parts.find((p) => ADJ_MASC.test(p)) ?? parts[parts.length - 1];
        return {
          kind,
          entries: [{ cz: masc, adjForms: adjFormsFromMasc(masc), useRawDeclension: true }],
          needsReview: false,
          reason: "形容詞三性並列，headword 改陽性形",
        };
      }
      case "split":
        return {
          kind,
          // 原始 d 欄只描述第一形，其餘形自動補或留空（列進 REPORT）。
          entries: parts.map((p, i) => ({
            cz: p,
            declension: autoDeclension(p),
            useRawDeclension: i === 0,
          })),
          needsReview: false,
          reason: "多詞並排，拆成獨立條目",
        };
      case "variant":
      default:
        return {
          kind: "variant",
          entries: [{ cz: parts[0], alsoWritten: parts.slice(1), useRawDeclension: true }],
          needsReview: false,
          reason: "同義變體，其餘收進「亦作」",
        };
    }
  };

  if (forced) {
    const r = build(forced);
    return { ...r, reason: `${r.reason}（由 headword-overrides.json 指定）` };
  }

  // ④ 顏色主題／形容詞三性並列
  if (raw.t === "colour" || raw.t === "colors" || (parts.length === 2 && ADJ_FEM.test(parts[0]) && ADJ_MASC.test(parts[1]))) {
    return build("adjective");
  }

  // ② 體對：有動詞資訊，且第二形就是完成體
  if (raw.v && parts.length === 2 && (raw.v.p === parts[1] || Array.isArray(raw.v.pf))) {
    return build("aspect-pair");
  }

  // ① 人物陰陽性對
  if (raw.g?.startsWith("m") && parts.length === 2 && FEM_SUFFIX.test(parts[1])) {
    return build("gender-pair");
  }

  // ⑤ 三個以上並排，幾乎一定是不同的詞
  if (parts.length >= 3) return build("split");

  // 剩下的兩形：拼寫相近視為同義變體，否則列進待確認清單。
  const near = sharedPrefix(parts[0], parts[1]) >= 3;
  const r = build("variant");
  return {
    ...r,
    needsReview: !near,
    reason: near ? "拼寫相近，判為同義變體" : "兩形拼寫不近，無法自動判定（預設為③同義變體）",
  };
}

function sharedPrefix(a: string, b: string): number {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i;
}
