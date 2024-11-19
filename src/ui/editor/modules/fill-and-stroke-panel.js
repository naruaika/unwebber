'use strict';

import Color from "../../../../node_modules/colorjs.io/dist/color.min.js";
import { metadata, selectedNode, setMetadata } from "../globals.js";
import { styleElement } from "../helpers.js";

export const Mode = Object.freeze({
    FILL: 'fill',
    STROKE: 'stroke',
    OUTLINE: 'outline',
});

export const Type = Object.freeze({
    NONE: 'none',
    FLAT: 'flat',
    LINEAR_GRADIENT: 'linear-gradient',
    RADIAL_GRADIENT: 'radial-gradient',
    PATTERN: 'pattern', // alias image
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
        label.innerText = slider.label;

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

    // Update the output text
    const output = event.target.nextElementSibling;
    output.innerText = event.target.value;

    // Request panel updates
    setTimeout(() => {
        window.dispatchEvent(new CustomEvent('contextbar:refresh'));
    }, 0);
}

const refreshColorSliders = () => {
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

    // Get the color string from the metadata
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    let colorString =  _metadata.properties[property]?.value;

    // Get the color string from the computed style
    // if the user has not explicitly set the color
    if (! colorString) {
        colorString = window.getComputedStyle(selectedNode.node)[property];
    }

    // Create a new color object
    // FIXME: sometimes the alpha channel is not parsed correctly,
    // hsl(235, 100%, 50%, 80%) for example
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
        if (currentSpace !== Space.CMYK && index === 3) {
            color *= 100;
        }
        color *= colorSliders[currentSpace][index].multiplier || 1;
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

    // TODO: create a border side selector

    // Create a content container
    const contentContainer = document.createElement('div');
    contentContainer.classList.add('content');
    fragment.appendChild(contentContainer);

    // TODO: implement a color wheel for HSL color space

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
}

export const initialize = () => {
    // Create a fragment to hold the panel content
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    container.classList.add('content__container', 'scrollable');
    const placeholder = document.createElement('span');
    placeholder.innerText = 'Loading...';
    placeholder.classList.add('placeholder');
    container.appendChild(placeholder);
    fragment.appendChild(container);

    // Register the window message event listener
    window.addEventListener('fill-and-stroke:refresh', refreshPanel);

    return fragment;
}