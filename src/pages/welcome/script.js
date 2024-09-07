(() => {
    // Load app configuration
    window.app.config.load().then(appConfig => {
        // Update the recent project list
        const recentProjects = appConfig.project.recent.paths;
        document
            .querySelectorAll('#recent-section .placeholder')
            .forEach((placeholder, index) => {
                if (index < recentProjects.length) {
                    placeholder.innerHTML = recentProjects[index].replaceAll('\\','/').split('/').reverse()[0];
                    placeholder.title = recentProjects[index];
                    placeholder.addEventListener('click', () => window.app.project.open(recentProjects[index]));
                    placeholder.classList.remove('placeholder');
                }
            });
    });
})();