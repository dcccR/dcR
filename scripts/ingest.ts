// M0 資料管線（§2、§4.1）。可重複執行：content/authored/ 由腳本 merge，永不覆寫。
//   npm run ingest

import fs from "node:fs";
import path from "node:path";
import { loadRaw, ROOT, type RawWord } from "./lib/raw.js";
import { classify, type Overrides } from "./lib/classify.js";
import { extractNote, mergeExamples } from "./lib/notes.js";
import { deriveVerbClass, deriveVerbGroups, reflexiveOf, VERB_GROUP_ORDER } from "./lib/verbs.js";
import { buildUnits, type UnitTitleOverride } from "./lib/units.js";
import { deaccent, uniqueId } from "./lib/slug.js";
import type {
  Example, Gender, GrammarCategory, GrammarSection, LemmaIndex, Pos,
  Source, Topic, Unit, VerbGroup, Word,
} from "../src/types/content.js";
import { SOURCES } from "../src/types/content.js";

const CONTENT = path.join(ROOT, "content");
const AUTHORED = path.join(CONTENT, "authored");

function readAuthored<T>(name: string, fallback: T): T {
  const file = path.join(AUTHORED, name);
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

const report: string[] = [];
const warn = (line: string) => report.push(`- ${line}`);

// ── 詞性判定 ───────────────────────────────────────────────
function derivePos(raw: RawWord, kind: string, cz: string): Pos {
  if (kind === "contrast") return "contrast-set";
  if (raw.v) return "verb";
  if (kind === "adjective" || /[ýí]$/.test(cz) && !raw.g) return "adj";
  if (raw.g) return "noun";
  if (/[!?]$/.test(cz) || cz.split(/\s+/).length > 1) return "phrase";
  if (/^\d/.test(cz)) return "num";
  return "adv";
}

// ── 從資料拼出一個字所有可能出現的形（供 targetForm 與反查索引用）───
function allForms(w: Word): string[] {
  const forms = new Set<string>([w.cz]);
  if (w.czFem) forms.add(w.czFem);
  for (const alt of w.alsoWritten ?? []) forms.add(alt);
  for (const m of w.contrastSet ?? []) forms.add(m);
  if (w.declension) {
    for (const v of Object.values(w.declension.sg)) forms.add(v);
    for (const v of Object.values(w.declension.pl ?? {})) if (v) forms.add(v);
  }
  if (w.adjForms) for (const v of Object.values(w.adjForms)) forms.add(v);
  if (w.verb) {
    for (const v of w.verb.present) forms.add(v);
    for (const v of w.verb.pairPresent ?? []) forms.add(v);
    if (w.verb.negation) forms.add(w.verb.negation);
  }
  return [...forms].filter(Boolean);
}

function tokenize(sentence: string): string[] {
  return sentence.split(/[^A-Za-zÁÉÍÓÚŮÝČĎĚŇŘŠŤŽáéíóúůýčďěňřšťž]+/).filter(Boolean);
}

/** 找出例句中該字實際出現的形；找不到就退回 headword。 */
function findTargetForm(sentence: string, w: Word): { form: string; case?: 1 | 2 | 4 | 6; person?: 1 | 2 | 3 | 4 | 5 | 6 } {
  const tokens = tokenize(sentence);
  const lower = tokens.map((t) => t.toLowerCase());
  const tryForm = (form: string) => lower.indexOf(form.toLowerCase().split(/\s+/)[0]) >= 0;

  if (w.declension) {
    const cases: [1 | 2 | 4 | 6, string][] = [
      [1, w.declension.sg.nom], [2, w.declension.sg.gen],
      [4, w.declension.sg.acc], [6, w.declension.sg.loc],
    ];
    // 先找非主格的形，主格常與其他格同形
    for (const [c, form] of [...cases].reverse()) {
      if (form && tryForm(form)) return { form, case: c };
    }
  }
  if (w.verb) {
    for (let i = 0; i < w.verb.present.length; i++) {
      const form = w.verb.present[i];
      if (tryForm(form)) return { form, person: (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 };
    }
    if (w.verb.negation && tryForm(w.verb.negation)) return { form: w.verb.negation };
  }
  for (const form of allForms(w)) if (tryForm(form)) return { form };
  return { form: w.cz };
}

// ── 主流程 ─────────────────────────────────────────────────
const raw = loadRaw();
const headwordOverrides = readAuthored<Overrides>("headword-overrides.json", {});
const unitTitles = readAuthored<UnitTitleOverride>("unit-titles.json", {});
const authoredExamples = readAuthored<Record<string, Omit<Example, "id">[]>>("examples.json", {});

const topics: Topic[] = raw.topics.map(([id, cz, zh]) => ({
  id, cz, zh, standalone: id === "verb" ? true : undefined,
}));
const topicIds = new Set(topics.map((t) => t.id));

interface Draft extends Omit<Word, "id" | "units"> {
  key: string;
}

const drafts = new Map<string, Draft>();
const reviewNeeded: { cz: string; reason: string; source: string }[] = [];

for (const r of raw.words) {
  if (!topicIds.has(r.t)) warn(`未知主題 id \`${r.t}\`（headword ${r.c}），已略過該條目`), void 0;
  if (!topicIds.has(r.t)) continue;
  if (!SOURCES.includes(r.s as Source)) {
    warn(`未知來源 \`${r.s}\`（headword ${r.c}）`);
    continue;
  }

  const cls = classify(r, headwordOverrides);
  if (cls.needsReview) reviewNeeded.push({ cz: r.c, reason: cls.reason, source: r.s });

  const note = extractNote(r.n);

  for (const entry of cls.entries) {
    const pos = derivePos(r, cls.kind, entry.cz);
    const declTriple = entry.declension ?? (entry.useRawDeclension ? r.d : undefined);
    const declension = declTriple
      ? note.pluraleTantum
        ? { sg: { nom: entry.cz, gen: declTriple[0], acc: declTriple[1], loc: declTriple[2] },
            pl: { nom: entry.cz, gen: declTriple[0], acc: declTriple[1], loc: declTriple[2] } }
        : { sg: { nom: entry.cz, gen: declTriple[0], acc: declTriple[1], loc: declTriple[2] } }
      : undefined;

    let verb: Word["verb"];
    if (r.v) {
      const refl = reflexiveOf(entry.cz);
      const present = r.v.f.slice(0, 6) as [string, string, string, string, string, string];
      const verbClass = deriveVerbClass(entry.cz, present[0]);
      verb = {
        aspect: r.v.a,
        pair: r.v.p,
        verbClass,
        groups: deriveVerbGroups(entry.cz, verbClass, refl),
        present,
        pairPresent: r.v.pf,
        negation: r.v.neg,
        reflexive: refl,
      };
      if (r.v.f.length !== 6) warn(`動詞 ${entry.cz} 的現在式只有 ${r.v.f.length} 個形，應為 6`);
    }

    // 合併鍵用原拼寫，不可去變音符：hořký 苦的 與 horký 熱的 去掉符號後同形。
    const key = `${entry.cz.toLowerCase()}|${pos}`;
    const existing = drafts.get(key);

    const draft: Draft = {
      key,
      cz: entry.cz,
      czFem: entry.czFem,
      alsoWritten: entry.alsoWritten,
      contrastSet: entry.contrastSet,
      contrastZh: entry.contrastSet ? r.z.split("×").map((s) => s.trim()) : undefined,
      zh: r.z,
      en: r.e ?? "",
      pos,
      gender: r.g as Gender | undefined,
      pluraleTantum: note.pluraleTantum || undefined,
      declension,
      adjForms: entry.adjForms,
      verb,
      rekce: r.r,
      note: note.note,
      relations: note.relations.length ? note.relations : undefined,
      confusables: note.confusables.length ? note.confusables : undefined,
      examples: [],
      topics: [r.t],
      sources: [r.s as Source],
    };

    // 教材原有例句（x 欄）
    if (r.x) {
      draft.examples.push({
        id: "", cz: r.x[0], zh: r.x[1], targetForm: "",
        origin: "textbook", reviewed: true,
      });
    }
    for (const ex of note.examples) {
      draft.examples.push({
        id: "", cz: ex.cz, zh: ex.zh, targetForm: "",
        origin: "textbook", reviewed: true,
      });
    }

    if (!existing) {
      drafts.set(key, draft);
      continue;
    }

    // §2.4 重複條目合併：共用同一張卡、同一個 wordId
    existing.sources = [...new Set([...existing.sources, ...draft.sources])];
    existing.topics = [...new Set([...existing.topics, ...draft.topics])];
    existing.examples = mergeExamples(existing.examples, draft.examples);
    existing.relations = dedupeRelations([...(existing.relations ?? []), ...(draft.relations ?? [])]);
    existing.confusables = uniqOrUndef([...(existing.confusables ?? []), ...(draft.confusables ?? [])]);
    existing.note = mergeNotes(existing.note, draft.note);
    existing.zh = mergeZh(existing.zh, draft.zh);
    existing.declension ??= draft.declension;
    existing.verb ??= draft.verb;
    existing.rekce ??= draft.rekce;
    existing.czFem ??= draft.czFem;
  }
}

function uniqOrUndef(xs: string[]): string[] | undefined {
  const u = [...new Set(xs)];
  return u.length ? u : undefined;
}
function dedupeRelations(rs: NonNullable<Word["relations"]>): Word["relations"] {
  const seen = new Set<string>();
  const out = rs.filter((r) => {
    const k = `${r.type}|${r.ref}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return out.length ? out : undefined;
}
function mergeNotes(a?: string, b?: string): string | undefined {
  const parts = [...new Set([a, b].filter(Boolean) as string[])];
  return parts.length ? parts.join("／") : undefined;
}
function mergeZh(a: string, b: string): string {
  if (a === b) return a;
  return a.length >= b.length ? a : b;
}

// ── 配 id ─────────────────────────────────────────────────
const taken = new Set<string>();
const words: Word[] = [...drafts.values()].map((d) => {
  const { key: _key, ...rest } = d;
  return { ...rest, id: uniqueId("w_", d.cz, taken), units: [] as string[] };
});

// 參照解析：先比對原拼寫，找不到才放寬到去變音符。
const byCz = new Map<string, Word>();
const byCzLoose = new Map<string, Word>();
for (const w of words) {
  byCz.set(w.cz.toLowerCase(), w);
  if (!byCzLoose.has(deaccent(w.cz).toLowerCase())) byCzLoose.set(deaccent(w.cz).toLowerCase(), w);
}
const lookup = (s: string): Word | undefined =>
  byCz.get(s.toLowerCase()) ?? byCzLoose.get(deaccent(s).toLowerCase());

// authored/examples.json：以 wordId 或 headword 為 key 補例句
for (const w of words) {
  const extra = authoredExamples[w.id] ?? authoredExamples[w.cz];
  if (extra) w.examples = mergeExamples(w.examples, extra.map((e) => ({ ...e, id: "" })));
}

// 例句補齊 id / targetForm / case / person
for (const w of words) {
  w.examples = w.examples.map((ex, i) => {
    const found = ex.targetForm ? { form: ex.targetForm, case: ex.case, person: ex.person } : findTargetForm(ex.cz, w);
    if (!ex.targetForm && found.form === w.cz && !new RegExp(deaccent(w.cz), "i").test(deaccent(ex.cz))) {
      warn(`例句「${ex.cz}」找不到 ${w.cz} 的任何形，targetForm 退回 headword`);
    }
    return {
      ...ex,
      id: `${w.id}_ex${i + 1}`,
      targetForm: ex.targetForm || found.form,
      case: ex.case ?? found.case,
      person: ex.person ?? found.person,
    };
  });
}

// relations / confusables 的參照盡量解析成 wordId
for (const w of words) {
  w.relations = w.relations?.map((r) => {
    const hit = lookup(r.ref);
    return hit ? { ...r, ref: hit.id, label: r.label ?? hit.cz } : r;
  });
}

// ── 小節 ───────────────────────────────────────────────────
const units: Unit[] = [];

for (const topic of topics) {
  if (topic.id === "verb") continue;
  const members = words.filter((w) => w.topics.includes(topic.id));
  if (!members.length) {
    warn(`主題「${topic.zh}」沒有任何單字`);
    continue;
  }
  units.push(...buildUnits(topic.id, topic.zh, topic.cz, members, unitTitles));
}

// 動詞獨立成模組：依變化類分區，一個動詞可同時屬於兩區
const verbWords = words.filter((w) => w.topics.includes("verb"));
for (const group of VERB_GROUP_ORDER) {
  const members = verbWords.filter((w) => w.verb?.groups.includes(group));
  if (!members.length) continue;
  const built = buildUnits(`verb_${group}`, groupZh(group), groupCz(group), members, unitTitles);
  for (const u of built) {
    u.topicId = "verb";
    u.verbGroup = group;
  }
  units.push(...built);
}

function groupZh(g: VerbGroup) {
  return VERB_GROUP_META[g].zh;
}
function groupCz(g: VerbGroup) {
  return VERB_GROUP_META[g].cz;
}

import { VERB_GROUP_LABELS as VERB_GROUP_META } from "./lib/verbs.js";

// 回填 word.units
const wordById = new Map(words.map((w) => [w.id, w]));
for (const u of units) {
  for (const id of u.wordIds) wordById.get(id)!.units.push(u.id);
}

// ── 文法 ───────────────────────────────────────────────────
const CATEGORY_MAP: Record<GrammarCategory, number[]> = {
  pronunciation: [1],
  "person-tense": [2, 11, 12, 24, 31, 32, 35, 43, 44, 46, 50],
  "case-1": [4, 5, 7, 23],
  "case-2": [3, 20, 27],
  "case-4": [13, 15, 23, 51, 54, 55],
  "case-6": [39, 41],
  adjective: [6, 17, 18, 29],
  pronoun: [8, 51, 54, 57],
  "verb-type": [14, 19, 36, 43, 46, 47],
  "frequency-time": [10, 21, 30, 49],
  "number-date": [9, 20, 27],
  preposition: [37, 38, 39, 41, 42],
  syntax: [13, 50, 52, 53, 56],
  situation: [22, 25, 26, 33, 34, 42, 45, 58],
  "motion-verbs": [36, 47],
};

const grammar: GrammarSection[] = raw.grammar.map((g) => {
  const categories = (Object.keys(CATEGORY_MAP) as GrammarCategory[]).filter((c) =>
    CATEGORY_MAP[c].includes(g.number),
  );
  if (!categories.length) warn(`文法第 ${g.number} 節未歸入任何區塊`);
  // 本節相關單字：節內文出現的捷克形，用反查索引對回單字
  const related = new Set<string>();
  const text = g.bodyHtml.replace(/<[^>]+>/g, " ");
  for (const tok of tokenize(text)) {
    const hit = lookup(tok);
    if (hit) related.add(hit.id);
  }
  return {
    id: `g${g.number}`,
    number: g.number,
    titleCz: g.titleCz,
    titleZh: g.titleZh,
    source: (SOURCES.includes(g.source as Source) ? g.source : "L1p1") as Source,
    categories,
    bodyHtml: g.bodyHtml,
    relatedWordIds: [...related],
  };
});

// 單字 → 文法節
for (const w of words) {
  const refs = new Set<number>(w.grammarRefs ?? []);
  for (const g of w.verb?.groups ?? []) for (const n of VERB_GROUP_META[g].grammarRefs) refs.add(n);
  if (w.rekce) refs.add(15);
  if (refs.size) w.grammarRefs = [...refs].sort((a, b) => a - b);
}

// ── 變格形反查索引（§8、§9）──────────────────────────────
const lemmaIndex: LemmaIndex = {};
const addForm = (form: string, id: string) => {
  for (const key of [form.toLowerCase(), deaccent(form).toLowerCase()]) {
    (lemmaIndex[key] ??= []).includes(id) || lemmaIndex[key].push(id);
  }
};
for (const w of words) {
  for (const form of allForms(w)) {
    for (const token of form.split(/\s+/)) addForm(token, w.id);
    addForm(form, w.id);
  }
  for (const ex of w.examples) addForm(ex.targetForm, w.id);
}

// ── 寫檔 ───────────────────────────────────────────────────
const write = (name: string, data: unknown) =>
  fs.writeFileSync(path.join(CONTENT, name), `${JSON.stringify(data, null, 2)}\n`, "utf8");

write("topics.json", topics);
write("words.json", words);
write("units.json", units);
write("grammar.json", grammar);
write("lemma-index.json", lemmaIndex);

// 這兩個模組 M6 才做，先產生空殼讓型別與載入流程就位
for (const name of ["listening.json", "reading.json"]) {
  const file = path.join(CONTENT, name);
  if (!fs.existsSync(file)) write(name, []);
}

// ── REPORT.md ─────────────────────────────────────────────
const noExamples = words.filter((w) => w.examples.length === 0);
const noDeclension = words.filter((w) => w.pos === "noun" && !w.declension);
const lines: string[] = [];
lines.push("# 轉換報告", "");
lines.push(`產生時間：${new Date().toISOString()}`, "");
lines.push("## 來源", "");
lines.push(`- 單字：\`${raw.provenance.words}\``);
lines.push(`- 文法：\`${raw.provenance.grammar}\``, "");
lines.push("## 總量", "");
lines.push(`- 原始條目 ${raw.words.length} 筆 → 合併後單字 ${words.length} 個`);
lines.push(`- 主題 ${topics.length} 個（其中動詞為獨立模組）`);
lines.push(`- 小節 ${units.length} 節`);
lines.push(`- 文法 ${grammar.length} 節`);
lines.push(`- 反查索引 ${Object.keys(lemmaIndex).length} 個形`, "");
lines.push("## 各主題字數與小節", "");
lines.push("| 主題 | 單字 | 小節 |", "|---|---:|---:|");
for (const t of topics) {
  const n = words.filter((w) => w.topics.includes(t.id)).length;
  const u = units.filter((x) => x.topicId === t.id).length;
  lines.push(`| ${t.zh} ${t.cz} | ${n} | ${u} |`);
}
lines.push("");
lines.push("## 動詞分區", "");
lines.push("| 分區 | 動詞數 | 小節 |", "|---|---:|---:|");
for (const g of VERB_GROUP_ORDER) {
  const n = verbWords.filter((w) => w.verb?.groups.includes(g)).length;
  const u = units.filter((x) => x.verbGroup === g).length;
  if (n) lines.push(`| ${VERB_GROUP_META[g].zh} | ${n} | ${u} |`);
}
lines.push("");
lines.push("## 待人工確認的 headword", "");
if (reviewNeeded.length === 0) {
  lines.push("（無）");
} else {
  lines.push("把判定寫進 `content/authored/headword-overrides.json`，鍵為原始 headword，", "");
  lines.push("`type` 可填 `gender-pair` / `aspect-pair` / `variant` / `adjective` / `split` / `contrast`。", "");
  lines.push("| headword | 來源 | 自動判定說明 |", "|---|---|---|");
  for (const r of reviewNeeded) lines.push(`| \`${r.cz}\` | ${r.source} | ${r.reason} |`);
}
lines.push("");
lines.push("## 缺例句的單字", "");
lines.push(`共 ${noExamples.length} 個（§4.5：初版每主題補 3–5 個示範即可，UI 會優雅處理例句不足）`, "");
for (const t of topics) {
  const xs = noExamples.filter((w) => w.topics.includes(t.id));
  if (xs.length) lines.push(`- **${t.zh}**：${xs.map((w) => w.cz).join("、")}`);
}
lines.push("");
lines.push("## 缺變格資料的名詞", "");
lines.push(
  noDeclension.length
    ? noDeclension.map((w) => `- ${w.cz}（${w.sources.join("、")}）`).join("\n")
    : "（無）",
);
lines.push("");
lines.push("## 其他警告", "");
lines.push(report.length ? report.join("\n") : "（無）");
lines.push("");
fs.writeFileSync(path.join(CONTENT, "REPORT.md"), lines.join("\n"), "utf8");

console.log(
  `ingest ✓  單字 ${words.length}・小節 ${units.length}・文法 ${grammar.length}・` +
    `待確認 headword ${reviewNeeded.length}・警告 ${report.length}`,
);
