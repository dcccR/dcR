export interface UnitProgress {
  status: "new" | "in-progress" | "done";
  lastWordIndex: number;
  checkpointsPassed: number[];
}

export interface Settings {
  audioSpeed: 0.75 | 1.0;
  autoplayCard: boolean;
  /** 英文預設顯示（§14 決策 9）。 */
  showEnglish: boolean;
  theme: "paper" | "dark";
}

export interface UserState {
  starred: string[];
  /** wordId → 連續答對次數；連對 2 次移出（§4.6）。 */
  needsWork: Record<string, number>;
  unitProgress: Record<string, UnitProgress>;
  grammarProgress: Record<string, "new" | "read" | "quizzed">;
  listeningDone: string[];
  readingDone: string[];
  settings: Settings;
}

export const NEEDS_WORK_GRADUATION = 2;

export const EMPTY_STATE: UserState = {
  starred: [],
  needsWork: {},
  unitProgress: {},
  grammarProgress: {},
  listeningDone: [],
  readingDone: [],
  settings: {
    audioSpeed: 1.0,
    autoplayCard: false,
    showEnglish: true,
    theme: "paper",
  },
};
