'use strict';

export const Panel = Object.freeze({
    PAGES: 'pages',
    OUTLINE: 'outline',
    FIND_AND_REPLACE: 'find-and-replace',
    ASSETS: 'assets',
    TEMPLATES: 'templates',
    SYMBOLS: 'symbols',
    FILL_AND_STROKE: 'fill-and-stroke',
    SWATCHES: 'swatches',
    ATTRIBUTES: 'attributes',
    CHARACTER: 'character',
    PARAGRAPH: 'paragraph',
    TEXT_STYLES: 'text-styles',
    TRANSFORM: 'transform',
    NAVIGATOR: 'navigator',
    HISTORY: 'history',
});

export var currentActive;

export const setActive = (targetPanel) => {
    // Return if the target panel is invalid
    if (! Object.values(Panel).includes(targetPanel)) {
        console.log(`[Editor] Invalid sidebar panel: ${targetPanel}`);
        return;
    }

    // Return if the target panel is already active
    if (currentActive === targetPanel) {
        return;
    }

    // Set the current active panel
    currentActive = targetPanel;
    console.log(`[Editor] Set active sidebar panel: ${currentActive}`);

    // Update the sidebar panel selection
    const selectedPanel = document.getElementById(`${targetPanel}-panel`);
    const tabContainer = selectedPanel.closest('.main-sidebar__tab');
    const selectedTabHeaderItem = tabContainer.querySelector(`#${targetPanel}-tab-header-item`);
    const tabHeaderItems = tabContainer.querySelectorAll('.main-sidebar__tab-header-item');
    tabHeaderItems.forEach(item => item.classList.toggle('selected', item === selectedTabHeaderItem));
    const tabBody = tabContainer.querySelector('.main-sidebar__tab-body');
    tabBody.querySelectorAll('.main-sidebar__panel').forEach(panel => panel.classList.toggle('hidden', panel !== selectedPanel));
}

export const initialize = (appConfig) => {
    const container = document.querySelector('.main-content');
    const leftSidebar = container.querySelector('.main-sidebar__left');
    const rightSidebar = container.querySelector('.main-sidebar__right');

    const createTabHeaderItem = (panel, tabItemIndex) => {
        const tabHeaderItem = document.createElement('div');
        tabHeaderItem.id = `${panel.id}-tab-header-item`;
        tabHeaderItem.classList.add('main-sidebar__tab-header-item');
        if (tabItemIndex === 0) {
            tabHeaderItem.classList.add('selected');
        }
        tabHeaderItem.textContent = panel.title;
        tabHeaderItem.textContent = panel.title;
        tabHeaderItem.addEventListener('click', () => {
            setActive(panel.id);
            window.dispatchEvent(new CustomEvent(`${panel.id}:refresh`));
        });
        return tabHeaderItem;
    };

    const createPanelElement = (panel, tabItemIndex) => {
        const panelElement = document.createElement('div');
        panelElement.classList.add('main-sidebar__panel');
        panelElement.id = `${panel.id}-panel`;
        if (tabItemIndex !== 0) {
            panelElement.classList.add('hidden');
        }
        import(`./${panel.id}-panel.js`).then(module => {
            if (! module.initialize) {
                return;
            }
            panelElement.appendChild(module.initialize());
        });
        return panelElement;
    };

    const createTabElement = (tab) => {
        const tabElement = document.createElement('div');
        tabElement.classList.add('main-sidebar__tab');
        const tabHeader = document.createElement('div');
        tabHeader.classList.add('main-sidebar__tab-header');
        tabHeader.textContent = tab.title;
        tabElement.appendChild(tabHeader);
        const tabBody = document.createElement('div');
        tabBody.classList.add('main-sidebar__tab-body');
        tab.children.forEach((panel, tabItemIndex) => {
            tabHeader.appendChild(createTabHeaderItem(panel, tabItemIndex));
            tabBody.appendChild(createPanelElement(panel, tabItemIndex));
        });
        tabElement.appendChild(tabBody);
        return tabElement;
    };

    const createDockElement = (dock) => {
        const dockElement = document.createElement('div');
        dockElement.classList.add('main-sidebar__dock');
        dock.children.forEach(tab => {
            const tabElement = createTabElement(tab);
            dockElement.appendChild(tabElement);
        });
        return dockElement;
    };

    const initializeSidebarPanels = (appConfig) => {
        const leftFragment = document.createDocumentFragment();
        const rightFragment = document.createDocumentFragment();
        appConfig.app.layout.sidebar.contents.forEach(dock => {
            const dockElement = createDockElement(dock);
            if (dock.position === 'left') {
                leftFragment.appendChild(dockElement);
            } else {
                rightFragment.appendChild(dockElement);
            }
        });
        leftSidebar.appendChild(leftFragment);
        rightSidebar.appendChild(rightFragment);
    };

    // Initialize the sidebar panels
    initializeSidebarPanels(appConfig);

    if (leftSidebar.childElementCount) {
        leftSidebar.classList.remove('hidden');
    }
    if (rightSidebar.childElementCount) {
        rightSidebar.classList.remove('hidden');
    }
}