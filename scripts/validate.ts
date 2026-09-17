// M0 驗證：id 唯一、必要欄位齊全、unit ≤12 字、topics/sources 有效、
// 雙向參照一致、例句的 targetForm 真的出現在句中。
//   npm run validate

import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./lib/raw.js";
import { deaccent } from "./lib/slug.js";
import { SOURCES, type GrammarSection, type LemmaIndex, type Topic, type Unit, type Word } from "../src/types/content.js";

const CONTENT = path.join(ROOT, "content");
const read = <T>(name: string): T =>
  JSON.parse(fs.readFileSync(path.join(CONTENT, name), "utf8")) as T;

const errors: string[] = [];
const warnings: string[] = [];
const err = (m: string) => errors.push(m);
const warn = (m: string) => warnings.push(m);

const topics = read<Topic[]>("topics.json");
const words = read<Word[]>("words.json");
const units = read<Unit[]>("units.json");
const grammar = read<GrammarSection[]>("grammar.json");
const lemmaIndex = read<LemmaIndex>("lemma-index.json");

const topicIds = new Set(topics.map((t) => t.id));
const wordIds = new Set<string>();
const unitIds = new Set<string>();

for (const w of words) {
  if (wordIds.has(w.id)) err(`單字 id 重複：${w.id}`);
  wordIds.add(w.id);
  if (!w.cz.trim()) err(`${w.id}：cz 為空`);
  if (!w.zh.trim()) err(`${w.id} (${w.cz})：zh 為空`);
  if (!w.pos) err(`${w.id} (${w.cz})：缺 pos`);
  if (!Array.isArray(w.examples)) err(`${w.id} (${w.cz})：examples 不是陣列`);
  if (!w.topics.length) err(`${w.id} (${w.cz})：topics 為空`);
  if (!w.sources.length) err(`${w.id} (${w.cz})：sources 為空`);
  for (const t of w.topics) if (!topicIds.has(t)) err(`${w.id} (${w.cz})：未知主題 ${t}`);
  for (const s of w.sources) if (!SOURCES.includes(s)) err(`${w.id} (${w.cz})：未知來源 ${s}`);
  if (w.pos === "verb" && !w.verb) err(`${w.id} (${w.cz})：詞性為 verb 但缺 verb 欄`);
  if (w.verb && w.verb.present.length !== 6) err(`${w.id} (${w.cz})：現在式不是 6 個形`);
  if (w.pos === "contrast-set" && !(w.contrastSet && w.contrastSet.length >= 2)) {
    err(`${w.id} (${w.cz})：對比卡的 contrastSet 少於 2 個成員`);
  }
  if (w.declension && w.declension.sg.nom !== w.cz && !w.pluraleTantum) {
    warn(`${w.id} (${w.cz})：第 1 格 ${w.declension.sg.nom} 與 headword 不同`);
  }
  const exIds = new Set<string>();
  for (const ex of w.examples) {
    if (exIds.has(ex.id)) err(`${w.id}：例句 id 重複 ${ex.id}`);
    exIds.add(ex.id);
    if (!ex.cz.trim() || !ex.zh.trim()) warn(`${w.id}：例句「${ex.cz}」缺捷克文或中文`);
    const hay = deaccent(ex.cz).toLowerCase();
    const needle = deaccent(ex.targetForm).toLowerCase().split(/\s+/)[0];
    if (needle && !hay.includes(needle)) {
      err(`${w.id}：targetForm「${ex.targetForm}」沒有出現在例句「${ex.cz}」中`);
    }
  }
}

for (const u of units) {
  if (unitIds.has(u.id)) err(`小節 id 重複：${u.id}`);
  unitIds.add(u.id);
  if (!topicIds.has(u.topicId)) err(`${u.id}：未知主題 ${u.topicId}`);
  if (u.wordIds.length > 12) err(`${u.id}：${u.wordIds.length} 個字，超過上限 12`);
  if (u.wordIds.length === 0) err(`${u.id}：沒有單字`);
  if (new Set(u.wordIds).size !== u.wordIds.length) err(`${u.id}：wordIds 有重複`);
  for (const id of u.wordIds) {
    if (!wordIds.has(id)) err(`${u.id}：指向不存在的單字 ${id}`);
    else if (!words.find((w) => w.id === id)!.units.includes(u.id)) {
      err(`${u.id} 與 ${id} 的 units 欄不一致`);
    }
  }
  const last = u.checkpoints[u.checkpoints.length - 1];
  if (last !== u.wordIds.length) {
    err(`${u.id}：最後一個檢查點 ${last} 應等於字數 ${u.wordIds.length}`);
  }
  for (let i = 1; i < u.checkpoints.length; i++) {
    if (u.checkpoints[i] <= u.checkpoints[i - 1]) err(`${u.id}：檢查點未遞增`);
  }
}

for (const w of words) {
  for (const id of w.units) if (!unitIds.has(id)) err(`${w.id}：指向不存在的小節 ${id}`);
  if (!w.units.length) err(`${w.id} (${w.cz})：沒有被分進任何小節`);
  for (const r of w.relations ?? []) {
    if (!wordIds.has(r.ref)) warn(`${w.id} (${w.cz})：關聯詞 ${r.ref} 不在詞庫中（卡片上會顯示為純文字）`);
  }
}

const grammarIds = new Set<string>();
for (const g of grammar) {
  if (grammarIds.has(g.id)) err(`文法節 id 重複：${g.id}`);
  grammarIds.add(g.id);
  if (!g.bodyHtml.trim()) err(`${g.id}：內文為空`);
  if (!g.categories.length) warn(`${g.id}（第 ${g.number} 節）：未歸入任何區塊`);
  for (const id of g.relatedWordIds) if (!wordIds.has(id)) err(`${g.id}：指向不存在的單字 ${id}`);
}

for (const [form, ids] of Object.entries(lemmaIndex)) {
  if (!form.trim()) err("反查索引有空鍵");
  for (const id of ids) if (!wordIds.has(id)) err(`反查索引 ${form} 指向不存在的單字 ${id}`);
}

for (const w of words) {
  const refs = w.grammarRefs ?? [];
  for (const n of refs) {
    if (!grammar.some((g) => g.number === n)) {
      warn(`${w.id} (${w.cz})：引用的文法第 ${n} 節尚未存在（種子資料只有部分節）`);
    }
  }
}

// §14：daily.json 的每個 wordId 都要存在，deep link 才不會連到不存在的卡片。
// 檔案由 gen-daily.ts 產生，還沒產生就跳過。
const dailyFile = path.join(CONTENT, "daily.json");
if (fs.existsSync(dailyFile)) {
  const daily = read<{ index: number; cz: string; zh: string; wordId: string }[]>("daily.json");
  const seenIndex = new Set<number>();
  for (const d of daily) {
    if (!wordIds.has(d.wordId)) err(`daily.json：${d.wordId} 不在 words.json 中（deep link 會斷）`);
    if (seenIndex.has(d.index)) err(`daily.json：index ${d.index} 重複`);
    seenIndex.add(d.index);
    if (!d.cz.trim() || !d.zh.trim()) err(`daily.json：index ${d.index} 缺捷克文或中文`);
  }
}

for (const line of warnings) console.warn(`warn  ${line}`);
for (const line of errors) console.error(`ERROR ${line}`);
console.log(
  errors.length
    ? `validate ✗  ${errors.length} 個錯誤・${warnings.length} 個警告`
    : `validate ✓  單字 ${words.length}・小節 ${units.length}・文法 ${grammar.length}・警告 ${warnings.length}`,
);
process.exit(errors.length ? 1 : 0);
