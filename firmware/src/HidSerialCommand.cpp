#include "HidSerialCommand.h"

#include "controllers/HIDController.h"
#include <stdlib.h>

extern bool g_serviceHidMode;
extern bool g_serviceButtonMode;
extern unsigned long g_lastServicePacketMs;

bool handleHidSerialCommand(const String& line, HIDController& hid) {
  if (line.startsWith("service_hid ")) {
    int val = atoi(line.c_str() + 12);
    g_serviceHidMode = (val != 0);
    g_lastServicePacketMs = millis();
    Serial.println("OK");
    return true;
  }

  if (line.startsWith("service_buttons ")) {
    int val = atoi(line.c_str() + 16);
    g_serviceButtonMode = (val != 0);
    g_lastServicePacketMs = millis();
    if (g_serviceButtonMode) {
      // Clear any stuck native bit on entry; the service drives buttons now.
      hid.sendButtonsReport(0);
    }
    Serial.println("OK");
    return true;
  }

  if (line.startsWith("hid_button ")) {
    g_lastServicePacketMs = millis();
    const char* p = line.c_str() + 11;
    char* next;
    long bits = strtol(p, &next, 10);
    if (p == next) {
      Serial.println("ERR hid_button requires integer bits");
      return true;
    }
    hid.sendButtonsReport((uint16_t)(bits & 0x0003));
    Serial.println("OK");
    return true;
  }

  if (line.startsWith("hid_report ")) {
    g_lastServicePacketMs = millis();
    const char* p = line.c_str() + 11;
    float motion[6] = {0};
    int parsed = 0;
    for (int i = 0; i < 6; i++) {
      while (*p == ' ') p++;
      if (*p == '\0') break;
      char* nx;
      float v = strtof(p, &nx);
      if (p == nx) break;
      motion[i] = v;
      parsed++;
      p = nx;
      while (*p == ' ' || *p == ',') p++;
    }
    if (parsed == 6) {
      hid.sendAxesReport(motion);
      Serial.println("OK");
    } else {
      Serial.println("ERR hid_report requires 6 comma-separated floats");
    }
    return true;
  }

  return false;
}
