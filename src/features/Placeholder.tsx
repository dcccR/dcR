import { PageHeader } from "@/components/AppShell";
import { grammar } from "@/lib/content";

/** 文法模組是 M4、聽力與閱讀是 M6；這裡先讓分頁與資料就位。 */
export function GrammarPage() {
  return (
    <>
      <PageHeader title="Gramatika 文法" subtitle={`資料已就位：${grammar.length} 節（模組排在 M4）`} />
      <ul className="sheet divide-y divide-[var(--rule)] rounded">
        {grammar.map((g) => (
          <li key={g.id} className="px-3 py-2">
            <p className="font-narrow text-lg">
              <span className="tag-mono mr-2 text-[var(--ink-soft)]">{g.number}</span>
              {g.titleZh || g.titleCz}
            </p>
            <p className="tag-mono text-[var(--ink-soft)]">
              {g.titleCz} ・ {g.source} ・ {g.categories.join(" / ") || "未分區"}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

export function PracticePage() {
  return (
    <>
      <PageHeader title="Cvičení 練習" subtitle="聽力與閱讀模組排在 M6" />
      <div className="sheet rounded p-4 text-sm text-[var(--ink-soft)]">
        <p>聽力（Part L2 聽問選答、L3 短對話）與閱讀（R1 標示、R2 短文本、R3 短文）會在 M6 加入。</p>
        <p className="mt-2">
          資料結構已定義在 <code>src/types/content.ts</code>，
          <code>content/listening.json</code> 與 <code>content/reading.json</code> 已就位。
        </p>
      </div>
    </>
  );
}
