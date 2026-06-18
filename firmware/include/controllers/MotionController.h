#pragma once

class MotionController {
 public:
  void reset();
  void compute(const float raw[9], const float* baseline, float dt, float out[6]);
  bool hasMotionActivity() const;

  // Raw geometric decomposition without Kalman/dead-zones/scaling. Used by TapDetector.
  static void geometricDecomp(const float raw[9], const float* baseline, float out[6]);

 private:
  static float clampf(float v, float lo, float hi);
  static float axisBaseDead(int i);
  static float sensitivityCurve(float value, float dead, float limit);

  // Per-axis Kalman filter state
  float kalmanX_[6] = {};  // Estimated state
  float kalmanP_[6] = {};  // Estimate uncertainty (covariance)
  float kalmanStep(int axis, float measurement);

  bool motionActive_ = false;
};
