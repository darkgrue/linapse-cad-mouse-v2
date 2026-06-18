#pragma once

#include <Arduino.h>
#include <AceButton.h>

class InputController {
 public:
  InputController();
  void begin();
  void update();

  uint16_t buttonBits() const;
  bool areBothHeld() const;
  bool takeCalibrationRequest();
  bool takeColorConfigRequest();
  bool takeLeftClick();
  bool takeRightClick();
  bool takeActivity();

 private:
  static void handleButtonEvent(ace_button::AceButton* button, uint8_t eventType,
                                uint8_t buttonState);
  void onButtonEvent(ace_button::AceButton* button, uint8_t eventType);
  bool areBothPressed() const;

  ace_button::AceButton leftBtn_;
  ace_button::AceButton rightBtn_;

  bool calibrationRequested_ = false;
  bool colorConfigRequested_ = false;
  bool hadActivity_ = false;
  unsigned long bothHeldStartMs_ = 0;
  bool calibrationHoldFired_ = false;
  bool colorConfigHoldFired_ = false;
  bool leftPressed_ = false;
  bool rightPressed_ = false;
  bool leftClicked_ = false;
  bool rightClicked_ = false;

  static InputController* instance_;
};
