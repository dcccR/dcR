import { useEffect, useState } from "react";
import { onSpeakingChange, speak, speakingText, hasCzechVoice } from "@/lib/audio";
import { useUser } from "@/store/user";

interface Props {
  text: string;
  size?: "sm" | "lg";
  label?: string;
}

/** 喇叭鈕。點擊播放；長按＝0.75 倍速（§4.4）。 */
export function Speak({ text, size = "sm", label }: Props) {
  const audioSpeed = useUser((s) => s.settings.audioSpeed);
  const [active, setActive] = useState(speakingText() === text);
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => onSpeakingChange((t) => setActive(t === text)), [text]);

  const play = (rate: number) => speak(text, { rate });

  const startPress = () => {
    setTimer(
      setTimeout(() => {
        setTimer(null);
        play(0.75);
      }, 450),
    );
  };
  const endPress = () => {
    if (timer) {
      clearTimeout(timer);
      setTimer(null);
      play(audioSpeed);
    }
  };

  const dim = size === "lg" ? "text-2xl w-14 h-14" : "text-sm w-9 h-9";
  return (
    <button
      type="button"
      aria-label={label ?? `朗讀 ${text}`}
      title={hasCzechVoice() ? "點擊朗讀・長按放慢" : "此裝置可能沒有捷克語語音"}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerLeave={() => {
        if (timer) clearTimeout(timer);
        setTimer(null);
      }}
      onClick={(e) => e.preventDefault()}
      className={`${dim} shrink-0 grid place-items-center rounded-full border transition-colors ${
        active ? "border-[var(--green)] bg-[var(--green)] text-[var(--paper-2)]" : "border-[var(--rule)] text-[var(--ink-soft)]"
      }`}
    >
      🔊
    </button>
  );
}
