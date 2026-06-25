# Agent Rules for Linapse CAD Mouse

All AI agents working on this project MUST follow these guidelines without exception.

## Versioning System

The current version of this project is stored in the `VERSION` file at the repository root (using `MAJOR.MINOR.PATCH` Semantic Versioning).
You MUST only increment the version number and sync it when the user explicitly requests a push or a release. Do not update the version for minor intermediate changes during a session unless requested.

**One version number per release, until it actually publishes.** Bumping the version and pushing does NOT mean the version is released — it is released only when the deploy succeeds (tag/GitHub release published, PPA uploaded). If the deploy fails, you are still trying to ship that same number: diagnose, fix, and fold the fix into the SAME version's `CHANGELOG.md` section — do NOT increment. Incrementing to fix a not-yet-published release just buries a broken version in history and desyncs `VERSION`/`debian/changelog`/tags. Move to the next version only after the current one has published, or when the user starts genuinely new work. See **Release Procedure**.

When doing a release/push-time version increment:
1. **Read the current version** from the [VERSION](file:///home/spikeon/Dev/linapse-cad-mouse-v2/VERSION) file.
2. **Increment the version number** based on your changes:
   - **PATCH** (`x.y.Z`): Increment for backwards-compatible bug fixes, minor documentation updates, test additions, or internal refactoring.
   - **MINOR** (`x.Y.z`): Increment for backwards-compatible new features or functional additions.
   - **MAJOR** (`X.y.z`): Increment for breaking API changes, hardware protocol updates, or massive structural refactors.
3. **Write the new version** back to the [VERSION](file:///home/spikeon/Dev/linapse-cad-mouse-v2/VERSION) file.
4. **Run `python3 scripts/sync_version.py`** from the repo root. This single command propagates the version in `VERSION` to all embedded version strings across the codebase. Do NOT manually edit the following files — the script handles them:
   - `firmware/src/main.cpp` — `Serial.println("version=X.Y.Z")`
   - `service/linapse/state.py` — `service_version = "X.Y.Z"`
   - `installer.iss` — `AppVersion=X.Y.Z`
   - `configurator/package.json` — `"version": "X.Y.Z"`
   - `service/linapse-browser-connector.user.js` — `// @version X.Y.Z`
   - `CHANGELOG.md` is intentionally NOT touched by the script — update it manually with release notes.

## Changelog Updates

When performing a push/release version increment, you MUST update [CHANGELOG.md](file:///home/spikeon/Dev/linapse-cad-mouse-v2/CHANGELOG.md) to record the new version's release notes:
1. Create a section for the new version you are releasing/incrementing to.
2. List your changes clearly under the standard "Keep a Changelog" headings:
   - `Added` for new features.
   - `Changed` for changes in existing functionality.
   - `Deprecated` for soon-to-be-removed features.
   - `Removed` for now-removed features.
   - `Fixed` for any bug fixes.
   - `Security` in case of vulnerabilities addressed.
3. Ensure the date of the change is recorded next to the version header (e.g., `[2.0.1] - 2026-06-18`).

## Release Procedure

A release is NOT finished when you push — it is finished when the deploy succeeds and the announcement is out. Do NOT run this for intermediate/WIP commits; same trigger as the version bump. Run the steps in order:

1. **Bump the version** — see **Versioning System**.
2. **Update the changelog** — see **Changelog Updates**.
3. **Update the local install and smoke-test on real hardware — BEFORE pushing.** Deploy the new build to your own machine and confirm it runs on the actual device before shipping it to the world:
   ```bash
   command cp -f  service/linapse-service   ~/.local/bin/linapse-service
   command cp -rf service/linapse/.         ~/.local/bin/linapse/
   command cp -f  service/linapse-ws-proxy  ~/.local/bin/linapse-ws-proxy
   systemctl --user restart linapse-service
   ```
   Use `command cp` (or `\cp`) to bypass any `cp -i` alias — under a non-interactive shell it declines every overwrite and silently leaves the install stale. Bumping the service version makes the firmware mismatch, so the service auto-flashes the device (BOOTSEL reset → mount → flash → re-enumerate). Verify with `journalctl --user -u linapse-service` that it ends in `[serial] connected` and `Service is up to date`, that the reported `service_version` matches, and that it flashed once (no loop). If it fails on hardware, fix it before pushing — never ship a version that doesn't run locally. (Full reinstall incl. systemd/udev: `service/install.sh`.)
4. **Commit and push.**
5. **Monitor the deploy to completion.** Watch the CI/CD run for the pushed commit (e.g. `env -u GITHUB_TOKEN -u GH_TOKEN gh run watch`, or poll with `gh run view`) all the way through — including the `release` job that publishes the GitHub release/tag and the PPA upload. A green build/test job is NOT enough; the release must actually publish.
6. **On failure: fix and loop, under the SAME version number.** Diagnose the failure, apply the fix, and record it in `CHANGELOG.md` under the **same** version's section (a `Fixed` entry). Do NOT increment the version to fix a release that has not published yet (see **Versioning System**). Commit, push, and return to step 5. Repeat until the deploy succeeds.
7. **Announce only after the release has published.** Once — and only once — the deploy succeeds, post the Discord announcement (below). A failed or in-flight deploy is NOT a release; never announce one.

### Discord announcement

After a successful release (step 6 above), you MUST post an update to the **#linapse-cad-mouse-mk2** channel on Discord:
1. **Channel**: `#linapse-cad-mouse-mk2`.
2. **Mechanism**: use the connected Discord MCP (wired through the Chrome integration).
3. **Content**: the released version number, plus a short summary of the **non-sensitive** changelog highlights for that version.
4. **Sensitive-content filter** — NEVER include in the post: real USB `VID`/`PID` values, anything originating from the `local-build` branch, auth tokens/credentials, internal infrastructure paths, or unreleased/embargoed details. When in doubt, leave it out.
5. **Confirm before posting**: posting to Discord publishes outward. Show the drafted message and get explicit confirmation before sending — do not auto-post.

## Git Token Environment Variable

You MUST ignore the `git_token` (or any environment variables containing git/github auth tokens) when executing git commands. Do NOT try to read them, use them, or prompt the user for them. Assume git authentication is handled by the user/system credential helper.

If git commands (like `git push`) fail with authentication/token errors, it is likely because `GITHUB_TOKEN` or `GH_TOKEN` environment variables are present and invalid, overriding the valid credentials stored in the system's keyring. To bypass this, run git push with these invalid environment variables explicitly unset:
```bash
env -u GITHUB_TOKEN -u GH_TOKEN git push
```


## Documentation Requirement

Whenever a new feature is added to the codebase, you MUST:
1. **Write or update documentation** under the `docs/` folder explaining the new feature, its architecture, integration details, and usage.
2. **Update the main README.md** (and other relevant readmes, e.g. `service/README.md`) to call out the new capability and link to the detailed documentation.

## Firmware Build and Test (PlatformIO)

PlatformIO (`pio`) is installed but NOT on `$PATH`. Always invoke it with the full path:
```bash
~/.platformio/penv/bin/pio
```

To run native firmware unit tests (no hardware required):
```bash
~/.platformio/penv/bin/pio test -e native
```

To build for the device:
```bash
~/.platformio/penv/bin/pio run
```

## Running Python Tests (Local)

Run the Python test suite locally with [scripts/test.sh](file:///home/spikeon/Dev/linapse-cad-mouse-v2/scripts/test.sh), NOT a bare `pytest`. The suite drives real OS input on Linux (emulated mouse/keys via `ydotool`, mode toasts via `notify-send`, udev/`/etc` writes in installer tests); running it on the host moves your cursor and spams notifications. `scripts/test.sh` runs everything inside a throwaway container (`Dockerfile.test`) so it can't touch the host desktop. Args pass through to pytest, relative to `service/` (e.g. `scripts/test.sh test_mode_notify.py -k change`).

- It auto-detects when it is already inside a container (via `/.dockerenv`) or in CI and runs pytest directly — it must NEVER spawn a container inside CI (which already runs pytest in a container). Do not wire `scripts/test.sh` into the CI workflow; CI calls pytest directly.
- `LINAPSE_TEST_NO_CONTAINER=1` runs on the host. Even then, `service/conftest.py` has an autouse net that stubs `ydotool`/`notify-send`, but full isolation needs the container.

## CI Workflow Step Name Constraint

`service/test_installer_config.py::TestInstallerConfig::test_workflow_yaml_valid` asserts that specific step names exist in `.github/workflows/multi-distro-test.yml`. If you add, rename, or remove CI steps, you MUST update this test or it will fail. Read the test before touching the workflow file.

## Playwright Integration Testing

Do NOT recommend disabling Playwright tests or marking them as slow to skip by default. They are the most important tests for ensuring correct behavior across all distributions.

## CI/CD Failure Fixing Loop

When fixing CI/CD errors or failures:
1. **Commit and Push**: After implementing your proposed fix, stage and commit the changes, then push them to trigger the CI/CD pipeline.
2. **Wait and Verify**: Wait for the CI/CD run to complete and verify the results.
3. **Retry on Failure**: If the run fails, analyze the new failures, adjust your implementation, and repeat the commit-push-wait loop.
4. **Iterate to Success**: Continue this process until the CI/CD pipeline succeeds. If appropriate, recommend or utilize the `/goal` command to ensure thorough, multi-turn tracking.

When the failing pipeline is a **release** (the version was already bumped), follow **Release Procedure**: keep the same version number, append each fix to that version's `CHANGELOG.md` section, and do not announce on Discord until the deploy publishes.

## Lighting Mode Modification Requirement

When making any changes to the lighting modes (such as adding, removing, or modifying an effect or its behavior), you MUST update:
1. **LED Preview**: The corresponding LED Preview rendering logic inside the configurator's `index.html`.
2. **Lighting Page Render Simulation**: The render simulation/animation loop for that effect inside the configurator's `index.html`.
3. **LIGHTING.md Documentation**: The [LIGHTING.md](file:///home/spikeon/Dev/linapse-cad-mouse-v2/docs/LIGHTING.md) file describing the effect's behavior, parameters, and layout.
4. **LIGHTING.md GIF**: The corresponding visualizer preview GIF in the `docs/images/` directory (e.g., using the playwright-driven generator script) to match the changes.
