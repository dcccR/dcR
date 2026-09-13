// §4.2 動詞變化類推導 + 分區白名單。
// verbClass 由不定式字尾 + 現在式第一人稱字尾推導；情態與移動動詞以白名單指定。

import type { VerbClass, VerbGroup } from "../../src/types/content.js";

const MODAL = new Set(["muset", "moct", "moci", "chtít", "smět", "mít"]);
const MOTION = new Set(["jít", "chodit", "jet", "jezdit"]);

/** 不規則動詞（第 4 類）白名單：字尾規則判不出來的。 */
const IRREGULAR = new Set([
  "jít", "jet", "číst", "psát", "pít", "žít", "mýt", "chtít", "moct", "moci",
  "být", "jíst", "vzít", "říct", "vědět",
]);

export function deriveVerbClass(infinitive: string, present1sg: string): VerbClass {
  const inf = infinitive.replace(/\s+(se|si)$/, "");
  const p1 = present1sg.replace(/\s+(se|si)$/, "");

  if (IRREGULAR.has(inf)) return 4;
  if (/ovat$/.test(inf) && /uju$/.test(p1)) return 3;
  if (/at$/.test(inf) && /ám$/.test(p1)) return 1;
  if (/(it|et|ět)$/.test(inf) && /ím$/.test(p1)) return 2;
  return 4;
}

export function deriveVerbGroups(
  infinitive: string,
  verbClass: VerbClass,
  reflexive: "se" | "si" | null,
): VerbGroup[] {
  const inf = infinitive.replace(/\s+(se|si)$/, "");
  const groups: VerbGroup[] = [`class${verbClass}` as VerbGroup];
  if (MODAL.has(inf)) groups.push("modal");
  if (MOTION.has(inf)) groups.push("motion");
  if (reflexive) groups.push("reflexive");
  return groups;
}

export function reflexiveOf(headword: string): "se" | "si" | null {
  const m = /\s+(se|si)$/.exec(headword);
  return m ? (m[1] as "se" | "si") : null;
}

export const VERB_GROUP_LABELS: Record<VerbGroup, { zh: string; cz: string; grammarRefs: number[] }> = {
  class1: { zh: "第 1 類 -AT → -ÁM", cz: "1. třída", grammarRefs: [12] },
  class2: { zh: "第 2 類 -IT/-ET/-ĚT → -ÍM", cz: "2. třída", grammarRefs: [12] },
  class3: { zh: "第 3 類 -OVAT → -UJU", cz: "3. třída", grammarRefs: [24] },
  class4: { zh: "第 4 類 不規則", cz: "4. třída", grammarRefs: [35] },
  modal: { zh: "情態動詞", cz: "Modální slovesa", grammarRefs: [43, 46] },
  motion: { zh: "移動動詞對", cz: "Slovesa pohybu", grammarRefs: [36, 47] },
  reflexive: { zh: "反身動詞", cz: "Zvratná slovesa", grammarRefs: [13, 50] },
};

export const VERB_GROUP_ORDER: VerbGroup[] = [
  "class1", "class2", "class3", "class4", "modal", "motion", "reflexive",
];
