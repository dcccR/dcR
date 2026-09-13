import { describe, expect, it } from "vitest";
import { exportState, importState, normalize } from "@/lib/storage";
import { EMPTY_STATE } from "@/types/user";

describe("使用者狀態", () => {
  it("缺欄位的舊存檔補成完整狀態", () => {
    const s = normalize({ starred: ["w_pokoj"] });
    expect(s.starred).toEqual(["w_pokoj"]);
    expect(s.needsWork).toEqual({});
    expect(s.settings.showEnglish).toBe(true); // 英文預設顯示
  });

  it("匯出再匯入得到同一份狀態", () => {
    const state = { ...EMPTY_STATE, starred: ["w_byt"], needsWork: { w_dum: 1 } };
    expect(importState(exportState(state))).toEqual(state);
  });

  it("匯入壞檔會丟出錯誤", () => {
    expect(() => importState("null")).toThrow();
    expect(() => importState("{")).toThrow();
  });
});
