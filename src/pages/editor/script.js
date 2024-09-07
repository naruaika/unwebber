(() => {
    // Load app configuration
    window.app.config.load().then(appConfig => {
        // Load the project index.html
        const projectPath = appConfig.project.current.path;
        const indexPath = projectPath + '/src/index.d.html';
        document.getElementById('main-canvas').title = appConfig.project.current.name;
        document.getElementById('main-canvas').src = indexPath;

        // Change window title
        const projectName = appConfig.project.current.name;
        document.getElementById('document-name').innerText = projectName;
    });
})();

document.addEventListener('DOMContentLoaded', () => {
    // Automatically open default panels
    document.querySelectorAll('#components-panel .header, #properties-panel .header').forEach(element => element.click());

    // Automatically select default edit mode
    document.querySelector('#visual-edit-button').click();
});

// To hide the not-allowed cursor while dragging
document.addEventListener('dragover', (event) => event.preventDefault());
document.addEventListener('dragenter', (event) => event.preventDefault());

// Handler to expand/collapse panels
document.querySelectorAll('.main-sidebar__panel .header, .main-bottombar__panel .header').forEach(element => {
    element.addEventListener('click', () => {
        element.classList.toggle('expanded');
        element.parentNode.classList.toggle('expanded');
        element.parentNode.querySelector('.content__container').classList.toggle('expanded');
    });
});

// Handler to click on topbar buttons
document.querySelectorAll('.main-topbar .button-action').forEach(element => {
    element.addEventListener('click', event => {
        // Check if the button belong to an action group
        if (element.dataset.actionGroup) {
            document
                .querySelectorAll('[data-action-group]')
                .forEach(element => element.classList.remove('selected'));
        }
        // Mark the button as selected
        event.target.classList.toggle('selected');
    });
});

// Handler to run/stop website live preview
document.getElementById('website-preview-button').addEventListener('click', () => {
    // TODO: Implement the live preview feature
    document.querySelector('.main-statusbar').classList.toggle('preview');
    document.querySelectorAll('.main-sidebar__left, .main-sidebar__right')
        .forEach(element => element.classList.toggle('hidden'));
});

// Handler for drag/drop web components
document.querySelector('.main-canvas__overlay').addEventListener('dragenter', () => {
    console.debug('Object has entered the drop space');
});
document.querySelector('.main-canvas__overlay').addEventListener('dragleave', () => {
    console.debug('Object has left the drop space');
});
document.querySelector('.main-canvas__overlay').addEventListener('dragover', (event) => {
    event.preventDefault();
});
document.querySelector('.main-canvas__overlay').addEventListener('drop', (event) => {
    event.preventDefault();
});
document.querySelectorAll('.template-component').forEach(element => {
    element.addEventListener('dragstart', (event) => {
        // Setup the drag data
        event.dataTransfer.dropEffect = 'copy';
        event.dataTransfer.setData('text', event.target.id);
        // Show the selection indicator
        event.currentTarget.classList.toggle('selected');
        // Show the drop space
        document.querySelector('.main-canvas__overlay').classList.toggle('hidden');
    });
    element.addEventListener('dragend', (event) => {
        // Hide the selection indicator
        event.currentTarget.classList.toggle('selected');
        // Hide the drop space
        document.querySelector('.main-canvas__overlay').classList.toggle('hidden');
    });
});

// Handler for receiving messages from the main canvas
window.addEventListener('message', (event) => {
    console.debug('Message received from the main canvas:', event.data);
});