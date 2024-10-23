'use strict';

import { apiSchema, metadata, selectedNode, setMetadata } from "../globals.js";
import { generateUniqueId } from "../helpers.js";

const panelContentContainer = document.querySelector('#attributes-panel .content__container');

let previousSelectedNodeId = null;
let showAllAttributes = false;

const onDropdownItemClick = (value, inputBox, dropdownList) => {
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
                ! option.belongsTo.includes(selectedNode.node.tagName.toLowerCase())
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
        item.addEventListener('click', () => onDropdownItemClick(value, inputBox, dropdownList));
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

const onCheckboxChange = (event) => {
    // Apply the attribute value
    const value = event.target.parentElement.querySelector(`.field-value[data-key="${event.target.dataset.key}"]`)?.value || '';
    if (event.target.checked) {
        selectedNode.node.setAttribute(event.target.dataset.key, value);
    } else {
        selectedNode.node.removeAttribute(event.target.dataset.key);
    }

    // Save the attribute value
    // TODO: push to action history
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    delete _metadata.attributes[event.target.dataset.key];
    if (
        event.target.dataset.type !== 'boolean' ||
        (
            event.target.dataset.type === 'boolean' &&
            event.target.checked
        )
    ) {
        _metadata.attributes[event.target.dataset.key] = {
            value,
            checked: event.target.checked,
        };
    }
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to refresh the outline panel
    window.dispatchEvent(new CustomEvent('outline:refresh'));
}

const createCheckBox = (attribute, container, cachedAttribute) => {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.dataset.key = attribute.name;
    checkbox.dataset.type = attribute.type;
    checkbox.checked = cachedAttribute?.checked || false;
    checkbox.id = `attribute-${attribute.name}`;
    checkbox.classList.add('field-checkbox');
    checkbox.addEventListener('change', onCheckboxChange);
    container.appendChild(checkbox);
}

const onDictLabelKeyDown = (event) => {
    if (event.key === 'Escape') {
        // Restore the attribute key
        event.target.value = event.target.dataset.key;

        // Unfocus the input box
        event.target.blur();

        return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
        // Unfocus the input box
        event.target.blur();

        return;
    }
}

const onDictLabelBlur = (event) => {
    // Skip if the previous and current keys are the same
    if (event.target.value === event.target.dataset.key) {
        return;
    }

    // Skip if the key is already in use
    // TODO: add failure feedback
    if (selectedNode.node.hasAttribute(event.target.value)) {
        event.target.value = event.target.dataset.key;
        return;
    }

    // Apply the attribute key
    const checked = event.target.parentElement.querySelector(`.field-checkbox[data-key="${event.target.dataset.key}"]`)?.checked || false;
    const value = event.target.parentElement.querySelector(`.field-value[data-key="${event.target.dataset.key}"]`).value;
    if (checked) {
        selectedNode.node.removeAttribute(event.target.dataset.key);
        selectedNode.node.setAttribute(event.target.value, value);
    }

    // Save the attribute value
    // TODO: push to action history
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    delete _metadata.attributes[event.target.dataset.key];
    _metadata.attributes[event.target.value] = {
        value: value,
        checked,
    };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Update the dataset key of the input box
    event.target.parentElement.querySelectorAll(`[data-key="${event.target.dataset.key}"]`).forEach(element => {
        element.dataset.key = event.target.value;
    });
}

const createDictLabel = (attribute, container, cachedAttribute) => {
    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.value = cachedAttribute?.name || attribute.name;
    inputBox.placeholder = `${attribute.name.split('-')[0]}-`;
    inputBox.dataset.key = attribute.name;
    inputBox.classList.add('field-dname');
    inputBox.addEventListener('keydown', onDictLabelKeyDown);
    inputBox.addEventListener('blur', onDictLabelBlur);
    container.appendChild(inputBox);
}

const createLabel = (attribute, container) => {
    const label = document.createElement('label');
    label.innerText = attribute.name;
    label.title = attribute.name;
    label.htmlFor = `attribute-${attribute.name}`;
    label.classList.add('field-name');
    container.appendChild(label);
}

const onInputBoxKeyDown = (event, cachedAttribute) => {
    if (event.key === 'Escape') {
        // Restore the attribute value
        event.target.value = cachedAttribute?.value || '';

        // Unfocus the input box
        event.target.blur();

        return;
    }

    if (event.key === 'Enter' || event.key === 'Tab') {
        // Unfocus the input box
        event.target.blur();

        return;
    }
}

const onInputBoxBlur = (event, cachedAttribute) => {
    // Skip if the previous and current values are the same
    if (event.target.value === (cachedAttribute?.value || '')) {
        return;
    }

    // Apply the attribute value
    const checked = event.target.parentElement.querySelector(`.field-checkbox[data-key="${event.target.dataset.key}"]`)?.checked || false;
    if (checked) {
        selectedNode.node.setAttribute(event.target.dataset.key, event.target.value);
    } else {
        selectedNode.node.removeAttribute(event.target.dataset.key);
    }

    // Save the attribute value
    // TODO: push to action history
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    _metadata.attributes[event.target.dataset.key] = {
        value: event.target.value,
        checked,
    };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Request to refresh the outline panel only if the checkbox is checked
    if (checked) {
        window.dispatchEvent(new CustomEvent('outline:refresh'));
    }

    // Hide the dropdown list
    event.target.parentElement.querySelector(`.field-options[data-key="${event.target.dataset.key}"]`)?.classList.add('hidden');
}

const createInputBox = (attribute, container, cachedAttribute) => {
    const inputBox = document.createElement('input');
    inputBox.type = attribute.type === 'number' ? 'number' : 'text';
    inputBox.value = cachedAttribute?.value || '';
    inputBox.placeholder = 'Type here...';
    inputBox.dataset.key = attribute.name;
    if (attribute.type === 'char') {
        inputBox.maxLength = 1;
    }
    inputBox.classList.add('field-value');
    inputBox.addEventListener('keydown', (event) => onInputBoxKeyDown(event, cachedAttribute));
    inputBox.addEventListener('blur', (event) => onInputBoxBlur(event, cachedAttribute));
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

const removeDictFieldsetItem = (event) => {
    // Remove the attribute
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    delete _metadata.attributes[event.target.dataset.key];
    setMetadata(selectedNode.node.dataset.uwId, _metadata);

    // Remove the input boxes
    const container = event.target.parentElement;
    container.querySelectorAll(`[data-key="${event.target.dataset.key}"]`).forEach(element => element.remove());

    // Update the grid row of the remove buttons
    for (const [index, element] of Array.from(container.getElementsByClassName('field-remove')).entries()) {
        element.style.setProperty('--grid-row', index + 1);
    }

    // Create a new fieldset item if there are no fieldset item left
    if (container.querySelectorAll('.field-value').length === 0) {
        const attribute = apiSchema.htmlAttributes.find(attribute => attribute.name === `${event.target.dataset.key.split('-')[0]}-*`);
        const cachedAttribute = metadata[selectedNode.node.dataset.uwId].attributes?.[attribute.name];
        createDictFieldsetItem(attribute, container, cachedAttribute);
    }
}

const createDictInputBox = (attribute, container, cachedAttribute) => {
    const inputBox = document.createElement('input');
    inputBox.type = 'text';
    inputBox.value = cachedAttribute?.value || '';
    inputBox.placeholder = 'Type here...';
    inputBox.dataset.key = attribute.name;
    inputBox.classList.add('field-value');
    inputBox.addEventListener('keydown', (event) => onInputBoxKeyDown(event, cachedAttribute));
    inputBox.addEventListener('blur', (event) => onInputBoxBlur(event, cachedAttribute));
    container.appendChild(inputBox);

    // Add a button to remove the input box
    // TODO: refactor this to a separate function
    const removeButton = document.createElement('button');
    removeButton.dataset.key = attribute.name;
    removeButton.style.setProperty('--grid-row', container.querySelectorAll('.field-value').length);
    removeButton.classList.add('field-remove', 'icon', 'icon-minus');
    removeButton.addEventListener('click', removeDictFieldsetItem);
    container.appendChild(removeButton);
}

const onConvertButtonClick = (event, attribute, container, cachedAttribute) => {
    const isMinimized = event.target.classList.toggle('icon-minimize');
    event.target.classList.toggle('icon-maximize', ! isMinimized);

    const parent = event.target.parentElement;
    const dropdownList = parent.querySelector('.field-options');
    const currentField = parent.querySelector('.field-value');
    const newField = isMinimized ? document.createElement('textarea') : document.createElement('input');

    newField.value = currentField.value;
    newField.placeholder = currentField.placeholder;
    newField.dataset.key = attribute.name;
    newField.classList.add('field-value', 'scrollable');
    newField.addEventListener('keydown', (event) => onInputBoxKeyDown(event, cachedAttribute));
    newField.addEventListener('blur', (event) => onInputBoxBlur(event, cachedAttribute));

    if (attribute.type === 'enum') {
        newField.setAttribute('popovertarget', currentField.getAttribute('popovertarget'));
        newField.addEventListener('input', () => filterDropdownItems(attribute, container, newField, dropdownList));
        newField.addEventListener('focus', () => filterDropdownItems(attribute, container, newField, dropdownList));
    }

    parent.replaceChild(newField, currentField);
}

const createConvertButton = (attribute, container, cachedAttribute) => {
    const convertButton = document.createElement('button');
    convertButton.classList.add('field-convert', 'icon', 'icon-maximize');
    convertButton.addEventListener('click', (event) => onConvertButtonClick(event, attribute, container, cachedAttribute));
    container.appendChild(convertButton);
}

const onAddDictFieldsetItemButtonClick = (attribute, container) => {
    const _attribute = Object.assign({}, attribute);
    _attribute.name += generateUniqueId(5);

    //
    createCheckBox(_attribute, container);
    createDictLabel(_attribute, container);
    createDictInputBox(_attribute, container);

    // Save the new attribute
    // TODO: push to action history
    const _metadata = metadata[selectedNode.node.dataset.uwId];
    _metadata.attributes[_attribute.name] = {
        value: '',
        checked: false,
    };
    setMetadata(selectedNode.node.dataset.uwId, _metadata);
}

const createDictFieldsetItem = (attribute, container, cachedAttribute) => {
    // Check if there are cached attributes
    const cachedAttributes = Object.keys(metadata[selectedNode.node.dataset.uwId].attributes)
        .filter(key => key.startsWith(attribute.name.replace('*', '')))
        .map(key => ({
            name: key,
            value: metadata[selectedNode.node.dataset.uwId].attributes[key].value,
            checked: metadata[selectedNode.node.dataset.uwId].attributes[key].checked,
        }));

    // Create input boxes for each cached attribute
    // or create a single input box for the attribute
    const _attribute = Object.assign({}, attribute);
    if (cachedAttributes.length > 0) {
        for (const cachedAttribute of cachedAttributes) {
            _attribute.name = cachedAttribute.name;
            createCheckBox(_attribute, container, cachedAttribute);
            createDictLabel(_attribute, container, cachedAttribute);
            createDictInputBox(_attribute, container, cachedAttribute);
        }
    } else {
        _attribute.name = attribute.name.replace('*', '');
        createCheckBox(_attribute, container, cachedAttribute);
        createDictLabel(_attribute, container, cachedAttribute);
        createDictInputBox(_attribute, container, cachedAttribute);
    }

    // Add a button to add more input boxes
    // TODO: refactor this to a separate function
    _attribute.name = attribute.name.replace('*', '');
    const addButton = document.createElement('button');
    addButton.classList.add('field-add', 'icon', 'icon-plus');
    addButton.addEventListener('click', () => onAddDictFieldsetItemButtonClick(_attribute, container));
    container.appendChild(addButton);
}

const createAttributeFieldset = (attribute) => {
    // Create a fieldset
    const container = document.createElement('fieldset');
    container.classList.add('field-container');

    const cachedAttribute = metadata[selectedNode.node.dataset.uwId].attributes?.[attribute.name];

    // Create a checkbox and label for non-dict attributes
    if (attribute.type !== 'dict') {
        createCheckBox(attribute, container, cachedAttribute);
        createLabel(attribute, container);
    }

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
        container.classList.add('is-dictionary');
        createDictFieldsetItem(attribute, container, cachedAttribute);
    }

    // Add a button to convert input box to text area and vice versa
    if (['string', 'enum'].includes(attribute.type)) {
        createConvertButton(attribute, container, cachedAttribute);
    }

    return container;
}

const refreshPanel = () => {
    // Remove all the existing elements from the panel
    panelContentContainer.innerHTML = '';

    // Create a placeholder element if no node is selected
    if (! selectedNode.node) {
        const placeholder = document.createElement('span');
        placeholder.innerText = 'No nodes selected.';
        placeholder.classList.add('placeholder');
        panelContentContainer.appendChild(placeholder);
        return;
    }

    // Create a placeholder element if the selected node is a text node
    if (selectedNode.node.nodeType !== Node.ELEMENT_NODE) {
        const placeholder = document.createElement('span');
        placeholder.innerText = 'No attributes available for text nodes.';
        placeholder.classList.add('placeholder');
        panelContentContainer.appendChild(placeholder);
        previousSelectedNodeId = null;
        return;
    }

    //
    console.log('[Editor] Refreshing attributes panel...');

    // If the selected element is not the same as the previous one,
    // reset the show all attributes flag
    if (previousSelectedNodeId !== selectedNode.node.dataset.uwId) {
        previousSelectedNodeId = selectedNode.node.dataset.uwId;
        showAllAttributes = false;
    }

    // Populate the attributes panel
    const fieldsets = [];
    apiSchema.htmlAttributes
        .filter(attribute =>
            (
                attribute.belongsTo === 'global' ||
                // TODO: add support for format like "input|type=file"
                attribute.belongsTo.includes(selectedNode.node.tagName.toLowerCase())
            ) &&
            ! [
                // TODO: add support for event attributes, e.g. onclick
                'style',
            ].includes(attribute.name)
        )
        .forEach(attribute => {
            if (
                ! showAllAttributes &&
                (
                    ! metadata[selectedNode.node.dataset.uwId].attributes?.[attribute.name] &&
                    ! (
                        attribute.name.endsWith('-*') &&
                        Object.keys(metadata[selectedNode.node.dataset.uwId].attributes)
                            .some(key => key.startsWith(attribute.name.replace('*', '')))
                    )
                )
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