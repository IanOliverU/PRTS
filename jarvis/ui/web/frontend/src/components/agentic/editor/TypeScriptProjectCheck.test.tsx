import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { TypeScriptProjectCheck } from "./TypeScriptProjectCheck";
import { useCodeEditorStore } from "@/store/codeEditor";

beforeEach(() => useCodeEditorStore.setState({ files: {}, tabs: [], active: {} }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("checks only on request and navigates to the returned project location", async () => {
  const request = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({status:"diagnostics",config:"tsconfig.json",message:"",diagnostics:[{path:"src/App.tsx",line:5,column:9,code:2322,message:"Wrong prop type",category:"error"}],truncated:false,outside_workspace:0})));
  vi.stubGlobal("fetch", request);
  render(<TypeScriptProjectCheck workspaceId="w1" path="src/App.tsx" />);
  expect(request).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", {name:"Check TypeScript project"}));
  fireEvent.click(await screen.findByRole("button", {name:"src/App.tsx:5:9"}));
  expect(request.mock.calls[0][0]).toBe("/api/agentic-ide/workspaces/w1/typescript/check");
  expect(useCodeEditorStore.getState().reveal).toMatchObject({line:5,column:9});
});

it("does not check unsaved files", () => {
  useCodeEditorStore.setState({files:{f:{workspaceId:"w1",path:"src/App.tsx",dirty:true} as never}});
  render(<TypeScriptProjectCheck workspaceId="w1" path="src/App.tsx" />);
  expect(screen.getByRole("button", {name:"Check TypeScript project"}).hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("Save all workspace edits before checking.")).toBeTruthy();
});

it("distinguishes missing tooling from a clean check", async () => {
  vi.stubGlobal("fetch",vi.fn(async () => new Response(JSON.stringify({status:"unavailable",config:null,message:"No tsconfig.json found.",diagnostics:[],truncated:false,outside_workspace:0}))));
  render(<TypeScriptProjectCheck workspaceId="w1" path="src/App.tsx" />);
  fireEvent.click(screen.getByRole("button", {name:"Check TypeScript project"}));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("No tsconfig.json found."));
  expect(screen.queryByText("No TypeScript diagnostics.")).toBeNull();
});
