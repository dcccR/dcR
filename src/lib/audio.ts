// 單例播放器（§5.3）。M2 會接上 public/audio 的 mp3；
// 在音檔就位前先用 Web Speech API 備援，裝置沒有捷克語音就安靜退場。

type Listener = (speaking: string | null) => void;

const listeners = new Set<Listener>();
let current: string | null = null;
let element: HTMLAudioElement | null = null;

/** M2 會由 audio-manifest.json 填入；目前恆為空。 */
let manifest: Record<string, string> = {};

export function setManifest(m: Record<string, string>) {
  manifest = m;
}

export function hasCzechVoice(): boolean {
  if (typeof speechSynthesis === "undefined") return false;
  return speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith("cs"));
}

function emit(value: string | null) {
  current = value;
  for (const l of listeners) l(value);
}

export function onSpeakingChange(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const speakingText = () => current;

export function stop() {
  element?.pause();
  element = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  emit(null);
}

/** 新音檔直接中斷前一個，不排隊。 */
export function speak(text: string, opts: { rate?: number } = {}) {
  stop();
  if (!text.trim()) return;
  const file = manifest[text];
  if (file) {
    const audio = new Audio(`audio/${file}`);
    audio.playbackRate = opts.rate ?? 1;
    element = audio;
    emit(text);
    audio.onended = () => emit(null);
    audio.onerror = () => emit(null);
    void audio.play().catch(() => emit(null));
    return;
  }
  if (typeof speechSynthesis === "undefined") return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "cs-CZ";
  utter.rate = opts.rate ?? 1;
  const voice = speechSynthesis.getVoices().find((v) => v.lang.toLowerCase().startsWith("cs"));
  if (voice) utter.voice = voice;
  utter.onend = () => emit(null);
  utter.onerror = () => emit(null);
  emit(text);
  speechSynthesis.speak(utter);
}
