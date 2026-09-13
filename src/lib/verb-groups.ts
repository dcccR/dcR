import type { VerbGroup } from "@/types/content";

export interface VerbGroupMeta {
  id: VerbGroup;
  zh: string;
  cz: string;
  hint: string;
  grammarRefs: number[];
}

/** §4.2 動詞模組的分區。與 scripts/lib/verbs.ts 的推導規則對應。 */
export const VERB_GROUP_ORDER: VerbGroupMeta[] = [
  { id: "class1", zh: "第 1 類", cz: "-AT → -ÁM", hint: "dělat, čekat…", grammarRefs: [12] },
  { id: "class2", zh: "第 2 類", cz: "-IT/-ET/-ĚT → -ÍM", hint: "mluvit, bydlet…", grammarRefs: [12] },
  { id: "class3", zh: "第 3 類", cz: "-OVAT → -UJU", hint: "studovat, pracovat…", grammarRefs: [24] },
  { id: "class4", zh: "第 4 類", cz: "不規則", hint: "jít, číst, psát…", grammarRefs: [35] },
  { id: "modal", zh: "情態動詞", cz: "Modální slovesa", hint: "muset, moct, chtít…", grammarRefs: [43, 46] },
  { id: "motion", zh: "移動動詞對", cz: "Slovesa pohybu", hint: "jít × chodit, jet × jezdit", grammarRefs: [36, 47] },
  { id: "reflexive", zh: "反身動詞", cz: "Zvratná slovesa", hint: "dívat se, učit se…", grammarRefs: [13, 50] },
];

export const verbGroupMeta = (id: VerbGroup) =>
  VERB_GROUP_ORDER.find((g) => g.id === id)!;
