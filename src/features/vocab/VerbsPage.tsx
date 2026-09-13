import { Link, useNavigate, useParams } from "react-router-dom";
import { getWords, unitsOfVerbGroup, verbGroupsInUse, words as allWords } from "@/lib/content";
import { verbGroupMeta } from "@/lib/verb-groups";
import { useUser } from "@/store/user";
import { ProgressBlocks } from "@/components/Bits";
import { PageHeader } from "@/components/AppShell";
import type { VerbGroup } from "@/types/content";

/** §4.2 動詞獨立成模組，依變化類分區。 */
export function VerbGroupsPage() {
  const navigate = useNavigate();
  const unitProgress = useUser((s) => s.unitProgress);
  return (
    <>
      <PageHeader
        title="動詞 Slovesa"
        subtitle="依變化類分區；一個動詞可同時出現在兩區"
        back={() => navigate("/vocab")}
      />
      <ul className="space-y-3">
        {verbGroupsInUse().map((g) => {
          const us = unitsOfVerbGroup(g.id);
          const count = allWords.filter((w) => w.verb?.groups.includes(g.id)).length;
          return (
            <li key={g.id}>
              <Link to={`/vocab/verbs/${g.id}`} className="sheet flex items-center justify-between rounded p-3">
                <div>
                  <p className="font-narrow text-lg font-bold">
                    {g.zh} <span className="tag-mono text-[var(--ink-soft)]">{g.cz}</span>
                  </p>
                  <p className="text-sm text-[var(--ink-soft)]">
                    {g.hint} ・ {count} 個 ・ 文法第 {g.grammarRefs.join("、")} 節
                  </p>
                </div>
                <ProgressBlocks states={us.map((u) => unitProgress[u.id]?.status ?? "new")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function VerbGroupUnitsPage() {
  const { group } = useParams<{ group: string }>();
  const navigate = useNavigate();
  const unitProgress = useUser((s) => s.unitProgress);
  const meta = verbGroupMeta(group as VerbGroup);
  const us = unitsOfVerbGroup(group!);

  return (
    <>
      <PageHeader title={`${meta.zh} ${meta.cz}`} subtitle={meta.hint} back={() => navigate("/vocab/verbs")} />
      <ul className="space-y-3">
        {us.map((u) => {
          const p = unitProgress[u.id];
          const ws = getWords(u.wordIds);
          return (
            <li key={u.id}>
              <Link to={`/vocab/unit/${u.id}`} className="sheet block rounded p-3">
                <p className="font-narrow text-lg font-bold">{u.title.zh}</p>
                <p className="text-sm text-[var(--ink-soft)]">{ws.map((w) => w.cz).join("・")}</p>
                <p className="tag-mono mt-1 text-[var(--ink-soft)]">
                  {u.wordIds.length} 字 ・ 檢查點 {u.checkpoints.join(" / ")}
                  {p?.status === "done" ? " ・ 已完成" : p ? ` ・ 讀到第 ${p.lastWordIndex + 1} 張` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
