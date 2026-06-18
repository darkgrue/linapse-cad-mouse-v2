#pragma once

#include "State.h"
#include "states/CalibratingState.h"
#include "states/ColorConfigState.h"
#include "states/IdleState.h"
#include "states/SleepState.h"

class StateMachine {
 public:
  StateMachine();
  void changeState(State *newState);
  void update();

  static IdleState idleState;
  static SleepState sleepState;
  static CalibratingState calibratingState;
  static ColorConfigState colorConfigState;

 private:
  State *currentState = nullptr;
};

extern StateMachine stateMachine;
