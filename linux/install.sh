#!/bin/bash
# CAD Mouse MK2 — Linux integration installer
# Tested on Arch Linux (Wayland). Should work on any systemd distro.
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
USER_BIN="$HOME/.local/bin"
SYSTEMD_USER="$HOME/.config/systemd/user"

err() { echo "ERROR: $*" >&2; exit 1; }
info() { echo "  $*"; }
section() { echo; echo "==> $*"; }

# ── Prerequisites ────────────────────────────────────────────────────────────
section "Checking prerequisites"

command -v python3 >/dev/null || err "python3 not found"
command -v spacenavd >/dev/null || err "spacenavd not found. Install via your package manager."
command -v ydotool >/dev/null || err "ydotool not found. Install via your package manager."
command -v uvx >/dev/null || err "uv not found. Install from https://docs.astral.sh/uv/"
command -v systemctl >/dev/null || err "systemd not found"

info "All prerequisites found."

# ── Input group ──────────────────────────────────────────────────────────────
section "Adding $USER to 'input' group"

if groups | grep -qw input; then
    info "Already in 'input' group."
else
    sudo usermod -aG input "$USER"
    info "Added. You must log out and back in (or reboot) before buttons will work."
fi

# ── linapse-service script ────────────────────────────────────────────────────
section "Installing linapse-service"

pip3 install --break-system-packages websockets 2>/dev/null || true
python3 -c "import websockets" || err "websockets install failed"

mkdir -p "$USER_BIN"
cp "$SCRIPT_DIR/linapse-service" "$USER_BIN/linapse-service"
chmod +x "$USER_BIN/linapse-service"
info "Installed to $USER_BIN/linapse-service"

# Disable old spnav-buttons if it was installed
systemctl --user disable --now spnav-buttons 2>/dev/null || true

# ── systemd user services ────────────────────────────────────────────────────
section "Installing systemd user services"

mkdir -p "$SYSTEMD_USER"
for svc in ydotoold spacenav-ws linapse-service; do
    cp "$SCRIPT_DIR/systemd/${svc}.service" "$SYSTEMD_USER/"
    info "Copied ${svc}.service"
done

systemctl --user daemon-reload
systemctl --user enable --now ydotoold spacenav-ws linapse-service
info "Services enabled and started."

# ── /etc/spnavrc ─────────────────────────────────────────────────────────────
section "Writing /etc/spnavrc (sensitivity config)"

sudo cp "$SCRIPT_DIR/spnavrc" /etc/spnavrc
info "Written. Edit /etc/spnavrc to tune sensitivity, then: sudo systemctl restart spacenavd"

# ── udev rules ───────────────────────────────────────────────────────────────
section "Installing udev rules"

sudo cp "$SCRIPT_DIR/udev/99-spacemouse.rules" /etc/udev/rules.d/99-spacemouse.rules
sudo cp "$SCRIPT_DIR/udev/restart-spacemouse-services" /usr/local/bin/restart-spacemouse-services
sudo chmod +x /usr/local/bin/restart-spacemouse-services
sudo udevadm control --reload-rules
sudo udevadm trigger --subsystem-match=usb --action=add
info "udev rules installed and reloaded."

# ── spacenav-ws patch ────────────────────────────────────────────────────────
section "Patching spacenav-ws (disabling button-snap behaviour)"

# Ensure spacenav-ws is cached by running it briefly
info "Fetching spacenav-ws (this may take a moment)..."
uvx spacenav-ws@latest --help >/dev/null 2>&1 || true

python3 "$SCRIPT_DIR/patch-spacenav-ws.py"

# Restart spacenav-ws to pick up the patch
systemctl --user restart spacenav-ws || true

# ── spacenavd ────────────────────────────────────────────────────────────────
section "Ensuring spacenavd is running"

if ! sudo systemctl is-active --quiet spacenavd; then
    sudo systemctl enable --now spacenavd
    info "spacenavd started."
else
    info "spacenavd already running."
fi

# ── Done ─────────────────────────────────────────────────────────────────────
section "Done!"
cat <<'EOF'

Next steps:
  1. Install the Tampermonkey browser extension.
  2. Drag linux/onshape-spacenav.user.js onto the Tampermonkey dashboard to install the userscript.
  3. Visit https://cad.onshape.com and open any document.
  4. Move the CAD Mouse — the viewport should respond.

If the mouse was already plugged in before installing, unplug and replug it.
If buttons don't work, log out and back in (or reboot) so the 'input' group takes effect.

To tune sensitivity, edit /etc/spnavrc then: sudo systemctl restart spacenavd
EOF
