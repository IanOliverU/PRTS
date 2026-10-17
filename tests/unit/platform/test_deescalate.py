"""Guards for the unelevated relaunch used to recover input reachability.

The contract that matters here is HONESTY: when privileges cannot be dropped,
the caller must learn that instead of quietly relaunching elevated again. A
"repaired" app that still ignores the user's dictation software — with a button
that reported success — is the worst possible outcome.
"""

from __future__ import annotations

import pytest

from jarvis.platform.deescalate import (
    DEESCALATION_ATTEMPTED_ENV,
    KEEP_ELEVATION_ENV,
    DeescalationResult,
    environment_block,
    maybe_relaunch_unelevated,
    spawn_unelevated,
    token_creationflags,
)


class TestEnvironmentBlock:
    def test_pairs_are_nul_separated_and_double_nul_terminated(self):
        block = environment_block({"A": "1", "B": "2"})
        assert block == "A=1\0B=2\0\0"

    def test_names_are_sorted_case_insensitively(self):
        """Windows documents the block as case-insensitively sorted; an
        unsorted one is 'undefined behaviour' on the restart path."""
        block = environment_block({"beta": "2", "Alpha": "1", "GAMMA": "3"})
        assert block == "Alpha=1\0beta=2\0GAMMA=3\0\0"

    def test_empty_environment_still_terminates(self):
        assert environment_block({}) == "\0"

    def test_values_containing_separators_survive_verbatim(self):
        block = environment_block({"PATH": "C:\\a;C:\\b", "Q": "x=y"})
        assert "PATH=C:\\a;C:\\b\0" in block
        assert "Q=x=y\0" in block


class TestTokenCreationFlags:
    def test_strips_detached_process_and_keeps_the_window_hidden(self):
        detached_process = 0x00000008
        create_unicode_environment = 0x00000400
        create_no_window = 0x08000000
        normal_priority_class = 0x00000020

        flags = token_creationflags(detached_process | create_no_window)

        assert flags == create_no_window | create_unicode_environment | normal_priority_class

    def test_preserves_unrelated_creation_flags(self):
        create_new_process_group = 0x00000200
        create_unicode_environment = 0x00000400
        normal_priority_class = 0x00000020

        flags = token_creationflags(create_new_process_group)

        assert flags == (
            create_new_process_group | create_unicode_environment | normal_priority_class
        )

    def test_relaunch_never_inherits_a_demoted_priority_class(self):
        # Without an explicit class the child inherits the creator's — and an
        # elevated launcher started by the old autostart task ran BelowNormal
        # (BUG-204 amplifier). The relaunch must pin Normal explicitly.
        normal_priority_class = 0x00000020
        assert token_creationflags(0) & normal_priority_class


class TestPlatformGating:
    def test_posix_reports_an_actionable_refusal_rather_than_pretending(self):
        result = spawn_unelevated([], cwd=".", env={}, _platform="linux")
        assert result.ok is False
        assert result.pid is None
        assert "normal user account" in result.detail

    def test_windows_path_is_delegated_with_the_caller_arguments(self):
        seen: dict[str, object] = {}

        def fake(argv, *, cwd, env, creationflags):
            seen.update(argv=argv, cwd=cwd, env=env, creationflags=creationflags)
            return DeescalationResult(True, 4242, "ok")

        result = spawn_unelevated(
            ["py", "-m", "x"],
            cwd="C:\\repo",
            env={"A": "1"},
            creationflags=8,
            _platform="win32",
            _spawn=fake,
        )
        assert result.ok is True
        assert result.pid == 4242
        assert seen == {
            "argv": ["py", "-m", "x"],
            "cwd": "C:\\repo",
            "env": {"A": "1"},
            "creationflags": 8,
        }


class TestFailureContainment:
    def test_a_raising_spawn_becomes_a_reported_failure_not_a_crash(self):
        """This runs while the app is mid-restart; an exception escaping here
        would take down a live desktop session."""

        def boom(argv, *, cwd, env, creationflags):
            raise OSError("token duplication denied")

        result = spawn_unelevated(["py"], cwd=".", env={}, _platform="win32", _spawn=boom)
        assert result.ok is False
        assert result.pid is None
        assert "token duplication denied" in result.detail

    def test_failure_never_reports_a_pid(self):
        def refuse(argv, *, cwd, env, creationflags):
            return DeescalationResult(False, None, "no linked token")

        assert (
            spawn_unelevated(["py"], cwd=".", env={}, _platform="win32", _spawn=refuse).pid is None
        )


def _spawner(record: list, *, ok: bool = True):
    def spawn(argv, *, cwd, env, creationflags):
        record.append({"argv": argv, "cwd": cwd, "env": env})
        return DeescalationResult(ok, 99 if ok else None, "shell token")

    return spawn


@pytest.fixture(autouse=True)
def _clean_deescalation_env(monkeypatch):
    """Neither guard variable may leak in from the host running the tests."""
    monkeypatch.delenv(DEESCALATION_ATTEMPTED_ENV, raising=False)
    monkeypatch.delenv(KEEP_ELEVATION_ENV, raising=False)


class TestBootTimeDeescalation:
    """The pre-boot decision. ``None`` means "carry on in this process", and
    getting that wrong either wastes a whole boot or loops forever."""

    def test_an_elevated_launch_hands_over_before_booting(self, monkeypatch):
        monkeypatch.setattr("sys.platform", "win32")
        calls: list = []

        result = maybe_relaunch_unelevated(
            ["py", "-m", "jarvis.ui.web.launcher"],
            cwd="C:\\repo",
            env={"A": "1"},
            _elevated=lambda: True,
            _spawn=_spawner(calls),
        )

        assert result is not None and result.ok is True
        assert calls[0]["argv"] == ["py", "-m", "jarvis.ui.web.launcher"]

    def test_the_child_is_marked_so_a_still_elevated_relaunch_stops(self, monkeypatch):
        """Without this the app boot-loops on an account whose shell token is
        itself elevated — strictly worse than the isolation being repaired."""
        monkeypatch.setattr("sys.platform", "win32")
        calls: list = []

        maybe_relaunch_unelevated(
            ["py"], cwd=".", env={"A": "1"}, _elevated=lambda: True, _spawn=_spawner(calls)
        )

        assert calls[0]["env"][DEESCALATION_ATTEMPTED_ENV] == "1"

    def test_a_marked_process_never_tries_again(self, monkeypatch):
        monkeypatch.setattr("sys.platform", "win32")
        monkeypatch.setenv(DEESCALATION_ATTEMPTED_ENV, "1")
        calls: list = []

        assert (
            maybe_relaunch_unelevated(
                ["py"], cwd=".", _elevated=lambda: True, _spawn=_spawner(calls)
            )
            is None
        )
        assert calls == []

    def test_an_ordinary_unelevated_launch_is_untouched(self, monkeypatch):
        monkeypatch.setattr("sys.platform", "win32")
        calls: list = []

        assert (
            maybe_relaunch_unelevated(
                ["py"], cwd=".", _elevated=lambda: False, _spawn=_spawner(calls)
            )
            is None
        )
        assert calls == []

    def test_an_unreadable_token_boots_on_rather_than_guessing(self, monkeypatch):
        """``None`` is "could not measure". Relaunching on a guess would strand
        a user whose app was never elevated in the first place."""
        monkeypatch.setattr("sys.platform", "win32")
        calls: list = []

        assert (
            maybe_relaunch_unelevated(
                ["py"], cwd=".", _elevated=lambda: None, _spawn=_spawner(calls)
            )
            is None
        )
        assert calls == []

    def test_the_opt_out_is_honoured(self, monkeypatch):
        monkeypatch.setattr("sys.platform", "win32")
        monkeypatch.setenv(KEEP_ELEVATION_ENV, "1")
        calls: list = []

        assert (
            maybe_relaunch_unelevated(
                ["py"], cwd=".", _elevated=lambda: True, _spawn=_spawner(calls)
            )
            is None
        )
        assert calls == []

    def test_posix_is_a_no_op(self, monkeypatch):
        """Dropping from root to "whoever ran sudo" is guesswork that would
        strand file ownership — the user is told instead."""
        monkeypatch.setattr("sys.platform", "linux")
        calls: list = []

        assert (
            maybe_relaunch_unelevated(
                ["py"], cwd=".", _elevated=lambda: True, _spawn=_spawner(calls)
            )
            is None
        )
        assert calls == []

    def test_a_refused_handover_is_reported_not_swallowed(self, monkeypatch):
        """The caller must be able to tell "exit now" from "boot elevated and
        warn", so a failure has to come back as a result, never as ``None``."""
        monkeypatch.setattr("sys.platform", "win32")

        result = maybe_relaunch_unelevated(
            ["py"], cwd=".", _elevated=lambda: True, _spawn=_spawner([], ok=False)
        )

        assert result is not None and result.ok is False


class TestVerifiedNativeTokens:
    @pytest.fixture
    def native(self, monkeypatch):
        import ctypes
        from types import SimpleNamespace

        from jarvis.platform import deescalate
        from tests.fakes.fake_deescalation_win32 import FakeDeescalationWin32

        def configure(**kwargs):
            fake = FakeDeescalationWin32(**kwargs)
            monkeypatch.setattr(deescalate, "os", SimpleNamespace(name="nt"))
            monkeypatch.setattr(ctypes, "WinDLL", fake.library, raising=False)
            monkeypatch.setattr(ctypes, "get_last_error", lambda: fake.error, raising=False)
            return fake

        return configure

    @staticmethod
    def spawn():
        from jarvis.platform.deescalate import _spawn_unelevated_windows

        return _spawn_unelevated_windows(
            ["pythonw", "-m", "app"], cwd="C:/workspace", env={}, creationflags=0
        )

    def test_ordinary_shell_spawns_and_closes_every_handle(self, native):
        fake = native()
        result = self.spawn()
        assert result.ok and result.pid == 4242
        assert fake.created == [201]
        assert sorted(fake.closed) == [10, 101, 201, 301, 302]

    def test_elevated_shell_is_refused_without_creating_child(self, native):
        fake = native(shell_elevated=True)
        result = self.spawn()
        assert not result.ok and result.pid is None
        assert "administrator rights" in result.detail
        assert fake.created == []
        assert sorted(fake.closed) == [10, 101, 102, 201]

    def test_elevated_shell_falls_back_to_verified_linked_token(self, native):
        fake = native(shell_elevated=True, linked_elevated=False)
        result = self.spawn()
        assert result.ok
        assert "linked token" in result.detail
        assert fake.created == [203]
        assert sorted(fake.closed) == [10, 101, 102, 103, 201, 203, 301, 302]

    def test_linked_token_must_also_be_unelevated(self, native):
        fake = native(shell_elevated=True, linked_elevated=True)
        assert not self.spawn().ok
        assert fake.created == []
        assert sorted(fake.closed) == [10, 101, 102, 103, 201, 203]

    @pytest.mark.parametrize("failure", ["unreadable_elevation", "unreadable_integrity"])
    def test_unreadable_state_fails_closed(self, native, failure):
        fake = native(**{failure: True})
        result = self.spawn()
        assert not result.ok and "could not be verified" in result.detail
        assert fake.created == []
        assert sorted(fake.closed) == [10, 101, 102, 201]

    @pytest.mark.parametrize("integrity", [0x1000, 0x3000, 0x4000])
    def test_only_ordinary_desktop_integrity_is_accepted(self, native, integrity):
        fake = native(shell_integrity=integrity)
        assert not self.spawn().ok
        assert fake.created == []
        assert 201 in fake.closed

    def test_linked_duplication_failure_is_reported_and_cleaned_up(self, native):
        fake = native(shell_elevated=True, linked_elevated=False, duplicate_linked=False)
        result = self.spawn()
        assert not result.ok and "1346" in result.detail
        assert fake.created == []
        assert sorted(fake.closed) == [10, 101, 102, 103, 201]

    def test_spawn_failure_closes_candidate_and_reports_failure(self, native):
        fake = native(create_ok=False)
        result = self.spawn()
        assert not result.ok and result.pid is None
        assert "87" in result.detail
        assert sorted(fake.closed) == [10, 101, 201]

    def test_capability_probe_never_creates_child_and_releases_candidate(self, native):
        from jarvis.platform.deescalate import probe_unelevated_restart

        fake = native()
        result = probe_unelevated_restart(_platform="win32")
        assert result.ok and result.pid is None
        assert fake.created == []
        assert sorted(fake.closed) == [10, 101, 201]

    def test_capability_probe_reports_no_ordinary_token(self, native):
        from jarvis.platform.deescalate import probe_unelevated_restart

        fake = native(shell_elevated=True)
        result = probe_unelevated_restart(_platform="win32")
        assert not result.ok and result.pid is None
        assert "restarting from this elevated desktop will not repair it" in result.detail
        assert fake.created == []
        assert sorted(fake.closed) == [10, 101, 102, 201]

    def test_non_windows_capability_never_calls_native_api(self):
        from jarvis.platform.deescalate import probe_unelevated_restart

        def unexpected(*args, **kwargs):
            raise AssertionError("Native API should not run")

        assert not probe_unelevated_restart(_platform="linux", _probe=unexpected).ok

    def test_capability_exception_becomes_honest_refusal(self):
        from jarvis.platform.deescalate import probe_unelevated_restart

        def unavailable(*args, **kwargs):
            raise OSError("token API unavailable")

        assert not probe_unelevated_restart(_platform="win32", _probe=unavailable).ok
