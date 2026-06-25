#pragma once
#include <math.h>

// Per-axis frame-delta clamp. A fast spike (|delta| > threshold) — e.g. a tap
// impulse — is pulled back toward the previous value by `strength` (0 = off,
// 1 = full clamp); sustained motion (delta <= threshold) passes unchanged.
// prev[] is updated to the post-clamp output so it tracks frame-to-frame.
inline void despikeAxes(float motion[6], float prev[6], float threshold, float strength) {
  for (int i = 0; i < 6; i++) {
    float d  = motion[i] - prev[i];
    float ad = fabsf(d);
    if (ad > threshold) {
      float allowed = threshold + (ad - threshold) * (1.0f - strength);
      motion[i] = prev[i] + (d > 0.0f ? allowed : -allowed);
    }
    prev[i] = motion[i];
  }
}
