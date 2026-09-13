// §4.7 單字測驗的題目生成與誘答挑選。
// 選項一律用原形（headword）——考詞義與詞彙辨識，形態留給文法測驗。

import type { Example, Word } from "@/types/content";

export interface Question {
  id: string;
  wordId: string;
  kind: "cloze" | "meaning";
  /** cloze：挖空後的句子；meaning：中文／英文提示 */
  stem: string;
  stemZh?: string;
  stemEn?: string;
  options: Word[];
  answerIndex: number;
  /** 作答後才揭露：句中真正出現的形與一行解釋。 */
  reveal: { form: string; explain: string };
  example?: Example;
}

const CASE_ZH: Record<number, string> = { 1: "第 1 格", 2: "第 2 格", 4: "第 4 格", 6: "第 6 格" };
const PERSON_ZH = ["já", "ty", "on/ona", "my", "vy", "oni"];

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const row = [i];
    for (let j = 1; j <= n; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return prev[n];
}

function shuffle<T>(xs: T[], rnd: () => number): T[] {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 固定種子的亂數，讓同一題重新 render 不會換選項順序。 */
export function seededRandom(seed: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 誘答挑選順序（§4.7）：
 * 1 confusables → 2 同小節同詞性同性別 → 3 同主題同詞性 → 4 拼寫相近 → 5 同來源隨機同詞性
 */
export function pickDistractors(
  word: Word,
  unitWords: Word[],
  allWords: Word[],
  count: number,
  rnd: () => number,
): Word[] {
  const picked: Word[] = [];
  const seen = new Set([word.id]);
  const take = (candidates: Word[]) => {
    for (const c of shuffle(candidates, rnd)) {
      if (picked.length >= count) return;
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      picked.push(c);
    }
  };

  const byCz = new Map(allWords.map((w) => [w.cz.toLowerCase(), w]));
  take((word.confusables ?? []).map((c) => byCz.get(c.toLowerCase())).filter((w): w is Word => Boolean(w)));
  take(unitWords.filter((w) => w.pos === word.pos && w.gender === word.gender));
  take(allWords.filter((w) => w.pos === word.pos && w.topics.some((t) => word.topics.includes(t))));
  take(
    allWords.filter(
      (w) => w.pos === word.pos && levenshtein(w.cz.toLowerCase(), word.cz.toLowerCase()) <= 2,
    ),
  );
  take(allWords.filter((w) => w.pos === word.pos && w.sources.some((s) => word.sources.includes(s))));
  take(allWords.filter((w) => w.id !== word.id));
  return picked.slice(0, count);
}

function blank(sentence: string, form: string): string {
  const re = new RegExp(`(^|[^\\p{L}])${escapeRegex(form)}([^\\p{L}]|$)`, "iu");
  if (re.test(sentence)) return sentence.replace(re, (_m, a: string, b: string) => `${a}______${b}`);
  return `${sentence.replace(form, "______")}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function explainFor(word: Word, ex: Example): string {
  if (ex.case) {
    const label = CASE_ZH[ex.case];
    if (ex.case === 4 && word.gender === "mi" && ex.targetForm === word.cz) {
      return `這裡是${label}，${word.cz} 陽性無生命第 4 格與第 1 格同形。`;
    }
    if (ex.targetForm === word.cz) return `這裡是${label}，形態與第 1 格相同。`;
    return `這裡是${label}，${word.cz} → ${ex.targetForm}。`;
  }
  if (ex.person) return `這裡是 ${PERSON_ZH[ex.person - 1]} 的形：${word.cz} → ${ex.targetForm}。`;
  return `句中的形是 ${ex.targetForm}。`;
}

/** App 預設只顯示 reviewed: true 的句子（§4.5）。 */
export const usableExamples = (w: Word) => w.examples.filter((e) => e.reviewed && e.zh.trim());

export function buildQuestion(
  word: Word,
  unitWords: Word[],
  allWords: Word[],
  salt = "",
): Question {
  const rnd = seededRandom(`${word.id}|${salt}`);
  const examples = usableExamples(word);
  const distractors = pickDistractors(word, unitWords, allWords, 2, rnd);
  const options = shuffle([word, ...distractors], rnd);
  const answerIndex = options.findIndex((o) => o.id === word.id);

  // 例句不足的字不跳過，改用純詞義題型（§4.6）
  if (!examples.length) {
    return {
      id: `${word.id}_meaning`,
      wordId: word.id,
      kind: "meaning",
      stem: word.zh,
      stemEn: word.en,
      options,
      answerIndex,
      reveal: { form: word.cz, explain: `${word.cz}：${word.zh}` },
    };
  }

  const ex = examples[Math.floor(rnd() * examples.length)];
  return {
    id: `${word.id}_cloze_${ex.id}`,
    wordId: word.id,
    kind: "cloze",
    stem: blank(ex.cz, ex.targetForm),
    stemZh: ex.zh,
    stemEn: ex.en,
    options,
    answerIndex,
    reveal: { form: ex.targetForm, explain: explainFor(word, ex) },
    example: ex,
  };
}

/** 檢查點測驗：只考剛學的那幾個字，一字一題（§4.6）。 */
export function buildCheckpointQuiz(
  slice: Word[],
  unitWords: Word[],
  allWords: Word[],
  salt = "",
): Question[] {
  return slice.map((w) => buildQuestion(w, unitWords, allWords, salt));
}

/** 小節總測驗：抽 6 題，優先抽先前答錯的字（§4.6）。 */
export function buildUnitQuiz(
  unitWords: Word[],
  allWords: Word[],
  needsWork: Record<string, number>,
  size = 6,
  salt = "",
): Question[] {
  const rnd = seededRandom(`unit|${salt}|${unitWords.map((w) => w.id).join(",")}`);
  const weak = unitWords.filter((w) => w.id in needsWork);
  const rest = shuffle(
    unitWords.filter((w) => !(w.id in needsWork)),
    rnd,
  );
  const chosen = [...shuffle(weak, rnd), ...rest].slice(0, Math.min(size, unitWords.length));
  return chosen.map((w) => buildQuestion(w, unitWords, allWords, salt));
}
