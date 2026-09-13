import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getWord, units, words as allWords } from "@/lib/content";
import { useUser } from "@/store/user";
import { PageHeader } from "@/components/AppShell";
import { StarButton } from "@/components/Bits";
import { Speak } from "@/components/Speak";
import { exportState, importState } from "@/lib/storage";
import { NEEDS_WORK_GRADUATION } from "@/types/user";

export function MePage() {
  const state = useUser();
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const starredWords = state.starred.map(getWord).filter(Boolean);
  const needsWorkIds = Object.keys(state.needsWork);
  const doneUnits = units.filter((u) => state.unitProgress[u.id]?.status === "done").length;

  const download = () => {
    const blob = new Blob([exportState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cestina-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async (file: File) => {
    try {
      state.replaceAll(importState(await file.text()));
      setMessage("匯入完成。");
    } catch (e) {
      setMessage(`匯入失敗：${(e as Error).message}`);
    }
  };

  return (
    <>
      <PageHeader title="Já 我的" subtitle="精選、需加強、進度與設定" />

      <section className="sheet mb-4 rounded p-3">
        <h2 className="font-narrow text-lg font-bold">進度總覽</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          已完成 {doneUnits} / {units.length} 節 ・ 收藏 {state.starred.length} 個 ・ 需加強{" "}
          {needsWorkIds.length} 個 ・ 詞庫共 {allWords.length} 字
        </p>
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-narrow text-lg font-bold">★ 精選</h2>
          {state.starred.length > 0 && (
            <button type="button" onClick={state.clearStarred} className="tag-mono text-[var(--ink-soft)] underline">
              全部清空
            </button>
          )}
        </div>
        {starredWords.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">還沒有收藏的字。在單字卡右上角點 ☆ 就會加進來。</p>
        ) : (
          <ul className="sheet divide-y divide-[var(--rule)] rounded">
            {starredWords.map((w) => (
              <li key={w!.id} className="flex items-center gap-2 px-3 py-2">
                <StarButton wordId={w!.id} size="sm" />
                <Link to={`/vocab/word/${w!.id}`} className="min-w-0 flex-1">
                  <span className="font-narrow text-lg">{w!.cz}</span>
                  <span className="ml-2 text-sm text-[var(--ink-soft)]">{w!.zh}</span>
                </Link>
                <Speak text={w!.cz} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-narrow text-lg font-bold">需加強</h2>
          {needsWorkIds.length > 0 && (
            <button type="button" onClick={() => state.clearNeedsWork()} className="tag-mono text-[var(--ink-soft)] underline">
              全部清空
            </button>
          )}
        </div>
        {needsWorkIds.length === 0 ? (
          <p className="text-sm text-[var(--ink-soft)]">目前沒有需要加強的字。</p>
        ) : (
          <ul className="sheet divide-y divide-[var(--rule)] rounded">
            {needsWorkIds.map((id) => {
              const w = getWord(id);
              if (!w) return null;
              return (
                <li key={id} className="flex items-center gap-2 px-3 py-2">
                  <Link to={`/vocab/word/${id}`} className="min-w-0 flex-1">
                    <span className="font-narrow text-lg">{w.cz}</span>
                    <span className="ml-2 text-sm text-[var(--ink-soft)]">{w.zh}</span>
                  </Link>
                  <span className="tag-mono text-[var(--red)]">
                    還需答對 {NEEDS_WORK_GRADUATION - state.needsWork[id]} 次
                  </span>
                  <button type="button" onClick={() => state.clearNeedsWork(id)} className="tag-mono underline">
                    移除
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="sheet mb-4 rounded p-3">
        <h2 className="font-narrow mb-2 text-lg font-bold">設定</h2>
        <label className="flex items-center justify-between py-1.5">
          <span>顯示英文</span>
          <input
            type="checkbox"
            checked={state.settings.showEnglish}
            onChange={(e) => state.setSettings({ showEnglish: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between py-1.5">
          <span>進頁自動播放</span>
          <input
            type="checkbox"
            checked={state.settings.autoplayCard}
            onChange={(e) => state.setSettings({ autoplayCard: e.target.checked })}
          />
        </label>
        <label className="flex items-center justify-between py-1.5">
          <span>朗讀速度</span>
          <select
            value={state.settings.audioSpeed}
            onChange={(e) => state.setSettings({ audioSpeed: Number(e.target.value) as 0.75 | 1 })}
            className="tag-mono rounded border border-[var(--rule)] bg-[var(--paper)] px-2 py-1"
          >
            <option value={1}>1.0×</option>
            <option value={0.75}>0.75×</option>
          </select>
        </label>
        <label className="flex items-center justify-between py-1.5">
          <span>深色模式</span>
          <input
            type="checkbox"
            checked={state.settings.theme === "dark"}
            onChange={(e) => state.setSettings({ theme: e.target.checked ? "dark" : "paper" })}
          />
        </label>
      </section>

      <section className="sheet rounded p-3">
        <h2 className="font-narrow mb-1 text-lg font-bold">匯出／匯入</h2>
        <p className="mb-2 text-sm text-[var(--ink-soft)]">
          進度存在這台裝置上。清掉瀏覽器資料就會消失，換裝置前請先匯出。
        </p>
        <div className="flex gap-2">
          <button type="button" onClick={download} className="hit flex-1 rounded border border-[var(--rule)] px-3">
            匯出 JSON
          </button>
          <button type="button" onClick={() => fileInput.current?.click()} className="hit flex-1 rounded border border-[var(--rule)] px-3">
            匯入 JSON
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = "";
            }}
          />
        </div>
        {message && <p className="mt-2 text-sm">{message}</p>}
      </section>
    </>
  );
}
