'use strict';

import { apiSchema, elementData, selectedElement } from "../globals.js";

const panelContentContainer = document.querySelector('#attributes-panel .content__container');

let previousSelectedElementId = null;
let showAllAttributes = false;

const onCheckboxChange = (event) => {
    // Apply the attribute value
    const value = event.target.parentElement.querySelector('.field-value')?.value || '';
    if (event.target.checked) {
        selectedElement.setAttribute(event.target.dataset.key, value);
    } else {
        selectedElement.removeAttribute(event.target.dataset.key);
    }

    // Save the attribute value
    elementData[selectedElement.dataset.uwId].attributes[event.target.dataset.key] = {
        value,
        checked: event.target.checked,
    };

    // Request to refresh the outline panel
    window.dispatchEvent(new CustomEvent('outline:refresh'));
}

const onInputBoxKeyDown = (event, cachedAttribute) => {
    if (event.key === 'Escape') {
        // Restore the attribute value
        event.target.value = cachedAttribute?.value || '';

        // Unfocus the input box
        event.target.blur();

        // Hide the dropdown list
        event.target.parentElement.querySelector('.field-options')?.classList.add('hidden');

        return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
        // TODO: push to action history

        // Apply the attribute value
        const checked = event.target.parentElement.querySelector('.field-checkbox')?.checked || false;
        if (checked) {
            selectedElement.setAttribute(event.target.dataset.key, event.target.value);
        } else {
            selectedElement.removeAttribute(event.target.dataset.key);
        }

        // Save the attribute value
        elementData[selectedElement.dataset.uwId].attributes[event.target.dataset.key] = {
            value: event.target.value,
            checked,
        };

        // Request to refresh the outline panel only if the checkbox is checked
        if (checked) {
            window.dispatchEvent(new CustomEvent('outline:refresh'));
        }

        // Unfocus the input box
        event.target.blur();

        // Hide the dropdown list
        event.target.parentElement.querySelector('.field-options')?.classList.add('hidden');

        return;
    }
}

const onDropdownItemClick = () => {
    inputBox.value = value;
    dropdownList.classList.add('hidden');
    inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
}

const filterDropdownItems = (attribute, container, inputBox, dropdownList) => {
    const query = inputBox.value.toLowerCase();
    const filteredValues = [];

    // Filter the dropdown values based on the query
    attribute.options.forEach(option => {
        if (
            ! option.value.toLowerCase().includes(query) ||
            (
                option.belongsTo !== 'global' &&
                ! option.belongsTo.includes(selectedElement.tagName.toLowerCase())
            )
        ) {
            return;
        }
        filteredValues.push(option.value || '[empty]');
    });

    // Populate dropdown items
    dropdownList.innerHTML = '';
    filteredValues.forEach(value => {
        const item = document.createElement('div');
        item.textContent = value;
        item.classList.add('dropdown-item');
        item.addEventListener('click', onDropdownItemClick);
        dropdownList.appendChild(item);
    });

    // If there are filtered values,
    // hide the dropdown list
    if (filteredValues.length === 0) {
        dropdownList.classList.add('hidden');
        return;
    }

    // Show the dropdown list
    dropdownList.classList.remove('hidden');

    // Calculate the best position for the dropdown list
    // if the dropdown list nears the bottom of the container
    // then position it above the input box, otherwise below
    const isNearBottom = container.getBoundingClientRect().bottom + dropdownList.offsetHeight > panelContentContainer.offsetHeight;
    dropdownList.classList.toggle('bottom', isNearBottom);
    dropdownList.classList.toggle('top', ! isNearBottom);
}

const createCheckBox = (attribute, container, cachedAttribute) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.key = attribute.name;
    checkbox.checked = cachedAttribute?.checked || false;
    checkbox.id = `attribute-${attribute.name}`;
    checkbox.classList.add('field-checkbox');
    checkbox.addEventListener('change', onCheckboxChange);
    container.appendChild(checkbox);
}

const createLabel = (attribute, container) => {
    const label = document.createElement('label');
    label.innerText = attribute.name;
    label.title = attribute.name;
    label.htmlFor = `attribute-${attribute.name}`;
    label.classList.add('field-name');
    container.appendChild(label);
}

const createInputBox = (attribute, container, cachedAttribute) => {
    const inputBox = document.createElement('input');
    inputBox.type = attribute.type === 'number' ? 'number' : 'text';
    inputBox.value = cachedAttribute?.value || '';
    inputBox.dataset.key = attribute.name;
    if (attribute.type === 'char') {
        inputBox.maxLength = 1;
    }
    inputBox.classList.add('field-value');
    inputBox.addEventListener('keydown', (event) => onInputBoxKeyDown(event, cachedAttribute));
    container.appendChild(inputBox);
    return inputBox;
}

const createDropdownList = (attribute, container, inputBox) => {
    const dropdownList = document.createElement('div');
    dropdownList.setAttribute('popover', 'auto');
    dropdownList.id = `attribute-${attribute.name}-dropdown`;
    dropdownList.classList.add('field-options', 'scrollable', 'hidden');

    inputBox.setAttribute('popovertarget', dropdownList.id);
    inputBox.addEventListener('input', () => filterDropdownItems(attribute, container, inputBox, dropdownList));
    inputBox.addEventListener('focus', () => filterDropdownItems(attribute, container, inputBox, dropdownList));

    container.appendChild(dropdownList);
}

const createBooleanInputBox = (container) => {
    const divisionBox = document.createElement('div');
    divisionBox.innerText = '[true]';
    divisionBox.classList.add('field-value');
    container.appendChild(divisionBox);
}

const createDictInputBox = (attribute, container, cachedAttribute) => {
    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.value = cachedAttribute?.value || '';
    inputBox.dataset.key = attribute.name;
    inputBox.classList.add('field-value');
    inputBox.addEventListener('keydown', (event) => onInputBoxKeyDown(event, cachedAttribute));
    container.appendChild(inputBox);
}

const onConvertInputBoxButtonClick = (event, attribute, container, cachedAttribute) => {
    const isMinimized = event.target.classList.toggle('icon-minimize');
    event.target.classList.toggle('icon-maximize', ! isMinimized);

    const parent = event.target.parentElement;
    const dropdownList = parent.querySelector('.field-options');
    const currentField = parent.querySelector('.field-value');
    const newField = isMinimized ? document.createElement('textarea') : document.createElement('input');

    newField.value = currentField.value;
    newField.dataset.key = attribute.name;
    newField.classList.add('field-value', 'scrollable');
    newField.addEventListener('keydown', (event) => onInputBoxKeyDown(event, cachedAttribute));

    if (attribute.type === 'enum') {
        newField.setAttribute('popovertarget', currentField.getAttribute('popovertarget'));
        newField.addEventListener('input', () => filterDropdownItems(attribute, container, newField, dropdownList));
        newField.addEventListener('focus', () => filterDropdownItems(attribute, container, newField, dropdownList));
    }

    parent.replaceChild(newField, currentField);
}

const createConvertInputBoxButton = (attribute, container, cachedAttribute) => {
    const convertButton = document.createElement('button');
    convertButton.classList.add('field-convert', 'icon', 'icon-maximize');
    convertButton.addEventListener('click', (event) => onConvertInputBoxButtonClick(event, attribute, container, cachedAttribute));
    container.appendChild(convertButton);
}

const createAttributeFieldset = (attribute) => {
    // Create a fieldset
    const container = document.createElement('fieldset');
    container.classList.add('field-container');

    const cachedAttribute = elementData[selectedElement.dataset.uwId].attributes?.[attribute.name];

    // Create a checkbox
    createCheckBox(attribute, container, cachedAttribute);

    // Create a label
    createLabel(attribute, container);

    // If the attribute type is char, string, or number
    if (['char', 'string', 'number'].includes(attribute.type)) {
        createInputBox(attribute, container, cachedAttribute);
    }

    // If the attribute type is enum
    if (attribute.type === 'enum') {
        const inputBox = createInputBox(attribute, container, cachedAttribute);
        createDropdownList(attribute, container, inputBox);
    }

    // If the attribute type is boolean
    if (attribute.type === 'boolean') {
        createBooleanInputBox(container);
    }

    // If the attribute type is dict
    if (attribute.type === 'dict') {
        createDictInputBox(attribute, container, cachedAttribute);
    }

    // Add a button to convert input box to text area and vice versa
    if (['string', 'enum'].includes(attribute.type)) {
        createConvertInputBoxButton(attribute, container, cachedAttribute);
    }

    return container;
}

const refreshPanel = () => {
    //
    console.log('[Editor] Refreshing attributes panel...');

    // Remove all the existing elements from the panel
    panelContentContainer.innerHTML = '';

    // If no element is selected
    if (! selectedElement) {
        // Create the placeholder element
        const placeholder = document.createElement('span');
        placeholder.innerText = 'No elements selected.';
        placeholder.classList.add('placeholder');
        panelContentContainer.appendChild(placeholder);
        return;
    }

    // If the selected element is not the same as the previous one,
    // reset the show all attributes flag
    if (previousSelectedElementId !== selectedElement.dataset.uwId) {
        previousSelectedElementId = selectedElement.dataset.uwId;
        showAllAttributes = false;
    }

    // Populate the attributes panel
    const fieldsets = [];
    apiSchema.htmlAttributes
        .filter(attribute =>
            (
                attribute.belongsTo === 'global' ||
                // TODO: add support for format like "input|type=file"
                attribute.belongsTo.includes(selectedElement.tagName.toLowerCase())
            ) &&
            ! [
                // TODO: add support for event attributes, e.g. onclick
                'style',
            ].includes(attribute.name)
        )
        .forEach(attribute => {
            if (
                ! showAllAttributes &&
                ! elementData[selectedElement.dataset.uwId].attributes?.[attribute.name]
            ) {
                return;
            }
            fieldsets.push(createAttributeFieldset(attribute));
        });
    panelContentContainer.append(...fieldsets);

    // Add show all attributes button
    const showAllButton = document.createElement('button');
    showAllButton.innerText = showAllAttributes ? 'Show less' : 'Show all';
    showAllButton.classList.add('button', 'show-all');
    showAllButton.addEventListener('click', () => {
        showAllAttributes = ! showAllAttributes;
        refreshPanel();
    });
    panelContentContainer.appendChild(showAllButton);

    //
    console.log('[Editor] Refreshing attributes panel... [DONE]');
}

(() => {
    // Register the window message event listener
    window.addEventListener('attribute:refresh', refreshPanel);
})()