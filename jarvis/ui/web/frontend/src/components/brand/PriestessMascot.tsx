import portrait from "@/assets/priestess-avatar.png";
import guideIdle from "@/assets/priestess/guide-idle.webp";
import talking from "@/assets/priestess/talking.webp";
import typing from "@/assets/priestess/typing.webp";
import typingStill from "@/assets/priestess/typing-still.webp";
import type { Pet } from "@/lib/petsApi";
import type { PetState } from "@/lib/petStates";
import { cn } from "@/lib/utils";

export const PRIESTESS_NAME = "Priestess";

/** Replace the built-in default only; a selected custom pet keeps its artwork. */
export function usesPriestess(pet: Pet | null): boolean {
  return !pet || (pet.builtin && pet.id === "gigi");
}

export function guidePetName(pet: Pet | null): string {
  return usesPriestess(pet) ? PRIESTESS_NAME : pet!.name;
}

/** Shared portrait, working animation and fixed-pose talking animation. */
export function PriestessMascot({size=56,state="idle",guide=false,label,className}: {
  size?: number; state?: PetState; guide?: boolean; label?: string; className?: string;
}) {
  const working = !guide && size >= 48 && (state === "working" || state === "thinking" || state === "searching");
  const speaking = state === "talking";
  const still = working ? typingStill : guide || speaking ? guideIdle : portrait;
  const src = speaking ? talking : working ? typing : still;
  return <picture className={cn("inline-flex shrink-0 select-none",className)} style={{width:size,height:size}} data-priestess-state={speaking?"talking":working?"working":"idle"}>
    <source media="(prefers-reduced-motion: reduce)" srcSet={still} />
    <img src={src} alt={label??""} aria-hidden={label?undefined:true} data-agent-avatar="priestess" width={size} height={size} className="h-full w-full object-contain" decoding="async" draggable={false} />
  </picture>;
}
