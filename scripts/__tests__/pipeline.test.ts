import { describe, expect, it } from "vitest";
import { classify } from "../lib/classify.js";
import { extractNote } from "../lib/notes.js";
import { buildUnits, checkpointsFor } from "../lib/units.js";
import { deriveVerbClass, deriveVerbGroups } from "../lib/verbs.js";
import type { Word } from "../../src/types/content.js";

const base = { z: "", e: "", s: "L1p1", t: "misc" };

describe("headword 分類（§2.3）", () => {
  it("① 人物陰陽性對兩形都保留", () => {
    const r = classify({ ...base, c: "student / studentka", g: "m" });
    expect(r.kind).toBe("gender-pair");
    expect(r.entries[0]).toMatchObject({ cz: "student", czFem: "studentka" });
  });

  it("② 體對只留第一個", () => {
    const r = classify({
      ...base,
      c: "psát / napsat",
      v: { a: "impf", p: "napsat", f: ["píšu"], pf: ["napíšu"] },
    });
    expect(r.kind).toBe("aspect-pair");
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].cz).toBe("psát");
  });

  it("③ 同義變體收進 alsoWritten", () => {
    const r = classify({ ...base, c: "Děkuju! / Děkuji!" });
    expect(r.kind).toBe("variant");
    expect(r.entries[0].alsoWritten).toEqual(["Děkuji!"]);
  });

  it("④ 顏色改陽性形並補三性", () => {
    const r = classify({ ...base, c: "bílá / bílý", t: "colors" });
    expect(r.entries[0].cz).toBe("bílý");
    expect(r.entries[0].adjForms).toEqual({ m: "bílý", f: "bílá", n: "bílé" });
  });

  it("⑤ 多詞並排拆開，-ina 語言名自動補變格", () => {
    const r = classify({ ...base, c: "čeština / angličtina / němčina", g: "f" });
    expect(r.kind).toBe("split");
    expect(r.entries.map((e) => e.cz)).toEqual(["čeština", "angličtina", "němčina"]);
    expect(r.entries[0].declension).toEqual(["češtiny", "češtinu", "češtině"]);
    // 原始 d 欄只描述第一形
    expect(r.entries[1].useRawDeclension).toBe(false);
  });

  it("⑥ × 對比卡原樣保留", () => {
    const r = classify({ ...base, c: "nikdy × někdy × vždycky" });
    expect(r.kind).toBe("contrast");
    expect(r.entries[0].cz).toBe("nikdy × někdy × vždycky");
    expect(r.entries[0].contrastSet).toEqual(["nikdy", "někdy", "vždycky"]);
  });

  it("判不出來的兩形標成待確認", () => {
    expect(classify({ ...base, c: "Ahoj! / Čau!" }).needsReview).toBe(true);
    expect(classify({ ...base, c: "chleba / chléb" }).needsReview).toBe(false);
  });

  it("overrides 可覆寫自動判定", () => {
    const r = classify({ ...base, c: "pondělí / úterý" }, { "pondělí / úterý": { type: "split" } });
    expect(r.kind).toBe("split");
    expect(r.entries).toHaveLength(2);
  });
});

describe("註記欄抽取（§2.5）", () => {
  it("抽出反義、對照、易混淆、只有複數與片語", () => {
    const a = extractNote("↔ starý");
    expect(a.relations).toEqual([{ type: "antonym", ref: "starý" }]);

    const b = extractNote("注意與 horký 熱的 區分");
    expect(b.confusables).toEqual(["horký"]);

    const c = extractNote("只有複數形");
    expect(c.pluraleTantum).toBe(true);

    const d = extractNote("Mám chuť na pivo.");
    expect(d.examples[0].cz).toBe("Mám chuť na pivo.");

    const e = extractNote("同族：celý・celkem");
    expect(e.relations.map((r) => r.ref)).toEqual(["celý", "celkem"]);
  });

  it("抽不出來的文字原樣留在 note", () => {
    expect(extractNote("非正式，朋友之間用").note).toBe("非正式 朋友之間用");
  });
});

describe("小節切分（§4.1）", () => {
  const mk = (n: number): Word[] =>
    Array.from({ length: n }, (_, i) => ({
      id: `w${i}`,
      cz: `w${i}`,
      zh: "",
      en: "",
      pos: "noun",
      examples: [],
      topics: ["t"],
      units: [],
      sources: ["L1p1"],
    }));

  it("每 10 字一節", () => {
    expect(buildUnits("t", "主題", "Téma", mk(20)).map((u) => u.wordIds.length)).toEqual([10, 10]);
  });

  it("餘數 ≥4 自成一節", () => {
    expect(buildUnits("t", "主題", "Téma", mk(14)).map((u) => u.wordIds.length)).toEqual([10, 4]);
  });

  it("餘數 <4 併入前一節，且不超過 12 字", () => {
    expect(buildUnits("t", "主題", "Téma", mk(12)).map((u) => u.wordIds.length)).toEqual([12]);
    expect(buildUnits("t", "主題", "Téma", mk(22)).map((u) => u.wordIds.length)).toEqual([10, 12]);
    // 餘數 3 併進去會變 13，改從前一節借 1 個字
    expect(buildUnits("t", "主題", "Téma", mk(13)).map((u) => u.wordIds.length)).toEqual([9, 4]);
  });

  it("檢查點每 4 字一個，最後一個等於字數", () => {
    expect(checkpointsFor(10)).toEqual([4, 8, 10]);
    expect(checkpointsFor(12)).toEqual([4, 8, 12]);
    expect(checkpointsFor(7)).toEqual([4, 7]);
  });

  it("依來源排序，同來源維持原始順序", () => {
    const ws = mk(3);
    ws[0].sources = ["L7p2"];
    ws[1].sources = ["L1p1"];
    ws[2].sources = ["L3p1"];
    expect(buildUnits("t", "主題", "Téma", ws)[0].wordIds).toEqual(["w1", "w2", "w0"]);
  });
});

describe("動詞變化類推導（§4.2）", () => {
  it.each([
    ["dělat", "dělám", 1],
    ["mluvit", "mluvím", 2],
    ["bydlet", "bydlím", 2],
    ["studovat", "studuju", 3],
    ["číst", "čtu", 4],
    ["moct", "můžu", 4],
  ])("%s → 第 %s 類", (inf, p1, expected) => {
    expect(deriveVerbClass(inf, p1 as string)).toBe(expected);
  });

  it("一個動詞可同時屬於兩區", () => {
    expect(deriveVerbGroups("jít", 4, null)).toEqual(["class4", "motion"]);
    expect(deriveVerbGroups("dívat se", 1, "se")).toEqual(["class1", "reflexive"]);
  });
});
