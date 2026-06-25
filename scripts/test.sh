#!/usr/bin/env bash
# Run the Python test suite.
#
# Locally it runs inside a throwaway container so tests can never reach the host
# desktop (move the cursor, press keys, pop notifications) or write to /etc.
#
# In CI — or any container — it runs pytest directly. CI already runs us inside a
# container (docker exec on a systemd image), so we must NOT spawn another one.
# Detection is by /.dockerenv, which Docker writes into every container, so it
# holds for both CI's image and our own re-exec. Env flags are extra belts.
#
# Escape hatch: LINAPSE_TEST_NO_CONTAINER=1 runs on the host (still desktop-safe
# via the conftest stub net in service/conftest.py).
#
# Args are passed straight to pytest, relative to service/ (e.g.
# `scripts/test.sh test_mode_notify.py -k change`).
set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

run_native() { cd "$REPO/service"; exec python3 -m pytest "$@"; }

# Already isolated (CI container, our own re-exec, or an explicit flag) → never nest.
if [ -f /.dockerenv ] || [ -n "${CI:-}" ] || [ -n "${GITHUB_ACTIONS:-}" ] \
   || [ -n "${LINAPSE_TEST_CONTAINER:-}" ] || [ -n "${LINAPSE_TEST_NO_CONTAINER:-}" ]; then
    run_native "$@"
fi

if ! command -v docker >/dev/null 2>&1; then
    echo "docker not found. Install it, or set LINAPSE_TEST_NO_CONTAINER=1 to run on the host" >&2
    echo "(still desktop-safe via the conftest stub net, but without full container isolation)." >&2
    exit 1
fi

IMAGE=linapse-test
echo "==> Building $IMAGE image (cached after first run)…" >&2
docker build -q -f "$REPO/Dockerfile.test" -t "$IMAGE" "$REPO" >/dev/null

echo "==> Running tests in container…" >&2
exec docker run --rm -t \
    -v "$REPO":/repo \
    -w /repo/service \
    -e LINAPSE_TEST_CONTAINER=1 \
    "$IMAGE" python3 -m pytest "$@"
