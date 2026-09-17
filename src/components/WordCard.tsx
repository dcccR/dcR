import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Word } from "@/types/content";
import { useUser } from "@/store/user";
import { speak } from "@/lib/audio";
import { usableExamples } from "@/lib/quiz";
import { Speak } from "@/components/Speak";
import { Chip, GenderTag, SourceTag, StarButton, posLabel } from "@/components/Bits";
import { getWord } from "@/lib/content";
import { verbGroupMeta } from "@/lib/verb-groups";

/** 變化的字尾用黃色 highlight：與第 1 格比對共同字首。 */
function HighlightedForm({ base, form }: { base: string; form: string }) {
  let i = 0;
  while (i < base.length && i < form.length && base[i].toLowerCase() === form[i].toLowerCase()) i++;
  if (i === form.length) return <span>{form}</span>;
  return (
    <span>
      {form.slice(0, i)}
      <span className="mark">{form.slice(i)}</span>
    </span>
  );
}

function CaseBar({ word }: { word: Word }) {
  const d = word.declension;
  if (!d) return null;
  const table = word.pluraleTantum && d.pl ? d.pl : d.sg;
  const rows: [string, string | undefined][] = [
    ["1", table.nom],
    ["2", table.gen],
    ["4", table.acc],
    ["6", table.loc],
  ];
  const base = table.nom ?? word.cz;
  return (
    <div className="sheet rounded">
      {word.pluraleTantum && (
        <div className="border-b border-[var(--rule)] px-3 py-1 text-xs text-[var(--ink-soft)]">
          只有複數形 —— 下表為複數格位
        </div>
      )}
      {rows.map(([label, form]) => (
        <div
          key={label}
          className="flex items-center gap-3 border-b border-[var(--rule)] px-3 py-2 last:border-b-0"
        >
          <span className="tag-mono w-4 text-[var(--ink-soft)]">{label}</span>
          <span className="flex-1 text-lg">
            {form ? <HighlightedForm base={base} form={form} /> : "—"}
          </span>
          {form && <Speak text={form} />}
        </div>
      ))}
    </div>
  );
}

const PERSONS = ["já", "ty", "on / ona", "my", "vy", "oni"];

function VerbTable({ word }: { word: Word }) {
  const v = word.verb;
  if (!v) return null;
  const group = v.groups[0] ? verbGroupMeta(v.groups[0]) : undefined;
  return (
    <div className="sheet rounded">
      <div className="flex items-center justify-between border-b border-[var(--rule)] px-3 py-1.5">
        <span className="tag-mono text-[var(--ink-soft)]">
          {group ? `${group.zh} ${group.cz}` : "動詞"}
        </span>
        {v.pair && <span className="tag-mono text-[var(--ink-soft)]">完成體 {v.pair}</span>}
      </div>
      {v.present.map((form, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-[var(--rule)] px-3 py-1.5">
          <span className="tag-mono w-16 text-[var(--ink-soft)]">{PERSONS[i]}</span>
          <span className="flex-1">{form}</span>
          {v.pairPresent?.[i] && (
            <span className="flex-1 text-[var(--ink-soft)]">{v.pairPresent[i]}</span>
          )}
          <Speak text={form} />
        </div>
      ))}
      {v.negation && (
        <div className="flex items-center gap-3 px-3 py-1.5">
          <span className="tag-mono w-16 text-[var(--red)]">否定</span>
          <span className="flex-1">{v.negation}</span>
          <Speak text={v.negation} />
        </div>
      )}
    </div>
  );
}

function ExampleBlock({ word }: { word: Word }) {
  const showEnglish = useUser((s) => s.settings.showEnglish);
  const examples = usableExamples(word);
  // 例句不足就顯示現有的，不留空位、不報錯（§4.5）
  if (!examples.length) return null;
  return (
    <div className="space-y-2">
      {examples.map((ex) => {
        // targetForm 可能是空的（例句用了資料沒有的形），這時就不 highlight
        const idx = ex.targetForm ? ex.cz.toLowerCase().indexOf(ex.targetForm.toLowerCase()) : -1;
        return (
          <div key={ex.id} className="flex items-start gap-2 border-l-2 border-[var(--rule)] pl-3">
            <div className="flex-1">
              <p className="font-semibold">
                {idx >= 0 ? (
                  <>
                    {ex.cz.slice(0, idx)}
                    <span className="mark">{ex.cz.slice(idx, idx + ex.targetForm.length)}</span>
                    {ex.cz.slice(idx + ex.targetForm.length)}
                  </>
                ) : (
                  ex.cz
                )}
                {ex.case && <span className="tag-mono ml-2 text-[var(--ink-soft)]">{ex.case}. pád</span>}
              </p>
              <p className="text-sm text-[var(--ink-soft)]">{ex.zh}</p>
              {showEnglish && ex.en && <p className="text-sm italic text-[var(--ink-soft)]">{ex.en}</p>}
            </div>
            <Speak text={ex.cz} />
          </div>
        );
      })}
    </div>
  );
}

export function WordCard({ word }: { word: Word }) {
  const navigate = useNavigate();
  const showEnglish = useUser((s) => s.settings.showEnglish);
  const autoplay = useUser((s) => s.settings.autoplayCard);
  const audioSpeed = useUser((s) => s.settings.audioSpeed);

  useEffect(() => {
    if (autoplay) speak(word.cz, { rate: audioSpeed });
  }, [word.id, autoplay, audioSpeed, word.cz]);

  const isContrast = word.pos === "contrast-set" && word.contrastSet;

  return (
    <article className="space-y-4">
      <header className="flex items-start justify-between gap-2">
        <span className="tag-mono text-[var(--ink-soft)]">{posLabel(word)}</span>
        <div className="flex items-center gap-2">
          <SourceTag sources={word.sources} />
          <StarButton wordId={word.id} />
        </div>
      </header>

      {isContrast ? (
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(word.contrastSet!.length, 3)}, minmax(0,1fr))` }}>
          {word.contrastSet!.map((member, i) => (
            <div key={member} className="sheet rounded p-3 text-center">
              <p className="font-narrow text-2xl font-bold">{member}</p>
              <p className="mt-1 text-sm text-[var(--ink-soft)]">{word.contrastZh?.[i] ?? ""}</p>
              <div className="mt-2 flex justify-center">
                <Speak text={member} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-narrow text-4xl font-bold leading-tight break-words">{word.cz}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <GenderTag gender={word.gender} />
              {word.verb?.reflexive && (
                <span className="tag-mono rounded border border-[var(--rule)] px-1.5 py-0.5">
                  {word.verb.reflexive}
                </span>
              )}
            </div>
            {word.czFem && (
              <p className="mt-2 flex items-center gap-2 text-2xl">
                <span className="tag-mono rounded bg-[var(--red)] px-1.5 py-0.5 text-[var(--paper-2)]">F</span>
                <span className="font-narrow">{word.czFem}</span>
                <Speak text={word.czFem} />
              </p>
            )}
          </div>
          <Speak text={word.cz} size="lg" label={`朗讀 ${word.cz}`} />
        </div>
      )}

      <div>
        <p className="text-xl">{word.zh}</p>
        {showEnglish && word.en && <p className="italic text-[var(--ink-soft)]">{word.en}</p>}
      </div>

      <CaseBar word={word} />

      {word.adjForms && (
        <div className="sheet flex items-center gap-3 rounded px-3 py-2">
          <span className="tag-mono text-[var(--ink-soft)]">三性</span>
          <span className="flex-1 font-narrow text-lg">
            {word.adjForms.m} / {word.adjForms.f} / {word.adjForms.n}
          </span>
          <Speak text={`${word.adjForms.m}, ${word.adjForms.f}, ${word.adjForms.n}`} />
        </div>
      )}

      <VerbTable word={word} />

      {word.rekce && (
        <button
          type="button"
          onClick={() => navigate(`/grammar?ref=15`)}
          className="flex w-full items-center gap-2 rounded border-2 border-[var(--red)] px-3 py-2 text-left"
        >
          <span className="tag-mono text-[var(--red)]">vazba</span>
          <span className="font-narrow text-lg">
            {word.cz} + {word.rekce}
          </span>
        </button>
      )}

      <ExampleBlock word={word} />

      {(word.note || word.alsoWritten?.length) && (
        <div className="border-l-4 border-[var(--marker)] bg-[var(--marker)]/10 px-3 py-2 text-sm">
          {word.alsoWritten?.length ? <p>亦作：{word.alsoWritten.join("、")}</p> : null}
          {word.note && <p className="text-[var(--ink-soft)]">{word.note}</p>}
        </div>
      )}

      {(word.relations?.length || word.confusables?.length) && (
        <div className="flex flex-wrap gap-2">
          {word.relations?.map((r) => {
            const target = getWord(r.ref);
            const label =
              { antonym: "↔", contrast: "×", synonym: "＝", family: "族", derived: "→" }[r.type];
            return target ? (
              <Chip key={`${r.type}${r.ref}`} onClick={() => navigate(`/vocab/word/${target.id}`)}>
                {label} {target.cz}
              </Chip>
            ) : (
              <Chip key={`${r.type}${r.ref}`}>
                {label} {r.label ?? r.ref}
              </Chip>
            );
          })}
          {word.confusables?.map((c) => (
            <Chip key={c} tone="red">
              易混淆 {c}
            </Chip>
          ))}
        </div>
      )}
    </article>
  );
}
