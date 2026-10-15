"""File-level Git staging and review, without changing working files."""

from __future__ import annotations

import hashlib
import ntpath
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from typing import Literal

from . import git_changes, git_ops
from .git_ops import GitError

Side = Literal["staged", "unstaged"]
MAX_FILES = 500


@dataclass(slots=True)
class StagingFile:
    path: str
    index: str
    worktree: str


@dataclass(slots=True)
class StagingState:
    root: str
    revision: str
    staged: int = 0
    conflicted: int = 0
    truncated: bool = False
    files: list[StagingFile] = field(default_factory=list)


def _root(folder: str | Path) -> Path:
    root = git_ops.repo_root(folder)
    if root is None:
        raise GitError("This folder is not a Git repository.", code="not_repo")
    return root.resolve()


def _git(root: Path, *args: str) -> str:
    return git_ops._ok(["--literal-pathspecs", *args], root)


def _files(root: Path) -> list[StagingFile]:
    text = _git(
        root,
        "--no-optional-locks",
        "status",
        "--porcelain=v1",
        "-z",
        "--no-renames",
        "--untracked-files=all",
    )
    return [
        StagingFile(record[3:], record[0], record[1])
        for record in text.split("\0")
        if len(record) >= 4
    ]


def inspect_staging(folder: str | Path) -> StagingState:
    root = _root(folder)
    files = _files(root)
    head = git_ops._run(["rev-parse", "--verify", "HEAD"], root)
    # Blob ids, modes and paths, rather than index stat-cache bytes. Include
    # HEAD so a concurrent commit also invalidates a previously reviewed set.
    index = _git(root, "ls-files", "--stage", "-z")
    revision = hashlib.sha256((head.stdout + "\0" + index).encode()).hexdigest()
    conflicted = sum(
        f.index + f.worktree in {"DD", "AU", "UD", "UA", "DU", "AA", "UU"} for f in files
    )
    staged = sum(
        f.index not in {" ", "?"}
        and f.index + f.worktree not in {"DD", "AU", "UD", "UA", "DU", "AA", "UU"}
        for f in files
    )
    return StagingState(
        str(root), revision, staged, conflicted, len(files) > MAX_FILES, files[:MAX_FILES]
    )


def _path(root: Path, path: str) -> str:
    # Git paths are literal, repository-relative file names. Never accept a
    # directory, traversal, drive path, .git metadata or pathspec expression.
    rel = PurePosixPath(path)
    if (
        not path
        or "\0" in path
        or "\\" in path
        or ntpath.splitdrive(path)[0]
        or rel.is_absolute()
        or any(p in {"..", ".git"} for p in rel.parts)
        or rel.as_posix() != path
        or path == "."
    ):
        raise GitError("Choose one repository-relative file.", code="invalid_path")
    try:
        (root / path).parent.resolve().relative_to(root)
    except (OSError, ValueError) as exc:
        raise GitError("The file is outside this repository.", code="invalid_path") from exc
    if (root / path).is_dir():
        raise GitError("Stage individual files, not folders.", code="invalid_path")
    return path


def stage_file(folder: str | Path, path: str, *, unstage: bool = False) -> StagingState:
    root = _root(folder)
    rel = _path(root, path)
    entry = next((f for f in _files(root) if f.path == rel), None)
    if entry is None:
        raise GitError("This file has no changes. Refresh the list.", code="clean")
    if unstage:
        if entry.index in {" ", "?"}:
            raise GitError("This file has no staged changes.", code="clean")
        if git_changes._has_head(root):
            _git(root, "reset", "--quiet", "HEAD", "--", rel)
        else:
            # There is no HEAD to restore. Remove only the index entry; even
            # edits made since staging stay on disk.
            _git(root, "update-index", "--force-remove", "--", rel)
    else:
        _git(root, "add", "--", rel)
    return inspect_staging(root)


def staging_diff(folder: str | Path, path: str, side: Side) -> git_changes.FileDiff:
    root = _root(folder)
    rel = _path(root, path)
    entry = next((f for f in _files(root) if f.path == rel), None)
    status = git_changes._status_word(entry.index + entry.worktree) if entry else "unchanged"
    if entry and entry.index == "?" and side == "unstaged":
        if (root / rel).is_symlink():
            return git_changes.FileDiff(rel, status, binary=True)
        if (root / rel).stat().st_size > git_changes.MAX_UNTRACKED_BYTES:
            return git_changes.FileDiff(rel, status, truncated=True)
        return git_changes.untracked_diff(root, rel)
    args = [
        *git_changes.NO_INDEX_REFRESH,
        "diff",
        "--no-ext-diff",
        "--no-textconv",
        "--no-color",
        "--no-renames",
        "-U3",
    ]
    if side == "staged":
        args.append("--cached")
    patch = _git(root, *args, "--", rel)
    hunks, added, removed, binary, truncated = git_changes._parse_unified(patch)
    return git_changes.FileDiff(rel, status, binary, hunks, added, removed, truncated)


def commit_staged(folder: str | Path, message: str, revision: str) -> str:
    if not message.strip():
        raise GitError("The commit needs a message.", code="invalid")
    state = inspect_staging(folder)
    if state.revision != revision:
        raise GitError("Staged changes changed. Refresh and review them again.", code="stale_index")
    if state.conflicted:
        raise GitError(
            "Resolve and stage the conflicted files before committing.", code="conflicted"
        )
    if state.truncated:
        raise GitError(
            "Too many changes to review here. Narrow them using Git before committing.",
            code="truncated",
        )
    if not state.staged:
        raise GitError("Stage at least one file before committing.", code="clean")
    root = Path(state.root)
    _git(root, "commit", "-m", message.strip())
    return _git(root, "rev-parse", "--short", "HEAD").strip()
