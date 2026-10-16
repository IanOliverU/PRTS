/** The shared first-run guide uses Priestess or the user's chosen custom pet. */
import { useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { PriestessMascot, usesPriestess } from "@/components/brand/PriestessMascot";
import { PetSprite } from "@/components/pets/PetSprite";
import { pickActivePet } from "@/hooks/usePets";
import type { PetState } from "@/lib/petStates";
import type { Pet, PetsState } from "@/lib/petsApi";
import { cn } from "@/lib/utils";

/** Typing speed of a line, ms per character. */
const TYPE_MS = 18;

let cached: Promise<Pet | null> | null = null;

function loadGuidePet(): Promise<Pet | null> {
  cached ??= (async () => {
    try {
      const res = await fetch("/api/pets");
      if (!res.ok) return null;
      return pickActivePet((await res.json()) as PetsState);
    } catch {
      // No pets endpoint: the mascot stands in.
      return null;
    }
  })();
  return cached;
}

/** The user's pet, or null while loading / when there is none. */
export function useGuidePet(): Pet | null {
  const [pet, setPet] = useState<Pet | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadGuidePet().then((p) => {
      if (!cancelled) setPet(p);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return pet;
}

/** Test seam: forget the cached pet. */
export function _resetGuidePetForTests(): void {
  cached = null;
}

/** Reveals `text` character by character; `done` once it is all there. */
export function useTypedText(text: string): { shown: string; done: boolean; finish: () => void } {
  const reduced = useReducedMotion() ?? false;
  const [progress, setProgress] = useState({text, count: reduced ? text.length : 0});
  const timer = useRef<number | null>(null);
  const count = reduced ? text.length : progress.text === text ? progress.count : 0;
  useEffect(() => {
    if (reduced || !text.length) return;
    setProgress({text,count:0});
    let n = 0;
    timer.current = window.setInterval(() => {
      n = Math.min(n + 2,text.length);
      setProgress({text,count:n});
      if (n === text.length && timer.current !== null) {
        window.clearInterval(timer.current);
        timer.current = null;
      }
    }, TYPE_MS * 2);
    return () => { if (timer.current !== null) window.clearInterval(timer.current); timer.current = null; };
  }, [text, reduced]);
  const finish = () => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    setProgress({text,count:text.length});
  };
  return { shown: text.slice(0, count), done: count >= text.length, finish };
}

/** The pet itself at `px` size, or the mascot when there is no pet. */
export function GuidePetFigure({ state, px = 96, className }: { state: PetState; px?: number; className?: string }) {
  const pet = useGuidePet();
  if (usesPriestess(pet)) {
    return (
      <div className={cn("flex shrink-0 items-end justify-center", className)} style={{ width: px, height: px }}>
        <PriestessMascot size={px} state={state === "talking" ? "talking" : "idle"} guide label="Priestess" />
      </div>
    );
  }
  return (
    <PetSprite
      pet={pet!}
      state={state}
      px={px}
      label={pet!.name}
      className={className}
    />
  );
}

/**
 * The pet next to a speech bubble saying `text`. `children` (the actions)
 * appear under the line once it is fully typed, so a button never jumps.
 */
export function PetSays({
  text,
  state = "idle",
  heading,
  children,
  px = 96,
  testId,
}: {
  text: string;
  state?: PetState;
  heading?: ReactNode;
  children?: ReactNode;
  px?: number;
  testId?: string;
}) {
  const { shown, done, finish } = useTypedText(text);
  return (
    <div className="flex items-end gap-2" data-testid={testId}>
      <GuidePetFigure state={done ? state : "talking"} px={px} className="-mb-1" />
      <div
        className="relative min-w-0 flex-1 rounded-2xl rounded-bl-md border border-border bg-popover px-4 py-3 text-popover-foreground shadow-float"
        onClick={done ? undefined : finish}
      >
        {/* The bubble's tail, pointing at the pet. */}
        <span
          aria-hidden
          className="absolute -left-[7px] bottom-3 h-3 w-3 rotate-45 border-b border-l border-border bg-popover"
        />
        {heading}
        {/* The full line is laid out invisibly underneath, so the bubble
            has its final size from the first letter on. */}
        <p className="relative text-[15px] leading-relaxed text-foreground">
          <span aria-hidden className="invisible">{text}</span>
          <span className="absolute inset-0" aria-live="polite" data-testid={testId ? `${testId}-text` : undefined}>
            {shown}
          </span>
        </p>
        {children && <div className={cn("transition-opacity duration-200", done ? "opacity-100" : "pointer-events-none opacity-0")}>{children}</div>}
      </div>
    </div>
  );
}
