"use strict";

let _spaceKeyState = null;
let _shiftKeyState = null;
let _ctrlKeyState = null;
let _altKeyState = null;

export const setSpaceKeyState = (state) => _spaceKeyState = state;
export const setShiftKeyState = (state) => _shiftKeyState = state;
export const setCtrlKeyState = (state) => _ctrlKeyState = state;
export const setAltKeyState = (state) => _altKeyState = state;

export const getSpaceKeyState = () => _spaceKeyState;
export const getShiftKeyState = () => _shiftKeyState;
export const getCtrlKeyState = () => _ctrlKeyState;
export const getAltKeyState = () => _altKeyState;

/**
 * The list of keybindings that can be used to trigger commands.
 */
const keybindings = [
    // Menu Bar Items
    {
        keys: [ ["Alt", "F"] ],
        command: "file",
    },
    {
        keys: [ ["Alt", "E"] ],
        command: "edit",
    },
    {
        keys: [ ["Alt", "O"] ],
        command: "object",
    },
    {
        keys: [ ["Alt", "S"] ],
        command: "select",
    },
    {
        keys: [ ["Alt", "V"] ],
        command: "view",
    },
    {
        keys: [ ["Alt", "W"] ],
        command: "window",
    },
    {
        keys: [ ["Alt", "H"] ],
        command: "help",
    },

    // File Commands
    {
        keys: [ ["Ctrl", "N"] ],
        command: "file.new",
    },
    {
        keys: [ ["Ctrl", "O"] ],
        command: "file.open",
    },
    {
        keys: [],
        command: "file.open-recent",
    },
    {
        keys: [ ["Ctrl", "W"] ],
        command: "file.close",
    },
    {
        keys: [ ["Ctrl", "Alt", "W"] ],
        command: "file.close-all",
    },
    {
        keys: [ ["Ctrl", "S"] ],
        command: "file.save",
    },
    {
        keys: [ ["Shift", "Ctrl", "S"] ],
        command: "file.save-as",
    },
    {
        keys: [ ["Ctrl", "Alt", "S"] ],
        command: "file.save-a-copy",
    },
    {
        keys: [],
        command: "file.save-as-template",
    },
    {
        keys: [],
        command: "file.save-with-history",
    },
    {
        keys: [],
        command: "file.revert",
    },
    {
        keys: [],
        command: "file.version-history",
    },
    {
        keys: [],
        command: "file.import",
    },
    {
        keys: [],
        command: "file.place",
    },
    {
        keys: [ ["Shift", "Ctrl", "Alt", "S"] ],
        command: "file.export",
    },
    {
        keys: [],
        command: "file.document-setup",
    },
    {
        keys: [ ["Ctrl", "Q"] ],
        command: "file.exit",
    },

    // Edit Commands
    {
        keys: [ ["Ctrl", "Z"] ],
        command: "edit.undo",
    },
    {
        keys: [ ["Shift", "Ctrl", "Z"], ["Ctrl", "Y"] ],
        keys: [ ["Shift", "Ctrl", "Z"], ["Ctrl", "Y"] ],
        command: "edit.redo",
    },
    {
        keys: [],
        command: "edit.action-history",
    },
    {
        keys: [ ["Ctrl", "X"] ],
        command: "edit.cut",
    },
    {
        keys: [ ["Ctrl", "C"] ],
        command: "edit.copy",
    },
    {
        keys: [ ["Ctrl", "V"] ],
        command: "edit.paste",
    },
    {
        keys: [],
        command: "edit.paste-special",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-text-content",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-inner-html",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-outer-html",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-style",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-size",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-width",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-height",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-size-separately",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-width-separately",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-height-separately",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-before",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-after",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-first-child",
    },
    {
        keys: [],
        command: "edit.paste-special.paste-last-child",
    },
    {
        keys: [ ["Delete"] ],
        command: "edit.delete",
    },
    {
        keys: [ ["Ctrl", "D"] ],
        command: "edit.duplicate",
    },
    {
        keys: [],
        command: "edit.clone",
    },
    {
        keys: [],
        command: "edit.wrap",
    },
    {
        keys: [],
        command: "edit.unwrap",
    },
    {
        keys: [],
        command: "edit.insert",
    },
    {
        keys: [],
        command: "edit.convert-to",
    },
    {
        keys: [],
        command: "edit.move",
    },
    {
        keys: [ ["Shift", "Ctrl", "]"] ],
        command: "edit.move.move-to-top",
    },
    {
        keys: [ ["Ctrl", "]"] ],
        command: "edit.move.move-up",
    },
    {
        keys: [ ["Ctrl", "["] ],
        command: "edit.move.move-down",
    },
    {
        keys: [ ["Shift", "Ctrl", "["] ],
        command: "edit.move.move-to-bottom",
    },
    {
        keys: [],
        command: "edit.move.outdent-up",
    },
    {
        keys: [],
        command: "edit.move.outdent-down",
    },
    {
        keys: [],
        command: "edit.move.indent-up",
    },
    {
        keys: [],
        command: "edit.move.indent-down",
    },
    {
        keys: [ ["Ctrl", "F"] ],
        command: "edit.find-and-replace",
    },

    // Layer Commands
    {
        keys: [ ["Ctrl", "G"] ],
        command: "layer.group",
    },
    {
        keys: [ ["Shift", "Ctrl", "G"] ],
        command: "layer.ungroup",
    },
    {
        keys: [],
        command: "layer.ungroup-all",
    },
    {
        keys: [],
        command: "layer.arrange",
    },
    {
        keys: [],
        command: "layer.arrange.move-to-front",
    },
    {
        keys: [],
        command: "layer.arrange.move-forward-one",
    },
    {
        keys: [],
        command: "layer.arrange.move-backward-one",
    },
    {
        keys: [],
        command: "layer.arrange.move-to-back",
    },
    {
        keys: [],
        command: "layer.align",
    },
    {
        keys: [],
        command: "layer.align.align-left",
    },
    {
        keys: [],
        command: "layer.align.align-center",
    },
    {
        keys: [],
        command: "layer.align.align-right",
    },
    {
        keys: [],
        command: "layer.align.align-top",
    },
    {
        keys: [],
        command: "layer.align.align-middle",
    },
    {
        keys: [],
        command: "layer.align.align-bottom",
    },
    {
        keys: [],
        command: "layer.align.space-horizontally",
    },
    {
        keys: [],
        command: "layer.align.space-vertically",
    },
    {
        keys: [],
        command: "layer.align.distribute-horizontally",
    },
    {
        keys: [],
        command: "layer.align.distribute-vertically",
    },
    {
        keys: [],
        command: "layer.transform",
    },
    {
        keys: [],
        command: "layer.transform.rotate-left",
    },
    {
        keys: [],
        command: "layer.transform.rotate-right",
    },
    {
        keys: [],
        command: "layer.transform.flip-left",
    },
    {
        keys: [],
        command: "layer.transform.flip-right",
    },
    {
        keys: [ ["Ctrl", "L"] ],
        command: "layer.lock",
    },
    {
        keys: [ ["Shift", "Ctrl", "L"] ],
        command: "layer.unlock",
    },
    {
        keys: [],
        command: "layer.unlock-all",
    },
    {
        keys: [ ["Ctrl", "H"] ],
        command: "layer.hide",
    },
    {
        keys: [],
        command: "layer.hide-others",
    },
    {
        keys: [ ["Shift", "Ctrl", "H"] ],
        command: "layer.show",
    },
    {
        keys: [],
        command: "layer.show-all",
    },

    // Select Commands
    {
        keys: [ ["Ctrl", "A"] ],
        command: "select.all",
    },
    {
        keys: [ ["Ctrl", "Shift", "A"] ],
        command: "select.deselect",
    },
    {
        keys: [],
        command: "select.reselect",
    },
    {
        keys: [ ["Ctrl", "I"] ],
        command: "select.inverse",
    },
    {
        keys: [],
        command: "select.parent",
    },
    {
        keys: [],
        command: "select.same",
    },
    {
        keys: [],
        command: "select.same.text-color",
    },
    {
        keys: [],
        command: "select.same.fill-color",
    },
    {
        keys: [],
        command: "select.same.border-color",
    },
    {
        keys: [],
        command: "select.same.transparency",
    },
    {
        keys: [],
        command: "select.same.blend-mode",
    },
    {
        keys: [],
        command: "select.same.object-type",
    },
    {
        keys: [],
        command: "select.same.object-label",
    },
    {
        keys: [],
        command: "select.same.color-tag",
    },
    {
        keys: [],
        command: "select.object",
    },
    {
        keys: [],
        command: "select.object.shapes",
    },
    {
        keys: [],
        command: "select.object.artboards",
    },
    {
        keys: [],
        command: "select.object.filled-objects",
    },
    {
        keys: [],
        command: "select.object.unfilled-objects",
    },
    {
        keys: [],
        command: "select.object.stroked-objects",
    },
    {
        keys: [],
        command: "select.object.unstroked-objects",
    },
    {
        keys: [],
        command: "select.save-selection",
    },
    {
        keys: [],
        command: "select.edit-selection",
    },
    {
        keys: [],
        command: "select.selection-history",
    },

    // View Commands
    {
        keys: [],
        command: "view.zoom",
    },
    {
        keys: [ ["Ctrl", "="] ],
        command: "view.zoom.zoom-in",
    },
    {
        keys: [ ["Ctrl", "-"] ],
        command: "view.zoom.zoom-out",
    },
    {
        keys: [ ["Ctrl", "0"] ],
        command: "view.zoom.zoom-to-fit",
    },
    {
        keys: [ ["Shift", "Alt", "0"] ],
        command: "view.zoom.zoom-to-width",
    },
    {
        keys: [ ["Ctrl", "Alt", "0"] ],
        command: "view.zoom.zoom-to-selection",
    },
    {
        keys: [ ["Ctrl", "1"] ],
        command: "view.zoom.100-percent",
    },
    {
        keys: [ ["Ctrl", "2"] ],
        command: "view.zoom.200-percent",
    },
    {
        keys: [ ["Ctrl", "3"] ],
        command: "view.zoom.400-percent",
    },
    {
        keys: [ ["Ctrl", "4"] ],
        command: "view.zoom.800-percent",
    },
    {
        keys: [ ["Ctrl", "8"] ],
        command: "view.zoom.actual-size",
    },
    {
        keys: [ ["Ctrl", "9"] ],
        command: "view.zoom.pixel-size",
    },
    {
        keys: [],
        command: "view.rotate",
    },
    {
        keys: [],
        command: "view.rotate.rotate-left",
    },
    {
        keys: [],
        command: "view.rotate.rotate-right",
    },
    {
        keys: [],
        command: "view.rotate.rotate-to-selection",
    },
    {
        keys: [],
        command: "view.rotate.reset-rotation",
    },
    {
        keys: [],
        command: "view.view-mode",
    },
    {
        keys: [],
        command: "view.view-mode.outline",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation.none",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation.protanopia",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation.deuteranopia",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation.tritanopia",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation.achromatopsia",
    },
    {
        keys: [],
        command: "view.view-mode.color-simulation.contrast-loss",
    },
    {
        keys: [],
        command: "view.view-mode.force-light-scheme",
    },
    {
        keys: [],
        command: "view.view-mode.force-dark-scheme",
    },
    {
        keys: [],
        command: "view.view-mode.print-media-simulation",
    },
    {
        keys: [],
        command: "view.show-margin",
    },
    {
        keys: [],
        command: "view.customize-margin",
    },
    {
        keys: [ ["Ctrl", ";"] ],
        command: "view.show-guides",
    },
    {
        keys: [],
        command: "view.lock-guides",
    },
    {
        keys: [],
        command: "view.customize-guides",
    },
    {
        keys: [ ["Ctrl", "'"] ],
        command: "view.show-grid",
    },
    {
        keys: [],
        command: "view.customize-grid",
    },
    {
        keys: [ ["Ctrl", "R"] ],
        command: "view.show-rulers",
    },
    {
        keys: [],
        command: "view.customize-rulers",
    },
    {
        keys: [],
        command: "view.enable-snapping",
    },
    {
        keys: [],
        command: "view.customize-snapping",
    },
    {
        keys: [],
        command: "view.presentation-mode",
    },
    {
        keys: [],
        command: "view.hide-selection-bounding-box",
    },
    {
        keys: [],
        command: "view.hide-hovering-bounding-box",
    },

    // Window Commands
    {
        keys: [],
        command: "window.arrange",
    },
    {
        keys: [],
        command: "window.arrange.float",
    },
    {
        keys: [],
        command: "window.arrange.float-all",
    },
    {
        keys: [],
        command: "window.arrange.dock",
    },
    {
        keys: [],
        command: "window.arrange.dock-all",
    },
    {
        keys: [],
        command: "window.workspace",
    },
    {
        keys: [],
        command: "window.workspace.reset-workspace",
    },
    {
        keys: [],
        command: "window.workspace.new-workspace",
    },
    {
        keys: [],
        command: "window.workspace.manage-workspace",
    },
    {
        keys: [],
        command: "window.extensions",
    },

    // Help Commands
    {
        keys: [],
        command: "help.quick-start-guide",
    },
    {
        keys: [],
        command: "help.documentation",
    },
    {
        keys: [],
        command: "help.show-release-notes",
    },
    {
        keys: [ ["Ctrl", "Shift", "P"], ["F1"] ],
        command: "help.show-all-commands",
    },
    {
        keys: [],
        command: "help.keyboard-shortcuts",
    },
    {
        keys: [],
        command: "help.search-feature-requests",
    },
    {
        keys: [],
        command: "help.report-issue",
    },
    {
        keys: [],
        command: "help.toggle-developer-tools",
    },
    {
        keys: [],
        command: "help.open-process-explorer",
    },
    {
        keys: [],
        command: "help.check-for-updates",
    },
    {
        keys: [],
        command: "help.about",
    },
];

let compiledKeybindings = [];

let hashedKeybindings = {};

let keySequence = [];

let listeningToKeySequence = false;

/**
 * Translate the keybindings for the macOS platform.
 */
function translateKeybindings(keybindings) {
    if (window.unwebber.about.platform === "darwin") {
        keybindings.forEach(keybinding => {
            keybinding.keys = keybinding.keys.map(key => {
                if (key.includes("Ctrl")) {
                    key[key.indexOf("Ctrl")] = "Cmd";
                }
                return key;
            });
        });
    }
    return keybindings;
}

/**
 * Hash the keybindings for faster lookups.
 */
function hashKeybindings(keybindings) {
    let hashedKeybindings = {};
    keybindings.forEach(keybinding => {
        if (keybinding.keys.length === 0) {
            return;
        }
        keybinding.keys.forEach(keys => {
            const hash = hashKeybinding(keys);
            if (! hashedKeybindings[hash]) {
                hashedKeybindings[hash] = [];
            }
            hashedKeybindings[hash].push(keybinding.command);
        });
    });
    return hashedKeybindings;
}

/**
 * Hash a single keybinding.
 */
function hashKeybinding(keys) {
    keys = keys.map(key => key.toLowerCase());
    let hash = '';
    if (keys.includes("seq")) {
        hash += "seq+";
        keys.splice(keys.indexOf("seq"), 1);
    }
    if (keys.includes("shift")) {
        hash += "shift+";
        keys.splice(keys.indexOf("shift"), 1);
    }
    if (keys.includes("ctrl")) {
        hash += "ctrl+";
        keys.splice(keys.indexOf("ctrl"), 1);
    }
    if (keys.includes("alt")) {
        hash += "alt+";
        keys.splice(keys.indexOf("alt"), 1);
    }
    if (keys.includes("cmd")) {
        hash += "cmd+";
        keys.splice(keys.indexOf("cmd"), 1);
    }
    hash += keys.join("+");
    return hash;
}

/**
 * Watch for keydown events on the window
 * to trigger commands based on the keybindings.
 */
function onWindowKeyDown(event) {
    // Catch key sequences
    if (listeningToKeySequence) {
        // Escape key cancels the sequence
        if (event.key === "Escape") {
            keySequence = [];
            listeningToKeySequence = false;
            return;
        }

        // Enter key ends the sequence and triggers matching commands
        if (event.key === "Enter") {
            keySequence = ["Seq", ...keySequence];
            const hash = hashKeybinding(keySequence);
            const commands = hashedKeybindings[hash];
            if (commands) {
                event.preventDefault();
                const newEvent = new CustomEvent("command", { detail: { commands } });
                window.dispatchEvent(newEvent);
            }
            keySequence = [];
            listeningToKeySequence = false;
            return;
        }

        // Ignore repeated keys
        if (! event.repeat) {
            return;
        }

        // Add the key to the sequence
        let key = event.key;
        if (key === "Control") {
            key = "Ctrl";
        }
        if (key === "Meta") {
            key = "Cmd";
        }
        keySequence.push(key);

        return;
    }

    // Get the keys pressed
    let keys = [];
    if (event.shiftKey) {
        keys.push("Shift");
    }
    if (event.ctrlKey) {
        keys.push("Ctrl");
    }
    if (event.altKey) {
        keys.push("Alt");
    }
    if (event.metaKey) {
        keys.push("Cmd");
    }
    keys.push(event.key);

    // Check if the key sequence is being listened to
    if (keys.length === 2 && ["Ctrl", "Cmd"].includes(keys[0]) && keys[1].toLowerCase() === "k") {
        keySequence = [];
        listeningToKeySequence = true;
        return;
    }

    // Trigger the command if the keybinding if found
    const hash = hashKeybinding(keys);
    const commands = hashedKeybindings[hash];
    if (commands) {
        event.preventDefault();
        const newEvent = new CustomEvent("command", { detail: { commands } });
        window.dispatchEvent(newEvent);
    }
}

/**
 * Get all keybindings.
 */
export function getKeybindings() {
    return compiledKeybindings;
}

/**
 * Initialize the keybindings.
 */
(function() {
    compiledKeybindings = translateKeybindings(keybindings);
    hashedKeybindings = hashKeybindings(compiledKeybindings);
    window.addEventListener("keydown", onWindowKeyDown);
})();

/**
 * Listen for keydown and keyup events on the window
 * to track the state of the modifier keys.
 */
(() => {
    document.addEventListener('keydown', (event) => {
        if (
            ! ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) &&
            ! document.activeElement.isContentEditable
        ) {
            event.preventDefault();
        }

        if (event.code === "Space") {
            if (_spaceKeyState === true) {
                return;
            }
            _spaceKeyState = true;
            window.dispatchEvent(new CustomEvent("keystate:space", { detail: { state: true } }));
        }

        if (event.key === "Shift") {
            if (_shiftKeyState === true) {
                return;
            }
            _shiftKeyState = true;
            window.dispatchEvent(new CustomEvent("keystate:shift", { detail: { state: true } }));
        }

        if (event.key === "Control") {
            if (_ctrlKeyState === true) {
                return;
            }
            _ctrlKeyState = true;
            window.dispatchEvent(new CustomEvent("keystate:ctrl", { detail: { state: true } }));
        }

        if (event.key === "Alt") {
            if (_altKeyState === true) {
                return;
            }
            _altKeyState = true;
            window.dispatchEvent(new CustomEvent("keystate:alt", { detail: { state: true } }));
        }
    });

    document.addEventListener('keyup', (event) => {
        if (
            ! ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) &&
            ! document.activeElement.isContentEditable
        ) {
            event.preventDefault();
        }

        if (event.code === "Space") {
            if (_spaceKeyState === false) {
                return;
            }
            _spaceKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:space", { detail: { state: false } }));
        }

        if (event.key === "Shift") {
            if (_shiftKeyState === false) {
                return;
            }
            _shiftKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:shift", { detail: { state: false } }));
        }

        if (event.key === "Control") {
            if (_ctrlKeyState === false) {
                return;
            }
            _ctrlKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:ctrl", { detail: { state: false } }));
        }

        if (event.key === "Alt") {
            if (_altKeyState === false) {
                return;
            }
            _altKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:alt", { detail: { state: false } }));
        }
    });

    // Reset the state of the modifier keys when the window loses focus
    window.addEventListener("blur", () => {
        if (_spaceKeyState === true) {
            _spaceKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:space", { detail: { state: false } }));
        }

        if (_shiftKeyState === true) {
            _shiftKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:shift", { detail: { state: false } }));
        }

        if (_ctrlKeyState === true) {
            _ctrlKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:ctrl", { detail: { state: false } }));
        }

        if (_altKeyState === true) {
            _altKeyState = false;
            window.dispatchEvent(new CustomEvent("keystate:alt", { detail: { state: false } }));
        }
    });

    // Disable browser back/forward action triggered by programmable keys
    // See https://stackoverflow.com/a/64876009/8791891 for a reference
    window.onpopstate = () => history.go(1);
})();