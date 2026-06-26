#!/usr/bin/env python3
"""Regression: a missed/phantom button release must not auto-scroll or hold a
key forever (the OnShape-era "scrolling up at idle until I press a button" bug).
"""

import threading
import time

import pytest

from linapse import hid


@pytest.fixture(autouse=True)
def fast_safety(monkeypatch):
    # Shrink the safety window so the test runs quickly.
    monkeypatch.setattr(hid, "MAX_HOLD_SECONDS", 0.2)
    monkeypatch.setattr(hid, "SCROLL_INTERVAL", 0.01)
    hid._scroll_threads.clear()
    hid._active_holds.clear()
    hid._hold_watchdogs.clear()
    yield


def test_scroll_loop_self_terminates_without_release(monkeypatch):
    """A scroll loop whose release never arrives must stop on its own and free
    its slot, instead of dispatching scroll forever."""
    calls = []
    monkeypatch.setattr(hid, "dispatch", lambda act: calls.append(act))

    stop = threading.Event()  # never set — simulates a missed release
    hid._scroll_threads[1] = (None, stop)
    t = threading.Thread(target=hid._scroll_loop, args=(1, stop, {}), daemon=True)
    t.start()
    t.join(timeout=2.0)

    assert not t.is_alive(), "scroll loop did not self-terminate"
    assert 1 not in hid._scroll_threads, "stuck slot not freed"
    assert calls, "expected at least one scroll before timeout"
    # Bounded, not infinite: ~0.2s / 0.01s ≈ 20 dispatches, nowhere near runaway.
    assert len(calls) < 100


def test_hold_watchdog_force_releases(monkeypatch):
    """A stuck key/mouse hold must be force-released after the safety window."""
    released = []
    monkeypatch.setattr(hid, "dispatch_hold", lambda act, down: released.append((act, down)))

    act = {"action": "key", "value": "x"}
    hid._active_holds[0] = act
    wd = threading.Timer(hid.MAX_HOLD_SECONDS, hid._force_release_hold, args=[0])
    wd.daemon = True
    hid._hold_watchdogs[0] = wd
    wd.start()

    time.sleep(0.4)
    assert 0 not in hid._active_holds, "stuck hold not released"
    assert (act, False) in released, "key was never lifted"
