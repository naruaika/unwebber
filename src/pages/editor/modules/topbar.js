'use strict';

export const initialize = () => {
    const container = document.querySelector('.main-topbar');

    //
    const listeners = [
        {
            selector: '#file-menu-button',
            type: 'click',
            callback: () => window.unwebber.project.close(),
        },
        {
            selector: '#edit-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#select-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#view-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#text-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#table-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#media-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
        {
            selector: '#help-menu-button',
            type: 'click',
            callback: () => { /* TODO: implement this */ },
        },
    ];
    listeners.forEach(({ selector, type, callback }) => {
        container.querySelector(selector).addEventListener(type, callback);
    });
}