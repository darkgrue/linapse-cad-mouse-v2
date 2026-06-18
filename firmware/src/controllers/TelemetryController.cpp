#include "controllers/TelemetryController.h"
#include <Arduino.h>
#include "Config.h"

namespace {
const int kPrintEvery = 5;
}

void TelemetryController::begin() { tick_ = 0; }

bool TelemetryController::enabled() const { return Config::ENABLE_TELEMETRY; }

void TelemetryController::publish(const float motion[6], int buttonBits,
                                  bool hidReportSent) {
  if (!enabled()) {
    return;
  }

  tick_++;
  if ((tick_ % kPrintEvery) != 0) {
    return;
  }

  // Skip zero frames — puck at rest sends nothing
  bool active = false;
  for (int i = 0; i < 6; i++) { if (motion[i] != 0.0f) { active = true; break; } }
  if (!active) return;

  char buf[72];
  snprintf(buf, sizeof(buf), ">MOTION:%.1f,%.1f,%.1f,%.1f,%.1f,%.1f\n",
           motion[0], motion[1], motion[2], motion[3], motion[4], motion[5]);
  Serial.print(buf);
}
