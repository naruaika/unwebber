'use strict';

import Color from "../../../../node_modules/colorjs.io/dist/color.min.js";
import { metadata, selectedNode, setMetadata } from "../globals.js";
import { styleElement } from "../helpers.js";

// TODO: add a new mode to change text color?
export const Mode = Object.freeze({
    FILL: 'fill',
    STROKE: 'stroke',
    OUTLINE: 'outline',
});

export const Side = Object.freeze({
    TOP: 'top',
    RIGHT: 'right',
    BOTTOM: 'bottom',
    LEFT: 'left',
});

export const Type = Object.freeze({
    NONE: 'none',
    FLAT: 'flat',
    LGRAD: 'linear-gradient',
    RGRAD: 'radial-gradient',
    PATTERN: 'pattern',
});

// TODO: add support for more color spaces
export const Space = Object.freeze({
    sRGB: 'srgb',
    HSL: 'hsl',
    HSLuv: 'hsluv',
    HSV: 'hsv',
    HWB: 'hwb',
    Lab: 'lab',
    LCH: 'lch',
});

export var currentMode = Mode.FILL;

export var currentSide = Side.TOP;

export var currentType = Type.NONE;

export var currentSpace = Space.sRGB;

const nonNativeSpaces = [
    Space.HSLuv,
    Space.HSV,
];

const colorSliders = {
    srgb: [
        { id: 'r', label: 'R', min: 0, max: 255, step: 1, multiplier: 255 },
        { id: 'g', label: 'G', min: 0, max: 255, step: 1, multiplier: 255 },
        { id: 'b', label: 'B', min: 0, max: 255, step: 1, multiplier: 255 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
    hsl: [
        { id: 'h', label: 'H', min: 0, max: 360, step: 1 },
        { id: 's', label: 'S', min: 0, max: 100, step: 1 },
        { id: 'l', label: 'L', min: 0, max: 100, step: 1 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
    hsluv: [
        { id: 'h', label: 'H', min: 0, max: 360, step: 1 },
        { id: 's', label: 'S', min: 0, max: 100, step: 1 },
        { id: 'l', label: 'L', min: 0, max: 100, step: 1 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
    hsv: [
        { id: 'h', label: 'H', min: 0, max: 360, step: 1 },
        { id: 's', label: 'S', min: 0, max: 100, step: 1 },
        { id: 'v', label: 'V', min: 0, max: 100, step: 1 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
    hwb: [
        { id: 'h', label: 'H', min: 0, max: 360, step: 1 },
        { id: 'w', label: 'W', min: 0, max: 100, step: 1 },
        { id: 'b', label: 'B', min: 0, max: 100, step: 1 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
    lab: [
        { id: 'l', label: 'L', min: 0, max: 100, step: 1 },
        { id: 'a', label: 'A', min: -125, max: 125, step: 1 },
        { id: 'b', label: 'B', min: -125, max: 125, step: 1 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
    lch: [
        { id: 'l', label: 'L', min: 0, max: 100, step: 1 },
        { id: 'c', label: 'C', min: 0, max: 150, step: 1 },
        { id: 'h', label: 'H', min: 0, max: 360, step: 1 },
        { id: 'o', label: 'O', min: 0, max: 100, step: 1 },
    ],
};

// TODO: add support for mixing multiple colors
let currentColor;

let panelContentContainer;

let isPanelReady = false;

const createModeSelector = () => {
    const container = document.createElement('div');
    container.classList.add('button-group');

    Object.values(Mode).forEach((mode, index) => {
        const item = document.createElement('div');
        item.classList.add('item');
        if (index === 0) {
            item.classList.add('selected');
        }
        item.dataset.mode = mode;
        item.innerText = mode.charAt(0).toUpperCase();
        item.addEventListener('click', onModeSelectorItemClick);
        container.appendChild(item);
    });

    return container;
}

const onModeSelectorItemClick = (event) => {
    // Update the selected mode
    currentMode = event.target.dataset.mode;

    // Update the selected item
    const items = event.target.parentElement.querySelectorAll('.item');
    items.forEach(item => item.classList.remove('selected'));
    event.target.classList.add('selected');

    // Repopulate the color sliders
    const colorSliders = createColorSliders();
    panelContentContainer.querySelector('.color-sliders').replaceWith(colorSliders);

    refreshColorSliders();
    colorizeColorSliders();
}

const createTypeSelector = () => {
    const container = document.createElement('div');
    container.classList.add('button-group');

    Object.values(Type).forEach((type, index) => {
        const item = document.createElement('div');
        item.classList.add('item');
        item.innerText = type.charAt(0).toUpperCase();
        if (index === 0) {
            item.classList.add('selected');
        }
        // TODO: implement event listener
        container.appendChild(item);
    });

    return container;
}

const createSpaceSelector = () => {
    const container = document.createElement('div');
    container.classList.add('space-selector');

    const dropdownList = document.createElement('div');
    dropdownList.classList.add('field-options', 'scrollable', 'hidden');

    Object.values(Space).forEach(space => {
        const item = document.createElement('div');
        item.textContent = Object.keys(Space).find(key => Space[key] === space);
        item.classList.add('dropdown-item');
        item.addEventListener('click', (event) => onSpaceSelectorItemClick(event, space));
        dropdownList.appendChild(item);
    });

    const button = document.createElement('button');
    button.classList.add('field-button');
    button.innerText = Object.keys(Space).find(key => Space[key] === currentSpace);
    button.addEventListener('click', onSpaceSelectorClick);

    container.appendChild(button);
    container.appendChild(dropdownList);

    document.addEventListener('click', () => {
        dropdownList.classList.add('hidden');
    });

    return container;
}

const onSpaceSelectorClick = (event) => {
    const dropdownList = event.target.parentElement.querySelector('.field-options');
    dropdownList.classList.remove('hidden');

    // Stop the event propagation
    event.stopImmediatePropagation();
}

const onSpaceSelectorItemClick = (event, space) => {
    // Update the current color space
    currentSpace = space;

    // Update the space selector button text
    const button = event.target.parentElement.parentElement.querySelector('.field-button');
    button.innerText = Object.keys(Space).find(key => Space[key] === currentSpace);

    // Repopulate the color sliders
    const colorSliders = createColorSliders();
    panelContentContainer.querySelector('.color-sliders').replaceWith(colorSliders);

    refreshColorSliders();
    colorizeColorSliders();

    // Hide the dropdown
    const dropdownList = event.target.parentElement;
    dropdownList.classList.add('hidden');
}

const createColorSliders = () => {
    const container = document.createElement('div');
    container.classList.add('color-sliders');

    colorSliders[currentSpace].forEach((slider) => {
        const sliderContainer = document.createElement('div');
        sliderContainer.classList.add('slider');

        const label = document.createElement('label');
        label.innerText = slider.label + ':';

        const output = document.createElement('output');
        output.innerText = slider.max;
        output.setAttribute('contenteditable', 'true');

        const input = document.createElement('input');
        input.dataset.id = slider.id;
        input.type = 'range';
        input.min = slider.min;
        input.max = slider.max;
        input.step = slider.step;
        input.value = slider.max;
        input.addEventListener('input', onColorSliderInput);

        sliderContainer.appendChild(label);
        sliderContainer.appendChild(input);
        sliderContainer.appendChild(output);
        container.appendChild(sliderContainer);
    });

    return container;
}

const onColorSliderInput = (event) => {
    // Update the output text
    const output = event.target.nextElementSibling;
    output.innerText = event.target.value;

    // Request panel updates
    setTimeout(() => {
        colorizeColorSliders();
        window.dispatchEvent(new CustomEvent('contextbar:refresh'));
    }, 0);

    // Return if there is no selected element
    if (! selectedNode.node) {
        return;
    }

    // Get the context
    let property;
    if (currentMode === Mode.STROKE) {
        property = 'border-color';
    } else if (currentMode === Mode.OUTLINE) {
        property = 'outline-color';
    } else {
        property = 'background-color';
    }

    if (! currentColor) {
        // Get the color string from the metadata
        const _metadata = metadata[selectedNode.node.dataset.uwId];
        let colorString = _metadata.properties[property]?.value;

        // Get the color string from the computed style
        // if the user has not explicitly set the color
        if (! colorString) {
            colorString = window.getComputedStyle(selectedNode.node)[property];
        }

        // Create a new color object
        currentColor = new Color(colorString).to(currentSpace);
    }

    // Update the color object
    const value = event.target.value / (colorSliders[currentSpace].find(slider => slider.id === event.target.dataset.id).multiplier || 1);
    if (event.target.dataset.id === 'o') {
        currentColor.alpha = value / 100;
    } else {
        currentColor[currentSpace][event.target.dataset.id] = value;
    }

    // Update the element's color
    // TODO: push to action history
    let colorString = currentColor;
    if (nonNativeSpaces.includes(currentSpace)) {
        colorString = currentColor.to('lab');
    }
    colorString = colorString.toString();
    styleElement(selectedNode.node, property, colorString);

    // Update the metadata
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    _metadata.properties[property] = { value: currentColor.toString(), checked: true };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);
}

const refreshColorSliders = () => {
    // Return if there is no selected element
    if (! selectedNode.node) {
        return;
    }

    // Get the context
    let property;
    if (currentMode === Mode.STROKE) {
        property = `border-${currentSide}-color`;
    } else if (currentMode === Mode.OUTLINE) {
        property = 'outline-color';
    } else {
        property = 'background-color';
    }

    // Get the color string from the metadata
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    let colorString = _metadata.properties[property]?.value;

    // Get the color string from the computed style
    // if the user has not explicitly set the color
    if ([
            'initial',
            'inherit',
            'revert',
            'revert-layer',
            'unset',
            'currentcolor',
        ].includes(colorString) ||
        ! colorString
    ) {
        colorString = window.getComputedStyle(selectedNode.node)[property];
    }

    // Create a new color object
    // FIXME: sometimes the alpha channel is not parsed correctly, hsl(235, 100%, 50%, 80%) for example
    // FIXME: automatically correct the gamut if the color is out of bounds after the conversion
    currentColor = new Color(colorString).to(currentSpace);

    // Skip if the color is transparent
    if (currentColor.alpha.toString() === '0') {
        return;
    }

    // Update the color sliders
    // TODO: add support for floating point values
    const sliders = panelContentContainer.querySelectorAll('.color-sliders .slider');
    currentColor.coords.forEach((color, index) => {
        color = color || 0;
        color *= colorSliders[currentSpace][index]?.multiplier || 1;
        color = color.toString();
        sliders[index].querySelector('input').value = color;
        sliders[index].querySelector('output').innerText = parseInt(color);
    });
    if (currentSpace !== Space.CMYK && currentColor.coords.length < 4) {
        const alpha = currentColor.alpha.toString() * 100;
        sliders[3].querySelector('input').value = alpha;
        sliders[3].querySelector('output').innerText = parseInt(alpha);
    }
}

const colorizeColorSliders = () => {
    const ranges = panelContentContainer.querySelectorAll('.color-sliders input[type="range"]');
    const stops = (count, fn) => Array.from({length: count}, (_, i) => fn(i)).join(', ');
    const x = ranges[0].value;
    const y = ranges[1].value;
    const z = ranges[2].value;

    switch (currentSpace) {
        case 'srgb':
            ranges[0].style.setProperty('--stops', stops(11, i => `rgb(${i * 10}% ${y}% ${z}%)`));
            ranges[1].style.setProperty('--stops', stops(11, i => `rgb(${x}% ${i * 10}% ${z}%)`));
            ranges[2].style.setProperty('--stops', stops(11, i => `rgb(${x}% ${y}% ${i * 10}%)`));
            ranges[3].style.setProperty('--stops', stops(11, i => `rgb(${x}% ${y}% ${z}% / ${i * 10}%)`));
            break;

        case 'hsl':
            ranges[0].style.setProperty('--stops', stops(11, i => `hsl(${i * 36} 100 50)`));
            ranges[1].style.setProperty('--stops', stops(11, i => `hsl(${x} ${i * 10} ${z})`));
            ranges[2].style.setProperty('--stops', stops(11, i => `hsl(${x} ${y} ${i * 10})`));
            ranges[3].style.setProperty('--stops', stops(11, i => `hsl(${x} ${y} ${z} / ${i * 10}%)`));
            break;

        case 'hsluv':
            // FIXME: the color stops are not accurate
            ranges[0].style.setProperty('--stops', stops(11, i => new Color('hsluv', [i * 36, 100, 50]).to('hsl').toString()));
            ranges[1].style.setProperty('--stops', stops(11, i => new Color('hsluv', [x, i * 10, 50]).to('hsl').toString()));
            ranges[2].style.setProperty('--stops', stops(11, i => new Color('hsluv', [x, 100, i * 10]).to('hsl').toString()));
            ranges[3].style.setProperty('--stops', stops(11, i => {
                const color = new Color('hsluv', [x, 100, 50]).to('hsl');
                color.alpha = i / 10;
                return color.toString();
            }));
            break;

        case 'hsv':
            // FIXME: the color stops are not accurate
            ranges[0].style.setProperty('--stops', stops(11, i => new Color('hsv', [i * 36, 100, 100]).to('hsl').toString()));
            ranges[1].style.setProperty('--stops', stops(11, i => new Color('hsv', [x, i * 10, 100]).to('hsl').toString()));
            ranges[2].style.setProperty('--stops', stops(11, i => new Color('hsv', [x, 100, i * 10]).to('hsl').toString()));
            ranges[3].style.setProperty('--stops', stops(11, i => {
                const color = new Color('hsv', [x, 100, 100]).to('hsl');
                color.alpha = i / 10;
                return color.toString();
            }));
            break;

        case 'hwb':
            ranges[0].style.setProperty('--stops', stops(11, i => `hwb(${i * 36} 0% 0%)`));
            ranges[1].style.setProperty('--stops', stops(11, i => `hwb(${x} ${i * 10}% ${z}%)`));
            ranges[2].style.setProperty('--stops', stops(11, i => `hwb(${x} ${y}% ${i * 10}%)`));
            ranges[3].style.setProperty('--stops', stops(11, i => `hwb(${x} ${y}% ${z}% / ${i * 10}%)`));
            break;

        case 'lab':
            ranges[0].style.setProperty('--stops', stops(11, i => `lab(${i * 10}% ${y} ${z})`));
            ranges[1].style.setProperty('--stops', stops(11, i => `lab(${x}% ${-125 + i * 25} ${z})`));
            ranges[2].style.setProperty('--stops', stops(11, i => `lab(${x}% ${y} ${-125 + i * 25})`));
            ranges[3].style.setProperty('--stops', stops(11, i => `lab(${x}% ${y} ${z} / ${i * 10}%)`));
            break;

        case 'lch':
            ranges[0].style.setProperty('--stops', stops(11, i => `lch(${i * 10}% ${y} ${z})`));
            ranges[1].style.setProperty('--stops', stops(11, i => `lch(${x}% ${i * 15} ${z})`));
            ranges[2].style.setProperty('--stops', stops(11, i => `lch(50% 150 ${i * 36})`));
            ranges[3].style.setProperty('--stops', stops(11, i => `lch(${x}% ${y} ${z} / ${i * 10}%)`));
            break;
    }
}

const initializePanel = () => {
    // Create a fragment to hold the panel content
    const fragment = document.createDocumentFragment();

    // Create a tab bar
    let tabContainer = document.createElement('div');
    tabContainer.classList.add('tab-bar');
    fragment.appendChild(tabContainer);

    // Create a button group for the mode selector
    const modeSelector = createModeSelector();
    tabContainer.appendChild(modeSelector);

    // Create a button group for the fill type selector
    const typeSelector = createTypeSelector();
    tabContainer.appendChild(typeSelector);

    // Create a dropdown for the color space selector
    const spaceSelector = createSpaceSelector();
    tabContainer.appendChild(spaceSelector);

    // TODO: implement border side selector for stroke mode

    // TODO: implement color picker tool

    // TODO: implement recent colors grid

    // Create a content container
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('content');
    fragment.appendChild(contentContainer);

    // TODO: implement color wheel for HSL color space

    // TODO: implement gradient editor

    // TODO: implement pattern editor

    // TODO: implement hex input field for sRGB color space

    // TODO: implement image theme extractor

    // TODO: implement intelligent contrast checker

    // TODO: implement color blind safe checker

    // Create color sliders
    const colorSliders = createColorSliders();
    contentContainer.appendChild(colorSliders);

    // Replace the panel content with the fragment
    panelContentContainer.replaceChildren(fragment);
}

const refreshPanel = () => {
    if (! panelContentContainer) {
        panelContentContainer = document.querySelector('#fill-and-stroke-panel .content__container');
    }

    if (! isPanelReady) {
        initializePanel();
        isPanelReady = true;
    }

    refreshColorSliders();
    colorizeColorSliders();
}

export const initialize = () => {
    // Create a fragment to hold the panel content
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.classList.add('content__container', 'scrollable');
    const placeholder = document.createElement('span');
    // placeholder.textContent = 'Loading...';
    placeholder.classList.add('placeholder');
    container.appendChild(placeholder);
    fragment.appendChild(container);

    // Register the window message event listener
    window.addEventListener('fill-and-stroke:refresh', refreshPanel);

    return fragment;
}