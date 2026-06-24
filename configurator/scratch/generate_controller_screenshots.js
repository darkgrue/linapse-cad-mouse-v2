// Capture Controller-mode motion preview screenshots (3D + 2D) for the docs.
const { chromium } = require('/usr/lib/node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--allow-file-access-from-files', '--use-gl=swiftshader', '--ignore-gpu-blocklist'],
    headless: true,
  });
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Stub WebSocket so no real connection is attempted.
  await page.addInitScript(() => {
    window.WebSocket = class { constructor(u){ this.url=u; this.readyState=1; } send(){} close(){} };
  });

  const htmlPath = 'file://' + path.resolve(__dirname, '../index.html');
  await page.goto(htmlPath);
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  await page.evaluate(() => { try { firmwareVersion = '2.22.0'; setConnected(true); } catch (e) {} });
  await page.setViewportSize({ width: 1280, height: 800 });

  // Enter Controller mode + Motion tab.
  await page.evaluate(() => {
    actions.current_mode = 'Controller';
    updateModeSelectDropdown();
    syncActionsUI();
    switchTab('sensitivity', document.querySelectorAll('.tab')[2]);
  });
  await wait(500);

  const imagesDir = path.resolve(__dirname, '../../docs/images');

  // ── 3D view ────────────────────────────────────────────────────────────────
  await page.evaluate(() => switchControllerTab('3d'));
  await wait(1800); // three.js + bloom load + first frames
  await page.evaluate(() => {
    controllerStick.x = 0.12; controllerStick.y = -0.4;  // slight turn + look down toward the floor
    lastStickMs = performance.now() + 1e7;
    updateStickMonitor();
  });
  await wait(220);
  await page.evaluate(() => { try { controllerScene && controllerScene.spawnAttack('cone'); } catch (e) {} });
  await wait(120);
  await page.screenshot({ path: path.join(imagesDir, 'configurator-controller-3d.png') });
  console.log('captured configurator-controller-3d.png');

  // ── 2D view ────────────────────────────────────────────────────────────────
  await page.evaluate(() => {
    switchControllerTab('2d');
    controllerStick.x = 0.5; controllerStick.y = 0.55;
    lastStickMs = performance.now() + 1e7; // keep the stick deflected for the shot
    updateStickMonitor();
  });
  await wait(700);
  await page.evaluate(() => { try { controller2d && controller2d.spawnAttack('cone'); } catch (e) {} });
  await wait(120);
  await page.screenshot({ path: path.join(imagesDir, 'configurator-controller-2d.png') });
  console.log('captured configurator-controller-2d.png');

  await browser.close();
})();
