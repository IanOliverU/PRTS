import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { fill, useT } from "@/i18n";
import { commitStaged, fetchStaging, fetchStagingDiff, stageGitFile, type GitStagingState } from "@/lib/gitApi";
import { DiffView } from "../sidePanel/explorer/DiffView";
import type { FileDiff } from "../sidePanel/explorer/explorerApi";

type Selection = { path: string; side: "staged" | "unstaged" };
const conflicts = new Set(["DD", "AU", "UD", "UA", "DU", "AA", "UU"]);
const button = "rounded border border-border px-2 py-1 text-xs hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";

/** Shared by both Git entry points. A file can appear on both sides. */
export function GitStagingPanel({ folder, disabled = false, onCommitted }: {
  folder: string; disabled?: boolean; onCommitted: () => void;
}) {
  const t = useT();
  const [state, setState] = useState<GitStagingState | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [diff, setDiff] = useState<FileDiff | null>(null);
  const [diffError, setDiffError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const running = useRef(false);
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setState(null); setSelection(null); setDiff(null); setError("");
    try {
      const next = await fetchStaging(folder);
      if (request === generation.current) setState(next);
    } catch (err) {
      if (request === generation.current) setError((err as Error).message);
    }
  }, [folder]);
  useEffect(() => {
    setMessage(""); setNotice("");
    void refresh();
    return () => { generation.current++; };
  }, [refresh]);

  useEffect(() => {
    setDiff(null); setDiffError("");
    if (!selection) return;
    const abort = new AbortController();
    void fetchStagingDiff(folder, selection.path, selection.side, abort.signal)
      .then((next) => { if (!abort.signal.aborted) setDiff(next); })
      .catch((err: Error) => { if (!abort.signal.aborted) setDiffError(err.message); });
    return () => abort.abort();
  }, [folder, selection, state]);

  const run = async (work: () => Promise<void>) => {
    if (running.current || disabled) return;
    running.current = true; setBusy(true); setError(""); setNotice("");
    const request = generation.current;
    try { await work(); }
    catch (err) { if (request === generation.current) setError((err as Error).message); }
    finally { running.current = false; setBusy(false); }
  };
  const stage = (path: string, unstage: boolean) => void run(async () => {
    const request = generation.current;
    const next = await stageGitFile(folder, path, unstage);
    if (request === generation.current) { setState(next); setSelection(null); }
  });
  const commit = () => {
    if (!state || !state.staged || state.conflicted || state.truncated || !message.trim()) return;
    void run(async () => {
      const request = generation.current;
      const result = await commitStaged(folder, message.trim(), state.revision);
      if (request !== generation.current) return;
      setMessage("");
      await refresh();
      if (generation.current !== request + 1) return;
      setNotice(fill(t("ide_git.committed"), { sha: result.commit }));
      onCommitted();
    });
  };
  const locked = busy || disabled;
  return <div data-testid="git-staging" className="space-y-2 text-foreground">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-medium">{t("git_review.title")}</h3>
      <button type="button" disabled={locked} onClick={() => void refresh()} className={button} aria-label={t("git_review.refresh")}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden />
      </button>
    </div>
    <p className="break-all text-[11px] text-muted-foreground">{t("git_review.scope")} {state?.root ?? folder}</p>
    {error && <p role="alert" className="text-xs text-destructive dark:text-destructive-foreground">{error}</p>}
    {notice && <p role="status" className="text-xs text-success">{notice}</p>}
    {!state && !error && <p role="status" className="text-xs text-muted-foreground">{t("git_review.loading")}</p>}
    {state && <>
      {state.conflicted > 0 && <p role="alert" className="text-xs text-destructive dark:text-destructive-foreground">{t("git_review.conflicts")}</p>}
      {state.truncated && <p role="alert" className="text-xs text-warning">{t("git_review.truncated")}</p>}
      {(["staged", "unstaged"] as const).map((side) => {
        const files = state.files.filter((file) => side === "staged"
          ? file.index !== " " && file.index !== "?" && !conflicts.has(file.index + file.worktree)
          : file.worktree !== " " || conflicts.has(file.index + file.worktree));
        return <section key={side} aria-label={t(`git_review.${side}`)} className="rounded-md border border-border p-2">
          <h4 className="mb-1 text-xs font-medium">{t(`git_review.${side}`)} ({files.length})</h4>
          {files.length === 0 ? <p className="text-xs text-muted-foreground">{t("git_review.empty")}</p>
            : <ul className="max-h-48 space-y-1 overflow-auto">{files.map((file) => <li key={file.path} className="flex items-center gap-1 text-xs">
              <button type="button" disabled={locked} className="min-w-0 flex-1 truncate rounded px-1 py-1 text-left font-mono hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring" title={file.path}
                aria-label={fill(t(`git_review.review_${side}`), { path: file.path })}
                aria-pressed={selection?.path === file.path && selection.side === side}
                onClick={() => setSelection({ path: file.path, side })}>{file.path}</button>
              <span className="shrink-0 text-muted-foreground" aria-label={t("git_review.status")}>{side === "staged" ? file.index : file.worktree}</span>
              <button type="button" disabled={locked} className={button} onClick={() => stage(file.path, side === "staged")}
                aria-label={fill(t(side === "staged" ? "git_review.unstage_file" : "git_review.stage_file"), { path: file.path })}>
                {t(side === "staged" ? "git_review.unstage" : "git_review.stage")}
              </button>
            </li>)}</ul>}
        </section>;
      })}
      {selection && <section aria-label={t("git_review.diff")} className="overflow-hidden rounded-md border border-border">
        <p className="break-all bg-muted px-2 py-1 text-xs">{t(`git_review.${selection.side}`)} · {selection.path}</p>
        {diffError ? <p role="alert" className="p-2 text-xs text-destructive dark:text-destructive-foreground">{diffError}</p> : !diff ? <p className="p-2 text-xs">{t("git_review.loading")}</p>
          : <>{diff.binary ? <p className="p-2 text-xs">{t("git_review.binary")}</p> : diff.hunks.length === 0 ? <p className="p-2 text-xs">{t("git_review.no_text")}</p>
            : <div className="max-h-72 overflow-auto"><DiffView hunks={diff.hunks} /></div>}
            {diff.truncated && <p className="p-2 text-xs text-warning">{t("git_review.diff_truncated")}</p>}</>}
      </section>}
      <form className="space-y-2" onSubmit={(event) => { event.preventDefault(); commit(); }}>
        <textarea rows={2} value={message} onChange={(event) => setMessage(event.target.value)} disabled={locked}
          aria-label={t("ide_git.commit_message")} placeholder={t("ide_git.commit_placeholder")}
          className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        <p className="text-[11px] text-muted-foreground">{t("git_review.commit_scope")}</p>
        <button type="submit" disabled={locked || !state.staged || !!state.conflicted || state.truncated || !message.trim()} className={button}>
          {busy && <Loader2 className="mr-1 inline h-3 w-3 animate-spin" aria-hidden />}{t("git_review.commit")}
        </button>
      </form>
    </>}
  </div>;
}
