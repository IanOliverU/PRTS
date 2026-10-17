import {cleanup, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ThemeProvider, useTheme} from "./useTheme";
function CurrentTheme() { const {theme} = useTheme(); return <span>{theme}</span>; }
describe("appearance defaults", () => {
 beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:false}));
 });
 afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.classList.remove("dark"); vi.unstubAllGlobals(); });
 it("uses light on a fresh launch even when the OS is dark", () => {
  render(<ThemeProvider><CurrentTheme/></ThemeProvider>);
  expect(screen.getByText("light")).toBeTruthy();
  expect(document.documentElement.classList.contains("dark")).toBe(false);
 });
 it("preserves a saved dark choice", () => {
  localStorage.setItem("jarvis.theme", "dark");
  render(<ThemeProvider><CurrentTheme/></ThemeProvider>);
  expect(screen.getByText("dark")).toBeTruthy();
  expect(document.documentElement.classList.contains("dark")).toBe(true);
 });
 it("keeps the backend's explicit choice authoritative", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ok:true,json:async()=>({theme:"dark"})}));
  render(<ThemeProvider><CurrentTheme/></ThemeProvider>);
  await waitFor(() => expect(screen.getByText("dark")).toBeTruthy());
 });
});
