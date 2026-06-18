#pragma once

#include "State.h"

extern bool g_debugAxes;

class IdleState : public State {
 public:
  void enter() override;
  void update() override;
  void exit() override;

 private:
  bool handleCalibrationRequest();
  void runMotionPipeline(float dt, unsigned long now);
  void handleSleepTransition(unsigned long now);
  void handleTaps();

  float         lastMotionMag_  = 0.0f;
  unsigned long lastUpdateMs_   = 0;
  unsigned long lastActivityMs_ = 0;
};
