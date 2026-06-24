"""Chord-cycle + LED migration checks for the Controller mode.

Cycle (double): Default -> Mouse -> Controller -> Media -> Browser -> (Default)
Triple is the reverse. Default ships red reactive; Controller ships rainbow.
"""
import json
import copy
import pytest
from linapse import config


@pytest.fixture
def cfg_path(tmp_path, monkeypatch):
    p = tmp_path / "actions.json"
    monkeypatch.setattr(config, "ACTIONS_PATH", p)
    return p


def c2(a, m):
    return a["modes"][m]["buttons"]["chord:2"]["value"]


def c3(a, m):
    return a["modes"][m]["buttons"]["chord:3"]["value"]


def test_fresh_install_cycle_and_colors(cfg_path):
    a = config.load_actions()
    # Controller exists with rainbow; Default is red reactive
    assert "Controller" in a["modes"]
    assert a["modes"]["Controller"]["led"]["effect"] == "rainbow_swirl"
    assert a["modes"]["Default"]["led"] == {"effect": "reactive", "color": "FF0000", "brightness": 128}
    # Double cycle
    assert (c2(a, "Default"), c2(a, "Mouse"), c2(a, "Controller"), c2(a, "Media"), c2(a, "Browser")) \
        == ("Mouse", "Controller", "Media", "Browser", "Default")
    # Triple cycle (reverse)
    assert (c3(a, "Default"), c3(a, "Browser"), c3(a, "Media"), c3(a, "Controller"), c3(a, "Mouse")) \
        == ("Browser", "Media", "Controller", "Mouse", "Default")


def test_migration_is_idempotent(cfg_path):
    first = config.load_actions()
    snapshot = copy.deepcopy(first)
    second = config.load_actions()
    # No oscillation: a second load must not change anything.
    assert second == snapshot


def test_existing_pre_controller_config_migrates(cfg_path):
    legacy = {
        "modes": {
            "Default": {
                "buttons": {"chord:2": {"action": "mode", "value": "Mouse"},
                            "chord:3": {"action": "mode", "value": "Browser"}},
                "taps": {}, "led": {"effect": "rainbow_swirl", "color": "FFFFFF", "brightness": 128}},
            "Mouse": {
                "buttons": {"chord:2": {"action": "mode", "value": "Media"},
                            "chord:3": {"action": "mode", "value": "Default"}},
                "taps": {}, "led": {"effect": "solid", "color": "00FFFF", "brightness": 128}},
            "Media": {
                "buttons": {"chord:2": {"action": "mode", "value": "Browser"},
                            "chord:3": {"action": "mode", "value": "Mouse"}},
                "taps": {}, "led": {"effect": "volume", "color": "00FF00", "brightness": 128}},
            "Browser": {
                "buttons": {"chord:2": {"action": "mode", "value": "Default"},
                            "chord:3": {"action": "mode", "value": "Media"}},
                "taps": {}, "led": {"effect": "solid", "color": "0000FF", "brightness": 128}},
        },
        "current_mode": "Default",
    }
    cfg_path.write_text(json.dumps(legacy))
    a = config.load_actions()
    # Controller spliced in after Mouse
    assert "Controller" in a["modes"]
    assert c2(a, "Mouse") == "Controller"
    assert c3(a, "Media") == "Controller"
    # Stock rainbow Default bumped to red reactive
    assert a["modes"]["Default"]["led"] == {"effect": "reactive", "color": "FF0000", "brightness": 128}
    # Re-run stays put
    assert config.load_actions() == a


def test_customized_default_led_not_clobbered(cfg_path):
    custom = {
        "modes": {
            "Default": {"buttons": {}, "taps": {},
                        "led": {"effect": "solid", "color": "123456", "brightness": 64}},
        },
        "current_mode": "Default",
    }
    cfg_path.write_text(json.dumps(custom))
    a = config.load_actions()
    assert a["modes"]["Default"]["led"] == {"effect": "solid", "color": "123456", "brightness": 64}


if __name__ == "__main__":
    import sys
    sys.exit(pytest.main([__file__, "-q"]))
