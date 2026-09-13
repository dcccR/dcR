import { useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { TopicsPage } from "@/features/vocab/TopicsPage";
import { UnitsPage } from "@/features/vocab/UnitsPage";
import { CardsPage } from "@/features/vocab/CardsPage";
import { QuizPage } from "@/features/vocab/QuizPage";
import { UnitDonePage } from "@/features/vocab/UnitDonePage";
import { WordPage } from "@/features/vocab/WordPage";
import { VerbGroupsPage, VerbGroupUnitsPage } from "@/features/vocab/VerbsPage";
import { MePage } from "@/features/review/MePage";
import { GrammarPage, PracticePage } from "@/features/Placeholder";
import { useUser } from "@/store/user";

export function App() {
  const hydrate = useUser((s) => s.hydrate);
  const hydrated = useUser((s) => s.hydrated);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) return <div className="p-8 text-center text-[var(--ink-soft)]">載入中…</div>;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/vocab" replace />} />
        <Route path="/vocab" element={<TopicsPage />} />
        <Route path="/vocab/verbs" element={<VerbGroupsPage />} />
        <Route path="/vocab/verbs/:group" element={<VerbGroupUnitsPage />} />
        <Route path="/vocab/topic/:topicId" element={<UnitsPage />} />
        <Route path="/vocab/unit/:unitId" element={<CardsPage />} />
        <Route path="/vocab/unit/:unitId/quiz" element={<QuizPage />} />
        <Route path="/vocab/unit/:unitId/done" element={<UnitDonePage />} />
        <Route path="/vocab/word/:wordId" element={<WordPage />} />
        <Route path="/grammar" element={<GrammarPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="*" element={<Navigate to="/vocab" replace />} />
      </Route>
    </Routes>
  );
}
