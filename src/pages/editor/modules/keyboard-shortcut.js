'use strict';

(() => {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Delete') {
            window.dispatchEvent(new CustomEvent('element:delete'));
            return;
        }

        if (event.ctrlKey && event.key === 'd') {
            window.dispatchEvent(new CustomEvent('element:duplicate'));
            return;
        }

        if (event.ctrlKey && event.key === 'z') {
            window.dispatchEvent(new CustomEvent('action:undo'));
            return;
        }

        if (
            (event.ctrlKey && event.key === 'y') ||
            (event.ctrlKey && event.shiftKey && event.code === 'KeyZ')
        ) {
            window.dispatchEvent(new CustomEvent('action:redo'));
            return;
        }

        // TODO: add event listener for keydown to move elements with arrow keys
    });
    document.addEventListener('cut', () => window.dispatchEvent(new CustomEvent('element:cut')));
    document.addEventListener('copy', () => window.dispatchEvent(new CustomEvent('element:copy')));
    document.addEventListener('paste', () => window.dispatchEvent(new CustomEvent('element:paste')));
})()