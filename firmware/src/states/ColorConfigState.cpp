#include "states/ColorConfigState.h"

#include <Arduino.h>
#include <math.h>

#include "Config.h"
#include "Controllers.h"
#include "StateMachine.h"

namespace {
const float   kRotTickThreshold = 1200.0f;
const float   kHueStep          = 5.0f;
const uint8_t kBrightnessStep   = 8;
}

// ── Lifecycle ──────────────────────────────────────────────────────────────────

void ColorConfigState::enter() {
  step_           = Step::Effect;
  workEffect_     = ledConfig.effect;
  workBrightness_ = ledConfig.brightness;
  workHue_        = rgbToHue(ledConfig.idleColor);
  origEffect_     = ledConfig.effect;
  origBrightness_ = ledConfig.brightness;
  origColor_      = ledConfig.idleColor;
  rotAccum_       = 0;
  lastUpdateMs_   = 0;

  tapDetector.reset();
  previewCurrent();
}

void ColorConfigState::exit() {}

// ── Update ─────────────────────────────────────────────────────────────────────

void ColorConfigState::update() {
  inputController.update();

  // Feed sensor into tap detector
  float raw[9] = {};
  if (sensorController.readRaw(raw)) {
    tapDetector.update(raw, sensorController.baseline(), millis());
  }

  if (inputController.takeLeftClick()) { cancelAndExit(); return; }
  if (inputController.takeRightClick()) { advanceStep(); return; }

  if (step_ == Step::Effect) {
    // Any tap cycles to next effect
    if (tapDetector.hasTap()) {
      tapDetector.takeTap();
      uint8_t next = ((uint8_t)workEffect_ + 1) % (uint8_t)LedEffect::kCount;
      workEffect_ = (LedEffect)next;
    }
  } else {
    // Hue / Brightness: accumulate dial movement via RZ axis
    const unsigned long now = millis();
    const float dt = (lastUpdateMs_ == 0) ? 0.0f : (now - lastUpdateMs_) / 1000.0f;
    lastUpdateMs_ = now;

    float axes[6] = {};
    MotionController::geometricDecomp(raw, sensorController.baseline(), axes);
    rotAccum_ += axes[5] * dt * 1000.0f;  // RZ axis

    if (step_ == Step::Hue) {
      while (rotAccum_ >  kRotTickThreshold) { workHue_ = fmodf(workHue_ + kHueStep + 360.0f, 360.0f); rotAccum_ -= kRotTickThreshold; }
      while (rotAccum_ < -kRotTickThreshold) { workHue_ = fmodf(workHue_ - kHueStep + 360.0f, 360.0f); rotAccum_ += kRotTickThreshold; }
    } else {
      while (rotAccum_ >  kRotTickThreshold) { workBrightness_ = (workBrightness_ + kBrightnessStep > 255) ? 255 : workBrightness_ + kBrightnessStep; rotAccum_ -= kRotTickThreshold; }
      while (rotAccum_ < -kRotTickThreshold) { workBrightness_ = (workBrightness_ < kBrightnessStep) ? 0 : workBrightness_ - kBrightnessStep; rotAccum_ += kRotTickThreshold; }
    }
  }

  previewCurrent();
}

// ── Helpers ────────────────────────────────────────────────────────────────────

void ColorConfigState::advanceStep() {
  if      (step_ == Step::Effect)     { step_ = Step::Hue; }
  else if (step_ == Step::Hue)        { step_ = Step::Brightness; }
  else {
    ledConfig.effect     = workEffect_;
    ledConfig.idleColor  = hueToRgb(workHue_);
    ledConfig.brightness = workBrightness_;
    ledConfig.save();
    effectEngine.configure(ledConfig.effect, ledConfig.idleColor, ledConfig.brightness);
    stateMachine.changeState(&StateMachine::idleState);
  }
}

void ColorConfigState::cancelAndExit() {
  ledConfig.effect     = origEffect_;
  ledConfig.idleColor  = origColor_;
  ledConfig.brightness = origBrightness_;
  effectEngine.configure(ledConfig.effect, ledConfig.idleColor, ledConfig.brightness);
  stateMachine.changeState(&StateMachine::idleState);
}

void ColorConfigState::previewCurrent() {
  effectEngine.configure(workEffect_, hueToRgb(workHue_), workBrightness_);
  effectEngine.update(millis(), 0.0f);
}

// ── Color math ─────────────────────────────────────────────────────────────────

uint32_t ColorConfigState::hueToRgb(float hue) {
  hue = fmodf(hue, 360.0f);
  if (hue < 0.0f) hue += 360.0f;
  float c = 1.0f;
  float x = 1.0f - fabsf(fmodf(hue / 60.0f, 2.0f) - 1.0f);
  float r = 0, g = 0, b = 0;
  if      (hue < 60)  { r=c; g=x; b=0; }
  else if (hue < 120) { r=x; g=c; b=0; }
  else if (hue < 180) { r=0; g=c; b=x; }
  else if (hue < 240) { r=0; g=x; b=c; }
  else if (hue < 300) { r=x; g=0; b=c; }
  else                { r=c; g=0; b=x; }
  return ((uint32_t)(r*255) << 16) | ((uint32_t)(g*255) << 8) | (uint32_t)(b*255);
}

float ColorConfigState::rgbToHue(uint32_t color) {
  float r = ((color >> 16) & 0xFF) / 255.0f;
  float g = ((color >>  8) & 0xFF) / 255.0f;
  float b =  (color        & 0xFF) / 255.0f;
  float mx = fmaxf(fmaxf(r, g), b);
  float mn = fminf(fminf(r, g), b);
  float d  = mx - mn;
  if (d < 0.001f) return 0.0f;
  float hue = 0.0f;
  if      (mx == r) hue = 60.0f * fmodf((g - b) / d, 6.0f);
  else if (mx == g) hue = 60.0f * ((b - r) / d + 2.0f);
  else              hue = 60.0f * ((r - g) / d + 4.0f);
  if (hue < 0.0f) hue += 360.0f;
  return hue;
}
