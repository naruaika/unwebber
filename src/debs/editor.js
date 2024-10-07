document.addEventListener('DOMContentLoaded', () => {
    //
    console.log('[Document] Sending document ready message...');

    // Send the ready message to the editor window
    window.parent.postMessage({
        type: 'window:ready',
        payload: {},
    }, '*');

    //
    console.log('[Document] Sending document ready message... [DONE]');
});