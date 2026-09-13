// 持久化：IndexedDB（主）＋ localStorage（settings 鏡射）。
// 清掉瀏覽器資料就全毀，所以一定要有匯出／匯入（§3）。

import { openDB, type IDBPDatabase } from "idb";
import type { UserState } from "@/types/user";
import { EMPTY_STATE } from "@/types/user";

const DB_NAME = "cestina";
const STORE = "state";
const KEY = "user";
const SETTINGS_KEY = "cestina.settings";

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  dbPromise ??= openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    },
  });
  return dbPromise;
}

/** 合併讀進來的狀態與預設值，讓舊存檔缺欄位時也不會壞。 */
export function normalize(raw: Partial<UserState> | undefined): UserState {
  return {
    ...EMPTY_STATE,
    ...raw,
    starred: raw?.starred ?? [],
    needsWork: raw?.needsWork ?? {},
    unitProgress: raw?.unitProgress ?? {},
    grammarProgress: raw?.grammarProgress ?? {},
    listeningDone: raw?.listeningDone ?? [],
    readingDone: raw?.readingDone ?? [],
    settings: { ...EMPTY_STATE.settings, ...raw?.settings },
  };
}

export async function loadState(): Promise<UserState> {
  try {
    const stored = (await (await db()).get(STORE, KEY)) as Partial<UserState> | undefined;
    if (stored) return normalize(stored);
  } catch {
    // IndexedDB 不可用（私密視窗等）時退回 localStorage 的 settings 鏡射
  }
  try {
    const mirrored = localStorage.getItem(SETTINGS_KEY);
    if (mirrored) return normalize({ settings: JSON.parse(mirrored) });
  } catch {
    /* 忽略 */
  }
  return normalize(undefined);
}

export async function saveState(state: UserState): Promise<void> {
  try {
    await (await db()).put(STORE, state, KEY);
  } catch {
    /* 忽略：至少 settings 還會寫進 localStorage */
  }
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  } catch {
    /* 忽略 */
  }
}

export function exportState(state: UserState): string {
  return JSON.stringify({ app: "cestina", version: 1, exportedAt: new Date().toISOString(), state }, null, 2);
}

export function importState(text: string): UserState {
  const parsed = JSON.parse(text);
  const raw = parsed?.state ?? parsed;
  if (typeof raw !== "object" || raw === null) throw new Error("檔案格式不正確");
  return normalize(raw as Partial<UserState>);
}
