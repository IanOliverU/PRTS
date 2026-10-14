"""Project selection, failure reporting, and real compiler diagnostics."""

import json
import os
import shutil
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from jarvis.agentic_ide import typescript_diagnostics as diagnostics
from jarvis.agentic_ide.file_editing import EditError
from jarvis.ui.web import agentic_ide_routes as routes


def test_missing_configuration_is_not_a_clean_check(tmp_path):
    result = diagnostics.check_project(str(tmp_path), "src/app.ts")
    assert result.status == "unavailable" and result.config is None


def test_missing_compiler_reports_selected_nested_project(tmp_path):
    config = tmp_path / "apps/web/tsconfig.json"
    config.parent.mkdir(parents=True)
    config.write_text("{}", encoding="utf-8")
    result = diagnostics.check_project(str(tmp_path), "apps/web/src/app.ts")
    assert result.status == "unavailable" and result.config == "apps/web/tsconfig.json"


def test_cannot_select_file_outside_workspace(tmp_path):
    with pytest.raises(EditError):
        diagnostics.check_project(str(tmp_path), "../external.ts")


def test_route_and_schema_preserve_missing_tooling(tmp_path, monkeypatch):
    session = SimpleNamespace(folder=str(tmp_path))
    monkeypatch.setattr(routes, "get_registry", lambda: SimpleNamespace(get=lambda _: session))
    app = FastAPI()
    app.include_router(routes.router)
    with TestClient(app) as client:
        response = client.post(
            "/api/agentic-ide/workspaces/w1/typescript/check", json={"path": "app.ts"}
        )
    assert response.status_code == 200
    assert response.json()["status"] == "unavailable"
    schema = app.openapi()
    operation = schema["paths"]["/api/agentic-ide/workspaces/{workspace_id}/typescript/check"][
        "post"
    ]
    assert operation["summary"] and operation["tags"]
    assert {"status", "config", "diagnostics", "truncated", "outside_workspace"} <= schema[
        "components"
    ]["schemas"]["TypeScriptCheck"]["properties"].keys()


def test_real_compiler_finds_cross_file_error_and_clears_it(tmp_path):
    compiler_root = os.environ.get("PRTS_TEST_TYPESCRIPT")
    if not compiler_root or not shutil.which("node"):
        pytest.skip(
            "Set PRTS_TEST_TYPESCRIPT to an installed TypeScript package for the compiler proof"
        )
    dependency = tmp_path / "node_modules/typescript/lib"
    dependency.mkdir(parents=True)
    # Only the compiler and standard declarations are needed; no install or network in tests.
    for source in (Path(compiler_root) / "lib").iterdir():
        if source.name == "typescript.js" or source.name.endswith(".d.ts"):
            shutil.copyfile(source, dependency / source.name)
    (tmp_path / "tsconfig.json").write_text(
        json.dumps(
            {
                "compilerOptions": {"strict": True, "noEmit": True, "skipLibCheck": True},
                "include": ["src"],
            }
        ),
        encoding="utf-8",
    )
    (tmp_path / "src").mkdir()
    (tmp_path / "src/types.ts").write_text(
        "export type Props = { count: number };\n", encoding="utf-8"
    )
    target = tmp_path / "src/app.ts"
    target.write_text(
        'import { Props } from "./types";\nexport const props: Props = { count: "wrong" };\n',
        encoding="utf-8",
    )
    result = diagnostics.check_project(str(tmp_path), "src/app.ts")
    assert result.status == "diagnostics", result
    assert any(
        d.code == 2322 and d.path == "src/app.ts" and d.line == 2 for d in result.diagnostics
    )
    assert not list(tmp_path.rglob("*.tsbuildinfo")) and not (tmp_path / "src/app.js").exists()
    target.write_text(
        'import { Props } from "./types";\nexport const props: Props = { count: 1 };\n',
        encoding="utf-8",
    )
    assert diagnostics.check_project(str(tmp_path), "src/app.ts").status == "ok"
    (tmp_path / "tsconfig.json").write_text(
        json.dumps({"compilerOptions": {"strict": True, "composite": True}, "include": ["src"]}),
        encoding="utf-8",
    )
    assert diagnostics.check_project(str(tmp_path), "src/app.ts").status == "ok"
    assert not list(tmp_path.rglob("*.tsbuildinfo"))
    (tmp_path / "tsconfig.json").write_text("{bad", encoding="utf-8")
    assert diagnostics.check_project(str(tmp_path), "src/app.ts").status == "diagnostics"


def test_busy_checks_report_failure_instead_of_a_clean_result(tmp_path):
    if not shutil.which("node"):
        pytest.skip("Node.js is needed for this path")
    (tmp_path / "tsconfig.json").write_text("{}", encoding="utf-8")
    compiler = tmp_path / "node_modules/typescript/lib/typescript.js"
    compiler.parent.mkdir(parents=True)
    compiler.write_text("throw Error('must not run');", encoding="utf-8")
    diagnostics._slots.acquire()
    diagnostics._slots.acquire()
    try:
        assert diagnostics.check_project(str(tmp_path), "app.ts").status == "failed"
    finally:
        diagnostics._slots.release()
        diagnostics._slots.release()


def test_broken_compiler_is_not_reported_as_a_clean_project(tmp_path):
    if not shutil.which("node"):
        pytest.skip("Node.js is needed for this path")
    (tmp_path / "tsconfig.json").write_text("{}", encoding="utf-8")
    compiler = tmp_path / "node_modules/typescript/lib/typescript.js"
    compiler.parent.mkdir(parents=True)
    compiler.write_text("throw Error('broken compiler fixture');", encoding="utf-8")
    assert diagnostics.check_project(str(tmp_path), "app.ts").status == "failed"
