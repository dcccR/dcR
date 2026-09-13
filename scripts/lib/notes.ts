// §2.5 註記欄 n 的再利用：把藏在中文註記裡的結構化資訊抽出來，
// 抽不出來的殘留文字原樣留在 note。

import type { Relation, Example } from "../../src/types/content.js";

export interface NoteExtract {
  relations: Relation[];
  confusables: string[];
  pluraleTantum: boolean;
  examples: { cz: string; zh: string }[];
  note?: string;
}

const CZ_WORD = "[A-Za-zÁÉÍÓÚŮÝČĎĚŇŘŠŤŽáéíóúůýčďěňřšťž]";

/** 句尾為 . ! ? 的捷克句子，且含至少兩個詞。 */
const SENTENCE = new RegExp(`${CZ_WORD}+(?:\\s+[^。，；]*?)?${CZ_WORD}[^。，；]*?[.!?]`, "g");

export function extractNote(n: string | undefined): NoteExtract {
  const out: NoteExtract = {
    relations: [],
    confusables: [],
    pluraleTantum: false,
    examples: [],
  };
  if (!n) return out;
  let rest = n;

  const eat = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    rest = rest.replace(re, (...args) => {
      const m = args.slice(0, -2) as unknown as RegExpExecArray;
      fn(m);
      return "";
    });
  };

  // 只有複數形
  if (/只有複數形?/.test(rest)) {
    out.pluraleTantum = true;
    rest = rest.replace(/只有複數形?/g, "");
  }

  // 反義 ↔ starý
  eat(new RegExp(`↔\\s*(${CZ_WORD}+)`, "g"), (m) => {
    out.relations.push({ type: "antonym", ref: m[1] });
  });

  // 對照 × hořký
  eat(new RegExp(`×\\s*(${CZ_WORD}+)`, "g"), (m) => {
    out.relations.push({ type: "contrast", ref: m[1] });
  });

  // 對照 poslouchat
  eat(new RegExp(`對照\\s*(${CZ_WORD}+)`, "g"), (m) => {
    out.relations.push({ type: "contrast", ref: m[1] });
  });

  // 同族：celý・celkem ／ -kaz 字族
  eat(new RegExp(`同族[：:]\\s*((?:${CZ_WORD}|[・、,\\s])+)`, "g"), (m) => {
    for (const w of m[1].split(/[・、,\s]+/).filter(Boolean)) {
      out.relations.push({ type: "family", ref: w });
    }
  });
  eat(new RegExp(`(-?${CZ_WORD}+)\\s*字族`, "g"), (m) => {
    out.relations.push({ type: "family", ref: m[1], label: "字族" });
  });

  // 易混淆：注意與 horký 熱的 區分 ／ mýt 洗 × mít 有
  eat(new RegExp(`注意與\\s*(${CZ_WORD}+)[^，。；]*?區分`, "g"), (m) => {
    out.confusables.push(m[1]);
  });
  eat(new RegExp(`(${CZ_WORD}+)\\s*[^，。；\\s]*\\s*×\\s*(${CZ_WORD}+)`, "g"), (m) => {
    out.confusables.push(m[1], m[2]);
  });

  // 片語例句：Mám chuť na pivo.
  const sentences = rest.match(SENTENCE) ?? [];
  for (const s of sentences) {
    const cz = s.trim();
    if (cz.split(/\s+/).length < 2) continue;
    out.examples.push({ cz, zh: "" });
    rest = rest.replace(s, "");
  }

  const note = rest.replace(/[\s；;，,]+/g, " ").trim();
  out.note = note.length > 0 ? note : undefined;
  out.confusables = [...new Set(out.confusables)];
  return out;
}

export function mergeExamples(a: Example[], b: Example[]): Example[] {
  const seen = new Set<string>();
  const out: Example[] = [];
  for (const ex of [...a, ...b]) {
    const key = ex.cz.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(ex);
  }
  return out;
}
