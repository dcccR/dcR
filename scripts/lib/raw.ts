// 來源讀取：優先讀 sources/ 內的真實 HTML，讀不到就退回 content/seed 的夾具。
// 兩條路徑產出完全相同的形狀，所以 HTML 一放進來，整條管線不必改任何一行。

import fs from "node:fs";
import path from "node:path";
import { parse as parseHtml } from "node-html-parser";

export interface RawWord {
  c: string;
  z: string;
  e?: string;
  g?: string;
  d?: [string, string, string];
  s: string;
  t: string;
  n?: string;
  r?: string;
  x?: [string, string];
  v?: {
    a: "impf" | "pf";
    p?: string;
    f: string[];
    neg?: string;
    pf?: string[];
  };
}

export type RawTopic = [string, string, string];

export interface RawGrammar {
  number: number;
  titleCz: string;
  titleZh: string;
  source: string;
  bodyHtml: string;
}

export interface RawInput {
  topics: RawTopic[];
  words: RawWord[];
  grammar: RawGrammar[];
  /** 每個來源的出處說明，寫進 REPORT.md。 */
  provenance: { words: string; grammar: string };
}

const ROOT = path.resolve(import.meta.dirname, "..", "..");

const SLOVICKA_HTML = path.join(ROOT, "sources", "cestina-L1-L7-slovicka.html");
const GRAMATIKA_HTML = path.join(ROOT, "sources", "cestina-L1-L7-gramatika.html");

/** 從 `const NAME = [ ... ]` 取出陣列字面值（用括號配對，不用貪婪正則）。 */
function extractArrayLiteral(src: string, name: string): string | null {
  const re = new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*\\[`);
  const m = re.exec(src);
  if (!m) return null;
  const start = m.index + m[0].length - 1;
  let depth = 0;
  let inStr: string | null = null;
  for (let i = start; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") inStr = ch;
    else if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

function evalArray<T>(literal: string): T[] {
  // 建置期腳本、輸入是我們自己的教材檔，可直接求值 JS 字面值。
  return new Function(`return ${literal};`)() as T[];
}

function readSlovickaHtml(file: string): { topics: RawTopic[]; words: RawWord[] } {
  const src = fs.readFileSync(file, "utf8");
  const tLit = extractArrayLiteral(src, "T");
  const dLit = extractArrayLiteral(src, "D");
  if (!tLit || !dLit) {
    throw new Error(`${path.basename(file)}: 找不到 const T / const D 陣列`);
  }
  return { topics: evalArray<RawTopic>(tLit), words: evalArray<RawWord>(dLit) };
}

function readGramatikaHtml(file: string): RawGrammar[] {
  const root = parseHtml(fs.readFileSync(file, "utf8"));
  const out: RawGrammar[] = [];
  for (const node of root.querySelectorAll("div.gram")) {
    const h3 = node.querySelector("h3");
    if (!h3) continue;
    const tag = h3.querySelector(".tag");
    const source = normalizeSource(tag?.text ?? "") ?? (tag?.text.trim() ?? "");
    tag?.remove();
    const heading = h3.text.replace(/\s+/g, " ").trim();
    const numMatch = /^(\d+)/.exec(heading);
    const number = numMatch ? Number(numMatch[1]) : out.length + 1;
    const title = heading.replace(/^\d+\s*[·．.。・]?\s*/, "").trim();
    const { titleCz, titleZh } = splitTitle(title);
    h3.remove();
    out.push({ number, titleCz, titleZh, source, bodyHtml: node.innerHTML.trim() });
  }
  return out;
}

/**
 * 教材標題的實際格式是「Czech — 中文」，破折號是主要分界；
 * 沒有破折號時退而以第一個漢字為界。兩者都沒有就整串當捷克標題。
 */
export function splitTitle(title: string): { titleCz: string; titleZh: string } {
  const trim = (t: string) => t.replace(/^[\s\u2014\u2013\-\u00b7:\uff1a]+|[\s\u2014\u2013\-\u00b7:\uff1a]+$/g, "").trim();

  const dash = /\s[\u2014\u2013]\s?|\s-\s/.exec(title);
  if (dash) {
    const cz = trim(title.slice(0, dash.index));
    const zh = trim(title.slice(dash.index + dash[0].length));
    if (cz || zh) return { titleCz: cz, titleZh: zh };
  }
  // 漢字與假名才算中文標題的起點（全形 ＋ ？ 等符號不算）
  const han = /[\u4e00-\u9fff\u3040-\u30ff]/.exec(title);
  if (han) {
    return { titleCz: trim(title.slice(0, han.index)), titleZh: trim(title.slice(han.index)) };
  }
  return { titleCz: trim(title), titleZh: "" };
}

/**
 * 文法檔的來源標籤寫成 `L1 part 1`、`L3 part 1 · part 2`，
 * 單字檔寫成 `L1p1`。統一成後者；跨兩部分的取第一個。
 * 對不上就回 null，由呼叫端報告，不可默默套一個預設值。
 */
export function normalizeSource(tag: string): string | null {
  const t = tag.trim();
  if (/^L\d(p\d)?$/.test(t)) return t;
  const m = /^L(\d)\s*(?:part\s*(\d))?/i.exec(t);
  if (!m) return null;
  return m[2] ? `L${m[1]}p${m[2]}` : `L${m[1]}`;
}

export function loadRaw(): RawInput {
  let topics: RawTopic[];
  let words: RawWord[];
  let grammar: RawGrammar[];
  const provenance = { words: "", grammar: "" };

  if (fs.existsSync(SLOVICKA_HTML)) {
    ({ topics, words } = readSlovickaHtml(SLOVICKA_HTML));
    provenance.words = "sources/cestina-L1-L7-slovicka.html";
  } else {
    const seed = JSON.parse(
      fs.readFileSync(path.join(ROOT, "content", "seed", "raw-words.json"), "utf8"),
    );
    topics = seed.T;
    words = seed.D;
    provenance.words = "content/seed/raw-words.json（種子資料，尚未放入真實 HTML）";
  }

  if (fs.existsSync(GRAMATIKA_HTML)) {
    grammar = readGramatikaHtml(GRAMATIKA_HTML);
    provenance.grammar = "sources/cestina-L1-L7-gramatika.html";
  } else {
    const seed = JSON.parse(
      fs.readFileSync(path.join(ROOT, "content", "seed", "raw-grammar.json"), "utf8"),
    );
    grammar = seed.sections;
    provenance.grammar = "content/seed/raw-grammar.json（種子資料，尚未放入真實 HTML）";
  }

  return { topics, words, grammar, provenance };
}

export { ROOT };
