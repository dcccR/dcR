// §2.5 註記欄 n 的再利用：把藏在中文註記裡的結構化資訊抽出來，
// 抽不出來的殘留文字原樣留在 note。
//
// 真實教材的註記是「中文說明＋捷克例句＋對照符號」混排的，例如
//   "Učím se česky.（副詞）× Učím se gramatiku.（+4 格）"
//   "svítit 照亮：Slunce svítí celý den."
//   "byt × být 長短母音辨義"
// 所以 × 不能一律當成對照詞——它也被用來分隔兩個用法例句。

import type { Relation, Example } from "../../src/types/content.js";

export interface NoteExtract {
  relations: Relation[];
  confusables: string[];
  pluraleTantum: boolean;
  examples: { cz: string; zh: string }[];
  note?: string;
}

const CZ_LETTER = "A-Za-zÁÉÍÓÚŮÝČĎĚŇŘŠŤŽáéíóúůýčďěňřšťž";
const CZ_WORD = `[${CZ_LETTER}]`;
const CJK = /[　-鿿＀-￯]/;
const SENTENCE_END = /[.!?]/;

/** 一個「詞」：單一捷克字，允許結尾的 se/si。 */
const LEMMA = new RegExp(`^${CZ_WORD}+(\\s+(se|si))?$`);

/**
 * 從一個子句裡切出完整的捷克句子。
 * 要求首字為大寫捷克字母，句號後面接數字時不算句尾（`13. 5. 1980.`）。
 */
function sentencesIn(clause: string): string[] {
  const text = clause.replace(/（[^）]*）|\([^)]*\)/g, " ");
  const out: string[] = [];
  const startRe = new RegExp(`[A-ZÁÉÍÓÚŮÝČĎĚŇŘŠŤŽ]`);
  let i = 0;
  while (i < text.length) {
    if (!startRe.test(text[i])) {
      i++;
      continue;
    }
    let j = i;
    let end = -1;
    while (j < text.length) {
      if (SENTENCE_END.test(text[j])) {
        const next = text.slice(j + 1).match(/\S/)?.[0] ?? "";
        if (!/\d/.test(next)) {
          end = j;
          break;
        }
      }
      j++;
    }
    if (end < 0) break;
    const candidate = text.slice(i, end + 1).trim();
    i = end + 1;
    if (CJK.test(candidate)) continue;
    if (candidate.split(/\s+/).filter((w) => new RegExp(CZ_WORD).test(w)).length < 2) continue;
    out.push(candidate);
  }
  return out;
}

export function extractNote(n: string | undefined): NoteExtract {
  const out: NoteExtract = {
    relations: [],
    confusables: [],
    pluraleTantum: false,
    examples: [],
  };
  if (!n) return out;

  let rest = n;

  if (/只有複數形?/.test(rest)) {
    out.pluraleTantum = true;
    rest = rest.replace(/只有複數形?/g, "");
  }

  const eat = (re: RegExp, fn: (m: RegExpExecArray) => void) => {
    rest = rest.replace(re, (...args) => {
      fn(args.slice(0, -2) as unknown as RegExpExecArray);
      return " ";
    });
  };

  // 反義 ↔ starý
  eat(new RegExp(`↔\\s*(${CZ_WORD}+)`, "g"), (m) => {
    out.relations.push({ type: "antonym", ref: m[1] });
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

  // 注意與 horký 熱的 區分
  eat(new RegExp(`注意與\\s*(${CZ_WORD}+)[^，。；]*?區分`, "g"), (m) => {
    out.confusables.push(m[1]);
  });

  // × 的兩種用法要分開：分隔「詞」＝對照關係，分隔「句子」＝兩個用法例句。
  const clauses = rest.split(/[；;]/);
  const leftovers: string[] = [];
  for (const clause of clauses) {
    if (clause.includes("×") && !SENTENCE_END.test(clause)) {
      const parts = clause.split("×").map((s) => s.trim());
      const lemmas = parts
        .map((part) => part.split(/\s+/).find((w) => LEMMA.test(w)))
        .filter((w): w is string => Boolean(w));
      if (lemmas.length >= 2) {
        for (const l of lemmas) out.confusables.push(l);
        for (const l of lemmas.slice(1)) out.relations.push({ type: "contrast", ref: l });
        continue; // 這個子句已經用掉了
      }
    }
    leftovers.push(clause);
  }
  rest = leftovers.join("；");

  // 片語例句：先取冒號後的部分（`svítit 照亮：Slunce svítí celý den.`）
  const remaining: string[] = [];
  for (const clause of rest.split(/[；;]/)) {
    const afterColon = clause.includes("：") ? clause.slice(clause.indexOf("：") + 1) : clause;
    const found = sentencesIn(afterColon);
    for (const cz of found) out.examples.push({ cz, zh: "" });
    let left = clause;
    for (const cz of found) left = left.replace(cz, " ");
    remaining.push(left);
  }
  rest = remaining.join("；");

  const note = rest.replace(/[\s；;，,：:]+/g, " ").trim();
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
