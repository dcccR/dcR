import { describe, expect, it } from "vitest";
import { buildQuestion, buildUnitQuiz, levenshtein, pickDistractors, usableExamples } from "@/lib/quiz";
import type { Word } from "@/types/content";

const w = (over: Partial<Word> & { id: string; cz: string }): Word => ({
  zh: "中",
  en: "en",
  pos: "noun",
  examples: [],
  topics: ["home"],
  units: ["u1"],
  sources: ["L3p1"],
  ...over,
});

const pokoj = w({
  id: "w_pokoj",
  cz: "pokoj",
  zh: "房間",
  en: "room",
  gender: "mi",
  declension: { sg: { nom: "pokoj", gen: "pokoje", acc: "pokoj", loc: "pokoji" } },
  examples: [
    {
      id: "e1",
      cz: "Mám hezký pokoj.",
      zh: "我有個好看的房間。",
      en: "I have a nice room.",
      targetForm: "pokoj",
      case: 4,
      origin: "generated",
      reviewed: true,
    },
    {
      id: "e2",
      cz: "Nikdy nereviewed.",
      zh: "未複核",
      targetForm: "pokoj",
      origin: "generated",
      reviewed: false,
    },
  ],
});
const byt = w({ id: "w_byt", cz: "byt", zh: "公寓", gender: "mi" });
const dum = w({ id: "w_dum", cz: "dům", zh: "房子", gender: "mi" });
const zena = w({ id: "w_zena", cz: "žena", zh: "女人", gender: "f" });
const pool = [pokoj, byt, dum, zena];

describe("例句篩選（§4.5）", () => {
  it("只顯示 reviewed: true 的句子", () => {
    expect(usableExamples(pokoj).map((e) => e.id)).toEqual(["e1"]);
  });
});

describe("題目生成（§4.7）", () => {
  it("有例句時挖空，選項用原形", () => {
    const q = buildQuestion(pokoj, pool, pool);
    expect(q.kind).toBe("cloze");
    expect(q.stem).toBe("Mám hezký ______.");
    expect(q.options).toHaveLength(3);
    expect(q.options.map((o) => o.cz)).toContain("pokoj");
    // 選項一律 headword 形，不出現變格形（§14 決策 7）
    const inflected = ["pokoje", "pokoji"];
    for (const o of q.options) expect(inflected).not.toContain(o.cz);
    expect(q.options[q.answerIndex].id).toBe("w_pokoj");
  });

  it("挖空後才揭露句中的形與一行解釋", () => {
    const q = buildQuestion(pokoj, pool, pool);
    expect(q.reveal.form).toBe("pokoj");
    expect(q.reveal.explain).toContain("第 4 格");
    expect(q.reveal.explain).toContain("陽性無生命");
  });

  it("沒有可用例句時改用純詞義題型，不跳過", () => {
    const q = buildQuestion(byt, pool, pool);
    expect(q.kind).toBe("meaning");
    expect(q.stem).toBe("公寓");
    expect(q.options).toHaveLength(3);
  });

  it("同一題重建時選項順序固定", () => {
    const a = buildQuestion(pokoj, pool, pool, "s");
    const b = buildQuestion(pokoj, pool, pool, "s");
    expect(a.options.map((o) => o.id)).toEqual(b.options.map((o) => o.id));
  });
});

describe("誘答挑選順序（§4.7）", () => {
  it("教材標過的易混淆字優先", () => {
    const horky = w({ id: "w_horky", cz: "horký", pos: "adj", confusables: ["hořký"] });
    const horky2 = w({ id: "w_horky2", cz: "hořký", pos: "adj" });
    const other = w({ id: "w_studeny", cz: "studený", pos: "adj" });
    const picked = pickDistractors(horky, [horky2, other], [horky, horky2, other], 1, () => 0.5);
    expect(picked[0].id).toBe("w_horky2");
  });

  it("退回同詞性同性別的同小節字", () => {
    const picked = pickDistractors(pokoj, pool, pool, 2, () => 0.5);
    expect(picked).toHaveLength(2);
    expect(picked.every((p) => p.id !== pokoj.id)).toBe(true);
    expect(picked.map((p) => p.gender)).toEqual(["mi", "mi"]);
  });

  it("Levenshtein 距離", () => {
    expect(levenshtein("pokoj", "pokoje")).toBe(1);
    expect(levenshtein("mýt", "mít")).toBe(1);
    expect(levenshtein("abc", "")).toBe(3);
  });
});

describe("小節總測驗（§4.6）", () => {
  it("抽 6 題，優先抽先前答錯的字", () => {
    const many = Array.from({ length: 10 }, (_, i) => w({ id: `w${i}`, cz: `slovo${i}` }));
    const qs = buildUnitQuiz(many, many, { w7: 0, w9: 1 }, 6);
    expect(qs).toHaveLength(6);
    expect(qs.slice(0, 2).map((q) => q.wordId).sort()).toEqual(["w7", "w9"]);
  });

  it("字數少於 6 時不會重複出題", () => {
    const few = Array.from({ length: 3 }, (_, i) => w({ id: `w${i}`, cz: `slovo${i}` }));
    const qs = buildUnitQuiz(few, few, {}, 6);
    expect(qs).toHaveLength(3);
    expect(new Set(qs.map((q) => q.wordId)).size).toBe(3);
  });
});
