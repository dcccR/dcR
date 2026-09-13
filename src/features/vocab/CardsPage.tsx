import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUnit, getWord, getWords } from "@/lib/content";
import { useUser } from "@/store/user";
import { WordCard } from "@/components/WordCard";
import { PageHeader } from "@/components/AppShell";
import { stop } from "@/lib/audio";

/** 一個小節的卡片流：左右滑動換字，走到檢查點就進測驗（§4.4、§4.6）。 */
export function CardsPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const navigate = useNavigate();
  const unit = getUnit(unitId!);
  const openUnit = useUser((s) => s.openUnit);
  const setPosition = useUser((s) => s.setUnitPosition);
  const progress = useUser((s) => (unitId ? s.unitProgress[unitId] : undefined));
  const passed = useMemo(() => progress?.checkpointsPassed ?? [], [progress]);

  const [index, setIndex] = useState(progress?.lastWordIndex ?? 0);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    if (unitId) openUnit(unitId);
  }, [unitId, openUnit]);

  useEffect(() => {
    if (unitId) setPosition(unitId, index);
    stop(); // 卡片切換時停止播放（§5.3）
  }, [unitId, index, setPosition]);

  if (!unit) return <p>找不到這個小節。</p>;
  const words = getWords(unit.wordIds);
  const word = words[Math.min(index, words.length - 1)];

  const goNext = () => {
    const next = index + 1;
    const checkpoint = unit.checkpoints.find((c) => c === next);
    if (checkpoint && !passed.includes(checkpoint)) {
      const prev = unit.checkpoints.filter((c) => c < checkpoint).pop() ?? 0;
      const isFinal = checkpoint === unit.checkpoints[unit.checkpoints.length - 1];
      navigate(
        `/vocab/unit/${unit.id}/quiz?from=${prev}&to=${checkpoint}${isFinal ? "&final=1" : ""}`,
      );
      return;
    }
    if (next >= words.length) {
      navigate(`/vocab/unit/${unit.id}/done`);
      return;
    }
    setIndex(next);
  };

  const goPrev = () => setIndex((i) => Math.max(0, i - 1));

  return (
    <div
      onTouchStart={(e) => (touchStart.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (dx < -48) goNext();
        else if (dx > 48) goPrev();
      }}
    >
      <PageHeader
        title={unit.title.zh}
        subtitle={unit.subtitle}
        back={() => navigate(unit.verbGroup ? `/vocab/verbs/${unit.verbGroup}` : `/vocab/topic/${unit.topicId}`)}
      />

      <div className="sheet rounded p-4 transition-transform duration-[180ms]" key={word.id}>
        <WordCard word={getWord(word.id)!} />
      </div>

      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={goPrev}
          disabled={index === 0}
          className="hit rounded border border-[var(--rule)] px-4 disabled:opacity-30"
        >
          ← 上一張
        </button>
        <span className="tag-mono text-[var(--ink-soft)]">
          {index + 1} / {words.length}
        </span>
        <button type="button" onClick={goNext} className="hit rounded border border-[var(--ink)] px-4">
          {unit.checkpoints.includes(index + 1) && !passed.includes(index + 1)
            ? "檢查點 →"
            : "下一張 →"}
        </button>
      </div>
    </div>
  );
}
