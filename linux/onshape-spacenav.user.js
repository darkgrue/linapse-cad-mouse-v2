// ==UserScript==
// @name         OnShape SpaceNav Connector
// @namespace    https://github.com/sb-ocr/cad-mouse-mk2
// @version      1.0
// @description  Makes OnShape connect to the local spacenav-ws bridge on Linux
// @author       CAD Mouse MK2 contributors
// @match        https://cad.onshape.com/*
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // OnShape's 3Dconnexion integration only activates on Windows.
    // Spoofing the platform makes it try to connect to the local
    // spacenav-ws WebSocket server at https://127.51.68.120:8181.
    Object.defineProperty(navigator, 'platform', {
        get: function () { return 'Win32'; },
        configurable: true,
    });
})();
