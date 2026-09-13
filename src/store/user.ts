import { create } from "zustand";
import { EMPTY_STATE, NEEDS_WORK_GRADUATION, type Settings, type UserState } from "@/types/user";
import { loadState, saveState } from "@/lib/storage";
import { getUnit } from "@/lib/content";

interface Store extends UserState {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  replaceAll: (state: UserState) => void;

  toggleStar: (wordId: string) => void;
  isStarred: (wordId: string) => boolean;

  /** 答對／答錯的唯一入口：§4.6 連對 2 次才移出需加強。 */
  recordAnswer: (wordId: string, correct: boolean) => void;
  /** 「不確定，直接看答案」：不算答錯，但該字進需加強（§14 決策 8）。 */
  markUnsure: (wordId: string) => void;
  clearNeedsWork: (wordId?: string) => void;
  clearStarred: () => void;

  openUnit: (unitId: string) => void;
  setUnitPosition: (unitId: string, index: number) => void;
  passCheckpoint: (unitId: string, checkpoint: number) => void;
  resetUnit: (unitId: string) => void;

  setSettings: (patch: Partial<Settings>) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

function persist(get: () => Store) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const { hydrated: _h, hydrate: _hy, ...rest } = get();
    const state: UserState = {
      starred: rest.starred,
      needsWork: rest.needsWork,
      unitProgress: rest.unitProgress,
      grammarProgress: rest.grammarProgress,
      listeningDone: rest.listeningDone,
      readingDone: rest.readingDone,
      settings: rest.settings,
    };
    void saveState(state);
  }, 200);
}

export const useUser = create<Store>((set, get) => ({
  ...EMPTY_STATE,
  hydrated: false,

  hydrate: async () => {
    const state = await loadState();
    set({ ...state, hydrated: true });
    applyTheme(state.settings.theme);
  },

  replaceAll: (state) => {
    set({ ...state });
    applyTheme(state.settings.theme);
    persist(get);
  },

  toggleStar: (wordId) => {
    const starred = get().starred.includes(wordId)
      ? get().starred.filter((id) => id !== wordId)
      : [...get().starred, wordId];
    set({ starred });
    persist(get);
  },

  isStarred: (wordId) => get().starred.includes(wordId),

  recordAnswer: (wordId, correct) => {
    const needsWork = { ...get().needsWork };
    if (!correct) {
      needsWork[wordId] = 0;
    } else if (wordId in needsWork) {
      const next = needsWork[wordId] + 1;
      if (next >= NEEDS_WORK_GRADUATION) delete needsWork[wordId];
      else needsWork[wordId] = next;
    }
    set({ needsWork });
    persist(get);
  },

  markUnsure: (wordId) => {
    const needsWork = { ...get().needsWork };
    needsWork[wordId] ??= 0;
    set({ needsWork });
    persist(get);
  },

  clearNeedsWork: (wordId) => {
    if (!wordId) {
      set({ needsWork: {} });
    } else {
      const needsWork = { ...get().needsWork };
      delete needsWork[wordId];
      set({ needsWork });
    }
    persist(get);
  },

  clearStarred: () => {
    set({ starred: [] });
    persist(get);
  },

  openUnit: (unitId) => {
    const current = get().unitProgress[unitId];
    if (current) return;
    set({
      unitProgress: {
        ...get().unitProgress,
        [unitId]: { status: "in-progress", lastWordIndex: 0, checkpointsPassed: [] },
      },
    });
    persist(get);
  },

  setUnitPosition: (unitId, index) => {
    const prev = get().unitProgress[unitId] ?? {
      status: "in-progress" as const,
      lastWordIndex: 0,
      checkpointsPassed: [],
    };
    if (prev.lastWordIndex === index && prev.status !== "new") return;
    set({
      unitProgress: {
        ...get().unitProgress,
        [unitId]: {
          ...prev,
          status: prev.status === "done" ? "done" : "in-progress",
          lastWordIndex: index,
        },
      },
    });
    persist(get);
  },

  passCheckpoint: (unitId, checkpoint) => {
    const prev = get().unitProgress[unitId] ?? {
      status: "in-progress" as const,
      lastWordIndex: 0,
      checkpointsPassed: [],
    };
    const checkpointsPassed = [...new Set([...prev.checkpointsPassed, checkpoint])].sort(
      (a, b) => a - b,
    );
    const unit = getUnit(unitId);
    const done = unit ? unit.checkpoints.every((c) => checkpointsPassed.includes(c)) : false;
    set({
      unitProgress: {
        ...get().unitProgress,
        [unitId]: {
          ...prev,
          checkpointsPassed,
          status: done ? "done" : "in-progress",
        },
      },
    });
    persist(get);
  },

  resetUnit: (unitId) => {
    const unitProgress = { ...get().unitProgress };
    delete unitProgress[unitId];
    set({ unitProgress });
    persist(get);
  },

  setSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    set({ settings });
    if (patch.theme) applyTheme(patch.theme);
    persist(get);
  },
}));

export function applyTheme(theme: Settings["theme"]) {
  document.documentElement.dataset.theme = theme === "dark" ? "dark" : "paper";
}
