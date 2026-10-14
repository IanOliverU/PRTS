"""Explicit, non-emitting checks with a workspace's installed TypeScript compiler."""

from __future__ import annotations

import json
import shutil
import subprocess
import threading
from pathlib import Path
from typing import Literal

from loguru import logger
from pydantic import BaseModel, Field

from jarvis.core.process_utils import NO_WINDOW_CREATIONFLAGS

from .file_editing import EditError, _resolve


class TypeScriptDiagnostic(BaseModel):
    path: str | None = None
    line: int = Field(default=1, ge=1)
    column: int = Field(default=1, ge=1)
    code: int
    message: str
    category: Literal["error", "warning", "suggestion", "message"]


class TypeScriptCheck(BaseModel):
    status: Literal["ok", "diagnostics", "unavailable", "failed"]
    config: str | None = None
    message: str = ""
    diagnostics: list[TypeScriptDiagnostic] = Field(default_factory=list)
    truncated: bool = False
    outside_workspace: int = 0


_slots = threading.BoundedSemaphore(2)
_DRIVER = r"""
const ts = require(process.argv[1]);
const path = require('node:path');
const config = process.argv[2], root = process.argv[3];
const raw = ts.readConfigFile(config, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(
  raw.config || {}, ts.sys, path.dirname(config), undefined, config);
const seen = new Set(), all = [];
function check(cfg, initial) {
  if (seen.has(cfg)) return;
  seen.add(cfg);
  const read = initial || ts.readConfigFile(cfg, ts.sys.readFile);
  if (read.error) { all.push(read.error); return; }
  const p = cfg === config ? parsed : ts.parseJsonConfigFileContent(
    read.config, ts.sys, path.dirname(cfg), undefined, cfg);
  all.push(...p.errors);
  const program = ts.createProgram({
    rootNames: p.fileNames,
    options: {...p.options, noEmit: true},
    projectReferences: p.projectReferences,
  });
  all.push(...ts.getPreEmitDiagnostics(program));
  for (const ref of p.projectReferences || []) {
    const child = ts.resolveProjectReferencePath(ref);
    const relative = path.relative(root, child);
    if (!relative.startsWith('..' + path.sep) && relative !== '..'
        && !path.isAbsolute(relative)) check(child);
  }
}
check(config, raw);
let outside = 0;
const diagnostics = [];
const keys = new Set();
for (const d of all) {
  let file = null, line = 1, column = 1;
  if (d.file) {
    const filename = ts.sys.realpath ? ts.sys.realpath(d.file.fileName) : d.file.fileName;
    file = path.relative(root, filename);
    if (file.startsWith('..' + path.sep) || file === '..' || path.isAbsolute(file)) {
      outside++; continue;
    }
    file = file.split(path.sep).join('/');
    const pos = d.file.getLineAndCharacterOfPosition(d.start || 0);
    line = pos.line + 1; column = pos.character + 1;
  }
  const item = {
    path:file, line, column, code:d.code,
    message:ts.flattenDiagnosticMessageText(d.messageText,'\n'),
    category:ts.DiagnosticCategory[d.category].toLowerCase(),
  };
  const key = JSON.stringify(item);
  if (!keys.has(key)) { keys.add(key); diagnostics.push(item); }
}
process.stdout.write(JSON.stringify({diagnostics:diagnostics.slice(0,500),truncated:diagnostics.length>500,outside_workspace:outside}));
"""


def check_project(root: str, source_path: str) -> TypeScriptCheck:
    """Check saved files without running package scripts or writing build artifacts."""
    _, target = _resolve(root, source_path)
    base = Path(root).resolve()
    config = None
    directory = target.parent
    while directory.is_relative_to(base):
        candidate = directory / "tsconfig.json"
        if candidate.is_file():
            if not candidate.resolve().is_relative_to(base):
                raise EditError("TypeScript configuration is outside the workspace.")
            config = candidate
            break
        if directory == base:
            break
        directory = directory.parent
    if config is None:
        return TypeScriptCheck(
            status="unavailable",
            message=("No tsconfig.json found for this file inside the workspace."),
        )
    relative_config = config.relative_to(base).as_posix()
    compiler = None
    directory = config.parent
    while directory.is_relative_to(base):
        candidate = directory / "node_modules/typescript/lib/typescript.js"
        if candidate.is_file():
            compiler = candidate
            break
        if directory == base:
            break
        directory = directory.parent
    node = shutil.which("node")
    if compiler is None or node is None:
        return TypeScriptCheck(
            status="unavailable",
            config=relative_config,
            message=(
                "Install the project's TypeScript dependency and Node.js to check this project."
            ),
        )
    if not _slots.acquire(blocking=False):
        return TypeScriptCheck(
            status="failed",
            config=relative_config,
            message="Other project checks are running. Try again when they finish.",
        )
    try:
        try:
            process = subprocess.run(
                [node, "-e", _DRIVER, str(compiler), config.as_posix(), base.as_posix()],
                cwd=config.parent,
                capture_output=True,
                encoding="utf-8",
                errors="replace",
                timeout=30,
                creationflags=NO_WINDOW_CREATIONFLAGS,
                check=False,
            )
            if process.returncode:
                logger.warning("TypeScript compiler failed with exit code {}", process.returncode)
                return TypeScriptCheck(
                    status="failed",
                    config=relative_config,
                    message=(
                        "The TypeScript compiler could not finish the check. "
                        "Check the project's compiler installation and configuration."
                    ),
                )
            payload = json.loads(process.stdout)
            result = TypeScriptCheck(
                status="diagnostics"
                if payload["diagnostics"] or payload["outside_workspace"]
                else "ok",
                config=relative_config,
                **payload,
            )
            return result
        except subprocess.TimeoutExpired:
            logger.warning("TypeScript project check timed out")
            return TypeScriptCheck(
                status="failed",
                config=relative_config,
                message=(
                    "The project check exceeded 30 seconds. "
                    "Run the project's check command in a terminal for a longer check."
                ),
            )
        except (OSError, ValueError, KeyError) as exc:
            logger.warning("TypeScript project check failed: {}", type(exc).__name__)
            return TypeScriptCheck(
                status="failed",
                config=relative_config,
                message="The project check failed to return usable diagnostics.",
            )
    finally:
        _slots.release()
