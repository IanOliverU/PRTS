import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PetSays, _resetGuidePetForTests } from "./GuidePet";
import { guidePetName } from "@/components/brand/PriestessMascot";
import type { Pet } from "@/lib/petsApi";

const settings=vi.hoisted(()=>({reduced:false}));
vi.mock("framer-motion",()=>({useReducedMotion:()=>settings.reduced}));
const custom:Pet={id:"custom",name:"Mochi",builtin:false,description:"",frame_size:48,sheet_url:"/custom.png",animations:{idle:{row:0,frames:1,fps:1,loop:true},talking:{row:1,frames:1,fps:1,loop:true}}};
function catalog(pet:Pet|null) {
  vi.stubGlobal("fetch",async()=>({ok:true,json:async()=>({active:pet?.id??"",pets:pet?[pet]:[]})}));
}
beforeEach(()=>{vi.useFakeTimers();settings.reduced=false;_resetGuidePetForTests();catalog(null);});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
const pose=()=>document.querySelector("[data-priestess-state]")?.getAttribute("data-priestess-state");

describe("Priestess onboarding",()=>{
  it("talks while text appears, then returns to rest for the completed guide",()=>{
    render(<PetSays text="Hello there" state="working" testId="guide" />);
    expect(pose()).toBe("talking");
    act(()=>vi.advanceTimersByTime(36));
    expect(screen.getByTestId("guide-text").textContent).toBe("He");
    expect(pose()).toBe("talking");
    act(()=>vi.advanceTimersByTime(1000));
    expect(screen.getByTestId("guide-text").textContent).toBe("Hello there");
    expect(pose()).toBe("idle");
  });
  it("finishing a line cancels reveal without restarting the mouth",()=>{
    render(<PetSays text="A longer line that is still being typed" testId="guide" />);
    act(()=>vi.advanceTimersByTime(36));
    fireEvent.click(screen.getByTestId("guide-text"));
    const complete=screen.getByTestId("guide-text").textContent;
    expect(pose()).toBe("idle");
    act(()=>vi.advanceTimersByTime(72));
    expect(screen.getByTestId("guide-text").textContent).toBe(complete);
    expect(pose()).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("restarts for a new guide and removes the active timer on unmount",()=>{
    const {rerender,unmount}=render(<PetSays text="Old guide" testId="guide" />);
    act(()=>vi.advanceTimersByTime(1000));
    rerender(<PetSays text="A new and longer guide" testId="guide" />);
    expect(pose()).toBe("talking");
    expect(screen.getByTestId("guide-text").textContent).toBe("");
    unmount();expect(vi.getTimerCount()).toBe(0);
  });
  it("shows complete text and the resting pose under reduced motion",()=>{
    settings.reduced=true;
    render(<PetSays text="Complete guide" testId="guide" />);
    expect(screen.getByTestId("guide-text").textContent).toBe("Complete guide");
    expect(pose()).toBe("idle");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("preserves a selected custom pet and its name",async()=>{
    catalog(custom);
    render(<PetSays text="Custom guide" />);
    await act(async()=>{await Promise.resolve();await Promise.resolve();});
    expect(screen.getByTestId("pet-sprite-cell").style.backgroundImage).toContain("/custom.png");
    expect(pose()).toBeUndefined();
    expect(guidePetName(custom)).toBe("Mochi");
    expect(guidePetName(null)).toBe("Priestess");
    expect(guidePetName({...custom,id:"gigi",builtin:true})).toBe("Priestess");
    expect(guidePetName({...custom,id:"gigi"})).toBe("Mochi");
  });
});
