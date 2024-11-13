const { app, BrowserWindow } = require('electron')
const os = require('node:os')
const fs = require('node:fs')
const path = require('node:path')

const config = require('./config')
const ui = require('../ui')

/**
 * Default project signature schema
 *
 * Note that the schema is subject to change in future.
 */
const schema = {
    name: null,
    description: null,
    version: null,
    entrypoint: null,
};

/**
 * Validate the project signature
 *
 * This function validates the project signature against the schema.
 * If a key is missing in the project signature, it is added with the
 * default value from the schema.
 *
 * @param {Object} projectSign - The project signature
 * @param {Object} schema - The project signature schema
 */
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

/**
 * Create a new project
 *
 * This function creates a new project in the temporary directory.
 * It copies the project templates into the temporary workspace directory.
 *
 * Note that to prevent the user from accidentally losing their work,
 * it is more wise to prompt the user where to save the project.
 */
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

    // Open the project
    open(null, workDir);
};

/**
 * Open an existing project
 *
 * This function opens an existing project in the workspace directory.
 * It loads the project signature and the app configuration. It then
 * redirects the user to the editor page with the project files.
 *
 * Currently, it does not support for opening multiple projects.
 * Nor does it support for opening a project from a custom directory.
 *
 * @param {String} event - The IPC event object
 * @param {String} workDir - The project workspace directory
 */
const open = (event, workDir) => {
    const signaturePath = path.join(workDir, '.unwebber', 'signature.json');

    let signature = {};

    // Read the project signature
    // TODO: initialize the project signature if it doesn't exist
    try {
        signature = JSON.parse(fs.readFileSync(signaturePath));
        console.debug(`Project signature loaded from ${signaturePath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Validate the project signature
    validate(signature, schema);

    // Load the app configuration
    const appConfig = config.read();

    // Update current project details
    // TODO: add support for opening multiple projects
    appConfig.project.current = {
        path: workDir,
        signature: signature,
        cursor: signature.entrypoint,
        isSaved: true,
        isTemp: workDir.startsWith(app.getPath('temp')),
    };

    // Append to the recent project list
    appConfig.project.recent.paths = [
        workDir,
        ...appConfig.project.recent.paths.slice(0, 2),
    ];

    // Create temporary files
    // NOTE: is it really necessary to create temporary files?
    const dIndexRelativeFilePath = signature.entrypoint.replace('.html', '.d.html');
    try {
        const indexPath = path.join(workDir, signature.entrypoint);
        const dIndexPath = path.join(workDir, dIndexRelativeFilePath);
        fs.copyFileSync(indexPath, dIndexPath);
        console.debug(`Copied ${indexPath} to ${dIndexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Remove all missing resource references from the temporary file
    // FIXME: how to make the user aware of the missing files?
    try {
        const dIndexFilePath = path.join(workDir, dIndexRelativeFilePath);
        const dIndexFolderPath = dIndexFilePath.replace(path.basename(dIndexFilePath), '');
        let dIndexContent = fs.readFileSync(dIndexFilePath, 'utf-8');

        // Check for missing script files
        const scriptTags = dIndexContent.match(/<script[^>]*src="([^"]*)"[^>]*><\/script>/g);
        if (scriptTags) {
            for (let i = 0; i < scriptTags.length; i++) {
                const scriptTag = scriptTags[i];
                const scriptPath = scriptTag.match(/<script[^>]*src="([^"]*)"[^>]*><\/script>/)[1];
                if (! fs.existsSync(path.join(dIndexFolderPath, scriptPath))) {
                    dIndexContent = dIndexContent.replace(scriptTag, '');
                    console.debug(`Removed ${scriptPath} reference from ${dIndexFilePath} due to missing file`);
                }
            }
        }

        // Check for missing link files
        const linkTags = dIndexContent.match(/<link[^>]*href="([^"]*)"[^>]*>/g);
        if (linkTags) {
            for (let i = 0; i < linkTags.length; i++) {
                const linkTag = linkTags[i];
                const linkPath = linkTag.match(/<link[^>]*href="([^"]*)"[^>]*>/)[1];
                if (! fs.existsSync(path.join(dIndexFolderPath, linkPath))) {
                    dIndexContent = dIndexContent.replace(linkTag, '');
                    console.debug(`Removed ${linkPath} reference from ${dIndexFilePath} due to missing file`);
                }
            }
        }

        // Write the updated content
        fs.writeFileSync(dIndexFilePath, dIndexContent);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Attach editor files to the temporary file
    try {
        const dIndexPath = path.join(workDir, dIndexRelativeFilePath);
        const editorJsPath = path.join(__dirname, '../debs/editor.js');
        const editorCssPath = path.join(__dirname, '../debs/editor.css');

        const editorJsTag = `<script data-uw-ignore src="${editorJsPath}"></script>`;
        const editorCssTag = `<link data-uw-ignore rel="stylesheet" href="${editorCssPath}">`;

        const indexContentUpdated = fs.readFileSync(dIndexPath, 'utf-8')
            .replace('</head>', `    ${editorCssTag}${os.EOL}</head>`)
            .replace('</body>', `    ${editorJsTag}${os.EOL}</body>`);

        fs.writeFileSync(dIndexPath, indexContentUpdated);
        console.debug(`Attached editor files to ${dIndexPath}`);
    } catch (error) {
        console.error(error);
        throw error;
    }

    // Update the project file cursor
    appConfig.project.current.cursor = dIndexRelativeFilePath;

    // Save the updated configuration
    config.write(appConfig);

    // Go to editor page
    BrowserWindow.getFocusedWindow().webContents.loadFile(ui.editor);
};

/**
 * Close the current project
 *
 * This function closes the current project and removes the temporary files.
 * It also updates the recent project list and clears the current project details.
 * It then redirects the user to the welcome page.
 */
const close = () => {
    // Load the app configuration
    const appConfig = config.read();

    // Delete temporary files of the current project
    try {
        const indexPath = path.join(
            appConfig.project.current.path,
            appConfig.project.current.cursor,
        );
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
    BrowserWindow.getFocusedWindow()?.webContents.loadFile(ui.welcome);
};

/**
 * Build the project tree
 *
 * This function builds the project tree structure for the given directory.
 * It recursively reads the directory and its files to create the tree.
 *
 * Currently, it is used to build the project tree for the file explorer.
 * So that the user can navigate through the project files, manage the assets,
 * and open the files in the editor.
 *
 * @param {String} event - The IPC event object
 * @param {String} workDir - The project workspace directory
 */
const tree = (event, workDir) => {
    const buildTree = (dir) => {
        const tree = {
            name: path.basename(dir),
            type: 'directory',
            path: dir,
            children: [],
        };

        // Read the directory
        const files = fs.readdirSync(dir);

        // Iterate over the files
        for (const file of files) {
            const filePath = path.join(dir, file);
            const fileStat = fs.statSync(filePath);

            // Skip hidden files
            if (file.startsWith('.')) {
                continue;
            }

            // Add the file to the tree
            if (fileStat.isDirectory()) {
                tree.children.push(buildTree(filePath));
            } else {
                tree.children.push({
                    name: file,
                    type: 'file',
                    path: filePath,
                });
            }
        }

        return tree;
    };

    return buildTree(workDir);
}

module.exports = { create, open, close, tree };