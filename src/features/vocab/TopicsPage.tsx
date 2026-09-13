import { Link } from "react-router-dom";
import { listTopics, unitsOfTopic, verbTopic, wordsOfTopic, units as allUnits, words as allWords } from "@/lib/content";
import { useUser } from "@/store/user";
import { ProgressBlocks } from "@/components/Bits";
import { PageHeader } from "@/components/AppShell";
import { SOURCES, type Source } from "@/types/content";
import { useState } from "react";

type Filter = { source: Source | "all"; starredOnly: boolean; needsWorkOnly: boolean };

export function TopicsPage() {
  const unitProgress = useUser((s) => s.unitProgress);
  const starred = useUser((s) => s.starred);
  const needsWork = useUser((s) => s.needsWork);
  const [filter, setFilter] = useState<Filter>({ source: "all", starredOnly: false, needsWorkOnly: false });

  const matches = (topicId: string) => {
    let ws = wordsOfTopic(topicId);
    if (filter.source !== "all") ws = ws.filter((w) => w.sources.includes(filter.source as Source));
    if (filter.starredOnly) ws = ws.filter((w) => starred.includes(w.id));
    if (filter.needsWorkOnly) ws = ws.filter((w) => w.id in needsWork);
    return ws;
  };

  const verb = verbTopic();
  const verbUnits = allUnits.filter((u) => u.verbGroup);
  const verbWordCount = allWords.filter((w) => w.topics.includes("verb")).length;

  return (
    <>
      <PageHeader title="Slovíčka 單字" subtitle="主題 → 小節（每節 ≤10 字）→ 單字卡 → 檢查點" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={filter.source}
          onChange={(e) => setFilter({ ...filter, source: e.target.value as Source | "all" })}
          className="tag-mono rounded border border-[var(--rule)] bg-[var(--paper-2)] px-2 py-1"
        >
          <option value="all">全部來源</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setFilter({ ...filter, starredOnly: !filter.starredOnly })}
          className={`rounded-full border px-3 py-1 text-xs ${filter.starredOnly ? "border-[var(--marker)] bg-[var(--marker)]/25" : "border-[var(--rule)]"}`}
        >
          僅看 ★
        </button>
        <button
          type="button"
          onClick={() => setFilter({ ...filter, needsWorkOnly: !filter.needsWorkOnly })}
          className={`rounded-full border px-3 py-1 text-xs ${filter.needsWorkOnly ? "border-[var(--red)] text-[var(--red)]" : "border-[var(--rule)]"}`}
        >
          僅看需加強
        </button>
      </div>

      {verb && verbWordCount > 0 && (
        <Link
          to="/vocab/verbs"
          className="sheet mb-4 flex items-center justify-between rounded p-4"
        >
          <div>
            <p className="font-narrow text-xl font-bold">動詞 Slovesa</p>
            <p className="text-sm text-[var(--ink-soft)]">
              獨立模組・依變化類分區・{verbWordCount} 個動詞
            </p>
          </div>
          <ProgressBlocks
            states={verbUnits.map((u) => unitProgress[u.id]?.status ?? "new")}
          />
        </Link>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {listTopics().map((t) => {
          const us = unitsOfTopic(t.id);
          const done = us.filter((u) => unitProgress[u.id]?.status === "done").length;
          const filtered = matches(t.id);
          const dimmed = filtered.length === 0;
          return (
            <li key={t.id}>
              <Link
                to={`/vocab/topic/${t.id}`}
                className={`sheet flex h-full flex-col gap-2 rounded p-3 ${dimmed ? "opacity-40" : ""}`}
              >
                <div>
                  <p className="font-narrow text-lg font-bold">{t.zh}</p>
                  <p className="tag-mono text-[var(--ink-soft)]">{t.cz}</p>
                </div>
                <p className="text-sm text-[var(--ink-soft)]">
                  {filtered.length} / {wordsOfTopic(t.id).length} 字 ・ {done} / {us.length} 節
                </p>
                <ProgressBlocks states={us.map((u) => unitProgress[u.id]?.status ?? "new")} />
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
