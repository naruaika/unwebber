'use strict';

import { apiSchema, elementData, selectedElement } from "../../globals.js";

const panelContentContainer = document.querySelector('#attributes-panel .content__container');

const onInputBoxKeyDown = (event) => {
    if (event.key === 'Escape') {
        // Restore the attribute value
        event.target.value = cachedAttribute?.value;
        return;
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
        // TODO: apply the attribute value
        return;
    }
}

const filterDropdownItems = (attribute, container, inputBox, dropdownList) => {
    const query = inputBox.value.toLowerCase();
    const filteredValues = [];

    // Filter the dropdown values based on the query
    attribute.options.forEach(option => {
        if (
            ! option.value.toLowerCase().includes(query) ||
            (
                option.belongsTo !== 'global' && ! option.belongsTo.includes(selectedElement.tagName.toLowerCase())
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
        item.classList.add('dropdown-item');
        item.textContent = value;
        item.addEventListener('click', () => {
            inputBox.value = value;
            dropdownList.classList.add('hidden');
            inputBox.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        });
        dropdownList.appendChild(item);
    });

    // If there are filtered values
    if (filteredValues.length === 0) {
        // hide the dropdown list
        dropdownList.classList.add('hidden');
        return;
    }

    // Show the dropdown list
    dropdownList.classList.remove('hidden');

    // Calculate the best position for the dropdown list
    // if the dropdown list nears the bottom of the container
    // then position it above the input box, otherwise below
    if (container.getBoundingClientRect().bottom + dropdownList.offsetHeight > panelContentContainer.offsetHeight) {
        // TODO: convert to CSS class
        dropdownList.style.top = 'unset';
        dropdownList.style.bottom = '100%';
    } else {
        dropdownList.style.bottom = 'unset';
        dropdownList.style.top = '100%';
    }
    dropdownList.style.right = '8px';
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

    // Populate the attributes panel
    const attributeContainers = [];
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
            const attributeContainer = document.createElement('fieldset');
            attributeContainer.classList.add('field-container');

            const cachedAttribute = elementData[selectedElement.dataset.uwId].attributes?.[attribute.name];

            // Create a checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.key = attribute.name;
            checkbox.checked = cachedAttribute?.checked || false;
            checkbox.id = `attribute-${attribute.name}`;
            checkbox.classList.add('field-checkbox');
            checkbox.addEventListener('change', (event) => {
                // TODO: Send the property value to the main canvas
                // const inputBox = event.target.parentElement.querySelector('.field-value');
                // mainCanvas.contentWindow.postMessage({
                //     type: 'element:attribute',
                //     payload: {
                //         id: selectedElement.id,
                //         attribute: event.target.dataset.key,
                //         value: attribute.type === 'boolean' ? true : inputBox.value || inputBox.placeholder,
                //         checked: event.target.checked ? 'true' : 'false',
                //     },
                // }, '*');
            });
            attributeContainer.appendChild(checkbox);

            // Create a label
            const label = document.createElement('label');
            label.innerText = attribute.name;
            label.title = attribute.name;
            label.htmlFor = `attribute-${attribute.name}`;
            label.classList.add('field-name');
            attributeContainer.appendChild(label);

            // If the attribute type is char, string, or number
            if (['char', 'string', 'number'].includes(attribute.type)) {
                // create an input box
                const inputBox = document.createElement('input');
                inputBox.type = attribute.type === 'number' ? 'number' : 'text';
                inputBox.value = cachedAttribute?.value || '';
                inputBox.dataset.key = attribute.name;
                if (attribute.type === 'char') {
                    inputBox.maxLength = 1;
                }
                inputBox.classList.add('field-value');
                inputBox.addEventListener('keydown', () => onInputBoxKeyDown(cachedAttribute));
                attributeContainer.appendChild(inputBox);
            }

            // If the attribute type is enum
            if (attribute.type === 'enum') {
                // create an input box
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.value = cachedAttribute?.value || '';
                inputBox.dataset.key = attribute.name;
                inputBox.classList.add('field-value');
                inputBox.addEventListener('keydown', () => onInputBoxKeyDown(cachedAttribute));
                attributeContainer.appendChild(inputBox);

                // create a dropdown list
                const dropdownList = document.createElement('div');
                dropdownList.setAttribute('popover', 'auto');
                dropdownList.id = `attribute-${attribute.name}-dropdown`;
                dropdownList.classList.add('field-options');
                dropdownList.classList.add('scrollable');
                dropdownList.classList.add('hidden');
                inputBox.setAttribute('popovertarget', dropdownList.id);
                attributeContainer.appendChild(dropdownList);

                //
                inputBox.addEventListener('input', () => filterDropdownItems(
                    attribute,
                    attributeContainer,
                    inputBox,
                    dropdownList,
                ));
                inputBox.addEventListener('focus', () => filterDropdownItems(
                    attribute,
                    attributeContainer,
                    inputBox,
                    dropdownList,
                ));
            }

            // If the attribute type is boolean
            if (attribute.type === 'boolean') {
                // create a pseudo-input box
                const divisionBox = document.createElement('div');
                divisionBox.innerText = '[true]';
                divisionBox.classList.add('field-value');
                attributeContainer.appendChild(divisionBox);
            }

            // If the attribute type is dict
            if (attribute.type === 'dict') {
                // create an input box
                // FIXME: should be a dynamic list of key-value pairs
                const inputBox = document.createElement('input');
                inputBox.type = 'text';
                inputBox.value = cachedAttribute?.value || '';
                inputBox.dataset.key = attribute.name;
                inputBox.classList.add('field-value');
                inputBox.addEventListener('keydown', () => onInputBoxKeyDown(cachedAttribute));
                attributeContainer.appendChild(inputBox);
            }

            // TODO: add support for custom value indicated by the "etc" key

            attributeContainers.push(attributeContainer);
        });
        panelContentContainer.append(...attributeContainers);

    //
    console.log('[Editor] Refreshing attributes panel... [DONE]');
}

(() => {
    // Register the window message event listener
    window.addEventListener('element:select', refreshPanel);
})()