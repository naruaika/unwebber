'use strict';

let _snapCheckState = false;
let _gridCheckState = false;
let _marginCheckState = false;

export const getSnapCheckState = () => _snapCheckState;
export const getGridCheckState = () => _gridCheckState;
export const getMarginCheckState = () => _marginCheckState;

const toggleSnapCheckState = (event) => {
    _snapCheckState = event.target.checked;
}

const toggleGridCheckState = (event) => {
    _gridCheckState = event.target.checked;
    window.dispatchEvent(new CustomEvent('editor:toggle-grid', { detail: { state: _gridCheckState } }));
}

const toggleMarginCheckState = (event) => {
    _marginCheckState = event.target.checked;
}

(() => {
    const container = document.querySelector('.main-controlbar');
    container.querySelector('#move-to-bottom-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:move-to-top-tree')));
    container.querySelector('#move-down-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:move-up-tree')));
    container.querySelector('#move-up-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:move-down-tree')));
    container.querySelector('#move-to-top-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:move-to-bottom-tree')));
    container.querySelector('#flip-horizontal-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:flip-horizontal')));
    container.querySelector('#flip-vertical-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:flip-vertical')));
    container.querySelector('#rotate-left-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:rotate-left')));
    container.querySelector('#rotate-right-button').addEventListener('click', () => window.dispatchEvent(new CustomEvent('element:rotate-right')));
    container.querySelector('#snapping-toggle-button').addEventListener('change', toggleSnapCheckState);
    container.querySelector('#snapping-options-button').addEventListener('click', () => { /* window.dispatchEvent(new CustomEvent('editor:'))*/ });
    container.querySelector('#grid-toggle-button').addEventListener('click', toggleGridCheckState);
    container.querySelector('#grid-options-button').addEventListener('click', () => { /* window.dispatchEvent(new CustomEvent('editor:'))*/ });
    container.querySelector('#margin-toggle-button').addEventListener('click', toggleMarginCheckState);
    container.querySelector('#margin-options-button').addEventListener('click', () => { /* window.dispatchEvent(new CustomEvent('editor:'))*/ });
})()