// 資料模型 —— 對應設計規格書 §3。
// content/*.json 由 scripts/ingest.ts 產生，型別在此單一來源定義。

export type Gender = "m" | "mi" | "f" | "n";

export type Source =
  | "L1p1" | "L1p2" | "L2p1" | "L2p2" | "L3p1" | "L3p2"
  | "L4p1" | "L5" | "L6" | "L7p1" | "L7p2";

export const SOURCES: Source[] = [
  "L1p1", "L1p2", "L2p1", "L2p2", "L3p1", "L3p2", "L4p1", "L5", "L6", "L7p1", "L7p2",
];

export type Pos =
  | "noun" | "verb" | "adj" | "adv" | "phrase"
  | "num" | "prep" | "pron" | "contrast-set" | "other";

export type VerbClass = 1 | 2 | 3 | 4;

/** 動詞在「動詞模組」裡的分區（§4.2）。一個動詞可屬多區。 */
export type VerbGroup =
  | "class1" | "class2" | "class3" | "class4"
  | "modal" | "motion" | "reflexive";

export interface Topic {
  id: string;
  cz: string;
  zh: string;
  /** verb 主題獨立成模組，不與其他主題並列（§4.2）。 */
  standalone?: boolean;
}

export interface Example {
  id: string;
  cz: string;
  zh: string;
  en?: string;
  /** 句中該字實際出現的形，供 highlight 與挖空使用。 */
  targetForm: string;
  case?: 1 | 2 | 4 | 6;
  person?: 1 | 2 | 3 | 4 | 5 | 6;
  origin: "textbook" | "generated";
  reviewed: boolean;
  audio?: string;
}

export interface Declension {
  sg: { nom: string; gen: string; acc: string; loc: string };
  pl?: { nom?: string; gen?: string; acc?: string; loc?: string };
}

export interface VerbInfo {
  aspect: "impf" | "pf";
  pair?: string;
  verbClass: VerbClass;
  groups: VerbGroup[];
  present: [string, string, string, string, string, string];
  pairPresent?: string[];
  negation?: string;
  past?: { m: string; f: string; n: string; plAnim: string; plOther: string };
  imperative?: { ty: string; vy: string };
  reflexive?: "se" | "si" | null;
}

export interface Relation {
  type: "antonym" | "synonym" | "contrast" | "family" | "derived";
  ref: string;
  label?: string;
}

export interface Word {
  id: string;
  cz: string;
  /** 類型①：人物陰性形。 */
  czFem?: string;
  /** 類型③：同義變體，卡片以「亦作：…」呈現。 */
  alsoWritten?: string[];
  /** 類型⑥：`×` 對比卡成員。 */
  contrastSet?: string[];
  /** 對比卡各成員的中文，與 contrastSet 同索引。 */
  contrastZh?: string[];
  zh: string;
  en: string;
  pos: Pos;
  gender?: Gender;
  pluraleTantum?: boolean;
  declension?: Declension;
  adjForms?: { m: string; f: string; n: string };
  verb?: VerbInfo;
  rekce?: string;
  note?: string;
  relations?: Relation[];
  confusables?: string[];
  examples: Example[];
  topics: string[];
  units: string[];
  sources: Source[];
  grammarRefs?: number[];
}

export interface Unit {
  id: string;
  topicId: string;
  index: number;
  title: { cz: string; zh: string };
  /** 副標：首尾單字，如 `muž → holka`。 */
  subtitle?: string;
  /** 動詞模組的小節屬於某個分區（§4.2）；一般主題為 undefined。 */
  verbGroup?: VerbGroup;
  wordIds: string[];
  checkpoints: number[];
}

export type GrammarCategory =
  | "pronunciation" | "person-tense" | "case-1" | "case-2" | "case-4" | "case-6"
  | "adjective" | "pronoun" | "verb-type" | "motion-verbs" | "frequency-time"
  | "number-date" | "preposition" | "syntax" | "situation";

export interface GrammarSection {
  id: string;
  number: number;
  titleCz: string;
  titleZh: string;
  source: Source;
  categories: GrammarCategory[];
  bodyHtml: string;
  relatedWordIds: string[];
}

/** 變格形 → wordId 的反查索引（§8、§9）。 */
export type LemmaIndex = Record<string, string[]>;

export interface ContentBundle {
  topics: Topic[];
  words: Word[];
  units: Unit[];
  grammar: GrammarSection[];
  lemmaIndex: LemmaIndex;
}
