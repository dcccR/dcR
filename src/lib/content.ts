// 內容載入層：content/*.json 隨 build 打包，執行時不連任何服務。

import topicsJson from "@content/topics.json";
import wordsJson from "@content/words.json";
import unitsJson from "@content/units.json";
import grammarJson from "@content/grammar.json";
import lemmaJson from "@content/lemma-index.json";
import type { GrammarSection, LemmaIndex, Topic, Unit, Word } from "@/types/content";
import { VERB_GROUP_ORDER, type VerbGroupMeta } from "@/lib/verb-groups";

export const topics = topicsJson as Topic[];
export const words = wordsJson as unknown as Word[];
export const units = unitsJson as unknown as Unit[];
export const grammar = grammarJson as unknown as GrammarSection[];
export const lemmaIndex = lemmaJson as LemmaIndex;

const wordById = new Map(words.map((w) => [w.id, w]));
const unitById = new Map(units.map((u) => [u.id, u]));
const topicById = new Map(topics.map((t) => [t.id, t]));

export const getWord = (id: string) => wordById.get(id);
export const getUnit = (id: string) => unitById.get(id);
export const getTopic = (id: string) => topicById.get(id);

export const getWords = (ids: string[]) =>
  ids.map((id) => wordById.get(id)).filter((w): w is Word => Boolean(w));

/** 主題清單；動詞是獨立模組，不與其他主題並列（§4.2）。 */
export const listTopics = () => topics.filter((t) => !t.standalone);
export const verbTopic = () => topics.find((t) => t.standalone);

export const unitsOfTopic = (topicId: string) =>
  units.filter((u) => u.topicId === topicId && !u.verbGroup);

export const unitsOfVerbGroup = (group: string) =>
  units.filter((u) => u.verbGroup === group);

export const wordsOfTopic = (topicId: string) =>
  words.filter((w) => w.topics.includes(topicId));

export const verbGroupsInUse = (): VerbGroupMeta[] =>
  VERB_GROUP_ORDER.filter((g) => units.some((u) => u.verbGroup === g.id));

/** 變格形 → 單字（§8、§9）。輸入會同時比對原拼寫與去變音符形。 */
export const lookupForm = (form: string): Word[] => {
  const key = form.toLowerCase();
  const loose = key.normalize("NFD").replace(/[̀-ͯ]/g, "");
  const ids = lemmaIndex[key] ?? lemmaIndex[loose] ?? [];
  return getWords(ids);
};

export const grammarByNumber = (n: number) => grammar.find((g) => g.number === n);
