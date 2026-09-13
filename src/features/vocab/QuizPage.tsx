import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getUnit, getWords, words as allWords } from "@/lib/content";
import { buildCheckpointQuiz, buildUnitQuiz, type Question } from "@/lib/quiz";
import { useUser } from "@/store/user";
import { PageHeader } from "@/components/AppShell";
import { Speak } from "@/components/Speak";
import { speak } from "@/lib/audio";

/** 檢查點測驗與小節總測驗。不計分、不顯示正確率（§13）。 */
export function QuizPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const unit = getUnit(unitId!);
  const needsWork = useUser((s) => s.needsWork);
  const recordAnswer = useUser((s) => s.recordAnswer);
  const markUnsure = useUser((s) => s.markUnsure);
  const passCheckpoint = useUser((s) => s.passCheckpoint);
  const showEnglish = useUser((s) => s.settings.showEnglish);

  const from = Number(params.get("from") ?? 0);
  const to = Number(params.get("to") ?? 0);
  const isFinal = params.get("final") === "1";
  const attempt = params.get("attempt") ?? "1";

  const questions = useMemo<Question[]>(() => {
    if (!unit) return [];
    const unitWords = getWords(unit.wordIds);
    return isFinal
      ? buildUnitQuiz(unitWords, allWords, needsWork, 6, `${unit.id}:${attempt}`)
      : buildCheckpointQuiz(unitWords.slice(from, to), unitWords, allWords, `${unit.id}:${to}:${attempt}`);
    // needsWork 只在建題當下取一次，答題過程中不重排題目
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit?.id, from, to, isFinal, attempt]);

  const [step, setStep] = useState(0);
  const [chosen, setChosen] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  if (!unit) return <p>找不到這個小節。</p>;
  if (!questions.length) return <p>這個檢查點沒有題目。</p>;

  const q = questions[step];
  const answered = chosen !== null || revealed;

  const choose = (i: number) => {
    if (answered) return;
    setChosen(i);
    const correct = i === q.answerIndex;
    recordAnswer(q.wordId, correct);
    if (correct && q.example) speak(q.example.cz);
  };

  const next = () => {
    if (step + 1 < questions.length) {
      setStep(step + 1);
      setChosen(null);
      setRevealed(false);
      return;
    }
    passCheckpoint(unit.id, to || unit.checkpoints[unit.checkpoints.length - 1]);
    navigate(isFinal ? `/vocab/unit/${unit.id}/done` : `/vocab/unit/${unit.id}`);
  };

  return (
    <>
      <PageHeader
        title={isFinal ? "小節總測驗" : `檢查點 ・ 第 ${from + 1}–${to} 個字`}
        subtitle={`${unit.title.zh} ・ 第 ${step + 1} / ${questions.length} 題`}
        back={() => navigate(`/vocab/unit/${unit.id}`)}
      />

      <div className="sheet rounded p-4">
        {q.kind === "cloze" ? (
          <>
            <p className="font-narrow text-2xl leading-relaxed">{q.stem}</p>
            <p className="mt-2 text-[var(--ink-soft)]">{q.stemZh}</p>
            {showEnglish && q.stemEn && <p className="italic text-[var(--ink-soft)]">{q.stemEn}</p>}
          </>
        ) : (
          <>
            <p className="font-narrow text-2xl">「{q.stem}」</p>
            {showEnglish && q.stemEn && <p className="italic text-[var(--ink-soft)]">{q.stemEn}</p>}
          </>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {q.options.map((opt, i) => {
          const isAnswer = i === q.answerIndex;
          const border = !answered
            ? "border-[var(--rule)]"
            : isAnswer
              ? "border-[var(--green)] bg-[var(--green)]/10"
              : i === chosen
                ? "border-[var(--red)] bg-[var(--red)]/10"
                : "border-[var(--rule)] opacity-60";
          return (
            <li key={opt.id} className={`flex items-center gap-2 rounded border-2 px-2 transition-colors duration-[120ms] ${border}`}>
              {/* 點喇叭只播音，點選項本體才算作答（§4.7） */}
              <Speak text={opt.cz} />
              <button
                type="button"
                onClick={() => choose(i)}
                className="hit flex-1 py-3 text-left font-narrow text-xl"
              >
                {opt.cz}
              </button>
            </li>
          );
        })}
      </ul>

      {answered && (
        <div className="mt-4 space-y-2 border-l-4 border-[var(--marker)] bg-[var(--marker)]/10 px-3 py-2">
          <p className="font-semibold">
            {revealed ? "答案是" : chosen === q.answerIndex ? "答對了" : "正解"}：
            <span className="font-narrow"> {q.options[q.answerIndex].cz}</span>
            {q.reveal.form !== q.options[q.answerIndex].cz && (
              <span className="text-[var(--ink-soft)]">（句中作 {q.reveal.form}）</span>
            )}
          </p>
          <p className="text-sm text-[var(--ink-soft)]">{q.reveal.explain}</p>
          <button
            type="button"
            onClick={() => navigate(`/vocab/word/${q.wordId}`)}
            className="tag-mono underline"
          >
            回看這張卡
          </button>
        </div>
      )}

      <div className="mt-6 flex items-center gap-3">
        {!answered && (
          <button
            type="button"
            onClick={() => {
              setRevealed(true);
              markUnsure(q.wordId); // 不算答錯，但進需加強（§14 決策 8）
            }}
            className="hit flex-1 rounded border border-[var(--rule)] px-3 text-sm text-[var(--ink-soft)]"
          >
            不確定，直接看答案
          </button>
        )}
        {answered && (
          <button type="button" onClick={next} className="hit flex-1 rounded border-2 border-[var(--ink)] px-3 font-semibold">
            {step + 1 < questions.length ? "下一題 →" : isFinal ? "完成小節 →" : "回到卡片 →"}
          </button>
        )}
      </div>
    </>
  );
}
