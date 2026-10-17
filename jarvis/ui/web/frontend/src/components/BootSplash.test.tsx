import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BootSplash } from "./BootSplash";

function finishAnimation(element: Element, name: string) {
  const event = new Event("animationend", { bubbles: true });
  Object.defineProperty(event, "animationName", { value: name });
  fireEvent(element, event);
}

describe("BootSplash exit", () => {
  afterEach(cleanup);

  it("waits for its exit fade when a decorative animation finishes", () => {
    const onExited = vi.fn();
    const { container } = render(<BootSplash status="Starting up" exiting onExited={onExited} />);
    const splash = container.querySelector("#jarvis-boot-splash")!;
    finishAnimation(splash, "jbs-grid-in");
    expect(onExited).not.toHaveBeenCalled();
    finishAnimation(splash, "jbs-fade-out");
    expect(onExited).toHaveBeenCalledTimes(1);
  });

  it("ignores animation events from its children", () => {
    const onExited = vi.fn();
    const { container } = render(<BootSplash status="Starting up" exiting onExited={onExited} />);
    finishAnimation(container.querySelector(".prts-stage")!, "jbs-fade-out");
    expect(onExited).not.toHaveBeenCalled();
  });
});
