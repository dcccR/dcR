import { Link, useNavigate, useParams } from "react-router-dom";
import { getTopic, getWords, unitsOfTopic } from "@/lib/content";
import { useUser } from "@/store/user";
import { PageHeader } from "@/components/AppShell";
import { ProgressBlocks } from "@/components/Bits";

export function UnitsPage() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const unitProgress = useUser((s) => s.unitProgress);
  const topic = getTopic(topicId!);
  const us = unitsOfTopic(topicId!);

  if (!topic) return <p>找不到這個主題。</p>;

  return (
    <>
      <PageHeader title={topic.zh} subtitle={topic.cz} back={() => navigate("/vocab")} />
      <ul className="space-y-3">
        {us.map((u) => {
          const p = unitProgress[u.id];
          const ws = getWords(u.wordIds);
          return (
            <li key={u.id}>
              <Link to={`/vocab/unit/${u.id}`} className="sheet block rounded p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-narrow text-lg font-bold">{u.title.zh}</p>
                    <p className="text-sm text-[var(--ink-soft)]">{u.subtitle}</p>
                  </div>
                  <ProgressBlocks
                    states={u.wordIds.map((_, i) =>
                      p?.status === "done"
                        ? "done"
                        : p && i <= p.lastWordIndex
                          ? "in-progress"
                          : "new",
                    )}
                  />
                </div>
                <p className="tag-mono mt-2 text-[var(--ink-soft)]">
                  {u.wordIds.length} 字 ・ 檢查點 {u.checkpoints.join(" / ")}
                  {p?.status === "done" ? " ・ 已完成" : p ? ` ・ 讀到第 ${p.lastWordIndex + 1} 張` : ""}
                </p>
                <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                  {ws.map((w) => w.cz).join("・")}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
