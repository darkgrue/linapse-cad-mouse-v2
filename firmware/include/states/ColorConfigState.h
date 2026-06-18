#pragma once

#include "State.h"
#include "LedConfig.h"
#include <Arduino.h>

class ColorConfigState : public State {
 public:
  void enter() override;
  void update() override;
  void exit() override;

 private:
  // Steps cycle: Effect → Hue → Brightness → (save)
  enum class Step { Effect, Hue, Brightness };

  Step step_;

  LedEffect workEffect_;
  uint8_t   workBrightness_;
  float     workHue_;         // 0.0–360.0

  LedEffect origEffect_;
  uint8_t   origBrightness_;
  uint32_t  origColor_;

  float         rotAccum_     = 0;
  unsigned long lastUpdateMs_ = 0;

  void advanceStep();
  void cancelAndExit();
  void previewCurrent();

  static uint32_t hueToRgb(float hue);
  static float    rgbToHue(uint32_t color);
};
