"""In-memory Windows token API for restart capability and spawn tests."""

from __future__ import annotations

import ctypes
from ctypes import wintypes


class FakeFunction:
    def __init__(self, callback):
        self.callback = callback

    def __call__(self, *args):
        return self.callback(*args)


class FakeLibrary:
    def __init__(self, **functions):
        for name, callback in functions.items():
            setattr(self, name, FakeFunction(callback))


class FakeDeescalationWin32:
    def __init__(
        self,
        *,
        shell_elevated=False,
        linked_elevated=None,
        shell_integrity=0x2000,
        linked_integrity=0x2000,
        unreadable_elevation=False,
        unreadable_integrity=False,
        duplicate_linked=True,
        create_ok=True,
    ):
        self.shell_elevated = shell_elevated
        self.linked_elevated = linked_elevated
        self.integrities = {201: shell_integrity, 203: linked_integrity}
        self.unreadable_elevation = unreadable_elevation
        self.unreadable_integrity = unreadable_integrity
        self.duplicate_linked = duplicate_linked
        self.create_ok = create_ok
        self.closed = []
        self.created = []
        self.duplicated = []
        self.error = 5
        self.count = ctypes.c_ubyte(1)
        self.authorities = {
            handle: wintypes.DWORD(value) for handle, value in self.integrities.items()
        }
        self.kernel = FakeLibrary(
            GetCurrentProcess=lambda: 99,
            CloseHandle=self.close,
            OpenProcess=lambda *_: 10,
        )
        self.user = FakeLibrary(
            GetShellWindow=lambda: 1,
            GetWindowThreadProcessId=self.shell_pid,
        )
        self.advapi = FakeLibrary(
            OpenProcessToken=self.open_token,
            GetTokenInformation=self.token_info,
            DuplicateTokenEx=self.duplicate,
            GetSidSubAuthorityCount=lambda _: ctypes.pointer(self.count),
            GetSidSubAuthority=lambda sid, _: ctypes.pointer(self.authorities[sid]),
            CreateProcessWithTokenW=self.create,
        )

    @staticmethod
    def number(handle):
        return handle.value if hasattr(handle, "value") else handle

    @staticmethod
    def write(pointer, value, kind=wintypes.HANDLE):
        ctypes.cast(pointer, ctypes.POINTER(kind))[0] = value

    def close(self, handle):
        self.closed.append(self.number(handle))
        return True

    def shell_pid(self, _window, pointer):
        self.write(pointer, 42, wintypes.DWORD)
        return 1

    def open_token(self, process, _rights, output):
        self.write(output, 101 if self.number(process) == 10 else 102)
        return True

    def token_info(self, token, kind, output, _size, returned):
        handle = self.number(token)
        if kind == 19:
            if self.linked_elevated is None:
                self.error = 1312
                return False
            self.write(output, 103)
            return True
        if kind == 20:
            if self.unreadable_elevation:
                self.error = 5
                return False
            self.write(
                output,
                int(self.shell_elevated if handle == 201 else self.linked_elevated),
                wintypes.DWORD,
            )
            self.write(returned, ctypes.sizeof(wintypes.DWORD), wintypes.DWORD)
            return True
        if kind == 25:
            if self.unreadable_integrity:
                self.error = 5
                return False
            self.write(output, handle, ctypes.c_void_p)
            return True
        raise AssertionError(f"Unexpected token query: {kind}")

    def duplicate(self, source, _access, _attrs, _level, _kind, output):
        handle = self.number(source)
        self.duplicated.append(handle)
        if handle == 103 and not self.duplicate_linked:
            self.error = 1346
            return False
        self.write(output, handle + 100)
        return True

    def create(self, token, *_args):
        self.created.append(self.number(token))
        if not self.create_ok:
            self.error = 87
            return False
        output = _args[-1]._obj
        output.hProcess = 301
        output.hThread = 302
        output.dwProcessId = 4242
        return True

    def library(self, name, **_kwargs):
        return {"advapi32": self.advapi, "kernel32": self.kernel, "user32": self.user}[name]
