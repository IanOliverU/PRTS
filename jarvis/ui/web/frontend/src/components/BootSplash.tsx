import { useEffect, useRef, useState } from "react";
import { TerminalBackdrop } from "./startup/TerminalBackdrop";
import { StartupRow } from "./startup/StartupRow";
import { OpeningGlyph } from "./startup/OpeningGlyph";
import { move } from "./startup/motion";
import { advanceIntro } from "./startup/clock";
import "./startup/startup.css";

interface BootSplashProps {
  status: string;
  ready?: boolean;
  locked?: boolean;
  exiting?: boolean;
  onIntroComplete?: () => void;
  onExited?: () => void;
}

/** The presentation clock never advances past preparation until access resolves. */
export function BootSplash({ status, ready = false, locked = false, exiting = false,
  onIntroComplete, onExited }: BootSplashProps) {
  const [time, setTime] = useState(0);
  const [size, setSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  const [reduced, setReduced] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [skipped, setSkipped] = useState(false);
  const [sound, setSound] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const clock = useRef(0);
  const callbacks = useRef({ onIntroComplete });
  callbacks.current = { onIntroComplete };
  const completed = useRef(false);
  const still = reduced || skipped;
  const holding = !ready && time >= 9.8;
  const finished = time >= 14;

  useEffect(() => {
    const resize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(mq?.matches ?? false);
    window.addEventListener("resize", resize);
    mq?.addEventListener("change", change);
    return () => { window.removeEventListener("resize", resize); mq?.removeEventListener("change", change); };
  }, []);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      clock.current = advanceIntro(clock.current, Math.max(0, now - previous) / 1000, ready);
      previous = now;
      setTime(clock.current);
      if (!completed.current && (still || locked || clock.current >= 14)) {
        completed.current = true;
        callbacks.current.onIntroComplete?.();
      }
      if (!completed.current) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, locked, still]);

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    if (!sound || still || holding || locked || exiting || finished) { player.pause(); return; }
    // Resume at the visual clock after a cold-boot hold or browser autoplay block.
    const resume = () => {
      player.currentTime = clock.current;
      player.volume = 0.8;
      void player.play().then(() => setBlocked(false)).catch(() => {
        // Browsers may require a gesture; the visible Sound button retries it.
        setBlocked(true);
      });
    };
    if (player.readyState >= 1) resume();
    else player.addEventListener("loadedmetadata", resume, { once: true });
    return () => { player.removeEventListener("loadedmetadata", resume); player.pause(); };
    // Playback owns its clock between holds, rather than restarting every frame.
  }, [sound, still, holding, locked, exiting, finished]);

  const scale = Math.min(size.width / 1280, size.height / 720);
  const t = still ? (ready ? 11.8 : 9.8) : Math.min(time, 13.3);
  return <div id="jarvis-boot-splash" className={exiting ? "jbs-exit" : undefined}
    onAnimationEnd={event => {
      if (exiting && event.target === event.currentTarget && event.animationName === "jbs-fade-out") onExited?.();
    }}>
    <audio ref={audio} src="/startup/terminal-intro.wav" preload="auto" aria-hidden="true" />
    <div className="prts-stage" aria-hidden="true" style={{ transform: `translate(-50%,-50%) scale(${scale})` }}>
      <div className="prts-scene" style={{ opacity: still ? 1 : move(t, 0.47, 0.55, 0, 1) }}>
        <TerminalBackdrop time={t} />
        <StartupRow time={t} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 345, textAlign: "center", fontSize: 26, fontWeight: 700, opacity: move(t, 11.35, 11.75, 0, 1) }}>Workspace ready.</div>
      </div>
      {!still && <OpeningGlyph time={t} />}
    </div>
    <div className="prts-boot-status prts-sr-status" role="status" aria-live="polite">{!ready ? status : t >= 11.75 ? "Workspace ready." : "Preparing your workspace…"}</div>
    <div className="prts-boot-controls">
      {!still && <button type="button" onClick={() => setSkipped(true)}>Skip intro</button>}
      {!still && <button type="button" disabled={holding} onClick={() => {
        if (blocked && audio.current) {
          audio.current.currentTime = clock.current;
          void audio.current.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
        } else setSound(value => !value);
      }}>{blocked ? "Enable sound" : sound ? "Mute" : "Sound on"}</button>}
    </div>
  </div>;
}
