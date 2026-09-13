// §4.1 小節切分：主題內依來源排序，每 10 字一節；
// 餘數 ≥4 自成一節，<4 併入前一節（該節最多 12 字，檢查點改 [4,8,12]）。

import { SOURCES, type Source, type Unit, type Word } from "../../src/types/content.js";

const SOURCE_RANK = new Map(SOURCES.map((s, i) => [s, i]));

export function earliestSource(w: Word): Source {
  return [...w.sources].sort(
    (a, b) => (SOURCE_RANK.get(a) ?? 99) - (SOURCE_RANK.get(b) ?? 99),
  )[0];
}

export function checkpointsFor(size: number): number[] {
  const cps: number[] = [];
  for (let i = 4; i < size; i += 4) cps.push(i);
  if (cps[cps.length - 1] !== size) cps.push(size);
  return cps;
}

export interface UnitTitleOverride {
  [unitId: string]: { cz?: string; zh?: string; subtitle?: string };
}

export function buildUnits(
  topicId: string,
  topicZh: string,
  topicCz: string,
  words: Word[],
  overrides: UnitTitleOverride = {},
): Unit[] {
  const ordered = [...words].sort((a, b) => {
    const ra = SOURCE_RANK.get(earliestSource(a)) ?? 99;
    const rb = SOURCE_RANK.get(earliestSource(b)) ?? 99;
    if (ra !== rb) return ra - rb;
    return 0; // 同來源維持原始順序（Array.prototype.sort 在 V8 為穩定排序）
  });

  const chunks: Word[][] = [];
  for (let i = 0; i < ordered.length; i += 10) chunks.push(ordered.slice(i, i + 10));
  // 餘數 <4 併入前一節，但該節上限 12 字：
  // 餘數 1–2 直接併（前節變 11 或 12 字）；餘數 3 併進去會變 13，
  // 改從前一節借 1 個字讓最後一節湊滿 4，兩節都落在 4–12 的範圍內。
  if (chunks.length > 1) {
    const last = chunks[chunks.length - 1];
    const prev = chunks[chunks.length - 2];
    if (last.length < 4) {
      if (prev.length + last.length <= 12) {
        prev.push(...last);
        chunks.pop();
      } else {
        while (last.length < 4) last.unshift(prev.pop()!);
      }
    }
  }

  return chunks.map((chunk, i) => {
    const id = `u_${topicId}_${String(i + 1).padStart(2, "0")}`;
    const ov = overrides[id] ?? {};
    const subtitle = chunk.length > 1 ? `${chunk[0].cz} → ${chunk[chunk.length - 1].cz}` : chunk[0].cz;
    return {
      id,
      topicId,
      index: i + 1,
      title: {
        cz: ov.cz ?? `${topicCz} ${i + 1}`,
        zh: ov.zh ?? `${topicZh} ・ 第 ${i + 1} 節`,
      },
      subtitle: ov.subtitle ?? subtitle,
      wordIds: chunk.map((w) => w.id),
      checkpoints: checkpointsFor(chunk.length),
    };
  });
}
