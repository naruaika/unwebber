'use strict';

(() => {
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Delete') {
            window.dispatchEvent(new CustomEvent('element:delete'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
            window.dispatchEvent(new CustomEvent('element:duplicate'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
            window.dispatchEvent(new CustomEvent('action:undo'));
            return;
        }

        if (
            ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
            ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyZ')
        ) {
            window.dispatchEvent(new CustomEvent('action:redo'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.altKey && event.key === '0') {
            window.dispatchEvent(new CustomEvent('canvas:view'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === '=') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: 'in' }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === '-') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: 'out' }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.key === '0') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: 'fit' }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && ['1', '2', '3', '4'].includes(event.key)) {
            const scale = Math.pow(2, parseInt(event.key) - 1);
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { scale } }));
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
            window.dispatchEvent(new CustomEvent('element:translate', {
                detail: {
                    direction: event.key.replace('Arrow', '').toLowerCase(),
                    withShiftKey: event.shiftKey,
                }
            }));
            return;
        }

        // TODO: add event listener for keydown to move elements with arrow keys
    });
    document.addEventListener('cut', () => window.dispatchEvent(new CustomEvent('element:cut')));
    document.addEventListener('copy', () => window.dispatchEvent(new CustomEvent('element:copy')));
    document.addEventListener('paste', () => window.dispatchEvent(new CustomEvent('element:paste')));
})()