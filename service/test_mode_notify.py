"""Regression: the mode-switch desktop toast must fire only on a real mode
change, never on repeated same-mode calls (which would spam per motion frame)."""
from unittest.mock import patch

import linapse.config as config
import linapse.state as state


def _setup(tmp_path):
    actions = {"current_mode": "Default", "modes": {"Default": {}, "Mouse": {}}}
    state.actions_ref[0] = actions
    config.ACTIONS_PATH = tmp_path / "actions.json"


def test_toast_only_on_mode_change(tmp_path, monkeypatch):
    _setup(tmp_path)
    monkeypatch.setattr(state, "loop", None)
    monkeypatch.setattr(state, "serial_queue", None)
    monkeypatch.setattr(state, "broadcast_from_thread", lambda *a, **k: None)

    with patch.object(config.subprocess, "Popen") as popen:
        config.switch_mode("Mouse")     # Default -> Mouse : change  -> toast
        config.switch_mode("Mouse")     # Mouse   -> Mouse : no change -> silent
        config.switch_mode("Mouse")     # still no change             -> silent
        config.switch_mode("Default")   # Mouse   -> Default: change  -> toast

    assert popen.call_count == 2, f"expected 2 toasts (only on changes), got {popen.call_count}"
