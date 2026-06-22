"""Verify the Linapse browser extension manifest and content script."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
EXT = ROOT / "extension"

EXPECTED_MATCHES = [
    "https://cad.onshape.com/*",
    "https://*.sketchup.com/*",
    "https://sketchup.com/*",
]


def _load_manifest(name: str) -> dict:
    path = EXT / name
    assert path.exists(), f"Missing manifest template: {path}"
    return json.loads(path.read_text())


def test_extension_manifests_define_expected_matches():
    for manifest_name in ("manifest.chrome.json", "manifest.firefox.json"):
        manifest = _load_manifest(manifest_name)
        matches = manifest["content_scripts"][0]["matches"]
        assert matches == EXPECTED_MATCHES, manifest_name
        assert manifest["content_scripts"][0]["run_at"] == "document_start"
        assert manifest["content_scripts"][0]["world"] == "MAIN"


def test_chrome_manifest_has_no_key_field():
    manifest = _load_manifest("manifest.chrome.json")
    assert "key" not in manifest, "manifest.key is rejected by Chrome Web Store uploads"


def test_extension_content_script_spoofs_platform():
    content = (EXT / "src" / "content.js").read_text()
    assert "Object.defineProperty(navigator, 'platform'" in content
    assert "'Win32'" in content


def test_extension_id_metadata_present():
    meta = json.loads((EXT / "extension-id.json").read_text())
    chrome_id = meta["chrome_extension_id"]
    assert re.fullmatch(r"[a-p]{32}", chrome_id)
    assert chrome_id == "bphljljooniagodmibficbocoemkpioc"
    assert meta["firefox_extension_id"].endswith("@cadmouse.mk2")
    assert "chromewebstore.google.com" in meta["chrome_web_store_url"]
