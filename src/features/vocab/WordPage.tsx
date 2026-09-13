import { useNavigate, useParams } from "react-router-dom";
import { getWord } from "@/lib/content";
import { WordCard } from "@/components/WordCard";
import { PageHeader } from "@/components/AppShell";

export function WordPage() {
  const { wordId } = useParams<{ wordId: string }>();
  const navigate = useNavigate();
  const word = getWord(wordId!);
  if (!word) return <p>找不到這個字。</p>;
  return (
    <>
      <PageHeader title="單字卡" back={() => navigate(-1)} />
      <div className="sheet rounded p-4">
        <WordCard word={word} />
      </div>
    </>
  );
}
