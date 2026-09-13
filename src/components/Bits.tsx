import type { ReactNode } from "react";
import type { Gender, Source, Word } from "@/types/content";
import { useUser } from "@/store/user";

const GENDER_LABEL: Record<Gender, { text: string; className: string }> = {
  m: { text: "M 有生命", className: "bg-[var(--blue)] text-[var(--paper-2)]" },
  mi: { text: "M 無生命", className: "bg-[var(--blue)]/40 text-[var(--ink)]" },
  f: { text: "F", className: "bg-[var(--red)] text-[var(--paper-2)]" },
  n: { text: "N", className: "bg-[var(--green)] text-[var(--paper-2)]" },
};

export function GenderTag({ gender }: { gender?: Gender }) {
  if (!gender) return null;
  const g = GENDER_LABEL[gender];
  return <span className={`tag-mono rounded px-1.5 py-0.5 ${g.className}`}>{g.text}</span>;
}

export function SourceTag({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;
  return (
    <span className="tag-mono text-[var(--ink-soft)]">
      {sources[0]}
      {sources.length > 1 ? " …" : ""}
    </span>
  );
}

/** ★ 精選鈕。 */
export function StarButton({ wordId, size = "lg" }: { wordId: string; size?: "sm" | "lg" }) {
  const starred = useUser((s) => s.starred.includes(wordId));
  const toggle = useUser((s) => s.toggleStar);
  return (
    <button
      type="button"
      aria-pressed={starred}
      aria-label={starred ? "取消精選" : "加入精選"}
      onClick={() => toggle(wordId)}
      className={`hit grid place-items-center rounded ${size === "lg" ? "text-2xl" : "text-base w-8 h-8 min-w-0 min-h-0"} ${
        starred ? "text-[var(--marker)]" : "text-[var(--rule)]"
      }`}
    >
      {starred ? "★" : "☆"}
    </button>
  );
}

/** 進度用格狀小方塊：不顯示百分比或分數（§4.3）。 */
export function ProgressBlocks({
  states,
}: {
  states: ("done" | "in-progress" | "new")[];
}) {
  return (
    <div className="flex gap-1" aria-hidden>
      {states.map((s, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 border border-[var(--rule)] ${
            s === "done"
              ? "bg-[var(--ink)]"
              : s === "in-progress"
                ? "bg-[linear-gradient(135deg,var(--ink)_50%,transparent_50%)]"
                : ""
          }`}
        />
      ))}
    </div>
  );
}

export function Chip({
  children,
  onClick,
  tone = "plain",
}: {
  children: ReactNode;
  onClick?: () => void;
  tone?: "plain" | "marker" | "red";
}) {
  const toneClass =
    tone === "marker"
      ? "border-[var(--marker)] bg-[var(--marker)]/25"
      : tone === "red"
        ? "border-[var(--red)] text-[var(--red)]"
        : "border-[var(--rule)]";
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${toneClass}`}
    >
      {children}
    </Tag>
  );
}

export function posLabel(w: Word): string {
  return (
    {
      noun: "名詞",
      verb: "動詞",
      adj: "形容詞",
      adv: "副詞",
      phrase: "片語",
      num: "數詞",
      prep: "介系詞",
      pron: "代名詞",
      "contrast-set": "對比卡",
      other: "其他",
    } as const
  )[w.pos];
}
