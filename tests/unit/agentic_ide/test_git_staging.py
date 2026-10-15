"""Selective commits preserve unselected edits, with real Git repositories."""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import asdict
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from jarvis.agentic_ide import git_staging as staging
from jarvis.agentic_ide.git_ops import GitError
from jarvis.core.process_utils import NO_WINDOW_CREATIONFLAGS

pytestmark = pytest.mark.skipif(shutil.which("git") is None, reason="Git not installed")


def git(root, *args, check=True):
    return subprocess.run(
        ["git", "-c", "core.quotePath=false", *args],
        cwd=root,
        input="",
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=check,
        creationflags=NO_WINDOW_CREATIONFLAGS,
    ).stdout.strip()


@pytest.fixture
def repo(tmp_path, monkeypatch):
    monkeypatch.setenv("GIT_CONFIG_NOSYSTEM", "1")
    monkeypatch.setenv("GIT_CONFIG_GLOBAL", str(tmp_path / "gitconfig"))
    for prefix in ("AUTHOR", "COMMITTER"):
        monkeypatch.setenv(f"GIT_{prefix}_NAME", "Test")
        monkeypatch.setenv(f"GIT_{prefix}_EMAIL", "test@example.invalid")
    root = tmp_path / "project"
    root.mkdir()
    git(root, "init", "-b", "main")
    git(root, "config", "core.autocrlf", "false")
    (root / "app.txt").write_text("base\n", encoding="utf-8")
    git(root, "add", "app.txt")
    git(root, "commit", "-m", "Initial")
    return root


@pytest.mark.parametrize("name", ["new file.txt", "square[1].txt", "-option.txt", "日本語.txt"])
def test_stage_and_commit_only_one_literal_file(repo, name):
    (repo / name).write_text("chosen\n", encoding="utf-8")
    (repo / "unrelated.txt").write_text("leave me\n", encoding="utf-8")
    state = staging.stage_file(repo, name)
    assert state.staged == 1
    staging.commit_staged(repo, "Chosen change", state.revision)
    assert git(repo, "diff-tree", "--no-commit-id", "--name-only", "-r", "HEAD") == name
    assert git(repo, "status", "--porcelain") == "?? unrelated.txt"


def test_staged_and_unstaged_parts_of_one_file_remain_separate(repo):
    path = repo / "app.txt"
    path.write_text("staged\n", encoding="utf-8")
    state = staging.stage_file(repo, "app.txt")
    path.write_text("later working edit\n", encoding="utf-8")
    assert any(
        line.text == "staged" and line.kind == "add"
        for h in staging.staging_diff(repo, "app.txt", "staged").hunks
        for line in h.lines
    )
    assert any(
        line.text == "later working edit" and line.kind == "add"
        for h in staging.staging_diff(repo, "app.txt", "unstaged").hunks
        for line in h.lines
    )
    staging.commit_staged(repo, "Use staged content", state.revision)
    assert git(repo, "show", "HEAD:app.txt") == "staged"
    assert path.read_text(encoding="utf-8") == "later working edit\n"
    assert staging.inspect_staging(repo).files[0].worktree == "M"


def test_unstage_deletion_preserves_working_tree(repo):
    (repo / "app.txt").unlink()
    assert staging.stage_file(repo, "app.txt").staged == 1
    state = staging.stage_file(repo, "app.txt", unstage=True)
    assert not state.staged and not (repo / "app.txt").exists()
    assert state.files[0].worktree == "D"


def test_unborn_unstage_preserves_edits_after_staging(repo):
    fresh = repo / "fresh"
    fresh.mkdir()
    git(fresh, "init")
    path = fresh / "new.txt"
    path.write_text("first\n", encoding="utf-8")
    assert staging.stage_file(fresh, "new.txt").staged == 1
    path.write_text("newer\n", encoding="utf-8")
    state = staging.stage_file(fresh, "new.txt", unstage=True)
    assert state.staged == 0
    assert path.read_text(encoding="utf-8") == "newer\n"


def test_external_index_change_requires_fresh_review(repo):
    (repo / "app.txt").write_text("chosen\n", encoding="utf-8")
    state = staging.stage_file(repo, "app.txt")
    (repo / "other.txt").write_text("another agent\n", encoding="utf-8")
    git(repo, "add", "other.txt")
    before = git(repo, "rev-parse", "HEAD")
    with pytest.raises(GitError, match="Refresh") as error:
        staging.commit_staged(repo, "Do not include unknown edits", state.revision)
    assert error.value.code == "stale_index"
    assert git(repo, "rev-parse", "HEAD") == before
    assert staging.inspect_staging(repo).staged == 2


@pytest.mark.parametrize(
    "name",
    ["../outside", ".", "folder", "/absolute", "C:/outside", ".git/config", "folder/../app.txt"],
)
def test_refuse_broad_or_escaping_paths(repo, name):
    (repo / "folder").mkdir()
    with pytest.raises(GitError) as error:
        staging.stage_file(repo, name)
    assert error.value.code == "invalid_path"
    assert not git(repo, "diff", "--cached", "--name-only")


def test_conflicts_are_visible_and_block_commit_until_resolved(repo):
    git(repo, "checkout", "-b", "other")
    (repo / "app.txt").write_text("other\n", encoding="utf-8")
    git(repo, "commit", "-am", "Other")
    git(repo, "checkout", "main")
    (repo / "app.txt").write_text("ours\n", encoding="utf-8")
    git(repo, "commit", "-am", "Ours")
    git(repo, "merge", "other", check=False)
    state = staging.inspect_staging(repo)
    assert state.conflicted == 1 and state.files[0].index == "U"
    with pytest.raises(GitError) as error:
        staging.commit_staged(repo, "Must resolve", state.revision)
    assert error.value.code == "conflicted"
    (repo / "app.txt").write_text("resolved\n", encoding="utf-8")
    state = staging.stage_file(repo, "app.txt")
    assert not state.conflicted
    staging.commit_staged(repo, "Resolve merge", state.revision)


def test_rename_lists_both_paths_and_keeps_unrelated_edits(repo):
    git(repo, "mv", "app.txt", "renamed.txt")
    (repo / "unrelated.txt").write_text("keep\n", encoding="utf-8")
    state = staging.inspect_staging(repo)
    assert {f.path for f in state.files} == {"app.txt", "renamed.txt", "unrelated.txt"}
    assert state.staged == 2
    staging.commit_staged(repo, "Rename", state.revision)
    assert git(repo, "show", "HEAD:renamed.txt") == "base"
    assert (repo / "unrelated.txt").exists()


def test_subfolder_review_names_the_repository_and_all_staged_files(repo):
    (repo / "web").mkdir()
    (repo / "app.txt").write_text("outside web\n", encoding="utf-8")
    staging.stage_file(repo, "app.txt")
    state = staging.inspect_staging(repo / "web")
    assert Path(state.root) == repo.resolve()
    assert state.staged == 1 and state.files[0].path == "app.txt"


def test_no_staged_changes_never_stages_automatically(repo):
    (repo / "app.txt").write_text("not selected\n", encoding="utf-8")
    with pytest.raises(GitError) as error:
        staging.commit_staged(repo, "No selection", staging.inspect_staging(repo).revision)
    assert error.value.code == "clean"
    assert git(repo, "show", "HEAD:app.txt") == "base"


def test_routes_and_openapi_match_the_staging_contract(repo, monkeypatch):
    from jarvis.ui.web import agentic_ide_git_routes as routes

    monkeypatch.setattr(routes, "allowed_thread_folder", lambda p: repo if p == str(repo) else None)
    app = FastAPI()
    app.include_router(routes.router)
    with TestClient(app) as client:
        base = "/api/agentic-ide/git/staging"
        state = client.get(base, params={"folder": str(repo)}).json()
        assert state == asdict(staging.inspect_staging(repo))
        (repo / "app.txt").write_text("route content\n", encoding="utf-8")
        state = client.post(base + "/stage", json={"folder": str(repo), "path": "app.txt"}).json()
        diff = client.get(
            base + "/diff", params={"folder": str(repo), "path": "app.txt", "side": "staged"}
        )
        assert diff.json()["added"] == 1
        committed = client.post(
            base + "/commit",
            json={"folder": str(repo), "message": "Route", "revision": state["revision"]},
        )
        assert committed.status_code == 200 and committed.json()["commit"]
        assert (
            client.post(base + "/stage", json={"folder": "outside", "path": "app.txt"}).status_code
            == 403
        )
        assert (
            client.get(
                base + "/diff", params={"folder": str(repo), "path": "app.txt", "side": "invalid"}
            ).status_code
            == 422
        )
    schema = app.openapi()
    fields = schema["components"]["schemas"]["StagingState"]["properties"]
    assert set(fields) == {"root", "revision", "staged", "conflicted", "truncated", "files"}
    for path in (base, base + "/diff", base + "/stage", base + "/unstage", base + "/commit"):
        operation = next(iter(schema["paths"][path].values()))
        assert operation["summary"] and operation["tags"] == ["agentic-ide-git"]


def test_untracked_diff_distinguishes_large_text_and_binary(repo):
    (repo / "large.txt").write_bytes(b"a" * (staging.git_changes.MAX_UNTRACKED_BYTES + 1))
    large = staging.staging_diff(repo, "large.txt", "unstaged")
    assert large.truncated and not large.binary
    (repo / "data.bin").write_bytes(b"\0binary")
    assert staging.staging_diff(repo, "data.bin", "unstaged").binary
