import {cleanup,render} from "@testing-library/react";
import {afterEach,expect,it} from "vitest";
import {PriestessMascot} from "./PriestessMascot";
afterEach(cleanup);
it("shows the approved work loop only at readable sizes, with a reduced-motion still",()=>{
 const {container,rerender}=render(<PriestessMascot size={96} state="working" />);
 expect(container.querySelector("picture")?.dataset.priestessState).toBe("working");
 expect(container.querySelector("img")?.getAttribute("src")).toContain("typing.webp");
 expect(container.querySelector("source")?.getAttribute("srcset")).toContain("typing-still.webp");
 rerender(<PriestessMascot size={24} state="working" />);
 expect(container.querySelector("img")?.getAttribute("src")).toContain("priestess-avatar.png");
});
it("uses mouth-only motion while talking and the exact resting pose afterward",()=>{
 const {container,rerender}=render(<PriestessMascot size={96} state="talking" guide />);
 expect(container.querySelector("img")?.getAttribute("src")).toContain("talking.webp");
 expect(container.querySelector("source")?.getAttribute("media")).toBe("(prefers-reduced-motion: reduce)");
 expect(container.querySelector("source")?.getAttribute("srcset")).toContain("guide-idle.webp");
 rerender(<PriestessMascot size={96} guide />);
 expect(container.querySelector("img")?.getAttribute("src")).toContain("guide-idle.webp");
});
