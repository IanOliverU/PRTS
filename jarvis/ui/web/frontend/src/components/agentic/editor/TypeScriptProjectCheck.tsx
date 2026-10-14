import { useEffect, useRef, useState } from "react";
import { fill, useT } from "@/i18n";
import { useCodeEditorStore } from "@/store/codeEditor";

export interface ProjectDiagnostic {
  path: string | null;
  line: number;
  column: number;
  code: number;
  message: string;
  category: "error" | "warning" | "suggestion" | "message";
}
export interface ProjectCheck {
  status: "ok" | "diagnostics" | "unavailable" | "failed";
  config: string | null;
  message: string;
  diagnostics: ProjectDiagnostic[];
  truncated: boolean;
  outside_workspace: number;
}

/** Manual checks of saved project files; never starts a compiler while typing. */
export function TypeScriptProjectCheck({ workspaceId, path }: { workspaceId: string; path: string }) {
  const t = useT();
  const [result, setResult] = useState<ProjectCheck | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const sequence = useRef(0);
  const openFile = useCodeEditorStore((state) => state.openFile);
  const dirty = useCodeEditorStore((state) => Object.values(state.files).some((file) => file.workspaceId === workspaceId && file.dirty));
  useEffect(() => { sequence.current++; setResult(null); setError(""); setRunning(false); }, [workspaceId]);
  useEffect(() => () => { sequence.current++; }, []);

  const check = async () => {
    const request = ++sequence.current;
    setRunning(true); setResult(null); setError("");
    try {
      const response = await fetch(`/api/agentic-ide/workspaces/${encodeURIComponent(workspaceId)}/typescript/check`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }),
      });
      if (!response.ok) throw new Error(fill(t("code_editor.ts_failed"), { status: response.status }));
      const body = await response.json() as ProjectCheck;
      if (request === sequence.current) setResult(body);
    } catch (failure) {
      if (request === sequence.current) setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (request === sequence.current) setRunning(false);
    }
  };
  if (!/\.[cm]?[jt]sx?$/i.test(path)) return null;
  return <section aria-label={t("code_editor.ts_title")} className="min-w-0 shrink-0 overflow-hidden border-b border-border bg-background px-3 py-2 text-xs">
    <div className="flex min-w-0 flex-wrap items-center gap-2">
      <button type="button" onClick={() => void check()} disabled={running || dirty} className="rounded border border-border px-2 py-1 text-foreground hover:bg-secondary disabled:opacity-50">
        {running ? t("code_editor.ts_running") : t("code_editor.ts_check")}
      </button>
      <span className="text-muted-foreground">{dirty ? t("code_editor.ts_save_first") : t("code_editor.ts_saved")}</span>
    </div>
    <div role="status" className="mt-1 text-muted-foreground">
      {error || (result && (result.message || (result.status === "ok" ? t("code_editor.ts_clean") : fill(t("code_editor.ts_count"), { count: result.diagnostics.length }))))}
      {result?.config && ` ${fill(t("code_editor.ts_config"), { config: result.config })}`}
      {result && ` ${t("code_editor.ts_snapshot")}`}
      {result?.truncated && ` ${t("code_editor.ts_truncated")}`}
      {!!result?.outside_workspace && ` ${fill(t("code_editor.ts_outside"), { count: result.outside_workspace })}`}
    </div>
    {!!result?.diagnostics.length && <ul className="mt-2 max-h-40 overflow-auto" aria-label={t("code_editor.ts_problems")}>
      {result.diagnostics.map((diagnostic, index) => <li key={index} className="border-t border-border/50 py-1">
        {diagnostic.path ? <button type="button" className="break-all text-foreground underline" onClick={() => openFile(workspaceId, diagnostic.path!, { line: diagnostic.line, column: diagnostic.column, preview: false })}>
          {diagnostic.path}:{diagnostic.line}:{diagnostic.column}
        </button> : <span>{t("code_editor.ts_project")}</span>}
        <span className="ml-2 whitespace-pre-wrap break-words text-foreground">TS{diagnostic.code}: {diagnostic.message}</span>
      </li>)}
    </ul>}
  </section>;
}
