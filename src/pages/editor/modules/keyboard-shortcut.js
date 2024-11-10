'use strict';

let _spaceKeyState = null;
let _shiftKeyState = null;
let _ctrlKeyState = null;
let _altKeyState = null;

export const getSpaceKeyState = () => _spaceKeyState;
export const getShiftKeyState = () => _shiftKeyState;
export const getCtrlKeyState = () => _ctrlKeyState;
export const getAltKeyState = () => _altKeyState;

(() => {
    // TODO: refactor this to use a map of key combinations to actions
    document.addEventListener('keydown', (event) => {
        if (event.code === 'Delete') {
            window.dispatchEvent(new CustomEvent('element:delete'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyD') {
            window.dispatchEvent(new CustomEvent('element:duplicate'));
            return;
        }

        if (event.code === 'Escape') {
            window.dispatchEvent(new CustomEvent('action:interrupt'));
            return;
        }

        if (
            ((event.ctrlKey || event.metaKey) && event.code === 'KeyY') ||
            ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'KeyZ')
        ) {
            if (
                ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
                document.activeElement.getAttribute('contenteditable') === 'true'
            ) {
                return;
            }
            window.dispatchEvent(new CustomEvent('action:redo'));
            event.preventDefault();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
            if (
                ['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase()) ||
                document.activeElement.getAttribute('contenteditable') === 'true'
            ) {
                return;
            }
            window.dispatchEvent(new CustomEvent('action:undo'));
            event.preventDefault();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.altKey && event.code === 'Digit0') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { zoom: 'selection' } }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'Equal') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { zoom: 'in' } }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'Minus') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { zoom: 'out' } }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'Digit0') {
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { zoom: 'fit' } }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && ['1', '2', '3', '4'].includes(event.key)) {
            const scale = Math.pow(2, parseInt(event.key) - 1);
            window.dispatchEvent(new CustomEvent('canvas:zoom', { detail: { zoom: scale } }));
            return;
        }

        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
            window.dispatchEvent(new CustomEvent('element:translate', {
                detail: {
                    direction: event.code.replace('Arrow', '').toLowerCase(),
                    withShiftKey: event.shiftKey,
                }
            }));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'BracketRight') {
            window.dispatchEvent(new CustomEvent('element:move-to-top-tree'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === 'BracketLeft') {
            window.dispatchEvent(new CustomEvent('element:move-to-bottom-tree'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'BracketRight') {
            window.dispatchEvent(new CustomEvent('element:move-up-tree'));
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'BracketLeft') {
            window.dispatchEvent(new CustomEvent('element:move-down-tree'));
            return;
        }

        if (event.code === 'Space') {
            if (
                ! ['input', 'textarea'].includes(document.activeElement.tagName?.toLowerCase()) &&
                ! document.activeElement.isContentEditable
            ) {
                event.preventDefault();
            }
            if (_spaceKeyState === true) {
                return;
            }
            _spaceKeyState = true;
            window.dispatchEvent(new CustomEvent('editor:space', { detail: { state: true } }));
        }
        if (event.key === 'Shift') {
            if (_shiftKeyState === true) {
                return;
            }
            _shiftKeyState = true;
            window.dispatchEvent(new CustomEvent('editor:shift', { detail: { state: true } }));
        }
        if (event.key === 'Control') {
            if (_ctrlKeyState === true) {
                return;
            }
            _ctrlKeyState = true;
            window.dispatchEvent(new CustomEvent('editor:ctrl', { detail: { state: true } }));
        }
        if (event.key === 'Alt') {
            if (_altKeyState === true) {
                return;
            }
            _altKeyState = true;
            window.dispatchEvent(new CustomEvent('editor:alt', { detail: { state: true } }));
        }
    });

    document.addEventListener('keyup', (event) => {
        if (event.code === 'Space') {
            if (_spaceKeyState === false) {
                return;
            }
            _spaceKeyState = false;
            window.dispatchEvent(new CustomEvent('editor:space', { detail: { state: false } }));
        }
        if (event.key === 'Shift') {
            if (_shiftKeyState === false) {
                return;
            }
            _shiftKeyState = false;
            window.dispatchEvent(new CustomEvent('editor:shift', { detail: { state: false } }));
        }
        if (event.key === 'Control') {
            if (_ctrlKeyState === false) {
                return;
            }
            _ctrlKeyState = false;
            window.dispatchEvent(new CustomEvent('editor:ctrl', { detail: { state: false } }));
        }
        if (event.key === 'Alt') {
            if (_altKeyState === false) {
                return;
            }
            _altKeyState = false;
            window.dispatchEvent(new CustomEvent('editor:alt', { detail: { state: false } }));
        }
    });

    document.addEventListener('cut', () => window.dispatchEvent(new CustomEvent('element:cut')));
    document.addEventListener('copy', () => window.dispatchEvent(new CustomEvent('element:copy')));
    document.addEventListener('paste', () => window.dispatchEvent(new CustomEvent('element:paste')));
})()