'use strict';

import { apiSchema, selectedNode } from "../globals.js";

let panelContentContainer;

const refreshPanel = () => {
    if (! panelContentContainer) {
        panelContentContainer = document.querySelector('.main-contextbar');
    }

    //
    panelContentContainer.querySelectorAll('.group').forEach(group => group.classList.add('hidden'));

    //
    if (! selectedNode.node) {
        panelContentContainer.querySelector('#selection').textContent = 'No selection.';
        return;
    }

    //
    // TODO: indicate whether the style is inherited (not set explicitly)
    const computedStyle = window.getComputedStyle(selectedNode.node);

    //
    panelContentContainer.querySelector('#selection').textContent = ''
        || apiSchema.htmlElements.find(htmlElement => htmlElement.tag === selectedNode.node.tagName.toLowerCase())?.name
        || element.tagName.toLowerCase();

    //
    const background = computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)' ? computedStyle.backgroundColor : 'transparent';
    panelContentContainer.querySelector('#background-picker').style.setProperty('--data-color', background);
    panelContentContainer.querySelector('#background-picker').dataset.transparent = background === 'transparent';

    //
    const borderWidth = computedStyle.borderWidth;
    const borderWidths = [
        parseInt(computedStyle.borderLeftWidth),
        parseInt(computedStyle.borderTopWidth),
        parseInt(computedStyle.borderRightWidth),
        parseInt(computedStyle.borderBottomWidth),
    ];
    const maxBorderWidth = Math.max(...borderWidths);
    const borderSide = borderWidths.indexOf(maxBorderWidth);
    const borderStyle = maxBorderWidth > 0
        ? [
            computedStyle.borderLeftStyle,
            computedStyle.borderTopStyle,
            computedStyle.borderRightStyle,
            computedStyle.borderBottomStyle,
        ][borderSide] : 'none';
    const borderColor = maxBorderWidth > 0
        ? [
            computedStyle.borderLeftColor,
            computedStyle.borderTopColor,
            computedStyle.borderRightColor,
            computedStyle.borderBottomColor,
        ][borderSide] : 'rgba(0, 0, 0, 0)';
    panelContentContainer.querySelector('#border-picker').style.setProperty('--data-color', borderColor);
    panelContentContainer.querySelector('#border-picker').dataset.transparent = borderColor === 'rgba(0, 0, 0, 0)';
    panelContentContainer.querySelector('#border-style-picker').dataset.none = borderStyle === 'none';
    panelContentContainer.querySelector('#border-style-picker .border-style').style.setProperty('--data-style', borderStyle === 'none' ? 'solid' : borderStyle);
    panelContentContainer.querySelector('#border-style-picker .border-style').style.setProperty('--data-width', maxBorderWidth === '0' ? '1px' : `max(min(${maxBorderWidth}px, 5px), 1px)`);
    panelContentContainer.querySelector('#border-style-picker .border-width').textContent = borderWidth === '0px' ? 'None' : borderWidth;

    //
    const borderRadius = computedStyle.borderRadius;
    const borderRadiuses = [
        parseInt(computedStyle.borderTopLeftRadius),
        parseInt(computedStyle.borderTopRightRadius),
        parseInt(computedStyle.borderBottomRightRadius),
        parseInt(computedStyle.borderBottomLeftRadius),
    ];
    const maxBorderRadius = Math.max(...borderRadiuses);
    panelContentContainer.querySelector('#border-radius-picker .radius-icon').style.setProperty('--data-radius', `min(${maxBorderRadius}px, 10px)`);
    panelContentContainer.querySelector('#border-radius-picker .radius-value').textContent = borderRadius === '0px' ? 'None' : borderRadius;

    //
    const fontFamily = computedStyle.fontFamily;
    const fontSize = computedStyle.fontSize;
    const color = computedStyle.color;
    panelContentContainer.querySelector('#font-family-picker').textContent = fontFamily.replace(/"/g, '').split(',')[0];
    panelContentContainer.querySelector('#font-size-picker').textContent = Math.round(parseFloat(fontSize)) + 'px';
    panelContentContainer.querySelector('#color-picker').style.setProperty('--data-color', color);

    //
    panelContentContainer.querySelector('#background-picker').parentElement.classList.remove('hidden');
    panelContentContainer.querySelector('#border-picker').parentElement.classList.remove('hidden');

    if (selectedNode.node.textContent.trim() !== '') {
        panelContentContainer.querySelector('#font-family-picker').parentElement.classList.remove('hidden');
        panelContentContainer.querySelector('#bold-toggle').parentElement.classList.remove('hidden');
        panelContentContainer.querySelector('#text-align-left-radio').parentElement.classList.remove('hidden');
    }
}

export const initialize = () => {
    // Register the window message event listener
    window.addEventListener('contextbar:refresh', refreshPanel);
}