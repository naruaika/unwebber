'use strict';

import { apiSchema, elementData, selectedElement } from "../../globals.js";
import { convertKebabToCamel } from "../../helpers.js";

const refreshPanel = () => {
    //
    console.log('[Editor] Refreshing properties panel...');

    // Get the content container of the properties panel
    const panelContentContainer = document.querySelector('#properties-panel .content__container');

    // Remove all existing field containers
    panelContentContainer.querySelectorAll('.field-container').forEach(element => element.remove());

    // If no element is selected
    if (! selectedElement) {
        // show the placeholder element
        panelContentContainer.querySelector('.placeholder')?.classList.remove('hidden');
        return;
    }

    // Hide the placeholder element
    panelContentContainer.querySelector('.placeholder')?.classList.add('hidden');

    // If no element is selected
    if (! selectedElement) {
        // show the placeholder element
        panelContentContainer.querySelector('.placeholder')?.classList.remove('hidden');
        panelContentContainer.querySelectorAll('.panel__section').forEach(element => element.classList.add('hidden'));
        return;
    }
    // Otherwise, hide the placeholder element
    panelContentContainer.querySelector('.placeholder')?.classList.add('hidden');
    panelContentContainer.querySelectorAll('.panel__section').forEach(element => element.classList.remove('hidden'));

    const formSchema = [
        {
            name: 'spacing',
            fields: [
                'width', 'height', 'margin', 'padding', 'border-width', 'gap'
            ],
        },
        {
            name: 'layout',
            fields: [
                'display', 'flex-basis', 'flex-direction', 'flex-grow', 'flex-shrink', 'flex-wrap', 'grid-area',
                'grid-auto-columns', 'grid-auto-flow', 'grid-auto-rows', 'grid-column', 'grid-row', 'grid-template',
                'align-content', 'align-items', 'align-self', 'justify-content', 'justify-items', 'justify-self'
            ],
        },
        {
            name: 'position',
            fields: [
                'position', 'top', 'right', 'bottom', 'left', 'z-index',
            ],
        },
        {
            name: 'typography',
            fields: [
                'font-family', 'font-size', 'font-style', 'font-weight', 'line-height', 'letter-spacing', 'text-align',
                'text-indent', 'text-transform'
            ],
        }
    ];

    const styleGlobalValueOptions = [
        'inherit',
        'initial',
        'revert',
        'revert-layer',
        'unset',
    ];

    const computedStyle = Object.fromEntries(
        Object.entries(window.getComputedStyle(selectedElement)).filter(([key, _]) => isNaN(key))
    )
    const parentComputedStyle = selectedElement.parent ? Object.fromEntries(
        Object.entries(window.getComputedStyle(selectedElement.parent)).filter(([key, _]) => isNaN(key))
    ) : {};

    // Populate the panel sections
    formSchema.forEach(sectionSchema => {
        // Find the form container
        const formContainer = panelContentContainer.querySelector(`#${sectionSchema.name}-section .form`);

        // Clear the form container
        formContainer.innerHTML = '';

        // Populate the form fields
        sectionSchema.fields.forEach(fieldName => {
            //
            const propertySpecification = apiSchema.cssProperties.find(property => property.name === fieldName);

            // Check the field visibility rules
            const visibilityRules = propertySpecification?.visibilityRules || [];
            const compliedVisibilityRule = rule => {
                const appliedValue = computedStyle[convertKebabToCamel(rule.property)];
                switch (rule.operator) {
                    case 'inside in':
                        return rule.values.includes(parentComputedStyle[rule.property] || '');
                    case 'in':
                        return rule.values.includes(appliedValue);
                    case 'equals':
                    default:
                        return appliedValue === rule.value;
                }
            };
            if (! visibilityRules.every(compliedVisibilityRule)) {
                return; // skip the field
            }

            //
            const cachedProperty = elementData[selectedElement.dataset.uwId].properties?.[fieldName];
            const computedValue = computedStyle[convertKebabToCamel(fieldName)];

            //
            const propertyContainer = document.createElement('fieldset');
            propertyContainer.classList.add('field-container');

            // create the checkbox
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.dataset.key = fieldName;
            checkbox.checked = cachedProperty?.checked || false;
            checkbox.id = `property-${fieldName}`;
            checkbox.classList.add('field-checkbox');
            checkbox.addEventListener('change', (event) => {
                // send the property value to the main canvas
                const inputBox = event.target.parentElement.querySelector('.field-value');
                mainCanvas.contentWindow.postMessage({
                    type: 'element:style',
                    payload: {
                        id: selectedElement.id,
                        property: event.target.dataset.key,
                        value: inputBox.value || inputBox.placeholder,
                        checked: event.target.checked ? 'true' : 'false',
                    },
                }, '*');
            });
            propertyContainer.appendChild(checkbox);

            // Create the label
            const label = document.createElement('label');
            label.innerText = fieldName;
            label.title = fieldName;
            label.htmlFor = `property-${fieldName}`;
            label.classList.add('field-name');
            if (cachedProperty) {
                label.classList.add('field-modified');
            }
            propertyContainer.appendChild(label);

            // Create the input box
            const inputBox = document.createElement('input');
            inputBox.type = 'text';
            inputBox.dataset.key = fieldName;
            inputBox.classList.add('field-value');
            inputBox.value = cachedProperty?.value || computedValue || propertySpecification.initialValue;
            inputBox.placeholder = propertySpecification.initialValue;
            inputBox.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    // restore the property value
                    event.target.value = cachedProperty?.value || propertySpecification.initialValue;
                }
            });
            inputBox.addEventListener('change', (event) => {
                // TODO: Send the property value to the main canvas
                // const checkBox = event.target.parentElement.querySelector('.field-checkbox');
                // mainCanvas.contentWindow.postMessage({
                //     type: 'element:style',
                //     payload: {
                //         id: selectedElement.id,
                //         property: event.target.dataset.key,
                //         value: event.target.value,
                //         checked: checkBox.checked ? 'true' : 'false',
                //     },
                // }, '*');
            });
            propertyContainer.appendChild(inputBox);

            // Create the datalist
            if (propertySpecification.specifiedValues) {
                const filterDropdownItems = () => {
                    const query = inputBox.value.toLowerCase();
                    // filter the values based on the query
                    const filteredValues = [
                        ...propertySpecification.specifiedValues,
                        ...styleGlobalValueOptions,
                    ].filter(value => value.toLowerCase().includes(query));
                    // create the dropdown items
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
                    if (filteredValues.length > 0) {
                        // show the dropdown list
                        dropdownList.classList.remove('hidden');
                        // calculate the best position for the dropdown list
                        // TODO: improve the dropdown list positioning
                        const propertyContainerRect = propertyContainer.getBoundingClientRect();
                        if (propertyContainerRect.bottom + dropdownList.offsetHeight > panelContentContainer.offsetHeight) {
                            dropdownList.style.top = 'unset';
                            dropdownList.style.bottom = '100%';
                        } else {
                            dropdownList.style.bottom = 'unset';
                            dropdownList.style.top = '100%';
                        }
                        dropdownList.style.right = '8px';
                    } else {
                        // hide the dropdown list
                        dropdownList.classList.add('hidden');
                    }
                }

                // create the dropdown list
                const dropdownList = document.createElement('div');
                dropdownList.setAttribute('popover', 'auto');
                dropdownList.id = `property-${fieldName}-dropdown`;
                dropdownList.classList.add('field-options');
                dropdownList.classList.add('scrollable');
                inputBox.setAttribute('popovertarget', dropdownList.id);
                propertyContainer.appendChild(dropdownList);

                //
                inputBox.addEventListener('input', filterDropdownItems);
                inputBox.addEventListener('focus', filterDropdownItems);
            }

            //
            formContainer.appendChild(propertyContainer);
        });
    });

    //
    console.log('[Editor] Refreshing properties panel... [DONE]');
}

(() => {
    // Register the window message event listener
    window.addEventListener('element:select', refreshPanel);
})()