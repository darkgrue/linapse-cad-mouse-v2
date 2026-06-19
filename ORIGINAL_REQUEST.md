# Original User Request

## Initial Request — 2026-06-19T03:39:04-04:00

Update firmware documentation for Linapse CAD Mouse MK2 and implement a comprehensive suite of PlatformIO unit tests for all firmware components (MotionController, TapDetector, EffectEngine, StateMachine, config management).

Working directory: /home/spikeon/Dev/linapse-cad-mouse-v2
Integrity mode: development

## Requirements

### R1. Firmware Documentation Update
Update and restructure `firmware/README.md` (and related documentation like `firmware/LED_COLOR_CONFIG.md` if needed) to ensure complete accuracy. Add a clear, structured list of all changes made by Linapse compared to the upstream base firmware (such as volume visualizer effect, serial command extensions, Kalman filtering, configuration persistence layout, and multi-click/tap integrations). Use proper headings and structure.

### R2. Comprehensive PlatformIO Unit Tests
Implement a full suite of PlatformIO unit tests under `firmware/test/` to exercise all major features of the firmware. The tests should cover:
- **MotionController**: Geometric decomposition formulas, Kalman filter steps, dead-zone thresholding, and sensitivity power curve calculations.
- **TapDetector**: Tap spike detection, direction classification, double-tap window accumulation, cooldowns, and spring return thresholds.
- **EffectEngine**: Color scaling, HSV-to-RGB conversion, and all LED effect patterns (Solid, Breathing, Reactive, Dot Swirl, Gradient Swirl, Rainbow Swirl, and the new Volume effect).
- **StateMachine**: State transitions (Calibrating, Idle, ColorConfig, Sleep).
- **Config Management**: EEPROM load/save serialization, default reset values, and layout boundaries for both `LedConfig` and `SensConfig`.

### R3. Host-based (Native) & Target compilation support
Ensure that unit tests can compile and run locally on the host machine using a `native` platform environment in `platformio.ini` (by mocking necessary Arduino APIs like `millis()`, `Arduino.h`, `EEPROM.h`, `Adafruit_NeoPixel`, etc.) to run on CI/CD pipelines, as well as compile for the physical `seeed_xiao_rp2040` target.

## Acceptance Criteria

### Documentation
- [ ] `firmware/README.md` contains accurate, structured information matching the current implementation.
- [ ] A dedicated section listing all "Linapse Fork Changes" is added to the documentation.
- [ ] Outdated references (e.g., old color configuration details, missing serial commands) are corrected or updated.

### Testing
- [ ] Running `/home/spikeon/.platformio/penv/bin/pio test -e native` compiles and successfully executes all tests.
- [ ] Test coverage covers at least `MotionController`, `TapDetector`, `EffectEngine`, `StateMachine`, and config load/save logic.
- [ ] All written tests pass cleanly without memory leaks or crashes on the host machine.
- [ ] A `native` environment block is configured in `platformio.ini` with correct source filters and libraries mocked.
