#include "states/CalibratingState.h"

#include <Arduino.h>

#include "Config.h"
#include "Controllers.h"
#include "StateMachine.h"

void CalibratingState::enter() {
  sensorController.beginCalibration();
  motionController.reset();
  ledController.startSpinner(Config::LED_CALIBRATING_COLOR);
}

void CalibratingState::update() {
  inputController.update();
  ledController.updateSpinner();
  sensorController.updateCalibration();

  if (sensorController.calibrationDone()) {
    if (inputController.takeColorConfigRequest()) {
      stateMachine.changeState(&StateMachine::colorConfigState);
    } else if (!inputController.areBothHeld()) {
      stateMachine.changeState(&StateMachine::idleState);
    }
    // Both buttons still held — stay in calibrating until color config fires or released
  }
}

void CalibratingState::exit() {}
