import { describe, expect, it } from "vitest";
import { getWord, lookupForm, units, unitsOfTopic, verbGroupsInUse, words } from "@/lib/content";

describe("產出的內容", () => {
  it("重複條目合併成單一 Word，topics / sources 為陣列（§2.4）", () => {
    const obchod = words.filter((w) => w.cz === "obchod");
    expect(obchod).toHaveLength(1);
    expect(obchod[0].topics).toEqual(expect.arrayContaining(["city", "food"]));
    expect(obchod[0].sources.length).toBeGreaterThan(1);
  });

  it("horký 與 hořký 沒有被去變音符合併", () => {
    expect(words.filter((w) => w.cz === "horký")).toHaveLength(1);
    expect(words.filter((w) => w.cz === "hořký")).toHaveLength(1);
  });

  it("每節不超過 12 字，檢查點收在字數上", () => {
    for (const u of units) {
      expect(u.wordIds.length).toBeLessThanOrEqual(12);
      expect(u.checkpoints.at(-1)).toBe(u.wordIds.length);
    }
  });

  it("動詞獨立成模組，不出現在主題小節裡", () => {
    expect(unitsOfTopic("verb")).toHaveLength(0);
    expect(verbGroupsInUse().length).toBeGreaterThan(0);
  });

  it("變格形反查得到原形（§8、§9）", () => {
    expect(lookupForm("Praze")).toEqual([]); // 種子資料沒有 Praha
    expect(lookupForm("pokoji").map((w) => w.cz)).toContain("pokoj");
    expect(lookupForm("cestina").map((w) => w.cz)).toContain("čeština"); // 去變音符
    expect(lookupForm("studuju").map((w) => w.cz)).toContain("studovat");
  });

  it("每個單字都能被小節找到", () => {
    for (const w of words) {
      expect(w.units.length).toBeGreaterThan(0);
      for (const id of w.units) expect(units.some((u) => u.id === id)).toBe(true);
    }
    expect(getWord("w_pokoj")?.cz).toBe("pokoj");
  });
});
