const { _electron } = require('/usr/lib/node_modules/playwright');
const path = require('path');

(async () => {
  console.log('Launching Electron...');
  const electronApp = await _electron.launch({
    executablePath: '/home/spikeon/Dev/linapse-cad-mouse-v2/configurator/node_modules/electron/dist/electron',
    cwd: '/home/spikeon/Dev/linapse-cad-mouse-v2/configurator',
    args: ['.']
  });

  const window = await electronApp.firstWindow();
  await window.waitForTimeout(1000);

  console.log('Clicking Firmware tab...');
  await window.click('div.tab:has-text("Firmware")');
  await window.waitForTimeout(500);

  const parentDetails = await window.evaluate(() => {
    const el = document.getElementById('tab-firmware');
    const parent = el.parentElement;
    
    const getDetails = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        tagName: element.tagName,
        id: element.id,
        className: element.className,
        rect: { width: rect.width, height: rect.height, top: rect.top, left: rect.left },
        display: style.display,
        position: style.position
      };
    };

    return {
      firmware: getDetails(el),
      parent: parent ? getDetails(parent) : null,
      siblings: Array.from(parent ? parent.children : []).map(s => ({
        id: s.id,
        className: s.className,
        display: window.getComputedStyle(s).display,
        rect: s.getBoundingClientRect()
      }))
    };
  });

  console.log('Parent and siblings details:', JSON.stringify(parentDetails, null, 2));

  await electronApp.close();
  process.exit(0);
})();
