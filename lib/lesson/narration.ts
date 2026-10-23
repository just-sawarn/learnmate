export type NarrationLang = "en" | "hi";

const LOCALES: Record<NarrationLang, string[]> = {
  en: ["en-IN", "en-GB", "en-US"],
  hi: ["hi-IN"],
};

export function pickVoice(
  voices: SpeechSynthesisVoice[],
  lang: NarrationLang,
): SpeechSynthesisVoice | null {
  for (const locale of LOCALES[lang]) {
    const exact = voices.find(
      (v) => v.lang.replace("_", "-").toLowerCase() === locale.toLowerCase(),
    );
    if (exact) return exact;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(lang)) ?? null;
}

export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Speaks `text` with an en-IN or hi-IN voice. Cancels anything already being said. */
export function speak(
  text: string,
  lang: NarrationLang,
  onEnd?: () => void,
  /** Called as each word starts, with its character offset in `text` (not every voice reports this). */
  onBoundary?: (charIndex: number) => void,
): void {
  if (!speechSupported()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = LOCALES[lang][0];
  const voice = pickVoice(synth.getVoices(), lang);
  if (voice) utterance.voice = voice;
  utterance.rate = 0.95;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }
  if (onBoundary) utterance.onboundary = (e) => e.name !== "sentence" && onBoundary(e.charIndex);
  synth.speak(utterance);
}

export function pauseSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.pause();
}

export function resumeSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.resume();
}

/** Start offset of every whitespace-separated word, matching the order captions and cues use. */
export function wordStarts(text: string): number[] {
  return Array.from(text.matchAll(/\S+/g), (m) => m.index ?? 0);
}

/**
 * Turns the word-start times the browser voice has reported so far into a time for every word: gaps before the latest
 * report are interpolated, and words not yet spoken are projected at the pace heard so far.
 */
export function projectWordTimes(
  times: (number | undefined)[],
  count: number,
  fallbackPace = 0.35,
): number[] {
  const known = times.flatMap((t, i) => (t === undefined ? [] : [{ i, t }]));
  if (known.length === 0) return Array.from({ length: count }, (_, i) => i * fallbackPace);
  const first = known[0];
  const last = known[known.length - 1];
  const pace = last.i > first.i ? (last.t - first.t) / (last.i - first.i) : fallbackPace;
  return Array.from({ length: count }, (_, i) => {
    const exact = times[i];
    if (exact !== undefined) return exact;
    const before = [...known].reverse().find((k) => k.i < i);
    const after = known.find((k) => k.i > i);
    if (before && after)
      return before.t + ((after.t - before.t) * (i - before.i)) / (after.i - before.i);
    if (before) return before.t + (i - before.i) * pace;
    return Math.max(0, first.t - (first.i - i) * pace);
  });
}

export function stopSpeaking(): void {
  if (speechSupported()) window.speechSynthesis.cancel();
}
