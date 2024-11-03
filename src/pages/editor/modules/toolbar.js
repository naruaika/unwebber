'use strict';

export const Mode = Object.freeze({
    MOVE: 'move',
    NODE: 'node',
    CODE: 'code',
    LIVE: 'live',
});

export var currentMode;

export const setMode = (targetMode) => {
    // Return if the target mode is invalid
    if (! Object.values(Mode).includes(targetMode)) {
        console.log(`[Editor] Invalid edit mode: ${targetMode}`);
        return;
    }

    // Set the current edit mode
    currentMode = targetMode;
    console.log(`[Editor] Select edit mode: ${currentMode}`);

    // Set the edit mode button to checked
    document.getElementById(`edit-${targetMode}-button`).checked = true;
}

const onButtonClick = (event) => {
    // Set the current edit mode
    setMode(event.target?.value);
}

(() => {
    // For each edit mode button
    document.querySelectorAll('.main-tool__edit').forEach(button => {
        // Register edit mode change event listeners
        button.addEventListener('change', onButtonClick);
    });
})()