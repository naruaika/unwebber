'use strict';

const addCharacterAtCaret = (character) => {
    const selection = document.getSelection();
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    const text = textNode.textContent;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    const newText = text.slice(0, startOffset) + character + text.slice(endOffset);
    textNode.textContent = newText;
    range.setStart(textNode, startOffset + 1);
    range.setEnd(textNode, startOffset + 1);
    selection.removeAllRanges();
    selection.addRange(range);
}

const deleteCharacterAtCaret = () => {
    const selection = document.getSelection();
    const range = selection.getRangeAt(0);
    const textNode = range.startContainer;
    const text = textNode.textContent;
    const startOffset = range.startOffset;
    const endOffset = range.endOffset;
    if (startOffset === 0 && endOffset === 0) {
        return;
    }
    const newText = text.slice(0, startOffset - 1) + text.slice(endOffset);
    textNode.textContent = newText;
    range.setStart(textNode, startOffset - 1);
    range.setEnd(textNode, startOffset - 1);
    selection.removeAllRanges();
    selection.addRange(range);
}

const addElementAtCaret = (tagName) => {
    const element = document.createElement(tagName);
    const selection = document.getSelection();
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(element);
    range.setStartAfter(element);
    range.setEndAfter(element);
    selection.removeAllRanges();
    selection.addRange(range);
}

const onDocumentKeyDown = (event) => {
    if (document.activeElement.isContentEditable) {
        // Send the keydown event to the editor window,
        // so that the editor can update the selection bounding box
        // or update the label of the selected items on the outline panel
        window.parent.postMessage({
            type: 'editor:keydown',
            payload: {},
        }, '*');

        // Send the keydown event for the "Shift" key to the editor window,
        // so that the user can perform "Shift + RMB" to expand the selection
        if (event.key === 'Shift') {
            window.parent.postMessage({
                type: 'editor:shift',
                payload: { pressed: true },
            }, '*');
            event.preventDefault();
            return;
        }

        if (event.key === 'Home') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if (event.key === 'End') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if (event.key === 'PageUp') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if (event.key === 'PageDown') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if (event.code === 'Escape') {
            window.parent.postMessage({
                type: 'editor:escape',
                payload: {},
            }, '*');
            event.preventDefault();
            return;
        }

        if (event.shiftKey && event.code === 'Enter') {
            addElementAtCaret('br');
            event.preventDefault();
            return;
        }

        if (event.code === 'Enter') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if (event.code === 'Space') {
            // TODO: the \u00A0 should be replaced with the actual character
            // when it is no longer at the end of the line since this approach
            // is only intended to prevent the browser from collapsing the space
            // when trying to add a space at the end of the line or in a button
            addCharacterAtCaret('\u00A0');
            event.preventDefault();
            return;
        }

        if (event.shiftKey && event.code === 'Tab') {
            deleteCharacterAtCaret();
            event.preventDefault();
            return;
        }

        if (event.code === 'Tab') {
            addCharacterAtCaret('\u0009');
            event.preventDefault();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyB') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyI') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        if ((event.ctrlKey || event.metaKey) && event.code === 'KeyU') {
            // TODO: implement this
            event.preventDefault();
            return;
        }

        // TODO: implement undo and redo functionality
    }
}

const onDocumentKeyUp = (event) => {
    if (document.activeElement.isContentEditable) {
        // Send the keyup event for the "Shift" key to the editor window,
        // so that the user can perform "RMB" to collapse the selection
        if (event.key === 'Shift') {
            window.parent.postMessage({
                type: 'editor:shift',
                payload: { pressed: false },
            }, '*');
            event.preventDefault();
            return;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    //
    console.log('[Document] Sending document ready message...');

    // Send the ready message to the editor window
    window.parent.postMessage({
        type: 'window:ready',
        payload: {},
    }, '*');

    // Register event listeners on the document
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);

    //
    console.log('[Document] Sending document ready message... [DONE]');
});