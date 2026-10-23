"use client";

import { Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LessonPlayerFrame } from "@/components/design/lesson-player-frame";
import { PageChip } from "@/components/source/source-context";
import { ProviderBadge } from "@/components/ui/provider-badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  pauseSpeaking,
  projectWordTimes,
  resumeSpeaking,
  speak,
  speechSupported,
  stopSpeaking,
  wordStarts,
  type NarrationLang,
} from "@/lib/lesson/narration";
import { FPS, layout, PAUSE_SECONDS, sceneSeconds, speechSeconds } from "@/lib/lesson/timing";
import { FrameProvider } from "@/lib/motion";
import { tracePython } from "@/lib/runners/python";
import { ENERGY_TEMPO, type LessonScript, type Scene } from "@/lib/schemas/lesson";
import { cn } from "@/lib/utils";
import { SceneRenderer } from "./scene-renderer";

const STAGE_W = 1280;
const STAGE_H = 720;
/** Show the title card this many seconds in while paused, so the stage isn't blank before play. */
const POSTER_SECONDS = 2.4;
/** After a Checkpoint's narration ends, wait this long before pausing and opening the editor. */
const CHECKPOINT_LINGER = 0.5;

interface Props {
  script: LessonScript;
  /** Signed URLs for the recorded narration, keyed by each scene's `audio.path`. */
  audioUrls: Record<string, string>;
  lang: NarrationLang;
  /** Called when playback reaches a Checkpoint; the lesson pauses and the IDE opens. */
  onCheckpoint: (exerciseId: string) => void;
  onSceneChange: (index: number, scene: Scene) => void;
}

/** Fills each VariableTracker scene with a real execution trace. Scenes that can't be traced are dropped. */
async function withTraces(scenes: Scene[]): Promise<Scene[]> {
  const out: Scene[] = [];
  for (const scene of scenes) {
    if (scene.type !== "VariableTracker") {
      out.push(scene);
      continue;
    }
    try {
      const steps = await tracePython(scene.code);
      if (steps.length > 1) out.push({ ...scene, steps });
    } catch {
      // The animation must never show values nobody computed, so an untraceable scene is skipped.
    }
  }
  return out;
}

/**
 * The explainer: each scene is a set of React components animating on a clock, and the narration is the
 * master of that clock. With a recording, frames follow `audio.currentTime`, so motion, captions and trace
 * steps land exactly where the voice is. Without one, the browser's voice speaks on a timer.
 */
export function LessonStage({ script, audioUrls, lang, onCheckpoint, onSceneChange }: Props) {
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [index, setIndex] = useState(0);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  // The Settings page can turn the voice off by default.
  useEffect(() => {
    try {
      if (localStorage.getItem("learnmate:voice") === "off") setVoiceOn(false);
    } catch {
      // private mode: keep the default
    }
  }, []);
  const [scale, setScale] = useState(1);
  /** What the browser voice has told us about the scene it is speaking (real word times, real end). */
  const [live, setLive] = useState<{
    words?: number[];
    speaking: boolean;
    speechFrames?: number;
    totalFrames?: number;
  } | null>(null);
  const frameBox = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const clock = useRef({
    index: 0,
    startedAt: 0,
    pausedAt: 0,
    endedAt: null as number | null,
    usingAudio: false,
    /** Browser voice: is an utterance in progress, how long it really took, and a token to ignore stale callbacks. */
    speaking: false,
    measured: null as number | null,
    voiceToken: 0,
    checkpointFired: false,
    raf: 0,
    started: false,
  });

  useEffect(() => {
    let cancelled = false;
    void withTraces(script.scenes).then((prepared) => {
      if (!cancelled) setScenes(prepared);
    });
    return () => {
      cancelled = true;
    };
  }, [script]);

  const { timed } = useMemo(() => layout(scenes ?? []), [scenes]);
  const scenesRef = useRef<Scene[]>([]);
  const voiceRef = useRef(voiceOn);
  const handlers = useRef({ onCheckpoint, onSceneChange });
  // tick() and beginScene() call each other, so tick reaches beginScene through a ref.
  const tickRef = useRef<() => void>(() => undefined);
  const beginRef = useRef<(i: number, play: boolean) => void>(() => undefined);
  useEffect(() => {
    scenesRef.current = scenes ?? [];
    voiceRef.current = voiceOn;
    handlers.current = { onCheckpoint, onSceneChange };
  }, [scenes, voiceOn, onCheckpoint, onSceneChange]);

  // Fit the fixed 1280x720 stage to whatever width the layout gives us.
  useEffect(() => {
    const el = frameBox.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / STAGE_W));
    observer.observe(el);
    return () => observer.disconnect();
  }, [scenes]);

  // One audio element for the whole lesson (so a single user gesture unlocks it), plus warm-up of every recording.
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.addEventListener("ended", () => {
      clock.current.endedAt = performance.now();
    });
    audio.current = a;
    const warm = Object.values(audioUrls).map((url) => {
      const w = new Audio();
      w.preload = "auto";
      w.src = url;
      return w;
    });
    return () => {
      a.pause();
      a.src = "";
      warm.forEach((w) => (w.src = ""));
      stopSpeaking();
    };
  }, [audioUrls]);

  const urlFor = useCallback(
    (scene: Scene) => (scene.audio ? audioUrls[scene.audio.path] : undefined),
    [audioUrls],
  );

  const stopLoop = useCallback(() => {
    cancelAnimationFrame(clock.current.raf);
    clock.current.raf = 0;
  }, []);

  /** Seconds into the current scene, read from the voice when there is one. */
  const readTime = useCallback((): number => {
    const c = clock.current;
    const now = performance.now();
    const a = audio.current;
    const scene = scenesRef.current[c.index];
    if (c.usingAudio && a && scene) {
      if (c.endedAt !== null) return speechSeconds(scene) + (now - c.endedAt) / 1000;
      return a.currentTime;
    }
    return (now - c.startedAt) / 1000;
  }, []);

  const tick = useCallback(() => {
    const c = clock.current;
    const scene = scenesRef.current[c.index];
    if (!scene) return;
    const t = readTime();
    setFrame(t * FPS);

    // With the browser's voice the scene lasts exactly as long as the voice does, however fast or slow it speaks.
    const browserSpeaking = !c.usingAudio && c.speaking;
    const spokenFor = c.measured ?? speechSeconds(scene);
    if (
      scene.type === "Checkpoint" &&
      !c.checkpointFired &&
      !browserSpeaking &&
      t >= spokenFor + CHECKPOINT_LINGER
    ) {
      c.checkpointFired = true;
      setPlaying(false);
      audio.current?.pause();
      stopSpeaking();
      c.pausedAt = t;
      handlers.current.onCheckpoint(scene.exerciseId);
      return;
    }
    const sceneEnd =
      c.measured !== null && !c.usingAudio ? c.measured + PAUSE_SECONDS : sceneSeconds(scene);
    if (!browserSpeaking && t >= sceneEnd) {
      if (c.index < scenesRef.current.length - 1) {
        beginRef.current(c.index + 1, true);
      } else {
        setPlaying(false);
        stopSpeaking();
      }
      return;
    }
    c.raf = requestAnimationFrame(() => tickRef.current());
  }, [readTime]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const beginScene = useCallback(
    (i: number, play: boolean) => {
      const c = clock.current;
      const scene = scenesRef.current[i];
      if (!scene) return;
      stopLoop();
      stopSpeaking();
      c.index = i;
      c.endedAt = null;
      c.speaking = false;
      c.measured = null;
      c.voiceToken++;
      setLive(null);
      c.checkpointFired = false;
      c.started = true;
      setStarted(true);
      c.startedAt = performance.now();
      setIndex(i);
      setFrame(0);
      handlers.current.onSceneChange(i, scene);

      const a = audio.current;
      const url = urlFor(scene);
      c.usingAudio = false;
      if (a && url) {
        a.src = url;
        a.currentTime = 0;
        a.muted = !voiceRef.current;
        c.usingAudio = true;
        if (play) {
          a.play().catch(() => {
            // Blocked or failed to load: keep the animation going on the timer instead of freezing.
            c.usingAudio = false;
            c.startedAt = performance.now();
          });
        }
      } else if (play && voiceRef.current && speechSupported()) {
        const token = c.voiceToken;
        const starts = wordStarts(scene.narration);
        const times: (number | undefined)[] = [];
        c.speaking = true;
        setLive({ speaking: true });
        speak(
          scene.narration,
          lang,
          () => {
            if (c.voiceToken !== token) return;
            c.speaking = false;
            c.measured = (performance.now() - c.startedAt) / 1000;
            setLive((prev) => ({
              ...prev,
              speaking: false,
              speechFrames: c.measured! * FPS,
              totalFrames: (c.measured! + PAUSE_SECONDS) * FPS,
            }));
          },
          (charIndex) => {
            if (c.voiceToken !== token) return;
            const w = starts.reduce((best, st, k) => (st <= charIndex ? k : best), 0);
            times[w] = (performance.now() - c.startedAt) / 1000;
            const words = projectWordTimes(times, starts.length).map((x) => x * FPS);
            setLive((prev) => ({ speaking: true, ...prev, words }));
          },
        );
      }
      if (play) {
        setPlaying(true);
        c.raf = requestAnimationFrame(tick);
      }
    },
    [lang, stopLoop, tick, urlFor],
  );

  useEffect(() => {
    beginRef.current = beginScene;
  }, [beginScene]);

  const pause = useCallback(() => {
    const c = clock.current;
    c.pausedAt = readTime();
    stopLoop();
    audio.current?.pause();
    // A browser voice mid-sentence is paused, not cancelled, so resuming carries on from the same word.
    if (c.speaking && !c.usingAudio) pauseSpeaking();
    else stopSpeaking();
    setPlaying(false);
  }, [readTime, stopLoop]);

  const play = useCallback(() => {
    const c = clock.current;
    const last = scenesRef.current.length - 1;
    if (!c.started || (c.index === last && c.pausedAt >= sceneSeconds(scenesRef.current[last]))) {
      beginScene(0, true);
      return;
    }
    c.startedAt = performance.now() - c.pausedAt * 1000;
    if (c.speaking && !c.usingAudio) resumeSpeaking();
    if (c.usingAudio && c.endedAt === null)
      void audio.current?.play().catch(() => (c.usingAudio = false));
    setPlaying(true);
    c.raf = requestAnimationFrame(tick);
  }, [beginScene, tick]);

  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);
  const go = useCallback(
    (i: number) => beginScene(Math.max(0, Math.min(i, scenesRef.current.length - 1)), true),
    [beginScene],
  );

  useEffect(
    () => () => {
      cancelAnimationFrame(clock.current.raf);
    },
    [],
  );

  if (!scenes) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Preparing lesson">
        <Skeleton className="aspect-video w-full" />
        <p className="text-sm text-muted-foreground">
          Running the lesson code to record real variable traces…
        </p>
      </div>
    );
  }

  const current = timed[index];
  const scene = current?.scene;
  const shownFrame = started ? frame : Math.min(sceneSeconds(scene), POSTER_SECONDS) * FPS;
  const recorded = !!scene?.audio && !!urlFor(scene);
  // Browser voice: captions follow the words as they are really spoken, and the scene is as long as the speech.
  let sceneFrames = current?.frames ?? 0;
  let speechFrames = current?.speechFrames ?? 0;
  let wordFrames = current?.wordFrames;
  if (!recorded && live) {
    if (live.words) wordFrames = live.words;
    if (live.speaking) {
      sceneFrames = Math.max(sceneFrames, shownFrame + 90);
      speechFrames = Math.max(speechFrames, shownFrame + 45);
    } else if (live.totalFrames !== undefined) {
      sceneFrames = live.totalFrames;
      speechFrames = live.speechFrames ?? speechFrames;
    }
  }
  const totalFrames = timed.reduce((n, t) => n + t.frames, 0);
  const progress =
    totalFrames > 0
      ? ((current?.from ?? 0) + Math.min(shownFrame, current?.frames ?? 0)) / totalFrames
      : 0;

  return (
    <LessonPlayerFrame
      title={script.title}
      progress={progress}
      playing={playing}
      onPlayPause={toggle}
      onPrevious={() => go(index - 1)}
      onNext={() => go(index + 1)}
      caption={
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => go(index)}
              aria-label="Replay scene"
              className="rounded-lg border p-1.5 hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <span className="text-muted-foreground">
              Scene {index + 1} of {timed.length}
            </span>
            {scene && (
              <span className="flex items-center gap-1">
                Source: <PageChip page={scene.page} />
              </span>
            )}
            <div className="ml-auto flex items-center gap-2">
              {recorded ? (
                <ProviderBadge provider="gemini" note="voice" />
              ) : (
                <span className="text-xs text-muted-foreground">Browser voice</span>
              )}
              <button
                type="button"
                aria-pressed={voiceOn}
                onClick={() => {
                  const next = !voiceOn;
                  setVoiceOn(next);
                  voiceRef.current = next;
                  if (audio.current) audio.current.muted = !next;
                  if (!next) stopSpeaking();
                }}
                className="flex items-center gap-1 rounded-lg border px-2 py-1 text-xs hover:bg-muted"
              >
                {voiceOn ? (
                  <Volume2 className="h-3.5 w-3.5" />
                ) : (
                  <VolumeX className="h-3.5 w-3.5" />
                )}
                Voice {voiceOn ? "on" : "off"}
              </button>
            </div>
          </div>
          <div role="list" className="flex gap-1" aria-label="Scenes">
            {timed.map((t, i) => (
              <button
                key={i}
                role="listitem"
                title={`${i + 1}. ${t.scene.type} (p. ${t.scene.page})`}
                onClick={() => go(i)}
                className={cn(
                  "h-2 rounded-full transition-colors",
                  i === index ? "bg-primary" : "bg-muted hover:bg-primary/40",
                )}
                style={{ flex: t.frames }}
              />
            ))}
          </div>
        </div>
      }
    >
      <div
        ref={frameBox}
        tabIndex={0}
        role="group"
        aria-label="Animated lesson"
        onKeyDown={(e) => {
          if (e.key === " ") {
            e.preventDefault();
            toggle();
          } else if (e.key === "ArrowRight") go(index + 1);
          else if (e.key === "ArrowLeft") go(index - 1);
        }}
        className="relative h-full w-full overflow-hidden bg-[#fff8f0] outline-none focus-visible:outline-2 focus-visible:outline-primary"
      >
        <div
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `scale(${scale})`,
            transformOrigin: "0 0",
            position: "absolute",
            left: 0,
            top: 0,
          }}
        >
          {scene && (
            <FrameProvider
              frame={shownFrame}
              fps={FPS}
              durationInFrames={sceneFrames}
              speechInFrames={speechFrames}
              narration={scene.narration}
              wordFrames={wordFrames}
              emphasis={scene.emphasis}
              tempo={ENERGY_TEMPO[scene.energy ?? "balanced"]}
            >
              <SceneRenderer key={index} scene={scene} />
            </FrameProvider>
          )}
        </div>
        {!playing && (
          <button
            type="button"
            onClick={toggle}
            aria-label={started ? "Resume lesson" : "Play lesson"}
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/15"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl">
              <Play className="ml-1 h-9 w-9" />
            </span>
          </button>
        )}
      </div>
    </LessonPlayerFrame>
  );
}
