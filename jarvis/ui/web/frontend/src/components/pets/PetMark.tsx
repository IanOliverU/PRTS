import { useContext } from "react";
import { QueryClientContext } from "@tanstack/react-query";

import { PriestessMascot, usesPriestess } from "@/components/brand/PriestessMascot";
import { PetSprite } from "@/components/pets/PetSprite";
import { useActivePet } from "@/hooks/usePets";
import type { PetState } from "@/lib/petStates";
import { cn } from "@/lib/utils";
import { useEventStore, type VoiceState } from "@/store/events";

/** The shared in-app identity, preserving the user's selected custom pet. */
export function PetMark({
  size,
  state,
  reactive = false,
  label,
  className,
}: {
  size: number;
  state?: PetState;
  reactive?: boolean;
  /** Accessible name; decorative without one. */
  label?: string;
  className?: string;
}) {
  // The default identity is available even without the pets endpoint.
  const client = useContext(QueryClientContext);
  if (!client) return <span data-testid="pet-mark" className={className}><PriestessMascot size={size} state={state} label={label} /></span>;
  return <ActivePetMark size={size} state={state} reactive={reactive} label={label} className={className} />;
}

function ActivePetMark({
  size,
  state,
  reactive,
  label,
  className,
}: {
  size: number;
  state?: PetState;
  reactive: boolean;
  label?: string;
  className?: string;
}) {
  const pet = useActivePet();
  const voiceState = useEventStore((s) => s.voiceState);
  const shown = state ?? (reactive ? petStateForVoice(voiceState) : "idle");
  return (
    <span data-testid="pet-mark" data-pet={pet?.id ?? "priestess"} className={cn("inline-flex shrink-0 select-none", className)}>
      {usesPriestess(pet) ? <PriestessMascot size={size} state={shown} label={label} /> : <PetSprite pet={pet!} state={shown} px={size} label={label} />}
    </span>
  );
}

/** The pet row that mirrors what the voice is doing right now. */
export function petStateForVoice(voice: VoiceState): PetState {
  switch (voice) {
    case "listening":
      return "listening";
    case "connecting":
    case "thinking":
      // Thinking plays the working row, the same as a trace's live line.
      return "working";
    case "speaking":
      return "talking";
    case "error":
      return "error";
    case "paused":
      return "sleeping";
    default:
      return "idle";
  }
}
