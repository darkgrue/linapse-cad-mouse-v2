import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the configurator/index.html file
const htmlPath = path.join(__dirname, '..', 'configurator', 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// Extract the main <script> tag containing our JS logic
const scriptRegex = /<script>([\s\S]*?)<\/script>/g;
let match;
let scriptContent = '';
while ((match = scriptRegex.exec(html)) !== null) {
  scriptContent = match[1];
}

if (!scriptContent) {
  console.error("FAIL: Could not extract script content from index.html");
  process.exit(1);
}

console.log("Successfully extracted JavaScript code from index.html (" + scriptContent.length + " bytes).");

// Let's build a mock DOM environment to execute this script in.
const mockElements = new Map();

class MockClassList {
  constructor() {
    this.classes = new Set();
  }
  add(cls) { this.classes.add(cls); }
  remove(cls) { this.classes.delete(cls); }
  toggle(cls, force) {
    if (force !== undefined) {
      if (force) this.classes.add(cls);
      else this.classes.delete(cls);
    } else {
      if (this.classes.has(cls)) this.classes.delete(cls);
      else this.classes.add(cls);
    }
  }
  contains(cls) { return this.classes.has(cls); }
}

class MockElement {
  constructor(id, tag = 'div') {
    this.id = id;
    this.tagName = tag.toUpperCase();
    this.classList = new MockClassList();
    this.style = {};
    this.dataset = {};
    this.children = [];
    this._innerHTML = '';
    this._textContent = '';
    this._value = '';
    this.attributes = new Map();
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];

    // Simple mock HTML parser to extract created tags and register them
    const tagRegex = /<([a-z0-9\-]+)([^>]*?)>/gi;
    let match;
    let lastSelect = null;
    while ((match = tagRegex.exec(val)) !== null) {
      const tagName = match[1].toLowerCase();
      if (tagName.startsWith('/') || tagName === 'br' || tagName === 'hr') continue;
      
      const attrsStr = match[2];
      const idMatch = /id=["']([^"']+)["']/i.exec(attrsStr);
      const classMatch = /class=["']([^"']+)["']/i.exec(attrsStr);
      const valueMatch = /value=["']([^"']+)["']/i.exec(attrsStr);
      
      const id = idMatch ? idMatch[1] : '';
      const el = new MockElement(id, tagName);
      if (classMatch) {
        el.setAttribute('class', classMatch[1]);
      }
      if (valueMatch) {
        el.value = valueMatch[1];
      }
      
      if (tagName === 'option' && lastSelect) {
        lastSelect.appendChild(el);
      } else {
        this.appendChild(el);
      }
      
      if (tagName === 'select') {
        lastSelect = el;
      }
      if (id) {
        mockElements.set(id, el);
      }
    }
  }

  get textContent() { return this._textContent; }
  set textContent(val) { this._textContent = val; }

  get value() { return this._value; }
  set value(val) { this._value = val; }

  appendChild(child) {
    this.children.push(child);
    child.parentNode = this;
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
    if (name === 'class') {
      this.classList.classes = new Set(value.split(' '));
    }
  }

  getAttribute(name) {
    return this.attributes.get(name) || '';
  }

  closest(selector) {
    if (this.parentNode) return this.parentNode;
    return this;
  }

  querySelectorAll(selector) {
    const results = [];
    const traverse = (el) => {
      for (const child of el.children) {
        if (selector.startsWith('.') && child.classList.contains(selector.slice(1))) {
          results.push(child);
        } else if (selector.startsWith('#') && child.id === selector.slice(1)) {
          results.push(child);
        } else if (child.tagName.toLowerCase() === selector.toLowerCase()) {
          results.push(child);
        }
        traverse(child);
      }
    };
    traverse(this);

    if (results.length === 0 && (selector === '.effect-chip' || selector === '.action-chip' || selector === '.led-source')) {
      if (selector === '.led-source') {
        return Array.from({ length: 8 }, () => new MockElement('', 'div'));
      }
      const chip1 = new MockElement('', 'div');
      chip1.setAttribute('onclick', "selectEffect('solid', this)");
      chip1.setAttribute('class', 'effect-chip');
      results.push(chip1);
    }
    return results;
  }

  querySelector(selector) {
    const list = this.querySelectorAll(selector);
    return list.length > 0 ? list[0] : null;
  }

  addEventListener(event, callback) {
    this[`on${event}`] = callback;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) this.parentNode.children.splice(idx, 1);
    }
  }
}

const documentMock = {
  getElementById(id) {
    if (!mockElements.has(id)) {
      const el = new MockElement(id);
      if (id === 'canvasArea' || id === 'benchyViewport') {
        el.clientWidth = 800;
        el.clientHeight = 600;
      }
      if (id === 'ledBrightness') el.value = '128';
      if (id === 'ledColor') el.value = '#FF2400';
      if (id === 'modeSelect') {
        el.tagName = 'SELECT';
      }
      mockElements.set(id, el);
    }
    return mockElements.get(id);
  },

  createElement(tag) {
    return new MockElement('', tag);
  },

  createElementNS(ns, tag) {
    return new MockElement('', tag);
  },

  querySelectorAll(selector) {
    const results = [];
    if (selector === '.tab' || selector === '.tab-content' || selector === '.effect-chip' || selector === '.action-chip') {
      const el = new MockElement('');
      el.setAttribute('class', selector.slice(1));
      el.setAttribute('onclick', "selectEffect('breathing', this)");
      results.push(el);
    }
    return results;
  },

  body: new MockElement('body')
};

let promptQueue = [];
let confirmQueue = [];
let alertHistory = [];
let sentCommands = [];

const windowMock = {
  location: { hostname: 'localhost' },
  devicePixelRatio: 1,
  addEventListener(event, callback) {
    this[`on${event}`] = callback;
  },
  showOpenFilePicker: async () => {
    return [{
      getFile: async () => ({
        text: async () => JSON.stringify({
          button_override: true,
          current_mode: "BlenderMode",
          modes: {
            "BlenderMode": {
              buttons: { "0": { action: "key", value: "ctrl+z" } },
              taps: { "top:1": { action: "none" } },
              led: { effect: "solid", color: "00FF00", brightness: 255 }
            }
          }
        }),
        name: 'test_profile.json'
      })
    }];
  },
  showSaveFilePicker: async () => {
    return {
      name: 'saved_profile.json',
      createWritable: async () => {
        let content = '';
        return {
          write: async (data) => { content = data; },
          close: async () => { windowMock.lastSavedContent = content; }
        };
      }
    };
  }
};

class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = 1; // OPEN
    setTimeout(() => {
      if (this.onopen) this.onopen();
    }, 0);
  }
  send(cmd) {
    sentCommands.push(cmd);
  }
  close() {}
}

const THREEMock = {
  WebGLRenderer: class {
    setSize() {}
    setPixelRatio() {}
    setClearColor() {}
    render() {}
  },
  Scene: class {
    add() {}
  },
  PerspectiveCamera: class {
    position = { set() {} };
    lookAt() {}
    updateProjectionMatrix() {}
  },
  PMREMGenerator: class {
    fromScene() { return { texture: {} }; }
  },
  RoomEnvironment: class {},
  DirectionalLight: class {
    position = { set() {} };
  },
  MeshStandardMaterial: class {},
  Group: class {
    rotation = { set() {}, order: '' };
    position = { sub() {} };
    scale = { setScalar() {} };
    add() {}
    updateMatrixWorld() {}
  },
  Box3: class {
    setFromObject() { return this; }
    getSize(vec) { vec.x = vec.y = vec.z = 1; return vec; }
    getCenter(vec) { vec.x = vec.y = vec.z = 0; return vec; }
  },
  Vector3: class {
    constructor() { this.x = 0; this.y = 0; this.z = 0; }
    sub() {}
  },
  BufferGeometry: class {
    setAttribute() {}
    computeVertexNormals() {}
    setIndex() {}
  },
  Float32BufferAttribute: class {},
  Uint32BufferAttribute: class {},
  LineMaterial: class {
    resolution = { set() {} };
  },
  LineSegmentsGeometry: class {
    setPositions() {}
  },
  LineSegments2: class {
    constructor() {}
  }
};

const sandbox = {
  document: documentMock,
  window: windowMock,
  navigator: {},
  WebSocket: MockWebSocket,
  THREE: THREEMock,
  occtimportjs: async () => ({
    ReadStepFile: () => ({ success: true, meshes: [] })
  }),
  fetch: async () => ({
    arrayBuffer: async () => new ArrayBuffer(0)
  }),
  alert(msg) { alertHistory.push(msg); },
  prompt(msg, def) {
    if (promptQueue.length > 0) {
      return promptQueue.shift();
    }
    return null;
  },
  confirm(msg) {
    if (confirmQueue.length > 0) {
      return confirmQueue.shift();
    }
    return true;
  },
  setTimeout(callback, delay) {
    return setTimeout(callback, 0);
  },
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame(callback) {
    return setTimeout(() => callback(Date.now()), 0);
  },
  cancelAnimationFrame(id) {
    clearTimeout(id);
  },
  console: {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info
  },
  Math,
  JSON,
  parseInt,
  parseFloat,
  isNaN,
  Array,
  Object,
  String,
  Number,
  Boolean,
  Date,
  RegExp,
  Int32Array,
  Uint8Array,
  Map,
  Set
};

// Wrap the script content inside an IIFE to expose lexical scope variables
const wrappedScript = `
(function(window, document, WebSocket, THREE, occtimportjs, alert, prompt, confirm, setTimeout, clearTimeout, setInterval, clearInterval, requestAnimationFrame, cancelAnimationFrame) {
  ${scriptContent}
  return {
    getActions: () => actions,
    setActions: (val) => { actions = val; },
    getActiveMode,
    createModePrompt,
    renameModePrompt,
    deleteModePrompt,
    renderSubFields,
    collectAction,
    loadActionsFile,
    saveActionsFile,
    DEFAULT_ACTIONS
  };
})
`;

const context = vm.createContext(sandbox);
let exports;

try {
  const iifeFn = vm.runInContext(wrappedScript, context);
  exports = iifeFn(
    sandbox.window,
    sandbox.document,
    sandbox.WebSocket,
    sandbox.THREE,
    sandbox.occtimportjs,
    sandbox.alert,
    sandbox.prompt,
    sandbox.confirm,
    sandbox.setTimeout,
    sandbox.clearTimeout,
    sandbox.setInterval,
    sandbox.clearInterval,
    sandbox.requestAnimationFrame,
    sandbox.cancelAnimationFrame
  );
  console.log("PASS: Script parsed and initialized successfully without errors.");
} catch (err) {
  console.error("FAIL: Script threw error during initialization:", err);
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 1: Initial state & nested structure migration
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Verification Case 1: Initial State & nested structure ---");
let actions = exports.getActions();
if (!actions) {
  console.error("FAIL: actions object is undefined");
  process.exit(1);
}
console.log("Current Mode:", actions.current_mode);
console.log("Available Modes:", Object.keys(actions.modes));

// Check if nested modes have standard Default keys
const defaultMode = actions.modes["Default"];
if (!defaultMode) {
  console.error("FAIL: Default mode does not exist");
  process.exit(1);
}
if (!defaultMode.buttons || !defaultMode.taps || !defaultMode.led) {
  console.error("FAIL: Default mode missing sub-structures buttons/taps/led");
  process.exit(1);
}
console.log("PASS: Default mode has buttons, taps, and led configs.");

// Test standard legacy migration
exports.setActions({
  button_override: false,
  current_mode: "Default",
  buttons: { "0": { action: "key", value: "LegacyButton" } },
  taps: { "top:1": { action: "LegacyTap" } },
  led: { effect: "LegacyLed" }
});
const migrated = exports.getActiveMode();
if (migrated.buttons["0"].value !== "LegacyButton" || migrated.taps["top:1"].action !== "LegacyTap" || migrated.led.effect !== "LegacyLed") {
  console.error("FAIL: legacy migration failed", migrated);
  process.exit(1);
}
actions = exports.getActions();
if (actions.buttons || actions.taps || actions.led) {
  console.error("FAIL: legacy keys were not deleted after migration", actions);
  process.exit(1);
}
console.log("PASS: Legacy profile structure migrated to nested structure successfully.");

// Reset actions to standard for subsequent tests
exports.setActions(JSON.parse(JSON.stringify(exports.DEFAULT_ACTIONS)));

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 2: Mode Creation
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Verification Case 2: Mode Creation ---");
promptQueue.push("CAD Mode");
exports.createModePrompt();

actions = exports.getActions();
if (actions.current_mode !== "CAD Mode") {
  console.error("FAIL: current mode did not switch to CAD Mode, was:", actions.current_mode);
  process.exit(1);
}
if (!actions.modes["CAD Mode"]) {
  console.error("FAIL: CAD Mode was not created in actions.modes");
  process.exit(1);
}
console.log("PASS: Mode creation works. Current mode: " + actions.current_mode);

// Try creating a mode that already exists
promptQueue.push("CAD Mode");
alertHistory = [];
exports.createModePrompt();
if (alertHistory.length === 0 || !alertHistory[0].includes("exists")) {
  console.error("FAIL: Expected warning alert when creating duplicate mode, got:", alertHistory);
  process.exit(1);
}
console.log("PASS: Duplicate mode creation blocked with alert.");

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 3: Mode Renaming
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Verification Case 3: Mode Renaming ---");
// Rename "CAD Mode" to "Blender Mode"
promptQueue.push("Blender Mode");
exports.renameModePrompt();

actions = exports.getActions();
if (actions.current_mode !== "Blender Mode") {
  console.error("FAIL: Mode not renamed to Blender Mode, current is:", actions.current_mode);
  process.exit(1);
}
if (actions.modes["CAD Mode"]) {
  console.error("FAIL: Old CAD Mode key was not removed from actions.modes");
  process.exit(1);
}
if (!actions.modes["Blender Mode"]) {
  console.error("FAIL: Blender Mode not found in actions.modes");
  process.exit(1);
}
console.log("PASS: Mode renaming works. Current mode: " + actions.current_mode);

// Rename Default mode (should fail)
actions.current_mode = "Default";
exports.setActions(actions);
alertHistory = [];
exports.renameModePrompt();
if (alertHistory.length === 0 || !alertHistory[0].includes("Cannot rename Default mode")) {
  console.error("FAIL: Expected warning when renaming Default mode, got:", alertHistory);
  process.exit(1);
}
console.log("PASS: Renaming 'Default' mode is blocked as expected.");

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 4: Mode Deletion
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Verification Case 4: Mode Deletion ---");
actions = exports.getActions();
actions.current_mode = "Blender Mode";
exports.setActions(actions);

confirmQueue.push(true); // Click ok on confirm dialog
exports.deleteModePrompt();

actions = exports.getActions();
if (actions.modes["Blender Mode"]) {
  console.error("FAIL: Blender Mode was not deleted");
  process.exit(1);
}
if (actions.current_mode !== "Default") {
  console.error("FAIL: Current mode did not fallback to Default, was:", actions.current_mode);
  process.exit(1);
}
console.log("PASS: Mode deletion works and falls back to 'Default'.");

// Delete Default mode (should fail)
alertHistory = [];
exports.deleteModePrompt();
if (alertHistory.length === 0 || !alertHistory[0].includes("Cannot delete Default mode")) {
  console.error("FAIL: Expected warning when deleting Default mode, got:", alertHistory);
  process.exit(1);
}
console.log("PASS: Deletion of 'Default' mode is blocked as expected.");

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 5: Mode Action Dropdown Logic
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Verification Case 5: Mode Action Dropdown Logic ---");
const subArea = new MockElement('subArea');
const sampleAct = { action: 'mode', value: 'Default' };
exports.renderSubFields('mode', sampleAct, subArea);

const selectEl = documentMock.getElementById('sf-mode');
if (!selectEl) {
  console.error("FAIL: Target Mode select element was not rendered");
  process.exit(1);
}
const options = selectEl.children;
if (options.length === 0) {
  console.error("FAIL: No options rendered inside Target Mode select");
  process.exit(1);
}
let hasDefault = false;
options.forEach(opt => {
  if (opt.value === 'Default') hasDefault = true;
});
if (!hasDefault) {
  console.error("FAIL: Default mode was not present in the target mode select dropdown option list");
  process.exit(1);
}
console.log("PASS: Target Mode select dropdown rendered with correct option list.");

// Verify collection of mode action
selectEl.value = 'Default';
const collected = exports.collectAction('mode', subArea);
if (collected.action !== 'mode' || collected.value !== 'Default') {
  console.error("FAIL: Mode action collection failed", collected);
  process.exit(1);
}
console.log("PASS: collectAction correctly gathers selected mode action value.");

// ─────────────────────────────────────────────────────────────────────────────
// Test Case 6: Profile Saving/Loading
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n--- Verification Case 6: Profile Saving/Loading ---");
// Load profile
exports.loadActionsFile().then(() => {
  actions = exports.getActions();
  if (actions.current_mode !== "BlenderMode" || !actions.modes["BlenderMode"]) {
    console.error("FAIL: Load profile failed to set current mode or restore BlenderMode", actions);
    process.exit(1);
  }
  console.log("PASS: Load profile works correctly with nested structure.");

  // Save profile
  exports.saveActionsFile().then(() => {
    const saved = JSON.parse(windowMock.lastSavedContent);
    if (saved.current_mode !== "BlenderMode" || !saved.modes["BlenderMode"] || saved.modes["BlenderMode"].buttons["0"].value !== "ctrl+z") {
      console.error("FAIL: Saved profile content is invalid or missing details", saved);
      process.exit(1);
    }
    console.log("PASS: Save profile successfully serialized nested structure.");
    console.log("\nALL TESTS PASSED SUCCESSFULLY!");
  }).catch(err => {
    console.error("FAIL during save profile", err);
    process.exit(1);
  });
}).catch(err => {
  console.error("FAIL during load profile", err);
  process.exit(1);
});
