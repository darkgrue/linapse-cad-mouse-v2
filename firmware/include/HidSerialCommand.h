#pragma once

#include <Arduino.h>

// Forward declaration — callers include Controllers.h or the appropriate mock
// themselves, so we avoid pulling in the platform-specific HIDController header
// here (it drags in Adafruit_TinyUSB.h, which breaks the native test build).
class HIDController;

// Parses the HID/service command family:
//   service_hid <0|1>
//   service_buttons <0|1>
//   hid_button <bits>
//   hid_report <f0,f1,f2,f3,f4,f5>
//
// Mutates g_serviceHidMode / g_serviceButtonMode / g_lastServicePacketMs and
// drives `hid` as required, printing an OK/ERR response over Serial. Returns
// true if the line belonged to this family (handled), false otherwise.
bool handleHidSerialCommand(const String& line, HIDController& hid);
