#!/usr/bin/env node
/**
 * Generate Chrome Web Store listing screenshots for Linapse Browser Connector.
 *
 * Output:
 *   extension/store-assets/chrome-screenshot-1280x800.png
 *   extension/store-assets/chrome-screenshot-640x400.png
 *   extension/store-assets/chrome-promo-tile-440x280.png
 */
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EXT_DIR = resolve(__dirname, '..');
const ROOT = resolve(EXT_DIR, '..');
const OUT_DIR = join(EXT_DIR, 'store-assets');
const LOGO = join(ROOT, 'configurator', 'linapse-square-logo.png');
const DEVICE = join(ROOT, 'configurator', 'device-render.png');

const BRAND = {
  accent: '#FF2400',
  bg: '#0d0d0d',
  bg2: '#141414',
  border: '#2a2a2a',
  text: '#e8e8e8',
  textMuted: '#888888',
  textDim: '#555555',
};

function escapeXml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function backgroundSvg(width, height, { framed = true } = {}) {
  const inset = framed ? 48 : 0;
  const rx = framed ? 24 : 0;
  const frame = framed
    ? `<rect x="${inset}" y="${inset}" width="${width - inset * 2}" height="${height - inset * 2}" rx="${rx}" fill="none" stroke="${BRAND.border}" stroke-width="2"/>`
    : '';
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="glow" cx="${framed ? '50%' : '22%'}" cy="${framed ? '18%' : '40%'}" r="${framed ? '55%' : '70%'}">
      <stop offset="0%" stop-color="${BRAND.accent}" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="${BRAND.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#111111"/>
      <stop offset="100%" stop-color="${BRAND.bg}"/>
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#glow)"/>
  ${frame}
</svg>`);
}

function promoTileOverlaySvg(width, height) {
  const brand = escapeXml('LINAPSE');
  const product = escapeXml('Browser Connector');
  const sites = escapeXml('OnShape  ·  SketchUp Web');

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .brand { fill: ${BRAND.accent}; font: 700 34px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; letter-spacing: 4px; }
    .product { fill: ${BRAND.text}; font: 600 18px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; letter-spacing: 1px; }
    .sites { fill: ${BRAND.textMuted}; font: 500 13px 'Segoe UI', sans-serif; letter-spacing: 0.5px; }
    .tag { fill: ${BRAND.textDim}; font: 400 11px 'Segoe UI', sans-serif; }
  </style>
  <text x="108" y="108" class="brand">${brand}</text>
  <text x="108" y="132" class="product">${product}</text>
  <text x="108" y="162" class="sites">${sites}</text>
  <text x="108" y="248" class="tag">6DoF CAD mouse in browser-based CAD</text>
</svg>`);
}

async function buildPromoTile(width, height, outputName) {
  const logoSize = 72;
  const logo = await sharp(LOGO).resize(logoSize, logoSize).png().toBuffer();
  const device = await sharp(DEVICE)
    .resize(170, null)
    .modulate({ brightness: 0.9 })
    .png()
    .toBuffer();
  const deviceMeta = await sharp(device).metadata();

  await sharp(backgroundSvg(width, height, { framed: false }))
    .composite([
      { input: logo, top: 96, left: 24 },
      {
        input: device,
        top: height - deviceMeta.height + 10,
        left: width - deviceMeta.width + 18,
        blend: 'over',
      },
      { input: promoTileOverlaySvg(width, height), top: 0, left: 0 },
    ])
    .png()
    .toFile(join(OUT_DIR, outputName));

  console.log(`wrote ${join(OUT_DIR, outputName)} (${width}x${height})`);
}

function overlaySvg(width, height, scale = 1) {
  const s = (value) => Math.round(value * scale);
  const title = escapeXml('Linapse Browser Connector');
  const subtitle = escapeXml('6DoF CAD mouse navigation in browser-based CAD');
  const onshape = escapeXml('cad.onshape.com');
  const sketchup = escapeXml('SketchUp Web');

  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title { fill: ${BRAND.accent}; font: 700 ${s(54)}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; letter-spacing: ${s(6)}px; }
    .subtitle { fill: ${BRAND.text}; font: 400 ${s(28)}px 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
    .chip-label { fill: ${BRAND.textMuted}; font: 600 ${s(14)}px 'Segoe UI', sans-serif; letter-spacing: ${s(2)}px; text-transform: uppercase; }
    .chip-text { fill: ${BRAND.text}; font: 500 ${s(22)}px 'Segoe UI', sans-serif; }
    .footer { fill: ${BRAND.textDim}; font: 400 ${s(16)}px 'Segoe UI', sans-serif; }
  </style>

  <text x="50%" y="${s(390)}" text-anchor="middle" class="title">${title}</text>
  <text x="50%" y="${s(440)}" text-anchor="middle" class="subtitle">${subtitle}</text>

  <text x="50%" y="${s(510)}" text-anchor="middle" class="chip-label">Works with</text>

  <g transform="translate(${width / 2 - s(280)}, ${s(530)})">
    <rect x="0" y="0" width="${s(260)}" height="${s(72)}" rx="${s(12)}" fill="${BRAND.bg2}" stroke="${BRAND.border}" stroke-width="2"/>
    <circle cx="${s(36)}" cy="${s(36)}" r="${s(10)}" fill="${BRAND.accent}"/>
    <text x="${s(62)}" y="${s(44)}" class="chip-text">${onshape}</text>
  </g>

  <g transform="translate(${width / 2 + s(20)}, ${s(530)})">
    <rect x="0" y="0" width="${s(260)}" height="${s(72)}" rx="${s(12)}" fill="${BRAND.bg2}" stroke="${BRAND.border}" stroke-width="2"/>
    <circle cx="${s(36)}" cy="${s(36)}" r="${s(10)}" fill="${BRAND.accent}"/>
    <text x="${s(62)}" y="${s(44)}" class="chip-text">${sketchup}</text>
  </g>

  <text x="50%" y="${height - s(56)}" text-anchor="middle" class="footer">Connects browser CAD apps to the local Linapse spacenav bridge</text>
</svg>`);
}

async function buildScreenshot(width, height, outputName) {
  const scale = width / 1280;
  const logoSize = Math.round(220 * scale);

  const logo = await sharp(LOGO).resize(logoSize, logoSize).png().toBuffer();
  const deviceWidth = Math.round(420 * scale);
  const device = await sharp(DEVICE)
    .resize(deviceWidth, null)
    .modulate({ brightness: 0.95 })
    .png()
    .toBuffer();
  const deviceMeta = await sharp(device).metadata();

  const composites = [
    {
      input: logo,
      top: Math.round(72 * scale),
      left: Math.round((width - logoSize) / 2),
    },
    {
      input: device,
      top: Math.round(height - deviceMeta.height - 36 * scale),
      left: Math.round(width - deviceMeta.width - 48 * scale),
      blend: 'over',
    },
    {
      input: overlaySvg(width, height, scale),
      top: 0,
      left: 0,
    },
  ];

  await sharp(backgroundSvg(width, height, { framed: true }))
    .composite(composites)
    .png()
    .toFile(join(OUT_DIR, outputName));

  console.log(`wrote ${join(OUT_DIR, outputName)} (${width}x${height})`);
}

mkdirSync(OUT_DIR, { recursive: true });
await buildScreenshot(1280, 800, 'chrome-screenshot-1280x800.png');
await buildScreenshot(640, 400, 'chrome-screenshot-640x400.png');
await buildPromoTile(440, 280, 'chrome-promo-tile-440x280.png');
console.log('Store assets ready for Chrome Web Store upload.');
