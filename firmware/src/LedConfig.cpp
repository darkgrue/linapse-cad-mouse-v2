#include "LedConfig.h"
#include "Config.h"
#include <EEPROM.h>

LedConfig ledConfig;

namespace {
constexpr uint32_t kMagic      = 0xCAD10002;  // bumped — layout changed
constexpr int      kSize       = Config::EEPROM_SIZE;
constexpr int      kAddrMagic  = 0;
constexpr int      kAddrBright = 4;
constexpr int      kAddrColor  = 5;
constexpr int      kAddrEffect = 9;
}

void LedConfig::load() {
  EEPROM.begin(kSize);
  uint32_t magic = 0;
  EEPROM.get(kAddrMagic, magic);
  if (magic != kMagic) { reset(); return; }
  EEPROM.get(kAddrBright, brightness);
  uint32_t color = 0;
  EEPROM.get(kAddrColor, color);
  idleColor = color;
  uint8_t fx = 0;
  EEPROM.get(kAddrEffect, fx);
  effect = (fx < (uint8_t)LedEffect::kCount) ? (LedEffect)fx : LedEffect::Breathing;
}

void LedConfig::save() {
  EEPROM.begin(kSize);
  uint32_t magic = kMagic;
  EEPROM.put(kAddrMagic, magic);
  EEPROM.put(kAddrBright, brightness);
  uint32_t color = idleColor;
  EEPROM.put(kAddrColor, color);
  uint8_t fx = (uint8_t)effect;
  EEPROM.put(kAddrEffect, fx);
  EEPROM.commit();
}

void LedConfig::reset() {
  brightness = Config::LED_BRIGHTNESS;
  idleColor  = Config::LED_IDLE_COLOR;
  effect     = LedEffect::Breathing;
}
