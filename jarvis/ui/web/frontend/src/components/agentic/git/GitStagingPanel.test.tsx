import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitStagingPanel } from "./GitStagingPanel";
import type { GitStagingState } from "@/lib/gitApi";

const git = vi.hoisted(() => ({ fetchStaging: vi.fn(), stageGitFile: vi.fn(), commitStaged: vi.fn(), fetchStagingDiff: vi.fn() }));
vi.mock("@/lib/gitApi", () => git);
const state: GitStagingState = { root: "/code/app", revision: "a".repeat(64), staged: 1, conflicted: 0, truncated: false,
  files: [{ path: "app.ts", index: "M", worktree: "M" }, { path: "unrelated.txt", index: "?", worktree: "?" }] };
beforeEach(() => {
  vi.resetAllMocks();
  git.fetchStaging.mockResolvedValue(state);
  git.stageGitFile.mockResolvedValue(state);
  git.commitStaged.mockResolvedValue({ commit: "abc123" });
  git.fetchStagingDiff.mockImplementation(async (_folder, _path, side) => ({ path: "app.ts", status: "modified", binary: false, truncated: false,
    hunks: [{ header: "@@ -1 +1 @@", lines: [{ kind: "add", text: `${side} content`, new_no: 1, old_no: null }] }] }));
});
afterEach(cleanup);

describe("GitStagingPanel", () => {
  it("reviews a partially staged file on each side separately", async () => {
    render(<GitStagingPanel folder="/code/app" onCommitted={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Review staged app.ts" }));
    expect(await screen.findByText("staged content")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Review unstaged app.ts" }));
    expect(await screen.findByText("unstaged content")).toBeTruthy();
    expect(screen.queryByText("staged content")).toBeNull();
  });
  it("stages or unstages only the chosen path", async () => {
    render(<GitStagingPanel folder="/code/app" onCommitted={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Stage unrelated.txt" }));
    await waitFor(() => expect(git.stageGitFile).toHaveBeenCalledWith("/code/app", "unrelated.txt", false));
    fireEvent.click(screen.getByRole("button", { name: "Unstage app.ts" }));
    await waitFor(() => expect(git.stageGitFile).toHaveBeenCalledWith("/code/app", "app.ts", true));
  });
  it("commits the reviewed index revision without staging unrelated files", async () => {
    const done = vi.fn();
    render(<GitStagingPanel folder="/code/app" onCommitted={done} />);
    fireEvent.change(await screen.findByLabelText("Commit message"), { target: { value: "Fix the app" } });
    fireEvent.click(screen.getByRole("button", { name: "Commit staged changes" }));
    await waitFor(() => expect(git.commitStaged).toHaveBeenCalledWith("/code/app", "Fix the app", state.revision));
    expect(git.stageGitFile).not.toHaveBeenCalled();
    await waitFor(() => expect(done).toHaveBeenCalledOnce());
  });
  it.each([{ staged: 0 }, { conflicted: 1 }, { truncated: true }])("blocks unsafe or empty commits: %j", async (patch) => {
    git.fetchStaging.mockResolvedValue({ ...state, ...patch });
    render(<GitStagingPanel folder="/code/app" onCommitted={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Commit message"), { target: { value: "Fix" } });
    expect((screen.getByRole("button", { name: "Commit staged changes" }) as HTMLButtonElement).disabled).toBe(true);
    expect(git.commitStaged).not.toHaveBeenCalled();
  });
  it("preserves the message after a stale-index refusal and allows a fresh read", async () => {
    git.commitStaged.mockRejectedValue(new Error("Staged changes changed. Refresh and review them again."));
    render(<GitStagingPanel folder="/code/app" onCommitted={vi.fn()} />);
    fireEvent.change(await screen.findByLabelText("Commit message"), { target: { value: "Keep my message" } });
    fireEvent.click(screen.getByRole("button", { name: "Commit staged changes" }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect((screen.getByLabelText("Commit message") as HTMLTextAreaElement).value).toBe("Keep my message");
    fireEvent.click(screen.getByRole("button", { name: "Refresh changes" }));
    await waitFor(() => expect(git.fetchStaging).toHaveBeenCalledTimes(2));
  });
  it("keeps conflicts visible in the unstaged group", async () => {
    git.fetchStaging.mockResolvedValue({ ...state, conflicted: 1, files: [{ path: "conflict.ts", index: "U", worktree: "U" }] });
    render(<GitStagingPanel folder="/code/app" onCommitted={vi.fn()} />);
    const group = await screen.findByRole("region", { name: "Unstaged changes" });
    expect(within(group).getByRole("button", { name: "Review unstaged conflict.ts" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toContain("Resolve conflicts");
  });
});
