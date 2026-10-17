import {describe, expect, it} from "vitest";
import {renderToStaticMarkup} from "react-dom/server";
import {StartupRow} from "./StartupRow";
import {TerminalBackdrop} from "./TerminalBackdrop";

function scene(time: number) {
 const host = document.createElement("div");
 host.innerHTML = renderToStaticMarkup(<StartupRow time={time}/>);
 return host;
}
function factor(element: HTMLElement) {
 const match = element.style.transform.match(/scale\(([0-9.]+)\)/);
 expect(match, "a valid, unitless transform must reach the browser").not.toBeNull();
 return Number(match![1]);
}

describe("startup production scaling", () => {
 it("emits valid compact transforms with the production React renderer", () => {
  const html = renderToStaticMarkup(<StartupRow time={9.45}/>);
  expect(html).toContain("transform:scale(0.64)");
  expect(html).not.toMatch(/scale:[0-9.]+px/);
 });
 it("keeps the logo and welcome box apart through the transition at laptop and desktop sizes", () => {
  for (const time of [7.7, 8.43, 8.9, 9.1, 9.45, 10.5]) {
   const host = scene(time);
   const logo = host.querySelector<HTMLElement>('[data-testid="main-wordmark"]')!;
   const welcome = host.querySelector<HTMLElement>('[data-testid="welcome-lockup"]')!;
   const right = parseFloat(logo.style.left) + parseFloat(logo.style.width) * factor(logo);
   const gap = parseFloat(welcome.style.left) - right;
   const end = parseFloat(welcome.style.left) + (92 + 12 + 290) * factor(welcome);
   for (const [width, height] of [[1024,640], [1280,720], [1366,768], [1440,900], [1920,1080], [3840,2160]]) {
    const viewportScale = Math.min(width / 1280, height / 720);
    expect(gap * viewportScale, `logo overlap at ${time}s in ${width}x${height}`).toBeGreaterThan(0);
    expect(end * viewportScale).toBeLessThanOrEqual(width);
   }
  }
 });
 it("emits a valid scale for the background frame as well", () => {
  const html = renderToStaticMarkup(<TerminalBackdrop time={0.8}/>);
  expect(html).toContain("transform:rotate(45deg) scale(");
  expect(html).not.toMatch(/scale:[0-9.]+px/);
 });
});
