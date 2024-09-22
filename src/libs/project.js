const { app, BrowserWindow } = require('electron')
const os = require('node:os')
const fs = require('node:fs')
const path = require('node:path')

const pages = require('../pages')
const config = require('./config')

const schema = {
    name: null,
    description: null,
    version: null,
};

const validate = (projectSign, schema) => {
    for (const key in schema) {
        if (! projectSign[key]) {
            projectSign[key] = schema[key];
        } else {
            for (const subkey in schema[key]) {
                if (! projectSign[key][subkey]) {
                    projectSign[key][subkey] = schema[key][subkey];
                }
            }
        }
    }
};

const create = () => {
    // Get temporary directory path
    const tempDir = app.getPath('temp');
    let workDir = path.join(`${tempDir}${path.sep}`, 'unwebber-');

    try {
        // Create temporary workspace directory
        workDir = fs.mkdtempSync(workDir);
        console.debug(`Created temporary workspace directory at ${workDir}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    try {
        // Copy project templates into workspace
        fs.cpSync(path.join(__dirname, '../../res/templates/project'), workDir, { recursive: true });
        console.debug(`Copied project templates into ${workDir}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Load the app configuration
    const appConfig = config.read();

    // Update the current project details
    appConfig.project.current = {
        path: workDir,
        name: 'Untitled',
        isSaved: false,
        isTemp: true,
    };

    // Append to the recent project list
    appConfig.project.recent.paths = [
        workDir,
        ...appConfig.project.recent.paths.slice(0, 2),
    ];

    // Save the updated configuration
    config.write(appConfig);

    // Open the project
    open(null, workDir);
};

const open = (_, workDir) => {
    const signaturePath = path.join(workDir, 'project.json');

    let signature = {};

    // Read the project signature
    try {
        signature = JSON.parse(fs.readFileSync(signaturePath));
        console.debug(`Project signature loaded from ${signaturePath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Validate the project signature
    validate(signature, schema);

    // Update current project details
    const appConfig = config.read();
    appConfig.project.current = {
        path: workDir,
        name: signature.name,
        isSaved: true,
        isTemp: workDir.startsWith(app.getPath('temp')),
    };
    config.write(appConfig);

    // Copy index.html to index.d.html
    try {
        const indexPath = path.join(workDir, 'src/index.html');
        const dIndexPath = path.join(workDir, 'src/index.d.html');
        fs.copyFileSync(indexPath, dIndexPath);
        console.debug(`Copied ${indexPath} to ${dIndexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Attach editor.js and editor.css to index.d.html
    try {
        const indexPath = path.join(workDir, 'src/index.d.html');
        const editorJsPath = path.join(__dirname, '../debs/editor.js');
        const editorCssPath = path.join(__dirname, '../debs/editor.css');
        const indexContent = fs.readFileSync(indexPath, 'utf-8');

        const editorJsTag = `<script src="${editorJsPath}"></script>`;
        const editorCssTag = `<link rel="stylesheet" href="${editorCssPath}">`;

        const indexContentUpdated = indexContent
            .replace('</head>', `    ${editorCssTag}${os.EOL}</head>`)
            .replace('</body>', `    ${editorJsTag}${os.EOL}</body>`);

        fs.writeFileSync(indexPath, indexContentUpdated);
        console.debug(`Attached editor.js and editor.css to ${indexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Go to editor page
    BrowserWindow.getFocusedWindow().webContents.loadFile(pages.editor);
};

const close = () => {
    // Load the app configuration
    const appConfig = config.read();

    // Delete index.d.html of the current project
    try {
        const indexPath = path.join(appConfig.project.current.path, 'src/index.d.html');
        fs.rmSync(indexPath);
        console.debug(`Deleted ${indexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Append to the recent project list
    // or move the current project to the top
    appConfig.project.recent.paths = [
        appConfig.project.current.path,
        ...(
            appConfig.project.recent.paths
                .filter(path => path !== appConfig.project.current.path)
                .slice(0, 2)
        ),
    ];

    // Clear current project details
    appConfig.project.current = {};

    // Save the updated configuration
    config.write(appConfig);

    // Go to editor page
    BrowserWindow.getFocusedWindow().webContents.loadFile(pages.welcome);
};

module.exports = { create, open, close };