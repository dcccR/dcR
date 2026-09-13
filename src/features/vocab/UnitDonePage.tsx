import { Link, useNavigate, useParams } from "react-router-dom";
import { getUnit, getWords, units } from "@/lib/content";
import { useUser } from "@/store/user";
import { PageHeader } from "@/components/AppShell";
import { StarButton } from "@/components/Bits";
import { Speak } from "@/components/Speak";

/** 完成頁：本節單字一覽、再測一次、下一節。不顯示正確率（§4.6）。 */
export function UnitDonePage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const unit = getUnit(unitId!);
  const needsWork = useUser((s) => s.needsWork);
  if (!unit) return <p>找不到這個小節。</p>;

  const words = getWords(unit.wordIds);
  const siblings = units.filter((u) =>
    unit.verbGroup ? u.verbGroup === unit.verbGroup : u.topicId === unit.topicId && !u.verbGroup,
  );
  const nextUnit = siblings[siblings.findIndex((u) => u.id === unit.id) + 1];
  const backTo = unit.verbGroup ? `/vocab/verbs/${unit.verbGroup}` : `/vocab/topic/${unit.topicId}`;

  return (
    <>
      <PageHeader title="這節學完了" subtitle={unit.title.zh} back={() => navigate(backTo)} />

      <ul className="sheet divide-y divide-[var(--rule)] rounded">
        {words.map((w) => (
          <li key={w.id} className="flex items-center gap-2 px-3 py-2">
            <StarButton wordId={w.id} size="sm" />
            <Link to={`/vocab/word/${w.id}`} className="min-w-0 flex-1">
              <p className="font-narrow text-lg">{w.cz}</p>
              <p className="truncate text-sm text-[var(--ink-soft)]">{w.zh}</p>
            </Link>
            {w.id in needsWork && (
              <span className="tag-mono text-[var(--red)]">還需答對 {2 - needsWork[w.id]} 次</span>
            )}
            <Speak text={w.cz} />
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-2">
        <button
          type="button"
          onClick={() =>
            navigate(
              `/vocab/unit/${unit.id}/quiz?from=0&to=${unit.checkpoints[unit.checkpoints.length - 1]}&final=1&attempt=${Date.now()}`,
            )
          }
          className="hit rounded border border-[var(--rule)] px-3"
        >
          再測一次
        </button>
        {nextUnit && (
          <Link to={`/vocab/unit/${nextUnit.id}`} className="hit grid place-items-center rounded border-2 border-[var(--ink)] px-3 font-semibold">
            下一節：{nextUnit.title.zh}
          </Link>
        )}
        <Link to={backTo} className="hit grid place-items-center rounded border border-[var(--rule)] px-3">
          回主題
        </Link>
      </div>
    </>
  );
}
