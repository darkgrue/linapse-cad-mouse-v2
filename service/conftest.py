import os
import subprocess
import sys
import pytest
from unittest.mock import MagicMock

def pytest_configure(config):
    # Keep the browser bridge off during the whole pytest session (including subprocess stress tests).
    os.environ["LINAPSE_SKIP_BROWSER_BRIDGE"] = "1"


# Real Popen captured before any test can patch it, so the safety net below can
# still delegate genuine spawns (e.g. tests that launch the real service).
_REAL_POPEN = subprocess.Popen
# Every emulated mouse move / scroll / keypress shells out to `ydotool`, and the
# mode-switch toast to `notify-send`. Both are the only ways a test can reach the
# real desktop, and both go through subprocess.Popen.
_DESKTOP_PROGRAMS = {"ydotool", "notify-send"}


@pytest.fixture(autouse=True)
def block_real_desktop_input(monkeypatch):
    """Safety net: no test may drive the real desktop — move the cursor, press
    keys, or pop notifications. Stub `ydotool`/`notify-send`; delegate every
    other spawn to the genuine Popen. Tests that assert on emulated input install
    their own subprocess.Popen recorder inside the test, which overrides this
    within their scope.
    """
    def guarded(cmd, *args, **kwargs):
        prog = cmd[0] if isinstance(cmd, (list, tuple)) and cmd else cmd
        if prog in _DESKTOP_PROGRAMS:
            return MagicMock(name="blocked_desktop_popen")
        return _REAL_POPEN(cmd, *args, **kwargs)
    monkeypatch.setattr(subprocess, "Popen", guarded)
    yield

def pytest_runtest_setup(item):
    if sys.platform in ("win32", "darwin"):
        filename = item.fspath.basename
        cross_platform_files = {
            "test_cross_platform.py",
            "test_installer_config.py",
            "test_browser_extension.py",
            "test_browser_bridge.py",
            "test_playwright_benchy.py",
            "test_multi_click.py",
            "test_serial_buttons.py"
        }
        if filename not in cross_platform_files:
            pytest.skip(f"Linux-only test: skipped on {sys.platform}")
